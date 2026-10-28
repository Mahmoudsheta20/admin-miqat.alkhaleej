"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import InvoiceTransportDetails from "./transport-details";
import { BILLING_UNIT_LABELS } from "@/lib/invoice-transport";
import { dateLabel, downloadInvoice, invoiceRequest, type InvoiceDetail } from "@/lib/invoices";
interface InvoicePageProps { params: Promise<{ id: string }> }
export default function InvoicePage({ params }: InvoicePageProps) {
  const { id } = use(params), [data, setData] = useState<InvoiceDetail | null>(null), [error, setError] = useState(""), [isDownloading, setIsDownloading] = useState(false);
  useEffect(() => { let active = true; void invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(id)}`).then(result => { if (active) { setError(result.error || ""); setData(result.data || null); } }); return () => { active = false; }; }, [id]);
  async function download() { setIsDownloading(true); setError(""); try { await downloadInvoice(id); } catch (e) { setError(e instanceof Error ? e.message : "تعذر التنزيل"); } finally { setIsDownloading(false); } }
  if (!data) return <p role="status">{error || "جارٍ تحميل الفاتورة…"}</p>;
  return <div className="space-y-6" dir="rtl"><Link className="text-amber-700 dark:text-amber-400" href="/admin/invoices">سجل الفواتير</Link><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold font-mono">{data.invoiceNumber}</h1><p className="mt-2 text-slate-500">{data.snapshot.input.buyer.name} · محفوظة</p></div><button disabled={isDownloading} onClick={() => void download()} className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold disabled:opacity-50">{isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}تنزيل الفاتورة PDF</button></header>{error && <p role="alert" className="text-rose-600">{error}</p>}
    <section className="theme-card p-5 rounded-2xl"><h2 className="font-bold text-lg">بيانات الفاتورة</h2><dl className="grid gap-4 sm:grid-cols-2 mt-4">{[["الشركة", data.snapshot.issuer.legalName], ["تاريخ الفاتورة", dateLabel(data.invoiceDate)], ["فاتورة باسم", data.snapshot.input.buyer.name], ["طريقة الدفع", ({ "10": "نقدًا", "30": "تحويل", "42": "حساب بنكي", "48": "بطاقة" } as Record<string, string>)[data.snapshot.input.paymentCode]], ["قبل الضريبة", `${data.snapshot.totals.net} ر.س`], ["الضريبة", `${data.snapshot.totals.vat} ر.س`]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl><p className="mt-5 rounded-xl bg-slate-900 px-4 py-4 text-xl font-bold text-white">الإجمالي: <bdi className="font-mono">{data.snapshot.totals.gross}</bdi> ر.س</p></section>
    {data.snapshot.input.transport && <InvoiceTransportDetails value={data.snapshot.input.transport} />}
    <div className="theme-card p-4 rounded-2xl overflow-auto"><table className="w-full text-right text-sm"><thead><tr>{["البيان", "الكمية", "السعر", "الخصم", "الضريبة"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{data.snapshot.input.lines.map((line, index) => <tr className="border-t theme-border" key={index}><td className="p-3">{line.description}</td><td className="p-3">{line.quantity} {line.billingUnit ? BILLING_UNIT_LABELS[line.billingUnit] : ""}</td><td className="p-3 font-mono">{line.unitPrice}</td><td className="p-3 font-mono">{line.discount}</td><td className="p-3 font-mono">{line.rate}%</td></tr>)}</tbody></table></div>
  </div>;
}
