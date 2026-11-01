"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useStoredPreference, setStoredPreference } from "./useStoredPreference";
import { useRouter } from "next/navigation";
import { localizeText } from "./localization";
import { TRANSLATIONS, type Language } from "./translations";

export type Direction = "rtl" | "ltr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  dir: Direction;
  isRTL: boolean;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, initialLanguage="ar" }: { children: React.ReactNode; initialLanguage?:Language }) {
  const router = useRouter();
  const stored = useStoredPreference("miqat_language", initialLanguage);
  const language: Language = stored === "en" ? "en" : "ar";
  const dir: Direction = language === "ar" ? "rtl" : "ltr";
  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = useCallback((newLang: Language) => {
    setStoredPreference("miqat_language", newLang);
    try { document.cookie = `miqat_language=${newLang}; path=/; max-age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* Keep the session preference when cookies are unavailable. */ }
    router.refresh();
  }, [router]);

  const toggleLanguage = useCallback(() => {
    const next: Language = language === "ar" ? "en" : "ar";
    setLanguage(next);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const langDict = TRANSLATIONS[language];
      if (langDict && key in langDict) {
        return langDict[key];
      }
      const arDict = TRANSLATIONS.ar;
      if (arDict && key in arDict) {
        return localizeText(arDict[key],language);
      }
      return localizeText(fallback || key,language);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        dir,
        isRTL,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

