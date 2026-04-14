import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { getTopPredictions, type DiseaseLabel } from "@/constants/plant-disease-labels";
import { api } from "@/services/api";

export type DiagnosisEngine = "on-device" | "cloud";

export interface TFLiteDisease {
  label: DiseaseLabel;
  confidence: number;
}

export interface TFLiteDiagnosisResult {
  diseases: TFLiteDisease[];
  engine: DiagnosisEngine;
  summary: string;
  urgency: "high" | "medium" | "low";
  disclaimer: string;
}

const MODEL_INPUT_SIZE = 224;

async function decodePngToRgb(pngBytes: Uint8Array): Promise<Float32Array> {
  // Parse PNG chunks
  let offset = 8; // skip PNG signature
  let width = 0;
  let height = 0;
  let colorType = 2; // default: RGB
  const idatChunks: Uint8Array[] = [];

  while (offset < pngBytes.length - 4) {
    const len =
      (pngBytes[offset] << 24) |
      (pngBytes[offset + 1] << 16) |
      (pngBytes[offset + 2] << 8) |
      pngBytes[offset + 3];
    const type = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7]
    );
    const data = pngBytes.subarray(offset + 8, offset + 8 + len);

    if (type === "IHDR") {
      width =
        (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
      height =
        (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data.slice());
    } else if (type === "IEND") {
      break;
    }
    offset += 4 + 4 + len + 4;
  }

  // Concatenate IDAT chunks
  const totalLen = idatChunks.reduce((s, c) => s + c.length, 0);
  const idatData = new Uint8Array(totalLen);
  let pos = 0;
  for (const chunk of idatChunks) {
    idatData.set(chunk, pos);
    pos += chunk.length;
  }

  // Decompress zlib (DEFLATE with 2-byte zlib header) using DecompressionStream
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(idatData);
  writer.close();

  const decompressedChunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    decompressedChunks.push(value as Uint8Array);
  }
  const decompressedLen = decompressedChunks.reduce((s, c) => s + c.length, 0);
  const decompressed = new Uint8Array(decompressedLen);
  let dPos = 0;
  for (const c of decompressedChunks) {
    decompressed.set(c, dPos);
    dPos += c.length;
  }

  // Number of channels (2=RGB, 6=RGBA)
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const float32 = new Float32Array(width * height * 3);
  let outIdx = 0;
  const prevRow = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * (stride + 1)];
    const rawRow = decompressed.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = new Uint8Array(stride);

    for (let x = 0; x < stride; x++) {
      const raw = rawRow[x];
      const a = x >= channels ? row[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      switch (filterType) {
        case 0: row[x] = raw; break;
        case 1: row[x] = (raw + a) & 0xff; break;
        case 2: row[x] = (raw + b) & 0xff; break;
        case 3: row[x] = (raw + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          row[x] = (raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default: row[x] = raw; break;
      }
    }
    prevRow.set(row);
    for (let x = 0; x < width; x++) {
      float32[outIdx++] = row[x * channels] / 255.0;
      float32[outIdx++] = row[x * channels + 1] / 255.0;
      float32[outIdx++] = row[x * channels + 2] / 255.0;
    }
  }
  return float32;
}

async function preprocessImage(uri: string): Promise<Float32Array> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { format: ImageManipulator.SaveFormat.PNG, base64: true }
  );
  const b64 = result.base64!;
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return decodePngToRgb(bytes);
}

async function runTFLiteInference(
  imageUri: string,
  lang: "ar" | "fr"
): Promise<TFLiteDiagnosisResult | null> {
  try {
    // Dynamically import — native module not available on web
    const { loadTensorflowModel } = await import("react-native-fast-tflite");
    const model = await loadTensorflowModel(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@/assets/plant_disease_model.tflite")
    );
    const float32Input = await preprocessImage(imageUri);
    const outputs = model.run([float32Input]);
    const raw = outputs[0];

    if (!raw || raw.length === 0) {
      model.dispose?.();
      return null;
    }

    const predictions = getTopPredictions(raw as Float32Array, 3).filter(
      (p) => p.confidence >= 5
    );
    model.dispose?.();

    if (predictions.length === 0) return null;

    const topDisease = predictions[0];
    const urgency: "high" | "medium" | "low" =
      topDisease.label.healthy
        ? "low"
        : topDisease.confidence >= 70
        ? "high"
        : topDisease.confidence >= 40
        ? "medium"
        : "low";

    const healthyAll = predictions.every((p) => p.label.healthy);

    const summary =
      lang === "ar"
        ? healthyAll
          ? "النبات يبدو في حالة صحية جيدة."
          : `الأرجح: ${topDisease.label.ar} (${topDisease.confidence}%)`
        : healthyAll
        ? "La plante semble en bonne santé."
        : `Probable: ${topDisease.label.fr} (${topDisease.confidence}%)`;

    const disclaimer =
      lang === "ar"
        ? "هذا تشخيص أولي على الجهاز. يُنصح بالتشاور مع خبير للتأكيد."
        : "Diagnostic préliminaire sur l'appareil. Consultez un expert pour confirmation.";

    return {
      engine: "on-device",
      diseases: predictions.map((p) => ({ label: p.label, confidence: p.confidence })),
      summary,
      urgency,
      disclaimer,
    };
  } catch {
    return null;
  }
}

async function runCloudDiagnosis(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  opts: { culture?: string; region?: string; description?: string; lang: "ar" | "fr" }
): Promise<TFLiteDiagnosisResult> {
  const result = await api.diagnoseImage({
    imageBase64,
    mimeType,
    ...opts,
  });

  return {
    engine: "cloud",
    diseases: result.diseases.map((d) => ({
      label: {
        key: d.name,
        fr: d.name,
        ar: d.name,
        healthy: d.name.toLowerCase().includes("sain") || d.name.toLowerCase().includes("healthy"),
        recommendations: { fr: d.recommendations, ar: d.recommendations },
      },
      confidence: d.confidence,
    })),
    summary: result.summary,
    urgency: result.urgency,
    disclaimer: result.disclaimer,
  };
}

export async function diagnosePlantFromImage(
  imageUri: string,
  opts: {
    culture?: string;
    region?: string;
    description?: string;
    lang: "ar" | "fr";
  }
): Promise<TFLiteDiagnosisResult> {
  // On native, try TFLite first
  if (Platform.OS !== "web") {
    const tfliteResult = await runTFLiteInference(imageUri, opts.lang);
    if (tfliteResult) return tfliteResult;
  }

  // Web or TFLite failed → use Claude Vision
  let imageBase64: string;
  let mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";

  if (Platform.OS === "web") {
    const resp = await fetch(imageUri);
    const blob = await resp.blob();
    const type = blob.type as typeof mimeType;
    if (["image/png", "image/webp", "image/gif"].includes(type)) mimeType = type;
    imageBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    const FileSystem = await import("expo-file-system");
    if (imageUri.toLowerCase().endsWith(".png")) mimeType = "image/png";
    imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return runCloudDiagnosis(imageBase64, mimeType, opts);
}
