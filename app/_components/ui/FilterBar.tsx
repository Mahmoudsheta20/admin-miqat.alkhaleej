"use client";
import { useUiText } from "@/lib/ui-text";


import React from "react";
import { Search, X } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";

export interface FilterTab<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface FilterBarProps<T extends string = string> {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  tabs?: FilterTab<T>[];
  activeTab?: T;
  onTabChange?: (tabId: T) => void;
  children?: React.ReactNode;
}

export default function FilterBar<T extends string = string>({
  search,
  onSearchChange,
  searchPlaceholder,
  tabs = [],
  activeTab,
  onTabChange,
  children,
}: FilterBarProps<T>) {
  const ui = useUiText();

  const { t, isRTL } = useLanguage();
  const placeholder = searchPlaceholder || t("common.search");

  return (
    <div className="theme-card p-3 sm:p-4 rounded-2xl border theme-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search
          className={`w-4 h-4 text-slate-400 absolute ${
            isRTL ? "right-3.5" : "left-3.5"
          } top-1/2 -translate-y-1/2 pointer-events-none`}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={ui(placeholder)}
          className={`theme-input w-full ${
            isRTL ? "pe-10 ps-8" : "pe-10 ps-8"
          } py-2 text-xs sm:text-sm rounded-xl`}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className={`absolute ${
              isRTL ? "left-2.5" : "right-2.5"
            } top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition`}
            aria-label={ui(t("common.delete"))}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs / Pills */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "border theme-border text-slate-600 dark:text-slate-400 hover:border-amber-500/40"
                }`}
              >
                <span>{ui(tab.label)}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {ui(tab.count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Additional slot for custom filters / dropdowns */}
      {children && <div className="flex items-center gap-2">{ui(children)}</div>}
    </div>
  );
}

