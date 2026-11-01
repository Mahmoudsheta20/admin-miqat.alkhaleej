"use client";
import { useUiText } from "@/lib/ui-text";


import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Clock,
  Sun,
  Moon,
  LogOut,
  Plus,
  Menu,
  FileCheck2,
  ClipboardCheck,
  ChevronDown,
  User,
  LayoutDashboard,
  UserCheck,
  FilePlus2,
  ShieldCheck,
  Lock,
  ReceiptText,
  ShoppingBag,
  Globe,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useTheme } from "@/lib/themeContext";
import { useLanguage } from "@/lib/languageContext";
import { isSuperAdmin } from "@/lib/adminConstants";
import { useWorkspaceMode } from "@/lib/workspaceModeContext";
import WorkspaceModeSwitcher from "./WorkspaceModeSwitcher";
import LanguageSwitcher from "./LanguageSwitcher";

import ProfileModal from "./ProfileModal";

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export default function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const ui = useUiText();

  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isFinance } = useWorkspaceMode();
  const { language, toggleLanguage, t } = useLanguage();

  const [timeStr, setTimeStr] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "password">(
    "profile",
  );
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Live Makkah Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(ui.locale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Riyadh",
          hour12: true,
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [ui.locale]);

  // Close profile dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isProfileMenuOpen)
          menuRef.current?.querySelector("button")?.focus();
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener("pointerdown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  if (!user) return null;

  const isSuper = user.role === "ADMIN" && isSuperAdmin(user.email);

  const roleLabels: Record<string, { title: string; color: string }> = {
    ADMIN: {
      title: isSuper ? "المدير العام الأساسي" : "مسؤول إداري",
      color: isSuper
        ? "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20"
        : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    CAPTAIN: {
      title: "الكابتن",
      color:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  };

  const roleInfo = roleLabels[user.role] || {
    title: user.role,
    color: "text-slate-600 bg-slate-100 border-slate-200",
  };

  const homePath =
    user.role === "ADMIN"
      ? isFinance
        ? "/admin/invoices"
        : "/admin"
      : "/captain";

  return (
    <>
      <header className="sticky top-0 z-30 shrink-0 bg-white dark:bg-[#090e17] border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Side: Mobile Menu Button + Clean Logo + Mode Switcher */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => {
                setIsProfileMenuOpen(false);
                onMenuToggle();
              }}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              className="lg:hidden min-w-11 min-h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              aria-label={ui("القائمة الجانبية")}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Clean Logo Brand - Image only, no redundant text */}
            <Link
              href={homePath}
              className="flex items-center cursor-pointer min-w-0 py-1 transition-opacity hover:opacity-90"
              title={ui("ميقات الخليج - الصفحة الرئيسية")}
            >
              <div className="h-8 sm:h-9 w-20 sm:w-auto sm:max-w-[150px] flex items-center">
                <Image
                  src="/logo.svg"
                  alt={ui("ميقات الخليج")}
                  width={140}
                  height={40}
                  className="object-contain max-w-full w-auto h-7 sm:h-8"
                  priority
                />
              </div>
            </Link>

            {/* Mode Switcher in Header for Admin */}
            {user.role === "ADMIN" && (
              <div className="flex shrink-0 items-center lg:hidden 2xl:flex">
                <WorkspaceModeSwitcher variant="header" />
              </div>
            )}
          </div>

          {/* Right Side: Clock, CTA, Theme Toggle, User Profile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Makkah Clock */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {ui("مكة المكرمة:")}</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-[12px]">
                {ui(timeStr || "—")}
              </span>
            </div>

            {/* Captain Quick Action: Contract builder or Inspection */}
            {user.role === "CAPTAIN" && (
              <button
                onClick={() => router.push("/captain/contract")}
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs transition shadow-xs font-bold"
                title={ui("إنشاء عقد رحلة جديد")}
              >
                <FileCheck2 className="w-4 h-4" />
                <span className="hidden sm:inline">{ui("إنشاء عقد رحلة")}</span>
              </button>
            )}

            {/* Admin Quick Actions */}
            {user.role === "ADMIN" && (
              <div className="hidden lg:flex items-center gap-2">
                {isFinance ? (
                  <>
                    <button
                      onClick={() => router.push("/admin/purchases")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs transition shadow-2xs font-bold cursor-pointer"
                      title={ui("تسجيل مصروف أو فاتورة مشتريات")}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{ui("+ مصروف")}</span>
                    </button>
                    <button
                      onClick={() => router.push("/admin/invoices/new")}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs transition shadow-xs font-bold cursor-pointer"
                      title={ui("إنشاء فاتورة ضريبية جديدة")}
                    >
                      <ReceiptText className="w-4 h-4" />
                      <span>{ui("+ فاتورة")}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => router.push("/admin/inspections")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 text-xs transition shadow-2xs font-bold cursor-pointer"
                      title={ui("سجل فحص المركبات اليومي")}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>{ui("الفحوصات")}</span>
                    </button>
                    <button
                      onClick={() => router.push("/admin/contracts/new")}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs transition shadow-xs font-bold cursor-pointer"
                      title={ui("إنشاء عقد رسمي جديد")}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{ui("عقد جديد")}</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher variant="header" />

            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="hidden sm:flex min-w-11 min-h-11 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-amber-500/50 text-slate-700 dark:text-slate-300 transition"
              title={ui(theme === "dark"
                  ? "التبديل إلى الوضع النهاري"
                  : "التبديل إلى الوضع الليلي")}
              aria-label={ui("تبديل المظهر")}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* User Profile Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setIsProfileMenuOpen((prev) => !prev);
                }}
                className={`min-w-11 min-h-11 flex items-center justify-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-2.5 py-1 rounded-xl border transition-all duration-200 text-start ${
                  isProfileMenuOpen
                    ? "border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/15 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                }`}
                aria-expanded={isProfileMenuOpen}
                aria-controls="header-account"
                aria-label={ui("قائمة الملف الشخصي")}
                title={ui("قائمة الملف الشخصي")}
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs border border-amber-500/30">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      fill
                      sizes="32px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span>{user.name.slice(0, 1)}</span>
                  )}
                </div>
                <div className="hidden md:block min-w-0 ps-0.5 max-w-[110px]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {user.name}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleInfo.color}`}
                  >
                    {ui(roleInfo.title)}
                  </span>
                </div>
                <ChevronDown
                  className={`hidden md:block w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                    isProfileMenuOpen ? "rotate-180 text-amber-500" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu Card */}
              {isProfileMenuOpen && (
                <div
                  className="header-popover fixed sm:absolute inset-x-3 sm:inset-x-auto sm:start-0 top-[calc(4rem+env(safe-area-inset-top,0px))] sm:top-full mt-1.5 sm:mt-2 sm:w-80 max-w-md rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
                  id="header-account"
                  aria-label={ui("الحساب والإعدادات")}
                >
                  <div className="flex items-center justify-between border-b theme-border px-4 py-2 lg:hidden">
                    <p className="text-sm font-bold">{ui("الحساب والإعدادات")}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        menuRef.current?.querySelector("button")?.focus();
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label={ui("إغلاق الحساب والإعدادات")}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {/* User Card Header */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900/90 dark:to-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm border border-amber-500/30">
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={user.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span>{user.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {user.name}
                          </h3>
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0"
                            title={ui("نشط الآن")}
                          />
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleInfo.color}`}
                        >
                          {ui(roleInfo.title)}
                        </span>
                        {user.email && (
                          <p
                            className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate font-mono"
                            dir="ltr"
                          >
                            {ui(user.email)}
                          </p>
                        )}
                        {user.phone && (
                          <p
                            className="text-[11px] text-slate-500 dark:text-slate-400 font-mono"
                            dir="ltr"
                          >
                            {ui(user.phone)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation & Actions List */}
                  <div className="p-2 space-y-1 text-xs">
                    {/* View/Edit Profile */}
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setProfileTab("profile");
                        setIsProfileOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">{ui("الملف الشخصي")}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {ui("تعديل بيانات الحساب والصورة")}</p>
                        </div>
                      </div>
                    </button>

                    {/* Change Password */}
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setProfileTab("password");
                        setIsProfileOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">{ui(t("header.changePassword"))}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {ui(t("header.changePasswordSubtitle"))}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Language Switcher in Profile Menu */}
                    <button
                      onClick={() => {
                        toggleLanguage();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">{ui(language === "ar" ? "اللغة (Language)" : "Language (اللغة)")}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {ui(language === "ar" ? "التبديل إلى English" : "Switch to Arabic (العربية)")}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border theme-border font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        {ui(language === "ar" ? "English" : "العربية")}
                      </span>
                    </button>

                    {/* Dashboard Home */}
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        router.push(homePath);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition">
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">
                            {ui(user.role === "ADMIN"
                              ? "لوحة الإدارة"
                              : "لوحة الكابتن")}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {ui("الانتقال للصفحة الرئيسية")}</p>
                        </div>
                      </div>
                    </button>

                    {/* Role Specific Shortcuts */}
                    {user.role === "ADMIN" ? (
                      <>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/admin/contracts/new");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
                              <FilePlus2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">{ui("إنشاء عقد رسمي")}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {ui("إصدار عقد رحلة جديد")}</p>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/admin/captains");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">{ui("إدارة الكباتن")}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {ui("متابعة السائقين والأسطول")}</p>
                            </div>
                          </div>
                        </button>

                        {isSuper && (
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              router.push("/admin/admins");
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20 transition">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold">{ui("إدارة المسؤولين")}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {ui("إضافة وتعيين مسؤولي النظام")}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                              {ui("صلاحية حصرية")}</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/captain/contract");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
                              <FileCheck2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">{ui("عقد الرحلة")}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {ui("إنشاء ومراجعة العقود")}</p>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/captain/inspection");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition">
                              <ClipboardCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">{ui("الفحص التشغيلي")}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {ui("تسجيل الفحص اليومي للمركبة")}</p>
                            </div>
                          </div>
                        </button>
                      </>
                    )}

                    {/* Theme Toggle in Menu */}
                    <button
                      onClick={() => toggleTheme()}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-start"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20 transition">
                          {theme === "dark" ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Moon className="w-4 h-4 text-slate-700" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold">{ui("المظهر")}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {ui(theme === "dark"
                              ? "التحويل إلى الوضع النهاري"
                              : "التحويل إلى الوضع الليلي")}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {ui(theme === "dark" ? "داكن" : "فاتح")}
                      </span>
                    </button>
                  </div>

                  {/* Logout Divider & Action */}
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                    <button
                      onClick={async () => {
                        setIsProfileMenuOpen(false);
                        await logout();
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-bold text-xs text-start"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span>{ui("تسجيل الخروج من النظام")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          initialTab={profileTab}
        />
      )}
    </>
  );
}
