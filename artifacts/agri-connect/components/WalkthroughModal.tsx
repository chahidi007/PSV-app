import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { safeHaptics } from "@/utils/haptics";

const STORAGE_KEY = "walkthrough_seen_v1";

interface Props {
  role: "client" | "expert";
}

export default function WalkthroughModal({ role }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const STEPS = [
    { icon: "camera" as const, color: "#2d7d2d", title: t.walkStep1Title, desc: t.walkStep1Desc },
    { icon: "user-check" as const, color: "#1a6b5a", title: t.walkStep2Title, desc: t.walkStep2Desc },
    { icon: "message-circle" as const, color: "#7c4dff", title: t.walkStep3Title, desc: t.walkStep3Desc },
    { icon: "check-circle" as const, color: "#388e3c", title: t.walkStep4Title, desc: t.walkStep4Desc },
  ];

  useEffect(() => {
    if (role !== "client") return;
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, [role]);

  const dismiss = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const next = () => {
    safeHaptics.light();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const current = STEPS[step];

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 20,
            },
          ]}
        >
          {/* Skip */}
          <TouchableOpacity style={styles.skipBtn} onPress={dismiss}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{t.skip}</Text>
          </TouchableOpacity>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === step ? colors.primary : colors.border,
                    width: i === step ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Icon */}
          <View style={[styles.iconBox, { backgroundColor: `${current.color}18` }]}>
            <Feather name={current.icon} size={52} color={current.color} />
          </View>

          {/* Text */}
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>{current.title}</Text>
          <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{current.desc}</Text>

          {/* Button */}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={next}
          >
            <Text style={styles.nextText}>
              {step < STEPS.length - 1 ? t.walkNext : t.walkStart}
            </Text>
            <Feather name={step < STEPS.length - 1 ? "arrow-left" : "check"} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 24,
    alignItems: "center",
    gap: 16,
  },
  skipBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    padding: 8,
  },
  skipText: { fontSize: 14 },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 8,
  },
  dot: { height: 8, borderRadius: 4 },
  iconBox: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  stepDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  nextText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
