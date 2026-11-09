"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { HelpCircle, RefreshCw, X, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import { useUiText } from "@/lib/ui-text";
import Modal from "../Modal";
import SeedTestDataButton from "../SeedTestDataButton";
export interface HelpGuideCard { title: string; badge?: string; items: { label: string; description: string; code?: string }[] }
export interface HelpGuideData { title: string; summary: string; cards: HelpGuideCard[]; tip?: string; formula?: string }
export interface HeaderAction { label: string; href?: string; onClick?: () => void; icon?: LucideIcon; variant?: "primary" | "secondary" | "subtle" | "danger"; disabled?: boolean; title?: string }
export interface PageHeaderProps {
  icon?: LucideIcon; badge?: string; title: string; subtitle?: string; primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[]; actions?: ReactNode; helpGuide?: HelpGuideData;
  onRefresh?: () => void; isRefreshing?: boolean; onSeeded?: (message: string) => void; onSeedError?: (error: string) => void;
}
export default function PageHeader({ title, subtitle, primaryAction, secondaryActions = [], actions, helpGuide, onRefresh, isRefreshing, onSeeded, onSeedError }: PageHeaderProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const closeLabel = language === "ar" ? "إغلاق" : "Close";
  return <>
    <header className="page-header">
      <div className="min-w-0"><h1>{ui(title)}</h1>{subtitle && <p className="page-description">{ui(subtitle)}</p>}</div>
      <div className="page-actions">
        <SeedTestDataButton onSeeded={onSeeded} onError={onSeedError} />
        {onRefresh && <button type="button" className="icon-button" onClick={onRefresh} disabled={isRefreshing} aria-label={language === "ar" ? "تحديث البيانات" : "Refresh data"}><RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} /></button>}
        {helpGuide && <button type="button" className="icon-button" onClick={() => setIsHelpOpen(true)} aria-label={language === "ar" ? "دليل القسم" : "Section guide"}><HelpCircle size={18} /></button>}
        {secondaryActions.map((action, index) => <ActionButton key={`${action.label}:${index}`} action={action} />)}
        {actions}
        {primaryAction && <ActionButton action={{ ...primaryAction, variant: "primary" }} />}
      </div>
    </header>
    {helpGuide && isHelpOpen && <Modal label={ui(helpGuide.title)} onClose={() => setIsHelpOpen(false)}><section className="mobile-dialog-panel theme-card w-full max-w-2xl rounded-2xl p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4"><h2 className="text-xl font-semibold">{ui(helpGuide.title)}</h2><button type="button" className="icon-button" onClick={() => setIsHelpOpen(false)} aria-label={closeLabel}><X size={20} /></button></div>
      <p className="page-description">{ui(helpGuide.summary)}</p>
      {helpGuide.cards.map((card, index) => <section key={index} className="mt-7 border-t theme-border pt-5"><h3 className="mb-3 font-semibold">{ui(card.title)}</h3><dl className="space-y-4">{card.items.map((item, i) => <div key={i}><dt className="text-sm font-semibold">{ui(item.label)}{item.code && <bdi className="ms-2 font-mono text-xs">{item.code}</bdi>}</dt><dd className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">{ui(item.description)}</dd></div>)}</dl></section>)}
      {helpGuide.tip && <p className="mt-6 rounded-lg bg-[var(--accent-surface)] p-4 text-sm">{ui(helpGuide.tip)}</p>}
      {helpGuide.formula && <p dir="ltr" className="mt-4 break-words font-mono text-sm">{helpGuide.formula}</p>}
    </section></Modal>}
  </>;
}
function ActionButton({ action }: { action: HeaderAction }) {
  const ui = useUiText();
  const Icon = action.icon;
  const className = `button ${action.variant === "primary" ? "button-primary" : action.variant === "danger" ? "danger-btn" : "secondary-btn"} disabled:opacity-50`;
  const content = <>{Icon && <Icon size={17} aria-hidden="true" />}<span>{ui(action.label)}</span></>;
  if (action.href && !action.disabled) return <Link href={action.href} className={className} title={action.title}>{content}</Link>;
  return <button type="button" className={className} onClick={action.onClick} disabled={action.disabled} title={action.title}>{content}</button>;
}
