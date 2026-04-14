import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import diseasesData from "@/assets/diseases.json";

const DISEASE_IMAGES: Record<number, any> = {
  1:  require("@/assets/images/disease_1.png"),
  2:  require("@/assets/images/disease_2.png"),
  3:  require("@/assets/images/disease_3.png"),
  4:  require("@/assets/images/disease_4.png"),
  5:  require("@/assets/images/disease_5.png"),
  6:  require("@/assets/images/disease_6.png"),
  7:  require("@/assets/images/disease_7.png"),
  8:  require("@/assets/images/disease_8.png"),
  9:  require("@/assets/images/disease_9.png"),
  10: require("@/assets/images/disease_10.png"),
  11: require("@/assets/images/disease_11.png"),
  12: require("@/assets/images/disease_12.png"),
  13: require("@/assets/images/disease_13.png"),
  14: require("@/assets/images/disease_14.png"),
  15: require("@/assets/images/disease_15.png"),
  16: require("@/assets/images/disease_16.png"),
  17: require("@/assets/images/disease_17.png"),
  18: require("@/assets/images/disease_18.png"),
  19: require("@/assets/images/disease_19.png"),
  20: require("@/assets/images/disease_20.png"),
  21: require("@/assets/images/disease_21.png"),
  22: require("@/assets/images/disease_22.png"),
  23: require("@/assets/images/disease_23.png"),
  24: require("@/assets/images/disease_24.png"),
  25: require("@/assets/images/disease_25.png"),
};

interface Disease {
  id: string;
  nameAr: string;
  nameFr: string;
  category: string;
  severity: string;
  crops: string[];
  cropsFr?: string[];
  symptoms: string;
  symptomsFr?: string;
  treatment: string;
  treatmentFr?: string;
  prevention: string;
  preventionFr?: string;
}

const diseases = diseasesData as Disease[];

const CATEGORY_KEYS = ["الكل", "فطريات", "بكتيريا", "حشرات", "نقص معادن", "اضطرابات فيزيولوجية"];

const severityColor: Record<string, string> = {
  منخفض: "#4caf50",
  متوسط: "#ff9800",
  عالي: "#f44336",
};

const categoryIcon: Record<string, string> = {
  فطريات: "cloud-drizzle",
  بكتيريا: "zap",
  حشرات: "scissors",
  "نقص معادن": "thermometer",
  "اضطرابات فيزيولوجية": "sun",
};

export default function DiseasesScreen() {
  const colors = useColors();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");

  const CAT_LABELS: Record<string, string> = {
    "الكل": t.all,
    "فطريات": t.catFungal,
    "بكتيريا": t.catBacteria,
    "حشرات": t.catInsect,
    "نقص معادن": t.catMineral,
    "اضطرابات فيزيولوجية": t.catPhysioFull,
  };

  const SEV_LABELS: Record<string, string> = {
    "منخفض": t.sevLow,
    "متوسط": t.sevMedium,
    "عالي": t.sevHigh,
  };
  const [selected, setSelected] = useState<Disease | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const filtered = useMemo(() => {
    return diseases.filter((d) => {
      const matchCat = activeCategory === "الكل" || d.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        d.nameAr.toLowerCase().includes(q) ||
        d.nameFr.toLowerCase().includes(q) ||
        d.crops.some((c) => c.toLowerCase().includes(q)) ||
        d.symptoms.toLowerCase().includes(q) ||
        (d.symptomsFr ?? "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.tabDiseases}</Text>
          <LogoMark size={76} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {lang === "fr" ? `${diseases.length} maladies et ravageurs documentés` : `${diseases.length} مرض وآفة زراعية موثّقة`}
        </Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchByDisease}
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

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={{ backgroundColor: colors.background, maxHeight: 48 }}
      >
        {CATEGORY_KEYS.map((cat) => {
          const active = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>
                {CAT_LABELS[cat] ?? cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          (search.trim() || activeCategory !== "الكل") ? (
            <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
              {lang === "fr" ? `${filtered.length} résultat(s)` : `${filtered.length} نتيجة`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noDiseasesFound}</Text>
          </View>
        }
        renderItem={({ item: disease }) => {
          const img = DISEASE_IMAGES[Number(disease.id)];
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelected(disease)}
              activeOpacity={0.75}
            >
              <View style={styles.cardInner}>
                {img && (
                  <Image
                    source={img}
                    style={styles.cardThumb}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitles}>
                      <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{lang === "fr" ? disease.nameFr : disease.nameAr}</Text>
                      <Text style={[styles.cardNameFr, { color: colors.mutedForeground }]} numberOfLines={1}>{lang === "fr" ? disease.nameAr : disease.nameFr}</Text>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: `${severityColor[disease.severity] ?? "#888"}22` }]}>
                      <Text style={[styles.severityText, { color: severityColor[disease.severity] ?? "#888" }]}>
                        {SEV_LABELS[disease.severity] ?? disease.severity}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.catRow}>
                    <Feather name={(categoryIcon[disease.category] as any) ?? "circle"} size={12} color={colors.primary} />
                    <Text style={[styles.catText, { color: colors.primary }]}>{CAT_LABELS[disease.category] ?? disease.category}</Text>
                  </View>

                  <Text style={[styles.symptomsPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {lang === "fr" && disease.symptomsFr ? disease.symptomsFr : disease.symptoms}
                  </Text>

                  <View style={styles.cropsRow}>
                    {(lang === "fr" && disease.cropsFr ? disease.cropsFr : disease.crops).slice(0, 3).map((crop) => (
                      <View key={crop} style={[styles.cropChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                        <Text style={[styles.cropText, { color: colors.foreground }]}>{crop}</Text>
                      </View>
                    ))}
                    {disease.crops.length > 3 && (
                      <Text style={[styles.moreCrops, { color: colors.mutedForeground }]}>+{disease.crops.length - 3}</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Disease detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20,
            },
          ]}
        >
          {selected && (() => {
            const modalImg = DISEASE_IMAGES[Number(selected.id)];
            return (
            <ScrollView showsVerticalScrollIndicator={false}>
              {modalImg ? (
                <View style={styles.modalImageWrap}>
                  <Image source={modalImg} style={styles.modalImage} resizeMode="cover" />
                  <View style={styles.modalImageOverlay} />
                  <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalCloseFab}>
                    <Feather name="x" size={20} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.modalImageTitles}>
                    <Text style={styles.modalImageName}>{lang === "fr" ? selected.nameFr : selected.nameAr}</Text>
                    <Text style={styles.modalImageNameSub}>{lang === "fr" ? selected.nameAr : selected.nameFr}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.modalHandle} />
              )}

              {!modalImg && (
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                    <Feather name="x" size={22} color={colors.foreground} />
                  </TouchableOpacity>
                  <View style={styles.modalTitles}>
                    <Text style={[styles.modalName, { color: colors.foreground }]}>
                      {lang === "fr" ? selected.nameFr : selected.nameAr}
                    </Text>
                    <Text style={[styles.modalNameFr, { color: colors.mutedForeground }]}>
                      {lang === "fr" ? selected.nameAr : selected.nameFr}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: `${severityColor[selected.severity] ?? "#888"}22` }]}>
                    <Text style={[styles.severityText, { color: severityColor[selected.severity] ?? "#888" }]}>
                      {SEV_LABELS[selected.severity] ?? selected.severity}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.modalBody}>
              <View style={styles.modalSection}>
                <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Feather name="crop" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.fieldCrops}</Text>
              </View>
              <View style={styles.cropsWrap}>
                {(lang === "fr" && selected.cropsFr ? selected.cropsFr : selected.crops).map((crop) => (
                  <View
                    key={crop}
                    style={[styles.cropChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <Text style={[styles.cropText, { color: colors.foreground }]}>{crop}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.modalSection}>
                  <View style={[styles.sectionIcon, { backgroundColor: "#ff980015" }]}>
                    <Feather name="alert-circle" size={16} color="#ff9800" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.fieldSymptoms}</Text>
                </View>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  {lang === "fr" && selected.symptomsFr ? selected.symptomsFr : selected.symptoms}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.modalSection}>
                  <View style={[styles.sectionIcon, { backgroundColor: "#4caf5015" }]}>
                    <Feather name="check-circle" size={16} color="#4caf50" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.fieldTreatment}</Text>
                </View>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  {lang === "fr" && selected.treatmentFr ? selected.treatmentFr : selected.treatment}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.modalSection}>
                  <View style={[styles.sectionIcon, { backgroundColor: "#2196f315" }]}>
                    <Feather name="shield" size={16} color="#2196f3" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.fieldPrevention}</Text>
                </View>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  {lang === "fr" && selected.preventionFr ? selected.preventionFr : selected.prevention}
                </Text>
              </View>
              </View>
            </ScrollView>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: "800", textAlign: "right" },
  subtitle: { fontSize: 13, marginTop: 2, textAlign: "right" },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: "center" },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  resultsCount: { fontSize: 13, textAlign: "right", marginBottom: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  card: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
  },
  cardThumb: {
    width: 110, height: 120,
  },
  cardBody: {
    flex: 1, padding: 12, gap: 6,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardTitles: { flex: 1, marginRight: 6 },
  cardName: { fontSize: 15, fontWeight: "700", textAlign: "right" },
  cardNameFr: { fontSize: 11, marginTop: 1, textAlign: "right" },
  cardBadges: { flexDirection: "row", gap: 6, alignItems: "center" },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  severityText: { fontSize: 11, fontWeight: "700" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  catText: { fontSize: 12, fontWeight: "600" },
  cropsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cropsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  cropChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  cropText: { fontSize: 12, fontWeight: "500" },
  moreCrops: { fontSize: 12, alignSelf: "center" },
  symptomsPreview: { fontSize: 13, lineHeight: 20, textAlign: "right" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#ccc", alignSelf: "center", marginBottom: 12, marginTop: 12,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12,
    paddingHorizontal: 16,
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalTitles: { flex: 1 },
  modalName: { fontSize: 20, fontWeight: "800", textAlign: "right" },
  modalNameFr: { fontSize: 13, textAlign: "right" },
  divider: { height: 1, marginBottom: 16, marginHorizontal: 16 },
  // Modal image banner
  modalImageWrap: {
    height: 200, width: "100%", position: "relative",
  },
  modalImage: {
    width: "100%", height: "100%",
  },
  modalImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  modalCloseFab: {
    position: "absolute", top: 14, left: 14,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  modalImageTitles: {
    position: "absolute", bottom: 14, right: 14, left: 14,
  },
  modalImageName: {
    fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "right",
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  modalImageNameSub: {
    fontSize: 13, color: "rgba(255,255,255,0.82)", textAlign: "right", marginTop: 2,
  },
  modalHeaderWithImage: { marginTop: 0 },
  modalBody: { paddingHorizontal: 16, paddingBottom: 8 },
  modalSection: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  bodyText: { fontSize: 14, lineHeight: 22, textAlign: "right" },
  infoCard: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    marginBottom: 10, gap: 4,
  },
});
