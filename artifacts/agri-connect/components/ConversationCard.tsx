import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Conversation } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  conversation: Conversation;
  onPress: () => void;
  onDelete?: () => void;
}

const ConversationCard = React.memo(function ConversationCard({ conversation, onPress, onDelete }: Props) {
  const colors = useColors();
  const { t, lang } = useLanguage();

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.timeNow;
    if (mins < 60) return lang === "fr" ? `Il y a ${mins} min` : `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return lang === "fr" ? `Il y a ${hours} h` : `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days === 1) return t.timeYesterday;
    if (days < 7) return lang === "fr" ? `Il y a ${days} j` : `منذ ${days} أيام`;
    return lang === "fr" ? `Il y a ${Math.floor(days / 7)} sem` : `منذ ${Math.floor(days / 7)} أسابيع`;
  }

  const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
    open:        { color: "#f57c00", label: t.statusWaiting, icon: "clock" },
    in_progress: { color: "#2d7d2d", label: t.statusActive,  icon: "activity" },
    resolved:    { color: "#6b8f6b", label: t.statusResolved, icon: "check-circle" },
  };

  const status = STATUS_CONFIG[conversation.status] ?? STATUS_CONFIG.open;
  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: hasUnread ? `${status.color}50` : colors.border,
          shadowColor: "#000",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {/* Status accent bar on the left */}
      <View style={[styles.accentBar, { backgroundColor: status.color }]} />

      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {conversation.thumbnailUri ? (
          <Image
            source={{ uri: conversation.thumbnailUri }}
            style={[styles.thumbnail, { borderColor: colors.border }]}
          />
        ) : (
          <View
            style={[
              styles.thumbnail,
              styles.thumbnailPlaceholder,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Feather name="image" size={26} color={colors.primary} />
          </View>
        )}
        {hasUnread && (
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={styles.badgeText}>
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title + time */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground },
              hasUnread && styles.titleBold,
            ]}
            numberOfLines={1}
          >
            {conversation.title}
          </Text>
          {conversation.lastMessageTime != null && (
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {timeAgo(conversation.lastMessageTime)}
            </Text>
          )}
        </View>

        {/* Expert chip */}
        {conversation.expertName ? (
          <View style={[styles.expertChip, { backgroundColor: colors.expertLight }]}>
            <Feather name="user-check" size={11} color={colors.expert} />
            <Text style={[styles.expertName, { color: colors.expert }]} numberOfLines={1}>
              {conversation.expertName}
              {conversation.expertSpecialty ? `  ·  ${conversation.expertSpecialty}` : ""}
            </Text>
          </View>
        ) : null}

        {/* Last message */}
        <Text
          style={[
            styles.lastMsg,
            {
              color: hasUnread ? colors.foreground : colors.mutedForeground,
              fontWeight: hasUnread ? "600" : "400",
            },
          ]}
          numberOfLines={1}
        >
          {conversation.lastMessageType === "audio" && "🎙 "}
          {conversation.lastMessageType === "image" && "🖼 "}
          {conversation.lastMessage || conversation.issue || t.noMessagesYet}
        </Text>

        {/* Status badge + delete button */}
        <View style={styles.statusRow}>
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.deleteBtn, { borderColor: "#f4433630" }]}
            >
              <Feather name="trash-2" size={13} color="#f44336" />
            </TouchableOpacity>
          )}
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}18`, borderColor: `${status.color}40`, borderWidth: 1 }]}>
            <Feather name={status.icon as any} size={10} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default ConversationCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "stretch",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  accentBar: {
    width: 4,
    borderRadius: 0,
  },
  thumbWrap: {
    position: "relative",
    padding: 14,
    justifyContent: "center",
  },
  thumbnail: {
    width: 66,
    height: 66,
    borderRadius: 14,
    borderWidth: 1,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 14,
    gap: 4,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  title: {
    fontSize: 15,
    flex: 1,
    textAlign: "right",
  },
  titleBold: {
    fontWeight: "800",
  },
  time: {
    fontSize: 11,
    flexShrink: 0,
  },
  expertChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  expertName: {
    fontSize: 11,
    fontWeight: "600",
  },
  lastMsg: {
    fontSize: 13,
    textAlign: "right",
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  deleteBtn: {
    padding: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
