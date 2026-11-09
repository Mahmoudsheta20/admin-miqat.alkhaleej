"use client";
import { useId, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
export interface SearchSelectOption { id: string; label: string; description?: string }
interface SearchSelectProps { label: string; options: SearchSelectOption[]; value: string; onChange: (id: string) => void; error?: string; isRequired?: boolean; isDisabled?: boolean; className?: string }
/** Native disclosure and buttons keep searching and selection keyboard-accessible. */
export default function SearchSelect({ label, options, value, onChange, error, isRequired, isDisabled, className = "" }: SearchSelectProps) {
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const id = useId();
  const current = options.find(option => option.id === value);
  const filtered = options.filter(option => `${option.label} ${option.description || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className={`min-w-0 ${className}`}><span id={`${id}-label`} className="mb-2 block text-sm font-medium">{label}{isRequired && <span aria-hidden="true" className="ms-1 text-rose-700">*</span>}</span><details ref={details} className="search-select" onKeyDown={event => { if (event.key === "Escape" && details.current) { details.current.open = false; summary.current?.focus(); } }}>
    <summary ref={summary} aria-labelledby={`${id}-label ${id}-value`} aria-disabled={isDisabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="theme-input flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" onClick={event => { if (isDisabled) event.preventDefault(); }}><span id={`${id}-value`} className="min-w-0 break-words">{current?.label || value || (language === "ar" ? "اختر من القائمة" : "Choose an option")}</span><ChevronDown size={17} aria-hidden="true" /></summary>
    <div className="theme-card mt-2 rounded-lg p-2"><div className="relative mb-2"><Search size={16} className="absolute start-3 top-3.5 text-[var(--text-muted)]" aria-hidden="true" /><input type="search" className="theme-input min-h-11 w-full rounded-lg py-2 ps-9 pe-3 text-sm" value={search} onChange={event => setSearch(event.target.value)} aria-label={`${language === "ar" ? "بحث:" : "Search:"} ${label}`} /></div><div className="max-h-60 overflow-y-auto">{filtered.map(option => <button key={option.id} type="button" className="flex min-h-12 w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-start text-sm hover:bg-[var(--bg-card-subtle)]" aria-pressed={option.id === value} onClick={() => { onChange(option.id); setSearch(""); if (details.current) details.current.open = false; summary.current?.focus(); }}><span>{option.label}{option.description && <small className="mt-1 block text-xs text-[var(--text-muted)]">{option.description}</small>}</span>{option.id === value && <Check size={17} aria-hidden="true" />}</button>)}{!filtered.length && <p className="px-3 py-4 text-sm text-[var(--text-muted)]">{language === "ar" ? "لا توجد نتائج" : "No results"}</p>}</div></div>
  </details>{current?.description && <p className="mt-2 text-xs text-[var(--text-muted)]">{current.description}</p>}{error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}</div>;
}
