"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, Sun, Moon, LogOut, Plus, Menu, FileCheck2, ClipboardCheck } from "lucide-react";
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
          {/* Left Side: Mobile Menu Button + Logo */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              aria-label="القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo Brand */}
            <div
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer min-w-0"
              onClick={() => router.push(homePath)}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-1 sm:p-1.5 shrink-0">
                <Image
                  src="/logo.svg"
                  alt="ميقات الخليج"
                  width={26}
                  height={26}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-none truncate">
                  ميقات الخليج
                </h1>
                <span className="hidden sm:inline text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                  نظام العمليات والأسطول
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Clock, CTA, Theme Toggle, User Profile */}
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

            {/* User Profile Pill */}
            <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 group text-right hover:opacity-85 transition"
                title="تعديل الملف الشخصي والصورة"
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs border border-amber-500/30">
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
                <div className="hidden sm:block min-w-0 pr-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                    {user.name}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleInfo.color}`}
                  >
                    {roleInfo.title}
                  </span>
                </div>
              </button>

              {/* Logout Trigger */}
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
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
