import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { safeHaptics } from "@/utils/haptics";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LogoMark from "@/components/LogoMark";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("ar-MA", { year: "numeric", month: "short", day: "numeric" });
}

export default function GalleryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { conversations, messages, loadConversations } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  type PhotoItem = {
    id: string;
    uri: string;
    conversationId: string;
    title: string;
    timestamp: number;
  };

  const photos: PhotoItem[] = [];

  conversations.forEach((conv) => {
    if (conv.thumbnailUri) {
      photos.push({
        id: `thumb-${conv.id}`,
        uri: conv.thumbnailUri,
        conversationId: conv.id,
        title: conv.title,
        timestamp: conv.createdAt,
      });
    }
    const msgs = messages[conv.id] ?? [];
    msgs.forEach((m) => {
      if (m.type === "image" && m.imageUri) {
        photos.push({
          id: `msg-${m.id}`,
          uri: m.imageUri,
          conversationId: conv.id,
          title: conv.title,
          timestamp: m.timestamp,
        });
      }
    });
  });

  const unique = Array.from(new Map(photos.map((p) => [p.uri, p])).values());
  unique.sort((a, b) => b.timestamp - a.timestamp);

  const NUM_COLS = 2;

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
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.photoDiagnosis}</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{t.photoDiagnosisSub}</Text>
          </View>
          <LogoMark size={76} />
        </View>
      </View>

      <FlatList
        data={unique}
        keyExtractor={(p) => p.id}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 12,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Text style={{ fontSize: 44 }}>📷</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noPhotos}</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{t.noPhotosSub}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.photoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              safeHaptics.light();
              router.push(`/conversation/${item.conversationId}`);
            }}
            activeOpacity={0.85}
          >
            <Image source={{ uri: item.uri }} style={styles.photo} resizeMode="cover" />
            <View style={[styles.photoInfo, { backgroundColor: colors.card }]}>
              <Text style={[styles.photoTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.photoDate, { color: colors.mutedForeground }]}>
                {formatDate(item.timestamp)}
              </Text>
            </View>
            <View style={[styles.viewBtn, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="arrow-left" size={12} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}
      />
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
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
  },
  headerSub: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 2,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  photoCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  photo: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#eee",
  },
  photoInfo: {
    padding: 10,
    gap: 2,
  },
  photoTitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  photoDate: {
    fontSize: 11,
    textAlign: "right",
  },
  viewBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
