import { Platform } from "react-native";

export interface PickedImage {
  uri: string; // base64 data URI on web, file URI on native
}

export interface PickedVideo {
  uri: string; // base64 data URI on web, file URI on native
}

/** Resize + convert a blob URL to a base64 data URI so it persists across sessions */
function blobUrlToBase64(blobUrl: string, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new (globalThis as any).Image() as HTMLImageElement;
    img.onload = () => {
      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
      URL.revokeObjectURL(blobUrl); // free memory
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

async function pickFromLibraryWeb(): Promise<PickedImage[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, 3);
      const results: PickedImage[] = [];
      for (const file of files) {
        const blobUrl = URL.createObjectURL(file);
        const uri = await blobUrlToBase64(blobUrl);
        results.push({ uri });
      }
      resolve(results);
    };
    input.oncancel = () => resolve([]);
    // Without a click the browser may not trigger oncancel on all browsers
    input.addEventListener("change", () => {}, { once: true });
    input.click();
  });
}

async function pickFromCameraWeb(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const blobUrl = URL.createObjectURL(file);
      const uri = await blobUrlToBase64(blobUrl);
      resolve({ uri });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function pickFromLibraryNative(): Promise<PickedImage[]> {
  const ImagePicker = await import("expo-image-picker");
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsMultipleSelection: true,
    selectionLimit: 3,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri }));
}

async function pickFromCameraNative(): Promise<PickedImage | null> {
  const ImagePicker = await import("expo-image-picker");
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  if (result.canceled) return null;
  return { uri: result.assets[0].uri };
}

export const imagePicker = {
  pickFromLibrary: (): Promise<PickedImage[]> =>
    Platform.OS === "web" ? pickFromLibraryWeb() : pickFromLibraryNative(),
  pickFromCamera: (): Promise<PickedImage | null> =>
    Platform.OS === "web" ? pickFromCameraWeb() : pickFromCameraNative(),
};

/** Convert a File to a base64 data URI */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function pickVideoWeb(): Promise<PickedVideo | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      // Warn if file is very large (over 50 MB)
      if (file.size > 50 * 1024 * 1024) {
        resolve(null);
        return;
      }
      const uri = await fileToBase64(file);
      resolve({ uri });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function pickVideoNative(): Promise<PickedVideo | null> {
  const ImagePicker = await import("expo-image-picker");
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    videoMaxDuration: 60,
    quality: 0.7,
  });
  if (result.canceled) return null;
  return { uri: result.assets[0].uri };
}

export const videoPicker = {
  pick: (): Promise<PickedVideo | null> =>
    Platform.OS === "web" ? pickVideoWeb() : pickVideoNative(),
};
