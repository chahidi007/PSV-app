import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Message } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

// Web-only portal helper — renders children directly into document.body
function WebPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  const { createPortal } = require("react-dom");
  return createPortal(children, document.body);
}

// ── Full-screen Media Viewer ──────────────────────────────────────────────────
type MediaViewerProps = {
  uri: string;
  type: "image" | "video";
  onClose: () => void;
};

function WebMediaViewer({ uri, type, onClose }: MediaViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  }, []);

  const overlayStyle = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    width: "100vw", height: "100vh",
    zIndex: 99999,
    backgroundColor: "#000",
  };

  const content = (
    /* @ts-ignore */
    <div style={overlayStyle} onClick={onClose}>
      {/* @ts-ignore */}
      <button
        onClick={(e: any) => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 10,
          background: "rgba(255,255,255,0.2)", border: "none",
          borderRadius: "50%", width: 44, height: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#fff", fontSize: 22, lineHeight: 1,
        } as any}
      >✕</button>

      {type === "image" ? (
        /* @ts-ignore */
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url(${uri})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          } as any}
          onClick={(e: any) => e.stopPropagation()}
        />
      ) : (
        /* @ts-ignore */
        <video
          ref={videoRef}
          src={uri}
          controls
          playsInline
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            width: "100%", height: "100%",
            objectFit: "contain", background: "#000",
          } as any}
          onClick={(e: any) => e.stopPropagation()}
        />
      )}
    </div>
  );

  return <WebPortal>{content}</WebPortal>;
}

function NativeMediaViewer({ uri, type, onClose }: MediaViewerProps) {
  const [VideoComp, setVideoComp] = useState<any>(null);
  useEffect(() => {
    if (type === "video") {
      import("expo-av").then((m) => setVideoComp(() => m.Video)).catch(() => {});
    }
  }, [type]);

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Full-screen media */}
        {type === "image" ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="contain"
          />
        ) : VideoComp ? (
          <VideoComp
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            useNativeControls
            resizeMode="contain"
            shouldPlay
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        )}

        {/* Tap-outside-media to close — sits behind the media but fills screen */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />

        {/* Close button on top of everything */}
        <TouchableOpacity
          style={{
            position: "absolute", top: 48, right: 16, zIndex: 20,
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
          }}
          onPress={onClose}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
        >
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function MediaViewer(props: MediaViewerProps) {
  if (Platform.OS === "web") return <WebMediaViewer {...props} />;
  return <NativeMediaViewer {...props} />;
}


interface Props {
  message: Message;
  isMine: boolean;
  onLongPress?: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Web audio player using HTML Audio element
const AUDIO_SPEEDS = [1, 1.5, 2];

function WebAudioPlayer({
  uri,
  duration,
  isMine,
}: {
  uri: string;
  duration?: number;
  isMine: boolean;
}) {
  const colors = useColors();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const speed = AUDIO_SPEEDS[speedIdx];

  useEffect(() => {
    const audio = new Audio(uri);
    audioRef.current = audio;
    audio.ontimeupdate = () => setPosition(audio.currentTime);
    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };
    audio.onended = () => {
      setIsPlaying(false);
      setPosition(0);
    };
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [uri]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        audio.playbackRate = speed;
        await audio.play();
        setIsPlaying(true);
      } catch {
        // autoplay blocked or format not supported
      }
    }
  };

  const cycleSpeed = () => setSpeedIdx((i) => (i + 1) % AUDIO_SPEEDS.length);

  const bubbleBg = isMine ? colors.primary : colors.audioLight;
  const iconColor = isMine ? "#fff" : colors.audio;
  const textColor = isMine ? "#fff" : colors.audio;
  const barFill = isMine ? "rgba(255,255,255,0.6)" : colors.audio;
  const barBg = isMine ? "rgba(255,255,255,0.25)" : `${colors.audio}33`;
  const progress = totalDuration > 0 ? position / totalDuration : 0;

  return (
    <TouchableOpacity
      style={[styles.audioBubble, { backgroundColor: bubbleBg }]}
      onPress={togglePlay}
      activeOpacity={0.8}
    >
      <View style={[styles.audioPlayBtn, { backgroundColor: iconColor + "22" }]}>
        <Feather name={isPlaying ? "pause" : "play"} size={18} color={iconColor} />
      </View>
      <View style={styles.audioWave}>
        <View style={[styles.waveBar, { backgroundColor: barBg }]}>
          <View style={[styles.waveFill, { backgroundColor: barFill, width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={[styles.audioDuration, { color: textColor }]}>
          {formatDuration(isPlaying ? position : totalDuration)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={cycleSpeed}
        style={[styles.speedBtn, { backgroundColor: iconColor + "22" }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.speedText, { color: textColor }]}>
          {speed === 1 ? "1×" : `${speed}×`}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// Native audio player using expo-av
function NativeAudioPlayer({
  uri,
  duration,
  isMine,
}: {
  uri: string;
  duration?: number;
  isMine: boolean;
}) {
  const colors = useColors();
  const [sound, setSound] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const speed = AUDIO_SPEEDS[speedIdx];

  useEffect(() => {
    return () => { sound?.unloadAsync(); };
  }, [sound]);

  useEffect(() => {
    if (sound) {
      sound.setRateAsync(speed, true).catch(() => {});
    }
  }, [speed, sound]);

  const togglePlay = useCallback(async () => {
    if (loading) return;
    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }
      if (sound) {
        await sound.setRateAsync(speed, true).catch(() => {});
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }
      setLoading(true);
      const { Audio } = await import("expo-av");
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, rate: speed, shouldCorrectPitch: true },
        (status: any) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000);
            setTotalDuration((status.durationMillis ?? 0) / 1000);
            if (status.didJustFinish) { setIsPlaying(false); setPosition(0); }
          }
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [isPlaying, loading, sound, uri, speed]);

  const cycleSpeed = () => setSpeedIdx((i) => (i + 1) % AUDIO_SPEEDS.length);

  const bubbleBg = isMine ? colors.primary : colors.audioLight;
  const iconColor = isMine ? "#fff" : colors.audio;
  const textColor = isMine ? "#fff" : colors.audio;
  const barFill = isMine ? "rgba(255,255,255,0.6)" : colors.audio;
  const barBg = isMine ? "rgba(255,255,255,0.25)" : `${colors.audio}33`;
  const progress = totalDuration > 0 ? position / totalDuration : 0;

  return (
    <TouchableOpacity
      style={[styles.audioBubble, { backgroundColor: bubbleBg }]}
      onPress={togglePlay}
      activeOpacity={0.8}
    >
      <View style={[styles.audioPlayBtn, { backgroundColor: iconColor + "22" }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Feather name={isPlaying ? "pause" : "play"} size={18} color={iconColor} />
        )}
      </View>
      <View style={styles.audioWave}>
        <View style={[styles.waveBar, { backgroundColor: barBg }]}>
          <View style={[styles.waveFill, { backgroundColor: barFill, width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={[styles.audioDuration, { color: textColor }]}>
          {formatDuration(isPlaying ? position : totalDuration)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={cycleSpeed}
        style={[styles.speedBtn, { backgroundColor: iconColor + "22" }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.speedText, { color: textColor }]}>
          {speed === 1 ? "1×" : `${speed}×`}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function AudioPlayer(props: { uri: string; duration?: number; isMine: boolean }) {
  if (Platform.OS === "web") return <WebAudioPlayer {...props} />;
  return <NativeAudioPlayer {...props} />;
}

// ── Video Thumbnail (tap-to-fullscreen) ──────────────────────────────────────
function VideoThumbnail({ uri, isMine, colors }: { uri: string; isMine: boolean; colors: any }) {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.videoWrapper, { position: "relative" }]}>
        {/* @ts-ignore */}
        <video
          src={uri}
          style={{ width: 220, height: 160, borderRadius: 12, objectFit: "cover", display: "block", pointerEvents: "none" }}
          preload="metadata"
        />
        <View style={[styles.videoOverlay, { backgroundColor: "rgba(0,0,0,0.42)" }]}>
          <View style={styles.videoPlayBtn}>
            <Feather name="play" size={24} color="#fff" />
          </View>
          <View style={styles.expandHintVideo}>
            <Feather name="maximize-2" size={12} color="#fff" />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.videoWrapper, { backgroundColor: "#111" }]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
        <View style={[styles.videoPlayBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
          <Feather name="play" size={24} color="#fff" />
        </View>
        <Text style={{ color: "#fff", fontSize: 12, opacity: 0.8 }}>اضغط للتشغيل</Text>
      </View>
      <View style={styles.expandHintVideo}>
        <Feather name="maximize-2" size={12} color="#fff" />
      </View>
    </View>
  );
}

export default function MessageBubble({ message, isMine, onLongPress }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<{ uri: string; type: "image" | "video" } | null>(null);

  const bubbleBg = isMine ? colors.primary : colors.card;
  const bubbleText = isMine ? colors.primaryForeground : colors.foreground;
  const borderColor = isMine ? "transparent" : colors.border;

  return (
    <View style={[styles.wrapper, isMine ? styles.wrapperRight : styles.wrapperLeft]}>
      {!isMine && (
        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                message.senderRole === "expert" ? colors.expertLight : colors.clientLight,
            },
          ]}
        >
          <Feather
            name={message.senderRole === "expert" ? "user-check" : "user"}
            size={13}
            color={message.senderRole === "expert" ? colors.expert : colors.client}
          />
        </View>
      )}

      <View style={styles.bubbleCol}>
        {!isMine && (
          <View style={styles.senderRow}>
            <Text style={[styles.senderName, { color: message.senderRole === "expert" ? colors.expert : colors.client }]}>
              {message.senderName}
            </Text>
            <View
              style={[
                styles.roleTag,
                {
                  backgroundColor:
                    message.senderRole === "expert" ? colors.expertLight : colors.clientLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleTagText,
                  { color: message.senderRole === "expert" ? colors.expert : colors.client },
                ]}
              >
                {message.senderRole === "expert" ? t.expertLabel : t.farmer}
              </Text>
            </View>
          </View>
        )}

        {message.type === "text" && (
          <TouchableOpacity
            style={[
              styles.bubble,
              { backgroundColor: bubbleBg, borderColor },
              isMine ? styles.bubbleRight : styles.bubbleLeft,
            ]}
            onLongPress={onLongPress}
            delayLongPress={450}
            activeOpacity={0.85}
          >
            <Text style={[styles.msgText, { color: bubbleText, textAlign: "right" }]}>
              {message.content}
            </Text>
          </TouchableOpacity>
        )}

        {message.type === "image" && message.imageUri && (
          <TouchableOpacity
            onPress={() => {
              if (!imageError && !message.imageUri!.startsWith("blob:"))
                setViewerMedia({ uri: message.imageUri!, type: "image" });
            }}
            activeOpacity={0.88}
            style={[
              styles.imageBubble,
              { borderColor: isMine ? colors.primary : colors.border },
              isMine ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            {imageError || message.imageUri.startsWith("blob:") ? (
              <View style={[styles.imageError, { backgroundColor: colors.muted }]}>
                <Feather name="image" size={24} color={colors.mutedForeground} />
                <Text style={[styles.imageErrorText, { color: colors.mutedForeground }]}>
                  الصورة غير متاحة
                </Text>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: message.imageUri }}
                  style={styles.msgImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
                <View style={styles.expandHint}>
                  <Feather name="maximize-2" size={13} color="#fff" />
                </View>
              </>
            )}
          </TouchableOpacity>
        )}

        {message.type === "audio" && message.audioUri &&
          !message.audioUri.startsWith("blob:") && (
          <View style={isMine ? styles.bubbleRight : styles.bubbleLeft}>
            <AudioPlayer uri={message.audioUri} duration={message.audioDuration} isMine={isMine} />
          </View>
        )}
        {message.type === "audio" && message.audioUri &&
          message.audioUri.startsWith("blob:") && (
          <View style={[isMine ? styles.bubbleRight : styles.bubbleLeft,
            styles.audioBubble, { backgroundColor: isMine ? colors.primary : colors.audioLight }]}>
            <Feather name="mic-off" size={16} color={isMine ? "#fff" : colors.mutedForeground} />
            <Text style={{ color: isMine ? "#fff" : colors.mutedForeground, fontSize: 13, marginLeft: 6 }}>
              الصوت غير متاح
            </Text>
          </View>
        )}

        {message.type === "video" && message.videoUri && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setViewerMedia({ uri: message.videoUri!, type: "video" })}
            style={[isMine ? styles.bubbleRight : styles.bubbleLeft]}
          >
            <VideoThumbnail uri={message.videoUri} isMine={isMine} colors={colors} />
          </TouchableOpacity>
        )}

        <View style={[styles.timestampRow, isMine ? styles.timestampRight : styles.timestampLeft]}>
          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            {formatTime(message.timestamp)}
          </Text>
          {isMine && (
            <Text style={[styles.readMark, { color: message.isRead ? colors.primary : colors.mutedForeground }]}>
              {message.isRead ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      </View>

      {viewerMedia && (
        <MediaViewer
          uri={viewerMedia.uri}
          type={viewerMedia.type}
          onClose={() => setViewerMedia(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginVertical: 4,
    alignItems: "flex-end",
    gap: 6,
  },
  wrapperLeft: { justifyContent: "flex-start" },
  wrapperRight: { justifyContent: "flex-end" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  bubbleCol: { maxWidth: "75%", gap: 2 },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, paddingLeft: 2 },
  senderName: { fontSize: 12, fontWeight: "600" },
  roleTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  roleTagText: { fontSize: 10, fontWeight: "700" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1 },
  bubbleLeft: { borderBottomLeftRadius: 4, alignSelf: "flex-start" },
  bubbleRight: { borderBottomRightRadius: 4, alignSelf: "flex-end" },
  msgText: { fontSize: 15, lineHeight: 21 },
  imageBubble: { borderRadius: 16, overflow: "hidden", borderWidth: 1.5 },
  msgImage: { width: 220, height: 190 },
  audioBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
    minWidth: 160,
  },
  audioPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  audioWave: { flex: 1, gap: 4 },
  waveBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  waveFill: { height: "100%", borderRadius: 3 },
  audioDuration: { fontSize: 11, fontWeight: "600" },
  speedBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  speedText: { fontSize: 11, fontWeight: "700" },
  timestampRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2, paddingHorizontal: 4 },
  timestamp: { fontSize: 10 },
  readMark: { fontSize: 11, fontWeight: "600" },
  timestampLeft: { alignSelf: "flex-start" },
  timestampRight: { alignSelf: "flex-end" },
  imageError: {
    width: 220,
    height: 100,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imageErrorText: { fontSize: 12 },
  expandHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 6,
    padding: 4,
  },
  expandHintVideo: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    padding: 4,
  },
  videoWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: 220,
    height: 160,
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  videoPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    width: 220,
    height: 80,
  },
});
