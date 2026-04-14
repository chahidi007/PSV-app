export interface DiseaseLabel {
  key: string;
  fr: string;
  ar: string;
  healthy: boolean;
  recommendations: { fr: string[]; ar: string[] };
}

export const PLANT_DISEASE_LABELS: DiseaseLabel[] = [
  {
    key: "Apple___Apple_scab",
    fr: "Tavelure du pommier",
    ar: "جرب التفاح",
    healthy: false,
    recommendations: {
      fr: ["Appliquer des fongicides à base de captane ou myclobutanil", "Ramasser et détruire les feuilles tombées", "Tailler pour améliorer la ventilation"],
      ar: ["تطبيق مبيدات فطرية على أساس الكابتان أو المايكلوبوتانيل", "جمع وإتلاف الأوراق المتساقطة", "التقليم لتحسين التهوية"],
    },
  },
  {
    key: "Apple___Black_rot",
    fr: "Pourriture noire du pommier",
    ar: "العفن الأسود للتفاح",
    healthy: false,
    recommendations: {
      fr: ["Retirer les fruits et branches infectés", "Traiter avec fongicide thiophanate-méthyl", "Désinfecter les outils de taille"],
      ar: ["إزالة الثمار والأفرع المصابة", "معالجة بالمبيد الفطري ثيوفانات ميثيل", "تطهير أدوات التقليم"],
    },
  },
  {
    key: "Apple___Cedar_apple_rust",
    fr: "Rouille gymnosporange du pommier",
    ar: "صدأ التفاح والعرعر",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec myclobutanil ou propiconazole en prévention", "Éliminer les cèdres proches si possible", "Surveiller au printemps lors des pluies"],
      ar: ["معالجة وقائية بالمايكلوبوتانيل أو البروبيكونازول", "إزالة أشجار العرعر القريبة إن أمكن", "المراقبة في الربيع خلال موسم الأمطار"],
    },
  },
  {
    key: "Apple___healthy",
    fr: "Pommier sain",
    ar: "تفاح سليم",
    healthy: true,
    recommendations: { fr: ["Maintenir les bonnes pratiques de fertilisation et d'irrigation", "Surveiller régulièrement pour détecter toute anomalie"], ar: ["الحفاظ على ممارسات التسميد والري الجيدة", "المراقبة الدورية لاكتشاف أي شذوذ"] },
  },
  {
    key: "Blueberry___healthy",
    fr: "Myrtille saine",
    ar: "توت بري سليم",
    healthy: true,
    recommendations: { fr: ["Conserver le pH du sol entre 4.5 et 5.5", "Irrigation régulière adaptée"], ar: ["الحفاظ على حموضة التربة بين 4.5 و5.5", "ري منتظم ومناسب"] },
  },
  {
    key: "Cherry_(including_sour)___Powdery_mildew",
    fr: "Oïdium du cerisier",
    ar: "البياض الدقيقي للكرز",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec soufre mouillable ou trifloxystrobine", "Éviter l'humidité excessive autour du feuillage", "Tailler pour aérer la frondaison"],
      ar: ["معالجة بالكبريت القابل للبلل أو التريفلوكسيستروبين", "تجنب الرطوبة المفرطة حول الأوراق", "التقليم لتهوية التاج"],
    },
  },
  {
    key: "Cherry_(including_sour)___healthy",
    fr: "Cerisier sain",
    ar: "كرز سليم",
    healthy: true,
    recommendations: { fr: ["Assurer un apport régulier en potassium", "Surveiller les pucerons au printemps"], ar: ["ضمان إمداد منتظم بالبوتاسيوم", "مراقبة حشرة المن في الربيع"] },
  },
  {
    key: "Corn_(maize)___Cercospora_leaf_spot",
    fr: "Tache foliaire Cercospora du maïs",
    ar: "تبقع الأوراق السيركوسبوري للذرة",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec fongicide strobilurine ou triazole", "Choisir des variétés résistantes", "Rotation des cultures recommandée"],
      ar: ["معالجة بمبيد فطري من فئة الستروبيلورين أو التريازول", "اختيار أصناف مقاومة", "التناوب في الزراعة موصى به"],
    },
  },
  {
    key: "Corn_(maize)___Common_rust_",
    fr: "Rouille commune du maïs",
    ar: "الصدأ الشائع للذرة",
    healthy: false,
    recommendations: {
      fr: ["Traiter dès l'apparition des premières pustules", "Utiliser mancozèbe ou propiconazole", "Choisir des hybrides résistants"],
      ar: ["المعالجة عند ظهور البثرات الأولى", "استخدام المانكوزيب أو البروبيكونازول", "اختيار هجن مقاومة"],
    },
  },
  {
    key: "Corn_(maize)___Northern_Leaf_Blight",
    fr: "Helminthosporiose du maïs (flétrissement foliaire)",
    ar: "لفحة الأوراق الشمالية للذرة",
    healthy: false,
    recommendations: {
      fr: ["Appliquer azoxystrobine ou tébuconazole", "Choisir des variétés tolérantes", "Éviter les densités de semis trop élevées"],
      ar: ["تطبيق الأزوكسيستروبين أو التيبوكونازول", "اختيار أصناف متسامحة", "تجنب كثافة البذر العالية"],
    },
  },
  {
    key: "Corn_(maize)___healthy",
    fr: "Maïs sain",
    ar: "ذرة سليمة",
    healthy: true,
    recommendations: { fr: ["Fertilisation azotée fractionnée recommandée", "Surveiller les foreurs de tiges"], ar: ["التسميد النيتروجيني المجزأ موصى به", "مراقبة ثاقبات الساق"] },
  },
  {
    key: "Grape___Black_rot",
    fr: "Pourriture noire de la vigne",
    ar: "العفن الأسود للعنب",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec myclobutanil ou mancozèbe préventivement", "Supprimer les baies momifiées restantes", "Désherber sous les pieds de vigne"],
      ar: ["معالجة وقائية بالمايكلوبوتانيل أو المانكوزيب", "إزالة الحبيبات المحنطة المتبقية", "إزالة الأعشاب الضارة تحت الكروم"],
    },
  },
  {
    key: "Grape___Esca_(Black_Measles)",
    fr: "Esca / Rougeot parasite de la vigne",
    ar: "مرض الإسكا (الحصبة السوداء) للعنب",
    healthy: false,
    recommendations: {
      fr: ["Protéger les plaies de taille avec pâte fongicide", "Éviter les stress hydriques", "Arracher les pieds fortement atteints"],
      ar: ["حماية جروح التقليم بمعجون فطري", "تجنب الإجهاد المائي", "اقتلاع النباتات المصابة بشدة"],
    },
  },
  {
    key: "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    fr: "Brûlure foliaire Isariopsis de la vigne",
    ar: "لفحة الأوراق للعنب",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec cuivre ou mancozèbe", "Améliorer la ventilation de la parcelle", "Éviter l'excès d'humidité foliaire"],
      ar: ["معالجة بالنحاس أو المانكوزيب", "تحسين تهوية القطعة الزراعية", "تجنب زيادة رطوبة الأوراق"],
    },
  },
  {
    key: "Grape___healthy",
    fr: "Vigne saine",
    ar: "عنب سليم",
    healthy: true,
    recommendations: { fr: ["Surveiller mildiou et oïdium en période humide", "Ébourgeonnage pour équilibrer la charge"], ar: ["مراقبة البياض الزغبي والدقيقي في الموسم الرطب", "الشماريخ لتوازن الحمل"] },
  },
  {
    key: "Orange___Haunglongbing_(Citrus_greening)",
    fr: "Huanglongbing – greening des agrumes",
    ar: "مرض اخضرار الحمضيات (هوانغلونغبينغ)",
    healthy: false,
    recommendations: {
      fr: ["Arracher et détruire les arbres infectés immédiatement", "Contrôler le psylle vecteur (Diaphorina citri)", "Ne pas déplacer du matériel végétal d'une zone infectée"],
      ar: ["اقتلاع الأشجار المصابة وإتلافها فوراً", "مكافحة ذبابة السيلا الناقلة (ديافورينا سيتري)", "عدم نقل المواد النباتية من منطقة مصابة"],
    },
  },
  {
    key: "Peach___Bacterial_spot",
    fr: "Tache bactérienne du pêcher",
    ar: "التبقع البكتيري للخوخ",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec bactéricide cuivrique en prévention", "Éviter la taille lors des périodes pluvieuses", "Choisir des variétés tolérantes"],
      ar: ["معالجة وقائية بمبيد بكتيري نحاسي", "تجنب التقليم خلال فترات الأمطار", "اختيار أصناف متسامحة"],
    },
  },
  {
    key: "Peach___healthy",
    fr: "Pêcher sain",
    ar: "خوخ سليم",
    healthy: true,
    recommendations: { fr: ["Surveiller la cloque du pêcher au débourrement", "Tailler correctement pour éviter les entassements"], ar: ["مراقبة تجعد أوراق الخوخ عند التفطير", "التقليم الصحيح لتجنب التكدس"] },
  },
  {
    key: "Pepper,_bell___Bacterial_spot",
    fr: "Tache bactérienne du poivron",
    ar: "التبقع البكتيري للفلفل",
    healthy: false,
    recommendations: {
      fr: ["Éviter l'irrigation par aspersion (favorise la propagation)", "Appliquer cuivre + mancozèbe en alternance", "Utiliser des semences certifiées saines"],
      ar: ["تجنب الري بالرش (يعزز الانتشار)", "تطبيق النحاس + المانكوزيب بالتناوب", "استخدام بذور معتمدة سليمة"],
    },
  },
  {
    key: "Pepper,_bell___healthy",
    fr: "Poivron sain",
    ar: "فلفل سليم",
    healthy: true,
    recommendations: { fr: ["Fertilisation équilibrée NPK", "Surveiller les thrips et acariens"], ar: ["تسميد متوازن NPK", "مراقبة التربس والعناكب"] },
  },
  {
    key: "Potato___Early_blight",
    fr: "Alternariose de la pomme de terre",
    ar: "اللفحة المبكرة للبطاطا",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec mancozèbe ou chlorothalonil dès les premiers symptômes", "Éliminer les débris végétaux après récolte", "Rotation des cultures sur 3 ans"],
      ar: ["معالجة بالمانكوزيب أو الكلوروثالونيل عند ظهور الأعراض الأولى", "إزالة بقايا النباتات بعد الحصاد", "دوران المحاصيل لمدة 3 سنوات"],
    },
  },
  {
    key: "Potato___Late_blight",
    fr: "Mildiou de la pomme de terre",
    ar: "اللفحة المتأخرة (ميلديو) البطاطا",
    healthy: false,
    recommendations: {
      fr: ["Traiter en urgence avec métalaxyl + mancozèbe ou cymoxanil", "Faucarder et détruire les tiges infectées", "Éviter l'irrigation nocturne"],
      ar: ["معالجة عاجلة بالميتالاكسيل + المانكوزيب أو السيموكسانيل", "قطع وإتلاف السيقان المصابة", "تجنب الري الليلي"],
    },
  },
  {
    key: "Potato___healthy",
    fr: "Pomme de terre saine",
    ar: "بطاطا سليمة",
    healthy: true,
    recommendations: { fr: ["Surveiller le milieu humide — mildiou se développe vite", "Buttage régulier recommandé"], ar: ["مراقبة الوسط الرطب — يتطور الميلديو بسرعة", "التخميد المنتظم موصى به"] },
  },
  {
    key: "Raspberry___healthy",
    fr: "Framboisier sain",
    ar: "توت العليق سليم",
    healthy: true,
    recommendations: { fr: ["Supprimer les tiges épuisées après fructification", "Pailler pour conserver l'humidité du sol"], ar: ["إزالة السيقان المستنفدة بعد الإثمار", "التغطية لحفظ رطوبة التربة"] },
  },
  {
    key: "Soybean___healthy",
    fr: "Soja sain",
    ar: "فول الصويا سليم",
    healthy: true,
    recommendations: { fr: ["Inoculer avec Bradyrhizobium pour fixation azote", "Surveiller les aleurodes et chenilles"], ar: ["التلقيح بالبرادي ريزوبيوم لتثبيت الآزوت", "مراقبة الذباب الأبيض واليرقات"] },
  },
  {
    key: "Squash___Powdery_mildew",
    fr: "Oïdium de la courge",
    ar: "البياض الدقيقي للقرع",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec soufre mouillable ou bicarbonate de potassium", "Éviter l'irrigation par aspersion le soir", "Choisir des variétés résistantes à l'oïdium"],
      ar: ["معالجة بالكبريت القابل للبلل أو بيكربونات البوتاسيوم", "تجنب الري بالرش مساءً", "اختيار أصناف مقاومة للبياض الدقيقي"],
    },
  },
  {
    key: "Strawberry___Leaf_scorch",
    fr: "Brûlure foliaire du fraisier",
    ar: "احتراق الأوراق للفراولة",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec iprodione ou fenhexamide", "Éviter le mouillage du feuillage", "Éliminer les feuilles mortes régulièrement"],
      ar: ["معالجة بالإيبروديون أو الفنهكساميد", "تجنب ترطيب الأوراق", "إزالة الأوراق الميتة بانتظام"],
    },
  },
  {
    key: "Strawberry___healthy",
    fr: "Fraisier sain",
    ar: "فراولة سليمة",
    healthy: true,
    recommendations: { fr: ["Surveiller les acariens et les botrytis", "Renouveler les plants tous les 3-4 ans"], ar: ["مراقبة العناكب والعفن الرمادي", "تجديد النباتات كل 3-4 سنوات"] },
  },
  {
    key: "Tomato___Bacterial_spot",
    fr: "Tache bactérienne de la tomate",
    ar: "التبقع البكتيري للطماطم",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec cuivre oxychlorure dès les premiers symptômes", "Éviter la taille par temps humide", "Utiliser du matériel végétal certifié indemne"],
      ar: ["معالجة بأوكسيكلوريد النحاس عند ظهور الأعراض الأولى", "تجنب التقليم في الطقس الرطب", "استخدام مواد نباتية معتمدة خالية من المرض"],
    },
  },
  {
    key: "Tomato___Early_blight",
    fr: "Alternariose de la tomate",
    ar: "اللفحة المبكرة للطماطم",
    healthy: false,
    recommendations: {
      fr: ["Appliquer mancozèbe ou chlorothalonil toutes les 7-10 jours", "Pailler pour éviter les éclaboussures de sol", "Éliminer les feuilles inférieures touchées"],
      ar: ["تطبيق المانكوزيب أو الكلوروثالونيل كل 7-10 أيام", "التغطية لتجنب رشاش التربة", "إزالة الأوراق السفلية المصابة"],
    },
  },
  {
    key: "Tomato___Late_blight",
    fr: "Mildiou de la tomate",
    ar: "ميلديو الطماطم (اللفحة المتأخرة)",
    healthy: false,
    recommendations: {
      fr: ["Traiter en urgence avec cymoxanil + mancozèbe ou métalaxyl", "Supprimer et brûler les parties infectées", "Ne pas planter tomate/pomme de terre côte à côte"],
      ar: ["معالجة عاجلة بالسيموكسانيل + المانكوزيب أو الميتالاكسيل", "إزالة وحرق الأجزاء المصابة", "عدم زراعة الطماطم والبطاطا جنباً إلى جنب"],
    },
  },
  {
    key: "Tomato___Leaf_Mold",
    fr: "Cladosporiose de la tomate (moisissure foliaire)",
    ar: "عفن الأوراق (كلادوسبوريوم) للطماطم",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec chlorothalonil ou mancozèbe", "Améliorer la ventilation de la serre", "Réduire l'humidité relative nocturne"],
      ar: ["معالجة بالكلوروثالونيل أو المانكوزيب", "تحسين تهوية البيت المحمي", "تقليل الرطوبة النسبية الليلية"],
    },
  },
  {
    key: "Tomato___Septoria_leaf_spot",
    fr: "Septoriose de la tomate",
    ar: "تبقع السيبتوريا للطماطم",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec mancozèbe ou cuivre en alternance", "Arroser à la base des plantes (pas par aspersion)", "Rotation des cultures conseillée"],
      ar: ["معالجة بالمانكوزيب أو النحاس بالتناوب", "الري عند قاعدة النباتات (وليس بالرش)", "التناوب في المحاصيل موصى به"],
    },
  },
  {
    key: "Tomato___Spider_mites Two-spotted_spider_mite",
    fr: "Acarien tétranyque (deux points) – tomate",
    ar: "أكاروس العنكبوت ذو النقطتين (طماطم)",
    healthy: false,
    recommendations: {
      fr: ["Appliquer acaricide (bifénazate ou abamectine)", "Favoriser les prédateurs naturels (Phytoseiidae)", "Augmenter l'humidité ambiante (les acariens détestent l'humidité)"],
      ar: ["تطبيق مبيد أكاروسي (بيفيناسات أو أباميكتين)", "تشجيع المفترسات الطبيعية (فيتوسيدا)", "رفع رطوبة الجو المحيط (العناكب تكره الرطوبة)"],
    },
  },
  {
    key: "Tomato___Target_Spot",
    fr: "Corynespora / tache cible de la tomate",
    ar: "تبقع الهدف (كورينسبورا) للطماطم",
    healthy: false,
    recommendations: {
      fr: ["Traiter avec chlorothalonil ou azoxystrobine", "Améliorer la ventilation", "Éviter l'excès d'humidité foliaire"],
      ar: ["معالجة بالكلوروثالونيل أو الأزوكسيستروبين", "تحسين التهوية", "تجنب الإفراط في رطوبة الأوراق"],
    },
  },
  {
    key: "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    fr: "Virus de l'enroulement jaune des feuilles de tomate (TYLCV)",
    ar: "فيروس تجعد وتصفر أوراق الطماطم (TYLCV)",
    healthy: false,
    recommendations: {
      fr: ["Contrôler les aleurodes vecteurs (imidaclopride ou pyméthrozine)", "Arracher et détruire les plants infectés", "Utiliser des filets insectproof en serre"],
      ar: ["مكافحة ذباب التبغ الأبيض الناقل (الإيميداكلوبريد أو البيميثروزين)", "اقتلاع النباتات المصابة وإتلافها", "استخدام شبكات مضادة للحشرات في الأنفاق"],
    },
  },
  {
    key: "Tomato___Tomato_mosaic_virus",
    fr: "Virus de la mosaïque de la tomate (ToMV)",
    ar: "فيروس موزاييك الطماطم (ToMV)",
    healthy: false,
    recommendations: {
      fr: ["Désinfecter les outils et mains avant manipulation", "Détruire les plants malades immédiatement", "Utiliser des variétés résistantes au ToMV"],
      ar: ["تعقيم الأدوات واليدين قبل التعامل مع النباتات", "إتلاف النباتات المريضة فوراً", "استخدام أصناف مقاومة لفيروس ToMV"],
    },
  },
  {
    key: "Tomato___healthy",
    fr: "Tomate saine",
    ar: "طماطم سليمة",
    healthy: true,
    recommendations: { fr: ["Surveiller régulièrement le mildiou et les acariens", "Fertilisation potassique renforcée en fructification"], ar: ["مراقبة الميلديو والعناكب بانتظام", "تسميد بوتاسي مكثف خلال فترة الإثمار"] },
  },
];

export function getLabelByIndex(index: number): DiseaseLabel | null {
  return PLANT_DISEASE_LABELS[index] ?? null;
}

export function getTopPredictions(
  outputs: number[] | Float32Array,
  topK = 3
): Array<{ label: DiseaseLabel; confidence: number; index: number }> {
  const indexed = Array.from(outputs).map((score, i) => ({ score, i }));
  indexed.sort((a, b) => b.score - a.score);
  return indexed.slice(0, topK).map(({ score, i }) => ({
    label: PLANT_DISEASE_LABELS[i],
    confidence: Math.round(score * 100),
    index: i,
  })).filter((p) => p.label !== undefined);
}
