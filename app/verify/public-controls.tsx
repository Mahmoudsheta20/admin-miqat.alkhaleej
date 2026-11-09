"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { useLanguage } from "@/lib/languageContext";
import LanguageSwitcher from "@/app/_components/LanguageSwitcher";
export default function PublicControls() {
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  return <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4"><span className="text-sm text-[var(--text-muted)]">{language === "ar" ? "ميقات الخليج · التحقق من المستندات" : "Miqat Al Khaleej · Document verification"}</span><div className="flex items-center gap-2"><LanguageSwitcher /><button type="button" className="icon-button" onClick={toggleTheme} aria-label={language === "ar" ? "تبديل المظهر" : "Toggle theme"}>{theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button></div></header>;
}
