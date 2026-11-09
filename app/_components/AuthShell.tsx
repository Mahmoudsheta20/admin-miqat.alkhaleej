"use client";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import { useTheme } from "@/lib/themeContext";
import LanguageSwitcher from "./LanguageSwitcher";
interface AuthShellProps { title: string; description?: string; children: ReactNode; hasBackLink?: boolean }
export default function AuthShell({ title, description, children, hasBackLink }: AuthShellProps) {
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  return <div className="auth-page auth-shell">
    <header className="auth-toolbar"><Link href="/login" className="text-sm text-[var(--text-muted)]">{hasBackLink ? language === "ar" ? "العودة لتسجيل الدخول" : "Back to sign in" : language === "ar" ? "ميقات الخليج" : "Miqat Al Khaleej"}</Link><div className="flex items-center gap-2"><LanguageSwitcher /><button type="button" className="icon-button" onClick={toggleTheme} aria-label={language === "ar" ? "تبديل المظهر" : "Toggle theme"}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button></div></header>
    <main className="auth-main"><section className="auth-form-panel theme-card"><Image src="/logo.svg" alt="ميقات الخليج" width={148} height={55} loading="eager" className="mb-8 h-auto w-[148px] object-contain" /><h1 className="text-2xl font-semibold">{title}</h1>{description && <p className="page-description mb-7">{description}</p>}{children}</section></main>
    <footer className="auth-footer">© {new Date().getFullYear()} {language === "ar" ? "شركة ميقات الخليج للنقل البري" : "Miqat Al Khaleej Land Transport"}</footer>
  </div>;
}
