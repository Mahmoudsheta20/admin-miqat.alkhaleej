"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  ClipboardCheck,
  FilePlus2,
  Menu,
} from "lucide-react";
import Sidebar from "@/app/_components/Sidebar";
import Header from "@/app/_components/Header";
import { useAuth } from "@/lib/authContext";

export default function CaptainLayout({
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
      } else if (user.role !== "CAPTAIN") {
        router.push("/admin");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#080c14]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            جاري تهيئة بوابة الكابتن...
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "CAPTAIN") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080c14]">
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto w-full">{children}</div>
        </main>

        {/* Mobile Bottom Navigation Bar for Captains */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#090e17]/95 backdrop-blur-md border-t theme-border py-2 px-4 sm:px-6 flex items-center justify-around z-40">
          <Link
            href="/captain"
            className={`flex flex-col items-center gap-1 text-xs font-bold transition ${
              pathname === "/captain"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Home className="w-5 h-5" />
            <span>الرئيسية</span>
          </Link>

          <Link
            href="/captain/inspection"
            className={`flex flex-col items-center gap-1 text-xs font-bold transition ${
              pathname === "/captain/inspection"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <ClipboardCheck className="w-5 h-5" />
            <span>فحص اليوم</span>
          </Link>

          <Link
            href="/captain/contract"
            className={`flex flex-col items-center gap-1 text-xs font-bold transition ${
              pathname === "/captain/contract"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <FilePlus2 className="w-5 h-5" />
            <span>عقد جديد</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
