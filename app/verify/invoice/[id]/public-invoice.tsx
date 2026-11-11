"use client";
import { useUiText } from "@/lib/ui-text";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { invoiceTitle, type TaxDocument, type InvoiceDocumentType } from "@/lib/invoices";
import { backendUrl, type ApiResult } from "@/lib/backend";
interface PublicInvoiceProps { invoiceId: string }
interface InvoiceVerification { taxDocument?: Pick<TaxDocument, "kind" | "profile">; documentType?: InvoiceDocumentType; invoiceNumber: string; invoiceDate: string; companyName: string; currency: string; totals: { net: string; vat: string; gross: string } }
function publicKey(): string { return new URLSearchParams(window.location.hash.slice(1)).get("key") || ""; }
export default function PublicInvoice({ invoiceId }: PublicInvoiceProps) {
  const ui = useUiText();

  const [invoice, setInvoice] = useState<InvoiceVerification | null>(null), [error, setError] = useState(""), [isLoading, setIsLoading] = useState(true), [isDownloading, setIsDownloading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const key = publicKey();
        if (!/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error("رابط الفاتورة غير صالح أو غير مكتمل.");
        const response = await fetch(backendUrl(`/invoices/verify/${encodeURIComponent(invoiceId)}`), { credentials: "omit", cache: "no-store", headers: { "X-Invoice-Key": key }, signal: controller.signal });
        if (response.status === 404) throw new Error("رابط الفاتورة غير صالح أو غير متاح.");
        if (!response.ok) throw new Error("تعذر تحميل الفاتورة. حاول مجددًا بعد قليل.");
        const result: ApiResult<InvoiceVerification> = await response.json();
        if (!result.success || !result.data) throw new Error("تعذر التحقق من الفاتورة.");
        if (!controller.signal.aborted) setInvoice(result.data);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "تعذر الاتصال بخدمة الفواتير."); }
      finally { if (!controller.signal.aborted) setIsLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [invoiceId]);
  async function download() {
    if (!invoice) return;
    setIsDownloading(true); setError("");
    try {
      const response = await fetch(backendUrl(`/invoices/verify/${encodeURIComponent(invoiceId)}/pdf`), { credentials: "omit", cache: "no-store", headers: { "X-Invoice-Key": publicKey() }, signal: AbortSignal.timeout(60000) });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) throw new Error("تعذر تنزيل نسخة الفاتورة. حاول مجددًا.");
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
      link.href = url; link.download = `${invoice.invoiceNumber}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر التنزيل."); }
    finally { setIsDownloading(false); }
  }
  return <main className="grid min-h-dvh place-items-center bg-[var(--bg-main)] px-4 py-10" dir={ui.dir}><section className="theme-card w-full max-w-lg rounded-2xl p-6 sm:p-8">
    <Image src="/logo.svg" alt={ui("ميقات الخليج")} width={144} height={54} className="mx-auto mb-6 h-auto" loading="eager" />
    {isLoading ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]"><Loader2 className="size-4 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />{ui("جارٍ تحميل الفاتورة…")}</p> : invoice ? <>
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-600/35 bg-emerald-500/12 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{ui("الفاتورة مسجلة في نظام الشركة")}</div>
      <h1 className="text-lg sm:text-xl font-bold text-[var(--text-main)]">{ui(invoiceTitle(invoice))} <bdi className="font-mono text-[var(--accent-gold)]">{invoice.invoiceNumber}</bdi></h1><p className="mt-2 text-sm text-[var(--text-muted)]">{invoice.companyName}</p>
      <dl className="mt-6 space-y-4 text-sm text-[var(--text-main)]"><div className="flex justify-between gap-4 border-b theme-border pb-4"><dt className="text-[var(--text-muted)]">{ui("تاريخ الفاتورة")}</dt><dd className="font-mono" dir="ltr">{new Date(invoice.invoiceDate).toLocaleDateString("en-GB", { timeZone: "Asia/Riyadh" })}</dd></div><div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">{ui("قبل الضريبة")}</dt><dd className="font-mono" dir="ltr">{invoice.totals.net}</dd></div><div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">{ui("ضريبة القيمة المضافة")}</dt><dd className="font-mono" dir="ltr">{invoice.totals.vat}</dd></div></dl>
      <div className="mt-5 rounded-xl bg-slate-900 dark:bg-slate-800/95 border border-slate-700 p-4 text-white"><p className="text-xs text-slate-200">{ui("الإجمالي شامل الضريبة")}</p><p className="mt-1.5 text-xl sm:text-2xl font-bold"><bdi className="font-mono">{invoice.totals.gross}</bdi><span className="ms-2 text-xs sm:text-sm font-normal text-slate-200">{ui("ر.س")}</span></p></div>
      <button type="button" disabled={isDownloading} onClick={() => void download()} className="gold-gradient-btn mt-6 flex min-h-11 sm:min-h-9 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer motion-reduce:transition-none">{isDownloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}{ui(isDownloading ? "جارٍ تجهيز النسخة…" : "تنزيل الفاتورة PDF")}</button>
    </> : <div className="py-6 text-center"><FileText className="mx-auto mb-4 size-8 text-[var(--text-muted)]" aria-hidden="true" /><h1 className="text-lg font-bold text-[var(--text-main)]">{ui("الفاتورة غير متاحة")}</h1></div>}
    {error && <p role="alert" className="mt-5 text-center text-sm leading-relaxed text-rose-700 dark:text-rose-300">{ui(error)}</p>}
    {!isLoading && !invoice && <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 sm:min-h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-main)] px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer transition">{ui("إعادة المحاولة")}</button>}
  </section></main>;
}
