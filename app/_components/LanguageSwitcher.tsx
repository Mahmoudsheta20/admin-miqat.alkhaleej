"use client";
import { useUiText } from "@/lib/ui-text";


import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";

interface LanguageSwitcherProps {
  variant?: "header" | "sidebar";
  collapsed?: boolean;
}

export default function LanguageSwitcher({
  variant = "header",
  collapsed = false,
}: LanguageSwitcherProps) {
  const ui = useUiText();

  const { language, toggleLanguage } = useLanguage();
  const isArabic = language === "ar";

  if (variant === "sidebar") {
    if (collapsed) {
      return (
        <button
          type="button"
          onClick={toggleLanguage}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-amber-500/50 text-slate-700 dark:text-slate-300"
          title={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
          aria-label={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
        >
          <span className="font-bold text-xs">{isArabic ? "EN" : "ع"}</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={toggleLanguage}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-amber-500/50 text-slate-700 dark:text-slate-300 transition group text-xs font-bold cursor-pointer"
        title={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
        aria-label={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
      >
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{ui("اللغة")}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border theme-border font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">
          {isArabic ? "English" : "العربية"}
        </span>
      </button>
    );
  }

  // Header Variant
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="hidden sm:flex min-w-11 min-h-11 items-center justify-center gap-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-amber-500/50 text-slate-700 dark:text-slate-300 transition cursor-pointer text-xs font-bold"
      title={ui(isArabic ? "Switch interface to English" : "التبديل إلى الواجهة العربية")}
      aria-label={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
    >
      <Globe className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="font-bold text-xs">{isArabic ? "EN" : "العربية"}</span>
    </button>
  );
}

