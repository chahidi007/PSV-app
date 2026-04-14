import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

const ND = Platform.OS !== "web";

function BadgeIcon({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: color }]}>
      <Text style={badgeStyles.text}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  text: { color: "#fff", fontSize: 9, fontWeight: "800" },
});

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function AnimatedTabIcon({
  name,
  focused,
  color,
  badge,
}: {
  name: FeatherName;
  focused: boolean;
  color: string;
  badge?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.5)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.22,
          useNativeDriver: ND,
          damping: 9,
          stiffness: 180,
          mass: 0.7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: ND,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: ND,
          damping: 12,
          stiffness: 180,
          mass: 0.7,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 160,
          useNativeDriver: ND,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity, alignItems: "center" }}>
      <Feather name={name} size={22} color={color} />
      {badge != null && badge > 0 && (
        <BadgeIcon count={badge} color={color} />
      )}
    </Animated.View>
  );
}

function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "leaf", selected: "leaf.fill" }} />
        <Label>{t.tabConsultations}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="diseases">
        <Icon sf={{ default: "cross.case", selected: "cross.case.fill" }} />
        <Label>{t.tabDiseases}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="phyto">
        <Icon sf={{ default: "flask", selected: "flask.fill" }} />
        <Label>{t.tabIndex}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="gallery">
        <Icon sf={{ default: "photo.stack", selected: "photo.stack.fill" }} />
        <Label>{t.tabGallery}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>{t.tabProfile}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { conversations, profile } = useApp();
  const { t } = useLanguage();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const myConversations = conversations.filter((c) =>
    profile?.role === "client" ? c.clientId === profile.id : c.expertId === profile?.id
  );
  const unreadCount = myConversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 64,
          paddingBottom: isWeb ? 12 : 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabConsultations,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 10 },
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="leaf" tintColor={color} size={24} />
            ) : (
              <AnimatedTabIcon name="grid" focused={focused} color={color} badge={unreadCount} />
            ),
        }}
      />
      <Tabs.Screen
        name="diseases"
        options={{
          title: t.tabDiseases,
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="cross.case" tintColor={color} size={24} />
            ) : (
              <AnimatedTabIcon name="activity" focused={focused} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="phyto"
        options={{
          title: t.tabIndex,
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="list.bullet.clipboard" tintColor={color} size={24} />
            ) : (
              <AnimatedTabIcon name="list" focused={focused} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t.tabGallery,
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="photo.stack" tintColor={color} size={24} />
            ) : (
              <AnimatedTabIcon name="image" focused={focused} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <AnimatedTabIcon name="user" focused={focused} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
