import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { safeHaptics } from "@/utils/haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ConversationCard from "@/components/ConversationCard";
import LogoMark from "@/components/LogoMark";
import SkeletonCard from "@/components/SkeletonCard";
import WalkthroughModal from "@/components/WalkthroughModal";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function getGreetingKey(h: number): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  if (h < 12) return "greetingMorning";
  if (h < 18) return "greetingAfternoon";
  return "greetingEvening";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { profile, conversations, loadConversations, deleteConversation } = useApp();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const myConversations = useMemo(() =>
    conversations.filter((c) =>
      profile?.role === "client"
        ? c.clientId === profile.id
        : c.expertId === profile?.id
    ),
    [conversations, profile?.id, profile?.role]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return myConversations;
    return myConversations.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      (c.clientName ?? "").toLowerCase().includes(q) ||
      (c.expertName ?? "").toLowerCase().includes(q) ||
      (c.issue ?? "").toLowerCase().includes(q)
    );
  }, [search, myConversations]);

  const openCount = useMemo(() => myConversations.filter((c) => c.status === "open").length, [myConversations]);
  const activeCount = useMemo(() => myConversations.filter((c) => c.status === "in_progress").length, [myConversations]);
  const resolvedCount = useMemo(() => myConversations.filter((c) => c.status === "resolved").length, [myConversations]);
  const unread = useMemo(() => myConversations.reduce((sum, c) => sum + c.unreadCount, 0), [myConversations]);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const ListHeader = useMemo(() => (
    <>
      {/* Header */}
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
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {t[getGreetingKey(new Date().getHours())]}
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {profile?.name ?? ""}
          </Text>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  profile?.role === "expert" ? colors.expertLight : colors.secondary,
              },
            ]}
          >
            <Feather
              name={profile?.role === "expert" ? "user-check" : "crop"}
              size={12}
              color={profile?.role === "expert" ? colors.expert : colors.primary}
            />
            <Text
              style={[
                styles.roleBadgeText,
                { color: profile?.role === "expert" ? colors.expert : colors.primary },
              ]}
            >
              {profile?.role === "expert" ? t.expert : t.farmer}
            </Text>
          </View>
        </View>
        <LogoMark size={80} />
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
        <StatCard
          value={myConversations.length}
          label={t.all}
          icon="layers"
          iconColor={colors.primary}
          bg={colors.card}
          border={colors.border}
        />
        <StatCard
          value={openCount}
          label={t.waiting}
          icon="clock"
          iconColor="#f57c00"
          bg={openCount > 0 ? "#fff8f0" : colors.card}
          border={openCount > 0 ? "#f57c0030" : colors.border}
        />
        <StatCard
          value={activeCount}
          label={t.active}
          icon="activity"
          iconColor={colors.success}
          bg={activeCount > 0 ? "#f0faf0" : colors.card}
          border={activeCount > 0 ? `${colors.success}30` : colors.border}
        />
        <StatCard
          value={resolvedCount}
          label={t.resolved}
          icon="check-circle"
          iconColor={colors.mutedForeground}
          bg={colors.card}
          border={colors.border}
        />
      </View>

      {/* Invoices portal banner — clients only */}
      {profile?.role === "client" && (
        <TouchableOpacity
          activeOpacity={0.82}
          style={[styles.invoiceBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            safeHaptics.light();
            Linking.openURL("https://books.zohosecure.eu/portal/phytoclinic");
          }}
        >
          <View style={[styles.invoiceIconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name="file-text" size={22} color={colors.primary} />
          </View>
          <View style={styles.invoiceTextBlock}>
            <Text style={[styles.invoiceTitle, { color: colors.foreground }]}>{t.invoicesBannerTitle}</Text>
            <Text style={[styles.invoiceSub, { color: colors.mutedForeground }]}>{t.invoicesBannerSub}</Text>
          </View>
          <View style={[styles.invoiceBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.invoiceBtnText}>{t.invoicesBannerBtn}</Text>
            <Feather name="external-link" size={13} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Unread banner */}
      {unread > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
          <Feather name="bell" size={15} color={colors.primary} />
          <Text style={[styles.unreadText, { color: colors.primary }]}>
            {unread} {unread === 1 ? t.unreadMessage : t.unreadMessages}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {search
            ? `${t.searchResults} (${filtered.length})`
            : profile?.role === "expert"
            ? t.farmerRequests
            : t.myConsultations}
        </Text>
        {!search && myConversations.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.countBadgeText, { color: colors.primary }]}>
              {myConversations.length}
            </Text>
          </View>
        )}
      </View>
    </>
  ), [colors, insets, profile, t, myConversations, openCount, activeCount, resolvedCount, unread, search, loading, filtered.length, setSearch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {profile?.role === "client" && <WalkthroughModal role="client" />}

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            onPress={() => {
              safeHaptics.light();
              router.push(`/conversation/${item.id}`);
            }}
            onDelete={profile?.role === "expert" ? () => {
              safeHaptics.warning();
              Alert.alert(
                t.deleteConsult,
                t.deleteConsultConfirm,
                [
                  { text: t.cancel, style: "cancel" },
                  {
                    text: t.deleteConsultBtn,
                    style: "destructive",
                    onPress: () => {
                      safeHaptics.light();
                      deleteConversation(item.id).catch(() => {});
                    },
                  },
                ]
              );
            } : undefined}
          />
        )}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 110,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <>{[1, 2, 3].map((k) => <SkeletonCard key={k} />)}</>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Text style={{ fontSize: 40 }}>
                  {search ? "🔍" : profile?.role === "expert" ? "📋" : "🌱"}
                </Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search
                  ? t.noResults
                  : profile?.role === "expert"
                  ? t.noFarmerRequests
                  : t.noConsultationsYet}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {search
                  ? t.noResultsSub
                  : profile?.role === "expert"
                  ? t.expertSub
                  : t.clientSub}
              </Text>
            </View>
          )
        }
      />

      {profile?.role === "client" && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
            },
          ]}
          onPress={() => { safeHaptics.medium(); router.push("/new-consultation"); }}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={22} color="#fff" />
          <Text style={styles.fabLabel}>{t.newConsultation}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({
  value, label, icon, iconColor, bg, border,
}: {
  value: number; label: string; icon: string;
  iconColor: string; bg: string; border: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Feather name={icon as any} size={18} color={iconColor} />
      <Text style={[styles.statNumber, { color: iconColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: "#888" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { gap: 4 },
  greeting: { fontSize: 14, fontWeight: "500", textAlign: "right" },
  name: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, textAlign: "right" },
  roleBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5,
    alignSelf: "flex-start",
  },
  roleBadgeText: { fontSize: 12, fontWeight: "700" },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },

  invoiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceTextBlock: {
    flex: 1,
    gap: 2,
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  invoiceSub: {
    fontSize: 11,
    textAlign: "right",
    lineHeight: 15,
  },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  invoiceBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  unreadText: { fontSize: 13, fontWeight: "600" },

  searchRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
    justifyContent: "flex-end",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", textAlign: "right" },
  countBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingHorizontal: 32, paddingTop: 48, gap: 14 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 24 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, gap: 8, marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  fab: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  fabLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
