"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  UserCheck,
  ClipboardCheck,
} from "lucide-react";
import Sidebar from "@/app/_components/Sidebar";
import Header from "@/app/_components/Header";
import { useAuth } from "@/lib/authContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "ADMIN") {
        router.push("/captain");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#080c14]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            جاري تهيئة لوحة الإدارة...
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-slate-50 dark:bg-[#080c14]">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="app-main min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-6 lg:p-8 touch-scroll">
          <div className="app-content min-w-0 max-w-7xl mx-auto w-full">{children}</div>
        </main>

        {/* Mobile Bottom Navigation Bar for Admin */}
        <nav
          aria-label="التنقل السريع للجوال"
          className="mobile-bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#090e17]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-lg select-none"
        >
          {/* Dashboard */}
          <Link
            href="/admin"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-[44px] text-[10px] font-bold transition rounded-xl ${
              pathname === "/admin"
                ? "text-amber-600 dark:text-amber-400 font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>الرئيسية</span>
          </Link>

          {/* Contracts */}
          <Link
            href="/admin/contracts"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-[44px] text-[10px] font-bold transition rounded-xl ${
              pathname === "/admin/contracts" || (pathname.startsWith("/admin/contracts/") && pathname !== "/admin/contracts/new")
                ? "text-amber-600 dark:text-amber-400 font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>العقود</span>
          </Link>

          {/* Plus Center Button: New Contract */}
          <Link
            href="/admin/contracts/new"
            className="flex flex-col items-center justify-center -mt-4 mx-1 min-w-[56px]"
          >
            <div className={`w-12 h-12 rounded-full gold-gradient-btn flex items-center justify-center text-white shadow-md border-2 border-white dark:border-[#090e17] transition-transform active:scale-95 ${
              pathname === "/admin/contracts/new" ? "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-[#090e17]" : ""
            }`}>
              <FilePlus2 className="w-5 h-5" />
            </div>
            <span className={`text-[10px] mt-0.5 ${
              pathname === "/admin/contracts/new" ? "font-black text-amber-600 dark:text-amber-400" : "font-bold text-slate-500 dark:text-slate-400"
            }`}>
              عقد جديد
            </span>
          </Link>

          {/* Captains */}
          <Link
            href="/admin/captains"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-[44px] text-[10px] font-bold transition rounded-xl ${
              pathname === "/admin/captains" || pathname.startsWith("/admin/captains/")
                ? "text-amber-600 dark:text-amber-400 font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span>الكباتن</span>
          </Link>

          {/* Inspections */}
          <Link
            href="/admin/inspections"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-[44px] text-[10px] font-bold transition rounded-xl ${
              pathname === "/admin/inspections" || pathname.startsWith("/admin/inspections/")
                ? "text-amber-600 dark:text-amber-400 font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ClipboardCheck className="w-5 h-5" />
            <span>الفحص</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
