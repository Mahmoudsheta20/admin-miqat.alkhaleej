"use client";
import { useUiText } from "@/lib/ui-text";


import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Plus, Building2 } from "lucide-react";
import { PageHeader } from "@/app/_components/ui";
import { invoiceTitle, dateLabel, invoiceRequest, type InvoiceRow } from "@/lib/invoices";
import { useLanguage } from "@/lib/languageContext";

interface InvoiceList {
  items: InvoiceRow[];
  total: number;
  page: number;
}

export default function ZatcaPage() {
  const ui = useUiText();

  const { t, dir, isRTL } = useLanguage();
  const [data, setData] = useState<InvoiceList | null>(null);
  const [error, setError] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await invoiceRequest<InvoiceList>(`?page=${page}&documentType=TAX`);
    setError(result.error || "");
    if (result.data) setData(result.data);
    setIsLoading(false);
  }, [page]);

  useEffect(() => {
    let active = true;
    void invoiceRequest<InvoiceList>(`?page=${page}&documentType=TAX`).then((result) => {
      if (!active) return;
      setError(result.error || "");
      if (result.data) setData(result.data);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page]);

  const zatcaHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل الفوترة الإلكترونية الضريبية (ZATCA) والإشعارات" : "ZATCA E-Invoicing & Debit/Credit Notes Guide",
    summary: isRTL
      ? "يختص هذا القسم بالمستندات الضريبية الرسمية المتوافقة مع لائحة الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك (الفاتورة الضريبية القياسية، الفاتورة المبسطة، الإشعار الدائن، والإشعار المدين)."
      : "Covers official tax documents compliant with ZATCA electronic invoicing regulations: Standard Tax Invoice, Simplified Tax Invoice, Credit Notes, and Debit Notes.",
    cards: [
      {
        title: isRTL ? "١. أنواع المستندات الضريبية" : "1. Tax Document Profiles",
        badge: "ZATCA Profiles",
        items: [
          {
            label: isRTL ? "فاتورة ضريبية قياسية (STANDARD)" : "Standard Tax Invoice (B2B)",
            description: isRTL
              ? "تُصدر للمنشآت والشركات المسجلة في الضريبة (B2B) وتتطلب الرقم الضريبي للمشتري وعنوانه الوطني."
              : "Issued to VAT-registered businesses; requires buyer VAT number and national address.",
          },
          {
            label: isRTL ? "فاتورة ضريبية مبسطة (SIMPLIFIED)" : "Simplified Tax Invoice (B2C)",
            description: isRTL
              ? "تُصدر للأفراد والعملاء غير المسجلين ضريبياً (B2C) وتظهر فيها ضريبة القيمة المضافة ورمز QR الرسمي."
              : "Issued to individual consumers; contains 15% VAT and the official ZATCA QR code.",
          },
        ],
      },
      {
        title: isRTL ? "٢. الإشعارات الدائنة والمدينة" : "2. Adjustment Notes",
        badge: isRTL ? "التعديلات النظامية" : "Adjustments",
        items: [
          {
            label: isRTL ? "إشعار دائن (CREDIT NOTE)" : "Credit Note (Reduction)",
            code: "4201 / -210201",
            description: isRTL
              ? "يُستخدم لتخفيض أو إلغاء فاتورة صادرة مع إلزامية ربطه برقم الفاتورة الأصلية وذكر سبب التعديل، ويُخفض ضريبة المخرجات."
              : "Reduces or voids an issued invoice; must reference original invoice and decrease output VAT.",
          },
          {
            label: isRTL ? "إشعار مدين (DEBIT NOTE)" : "Debit Note (Addition)",
            code: "+4101 / +210201",
            description: isRTL
              ? "يُستخدم لإضافة مبالغ أو تمديد خدمات على فاتورة سابقة مع ربطه بالفاتورة الأصلية وزيادة ضريبة المخرجات."
              : "Adds charges or service extensions to a prior invoice, increasing output VAT.",
          },
        ],
      },
      {
        title: isRTL ? "٣. المعاملات الضريبية وترميز QR" : "3. Tax Categories & QR Code",
        badge: "TLV Tags 1–5",
        items: [
          {
            label: isRTL ? "فئات الضريبة المعتمدة" : "Tax Codes",
            code: "S (15%) / Z (0%) / E / O",
            description: isRTL
              ? "يدعم النظام التوريدات الخاضعة 15%، التوريدات الصفرية والصادرات 0% (VATEX-SA-32/34/35)، المعفاة (VATEX-SA-29)، وخارج النطاق."
              : "Supports standard 15% (S), zero-rated exports 0% (Z), exempt (E), and out-of-scope (O).",
          },
          {
            label: isRTL ? "حقول رمز QR الخمسة" : "5 TLV QR Fields",
            code: "UTF-8 Byte Length",
            description: isRTL
              ? "Tag 1: اسم المورد (شركة ميقات الخليج للنقل البري)، Tag 2: الرقم الضريبي (314917059400003)، Tag 3: التاريخ ISO-8601، Tag 4: الإجمالي، Tag 5: الضريبة."
              : "Tag 1: Seller Name, Tag 2: VAT Number, Tag 3: ISO Timestamp, Tag 4: Total Amount, Tag 5: VAT Amount.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "الإشعارات الدائنة الصادرة لتعديل فواتير من نفس الربع تُخصم من مبيعات الربع، بينما الإشعارات المرتبطة بفواتير ربع سابق تظهر تلقائياً في عمود «التعديلات (Adjustment)» بالخانة 1."
      : "Credit notes within the same quarter reduce quarter sales; prior-quarter adjustments reflect in Box 1 adjustment column.",
    formula: "TLV QR = [Tag1: Seller UTF-8][Tag2: 314917059400003][Tag3: ISO Timestamp][Tag4: Gross Total][Tag5: VAT]",
  }), [isRTL]);

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* Top Header with On-Demand Help Guide */}
      <PageHeader
        title={ui(isRTL ? "الفوترة الضريبية" : "ZATCA Tax Invoicing")}
        subtitle={ui(isRTL
            ? "إدارة الفواتير الضريبية والمبسطة والإشعارات الدائنة والمدينة المتوافقة مع متطلبات الزكاة والضريبة."
            : "Manage standard & simplified tax invoices, credit notes, and debit notes per ZATCA requirements.")}
        badge={t("section.financeReview")}
        icon={ShieldCheck}
        onRefresh={() => void load()}
        isRefreshing={isLoading}
        helpGuide={zatcaHelpGuide}
        onSeeded={(msg) => {
          setError("");
          setSeedMessage(msg);
          void load();
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setError(err);
        }}
        actions={
          <>
            <Link
              href="/admin/invoices/settings"
              className="theme-card inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-border hover:border-amber-500 text-xs font-bold transition shadow-2xs text-slate-700 dark:text-slate-200"
            >
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>{ui(isRTL ? "بيانات الشركة" : "Company Profile")}</span>
            </Link>

            <Link
              href="/admin/zatca/new"
              className="gold-gradient-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>{ui(isRTL ? "إنشاء مستند ضريبي" : "New Tax Document")}</span>
            </Link>
          </>
        }
      />

      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {ui(seedMessage)}
        </p>
      )}
      {error && (
        <p role="alert" className="text-rose-600 text-xs font-bold">
          {ui(error)}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <p>{ui(data?.total || 0)} {ui("فاتورة")}</p>
        <button className="theme-card rounded-lg px-3 py-2 cursor-pointer" onClick={() => void load()}>
          {ui("تحديث")}</button>
      </div>

      <div className="theme-card rounded-2xl overflow-x-auto">
        <table className="w-full text-sm text-start">
          <thead className="theme-card-subtle">
            <tr>
              {[
                "رقم الفاتورة",
                "النوع",
                "العميل",
                "الإجمالي",
                "الضريبة",
                "تاريخ الفاتورة",
              ].map((label) => (
                <th key={label} className="p-4 whitespace-nowrap">
                  {ui(label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id} className="border-t theme-border">
                <td className="p-4">
                  <Link
                    className="text-amber-700 dark:text-amber-400 font-bold font-mono"
                    href={`/admin/invoices/${row.id}`}
                  >
                    {ui(row.invoiceNumber)}
                  </Link>
                </td>
                <td className="p-4 whitespace-nowrap">{ui(invoiceTitle(row))}</td>
                <td className="p-4">{row.customerName}</td>
                <td className="p-4 font-mono">{ui(row.totalAmount)} {ui("ر.س")}</td>
                <td className="p-4 font-mono text-slate-500">{ui(row.vatAmount)}</td>
                <td className="p-4 whitespace-nowrap">{ui(dateLabel(row.invoiceDate, ui.language))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && !error && (
          <p role="status" className="p-6 animate-pulse">
            {ui("جارٍ تحميل الفواتير…")}</p>
        )}
        {data?.items.length === 0 && (
          <p className="p-8 text-slate-500">{ui("لا توجد مستندات ضريبية محلية حتى الآن.")}</p>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <button
          disabled={page === 1}
          className="theme-card px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer"
          onClick={() => setPage(page - 1)}
        >
          {ui("السابق")}</button>
        <span>{ui("صفحة")}{ui(page)}</span>
        <button
          disabled={!data || page * 30 >= data.total}
          className="theme-card px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer"
          onClick={() => setPage(page + 1)}
        >
          {ui("التالي")}</button>
      </div>
    </div>
  );
}
