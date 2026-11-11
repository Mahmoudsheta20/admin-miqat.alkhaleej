"use client";
import { useUiText } from "@/lib/ui-text";



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
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] text-[var(--text-main)]"
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
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] text-[var(--text-main)] transition group text-xs font-bold cursor-pointer"
        title={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
        aria-label={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
      >
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
          <span>{ui("اللغة")}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border theme-border font-mono text-xs font-bold text-[var(--accent-gold)]">
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
      className="flex min-w-11 min-h-11 items-center justify-center gap-1.5 px-2.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] text-[var(--text-main)] transition cursor-pointer text-xs font-bold"
      title={ui(isArabic ? "Switch interface to English" : "التبديل إلى الواجهة العربية")}
      aria-label={ui(isArabic ? "Switch to English" : "التبديل إلى العربية")}
    >
      <Globe className="hidden sm:block w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
      <span className="font-bold text-xs">{isArabic ? "EN" : "العربية"}</span>
    </button>
  );
}
