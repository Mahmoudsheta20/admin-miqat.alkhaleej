"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HelpCircle, RefreshCw, X, ChevronDown, LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import SeedTestDataButton from "@/app/_components/SeedTestDataButton";

export interface HelpGuideCard {
  title: string;
  badge?: string;
  items: Array<{
    label: string;
    description: string;
    code?: string;
  }>;
}

export interface HelpGuideData {
  title: string;
  summary: string;
  cards: HelpGuideCard[];
  tip?: string;
  formula?: string;
}

export interface HeaderAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "subtle" | "danger";
  disabled?: boolean;
  title?: string;
}

export interface PageHeaderProps {
  icon?: LucideIcon;
  badge?: string;
  title: string;
  subtitle?: string;
  primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[];
  actions?: React.ReactNode;
  helpGuide?: HelpGuideData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onSeeded?: (msg: string) => void;
  onSeedError?: (err: string) => void;
}

export default function PageHeader({
  icon: Icon,
  badge,
  title,
  subtitle,
  primaryAction,
  secondaryActions = [],
  actions,
  helpGuide,
  onRefresh,
  isRefreshing = false,
  onSeeded,
  onSeedError,
}: PageHeaderProps) {
  const { t, isRTL, dir } = useLanguage();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Metadata */}
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            {badge && (
              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold mb-1">
                {badge}
              </span>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          {/* Dev-only Seeder */}
          <SeedTestDataButton onSeeded={onSeeded} onError={onSeedError} />

          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border theme-card hover:border-amber-500 text-slate-600 dark:text-slate-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
              title={t("common.refresh")}
              aria-label={t("common.refresh")}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-500" : ""}`}
              />
            </button>
          )}

          {/* Help Guide Toggle */}
          {helpGuide && (
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
              title={t("common.help")}
            >
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">{t("common.help")}</span>
            </button>
          )}

          {/* Secondary Actions (Visible desktop, or collapsed if multiple) */}
          {secondaryActions.length === 1 && (
            <ActionButton action={secondaryActions[0]} />
          )}

          {secondaryActions.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <span>{t("common.more")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isMoreOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMoreOpen(false)}
                  />
                  <div
                    className={`absolute z-50 mt-1.5 w-48 rounded-xl border theme-border bg-white dark:bg-slate-900 shadow-lg py-1 ${
                      isRTL ? "left-0" : "right-0"
                    }`}
                  >
                    {secondaryActions.map((action, i) => (
                      <div key={i} onClick={() => setIsMoreOpen(false)}>
                        <ActionButton action={action} dropdownItem />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Custom Action Slot */}
          {actions}

          {/* Primary Action Button */}
          {primaryAction && <ActionButton action={primaryAction} isPrimary />}
        </div>
      </header>

      {/* Slide-over Help Drawer */}
      {helpGuide && isHelpOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsHelpOpen(false)}
          />

          <div
            className={`fixed inset-y-0 ${
              isRTL ? "left-0" : "right-0"
            } max-w-full flex pl-10`}
            dir={dir}
          >
            <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-s theme-border">
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b theme-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    {helpGuide.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={t("common.close")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-500/5 border border-amber-500/15 p-3 rounded-xl">
                  {helpGuide.summary}
                </p>

                {helpGuide.cards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border theme-border bg-slate-50/30 dark:bg-slate-800/20 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">
                        {card.title}
                      </h3>
                      {card.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {card.items.map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed space-y-0.5">
                          <strong className="text-slate-800 dark:text-slate-200 block">
                            {item.label}
                            {item.code && (
                              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 ms-1.5 font-bold">
                                [{item.code}]
                              </span>
                            )}
                          </strong>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {item.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {helpGuide.tip && (
                  <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-300 text-xs">
                    <strong className="block font-bold mb-0.5">
                      💡 {isRTL ? "ملاحظة هامة:" : "Key Tip:"}
                    </strong>
                    <span>{helpGuide.tip}</span>
                  </div>
                )}

                {helpGuide.formula && (
                  <div className="p-3 rounded-xl border theme-border bg-slate-100/50 dark:bg-slate-800/40 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <span className="block text-[10px] text-slate-400 uppercase font-sans font-bold">
                      {isRTL ? "معادلة الاحتساب:" : "Formula:"}
                    </span>
                    <span dir="ltr" className="block mt-0.5">
                      {helpGuide.formula}
                    </span>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t theme-border bg-slate-50/50 dark:bg-slate-800/30">
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  className="w-full py-2.5 rounded-xl border theme-border font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionButton({
  action,
  isPrimary = false,
  dropdownItem = false,
}: {
  action: HeaderAction;
  isPrimary?: boolean;
  dropdownItem?: boolean;
}) {
  const Icon = action.icon;

  if (dropdownItem) {
    const content = (
      <span className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 transition rounded-lg mx-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-amber-500" />}
        <span>{action.label}</span>
      </span>
    );
    if (action.href) {
      return <Link href={action.href} className="block">{content}</Link>;
    }
    return (
      <button
        type="button"
        onClick={action.onClick}
        disabled={action.disabled}
        className="w-full text-start block cursor-pointer"
      >
        {content}
      </button>
    );
  }

  const baseClasses = isPrimary
    ? "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl gold-gradient-btn text-xs font-black shadow-sm hover:shadow-md transition cursor-pointer"
    : action.variant === "subtle"
      ? "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-300 transition shadow-2xs cursor-pointer"
      : "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer";

  if (action.href) {
    return (
      <Link href={action.href} className={baseClasses} title={action.title}>
        {Icon && <Icon className="w-4 h-4" />}
        <span>{action.label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={`${baseClasses} disabled:opacity-50`}
      title={action.title}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{action.label}</span>
    </button>
  );
}
