"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { INVOICE_TYPE_LABELS, type InvoiceDocumentType } from "@/lib/invoices";
import { backendUrl, type ApiResult } from "@/lib/backend";
interface PublicInvoiceProps { invoiceId: string }
interface InvoiceVerification { documentType?: InvoiceDocumentType; invoiceNumber: string; invoiceDate: string; companyName: string; currency: string; totals: { net: string; vat: string; gross: string } }
function publicKey(): string { return new URLSearchParams(window.location.hash.slice(1)).get("key") || ""; }
export default function PublicInvoice({ invoiceId }: PublicInvoiceProps) {
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
  return <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-10 dark:bg-[#080c14]" dir="rtl"><section className="theme-card w-full max-w-lg rounded-2xl p-6 sm:p-8">
    <Image src="/logo.svg" alt="ميقات الخليج" width={128} height={76} className="mx-auto mb-6 h-auto" priority />
    {isLoading ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />جارٍ تحميل الفاتورة…</p> : invoice ? <>
      <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="size-4 shrink-0" />الفاتورة مسجلة في نظام الشركة</div>
      <h1 className="text-xl font-bold">{INVOICE_TYPE_LABELS[invoice.documentType || "BOOKING"]} <bdi className="font-mono">{invoice.invoiceNumber}</bdi></h1><p className="mt-2 text-sm text-slate-500">{invoice.companyName}</p>
      <dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4 border-b theme-border pb-4"><dt className="text-slate-500">تاريخ الفاتورة</dt><dd className="font-mono" dir="ltr">{new Date(invoice.invoiceDate).toLocaleDateString("en-GB", { timeZone: "Asia/Riyadh" })}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">قبل الضريبة</dt><dd className="font-mono" dir="ltr">{invoice.totals.net}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">ضريبة القيمة المضافة</dt><dd className="font-mono" dir="ltr">{invoice.totals.vat}</dd></div></dl>
      <div className="mt-5 rounded-xl bg-slate-900 p-5 text-white"><p className="text-xs text-slate-300">الإجمالي شامل الضريبة</p><p className="mt-2 text-3xl font-bold"><bdi className="font-mono">{invoice.totals.gross}</bdi><span className="ms-2 text-sm font-normal text-slate-300">ر.س</span></p></div>
      <button disabled={isDownloading} onClick={() => void download()} className="gold-gradient-btn mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none">{isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{isDownloading ? "جارٍ تجهيز النسخة…" : "تنزيل الفاتورة PDF"}</button>
    </> : <div className="py-6 text-center"><FileText className="mx-auto mb-4 size-8 text-slate-400" /><h1 className="text-lg font-bold">الفاتورة غير متاحة</h1></div>}
    {error && <p role="alert" className="mt-5 text-center text-sm leading-relaxed text-rose-600 dark:text-rose-400">{error}</p>}
    {!isLoading && !invoice && <button onClick={() => window.location.reload()} className="mt-4 w-full rounded-xl border theme-border px-4 py-3 text-sm font-bold">إعادة المحاولة</button>}
  </section></main>;
}
