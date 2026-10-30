"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2, Info } from "lucide-react";

export interface SectionGuideItem {
  label: string;
  description: string;
  code?: string;
}

export interface SectionGuideCard {
  title: string;
  badge?: string;
  items: SectionGuideItem[];
}

export interface SectionGuideProps {
  title: string;
  summary: string;
  cards: SectionGuideCard[];
  formula?: string;
  tip?: string;
  defaultOpen?: boolean;
}

export default function SectionGuide({
  title,
  summary,
  cards,
  formula,
  tip,
  defaultOpen = true,
}: SectionGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      aria-label={title}
      className="theme-card rounded-2xl border border-amber-500/25 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] overflow-hidden transition-all"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300 border border-amber-500/25">
                دليل المعرفة وشرح القسم
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {title}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {summary}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-white/80 dark:bg-slate-900/70 hover:border-amber-500 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 transition shrink-0 cursor-pointer"
        >
          <span>{isOpen ? "إخفاء الشرح" : "عرض الشرح التفصيلي"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-amber-500/15 px-4 py-4 sm:px-5 space-y-3 bg-white/50 dark:bg-slate-950/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {cards.map((card) => (
              <div
                key={card.title}
                className="theme-card rounded-xl border theme-border p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 border-b theme-border pb-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{card.title}</span>
                  </h3>
                  {card.badge && (
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {card.badge}
                    </span>
                  )}
                </div>

                <ul className="space-y-2 text-xs">
                  {card.items.map((item) => (
                    <li key={item.label} className="leading-relaxed">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {item.label}:
                        </span>
                        {item.code && (
                          <code className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            {item.code}
                          </code>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {(formula || tip) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-2.5 text-xs">
              {tip && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{tip}</span>
                </div>
              )}
              {formula && (
                <div className="font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg shrink-0" dir="ltr">
                  {formula}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

