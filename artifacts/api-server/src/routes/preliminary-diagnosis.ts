import { Router } from "express";

const router = Router();

// ── Keyword engine ────────────────────────────────────────────────────────────

const DISEASE_RULES: Array<{
  keywords: string[];
  title: { ar: string; fr: string };
  category: { ar: string; fr: string };
  urgency: "high" | "medium" | "low";
  suggestions: { ar: string[]; fr: string[] };
  expertSpecialty: string;
}> = [
  {
    keywords: ["jaune", "jaunisse", "feuilles jaunes", "yellowing", "أصفر", "اصفرار", "أوراق صفراء"],
    title: { ar: "احتمال نقص تغذية أو إصابة بالتبقع الأصفر", fr: "Possible carence nutritive ou jaunisse foliaire" },
    category: { ar: "أمراض التغذية / الأمراض الفطرية", fr: "Carence / Maladies fongiques" },
    urgency: "medium",
    suggestions: {
      ar: ["التحقق من مستوى pH التربة", "تطبيق سماد غني بالنيتروجين والحديد", "فحص الجذور للكشف عن الفطريات"],
      fr: ["Vérifier le pH du sol", "Appliquer un engrais riche en azote et fer", "Inspecter les racines pour détecter des champignons"],
    },
    expertSpecialty: "Phytopathologie",
  },
  {
    keywords: ["mildiou", "moisissure", "champignon", "fongique", "pourriture", "عفن", "تعفن", "فطر", "فطريات"],
    title: { ar: "احتمال إصابة بالعفن أو البياض الزغبي", fr: "Possible mildiou ou pourriture fongique" },
    category: { ar: "أمراض فطرية", fr: "Maladies fongiques" },
    urgency: "high",
    suggestions: {
      ar: ["تطبيق مبيد فطري فوراً", "تقليل الري وتحسين تهوية النبات", "إزالة الأجزاء المصابة وحرقها"],
      fr: ["Appliquer un fongicide immédiatement", "Réduire l'irrigation et améliorer la ventilation", "Retirer et brûler les parties atteintes"],
    },
    expertSpecialty: "Phytopathologie",
  },
  {
    keywords: ["oïdium", "blanc", "poudre", "poudreuse", "بياض", "مسحوق أبيض", "بياض حقيقي"],
    title: { ar: "احتمال إصابة بالبياض الحقيقي", fr: "Possible oïdium (blanc)" },
    category: { ar: "أمراض فطرية", fr: "Maladies fongiques" },
    urgency: "medium",
    suggestions: {
      ar: ["رش بالكبريت الميكروني", "تحسين تهوية المحصول", "تجنب الري الرأسي"],
      fr: ["Traiter au soufre micronisé", "Améliorer la circulation d'air", "Éviter l'arrosage par aspersion"],
    },
    expertSpecialty: "Phytopathologie",
  },
  {
    keywords: ["puceron", "insecte", "parasite", "ravageur", "حشرة", "حشرات", "حفار", "دودة", "يرقة", "آفة"],
    title: { ar: "احتمال إصابة بآفة حشرية", fr: "Possible attaque par des ravageurs" },
    category: { ar: "الآفات الحشرية", fr: "Ravageurs" },
    urgency: "medium",
    suggestions: {
      ar: ["تحديد نوع الحشرة بدقة قبل العلاج", "استخدام المبيدات الحشرية المعتمدة", "النظر في المكافحة البيولوجية"],
      fr: ["Identifier précisément l'insecte avant traitement", "Utiliser des insecticides homologués", "Envisager la lutte biologique"],
    },
    expertSpecialty: "Entomologie",
  },
  {
    keywords: ["rouille", "tache", "taches brunes", "taches rouges", "صدأ", "بقع", "بقع بنية", "بقع حمراء"],
    title: { ar: "احتمال إصابة بالصدأ أو التبقع الورقي", fr: "Possible rouille ou taches foliaires" },
    category: { ar: "أمراض فطرية", fr: "Maladies fongiques" },
    urgency: "medium",
    suggestions: {
      ar: ["رش بمبيد فطري محتوي على النحاس", "إزالة الأوراق المصابة", "تجنب الري الليلي"],
      fr: ["Traiter avec un fongicide cuivrique", "Retirer les feuilles atteintes", "Éviter l'arrosage nocturne"],
    },
    expertSpecialty: "Phytopathologie",
  },
  {
    keywords: ["sol", "terre", "fertilité", "irrigation", "eau", "تربة", "خصوبة", "سقي", "ري", "ماء", "تصريف"],
    title: { ar: "مشكلة تتعلق بالتربة أو نظام الري", fr: "Problème de sol ou d'irrigation" },
    category: { ar: "صحة التربة", fr: "Santé du sol" },
    urgency: "low",
    suggestions: {
      ar: ["إجراء تحليل شامل للتربة", "مراجعة جدول الري", "إضافة المادة العضوية لتحسين بنية التربة"],
      fr: ["Réaliser une analyse complète du sol", "Revoir le calendrier d'irrigation", "Ajouter de la matière organique"],
    },
    expertSpecialty: "Agronomie",
  },
  {
    keywords: ["flétrissement", "fané", "sec", "sécheresse", "ذبول", "جفاف", "ضمور", "يذبل"],
    title: { ar: "احتمال التعرض للجفاف أو أمراض الذبول", fr: "Possible flétrissement ou stress hydrique" },
    category: { ar: "ضغط الجفاف / أمراض وعائية", fr: "Stress hydrique / Maladies vasculaires" },
    urgency: "high",
    suggestions: {
      ar: ["فحص نظام الري فوراً", "التحقق من وجود فطريات الذبول في الجذور", "ضمان صرف جيد للتربة"],
      fr: ["Vérifier le système d'irrigation immédiatement", "Contrôler la présence de fusariose racinaire", "Assurer un bon drainage du sol"],
    },
    expertSpecialty: "Phytopathologie",
  },
];

const DEFAULT_DIAGNOSIS = {
  title: { ar: "وصف عام — يحتاج إلى تشخيص دقيق", fr: "Description générale — diagnostic précis requis" },
  category: { ar: "غير محدد", fr: "Non déterminé" },
  urgency: "medium" as const,
  suggestions: {
    ar: ["التقاط صور واضحة للمشكلة", "تحديد المحصول والمنطقة المصابة", "التواصل مع خبير متخصص"],
    fr: ["Prendre des photos claires du problème", "Identifier la zone et la culture touchées", "Contacter un expert spécialisé"],
  },
  expertSpecialty: "Agronomie",
};

function diagnose(text: string, lang: "ar" | "fr") {
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const rule of DISEASE_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return {
      title: DEFAULT_DIAGNOSIS.title[lang],
      category: DEFAULT_DIAGNOSIS.category[lang],
      urgency: DEFAULT_DIAGNOSIS.urgency,
      suggestions: DEFAULT_DIAGNOSIS.suggestions[lang],
      expertSpecialty: DEFAULT_DIAGNOSIS.expertSpecialty,
    };
  }

  return {
    title: bestMatch.title[lang],
    category: bestMatch.category[lang],
    urgency: bestMatch.urgency,
    suggestions: bestMatch.suggestions[lang],
    expertSpecialty: bestMatch.expertSpecialty,
  };
}

// ── POST /api/preliminary-diagnosis ──────────────────────────────────────────
router.post("/preliminary-diagnosis", async (req, res) => {
  try {
    const { description = "", culture = "", region = "", lang = "fr" } = req.body as {
      description?: string;
      culture?: string;
      region?: string;
      lang?: "ar" | "fr";
    };

    const combined = `${description} ${culture}`;
    const result = diagnose(combined, lang === "ar" ? "ar" : "fr");

    res.json({
      ...result,
      culture: culture || null,
      region: region || null,
      analyzedAt: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
