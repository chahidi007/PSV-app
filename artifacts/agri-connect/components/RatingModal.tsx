import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { safeHaptics } from "@/utils/haptics";

interface Props {
  visible: boolean;
  existingRating?: number | null;
  onSubmit: (rating: number, review: string) => Promise<void>;
  onDismiss: () => void;
}

export default function RatingModal({ visible, existingRating, onSubmit, onDismiss }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(existingRating ?? 0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(!!existingRating);

  const handleStar = (star: number) => {
    safeHaptics.selection();
    setSelected(star);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    safeHaptics.success();
    setSubmitting(true);
    try {
      await onSubmit(selected, review);
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const starColor = (star: number) => {
    const fill = (hovered || selected) >= star;
    return fill ? "#f9a825" : colors.border;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {done ? (
            <View style={styles.doneBox}>
              <View style={[styles.doneCircle, { backgroundColor: "#f9a82520" }]}>
                <Text style={{ fontSize: 40 }}>⭐</Text>
              </View>
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>
                {t.ratingThanks}
              </Text>
              <Text style={[styles.doneStars, { color: "#f9a825" }]}>
                {"★".repeat(existingRating ?? selected)}{"☆".repeat(5 - (existingRating ?? selected))}
              </Text>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.secondary }]} onPress={onDismiss}>
                <Text style={[styles.closeBtnText, { color: colors.primary }]}>{t.cancel}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.handle} />
              <Text style={[styles.title, { color: colors.foreground }]}>{t.rateService}</Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleStar(star)}
                    onPressIn={() => setHovered(star)}
                    onPressOut={() => setHovered(0)}
                    style={styles.starBtn}
                  >
                    <Feather
                      name="star"
                      size={38}
                      color={starColor(star)}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {selected > 0 && (
                <Text style={[styles.ratingLabel, { color: colors.mutedForeground }]}>
                  {["", t.ratingPoor, t.ratingAcceptable, t.ratingGood, t.ratingVeryGood, t.ratingExcellent][selected]}
                </Text>
              )}

              <TextInput
                style={[styles.reviewInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={review}
                onChangeText={setReview}
                placeholder={t.writeReview}
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlign="right"
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: selected ? "#f9a825" : colors.muted },
                ]}
                onPress={handleSubmit}
                disabled={!selected || submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.submitText, { color: selected ? "#fff" : colors.mutedForeground }]}>
                      {t.submitRating}
                    </Text>
                }
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 36,
    gap: 16,
    alignItems: "center",
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: -8,
  },
  reviewInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
  },
  submitBtn: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 17,
    fontWeight: "800",
  },
  doneBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  doneCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  doneStars: {
    fontSize: 28,
    letterSpacing: 2,
  },
  closeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
