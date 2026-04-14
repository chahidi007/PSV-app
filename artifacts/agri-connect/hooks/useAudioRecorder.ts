import { Platform } from "react-native";
import { useState, useRef, useCallback } from "react";

export interface RecordingResult {
  uri: string; // always a base64 data URI on web, file URI on native
  duration: number;
  mimeType?: string;
}

export interface UseAudioRecorder {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => Promise<void>;
}

/** Convert a Blob to a base64 data URI — safe to store and play cross-session */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function useWebAudioRecorder(): UseAudioRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Try formats in order of preference. Safari requires mp4; Chrome prefers webm.
      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" :
        MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" :
        "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current = mr;
      mr.start(100);
      durationRef.current = 0;
      setDuration(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } catch {
      // mic permission denied or not supported
    }
  }, []);

  const stopRecording = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) { resolve(null); return; }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      const dur = durationRef.current;

      mr.onstop = async () => {
        try {
          const mimeType = mr.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          // Convert to base64 — blob: URLs expire when the session ends
          const uri = await blobToDataUri(blob);
          mr.stream.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current = null;
          setIsRecording(false);
          setDuration(0);
          durationRef.current = 0;
          resolve({ uri, duration: dur, mimeType });
        } catch {
          resolve(null);
        }
      };
      mr.stop();
    });
  }, []);

  const cancelRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mr.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    durationRef.current = 0;
    setIsRecording(false);
    setDuration(0);
  }, []);

  return { isRecording, duration, startRecording, stopRecording, cancelRecording };
}

function useNativeAudioRecorder(): UseAudioRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const { Audio } = await import("expo-av");
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      durationRef.current = 0;
      setDuration(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } catch { /* ignore */ }
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const dur = durationRef.current;
    try { await recording.stopAndUnloadAsync(); } catch { /* ignore */ }
    const { Audio } = await import("expo-av");
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    recordingRef.current = null;
    durationRef.current = 0;
    setIsRecording(false);
    setDuration(0);
    if (!uri) return null;
    return { uri, duration: dur };
  }, []);

  const cancelRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { await recording.stopAndUnloadAsync(); } catch { /* ignore */ }
    recordingRef.current = null;
    durationRef.current = 0;
    setIsRecording(false);
    setDuration(0);
  }, []);

  return { isRecording, duration, startRecording, stopRecording, cancelRecording };
}

export function useAudioRecorder(): UseAudioRecorder {
  const web = useWebAudioRecorder();
  const native = useNativeAudioRecorder();
  return Platform.OS === "web" ? web : native;
}
