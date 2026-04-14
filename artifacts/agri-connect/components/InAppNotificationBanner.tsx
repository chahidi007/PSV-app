import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNotification } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";
import { safeHaptics } from "@/utils/haptics";

export default function InAppNotificationBanner() {
  const { current, dismiss } = useNotification();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (current) {
      safeHaptics.light();
      Animated.spring(anim, {
        toValue: 0,
        tension: 90,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [current?.id]);

  if (!current) return null;

  const handlePress = () => {
    dismiss();
    if (current.conversationId) {
      router.push(`/conversation/${current.conversationId}`);
    }
  };

  const topOffset = insets.top + (Platform.OS === "web" ? 70 : 8);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          backgroundColor: colors.foreground,
          transform: [{ translateY: anim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity style={styles.inner} onPress={handlePress} activeOpacity={0.9}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}30` }]}>
          <Feather name="bell" size={18} color={colors.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.background }]} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={[styles.body, { color: `${colors.background}cc` }]} numberOfLines={1}>
            {current.body}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
          <Feather name="x" size={16} color={`${colors.background}99`} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  body: {
    fontSize: 12,
    textAlign: "right",
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
