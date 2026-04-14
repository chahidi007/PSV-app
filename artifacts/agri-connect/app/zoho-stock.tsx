import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { safeHaptics } from "@/utils/haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useApp } from "@/context/AppContext";
import { api, type ZohoStockItem } from "@/services/api";

function getStockStatus(item: ZohoStockItem): "ok" | "low" | "out" {
  if (item.currentStock <= 0) return "out";
  const threshold = item.aiReorderThreshold ?? item.reorderLevel;
  if (threshold != null && item.currentStock <= threshold) return "low";
  return "ok";
}

export default function ZohoStockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { profile } = useApp();
  const [items, setItems] = useState<ZohoStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const sessionToken = profile?.sessionToken ?? null;
  const authError = profile?.role === "expert" && !sessionToken
    ? "جلسة غير متوفرة — يرجى تسجيل الخروج وإعادة الدخول"
    : null;

  useEffect(() => {
    if (profile && profile.role !== "expert") {
      router.replace("/profile");
    }
  }, [profile]);

  const load = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const data = await api.zohoStock.items(sessionToken);
      setItems(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (sessionToken) {
      load();
    } else if (profile) {
      setLoading(false);
    }
  }, [load, sessionToken, profile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSync = async () => {
    if (!sessionToken) return;
    safeHaptics.medium();
    setSyncing(true);
    try {
      const result = await api.zohoStock.sync(sessionToken, lang);
      if (result.success) {
        await load();
        Alert.alert(t.zohoStockRefreshDone, `${result.synced} produits/منتج`);
      }
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("not configured") || msg.includes("غير مُهيّأ") || msg.includes("credentials")) {
        Alert.alert(t.zohoStockNotConfigured, t.zohoStockNotConfiguredSub);
      } else {
        Alert.alert(t.zohoStockRefreshError, msg);
      }
    } finally {
      setSyncing(false);
    }
  };

  const statusColor = (status: "ok" | "low" | "out") => {
    if (status === "ok") return colors.success;
    if (status === "low") return colors.warning ?? "#f57c00";
    return colors.destructive;
  };

  const statusLabel = (status: "ok" | "low" | "out") => {
    if (status === "ok") return t.zohoStockStatusOk;
    if (status === "low") return t.zohoStockStatusLow;
    return t.zohoStockStatusOut;
  };

  const renderItem = ({ item }: { item: ZohoStockItem }) => {
    const status = getStockStatus(item);
    const sc = statusColor(status);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.82}
        onPress={() => {
          safeHaptics.light();
          router.push(`/zoho-stock-detail?id=${encodeURIComponent(item.id)}`);
        }}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusDot, { backgroundColor: sc }]} />
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatValue, { color: colors.foreground }]}>
              {item.currentStock} {item.unit ? `${item.unit}` : ""}
            </Text>
            <Text style={[styles.cardStatLabel, { color: colors.mutedForeground }]}>
              {t.zohoStockCurrent}
            </Text>
          </View>
          {item.aiSuggestedLevel != null && (
            <View style={styles.cardStat}>
              <Text style={[styles.cardStatValue, { color: colors.primary }]}>
                {item.aiSuggestedLevel} {item.unit ? `${item.unit}` : ""}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.mutedForeground }]}>
                {t.zohoStockAiSuggested}
              </Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: `${sc}18` }]}>
            <Text style={[styles.statusBadgeText, { color: sc }]}>{statusLabel(status)}</Text>
          </View>
        </View>
        {item.sku && (
          <Text style={[styles.cardSku, { color: colors.mutedForeground }]}>SKU: {item.sku}</Text>
        )}
        <View style={styles.cardArrow}>
          <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => { safeHaptics.light(); router.back(); }}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {t.zohoStockTitle}
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {t.zohoStockSub}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.syncBtn,
              { backgroundColor: colors.primary, opacity: syncing ? 0.7 : 1 },
            ]}
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.8}
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.syncBtnText}>
              {syncing ? t.zohoStockRefreshing : t.zohoStockRefresh}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
          },
        ]}
        ListEmptyComponent={
          loading || (!sessionToken && !authError) ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {t.loading}
              </Text>
            </View>
          ) : authError ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.destructive }]}>{authError}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="package" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {t.zohoStockEmpty}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {t.zohoStockEmptySub}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
  },
  headerSub: {
    fontSize: 12,
    textAlign: "right",
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  syncBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    padding: 14,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: "relative",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
  cardStat: {
    alignItems: "flex-end",
    gap: 2,
  },
  cardStatValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardStatLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardSku: {
    fontSize: 11,
    textAlign: "right",
  },
  cardArrow: {
    position: "absolute",
    left: 12,
    top: "50%",
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 14,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 60,
  },
});
