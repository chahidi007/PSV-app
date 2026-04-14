import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { safeHaptics } from "@/utils/haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { ADMIN_ACCESS_CODE } from "@/constants/companyCode";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { api, type ExpertDTO, type UserDTO } from "@/services/api";

type UserWithDate = UserDTO & { createdAt: number | null };

function generateId() {
  return `expert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AdminScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [unlocked, setUnlocked] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "experts" | "users" | "requests">("dashboard");

  const [experts, setExperts] = useState<ExpertDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserWithDate[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [phytoUpdating, setPhytoUpdating] = useState(false);
  const [phytoStatus, setPhytoStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingExpert, setEditingExpert] = useState<ExpertDTO | null>(null);
  const [formName, setFormName] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const verifyCode = () => {
    if (adminCode.trim() === ADMIN_ACCESS_CODE) {
      safeHaptics.success();
      setUnlocked(true);
      loadExperts();
      loadUsers();
      loadRequests();
    } else {
      safeHaptics.error();
      setCodeError(true);
      setAdminCode("");
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const data = await api.admin.conversations.list(ADMIN_ACCESS_CODE);
      setRequests(data);
    } catch {
      setRequestsError(t.failedLoadRequests);
    } finally {
      setRequestsLoading(false);
    }
  };

  const confirmDeleteRequest = async (reqId: string) => {
    safeHaptics.light();
    setDeletingId(null);
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
    await api.conversations.delete(reqId).catch(() => {});
  };

  const assignExpert = async (convId: string, expert: ExpertDTO) => {
    setAssigning(true);
    try {
      const updated = await api.admin.conversations.assign(
        convId,
        { expertId: expert.id, expertName: expert.name, expertSpecialty: expert.specialty },
        ADMIN_ACCESS_CODE
      );
      setRequests((prev) => prev.map((r) => r.id === convId ? { ...r, ...updated } : r));
      safeHaptics.success();
      setAssignModal(null);
    } catch {
      if (Platform.OS === "web") window.alert(t.failedAssignExpert);
      else Alert.alert(t.errorLabel, t.failedAssignExpert);
    } finally {
      setAssigning(false);
    }
  };

  const loadExperts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.experts.list();
      setExperts(data);
    } catch (e: any) {
      setError(t.failedLoadExperts);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingExpert(null);
    setFormName("");
    setFormSpecialty("");
    setFormLocation("");
    setFormPhone("");
    setFormPassword("");
    setShowForm(true);
  };

  const openEdit = (expert: ExpertDTO) => {
    setEditingExpert(expert);
    setFormName(expert.name);
    setFormSpecialty(expert.specialty);
    setFormLocation(expert.location);
    setFormPhone("");
    setFormPassword("");
    setShowForm(true);
  };

  const saveExpert = async () => {
    if (!formName.trim() || !formSpecialty.trim() || !formLocation.trim()) return;
    setSaving(true);
    try {
      if (editingExpert) {
        const updated = await api.experts.update(
          editingExpert.id,
          { name: formName.trim(), specialty: formSpecialty.trim(), location: formLocation.trim() },
          ADMIN_ACCESS_CODE
        );
        setExperts((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        const created = await api.experts.create(
          {
            name: formName.trim(),
            specialty: formSpecialty.trim(),
            location: formLocation.trim(),
            phone: formPhone.trim() || undefined,
            password: formPassword.trim() || undefined,
          },
          ADMIN_ACCESS_CODE
        );
        setExperts((prev) => [...prev, created]);
      }
      safeHaptics.success();
      setShowForm(false);
    } catch (e: any) {
      Alert.alert(t.errorLabel, e.message ?? t.failedSaveExpert);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (expert: ExpertDTO) => {
    try {
      const updated = await api.experts.update(
        expert.id,
        { isActive: !expert.isActive },
        ADMIN_ACCESS_CODE
      );
      setExperts((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      safeHaptics.selection();
    } catch {
      Alert.alert(t.errorLabel, t.failedUpdateExpert);
    }
  };

  const confirmDelete = (expert: ExpertDTO) => {
    safeHaptics.warning();

    const doDelete = async () => {
      try {
        await api.experts.delete(expert.id, ADMIN_ACCESS_CODE);
        setExperts((prev) => prev.filter((e) => e.id !== expert.id));
        safeHaptics.success();
      } catch {
        if (Platform.OS === "web") {
          window.alert(t.failedDeleteExpert);
        } else {
          Alert.alert(t.errorLabel, t.failedDeleteExpert);
        }
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`${t.deleteConfirmExpert} (${expert.name})`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        t.deleteExpertTitle,
        `${t.deleteConfirmExpert} (${expert.name})`,
        [
          { text: t.cancel, style: "cancel" },
          { text: t.deleteBtn, style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await api.admin.users.list(ADMIN_ACCESS_CODE);
      setUsers(data);
    } catch {
      setUsersError(t.failedLoadUsers);
    } finally {
      setUsersLoading(false);
    }
  };

  const confirmDeleteUser = (user: UserWithDate) => {
    safeHaptics.warning();
    const doDelete = async () => {
      try {
        await api.admin.users.delete(user.id, ADMIN_ACCESS_CODE);
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        safeHaptics.success();
      } catch {
        if (Platform.OS === "web") {
          window.alert(t.failedDeleteUser);
        } else {
          Alert.alert(t.errorLabel, t.failedDeleteUser);
        }
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`${t.deleteConfirmUser} (${user.name})`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        t.deleteUserTitle,
        `${t.deleteConfirmUser} (${user.name})`,
        [
          { text: t.cancel, style: "cancel" },
          { text: t.deleteBtn, style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const canSave = formName.trim() && formSpecialty.trim() && formLocation.trim();

  if (!unlocked) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.lockHeader,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <LogoMark size={68} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.adminTitle}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.lockBody}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.lockIconCircle,
              {
                backgroundColor: codeError ? `${colors.destructive}18` : `${colors.expert}18`,
                borderColor: codeError ? `${colors.destructive}40` : `${colors.expert}40`,
              },
            ]}
          >
            <Feather
              name={codeError ? "lock" : "shield"}
              size={36}
              color={codeError ? colors.destructive : colors.expert}
            />
          </View>

          <Text style={[styles.lockTitle, { color: colors.foreground }]}>
            {t.adminAccess}
          </Text>
          <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>
            {t.adminAccessSub}
          </Text>

          <TextInput
            style={[
              styles.codeInput,
              {
                backgroundColor: colors.card,
                borderColor: codeError ? colors.destructive : colors.border,
                color: colors.foreground,
              },
            ]}
            value={adminCode}
            onChangeText={(val) => {
              setAdminCode(val);
              if (codeError) setCodeError(false);
            }}
            placeholder={t.adminCodePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={verifyCode}
            autoFocus
            textAlign="center"
          />

          {codeError && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {t.adminInvalidCode}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: adminCode ? colors.expert : colors.muted }]}
            onPress={verifyCode}
            disabled={!adminCode.trim()}
          >
            <Feather name="unlock" size={18} color={adminCode ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.unlockBtnText, { color: adminCode ? "#fff" : colors.mutedForeground }]}>
              {t.enterBtn}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LogoMark size={68} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t.adminTitle}
          </Text>
          <View style={[styles.adminBadge, { backgroundColor: `${colors.expert}18` }]}>
            <Feather name="shield" size={11} color={colors.expert} />
            <Text style={[styles.adminBadgeText, { color: colors.expert }]}>{t.adminBadge}</Text>
          </View>
        </View>
        {activeTab === "experts" ? (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.expert }]}
            onPress={openAdd}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        ) : activeTab === "requests" ? (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: `${colors.expert}18` }]}
            onPress={loadRequests}
          >
            <Feather name="refresh-cw" size={16} color={colors.expert} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: `${colors.expert}18` }]}
            onPress={loadUsers}
          >
            <Feather name="refresh-cw" size={16} color={colors.expert} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "dashboard" && { borderBottomColor: colors.expert, borderBottomWidth: 2 }]}
          onPress={() => { safeHaptics.selection(); setActiveTab("dashboard"); }}
        >
          <Feather name="bar-chart-2" size={15} color={activeTab === "dashboard" ? colors.expert : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "dashboard" ? colors.expert : colors.mutedForeground, fontWeight: activeTab === "dashboard" ? "700" : "400" }]}>
            {t.tabDashboard}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "experts" && { borderBottomColor: colors.expert, borderBottomWidth: 2 }]}
          onPress={() => { safeHaptics.selection(); setActiveTab("experts"); }}
        >
          <Feather name="user-check" size={15} color={activeTab === "experts" ? colors.expert : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "experts" ? colors.expert : colors.mutedForeground, fontWeight: activeTab === "experts" ? "700" : "400" }]}>
            {t.tabExperts}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && { borderBottomColor: colors.expert, borderBottomWidth: 2 }]}
          onPress={() => { safeHaptics.selection(); setActiveTab("requests"); }}
        >
          <Feather name="inbox" size={15} color={activeTab === "requests" ? colors.expert : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "requests" ? colors.expert : colors.mutedForeground, fontWeight: activeTab === "requests" ? "700" : "400" }]}>
            {t.tabRequests}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "users" && { borderBottomColor: colors.expert, borderBottomWidth: 2 }]}
          onPress={() => { safeHaptics.selection(); setActiveTab("users"); }}
        >
          <Feather name="users" size={15} color={activeTab === "users" ? colors.expert : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "users" ? colors.expert : colors.mutedForeground, fontWeight: activeTab === "users" ? "700" : "400" }]}>
            {t.tabUsers}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "dashboard" ? (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dashSection}>
            <Text style={[styles.dashSectionTitle, { color: colors.foreground }]}>{t.platformStats}</Text>
          </View>
          <View style={styles.dashGrid}>
            {[
              { label: t.activeExperts, value: experts.filter(e => e.isActive).length, icon: "user-check", color: colors.expert },
              { label: t.totalUsers, value: users.length, icon: "users", color: colors.primary },
              { label: t.totalConsultations, value: requests.length, icon: "message-circle", color: "#2196f3" },
              { label: t.pendingAssignment, value: requests.filter(r => !r.expertId).length, icon: "clock", color: colors.warning },
              { label: t.assigned, value: requests.filter(r => r.expertId && r.status !== "resolved").length, icon: "check-circle", color: colors.success },
              { label: t.resolvedCount, value: requests.filter(r => r.status === "resolved").length, icon: "award", color: "#9c27b0" },
            ].map((stat) => (
              <View key={stat.label} style={[styles.dashCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.dashIconBox, { backgroundColor: `${stat.color}18` }]}>
                  <Feather name={stat.icon as any} size={20} color={stat.color} />
                </View>
                <Text style={[styles.dashValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[styles.dashLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.dashSection, { marginTop: 8 }]}>
            <Text style={[styles.dashSectionTitle, { color: colors.foreground }]}>{t.consultationResRate}</Text>
          </View>
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{t.resolutionRate}</Text>
              <Text style={[styles.progressPct, { color: colors.success }]}>
                {requests.length > 0 ? Math.round((requests.filter(r => r.status === "resolved").length / requests.length) * 100) : 0}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, {
                width: `${requests.length > 0 ? (requests.filter(r => r.status === "resolved").length / requests.length) * 100 : 0}%`,
                backgroundColor: colors.success,
              }]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{t.assignmentRate}</Text>
              <Text style={[styles.progressPct, { color: colors.expert }]}>
                {requests.length > 0 ? Math.round((requests.filter(r => r.expertId).length / requests.length) * 100) : 0}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, {
                width: `${requests.length > 0 ? (requests.filter(r => r.expertId).length / requests.length) * 100 : 0}%`,
                backgroundColor: colors.expert,
              }]} />
            </View>
          </View>

          {/* Phyto Index Update */}
          <View style={[styles.dashSection, { marginTop: 8 }]}>
            <Text style={[styles.dashSectionTitle, { color: colors.foreground }]}>{"Index Phytosanitaire"}</Text>
          </View>
          <TouchableOpacity
            style={[styles.phytoUpdateBtn, {
              backgroundColor: phytoStatus
                ? phytoStatus.ok ? `${colors.success}15` : `${colors.destructive}15`
                : colors.card,
              borderColor: phytoStatus
                ? phytoStatus.ok ? colors.success : colors.destructive
                : colors.border,
            }]}
            onPress={async () => {
              if (phytoUpdating) return;
              safeHaptics.light();
              setPhytoUpdating(true);
              setPhytoStatus(null);
              try {
                const res = await api.admin.updatePhytoIndex(adminCode);
                if (res.success) {
                  safeHaptics.success();
                  setPhytoStatus({ ok: true, msg: `✓ ${res.count ?? 0} produits mis à jour` });
                } else {
                  throw new Error(res.error ?? "Échec");
                }
              } catch (e: any) {
                safeHaptics.error();
                setPhytoStatus({ ok: false, msg: e.message ?? "Erreur" });
              } finally {
                setPhytoUpdating(false);
                setTimeout(() => setPhytoStatus(null), 6000);
              }
            }}
            activeOpacity={0.75}
            disabled={phytoUpdating}
          >
            {phytoUpdating
              ? <ActivityIndicator size="small" color={colors.expert} />
              : <Feather name={phytoStatus ? (phytoStatus.ok ? "check-circle" : "alert-circle") : "download-cloud"} size={18}
                  color={phytoStatus ? (phytoStatus.ok ? colors.success : colors.destructive) : colors.expert} />
            }
            <View style={{ flex: 1 }}>
              <Text style={[styles.phytoUpdateTitle, {
                color: phytoStatus ? (phytoStatus.ok ? colors.success : colors.destructive) : colors.foreground
              }]}>
                {phytoUpdating ? "Téléchargement depuis ONSSA..." : phytoStatus ? phytoStatus.msg : "Mettre à jour depuis ONSSA"}
              </Text>
              {!phytoStatus && !phytoUpdating && (
                <Text style={[styles.phytoUpdateSub, { color: colors.mutedForeground }]}>
                  {"eservice.onssa.gov.ma · Mise à jour automatique"}
                </Text>
              )}
            </View>
            {!phytoUpdating && !phytoStatus && (
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>

          <View style={[styles.dashSection, { marginTop: 8 }]}>
            <Text style={[styles.dashSectionTitle, { color: colors.foreground }]}>{t.recentConsultations ?? "أحدث الاستشارات"}</Text>
          </View>
          {requests.slice(0, 5).map((req) => (
            <View key={req.id} style={[styles.miniReqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.miniDot, { backgroundColor: req.status === "resolved" ? colors.success : req.expertId ? colors.expert : colors.warning }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniTitle, { color: colors.foreground }]} numberOfLines={1}>{req.title}</Text>
                <Text style={[styles.miniSub, { color: colors.mutedForeground }]}>{req.clientName} · {new Date(req.createdAt).toLocaleDateString("fr-MA")}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : activeTab === "requests" ? (
        requestsLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.expert} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t.loading}</Text>
          </View>
        ) : requestsError ? (
          <View style={styles.centered}>
            <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
            <Text style={[styles.errorMsg, { color: colors.mutedForeground }]}>{requestsError}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.expert }]} onPress={loadRequests}>
              <Text style={styles.retryBtnText}>{t.retry ?? "إعادة المحاولة"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noFarmerRequests}</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{t.expertSub}</Text>
              </View>
            ) : (
              <>
                {requests.filter((r) => !r.expertId).length > 0 && (
                  <View style={[styles.reqSectionHeader, { borderBottomColor: colors.border }]}>
                    <Feather name="clock" size={13} color={colors.warning} />
                    <Text style={[styles.reqSectionTitle, { color: colors.warning }]}>
                      {t.pendingAssignment} ({requests.filter((r) => !r.expertId).length})
                    </Text>
                  </View>
                )}
                {requests.filter((r) => !r.expertId).map((req) => (
                  <View key={req.id} style={[styles.reqCard, { backgroundColor: colors.card, borderColor: `${colors.warning}40` }]}>
                    <View style={styles.reqCardTop}>
                      <View style={[styles.reqStatusDot, { backgroundColor: colors.warning }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reqTitle, { color: colors.foreground }]} numberOfLines={1}>{req.title}</Text>
                        <Text style={[styles.reqClient, { color: colors.mutedForeground }]}>
                          <Feather name="user" size={11} /> {req.clientName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.assignBtn, { backgroundColor: colors.expert }]}
                        onPress={() => { safeHaptics.selection(); setAssignModal(req.id); }}
                      >
                        <Feather name="user-plus" size={14} color="#fff" />
                        <Text style={styles.assignBtnText}>{t.assigned}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.reqIssue, { color: colors.mutedForeground }]} numberOfLines={2}>{req.issue}</Text>
                    <Text style={[styles.reqDate, { color: colors.mutedForeground }]}>
                      {new Date(req.createdAt).toLocaleDateString("fr-MA")}
                    </Text>
                    {deletingId === req.id ? (
                      <View style={styles.deleteConfirmRow}>
                        <TouchableOpacity
                          style={styles.deleteCancelBtn}
                          onPress={() => { safeHaptics.light(); setDeletingId(null); }}
                        >
                          <Text style={[styles.deleteCancelText, { color: colors.mutedForeground }]}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteConfirmBtn}
                          onPress={() => confirmDeleteRequest(req.id)}
                        >
                          <Feather name="trash-2" size={13} color="#fff" />
                          <Text style={styles.deleteConfirmText}>{t.deleteConsultBtn}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteReqRow}
                        onPress={() => { safeHaptics.warning(); setDeletingId(req.id); }}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={13} color="#f44336" />
                        <Text style={styles.deleteReqRowText}>{t.deleteConsult}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {requests.filter((r) => !!r.expertId).length > 0 && (
                  <View style={[styles.reqSectionHeader, { borderBottomColor: colors.border, marginTop: 12 }]}>
                    <Feather name="check-circle" size={13} color={colors.success} />
                    <Text style={[styles.reqSectionTitle, { color: colors.success }]}>
                      {t.assigned} ({requests.filter((r) => !!r.expertId).length})
                    </Text>
                  </View>
                )}
                {requests.filter((r) => !!r.expertId).map((req) => (
                  <View key={req.id} style={[styles.reqCard, { backgroundColor: colors.card, borderColor: `${colors.success}30` }]}>
                    <View style={styles.reqCardTop}>
                      <View style={[styles.reqStatusDot, { backgroundColor: colors.success }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reqTitle, { color: colors.foreground }]} numberOfLines={1}>{req.title}</Text>
                        <Text style={[styles.reqClient, { color: colors.mutedForeground }]}>
                          <Feather name="user" size={11} /> {req.clientName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.assignBtn, { backgroundColor: `${colors.expert}20` }]}
                        onPress={() => { safeHaptics.selection(); setAssignModal(req.id); }}
                      >
                        <Feather name="refresh-cw" size={13} color={colors.expert} />
                        <Text style={[styles.assignBtnText, { color: colors.expert }]}>{t.editBtn ?? "تغيير"}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.assignedBadge, { backgroundColor: `${colors.expert}12` }]}>
                      <Feather name="user-check" size={12} color={colors.expert} />
                      <Text style={[styles.assignedBadgeText, { color: colors.expert }]}>{req.expertName}</Text>
                    </View>
                    {deletingId === req.id ? (
                      <View style={styles.deleteConfirmRow}>
                        <TouchableOpacity
                          style={styles.deleteCancelBtn}
                          onPress={() => { safeHaptics.light(); setDeletingId(null); }}
                        >
                          <Text style={[styles.deleteCancelText, { color: colors.mutedForeground }]}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteConfirmBtn}
                          onPress={() => confirmDeleteRequest(req.id)}
                        >
                          <Feather name="trash-2" size={13} color="#fff" />
                          <Text style={styles.deleteConfirmText}>{t.deleteConsultBtn}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteReqRow}
                        onPress={() => { safeHaptics.warning(); setDeletingId(req.id); }}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={13} color="#f44336" />
                        <Text style={styles.deleteReqRowText}>{t.deleteConsult}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )
      ) : activeTab === "experts" ? (
        loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.expert} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t.loading}</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
            <Text style={[styles.errorMsg, { color: colors.mutedForeground }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.expert }]} onPress={loadExperts}>
              <Text style={styles.retryBtnText}>{t.retry ?? "إعادة المحاولة"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {experts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noExpertsYet}</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{t.addExpertPrompt}</Text>
                <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.expert }]} onPress={openAdd}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>{t.addExpert}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              experts.map((expert) => (
                <View
                  key={expert.id}
                  style={[styles.expertCard, { backgroundColor: colors.card, borderColor: expert.isActive ? colors.border : `${colors.destructive}40`, opacity: expert.isActive ? 1 : 0.7 }]}
                >
                  <View style={[styles.expertAvatar, { backgroundColor: expert.isActive ? colors.expertLight : colors.muted }]}>
                    <Feather name="user-check" size={22} color={expert.isActive ? colors.expert : colors.mutedForeground} />
                  </View>
                  <View style={styles.expertInfo}>
                    <View style={styles.expertNameRow}>
                      <Text style={[styles.expertName, { color: colors.foreground }]}>{expert.name}</Text>
                      {!expert.isActive && (
                        <View style={[styles.inactiveBadge, { backgroundColor: `${colors.destructive}18` }]}>
                          <Text style={[styles.inactiveBadgeText, { color: colors.destructive }]}>{t.inactive}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.expertSpecialty, { color: colors.expert }]}>{expert.specialty}</Text>
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.expertLocation, { color: colors.mutedForeground }]}>{expert.location}</Text>
                    </View>
                  </View>
                  <View style={styles.expertActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.expert}15` }]} onPress={() => openEdit(expert)}>
                      <Feather name="edit-2" size={14} color={colors.expert} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: expert.isActive ? `${colors.warning}15` : `${colors.success}15` }]}
                      onPress={() => toggleActive(expert)}
                    >
                      <Feather name={expert.isActive ? "pause" : "play"} size={14} color={expert.isActive ? colors.warning : colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.destructive}15` }]} onPress={() => confirmDelete(expert)}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )
      ) : (
        usersLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.expert} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t.loading}</Text>
          </View>
        ) : usersError ? (
          <View style={styles.centered}>
            <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
            <Text style={[styles.errorMsg, { color: colors.mutedForeground }]}>{usersError}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.expert }]} onPress={loadUsers}>
              <Text style={styles.retryBtnText}>{t.retry ?? "إعادة المحاولة"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {users.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noUsersYet}</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{t.usersEmptySub}</Text>
              </View>
            ) : (
              users.map((user) => (
                <View key={user.id} style={[styles.expertCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.expertAvatar, { backgroundColor: user.role === "expert" ? colors.expertLight : colors.clientLight }]}>
                    <Feather
                      name={user.role === "expert" ? "user-check" : "user"}
                      size={22}
                      color={user.role === "expert" ? colors.expert : colors.client}
                    />
                  </View>
                  <View style={styles.expertInfo}>
                    <View style={styles.expertNameRow}>
                      <Text style={[styles.expertName, { color: colors.foreground }]}>{user.name}</Text>
                      <View style={[styles.inactiveBadge, { backgroundColor: user.role === "expert" ? `${colors.expert}18` : colors.clientLight }]}>
                        <Text style={[styles.inactiveBadgeText, { color: user.role === "expert" ? colors.expert : colors.client }]}>
                          {user.role === "expert" ? t.expertLabel : t.farmer}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.locationRow}>
                      <Feather name="phone" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.expertLocation, { color: colors.mutedForeground }]}>{user.phone}</Text>
                    </View>
                    {user.specialty ? (
                      <Text style={[styles.expertSpecialty, { color: colors.expert }]}>{user.specialty}</Text>
                    ) : null}
                    {user.createdAt ? (
                      <View style={styles.locationRow}>
                        <Feather name="calendar" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.expertLocation, { color: colors.mutedForeground }]}>
                          {new Date(user.createdAt).toLocaleDateString("fr-MA")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.expertActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.destructive}15` }]} onPress={() => confirmDeleteUser(user)}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )
      )}

      {/* Assign Expert Modal */}
      <Modal visible={!!assignModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAssignModal(null)}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: Platform.OS === "ios" ? 16 : 12 }]}>
            <TouchableOpacity onPress={() => setAssignModal(null)} style={styles.backBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.chooseExpert}</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>
              {t.assignNote}
            </Text>
            {experts.filter((e) => e.isActive).map((expert) => (
              <TouchableOpacity
                key={expert.id}
                style={[styles.expertCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { if (!assigning && assignModal) assignExpert(assignModal, expert); }}
                disabled={assigning}
              >
                <View style={[styles.expertAvatar, { backgroundColor: colors.expertLight }]}>
                  <Feather name="user-check" size={22} color={colors.expert} />
                </View>
                <View style={styles.expertInfo}>
                  <Text style={[styles.expertName, { color: colors.foreground }]}>{expert.name}</Text>
                  <Text style={[styles.expertSpecialty, { color: colors.expert }]}>{expert.specialty}</Text>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.expertLocation, { color: colors.mutedForeground }]}>{expert.location}</Text>
                  </View>
                </View>
                {assigning ? (
                  <ActivityIndicator size="small" color={colors.expert} />
                ) : (
                  <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            ))}
            {experts.filter((e) => e.isActive).length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="user-x" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noActiveExperts}</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{t.noActiveExpertsSub}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border, paddingTop: Platform.OS === "ios" ? 16 : 12 },
            ]}
          >
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {editingExpert ? t.editExpertTitle : t.addExpertTitle}
            </Text>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: canSave ? colors.expert : colors.muted }]}
              onPress={saveExpert}
              disabled={!canSave || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.saveBtnText, { color: canSave ? "#fff" : colors.mutedForeground }]}>
                  {t.saveBtn}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.formBody}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                {t.expertFormNameLabel}
              </Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                value={formName}
                onChangeText={setFormName}
                placeholder={t.expertFormNamePlaceholder}
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
                returnKeyType="next"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                {t.expertFormSpecialtyLabel}
              </Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                value={formSpecialty}
                onChangeText={setFormSpecialty}
                placeholder={t.expertFormSpecialtyPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
                returnKeyType="next"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                {t.expertFormLocationLabel}
              </Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder={t.expertFormLocationPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
                returnKeyType="next"
              />
            </View>

            {!editingExpert && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                  {t.expertAccountNote}
                </Text>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    {t.expertPhoneLabel}
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                    ]}
                    value={formPhone}
                    onChangeText={setFormPhone}
                    placeholder="+212 6xx xxx xxx"
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="right"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    {t.expertPasswordLabel}
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                    ]}
                    value={formPassword}
                    onChangeText={setFormPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={saveExpert}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  lockBody: {
    paddingHorizontal: 28,
    paddingTop: 48,
    alignItems: "center",
    gap: 14,
  },
  lockIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lockTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  lockSub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
  },
  codeInput: {
    width: "100%",
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 8,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 54,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  unlockBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  loadingText: { fontSize: 14 },
  errorMsg: { fontSize: 14, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryBtnText: { color: "#fff", fontWeight: "700" },
  list: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  expertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  expertAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  expertInfo: {
    flex: 1,
    gap: 2,
  },
  expertNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  expertName: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  expertSpecialty: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  expertLocation: {
    fontSize: 12,
  },
  expertActions: {
    flexDirection: "column",
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  formBody: {
    padding: 20,
    gap: 16,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  fieldInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  sectionHint: {
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
  },
  reqSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  reqSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  reqCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  reqCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reqStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reqTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  reqClient: {
    fontSize: 12,
    textAlign: "right",
  },
  reqIssue: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
  },
  reqDate: {
    fontSize: 11,
    textAlign: "right",
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  deleteReqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: "#f4433610",
    borderWidth: 1,
    borderColor: "#f4433630",
  },
  deleteReqRowText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f44336",
  },
  deleteConfirmRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#00000010",
  },
  deleteCancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  deleteConfirmBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#f44336",
  },
  deleteConfirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  assignedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 2,
  },
  assignedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dashSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dashSectionTitle: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  dashGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 12, gap: 10,
  },
  dashCard: {
    width: "30%", flex: 1, minWidth: 90,
    alignItems: "center", padding: 14,
    borderRadius: 16, borderWidth: 1, gap: 6,
  },
  dashIconBox: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  dashValue: { fontSize: 24, fontWeight: "800" },
  dashLabel: { fontSize: 11, textAlign: "center", fontWeight: "500" },
  progressCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    padding: 16, gap: 8,
  },
  progressRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  progressLabel: { fontSize: 13, fontWeight: "500" },
  progressPct: { fontSize: 15, fontWeight: "700" },
  progressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  phytoUpdateBtn: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 6,
    padding: 14, borderRadius: 14, borderWidth: 1, gap: 12,
  },
  phytoUpdateTitle: { fontSize: 14, fontWeight: "700" },
  phytoUpdateSub: { fontSize: 12, marginTop: 2 },
  miniReqCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 6,
    padding: 12, borderRadius: 12, borderWidth: 1, gap: 10,
  },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  miniTitle: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  miniSub: { fontSize: 12, marginTop: 2, textAlign: "right" },
});
