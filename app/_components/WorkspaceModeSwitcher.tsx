"use client";

import React from "react";
import { Car, ReceiptText } from "lucide-react";
import { useWorkspaceMode } from "@/lib/workspaceModeContext";

interface WorkspaceModeSwitcherProps {
  variant?: "header" | "sidebar";
  collapsed?: boolean;
}

export default function WorkspaceModeSwitcher({
  variant = "header",
  collapsed = false,
}: WorkspaceModeSwitcherProps) {
  const { mode, switchAndNavigate } = useWorkspaceMode();
  const isFinance = mode === "FINANCE";

  if (variant === "sidebar") {
    if (collapsed) {
      return (
        <div className="flex justify-center py-2 px-1">
          <button
            type="button"
            onClick={() => switchAndNavigate(isFinance ? "OPERATIONS" : "FINANCE")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
              isFinance
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500 shadow-2xs"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:border-amber-500 shadow-2xs"
            }`}
            title={
              isFinance
                ? "الوضع الحالي: المالية والضريبة (انقر للتبديل إلى العمليات والأسطول)"
                : "الوضع الحالي: العمليات والأسطول (انقر للتبديل إلى المالية والضريبة)"
            }
            aria-label="تبديل وضع مساحة العمل"
          >
            {isFinance ? <ReceiptText className="w-4 h-4" /> : <Car className="w-4 h-4" />}
          </button>
        </div>
      );
    }

    return (
      <div className="px-3 pt-3 pb-2">
        <div className="p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => switchAndNavigate("OPERATIONS")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              !isFinance
                ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs border border-amber-500/30 font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40"
            }`}
          >
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">العمليات والأسطول</span>
          </button>

          <button
            type="button"
            onClick={() => switchAndNavigate("FINANCE")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              isFinance
                ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/30 font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40"
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">المالية والضريبة</span>
          </button>
        </div>
      </div>
    );
  }

  // Header variant
  return (
    <div className="flex items-center">
      <div className="p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => switchAndNavigate("OPERATIONS")}
          className={`flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            !isFinance
              ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs border border-amber-500/30 font-black"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
          title="الانتقال إلى واجهة العمليات والأسطول والعقود"
        >
          <Car className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">العمليات والأسطول</span>
          <span className="sm:hidden">العمليات</span>
        </button>

        <button
          type="button"
          onClick={() => switchAndNavigate("FINANCE")}
          className={`flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            isFinance
              ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/30 font-black"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
          title="الانتقال إلى واجهة الفواتير والمصروفات والإقرار الضريبي"
        >
          <ReceiptText className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">المالية والضريبة</span>
          <span className="sm:hidden">المالية</span>
        </button>
      </div>
    </div>
  );
}
