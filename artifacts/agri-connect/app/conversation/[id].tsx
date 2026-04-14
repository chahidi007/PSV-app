import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { safeHaptics } from "@/utils/haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LogoMark from "@/components/LogoMark";
import MessageBubble from "@/components/MessageBubble";
import RatingModal from "@/components/RatingModal";
import { Message, useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { imagePicker, videoPicker } from "@/hooks/useImagePicker";
import { useColors } from "@/hooks/useColors";
import { api } from "@/services/api";

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    profile,
    conversations,
    messages,
    addMessage,
    markConversationRead,
    loadMessages,
    rateConversation,
    updateConversation,
  } = useApp();
  const recorder = useAudioRecorder();

  const conv = conversations.find((c) => c.id === id);
  const allMessages: Message[] = messages[id ?? ""] ?? [];
  const [text, setText] = useState("");
  const [myRating, setMyRating] = useState<number>(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isExpertOnline, setIsExpertOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      loadMessages(id);
      markConversationRead(id);
    }
  }, [id, loadMessages, markConversationRead]);

  // ── Adaptive polling: 3s when active (<60s), 15s when idle ──────────────────
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const latestTimestampRef = useRef<number | undefined>(undefined);

  // Keep latestTimestamp in sync with the message list
  useEffect(() => {
    if (allMessages.length > 0) {
      latestTimestampRef.current = allMessages[allMessages.length - 1].timestamp;
    }
  }, [allMessages]);

  const signalActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await loadMessages(id, latestTimestampRef.current);
      if (cancelled) return;
      const delay = Date.now() - lastActivityRef.current < 60_000 ? 3_000 : 15_000;
      pollRef.current = setTimeout(tick, delay);
    };

    pollRef.current = setTimeout(tick, 3_000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [id, loadMessages]);

  // ── Expert online status ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!conv?.expertId) return;
    api.users.status(conv.expertId).then((s) => setIsExpertOnline(s.isOnline)).catch(() => {});
    const t = setInterval(() => {
      api.users.status(conv!.expertId!).then((s) => setIsExpertOnline(s.isOnline)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [conv?.expertId]);

  // ── Typing signal (debounced 2.5s) ───────────────────────────────────────────
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTextChange = (val: string) => {
    setText(val);
    signalActivity();
    if (!id || !profile) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    api.conversations.setTyping(id, profile.id).catch(() => {});
    typingTimer.current = setTimeout(() => { typingTimer.current = null; }, 2500);
  };

  // ── Typing indicator from the other side ─────────────────────────────────────
  const otherIsTyping =
    !!conv?.typingUserId &&
    conv.typingUserId !== profile?.id &&
    !!conv.typingAt &&
    Date.now() - conv.typingAt < 6000;

  // ── Pull-to-refresh ───────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await loadMessages(id);
    setRefreshing(false);
  }, [id, loadMessages]);

  // ── Rating ────────────────────────────────────────────────────────────────────
  const handleRate = async (stars: number) => {
    if (!id || ratingSubmitted) return;
    setMyRating(stars);
    setRatingSubmitted(true);
    safeHaptics.success();
    await rateConversation(id, stars);
  };

  // ── Messages filtered by search (chronological: oldest → newest) ────────────
  const displayMessages = searchQuery.trim()
    ? allMessages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : allMessages;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (displayMessages.length > 0 && !searchQuery) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [displayMessages.length, searchQuery]);

  // ── Send actions ──────────────────────────────────────────────────────────────
  const sendText = useCallback(() => {
    if (!text.trim() || !profile || !id) return;
    signalActivity();
    safeHaptics.light();
    addMessage({
      conversationId: id,
      senderId: profile.id,
      senderName: profile.name,
      senderRole: profile.role,
      type: "text",
      content: text.trim(),
    });
    setText("");
  }, [text, profile, id, addMessage]);

  const sendImage = useCallback(async () => {
    if (!profile || !id) return;
    const images = await imagePicker.pickFromLibrary();
    for (const img of images) {
      safeHaptics.light();
      addMessage({
        conversationId: id,
        senderId: profile.id,
        senderName: profile.name,
        senderRole: profile.role,
        type: "image",
        content: "",
        imageUri: img.uri,
      });
    }
  }, [profile, id, addMessage]);

  const takePhoto = useCallback(async () => {
    if (!profile || !id) return;
    const img = await imagePicker.pickFromCamera();
    if (img) {
      safeHaptics.light();
      addMessage({
        conversationId: id,
        senderId: profile.id,
        senderName: profile.name,
        senderRole: profile.role,
        type: "image",
        content: "",
        imageUri: img.uri,
      });
    }
  }, [profile, id, addMessage]);

  const sendVideo = useCallback(async () => {
    if (!profile || !id) return;
    const video = await videoPicker.pick();
    if (video) {
      safeHaptics.light();
      addMessage({
        conversationId: id,
        senderId: profile.id,
        senderName: profile.name,
        senderRole: profile.role,
        type: "video",
        content: t.videoShared,
        videoUri: video.uri,
      });
    }
  }, [profile, id, addMessage]);

  const handleStartRecording = async () => {
    await recorder.startRecording();
    safeHaptics.medium();
  };

  const handleStopRecording = async () => {
    if (!profile || !id) return;
    const result = await recorder.stopRecording();
    if (result) {
      safeHaptics.success();
      addMessage({
        conversationId: id,
        senderId: profile.id,
        senderName: profile.name,
        senderRole: profile.role,
        type: "audio",
        content: t.audioMessage,
        audioUri: result.uri,
        audioDuration: result.duration,
      });
    }
  };

  const handleCancelRecording = async () => {
    await recorder.cancelRecording();
    safeHaptics.light();
  };

  const formatDur = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Long-press handler passed to MessageBubble ────────────────────────────────
  const handleLongPress = (msg: Message) => {
    safeHaptics.medium();
    const isMine = msg.senderId === profile?.id;
    if (Platform.OS === "web") {
      if (msg.type === "text" && navigator.clipboard) {
        navigator.clipboard.writeText(msg.content).catch(() => {});
      }
      return;
    }
    Alert.alert(t.msgOptions, undefined, [
      ...(msg.type === "text"
        ? [{ text: t.copyText, onPress: () => {} }]
        : []),
      ...(isMine
        ? [{ text: t.deleteMsg, style: "destructive" as const, onPress: () => {} }]
        : []),
      { text: t.cancel, style: "cancel" as const },
    ]);
  };

  if (!conv) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          {t.conversationNotFound}
        </Text>
      </View>
    );
  }

  const headerSubtitle =
    profile?.role === "client"
      ? conv.expertName
        ? `${conv.expertName} · ${conv.expertSpecialty ?? t.expertLabel}`
        : t.waitingForExpert
      : conv.clientName;

  const handleCloseCase = () => {
    if (conv.status === "resolved" || closing) return;
    safeHaptics.warning();
    setConfirmClose(true);
  };

  const doCloseCase = async () => {
    setConfirmClose(false);
    setClosing(true);
    safeHaptics.light();
    try {
      await api.conversations.update(id!, { status: "resolved" });
      updateConversation(id!, { status: "resolved" });
      safeHaptics.success();
    } catch {
      safeHaptics.error();
    } finally {
      setClosing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <LogoMark size={56} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {conv.title}
          </Text>
          <View style={styles.headerSubRow}>
            {conv.expertId && (
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: isExpertOnline ? colors.success : colors.border },
                ]}
              />
            )}
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {conv.expertId
                ? isExpertOnline
                  ? `${headerSubtitle} · ${t.online}`
                  : headerSubtitle
                : headerSubtitle}
            </Text>
          </View>
        </View>
        {/* Search toggle */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => { setSearchVisible((v) => !v); setSearchQuery(""); }}
        >
          <Feather name={searchVisible ? "x" : "search"} size={20} color={colors.foreground} />
        </TouchableOpacity>

        {/* Close case — expert only */}
        {profile?.role === "expert" && conv.status !== "resolved" && !confirmClose && (
          <TouchableOpacity
            style={[styles.closeCaseBtn, { backgroundColor: `${colors.destructive}15`, borderColor: `${colors.destructive}40` }]}
            onPress={handleCloseCase}
            disabled={closing}
            activeOpacity={0.75}
          >
            {closing
              ? <Feather name="loader" size={14} color={colors.destructive} />
              : <Feather name="check-square" size={14} color={colors.destructive} />
            }
            <Text style={[styles.closeCaseBtnText, { color: colors.destructive }]}>
              {t.closeCase}
            </Text>
          </TouchableOpacity>
        )}

        {/* Inline confirmation — replaces Alert.alert for cross-platform support */}
        {profile?.role === "expert" && conv.status !== "resolved" && confirmClose && (
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={[styles.confirmCancelBtn, { borderColor: colors.border }]}
              onPress={() => setConfirmClose(false)}
            >
              <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmOkBtn, { backgroundColor: colors.destructive }]}
              onPress={doCloseCase}
            >
              <Text style={styles.confirmOkText}>{t.closeCaseBtn}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resolved indicator for expert */}
        {profile?.role === "expert" && conv.status === "resolved" && (
          <View style={[styles.resolvedPill, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}40` }]}>
            <Feather name="check-circle" size={13} color={colors.success} />
            <Text style={[styles.resolvedPillText, { color: colors.success }]}>
              {t.caseAlreadyClosed}
            </Text>
          </View>
        )}
      </View>

      {/* ── In-conversation search bar ─────────────────────────────────────── */}
      {searchVisible && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.searchMessages}
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Text style={[styles.searchCount, { color: colors.mutedForeground }]}>
              {displayMessages.length} {t.resultsCount}
            </Text>
          )}
        </View>
      )}

      {/* ── Closed case banner (expert view) ─────────────────────────────── */}
      {conv.status === "resolved" && profile?.role === "expert" && (
        <View style={[styles.closedBanner, { backgroundColor: `${colors.success}12`, borderBottomColor: `${colors.success}30` }]}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={[styles.closedBannerText, { color: colors.success }]}>
            {t.caseClosedBanner}
          </Text>
        </View>
      )}

      {/* ── Rating banner ─────────────────────────────────────────────────── */}
      {conv.status === "resolved" && profile?.role === "client" && (
        <TouchableOpacity
          style={[styles.ratingBanner, { backgroundColor: ratingSubmitted ? `${colors.success}12` : `#f9a82512`, borderBottomColor: colors.border }]}
          onPress={() => setShowRatingModal(true)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 20 }}>{ratingSubmitted ? "⭐".repeat(myRating) : "☆☆☆☆☆"}</Text>
          <Text style={[styles.ratingPrompt, { color: ratingSubmitted ? colors.success : colors.foreground }]}>
            {ratingSubmitted ? t.ratingThanks : t.tapToRate}
          </Text>
          <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}

      <RatingModal
        visible={showRatingModal}
        existingRating={conv.rating ?? (ratingSubmitted ? myRating : null)}
        onSubmit={async (rating, _review) => {
          await rateConversation(id!, rating);
          setMyRating(rating);
          setRatingSubmitted(true);
          setShowRatingModal(false);
        }}
        onDismiss={() => setShowRatingModal(false)}
      />

      <KeyboardAvoidingView
        style={styles.kvContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.senderId === profile?.id}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          contentContainerStyle={styles.msgList}
          ListFooterComponent={
            otherIsTyping ? (
              <View style={styles.typingRow}>
                <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.typingDots}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[styles.typingDot, { backgroundColor: colors.mutedForeground }]} />
                    ))}
                  </View>
                  <Text style={[styles.typingLabel, { color: colors.mutedForeground }]}>
                    {profile?.role === "client" ? t.expertTyping : t.farmerTyping}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {searchQuery ? t.noMatchingMessages : t.startConversation}
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (!searchQuery) flatListRef.current?.scrollToEnd({ animated: false });
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />

        {/* ── Input area ─────────────────────────────────────────────────── */}
        {conv.status === "resolved" ? (
          <View style={[styles.closedInputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.closedInputText, { color: colors.mutedForeground }]}>
              {t.caseAlreadyClosed}
            </Text>
          </View>
        ) : recorder.isRecording ? (
          <View
            style={[
              styles.recordingBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
              },
            ]}
          >
            <TouchableOpacity onPress={handleCancelRecording} style={styles.cancelRec}>
              <Feather name="x" size={22} color={colors.destructive} />
            </TouchableOpacity>
            <View style={styles.recIndicator}>
              <View style={[styles.recDot, { backgroundColor: colors.destructive }]} />
              <Text style={[styles.recTime, { color: colors.foreground }]}>
                {formatDur(recorder.duration)}
              </Text>
              <Text style={[styles.recLabel, { color: colors.mutedForeground }]}>
                {t.recording}...
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.stopRecBtn, { backgroundColor: colors.primary }]}
              onPress={handleStopRecording}
            >
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 4,
              },
            ]}
          >
            <TouchableOpacity onPress={takePhoto} style={styles.attachBtn}>
              <Feather name="camera" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={sendImage} style={styles.attachBtn}>
              <Feather name="image" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={sendVideo} style={styles.attachBtn}>
              <Feather name="video" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign: "right",
                },
              ]}
              value={text}
              onChangeText={onTextChange}
              placeholder={t.typeMessage}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={1000}
            />

            {text.trim() ? (
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                onPress={sendText}
              >
                <Feather name="send" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.micBtn, { backgroundColor: colors.audioLight }]}
                onPress={handleStartRecording}
              >
                <Feather name="mic" size={20} color={colors.audio} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  headerSubRow: { flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "flex-end" },
  headerSub: { fontSize: 12, marginTop: 1, textAlign: "right" },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchCount: { fontSize: 12 },
  kvContainer: { flex: 1 },
  msgList: { paddingHorizontal: 4, paddingVertical: 8 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15 },
  typingRow: { paddingHorizontal: 12, paddingBottom: 4 },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  typingDots: { flexDirection: "row", gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  typingLabel: { fontSize: 13 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  attachBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  micBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelRec: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  recIndicator: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recTime: { fontSize: 17, fontWeight: "700", fontVariant: ["tabular-nums"] },
  recLabel: { fontSize: 13 },
  stopRecBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  ratingBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 10,
  },
  ratingPrompt: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  ratingThanks: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  starsRow: { flexDirection: "row", gap: 4 },
  starBtn: { padding: 4 },
  // Close case
  closeCaseBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  closeCaseBtnText: { fontSize: 12, fontWeight: "700" },
  resolvedPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  resolvedPillText: { fontSize: 12, fontWeight: "700" },
  closedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closedBannerText: { fontSize: 13, fontWeight: "700" },
  closedInputBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  closedInputText: { fontSize: 14, fontWeight: "600" },
  // Inline close confirmation
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  confirmCancelBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
  },
  confirmCancelText: { fontSize: 12, fontWeight: "600" },
  confirmOkBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16,
  },
  confirmOkText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});
