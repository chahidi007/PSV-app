export const WEEKS = [
  "S12","S13","S14","S15","S16",
  "S17","S18","S19",
  "S20","S21","S22","S23",
  "S24","S25","S26","S27",
  "S28","S29","S30","S31","S32",
  "S33","S34",
] as const;

export type Week = (typeof WEEKS)[number];

export const WEEK_MONTH: Record<Week, string> = {
  S12:"MARS",S13:"MARS",S14:"MARS",S15:"MARS",S16:"MARS",
  S17:"AVRIL",S18:"AVRIL",S19:"AVRIL",
  S20:"MAI",S21:"MAI",S22:"MAI",S23:"MAI",
  S24:"JUIN",S25:"JUIN",S26:"JUIN",S27:"JUIN",
  S28:"JUIL.",S29:"JUIL.",S30:"JUIL.",S31:"JUIL.",S32:"JUIL.",
  S33:"AOÛT",S34:"AOÛT",
};

export const MONTH_COLOR: Record<string, string> = {
  "MARS":   "#4e8d5e",
  "AVRIL":  "#2d7dd2",
  "MAI":    "#e9a84c",
  "JUIN":   "#c0392b",
  "JUIL.":  "#8e44ad",
  "AOÛT":   "#16a085",
};

export interface ProgrammeRow {
  label: string;
  labelAr: string;
  schedule: Partial<Record<Week, string>>;
}

export interface ProgrammeSection {
  id: string;
  title: string;
  titleAr: string;
  icon: string;
  rows: ProgrammeRow[];
}

export const VIGNE_2026: ProgrammeSection[] = [
  {
    id: "fongicide",
    title: "Fongicides",
    titleAr: "مبيدات فطرية",
    icon: "shield",
    rows: [
      {
        label: "Mildiou / Br. du bois",
        labelAr: "الميلديو / عفن الخشب",
        schedule: {
          S13:"Captane", S14:"Profiler", S15:"Ridomil", S16:"Carial",
          S17:"Reboot", S18:"Revus", S20:"Katanga", S22:"Ampexio", S24:"Orvego",
        },
      },
      {
        label: "Oïdium",
        labelAr: "البياض الدقيقي",
        schedule: {
          S13:"Soufre", S14:"Luna", S15:"Topas", S16:"Collis+S",
          S17:"Botcide", S18:"Vivando+S", S20:"Sercadis",
          S22:"Topas", S24:"Belanty", S26:"Collis", S28:"Miracle", S30:"Luna",
        },
      },
      {
        label: "Botrytis",
        labelAr: "العفن الرمادي",
        schedule: {
          S18:"Switch/Bellis/Polyv",
          S33:"Switch/Bellis/Polyv",
        },
      },
    ],
  },
  {
    id: "insecticide",
    title: "Insecticides",
    titleAr: "مبيدات حشرية",
    icon: "zap",
    rows: [
      {
        label: "Tordeuse + Autres",
        labelAr: "لفافة العنب + أخرى",
        schedule: {
          S12:"Méthah.", S13:"Warrior", S15:"Lambdac.",
          S20:"CyperM.", S24:"Malat.", S26:"Lambdac.", S33:"Warrior",
        },
      },
      {
        label: "Thrips / Cicadelle",
        labelAr: "التربس / سبرن",
        schedule: {
          S15:"Acetam.", S16:"Imidac.", S21:"Thiamé", S26:"Imida/Abam",
        },
      },
      {
        label: "Ver de grappe",
        labelAr: "دودة العنقود",
        schedule: { S16:"Emam." },
      },
      {
        label: "Acariens",
        labelAr: "أكاروس",
        schedule: {
          S20:"Ad./Larv./Œufs", S21:"Ad./Larv./Œufs", S22:"Ad./Larv./Œufs",
          S27:"Ad./Larv./Œufs", S28:"Ad./Larv./Œufs", S29:"Ad./Larv./Œufs",
        },
      },
      {
        label: "Cochenille",
        labelAr: "الدرقيات (كوشنيل)",
        schedule: {
          S14:"Imida./Acet. Inj", S15:"Imida./Acet. Inj",
          S21:"Movento/Closer", S22:"Movento/Closer",
        },
      },
    ],
  },
  {
    id: "fertigation",
    title: "Fertigation",
    titleAr: "التسميد بالري",
    icon: "droplet",
    rows: [
      { label:"Vigneto (kg/ha)", labelAr:"فينيتو (كغ/هـ)", schedule:{ S12:"250-300" } },
      { label:"MAP (L/ha)", labelAr:"MAP (ل/هـ)", schedule:{ S12:"10",S13:"10",S14:"10",S15:"10",S16:"10",S17:"10",S18:"5",S19:"5",S20:"5",S21:"5",S22:"5",S23:"5",S24:"5",S25:"5" } },
      { label:"9-50-9 OE (L/ha)", labelAr:"9-50-9 OE", schedule:{ S12:"5",S13:"5",S14:"5",S15:"5",S16:"5",S17:"5",S18:"5",S19:"5",S20:"5",S21:"5" } },
      { label:"AMM 33% (L/ha)", labelAr:"كبريتات أمونيوم 33%", schedule:{ S12:"10",S13:"10",S14:"10",S15:"10",S16:"10",S17:"10",S21:"15",S22:"15",S23:"15",S24:"15",S25:"15",S26:"10",S27:"10",S28:"10",S29:"10",S30:"10" } },
      { label:"20-20-20 OE (L/ha)", labelAr:"20-20-20 OE", schedule:{ S17:"5",S18:"5",S19:"5",S20:"5",S21:"5" } },
      { label:"N.P (L/ha)", labelAr:"نترات البوتاسيوم", schedule:{ S12:"5",S13:"5",S14:"5",S15:"5",S16:"5",S17:"5",S21:"10",S22:"10",S23:"10",S24:"10",S25:"10",S26:"15",S27:"15",S28:"15",S29:"15",S30:"15",S31:"15",S32:"15",S33:"15",S34:"15" } },
      { label:"S.P (L/ha)", labelAr:"كبريتات البوتاسيوم", schedule:{ S12:"5",S13:"5",S14:"5",S15:"5",S16:"5",S17:"5",S18:"5",S19:"5",S20:"5",S21:"5" } },
      { label:"12-6-36 OE (L/ha)", labelAr:"12-6-36 OE", schedule:{ S29:"10",S30:"10",S31:"10",S32:"10",S33:"10" } },
      { label:"5-5-65+OE (L/ha)", labelAr:"5-5-65+OE", schedule:{ S33:"12.5",S34:"12.5" } },
      { label:"S.M (L/ha)", labelAr:"كبريتات المغنيسيوم", schedule:{ S12:"2.5",S13:"2.5",S14:"2.5",S15:"2.5",S16:"2.5",S17:"2.5",S21:"5",S22:"5",S23:"5",S24:"5",S25:"5",S26:"7.5",S27:"7.5",S28:"7.5",S29:"7.5",S30:"7.5",S31:"7.5",S32:"7.5",S33:"7.5",S34:"7.5" } },
      { label:"N.C (L/ha)", labelAr:"نترات الكالسيوم", schedule:{ S12:"2.5",S13:"2.5",S14:"2.5",S15:"2.5",S16:"2.5",S17:"2.5",S21:"5",S22:"5",S23:"5",S24:"5",S25:"5",S26:"7.5",S27:"7.5",S28:"7.5",S29:"7.5",S30:"7.5",S31:"7.5",S32:"7.5",S33:"7.5",S34:"7.5" } },
      { label:"A.H. (L/ha)", labelAr:"أحماض هيوميك", schedule:{ S12:"5",S16:"5",S21:"5",S26:"5" } },
      { label:"AP-AN-AS (L/ha)", labelAr:"AP-AN-AS", schedule:{ S12:"5",S16:"5",S21:"5",S26:"5",S32:"5" } },
      { label:"Fer Chélaté (L/ha)", labelAr:"حديد مخلبي", schedule:{ S14:"5",S22:"5" } },
    ],
  },
  {
    id: "foliaire",
    title: "Foliaire",
    titleAr: "تغذية ورقية",
    icon: "wind",
    rows: [
      { label:"Azote (Urée Fol.)", labelAr:"آزوت (يوريا ورقي)", schedule:{ S13:"Urée Fol.", S23:"Urée Fol." } },
      { label:"Bore", labelAr:"بور", schedule:{ S15:"BORE",S17:"BORE",S20:"BORE",S22:"BORE" } },
      { label:"Zinc", labelAr:"زنك", schedule:{ S15:"ZINC",S17:"ZINC",S20:"ZINC",S22:"ZINC" } },
      { label:"Hormones (TBC)", labelAr:"هرمونات (TBC)", schedule:{ S14:"TBC",S20:"TBC" } },
      { label:"Algues", labelAr:"طحالب", schedule:{ S16:"AN",S27:"EM" } },
      { label:"Acides aminés", labelAr:"أحماض أمينية", schedule:{ S14:"AM",S19:"AM",S21:"AM" } },
      { label:"Potasse foliaire", labelAr:"بوتاس ورقي", schedule:{ S24:"PF",S27:"PF",S31:"PF" } },
      { label:"Magnésium foliaire", labelAr:"مغنيسيوم ورقي", schedule:{ S24:"MF",S27:"MF",S31:"MF" } },
      { label:"Calcium (OC)", labelAr:"كالسيوم (OC)", schedule:{ S15:"OC",S20:"OC",S26:"OC",S33:"OC" } },
      { label:"Autres (GB)", labelAr:"أخرى (GB)", schedule:{ S29:"GB",S34:"GB" } },
    ],
  },
];
