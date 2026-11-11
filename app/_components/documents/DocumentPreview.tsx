"use client";
import { useState } from "react";
import { Download, ExternalLink, FileText, RefreshCw, X } from "lucide-react";
import Modal from "../Modal";
import { useLanguage } from "@/lib/languageContext";
export interface DocumentPreviewProps {
  title: string; reference?: string; url: string | null; downloadUrl?: string | null; onClose: () => void;
}
/** Shared authorized preview: session credentials never appear in URLs. */
export default function DocumentPreview({ title, reference, url, downloadUrl, onClose }: DocumentPreviewProps) {
  const { language } = useLanguage();
  const [revision, setRevision] = useState(0);
  const text = (ar: string, en: string) => language === "ar" ? ar : en;
  const iframeSrc = url ? (() => {
    const [base] = url.split("#");
    return `${base}${base.includes("?") ? "&" : "?"}v=${revision}#toolbar=1`;
  })() : undefined;
  return <Modal label={title} onClose={onClose}>
    <section className="mobile-dialog-panel document-preview theme-card flex flex-col">
      <header className="document-toolbar">
        <FileText className="h-5 w-5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm sm:text-base truncate">{title}</h2>
          {reference && <p className="mt-0.5 break-words text-xs sm:text-sm text-[var(--text-muted)]"><bdi>{reference}</bdi></p>}
        </div>
        {url && <>
          <button type="button" className="icon-button" onClick={() => setRevision(value => value + 1)} aria-label={text("تحديث المعاينة", "Refresh preview")}><RefreshCw size={18} aria-hidden="true" /></button>
          <a className="hidden sm:inline-flex button button-primary" href={downloadUrl || url} target="_blank" rel="noopener noreferrer"><Download size={17} aria-hidden="true" /><span>{text("تنزيل", "Download")}</span></a>
          <a className="hidden sm:inline-flex icon-button" href={url} target="_blank" rel="noopener noreferrer" aria-label={text("فتح في نافذة جديدة", "Open in a new window")}><ExternalLink size={18} aria-hidden="true" /></a>
        </>}
        <button type="button" className="icon-button" onClick={onClose} aria-label={text("إغلاق", "Close")}><X size={20} aria-hidden="true" /></button>
      </header>
      {iframeSrc ? <iframe key={`${url}:${revision}`} src={iframeSrc} title={title} className="min-h-0 flex-1 bg-white" />
        : <p role="alert" className="grid flex-1 place-content-center p-6 text-center">{text("تعذر تحديد المستند. أغلق المعاينة وحاول مجدداً.", "Document unavailable. Close the preview and try again.")}</p>}
      {url && (
        <footer className="sm:hidden border-t theme-border px-3 py-2.5 bg-[var(--bg-card)] flex items-center gap-2 shrink-0">
          <a
            className="flex-1 min-h-11 px-3 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-xs font-bold text-[var(--text-main)] inline-flex items-center justify-center gap-1.5"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            <span>{text("فتح بملء الشاشة", "Open fullscreen")}</span>
          </a>
          <a
            className="flex-1 button button-primary text-xs"
            href={downloadUrl || url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={16} />
            <span>{text("تنزيل PDF", "Download PDF")}</span>
          </a>
        </footer>
      )}
    </section>
  </Modal>;
}
