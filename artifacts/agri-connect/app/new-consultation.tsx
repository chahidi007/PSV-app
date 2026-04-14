import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { safeHaptics } from "@/utils/haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

import LogoMark from "@/components/LogoMark";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { imagePicker } from "@/hooks/useImagePicker";
import { useColors } from "@/hooks/useColors";
import { api } from "@/services/api";

const DRAFT_KEY = "draft_new_consultation";

type DiagnoseDisease = {
  name: string;
  confidence: number;
  description: string;
  recommendations: string[];
};

type DiagnosisResult = {
  diseases: DiagnoseDisease[];
  summary: string;
  urgency: "high" | "medium" | "low";
  disclaimer: string;
};

function ConfidenceBar({ value, colors }: { value: number; colors: ReturnType<typeof useColors> }) {
  const color =
    value >= 70 ? colors.destructive : value >= 40 ? colors.warning : colors.primary;
  return (
    <View style={[barStyles.track, { backgroundColor: colors.muted }]}>
      <View
        style={[
          barStyles.fill,
          { width: `${Math.max(4, value)}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: "hidden", flex: 1 },
  fill: { height: "100%", borderRadius: 3 },
});

function UrgencyBadge({
  urgency,
  t,
  colors,
}: {
  urgency: "high" | "medium" | "low";
  t: any;
  colors: ReturnType<typeof useColors>;
}) {
  const map = {
    high: { label: t.aiUrgencyHigh, color: colors.destructive },
    medium: { label: t.aiUrgencyMedium, color: colors.warning },
    low: { label: t.aiUrgencyLow, color: colors.primary },
  };
  const { label, color } = map[urgency];
  return (
    <View style={[badgeStyles.badge, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: "700" },
});

export default function NewConsultationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { profile, addConversation, addMessage } = useApp();

  const [title, setTitle] = useState("");
  const [issue, setIssue] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [includeInConsult, setIncludeInConsult] = useState(true);
  const [diagError, setDiagError] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (draft.title || draft.issue) {
          if (draft.title) setTitle(draft.title);
          if (draft.issue) setIssue(draft.issue);
          setDraftRestored(true);
        }
      } catch { /* ignore */ }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!title && !issue) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ title, issue, savedAt: Date.now() })).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [title, issue]);

  useEffect(() => {
    setDiagnosis(null);
    setDiagError(false);
  }, [photos]);

  const pickPhoto = async () => {
    const images = await imagePicker.pickFromLibrary();
    setPhotos((prev) => [...prev, ...images.map((i) => i.uri)].slice(0, 3));
  };

  const takePhoto = async () => {
    const img = await imagePicker.pickFromCamera();
    if (img) setPhotos((prev) => [...prev, img.uri].slice(0, 3));
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const runAIDiagnosis = async () => {
    if (diagnosing || photos.length === 0) return;
    setDiagnosing(true);
    setDiagnosis(null);
    setDiagError(false);
    safeHaptics.light();
    try {
      const uri = photos[0];
      let imageBase64: string;
      let mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";

      if (Platform.OS === "web") {
        if (uri.startsWith("data:")) {
          const commaIdx = uri.indexOf(",");
          const header = uri.substring(5, commaIdx);
          const detectedMime = header.split(";")[0];
          if (detectedMime === "image/png" || detectedMime === "image/webp") {
            mimeType = detectedMime;
          }
          imageBase64 = uri.substring(commaIdx + 1);
        } else {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } else {
        const resized = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        mimeType = "image/jpeg";
        imageBase64 = resized.base64!;
      }

      const result = await api.diagnoseImage({
        imageBase64,
        mimeType,
        culture: undefined,
        region: undefined,
        description: issue.trim() || undefined,
        lang,
        timeoutMs: 60000,
      });

      setDiagnosis(result);
      setIncludeInConsult(true);
      safeHaptics.success();
    } catch {
      setDiagError(true);
      safeHaptics.error();
    } finally {
      setDiagnosing(false);
    }
  };

  const buildDiagnosisText = (d: DiagnosisResult): string => {
    const lines: string[] = [];
    lines.push(`🤖 ${t.aiDiagnosisTitle}`);
    lines.push("");
    d.diseases.forEach((dis, i) => {
      lines.push(`${i + 1}. ${dis.name} (${dis.confidence}%)`);
      lines.push(`   ${dis.description}`);
    });
    lines.push("");
    lines.push(`📋 ${t.aiSummary}: ${d.summary}`);
    lines.push(`⚠️ ${t.aiDisclaimer}`);
    return lines.join("\n");
  };

  const canSubmit = title.trim() && issue.trim() && photos.length > 0;

  const submit = async () => {
    if (!canSubmit || !profile || submitting) return;

    safeHaptics.success();
    setSubmitting(true);

    try {
      const conv = await addConversation({
        clientId: profile.id,
        clientName: profile.name,
        expertId: undefined,
        expertName: undefined,
        expertSpecialty: undefined,
        title: title.trim(),
        issue: issue.trim(),
        status: "open",
        thumbnailUri: photos[0],
        lastMessage: undefined,
        lastMessageTime: undefined,
        lastMessageType: undefined,
      });

      await Promise.all(photos.map((photoUri) =>
        addMessage({
          conversationId: conv.id,
          senderId: profile.id,
          senderName: profile.name,
          senderRole: "client",
          type: "image",
          content: "",
          imageUri: photoUri,
        })
      ));

      await addMessage({
        conversationId: conv.id,
        senderId: profile.id,
        senderName: profile.name,
        senderRole: "client",
        type: "text",
        content: issue.trim(),
      });

      if (diagnosis && includeInConsult) {
        await addMessage({
          conversationId: conv.id,
          senderId: profile.id,
          senderName: profile.name,
          senderRole: "client",
          type: "text",
          content: buildDiagnosisText(diagnosis),
        });
      }

      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      router.replace(`/conversation/${conv.id}`);
    } catch {
      safeHaptics.error();
      setIsOffline(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LogoMark size={68} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.newConsultation}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: canSubmit ? colors.primary : colors.muted },
          ]}
          onPress={submit}
          disabled={!canSubmit || submitting}
        >
          <Text
            style={[
              styles.submitBtnText,
              {
                color: canSubmit ? colors.primaryForeground : colors.mutedForeground,
              },
            ]}
          >
            {submitting ? t.sending : t.send}
          </Text>
        </TouchableOpacity>
      </View>

      {draftRestored && (
        <View style={[styles.draftBanner, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
          <Feather name="bookmark" size={14} color={colors.primary} />
          <Text style={[styles.draftText, { color: colors.primary }]}>{t.draftRestored}</Text>
          <TouchableOpacity onPress={() => { setTitle(""); setIssue(""); setDraftRestored(false); AsyncStorage.removeItem(DRAFT_KEY).catch(()=>{}); }}>
            <Text style={[styles.draftDiscard, { color: colors.mutedForeground }]}>{t.discardDraft}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isOffline && (
        <View style={[styles.draftBanner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
          <Feather name="wifi-off" size={14} color={colors.warning} />
          <Text style={[styles.draftText, { color: colors.warning }]}>{t.youAreOffline}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t.photosSection}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            {t.photosHint}
          </Text>
          <View style={styles.photosRow}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.photoWrapper}>
                <Image
                  source={{ uri }}
                  style={[styles.photo, { borderColor: colors.border }]}
                />
                <TouchableOpacity
                  style={[styles.removePhoto, { backgroundColor: colors.destructive }]}
                  onPress={() => removePhoto(idx)}
                >
                  <Feather name="x" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <View style={styles.addPhotoBtns}>
                <TouchableOpacity
                  style={[
                    styles.addPhotoBtn,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={takePhoto}
                >
                  <Feather name="camera" size={22} color={colors.primary} />
                  <Text style={[styles.addPhotoBtnText, { color: colors.primary }]}>
                    {t.camera}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addPhotoBtn,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={pickPhoto}
                >
                  <Feather name="image" size={22} color={colors.accent} />
                  <Text style={[styles.addPhotoBtnText, { color: colors.accent }]}>
                    {t.galleryLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {photos.length > 0 && !diagnosis && !diagnosing && (
            <TouchableOpacity
              style={[styles.aiBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}40` }]}
              onPress={runAIDiagnosis}
              activeOpacity={0.75}
            >
              <Feather name="cpu" size={17} color={colors.primary} />
              <Text style={[styles.aiBtnText, { color: colors.primary }]}>
                {t.aiDiagnoseBtn}
              </Text>
            </TouchableOpacity>
          )}

          {diagnosing && (
            <View style={[styles.diagLoading, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.diagLoadingText, { color: colors.mutedForeground }]}>
                {t.aiDiagnosing}
              </Text>
            </View>
          )}

          {diagError && !diagnosing && (
            <View style={[styles.diagError, { backgroundColor: `${colors.destructive}10`, borderColor: `${colors.destructive}30` }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.diagErrorTitle, { color: colors.destructive }]}>{t.aiError}</Text>
                <Text style={[styles.diagErrorSub, { color: colors.mutedForeground }]}>{t.aiErrorSub}</Text>
              </View>
              <TouchableOpacity onPress={runAIDiagnosis}>
                <Text style={[styles.aiRetryText, { color: colors.primary }]}>{t.aiRetry}</Text>
              </TouchableOpacity>
            </View>
          )}

          {diagnosis && !diagnosing && (
            <View style={[styles.diagCard, { backgroundColor: colors.card, borderColor: `${colors.primary}30` }]}>
              <View style={styles.diagCardHeader}>
                <View style={[styles.aiBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Feather name="cpu" size={11} color={colors.primary} />
                  <Text style={[styles.aiBadgeText, { color: colors.primary }]}>{t.aiDiagnosisBadge}</Text>
                </View>
                <Text style={[styles.diagCardTitle, { color: colors.foreground }]}>{t.aiDiagnosisTitle}</Text>
                <UrgencyBadge urgency={diagnosis.urgency} t={t} colors={colors} />
                <TouchableOpacity onPress={() => setDiagnosis(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {diagnosis.diseases.map((dis, i) => (
                <View key={i} style={[styles.diseaseRow, i < diagnosis.diseases.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 12 }]}>
                  <View style={styles.diseaseHeader}>
                    <Text style={[styles.diseaseName, { color: colors.foreground }]}>{dis.name}</Text>
                    <Text style={[styles.diseaseConf, { color: colors.mutedForeground }]}>{dis.confidence}%</Text>
                  </View>
                  <View style={styles.confBarRow}>
                    <ConfidenceBar value={dis.confidence} colors={colors} />
                  </View>
                  <Text style={[styles.diseaseDesc, { color: colors.mutedForeground }]}>{dis.description}</Text>
                  {dis.recommendations.length > 0 && (
                    <View style={styles.recoList}>
                      {dis.recommendations.map((r, ri) => (
                        <View key={ri} style={styles.recoItem}>
                          <Feather name="chevron-right" size={12} color={colors.primary} style={{ marginTop: 2 }} />
                          <Text style={[styles.recoText, { color: colors.foreground }]}>{r}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              <View style={[styles.diagSummaryRow, { backgroundColor: `${colors.muted}40`, borderRadius: 8, padding: 10 }]}>
                <Text style={[styles.diagSummaryLabel, { color: colors.mutedForeground }]}>{t.aiSummary}</Text>
                <Text style={[styles.diagSummaryText, { color: colors.foreground }]}>{diagnosis.summary}</Text>
              </View>

              <Text style={[styles.diagDisclaimer, { color: colors.mutedForeground }]}>{t.aiDisclaimer}</Text>

              <TouchableOpacity
                style={styles.includeToggleRow}
                onPress={() => setIncludeInConsult((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkBox,
                  {
                    backgroundColor: includeInConsult ? colors.primary : "transparent",
                    borderColor: includeInConsult ? colors.primary : colors.border,
                  }
                ]}>
                  {includeInConsult && <Feather name="check" size={11} color="#fff" />}
                </View>
                <Text style={[styles.includeToggleText, { color: colors.foreground }]}>{t.aiIncludeInConsult}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t.consultationTitle}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                textAlign: "right",
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={t.titlePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t.issueDesc}
          </Text>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                textAlign: "right",
              },
            ]}
            value={issue}
            onChangeText={setIssue}
            placeholder={t.issuePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            returnKeyType="done"
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={[styles.section, { gap: 6 }]}>
          <View style={[styles.noticeBanner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}>
            <Feather name="info" size={15} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.warning }]}>
              {t.assignNotice}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "right" },
  submitBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  submitBtnText: { fontSize: 15, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },
  section: { paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textAlign: "right" },
  sectionHint: { fontSize: 13, lineHeight: 18, marginTop: -4, textAlign: "right" },
  divider: { height: 1, marginVertical: 4 },
  photosRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  photoWrapper: { position: "relative" },
  photo: { width: 90, height: 90, borderRadius: 12, borderWidth: 1 },
  removePhoto: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtns: { flexDirection: "row", gap: 10 },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addPhotoBtnText: { fontSize: 11, fontWeight: "600" },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  draftText: { flex: 1, fontSize: 13, fontWeight: "600", textAlign: "right" },
  draftDiscard: { fontSize: 12, fontWeight: "500" },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
    fontWeight: "500",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  aiBtnText: { fontSize: 14, fontWeight: "700" },
  diagLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  diagLoadingText: { fontSize: 14, fontWeight: "500" },
  diagError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  diagErrorTitle: { fontSize: 13, fontWeight: "700" },
  diagErrorSub: { fontSize: 12, marginTop: 2 },
  aiRetryText: { fontSize: 13, fontWeight: "700" },
  diagCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
    marginTop: 4,
  },
  diagCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700" },
  diagCardTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  diseaseRow: { gap: 6 },
  diseaseHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  diseaseName: { fontSize: 14, fontWeight: "700", flex: 1 },
  diseaseConf: { fontSize: 13, fontWeight: "600" },
  confBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  diseaseDesc: { fontSize: 13, lineHeight: 18 },
  recoList: { gap: 4, marginTop: 2 },
  recoItem: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  recoText: { fontSize: 13, lineHeight: 18, flex: 1 },
  diagSummaryRow: { gap: 4 },
  diagSummaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  diagSummaryText: { fontSize: 13, lineHeight: 18 },
  diagDisclaimer: { fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  includeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  includeToggleText: { fontSize: 13, fontWeight: "600", flex: 1 },
});
