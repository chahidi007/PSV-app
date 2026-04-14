import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import t, { Lang } from "@/constants/translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof t["ar"];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  setLang: () => {},
  t: t.ar,
  isRTL: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("app_language")
      .then((v) => {
        setLangState(v === "fr" ? "fr" : "ar");
      })
      .catch(() => {
        setLangState("ar");
      });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem("app_language", l).catch(() => {});
  }, []);

  if (lang === null) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: t[lang], isRTL: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
