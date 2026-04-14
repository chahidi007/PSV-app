import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { safeHaptics } from "@/utils/haptics";

export default function FloatingLangToggle() {
  const { lang, setLang } = useLanguage();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const switchTo = lang === "ar" ? "fr" : "ar";
  const label = lang === "ar" ? "FR" : "عر";
  const subLabel = lang === "ar" ? "Français" : "العربية";

  const handlePress = () => {
    safeHaptics.selection();
    setLang(switchTo);
  };

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          bottom: insets.bottom + (Platform.OS === "web" ? 88 : 80),
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={[styles.globe]}>🌐</Text>
      <View>
        <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 9999,
  },
  globe: {
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 15,
  },
  sub: {
    fontSize: 9,
    fontWeight: "500",
    lineHeight: 11,
  },
});
