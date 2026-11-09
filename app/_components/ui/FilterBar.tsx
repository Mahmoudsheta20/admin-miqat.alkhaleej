"use client";
import { type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import { useUiText } from "@/lib/ui-text";
export interface FilterTab<T extends string = string> { id: T; label: string; count?: number }
export interface FilterBarProps<T extends string = string> { search: string; onSearchChange: (value: string) => void; searchPlaceholder?: string; tabs?: FilterTab<T>[]; activeTab?: T; onTabChange?: (tabId: T) => void; children?: ReactNode }
export default function FilterBar<T extends string = string>({ search, onSearchChange, searchPlaceholder, tabs = [], activeTab, onTabChange, children }: FilterBarProps<T>) {
  const { language } = useLanguage();
  const ui = useUiText();
  const label = searchPlaceholder || (language === "ar" ? "البحث في النتائج" : "Search results");
  return <div className="filter-bar" role="search" aria-label={ui(label)}>
    <div className="filter-search"><Search size={17} aria-hidden="true" /><input type="search" value={search} onChange={event => onSearchChange(event.target.value)} placeholder={ui(label)} aria-label={ui(label)} className="theme-input" />{search && <button type="button" className="icon-button" onClick={() => onSearchChange("")} aria-label={language === "ar" ? "مسح البحث" : "Clear search"}><X size={16} /></button>}</div>
    {tabs.length > 0 && <div className="filter-tabs" role="group" aria-label={language === "ar" ? "تصفية النتائج" : "Filter results"}>{tabs.map(tab => <button key={tab.id} type="button" className="filter-tab" aria-pressed={activeTab === tab.id} onClick={() => onTabChange?.(tab.id)}>{ui(tab.label)}{typeof tab.count === "number" && <bdi className="text-xs tabular-nums">{tab.count}</bdi>}</button>)}</div>}
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>;
}
