"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, LogOut, UserRound, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useTheme } from "@/lib/themeContext";
import { useLanguage } from "@/lib/languageContext";
import { routeInfo, routeLabel, NAVIGATION_GROUPS } from "@/lib/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import ProfileModal from "./ProfileModal";
interface HeaderProps { onMenuToggle: () => void; isMenuOpen: boolean }
export default function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, isRTL } = useLanguage();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const route = routeInfo(pathname);
  const currentLabel = routeLabel(pathname, language);
  const text = (ar: string, en: string) => language === "ar" ? ar : en;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  if (!user) return null;
  return <>
    <header className="workspace-header">
      <button type="button" className="icon-button lg:hidden" onClick={onMenuToggle} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" aria-label={text("فتح القائمة", "Open navigation")}><Menu size={21} /></button>
      <nav aria-label={text("مسار الصفحة", "Breadcrumb")} className="workspace-breadcrumb">
        <Link href={user.role === "ADMIN" ? "/admin" : "/captain"} className="shrink-0">{text("ميقات الخليج", "Miqat Al Khaleej")}</Link>
        {route && <><Chevron size={14} aria-hidden="true" /><span className="hidden sm:inline shrink-0">{NAVIGATION_GROUPS[route.group][language]}</span><Chevron className="hidden sm:block shrink-0" size={14} aria-hidden="true" />{pathname !== route.href && currentLabel !== route[language] ? <Link href={route.href} className="truncate">{route[language]}</Link> : <span aria-current="page" className="truncate">{route[language]}</span>}{pathname !== route.href && currentLabel !== route[language] && <><Chevron size={14} aria-hidden="true" className="shrink-0" /><span aria-current="page" className="truncate">{currentLabel}</span></>}</>}
      </nav>
      <div className="workspace-header-actions">
        <LanguageSwitcher />
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label={text(theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن", theme === "dark" ? "Use light theme" : "Use dark theme")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button type="button" className="profile-button" onClick={() => setIsProfileOpen(true)} aria-label={text("الملف الشخصي", "Profile")}><span className="profile-avatar"><UserRound size={17} /></span><span className="hidden sm:block max-w-32 truncate">{user.name}</span></button>
        <button type="button" className="icon-button" disabled={isLoggingOut} onClick={async () => { setIsLoggingOut(true); setLogoutError(""); try { await logout(); } catch (error: unknown) { setLogoutError(error instanceof Error ? error.message : text("تعذر تسجيل الخروج", "Unable to sign out")); } finally { setIsLoggingOut(false); } }} aria-label={text("تسجيل الخروج", "Sign out")}><LogOut size={18} /></button>
      </div>
    </header>
    {logoutError && <p role="alert" className="border-b theme-border bg-rose-500/5 px-5 py-3 text-sm text-rose-700 dark:text-rose-300">{logoutError}</p>}
    {isProfileOpen && <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} initialTab="profile" />}
  </>;
}
