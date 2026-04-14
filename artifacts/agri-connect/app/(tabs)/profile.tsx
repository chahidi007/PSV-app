import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { safeHaptics } from "@/utils/haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMark from "@/components/LogoMark";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, conversations, messages, signOut } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [notifCanAsk, setNotifCanAsk] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        const { status, canAskAgain } = await Notifications.getPermissionsAsync();
        setNotifGranted(status === "granted");
        setNotifCanAsk(canAskAgain);
      } catch {
        setNotifGranted(false);
      }
    })();
  }, []);

  const handleNotifToggle = async () => {
    if (Platform.OS === "web") return;
    safeHaptics.light();
    try {
      const Notifications = await import("expo-notifications");
      if (notifGranted) {
        Alert.alert(
          t.notifications,
          Platform.OS === "ios" ? t.notificationsOpenSettings : t.notificationsOpenSettings,
          [
            { text: t.cancel, style: "cancel" },
            { text: t.notificationsOpenSettings, onPress: () => Linking.openSettings() },
          ]
        );
      } else if (notifCanAsk) {
        const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
        setNotifGranted(status === "granted");
        setNotifCanAsk(canAskAgain);
      } else {
        Linking.openSettings();
      }
    } catch { }
  };

  const myConversations = useMemo(() =>
    conversations.filter((c) =>
      profile?.role === "client"
        ? c.clientId === profile.id
        : c.expertId === profile?.id || profile?.role === "expert"
    ),
    [conversations, profile?.id, profile?.role]
  );

  const resolvedCount = useMemo(() =>
    myConversations.filter((c) => c.status === "resolved").length,
    [myConversations]
  );

  const totalMessages = useMemo(() =>
    myConversations.reduce((sum, c) => {
      const msgs = messages[c.id] ?? [];
      return sum + msgs.filter((m) => m.senderId === profile?.id).length;
    }, 0),
    [myConversations, messages, profile?.id]
  );

  const handleDeleteAccountRequest = () => {
    safeHaptics.warning();
    const subject = encodeURIComponent(t.deleteAccountTitle);
    const body = encodeURIComponent(
      `${t.deleteAccountSub}\n\n${profile?.name ?? ""}\n${profile?.id ?? ""}`
    );
    const mailto = `mailto:phytoclinicsv@gmail.com?subject=${subject}&body=${body}`;

    if (Platform.OS !== "web") {
      Alert.alert(
        t.deleteAccountConfirmTitle,
        t.deleteAccountConfirmMsg,
        [
          { text: t.cancel, style: "cancel" },
          {
            text: t.deleteAccountConfirmBtn,
            style: "destructive",
            onPress: () => {
              Linking.openURL(mailto).catch(() => {});
              Alert.alert(t.deleteAccountSuccessTitle, t.deleteAccountSuccessMsg);
            },
          },
        ]
      );
    } else {
      Linking.openURL(mailto).catch(() => {});
    }
  };

  const handleSignOut = () => {
    safeHaptics.warning();
    if (Platform.OS !== "web") {
      Alert.alert(
        t.signOut,
        t.signOutMsg,
        [
          { text: t.cancel, style: "cancel" },
          { text: t.signOut, style: "destructive", onPress: () => signOut() },
        ]
      );
      return;
    }
    if (!confirmingSignOut) {
      setConfirmingSignOut(true);
      return;
    }
    setConfirmingSignOut(false);
    signOut();
  };

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.profileTitle}</Text>
          <LogoMark size={76} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor:
                  profile?.role === "expert" ? colors.expertLight : colors.secondary,
              },
            ]}
          >
            <Feather
              name={profile?.role === "expert" ? "user-check" : "crop"}
              size={36}
              color={profile?.role === "expert" ? colors.expert : colors.primary}
            />
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {profile?.name ?? ""}
          </Text>
          <View
            style={[
              styles.rolePill,
              {
                backgroundColor:
                  profile?.role === "expert" ? colors.expertLight : colors.secondary,
              },
            ]}
          >
            <Text
              style={[
                styles.rolePillText,
                {
                  color:
                    profile?.role === "expert" ? colors.expert : colors.primary,
                },
              ]}
            >
              {profile?.role === "expert" ? t.expert : t.farmer}
            </Text>
          </View>
          {profile?.specialty && (
            <Text style={[styles.specialty, { color: colors.mutedForeground }]}>
              {profile.specialty}
            </Text>
          )}
          {profile?.location && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
              <Text style={[styles.location, { color: colors.mutedForeground }]}>
                {profile.location}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.activity}
          </Text>
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="message-circle" size={22} color={colors.primary} />
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {myConversations.length}
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                {t.consultations}
              </Text>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="check-circle" size={22} color={colors.success} />
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {resolvedCount}
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                {t.resolvedCount}
              </Text>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="send" size={22} color={colors.accent} />
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {totalMessages}
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                {t.sentMessages}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.settings}</Text>

          {/* Dark mode */}
          <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Switch
              value={isDark}
              onValueChange={() => { safeHaptics.light(); toggleTheme(); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>{t.darkMode}</Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                {isDark ? t.enabled : t.disabled}
              </Text>
            </View>
            <Feather name={isDark ? "moon" : "sun"} size={20} color={isDark ? colors.primary : colors.warning} />
          </View>

          {/* Notifications */}
          {Platform.OS !== "web" && (
            <TouchableOpacity
              style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleNotifToggle}
              activeOpacity={0.8}
            >
              {notifGranted === null ? (
                <View style={{ width: 51 }} />
              ) : (
                <Switch
                  value={notifGranted === true}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  pointerEvents="none"
                />
              )}
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.foreground }]}>{t.notifications}</Text>
                <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                  {notifGranted ? t.notificationsOn : t.notificationsOff}
                </Text>
              </View>
              <Feather name="bell" size={20} color={notifGranted ? colors.primary : colors.mutedForeground} />
            </TouchableOpacity>
          )}

          {/* Language */}
          <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.langButtons}>
              <TouchableOpacity
                style={[styles.langBtn, lang === "ar" && { backgroundColor: colors.primary }]}
                onPress={() => { safeHaptics.light(); setLang("ar"); }}
              >
                <Text style={[styles.langBtnText, { color: lang === "ar" ? "#fff" : colors.mutedForeground }]}>
                  {t.arabic}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, lang === "fr" && { backgroundColor: colors.expert }]}
                onPress={() => { safeHaptics.light(); setLang("fr"); }}
              >
                <Text style={[styles.langBtnText, { color: lang === "fr" ? "#fff" : colors.mutedForeground }]}>
                  {t.french}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>{t.language}</Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                {lang === "ar" ? t.arabic : t.french}
              </Text>
            </View>
            <Feather name="globe" size={20} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.admin}
          </Text>
          <TouchableOpacity
            style={[
              styles.adminBtn,
              { backgroundColor: `${colors.expert}12`, borderColor: `${colors.expert}40` },
            ]}
            onPress={() => {
              safeHaptics.medium();
              router.push("/admin");
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.adminBtnIcon, { backgroundColor: colors.expertLight }]}>
              <Feather name="shield" size={20} color={colors.expert} />
            </View>
            <View style={styles.adminBtnInfo}>
              <Text style={[styles.adminBtnTitle, { color: colors.foreground }]}>
                {t.adminPanel}
              </Text>
              <Text style={[styles.adminBtnSub, { color: colors.mutedForeground }]}>
                {t.adminPanelSub}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {profile?.role === "expert" && (
            <TouchableOpacity
              style={[
                styles.adminBtn,
                { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` },
              ]}
              onPress={() => {
                safeHaptics.medium();
                router.push("/zoho-stock");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.adminBtnIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="package" size={20} color={colors.primary} />
              </View>
              <View style={styles.adminBtnInfo}>
                <Text style={[styles.adminBtnTitle, { color: colors.foreground }]}>
                  {t.zohoStockTitle}
                </Text>
                <Text style={[styles.adminBtnSub, { color: colors.mutedForeground }]}>
                  {t.zohoStockSub}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.about}
          </Text>
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <Feather name="info" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                {t.aboutText}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteAccountBtn, { borderColor: `${colors.border}`, backgroundColor: colors.card }]}
          onPress={() => {
            safeHaptics.light();
            Linking.openURL("https://phytoclinic.onrender.com/api/delete-account");
          }}
          activeOpacity={0.8}
        >
          <Feather name="external-link" size={15} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.deleteAccountText, { color: colors.foreground, fontWeight: "600", fontSize: 14 }]}>
              {t.deleteAccountLink}
            </Text>
            <Text style={[{ color: colors.mutedForeground, fontSize: 11, textAlign: "center", marginTop: 1 }]}>
              {t.deleteAccountLinkSub}
            </Text>
          </View>
          <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteAccountBtn, { borderColor: `${colors.destructive}30`, justifyContent: "center" }]}
          onPress={handleDeleteAccountRequest}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={15} color={colors.destructive} style={{ opacity: 0.7 }} />
          <Text style={[styles.deleteAccountText, { color: colors.destructive }]}>
            {t.deleteAccountSub}
          </Text>
        </TouchableOpacity>

        {confirmingSignOut && Platform.OS === "web" && (
          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: `${colors.muted}50`, borderColor: colors.border }]}
            onPress={() => setConfirmingSignOut(false)}
            activeOpacity={0.8}
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>{t.cancel}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            confirmingSignOut && Platform.OS === "web"
              ? { backgroundColor: colors.destructive, borderColor: colors.destructive }
              : { backgroundColor: `${colors.destructive}15`, borderColor: `${colors.destructive}40` },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Feather
            name="log-out"
            size={18}
            color={confirmingSignOut && Platform.OS === "web" ? "#fff" : colors.destructive}
          />
          <Text
            style={[
              styles.signOutText,
              { color: confirmingSignOut && Platform.OS === "web" ? "#fff" : colors.destructive },
            ]}
          >
            {confirmingSignOut && Platform.OS === "web" ? t.confirmSignOut : t.signOut}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "right",
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 20,
    gap: 24,
  },
  profileCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  specialty: {
    fontSize: 14,
    textAlign: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 13,
  },
  statsSection: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLbl: {
    fontSize: 11,
    textAlign: "center",
  },
  actionsSection: { gap: 12 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "600", textAlign: "right" },
  settingSubtitle: { fontSize: 12, marginTop: 2, textAlign: "right" },
  langButtons: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#0001",
    borderRadius: 12,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  adminBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  adminBtnInfo: {
    flex: 1,
  },
  adminBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  adminBtnSub: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
  },
  infoCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
