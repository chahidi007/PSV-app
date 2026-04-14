import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "",
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

interface DiagnoseImageBody {
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  culture?: string;
  region?: string;
  description?: string;
  lang?: "ar" | "fr";
}

interface Disease {
  name: string;
  confidence: number;
  description: string;
  recommendations: string[];
}

interface DiagnosisResult {
  diseases: Disease[];
  summary: string;
  urgency: "high" | "medium" | "low";
  disclaimer: string;
}

router.post("/diagnose-image", async (req, res) => {
  const { imageBase64: rawBase64, imageUrl, mimeType, culture, region, description, lang = "fr" } =
    req.body as DiagnoseImageBody;

  let imageBase64 = rawBase64;

  // If imageUrl provided (e.g. /api/images/xxx.jpg), read from disk
  if (!imageBase64 && imageUrl) {
    try {
      const { default: fs } = await import("fs");
      const { default: path } = await import("path");
      const filename = path.basename(imageUrl);
      if (filename.includes("..") || filename.includes("/")) throw new Error("Invalid path");
      const filePath = path.join("/tmp/phytoclinic-uploads", filename);
      const buf = fs.readFileSync(filePath);
      imageBase64 = buf.toString("base64");
    } catch {
      res.status(400).json({ error: "Image URL invalide ou introuvable" });
      return;
    }
  }

  if (!imageBase64 || imageBase64.length < 100) {
    res.status(400).json({ error: "Image manquante ou invalide" });
    return;
  }

  const isAr = lang === "ar";

  const systemPrompt = isAr
    ? `أنت خبير متخصص في أمراض النبات وأمراض المحاصيل الزراعية. تحلل الصور الزراعية وتقدم تشخيصاً دقيقاً ومنظماً. أجب دائماً بتنسيق JSON فقط بدون أي نص إضافي.`
    : `Tu es un expert phytopathologiste spécialisé en maladies des plantes et cultures agricoles. Tu analyses les images agricoles et fournis un diagnostic précis et structuré. Réponds toujours en JSON uniquement, sans texte supplémentaire.`;

  const contextLines: string[] = [];
  if (culture) contextLines.push(isAr ? `المحصول: ${culture}` : `Culture: ${culture}`);
  if (region) contextLines.push(isAr ? `المنطقة: ${region}` : `Région: ${region}`);
  if (description) contextLines.push(isAr ? `وصف المزارع: ${description}` : `Description de l'agriculteur: ${description}`);
  const contextBlock = contextLines.length > 0 ? contextLines.join("\n") : "";

  const userPrompt = isAr
    ? `${contextBlock ? contextBlock + "\n\n" : ""}حلل هذه الصورة الزراعية وحدد الأمراض أو المشاكل المحتملة.

أعطِ النتيجة بهذا التنسيق JSON:
{
  "diseases": [
    {
      "name": "اسم المرض أو المشكلة",
      "confidence": 85,
      "description": "وصف قصير للمرض",
      "recommendations": ["التوصية 1", "التوصية 2", "التوصية 3"]
    }
  ],
  "summary": "ملخص عام للتشخيص",
  "urgency": "high" | "medium" | "low",
  "disclaimer": "هذا تشخيص أولي. يُنصح بالتشاور مع خبير زراعي للتأكيد."
}

قدم ما بين 1 و3 أمراض محتملة مرتبة حسب الاحتمالية. confidence يكون بين 0 و100.`
    : `${contextBlock ? contextBlock + "\n\n" : ""}Analyse cette image agricole et identifie les maladies ou problèmes potentiels.

Donne le résultat dans ce format JSON exact:
{
  "diseases": [
    {
      "name": "Nom de la maladie ou problème",
      "confidence": 85,
      "description": "Description courte de la maladie",
      "recommendations": ["Recommandation 1", "Recommandation 2", "Recommandation 3"]
    }
  ],
  "summary": "Résumé général du diagnostic",
  "urgency": "high" | "medium" | "low",
  "disclaimer": "Ce diagnostic est préliminaire. Il est conseillé de consulter un expert agricole pour confirmation."
}

Fournis entre 1 et 3 maladies probables triées par probabilité décroissante. confidence est entre 0 et 100.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let raw = block.text.trim();
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) raw = fence[1].trim();

    const parsed = JSON.parse(raw) as DiagnosisResult;

    if (!parsed.diseases || !Array.isArray(parsed.diseases)) {
      throw new Error("Invalid diagnosis structure");
    }

    parsed.diseases = parsed.diseases.slice(0, 3);

    res.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[diagnose-image] Error:", msg);

    const fallback: DiagnosisResult = {
      diseases: [
        {
          name: isAr ? "تعذّر التحليل التلقائي" : "Analyse automatique indisponible",
          confidence: 0,
          description: isAr
            ? "لم يتمكن النظام من تحليل الصورة في الوقت الحالي."
            : "Le système n'a pas pu analyser l'image pour le moment.",
          recommendations: [
            isAr ? "يرجى المحاولة مرة أخرى" : "Veuillez réessayer",
            isAr ? "أو أرسل استشارتك مباشرة للخبير" : "Ou soumettez directement votre consultation à l'expert",
          ],
        },
      ],
      summary: isAr
        ? "تعذّر الحصول على تشخيص تلقائي. سيقوم الخبير بتحليل صورتك مباشرة."
        : "Diagnostic automatique non disponible. L'expert analysera votre image directement.",
      urgency: "medium",
      disclaimer: isAr
        ? "هذا تشخيص أولي. يُنصح بالتشاور مع خبير زراعي للتأكيد."
        : "Ce diagnostic est préliminaire. Il est conseillé de consulter un expert agricole pour confirmation.",
    };

    res.json(fallback);
  }
});

export default router;
