import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { safeHaptics } from "@/utils/haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useApp } from "@/context/AppContext";
import { api, type ZohoStockItem, type ZohoStockEntry, type ZohoStockAnalysis } from "@/services/api";

function getStockStatus(item: ZohoStockItem): "ok" | "low" | "out" {
  if (item.currentStock <= 0) return "out";
  const threshold = item.aiReorderThreshold ?? item.reorderLevel;
  if (threshold != null && item.currentStock <= threshold) return "low";
  return "ok";
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ZohoStockDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { profile } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<ZohoStockItem | null>(null);
  const [history, setHistory] = useState<ZohoStockEntry[]>([]);
  const [analysis, setAnalysis] = useState<ZohoStockAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sessionToken = profile?.sessionToken ?? null;

  useEffect(() => {
    if (profile && profile.role !== "expert") {
      router.replace("/profile");
    }
  }, [profile]);

  const load = useCallback(async () => {
    if (!id || !sessionToken) return;
    try {
      const [allItems, entries] = await Promise.all([
        api.zohoStock.items(sessionToken),
        api.zohoStock.history(id, sessionToken),
      ]);
      const found = allItems.find((i) => i.id === id) ?? null;
      setItem(found);
      if (found?.aiSuggestedLevel != null) {
        setAnalysis({
          suggestedLevel: found.aiSuggestedLevel,
          reorderThreshold: found.aiReorderThreshold ?? 0,
          trend: found.aiTrend ?? "stable",
          reasoning: found.aiReasoning ?? "",
          analyzedAt: found.aiAnalyzedAt ?? 0,
        });
      }
      setHistory(entries);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id, sessionToken]);

  useEffect(() => {
    if (sessionToken) {
      load();
    } else if (profile) {
      setLoading(false);
    }
  }, [load, sessionToken, profile]);

  const handleAnalyze = async () => {
    if (!id || !sessionToken) return;
    safeHaptics.medium();
    setAnalyzing(true);
    try {
      const result = await api.zohoStock.analyze(id, lang, sessionToken);
      setAnalysis(result);
      setItem((prev) =>
        prev
          ? {
              ...prev,
              aiSuggestedLevel: result.suggestedLevel,
              aiReorderThreshold: result.reorderThreshold,
              aiTrend: result.trend,
              aiReasoning: result.reasoning,
              aiAnalyzedAt: result.analyzedAt,
            }
          : prev
      );
    } catch (err: any) {
      Alert.alert(t.zohoStockAnalyzeError, err?.message ?? "");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitEntry = async () => {
    const qtyNum = Number(qty);
    if (!qty.trim() || isNaN(qtyNum)) {
      Alert.alert(t.errorLabel, t.zohoStockEntryQty);
      return;
    }
    if (!id || !sessionToken) return;
    safeHaptics.medium();
    setSubmitting(true);
    try {
      const entry = await api.zohoStock.addEntry(
        id,
        { quantity: qtyNum, note: note.trim() || undefined, createdBy: profile?.name ?? undefined },
        sessionToken
      );
      setHistory((prev) => [entry, ...prev]);
      setItem((prev) => (prev ? { ...prev, currentStock: qtyNum } : prev));
      setQty("");
      setNote("");
      safeHaptics.success();
      Alert.alert(t.zohoStockEntrySuccess);
    } catch {
      Alert.alert(t.zohoStockEntryError);
    } finally {
      setSubmitting(false);
    }
  };

  const trendLabel = (trend: string) => {
    if (trend === "increasing") return t.zohoStockTrendIncreasing;
    if (trend === "decreasing") return t.zohoStockTrendDecreasing;
    return t.zohoStockTrendStable;
  };

  const trendIcon = (trend: string): React.ComponentProps<typeof Feather>["name"] => {
    if (trend === "increasing") return "trending-up";
    if (trend === "decreasing") return "trending-down";
    return "minus";
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!sessionToken) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <Text style={{ color: colors.destructive, textAlign: "center", fontSize: 15, lineHeight: 24 }}>
          {"جلسة غير متوفرة\nيرجى تسجيل الخروج وإعادة الدخول"}
        </Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.mutedForeground }}>{t.conversationNotFound}</Text>
      </View>
    );
  }

  const status = getStockStatus(item);
  const statusColor = status === "ok" ? colors.success : status === "low" ? (colors.warning ?? "#f57c00") : colors.destructive;
  const statusLabel = status === "ok" ? t.zohoStockStatusOk : status === "low" ? t.zohoStockStatusLow : t.zohoStockStatusOut;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.sku && (
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                SKU: {item.sku}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current stock info */}
        <View style={[styles.statsRow]}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="package" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {item.currentStock}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {t.zohoStockCurrent}
            </Text>
            {item.unit && (
              <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>{item.unit}</Text>
            )}
          </View>
          {item.reorderLevel != null && (
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="alert-triangle" size={20} color={colors.warning ?? "#f57c00"} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {item.reorderLevel}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {t.zohoStockReorder}
              </Text>
              {item.unit && (
                <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>{item.unit}</Text>
              )}
            </View>
          )}
          {item.syncedAt && (
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
              <Text style={[styles.statSyncDate, { color: colors.mutedForeground }]}>
                {new Date(item.syncedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Zoho Sync</Text>
            </View>
          )}
        </View>

        {/* AI Analysis */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t.zohoStockAiAnalysis}
            </Text>
            <TouchableOpacity
              style={[styles.analyzeBtn, { backgroundColor: colors.primary, opacity: analyzing ? 0.7 : 1 }]}
              onPress={handleAnalyze}
              disabled={analyzing}
              activeOpacity={0.8}
            >
              {analyzing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="cpu" size={14} color="#fff" />
              )}
              <Text style={styles.analyzeBtnText}>
                {analyzing ? t.zohoStockAnalyzing : t.zohoStockAnalyze}
              </Text>
            </TouchableOpacity>
          </View>

          {analysis ? (
            <View style={[styles.aiCard, { backgroundColor: colors.card, borderColor: `${colors.primary}30` }]}>
              <View style={styles.aiCardRow}>
                <View style={[styles.aiStat, { backgroundColor: `${colors.primary}12` }]}>
                  <Feather name="target" size={16} color={colors.primary} />
                  <Text style={[styles.aiStatValue, { color: colors.foreground }]}>
                    {analysis.suggestedLevel} {item.unit ?? ""}
                  </Text>
                  <Text style={[styles.aiStatLabel, { color: colors.mutedForeground }]}>
                    {t.zohoStockAiSuggested}
                  </Text>
                </View>
                <View style={[styles.aiStat, { backgroundColor: `${colors.warning ?? "#f57c00"}12` }]}>
                  <Feather name="alert-triangle" size={16} color={colors.warning ?? "#f57c00"} />
                  <Text style={[styles.aiStatValue, { color: colors.foreground }]}>
                    {analysis.reorderThreshold} {item.unit ?? ""}
                  </Text>
                  <Text style={[styles.aiStatLabel, { color: colors.mutedForeground }]}>
                    {t.zohoStockReorder}
                  </Text>
                </View>
                <View style={[styles.aiStat, { backgroundColor: `${colors.secondary}` }]}>
                  <Feather
                    name={trendIcon(analysis.trend)}
                    size={16}
                    color={
                      analysis.trend === "increasing"
                        ? colors.success
                        : analysis.trend === "decreasing"
                        ? colors.destructive
                        : colors.mutedForeground
                    }
                  />
                  <Text style={[styles.aiStatValue, { color: colors.foreground }]}>
                    {trendLabel(analysis.trend)}
                  </Text>
                  <Text style={[styles.aiStatLabel, { color: colors.mutedForeground }]}>
                    Trend
                  </Text>
                </View>
              </View>
              {analysis.reasoning ? (
                <View style={[styles.aiReasoning, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }]}>
                  <Feather name="message-square" size={14} color={colors.primary} />
                  <Text style={[styles.aiReasoningText, { color: colors.foreground }]}>
                    {analysis.reasoning}
                  </Text>
                </View>
              ) : null}
              {analysis.analyzedAt ? (
                <Text style={[styles.aiDate, { color: colors.mutedForeground }]}>
                  {formatDate(analysis.analyzedAt)}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.aiEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="cpu" size={28} color={colors.mutedForeground} />
              <Text style={[styles.aiEmptyText, { color: colors.mutedForeground }]}>
                {t.zohoStockAnalyze}
              </Text>
            </View>
          )}
        </View>

        {/* Team entry form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.zohoStockEntryTitle}
          </Text>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              {t.zohoStockEntryQty}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={qty}
              onChangeText={setQty}
              placeholder={t.zohoStockEntryQtyPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              textAlign="right"
            />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              {t.zohoStockEntryNote}
            </Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={note}
              onChangeText={setNote}
              placeholder={t.zohoStockEntryNotePlaceholder}
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlign="right"
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmitEntry}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="save" size={16} color="#fff" />
              )}
              <Text style={styles.submitBtnText}>
                {submitting ? t.zohoStockEntrySubmitting : t.zohoStockEntrySubmit}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction history */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.zohoStockHistory}
          </Text>
          {history.length === 0 ? (
            <View style={[styles.histEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.histEmptyText, { color: colors.mutedForeground }]}>
                {t.zohoStockHistoryEmpty}
              </Text>
            </View>
          ) : (
            history.map((entry) => (
              <View
                key={entry.id}
                style={[styles.histEntry, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.histEntryTop}>
                  <View style={[
                    styles.histBadge,
                    {
                      backgroundColor:
                        entry.source === "zoho_sync" ? `${colors.primary}15`
                        : entry.source === "zoho_sale" ? `${colors.destructive}15`
                        : entry.source === "zoho_purchase" ? `${colors.success}15`
                        : entry.source === "zoho_adjustment" ? `${(colors.warning ?? "#f57c00")}18`
                        : `${colors.success}15`,
                    },
                  ]}>
                    <Feather
                      name={
                        entry.source === "zoho_sync" ? "refresh-cw"
                        : entry.source === "zoho_sale" ? "trending-down"
                        : entry.source === "zoho_purchase" ? "trending-up"
                        : entry.source === "zoho_adjustment" ? "sliders"
                        : "edit-3"
                      }
                      size={11}
                      color={
                        entry.source === "zoho_sync" ? colors.primary
                        : entry.source === "zoho_sale" ? colors.destructive
                        : entry.source === "zoho_purchase" ? colors.success
                        : entry.source === "zoho_adjustment" ? (colors.warning ?? "#f57c00")
                        : colors.success
                      }
                    />
                    <Text style={[
                      styles.histBadgeText,
                      {
                        color:
                          entry.source === "zoho_sync" ? colors.primary
                          : entry.source === "zoho_sale" ? colors.destructive
                          : entry.source === "zoho_purchase" ? colors.success
                          : entry.source === "zoho_adjustment" ? (colors.warning ?? "#f57c00")
                          : colors.success,
                      },
                    ]}>
                      {entry.source === "zoho_sync" ? t.zohoStockSourceZoho
                        : entry.source === "zoho_sale" ? t.zohoStockSourceSale
                        : entry.source === "zoho_purchase" ? t.zohoStockSourcePurchase
                        : entry.source === "zoho_adjustment" ? t.zohoStockSourceAdjustment
                        : t.zohoStockSourceTeam}
                    </Text>
                  </View>
                  <Text style={[styles.histDate, { color: colors.mutedForeground }]}>
                    {formatDate(entry.createdAt)}
                  </Text>
                </View>
                <View style={styles.histEntryBottom}>
                  <Text style={[styles.histQty, { color: colors.foreground }]}>
                    {entry.quantity} {item.unit ?? ""}
                  </Text>
                  {entry.note && (
                    <Text style={[styles.histNote, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {entry.note}
                    </Text>
                  )}
                  {entry.createdBy && (
                    <Text style={[styles.histBy, { color: colors.mutedForeground }]}>
                      — {entry.createdBy}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    alignItems: "flex-start",
    gap: 10,
  },
  backBtn: { padding: 4, marginTop: 2 },
  headerTextBlock: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  headerSub: { fontSize: 11, textAlign: "right" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  content: {
    padding: 16,
    gap: 24,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  statUnit: { fontSize: 10, textAlign: "center" },
  statSyncDate: { fontSize: 14, fontWeight: "700" },

  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", textAlign: "right" },

  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  analyzeBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  aiCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  aiCardRow: {
    flexDirection: "row",
    gap: 10,
  },
  aiStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  aiStatValue: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  aiStatLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  aiReasoning: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiReasoningText: { flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" },
  aiDate: { fontSize: 10, textAlign: "right" },
  aiEmpty: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  aiEmptyText: { fontSize: 14 },

  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  fieldLabel: { fontSize: 13, fontWeight: "700", textAlign: "right" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMulti: { minHeight: 72, textAlignVertical: "top", paddingTop: 10 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  histEntry: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  histEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  histBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  histBadgeText: { fontSize: 10, fontWeight: "700" },
  histDate: { fontSize: 10 },
  histEntryBottom: { gap: 4 },
  histQty: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  histNote: { fontSize: 13, textAlign: "right" },
  histBy: { fontSize: 11, textAlign: "right" },
  histEmpty: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 24,
  },
  histEmptyText: { fontSize: 14 },
});
