"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import SeedTestDataButton from "@/app/_components/SeedTestDataButton";
import SectionGuide from "@/app/_components/SectionGuide";
import { invoiceTitle, dateLabel, invoiceRequest, type InvoiceRow } from "@/lib/invoices";

interface InvoiceList {
  items: InvoiceRow[];
  total: number;
  page: number;
}

export default function ZatcaPage() {
  const [data, setData] = useState<InvoiceList | null>(null);
  const [error, setError] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const result = await invoiceRequest<InvoiceList>(`?page=${page}&documentType=TAX`);
    setError(result.error || "");
    if (result.data) setData(result.data);
  }, [page]);

  useEffect(() => {
    let active = true;
    void invoiceRequest<InvoiceList>(`?page=${page}&documentType=TAX`).then((result) => {
      if (!active) return;
      setError(result.error || "");
      if (result.data) setData(result.data);
    });
    return () => {
      active = false;
    };
  }, [page]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الفوترة الضريبية</h1>
          <p className="mt-2 text-slate-500">
            إدارة الفواتير الضريبية والمبسطة والإشعارات الدائنة والمدينة المتوافقة مع متطلبات الزكاة والضريبة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SeedTestDataButton
            onSeeded={(msg) => {
              setError("");
              setSeedMessage(msg);
              void load();
            }}
            onError={(err) => {
              setSeedMessage("");
              setError(err);
            }}
          />
          <Link className="theme-card px-4 py-2 rounded-xl" href="/admin/invoices/settings">
            بيانات الشركة
          </Link>
          <Link className="gold-gradient-btn px-4 py-2 rounded-xl" href="/admin/zatca/new">
            إنشاء مستند ضريبي
          </Link>
        </div>
      </header>

      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {seedMessage}
        </p>
      )}
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}

      <SectionGuide
        title="شرح الفوترة الإلكترونية الضريبية (ZATCA) والإشعارات الدائنة والمدينة"
        summary="يختص هذا القسم بالمستندات الضريبية الرسمية المتوافقة مع لائحة الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك (الفاتورة الضريبية القياسية، الفاتورة المبسطة، الإشعار الدائن، والإشعار المدين)."
        cards={[
          {
            title: "1. أنواع المستندات الضريبية",
            badge: "ZATCA Profiles",
            items: [
              {
                label: "فاتورة ضريبية قياسية (STANDARD)",
                description: "تُصدر للمنشآت والشركات المسجلة في الضريبة (B2B) وتتطلب الرقم الضريبي للمشتري وعنوانه الوطني.",
              },
              {
                label: "فاتورة ضريبية مبسطة (SIMPLIFIED)",
                description: "تُصدر للأفراد والعملاء غير المسجلين ضريبياً (B2C) وتظهر فيها ضريبة القيمة المضافة ورمز QR الرسمي.",
              },
            ],
          },
          {
            title: "2. الإشعارات الدائنة والمدينة",
            badge: "التعديلات النظامية",
            items: [
              {
                label: "إشعار دائن (CREDIT NOTE)",
                code: "4201 / -210201",
                description: "يُستخدم لتخفيض أو إلغاء فاتورة صادرة مع إلزامية ربطه برقم الفاتورة الأصلية وذكر سبب التعديل، ويُخفض ضريبة المخرجات.",
              },
              {
                label: "إشعار مدين (DEBIT NOTE)",
                code: "+4101 / +210201",
                description: "يُستخدم لإضافة مبالغ أو تمديد خدمات على فاتورة سابقة مع ربطه بالفاتورة الأصلية وزيادة ضريبة المخرجات.",
              },
            ],
          },
          {
            title: "3. المعاملات الضريبية وترميز QR",
            badge: "TLV Tags 1–5",
            items: [
              {
                label: "فئات الضريبة المعتمدة",
                code: "S (15%) / Z (0%) / E / O",
                description: "يدعم النظام التوريدات الخاضعة 15%، التوريدات الصفرية والصادرات 0% (VATEX-SA-32/34/35)، المعفاة (VATEX-SA-29)، وخارج النطاق.",
              },
              {
                label: "حقول رمز QR الخمسة",
                code: "UTF-8 Byte Length",
                description: "Tag 1: اسم المورد (شركة ميقات الخليج للنقل البري)، Tag 2: الرقم الضريبي (314917059400003)، Tag 3: التاريخ ISO-8601، Tag 4: الإجمالي، Tag 5: الضريبة.",
              },
            ],
          },
        ]}
        tip="الإشعارات الدائنة الصادرة لتعديل فواتير من نفس الربع تُخصم من مبيعات الربع، بينما الإشعارات المرتبطة بفواتير ربع سابق تظهر تلقائياً في عمود «التعديلات (Adjustment)» بالخانة 1."
        formula="TLV QR = [Tag1: Seller UTF-8][Tag2: 314917059400003][Tag3: ISO Timestamp][Tag4: Gross Total][Tag5: VAT]"
      />

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <p>{data?.total || 0} فاتورة</p>
        <button className="theme-card rounded-lg px-3 py-2 cursor-pointer" onClick={() => void load()}>
          تحديث
        </button>
      </div>

      <div className="theme-card rounded-2xl overflow-x-auto">
        <table className="w-full text-sm text-right">
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
                  {label}
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
                    {row.invoiceNumber}
                  </Link>
                </td>
                <td className="p-4 whitespace-nowrap">{invoiceTitle(row)}</td>
                <td className="p-4">{row.customerName}</td>
                <td className="p-4 font-mono">{row.totalAmount} ر.س</td>
                <td className="p-4 font-mono text-slate-500">{row.vatAmount}</td>
                <td className="p-4 whitespace-nowrap">{dateLabel(row.invoiceDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && !error && (
          <p role="status" className="p-6 animate-pulse">
            جارٍ تحميل الفواتير…
          </p>
        )}
        {data?.items.length === 0 && (
          <p className="p-8 text-slate-500">لا توجد مستندات ضريبية محلية حتى الآن.</p>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <button
          disabled={page === 1}
          className="theme-card px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer"
          onClick={() => setPage(page - 1)}
        >
          السابق
        </button>
        <span>صفحة {page}</span>
        <button
          disabled={!data || page * 30 >= data.total}
          className="theme-card px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer"
          onClick={() => setPage(page + 1)}
        >
          التالي
        </button>
      </div>
    </div>
  );
}
