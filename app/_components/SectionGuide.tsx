"use client";
import { useUiText } from "@/lib/ui-text";


import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2, Info } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";

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
  defaultOpen = false,
}: SectionGuideProps) {
  const ui = useUiText();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { dir, language } = useLanguage();
  const isAr = language === "ar";

  return (
    <section
      aria-label={ui(title)}
      className="theme-card rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] overflow-hidden transition-all"
      dir={dir}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 flex items-center justify-center text-[var(--accent-gold)] shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-[var(--accent-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-gold)] border border-[var(--accent-gold)]/30">
                {ui(isAr ? "دليل المعرفة وشرح القسم" : "Section Guide & Knowledge")}
              </span>
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                {ui(title)}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
              {ui(summary)}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--accent-gold)] transition shrink-0 cursor-pointer"
        >
          <span>
            {ui(isOpen
              ? isAr
                ? "إخفاء الشرح"
                : "Hide Guide"
              : isAr
                ? "عرض الشرح التفصيلي"
                : "Show Detailed Guide")}
          </span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="border-t theme-border px-4 py-4 sm:px-5 space-y-3 bg-[var(--bg-card)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {cards.map((card) => (
              <div
                key={card.title}
                className="theme-card-subtle rounded-xl border theme-border p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 border-b theme-border pb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                    <span>{ui(card.title)}</span>
                  </h3>
                  {card.badge && (
                    <span className="rounded-md bg-[var(--bg-card)] border theme-border px-2 py-0.5 font-mono text-xs font-bold text-[var(--text-muted)]">
                      {ui(card.badge)}
                    </span>
                  )}
                </div>

                <ul className="space-y-2 text-xs">
                  {card.items.map((item) => (
                    <li key={item.label} className="leading-relaxed">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[var(--text-main)]">
                          {ui(item.label)}:
                        </span>
                        {item.code && (
                          <code className="rounded bg-[var(--accent-surface)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--accent-gold)]">
                            {ui(item.code)}
                          </code>
                        )}
                      </div>
                      <p className="text-[var(--text-muted)] mt-0.5">
                        {ui(item.description)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {(formula || tip) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--accent-surface)] px-3.5 py-2.5 text-xs">
              {tip && (
                <div className="flex items-center gap-2 text-[var(--text-main)] font-medium">
                  <Info className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                  <span>{ui(tip)}</span>
                </div>
              )}
              {formula && (
                <div
                  className="font-mono text-xs font-bold text-[var(--accent-gold)] bg-[var(--bg-card)] border theme-border px-2.5 py-1 rounded-lg shrink-0"
                  dir="ltr"
                >
                  {ui(formula)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
