import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeHaptics } from "@/utils/haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMark from "@/components/LogoMark";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import {
  VIGNE_2026,
  WEEKS,
  WEEK_MONTH,
  MONTH_COLOR,
  type ProgrammeSection,
  type ProgrammeRow,
  type Week,
} from "@/constants/vigne_programme_2026";

const LOCAL_FALLBACK = require("@/assets/phyto_index.json") as PhytoEntry[];
const CACHE_KEY = "phyto_index_cache";
const CACHE_TS_KEY = "phyto_index_cache_ts";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export interface PhytoEntry {
  produit: string;
  detenteur: string;
  fournisseur: string;
  numHomologation: string;
  valableJusquau: string;
  tableauTox: string;
  categorie: string;
  formulation: string;
  matiereActive: string;
  teneur: string;
  usage: string;
  dose: string;
  culture: string;
  dar: string;
  nbrApplication: string;
}

const ALL_CAT_KEY = "__all__";

async function loadPhytoData(): Promise<PhytoEntry[]> {
  try {
    const tsRaw = await AsyncStorage.getItem(CACHE_TS_KEY);
    const now = Date.now();
    if (tsRaw && now - parseInt(tsRaw, 10) < CACHE_TTL_MS) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached) as PhytoEntry[];
    }
  } catch {}

  try {
    const res = await fetch(`${API_URL}/api/phyto-index`);
    if (res.ok) {
      const text = await res.text();
      const data = JSON.parse(text) as PhytoEntry[];
      await AsyncStorage.setItem(CACHE_KEY, text);
      await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      return data;
    }
  } catch {}

  return LOCAL_FALLBACK;
}

const CAT_KEY_MAP: Record<string, string> = {
  Herbicide: "phytoCatHerbicide",
  Fongicide: "phytoCatFongicide",
  Insecticide: "phytoCatInsecticide",
  "Insecticide-Acaricide": "phytoCatInsAcaricide",
  Acaricide: "phytoCatAcaricide",
  Nématicide: "phytoCatNematicide",
  Rodenticide: "phytoCatRodenticide",
  Molluscicide: "phytoCatMolluscicide",
  "Régulateur de croissance": "phytoCatGrowthReg",
};

const TOX_COLOR: Record<string, string> = {
  A: "#d32f2f",
  B: "#f57c00",
  C: "#388e3c",
  D: "#1565c0",
};

function catLabel(cat: string, t: Record<string, string>): string {
  const key = CAT_KEY_MAP[cat];
  if (key && t[key]) return t[key];
  return cat;
}

function toxLabel(tox: string, t: Record<string, string>): string {
  if (tox === "A") return t.phytoToxA ?? "أ - خطر جداً";
  if (tox === "B") return t.phytoToxB ?? "ب - خطر";
  if (tox === "C") return t.phytoToxC ?? "ج - تحذير";
  if (tox === "D") return t.phytoToxD ?? "د - آمن";
  return tox;
}

// ── Programme Calendar ────────────────────────────────────────────────────────
const DONE_KEY = "programme_done_2026";
const ND = Platform.OS !== "web";

const SECTION_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  fongicide: "shield",
  insecticide: "zap",
  fertigation: "droplet",
  foliaire: "wind",
};

function makeDoneId(sectionId: string, rowLabel: string, week: string) {
  return `${sectionId}||${rowLabel}||${week}`;
}

function WeekPill({
  week,
  product,
  color,
  done,
  onToggle,
}: {
  week: string;
  product: string;
  color: string;
  done: boolean;
  onToggle: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: done ? 0.93 : 1,
        useNativeDriver: ND,
        damping: 12,
        stiffness: 200,
        mass: 0.6,
      }),
      Animated.timing(checkOpacity, {
        toValue: done ? 1 : 0,
        duration: 220,
        useNativeDriver: ND,
      }),
    ]).start();
  }, [done]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.82,
        useNativeDriver: ND,
        damping: 10,
        stiffness: 300,
        mass: 0.4,
      }),
      Animated.spring(scale, {
        toValue: done ? 1 : 0.93,
        useNativeDriver: ND,
        damping: 10,
        stiffness: 220,
        mass: 0.6,
      }),
    ]).start();
    safeHaptics.selection();
    onToggle();
  };

  const doneColor = "#22c55e";
  const bgColor = done ? `${doneColor}20` : `${color}18`;
  const borderColor = done ? `${doneColor}70` : `${color}55`;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View
        style={[
          ps.weekPill,
          { backgroundColor: bgColor, borderColor, transform: [{ scale }] },
        ]}
      >
        <Animated.View style={[ps.checkOverlay, { opacity: checkOpacity }]}>
          <Feather name="check-circle" size={14} color={doneColor} />
        </Animated.View>
        <Text style={[ps.weekNum, { color: done ? doneColor : color, textDecorationLine: done ? "line-through" : "none" }]}>
          {week}
        </Text>
        <Text
          style={[ps.weekProd, { color: done ? doneColor : color, opacity: done ? 0.65 : 1 }]}
          numberOfLines={1}
        >
          {product}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function RowTimeline({
  row,
  sectionId,
  lang,
  doneKeys,
  onToggle,
}: {
  row: ProgrammeRow;
  sectionId: string;
  lang: "ar" | "fr";
  doneKeys: Set<string>;
  onToggle: (id: string) => void;
}) {
  const activeWeeks = WEEKS.filter((w) => row.schedule[w]);
  if (activeWeeks.length === 0) return null;

  return (
    <View style={ps.rowWrap}>
      <Text style={ps.rowLabel} numberOfLines={1}>
        {lang === "ar" ? row.labelAr : row.label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ps.rowScroll}
      >
        {activeWeeks.map((w) => {
          const month = WEEK_MONTH[w as Week];
          const color = MONTH_COLOR[month] ?? "#888";
          const id = makeDoneId(sectionId, row.label, w);
          return (
            <WeekPill
              key={w}
              week={w}
              product={row.schedule[w as Week] ?? ""}
              color={color}
              done={doneKeys.has(id)}
              onToggle={() => onToggle(id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function SectionCard({
  section,
  lang,
  colors,
  doneKeys,
  onToggle,
}: {
  section: ProgrammeSection;
  lang: "ar" | "fr";
  colors: ReturnType<typeof useColors>;
  doneKeys: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const icon = SECTION_ICONS[section.id] ?? "list";

  const totalPills = section.rows.reduce((sum, row) => sum + WEEKS.filter((w) => row.schedule[w]).length, 0);
  const donePills = section.rows.reduce((sum, row) => {
    return sum + WEEKS.filter((w) => {
      if (!row.schedule[w]) return false;
      return doneKeys.has(makeDoneId(section.id, row.label, w));
    }).length;
  }, 0);

  const progressPct = totalPills > 0 ? donePills / totalPills : 0;
  const allDone = totalPills > 0 && donePills === totalPills;

  return (
    <View style={[ps.sectionCard, { backgroundColor: colors.card, borderColor: allDone ? "#22c55e50" : colors.border }]}>
      <TouchableOpacity
        style={ps.sectionHeader}
        onPress={() => { safeHaptics.light(); setExpanded(!expanded); }}
        activeOpacity={0.75}
      >
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        <Text style={[ps.sectionTitle, { color: colors.foreground }]}>
          {lang === "ar" ? section.titleAr : section.title}
        </Text>
        <View style={ps.sectionRight}>
          <View style={[ps.progressBadge, { backgroundColor: allDone ? "#22c55e18" : colors.primary + "12", borderColor: allDone ? "#22c55e40" : colors.primary + "30" }]}>
            {allDone
              ? <Feather name="check-circle" size={12} color="#22c55e" />
              : <Text style={[ps.progressBadgeText, { color: colors.primary }]}>{donePills}/{totalPills}</Text>
            }
          </View>
          <View style={[ps.sectionIconRing, { backgroundColor: allDone ? "#22c55e18" : colors.primary + "18" }]}>
            <Feather name={icon} size={15} color={allDone ? "#22c55e" : colors.primary} />
          </View>
        </View>
      </TouchableOpacity>

      {totalPills > 0 && (
        <View style={[ps.sectionProgressBar, { backgroundColor: colors.secondary }]}>
          <View style={[ps.sectionProgressFill, { width: `${progressPct * 100}%` as any, backgroundColor: allDone ? "#22c55e" : colors.primary }]} />
        </View>
      )}

      {expanded && (
        <View style={ps.sectionBody}>
          {section.rows.map((row) => (
            <RowTimeline
              key={row.label}
              row={row}
              sectionId={section.id}
              lang={lang}
              doneKeys={doneKeys}
              onToggle={onToggle}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ProgrammeCalendar({
  lang,
  colors,
  insets,
  doneKeys,
  onToggle,
  onReset,
}: {
  lang: "ar" | "fr";
  colors: ReturnType<typeof useColors>;
  insets: { bottom: number };
  doneKeys: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  const totalAll = VIGNE_2026.reduce((sum, sec) =>
    sum + sec.rows.reduce((s, r) => s + WEEKS.filter((w) => r.schedule[w]).length, 0), 0);
  const doneAll = doneKeys.size;
  const pct = totalAll > 0 ? doneAll / totalAll : 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[ps.calendarContent, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Global progress */}
      <View style={[ps.globalProgress, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={ps.globalProgressTop}>
          <View style={ps.globalProgressLeft}>
            <Text style={[ps.globalProgressLabel, { color: colors.foreground }]}>
              {lang === "ar" ? "تقدم البرنامج" : "Avancement du programme"}
            </Text>
            <Text style={[ps.globalProgressSub, { color: colors.mutedForeground }]}>
              {doneAll} / {totalAll} {lang === "ar" ? "معالجة" : "traitement(s) effectué(s)"}
            </Text>
          </View>
          <View style={ps.globalProgressRight}>
            <Text style={[ps.globalProgressPct, { color: pct === 1 ? "#22c55e" : colors.primary }]}>
              {Math.round(pct * 100)}%
            </Text>
            {doneAll > 0 && (
              <TouchableOpacity onPress={onReset} style={ps.resetBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Text style={[ps.resetBtnText, { color: colors.mutedForeground }]}>
                  {lang === "ar" ? "إعادة ضبط" : "Réinitialiser"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={[ps.globalBar, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              ps.globalBarFill,
              {
                width: `${pct * 100}%` as any,
                backgroundColor: pct === 1 ? "#22c55e" : colors.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Month legend */}
      <View style={[ps.calLegendRow]}>
        {Object.entries(MONTH_COLOR).map(([month, color]) => (
          <View key={month} style={ps.legendItem}>
            <View style={[ps.legendDot, { backgroundColor: color }]} />
            <Text style={[ps.legendText, { color: colors.mutedForeground }]}>{month}</Text>
          </View>
        ))}
      </View>

      {VIGNE_2026.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          lang={lang}
          colors={colors}
          doneKeys={doneKeys}
          onToggle={onToggle}
        />
      ))}
    </ScrollView>
  );
}

const ps = StyleSheet.create({
  calendarContent: { padding: 12, gap: 12 },
  globalProgress: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  globalProgressTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  globalProgressLeft: { gap: 2 },
  globalProgressRight: { alignItems: "flex-end", gap: 4 },
  globalProgressLabel: { fontSize: 14, fontWeight: "800", textAlign: "right" },
  globalProgressSub: { fontSize: 12, textAlign: "right" },
  globalProgressPct: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  resetBtn: {},
  resetBtnText: { fontSize: 11, fontWeight: "600", textDecorationLine: "underline" },
  globalBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  globalBarFill: { height: "100%", borderRadius: 4 },
  calLegendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 4, marginBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "600" },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionIconRing: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "800", textAlign: "right" },
  progressBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 },
  progressBadgeText: { fontSize: 11, fontWeight: "700" },
  sectionProgressBar: { height: 4, marginHorizontal: 0 },
  sectionProgressFill: { height: "100%", borderRadius: 0 },
  sectionBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  rowWrap: { gap: 6 },
  rowLabel: { fontSize: 12, fontWeight: "700", textAlign: "right", color: "#666", paddingHorizontal: 2 },
  rowScroll: { gap: 8, paddingVertical: 2, flexDirection: "row" },
  weekPill: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8,
    alignItems: "center", minWidth: 72,
  },
  checkOverlay: { position: "absolute", top: 4, right: 4 },
  weekNum: { fontSize: 11, fontWeight: "800", marginBottom: 2 },
  weekProd: { fontSize: 10, fontWeight: "600", maxWidth: 80, textAlign: "center" },
});

// ── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ entry, onClose }: { entry: PhytoEntry; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const toxColor = TOX_COLOR[entry.tableauTox] ?? colors.mutedForeground;

  const rows: [string, string][] = [
    [t.phytoProduct, entry.produit],
    [t.phytoOwner, entry.detenteur],
    [t.phytoSupplier, entry.fournisseur],
    [t.phytoApprovalNum, entry.numHomologation],
    [t.phytoValidUntil, entry.valableJusquau],
    [t.phytoToxTable, toxLabel(entry.tableauTox, t)],
    [t.phytoCategory, catLabel(entry.categorie, t)],
    [t.phytoFormulation, entry.formulation],
    [t.phytoActiveIngredient, entry.matiereActive],
    [t.phytoContent, entry.teneur],
    [t.phytoUsage, entry.usage],
    [t.phytoDose, entry.dose],
    [t.phytoCulture, entry.culture],
    [t.phytoDar, entry.dar || "-"],
    [t.phytoAppCount, entry.nbrApplication || "-"],
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === "web" ? 16 : 0) }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>
            {entry.produit}
          </Text>
          <View style={[styles.toxBadge, { backgroundColor: toxColor + "22", borderColor: toxColor + "55" }]}>
            <Text style={[styles.toxBadgeText, { color: toxColor }]}>{entry.tableauTox}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.catBanner, { backgroundColor: colors.secondary }]}>
            <Feather name="tag" size={14} color={colors.primary} />
            <Text style={[styles.catBannerText, { color: colors.primary }]}>{catLabel(entry.categorie, t)}</Text>
          </View>

          {rows.map(([label, value]) =>
            value && value !== "-" && value.trim() ? (
              <View key={label} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
              </View>
            ) : null
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
const ProductCard = React.memo(function ProductCard({ entry, onPress }: { entry: PhytoEntry; onPress: () => void }) {
  const colors = useColors();
  const { t } = useLanguage();
  const toxColor = TOX_COLOR[entry.tableauTox] ?? colors.mutedForeground;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.cardTop}>
        <View style={[styles.toxDot, { backgroundColor: toxColor }]} />
        <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{entry.produit}</Text>
        <View style={[styles.catPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.catPillText, { color: colors.primary }]} numberOfLines={1}>
            {catLabel(entry.categorie, t)}
          </Text>
        </View>
      </View>
      <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
        {entry.matiereActive}
      </Text>
      <View style={styles.cardMeta}>
        <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
          {entry.culture}
        </Text>
        {entry.dar ? (
          <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
            DAR: {entry.dar}j
          </Text>
        ) : null}
        <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
          {entry.valableJusquau}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PhytoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();

  const [view, setView] = useState<"index" | "programme">("index");
  const [entries, setEntries] = useState<PhytoEntry[]>(LOCAL_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "done" | "error">("idle");
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState(ALL_CAT_KEY);
  const [selected, setSelected] = useState<PhytoEntry | null>(null);

  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPhytoData().then((data) => {
      setEntries(data);
      setLoading(false);
    });
    AsyncStorage.getItem(DONE_KEY).then((raw) => {
      if (raw) {
        try { setDoneKeys(new Set(JSON.parse(raw) as string[])); } catch {}
      }
    }).catch(() => {});
  }, []);

  const handleToggleDone = useCallback((id: string) => {
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); safeHaptics.light(); }
      else { next.add(id); safeHaptics.success(); }
      AsyncStorage.setItem(DONE_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const handleResetDone = useCallback(() => {
    safeHaptics.warning();
    setDoneKeys(new Set());
    AsyncStorage.removeItem(DONE_KEY).catch(() => {});
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    safeHaptics.light();
    setRefreshing(true);
    setRefreshStatus("idle");
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TS_KEY);
      const data = await loadPhytoData();
      setEntries(data);
      setRefreshStatus("done");
      safeHaptics.success();
    } catch {
      setRefreshStatus("error");
      safeHaptics.error();
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshStatus("idle"), 3000);
    }
  };

  const allCats = useMemo(() => {
    const unique = Array.from(new Set(entries.map((r) => r.categorie).filter(Boolean))).sort();
    return [ALL_CAT_KEY, ...unique];
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((r) => {
      if (selectedCat !== ALL_CAT_KEY && r.categorie !== selectedCat) return false;
      if (!q) return true;
      return (
        r.produit.toLowerCase().includes(q) ||
        r.matiereActive.toLowerCase().includes(q) ||
        r.culture.toLowerCase().includes(q) ||
        r.usage.toLowerCase().includes(q) ||
        r.detenteur.toLowerCase().includes(q)
      );
    });
  }, [query, selectedCat, entries]);

  const renderItem = useCallback(({ item }: { item: PhytoEntry }) => (
    <ProductCard entry={item} onPress={() => setSelected(item)} />
  ), []);

  const keyExtractor = useCallback((item: PhytoEntry, i: number) => `${item.numHomologation}-${i}`, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
          {/* Refresh button — only in index mode */}
          {view === "index" ? (
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing || loading}
              style={[
                styles.refreshBtn,
                {
                  backgroundColor: refreshStatus === "done"
                    ? `${colors.primary}15`
                    : refreshStatus === "error"
                      ? `${colors.destructive}15`
                      : colors.card,
                  borderColor: refreshStatus === "done"
                    ? colors.primary
                    : refreshStatus === "error"
                      ? colors.destructive
                      : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather
                  name={refreshStatus === "done" ? "check" : refreshStatus === "error" ? "alert-circle" : "refresh-cw"}
                  size={15}
                  color={refreshStatus === "done" ? colors.primary : refreshStatus === "error" ? colors.destructive : colors.mutedForeground}
                />
              )}
              <Text style={[
                styles.refreshBtnText,
                {
                  color: refreshStatus === "done"
                    ? colors.primary
                    : refreshStatus === "error"
                      ? colors.destructive
                      : colors.mutedForeground,
                },
              ]}>
                {refreshStatus === "done" ? t.phytoRefreshDone : refreshStatus === "error" ? t.phytoRefreshError : t.phytoRefresh}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.phytoScreenTitle}</Text>
            <LogoMark size={76} />
          </View>
        </View>

        {/* View toggle: Index ↔ Programme */}
        <View style={[styles.segmentWrap, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, view === "index" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }]}
            onPress={() => { safeHaptics.selection(); setView("index"); }}
            activeOpacity={0.8}
          >
            <Feather name="list" size={13} color={view === "index" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.segmentText, { color: view === "index" ? colors.primary : colors.mutedForeground }]}>
              {lang === "ar" ? "فهرس المنتجات" : "Index phyto"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, view === "programme" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }]}
            onPress={() => { safeHaptics.selection(); setView("programme"); }}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={13} color={view === "programme" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.segmentText, { color: view === "programme" ? colors.primary : colors.mutedForeground }]}>
              {lang === "ar" ? "برنامج العنب 2026" : "Programme Vigne 2026"}
            </Text>
          </TouchableOpacity>
        </View>

        {view === "index" && (
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {loading
              ? <ActivityIndicator size="small" color={colors.mutedForeground} />
              : `${filtered.length.toLocaleString()} ${t.phytoProductOf} ${entries.length.toLocaleString()}`
            }
          </Text>
        )}
      </View>

      {/* Programme view */}
      {view === "programme" && (
        <ProgrammeCalendar
          lang={lang}
          colors={colors}
          insets={insets}
          doneKeys={doneKeys}
          onToggle={handleToggleDone}
          onReset={handleResetDone}
        />
      )}

      {/* Search bar — index only */}
      {view === "index" && (
      <>
      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={t.searchPhyto}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            textAlign="right"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <View style={[styles.filterWrap, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {allCats.map((cat) => {
            const active = cat === selectedCat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, active ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setSelectedCat(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.foreground }]}>
                  {cat === ALL_CAT_KEY ? t.phytoCatAll : catLabel(cat, t)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={30}
        windowSize={10}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.phytoNoResults}</Text>
          </View>
        }
      />
      </>
      )}

      {/* Detail modal */}
      {selected && <DetailModal entry={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "right",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    textAlign: "right",
  },
  segmentWrap: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginTop: 10,
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    height: 44,
  },
  filterWrap: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    padding: 12,
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: 130,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  cardSub: {
    fontSize: 12,
    textAlign: "right",
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMetaText: {
    fontSize: 11,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  toxBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  toxBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalContent: {
    padding: 16,
    gap: 0,
  },
  catBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  catBannerText: {
    fontSize: 14,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    minWidth: 110,
    textAlign: "right",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
});
