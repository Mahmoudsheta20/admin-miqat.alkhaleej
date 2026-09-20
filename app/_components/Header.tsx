"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
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
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useTheme } from "@/lib/themeContext";

import ProfileModal from "./ProfileModal";

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [timeStr, setTimeStr] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Live Makkah Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  if (!user) return null;

  const roleLabels: Record<string, { title: string; color: string }> = {
    ADMIN: {
      title: "المدير العام",
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    CAPTAIN: {
      title: "الكابتن",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  };

  const roleInfo = roleLabels[user.role] || {
    title: user.role,
    color: "text-slate-600 bg-slate-100 border-slate-200",
  };

  const homePath = user.role === "ADMIN" ? "/admin" : "/captain";

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#090e17]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Side: Mobile Menu Button + Clean Logo */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              aria-label="القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Clean Logo Brand - Image only, no redundant text */}
            <div
              className="flex items-center cursor-pointer min-w-0 py-1 transition-opacity hover:opacity-90"
              onClick={() => router.push(homePath)}
              title="ميقات الخليج - الصفحة الرئيسية"
            >
              <div className="h-8 sm:h-9 max-w-[130px] sm:max-w-[150px] flex items-center">
                <Image
                  src="/logo.svg"
                  alt="ميقات الخليج"
                  width={140}
                  height={40}
                  className="object-contain w-auto h-7 sm:h-8"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Right Side: Clock, CTA, Theme Toggle, User Profile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Makkah Clock */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                مكة المكرمة:
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-[12px]">
                {timeStr || "—"}
              </span>
            </div>

            {/* Captain Quick Action: Contract builder or Inspection */}
            {user.role === "CAPTAIN" && (
              <button
                onClick={() => router.push("/captain/contract")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl gold-gradient-btn text-xs transition shadow-xs font-bold"
                title="إنشاء عقد رحلة جديد"
              >
                <FileCheck2 className="w-4 h-4" />
                <span className="hidden sm:inline">إنشاء عقد رحلة</span>
              </button>
            )}

            {/* Admin Quick Action */}
            {user.role === "ADMIN" && (
              <button
                onClick={() => router.push("/admin/contracts")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl gold-gradient-btn text-xs transition shadow-xs font-bold"
                title="سجل العقود الرسمية"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">سجل العقود</span>
              </button>
            )}

            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-amber-500/50 text-slate-700 dark:text-slate-300 transition"
              title={
                theme === "dark"
                  ? "التبديل إلى الوضع النهاري"
                  : "التبديل إلى الوضع الليلي"
              }
              aria-label="تبديل المظهر"
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
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-2.5 py-1 rounded-xl border transition-all duration-200 text-right ${
                  isProfileMenuOpen
                    ? "border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/15 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                }`}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
                aria-label="قائمة الملف الشخصي"
                title="قائمة الملف الشخصي"
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs border border-amber-500/30">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span>{user.name.slice(0, 1)}</span>
                  )}
                </div>
                <div className="hidden sm:block min-w-0 pr-0.5 max-w-[110px]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {user.name}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleInfo.color}`}
                  >
                    {roleInfo.title}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                    isProfileMenuOpen ? "rotate-180 text-amber-500" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu Card */}
              {isProfileMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
                  role="menu"
                  aria-orientation="vertical"
                >
                  {/* User Card Header */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900/90 dark:to-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm border border-amber-500/30">
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={user.name}
                            fill
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
                            title="نشط الآن"
                          />
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleInfo.color}`}
                        >
                          {roleInfo.title}
                        </span>
                        {user.email && (
                          <p
                            className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate font-mono"
                            dir="ltr"
                          >
                            {user.email}
                          </p>
                        )}
                        {user.phone && (
                          <p
                            className="text-[11px] text-slate-500 dark:text-slate-400 font-mono"
                            dir="ltr"
                          >
                            {user.phone}
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
                        setIsProfileOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-right"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">الملف الشخصي</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            تعديل بيانات الحساب والصورة
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Dashboard Home */}
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        router.push(homePath);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-right"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition">
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">
                            {user.role === "ADMIN" ? "لوحة الإدارة" : "لوحة الكابتن"}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            الانتقال للصفحة الرئيسية
                          </p>
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
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-right"
                          role="menuitem"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
                              <FilePlus2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">إنشاء عقد رسمي</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                إصدار عقد رحلة جديد
                              </p>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/admin/captains");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-right"
                          role="menuitem"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">إدارة الكباتن</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                متابعة السائقين والأسطول
                              </p>
                            </div>
                          </div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/captain/contract");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-right"
                          role="menuitem"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
                              <FileCheck2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">عقد الرحلة</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                إنشاء ومراجعة العقود
                              </p>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            router.push("/captain/inspection");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-right"
                          role="menuitem"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition">
                              <ClipboardCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold">الفحص التشغيلي</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                تسجيل الفحص اليومي للمركبة
                              </p>
                            </div>
                          </div>
                        </button>
                      </>
                    )}

                    {/* Theme Toggle in Menu */}
                    <button
                      onClick={() => toggleTheme()}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition group text-right"
                      role="menuitem"
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
                          <p className="font-bold">المظهر</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {theme === "dark"
                              ? "التحويل إلى الوضع النهاري"
                              : "التحويل إلى الوضع الليلي"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {theme === "dark" ? "داكن" : "فاتح"}
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
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-bold text-xs text-right"
                      role="menuitem"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span>تسجيل الخروج من النظام</span>
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
        />
      )}
    </>
  );
}
