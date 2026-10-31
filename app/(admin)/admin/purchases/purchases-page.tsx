"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Calculator,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  RotateCcw,
  ShieldAlert,
  Truck,
} from "lucide-react";
import {
  amountLabel,
  currentSaudiPeriod,
  EXPENSE_CATEGORIES,
  type PurchaseList,
  type PurchaseRow,
} from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import SeedTestDataButton from "@/app/_components/SeedTestDataButton";
import SectionGuide from "@/app/_components/SectionGuide";
import PurchaseForm from "./purchase-form";
import PurchaseHistory from "./purchase-history";

const CONTROL = "theme-input h-11 rounded-xl px-3 text-xs sm:text-sm";

export default function PurchasesPage() {
  const current = currentSaudiPeriod();
  const [year, setYear] = useState(current.year);
  const [quarter, setQuarter] = useState(current.quarter);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [includeVoided, setIncludeVoided] = useState(false);
  const [editor, setEditor] = useState<PurchaseRow | "NEW" | "NEW_RETURN" | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const query = new URLSearchParams({
    year: String(year),
    quarter: String(quarter),
    page: String(page),
    search: submittedSearch,
    includeVoided: String(includeVoided),
    ...(category ? { category } : {}),
  });

  const { data, error, isLoading } = useAccountingQuery<PurchaseList>(
    `/purchases?${query}`,
    reload
  );

  function saved() {
    setEditor(null);
    setMessage("تم حفظ فاتورة المورد وتحديث السجل المالي والضريبي.");
    setReload((value) => value + 1);
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Page Header (§9, §16) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                العمل اليومي والمالية
              </span>
              <span className="text-xs text-slate-400 font-medium">
                فواتير الموردين وتكاليف الأسطول
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              المصروفات والمشتريات
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              سجّل فواتير الموردين، تابع مصروفات الأسطول، واخصم الضريبة المستحقة.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SeedTestDataButton
            onSeeded={(msg) => {
              setMessage(msg);
              setReload((value) => value + 1);
            }}
            onError={(err) => setMessage(err)}
          />

          <Link
            href="/admin/vat-returns"
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs font-bold transition shadow-2xs text-slate-700 dark:text-slate-200"
          >
            <Calculator className="size-4 text-amber-500" />
            <span>الإقرار الضريبي</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setEditor("NEW_RETURN");
            }}
            className="theme-card inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw className="size-4" />
            <span>+ مرتجع مورد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setEditor("NEW");
            }}
            className="gold-gradient-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <Plus className="size-4" />
            <span>تسجيل مصروف</span>
          </button>
        </div>
      </header>

      {/* Guide Card (§2, §9) */}
      <SectionGuide
        title="دليل المصروفات والمشتريات ومعالجة ضريبة المدخلات"
        summary="يُسجل في هذا القسم كافة فواتير الموردين ومصاريف تشغيل الأسطول من وقود وصيانة وتأمين، مع احتساب ضريبة المشتريات القابلة للخصم في الإقرار."
        cards={[
          {
            title: "1. فئات مصروفات الأسطول",
            badge: "التكاليف التشغيلية",
            items: [
              {
                label: "مصروفات المركبات والتشغيل",
                description: "الوقود (5101)، الصيانة والإطارات (5102)، النقل من الباطن (5103)، وتأمين المركبات (5104).",
              },
              {
                label: "الرواتب والرسوم الحكومية",
                description: "رواتب وعمولات السائقين (5105) والرسوم والتراخيص (5106)؛ وتُضبط ضريبتها على 0.00 ر.س تلقائياً لعدم تضخيم الضريبة.",
              },
            ],
          },
          {
            title: "2. ضريبة مشتريات يمكن خصمها",
            badge: "ZATCA 15%",
            items: [
              {
                label: "شروط استحقاق الخصم",
                description: "توفر فاتورة ضريبية رسمية باسم الشركة، ورقم ضريبي للمورد، ورقم مرجعي للمستند.",
              },
              {
                label: "حساب الضريبة من الإجمالي",
                description: "يدعم النظام إدخال الصافي قبل الضريبة أو استخراج الضريبة عكسياً من الإجمالي شامل 15% بدقة هللة واحدة.",
              },
            ],
          },
          {
            title: "3. طريقة الدفع والأرشفة",
            badge: "المرفقات والقيود",
            items: [
              {
                label: "طرق السداد المعتمدة",
                description: "آجل على حساب المورد (2101) أو تحويل بنكي (1102) أو نقداً من الصندوق (1101).",
              },
              {
                label: "رفع صورة الفاتورة أو PDF",
                description: "يمكن إرفاق نسخة الفاتورة أو الإيصال مباشرة لحفظ المستند المؤيد للخصم الضريبي.",
              },
            ],
          },
        ]}
        tip="عند تسجيل مصروفات غير خاضعة للضريبة مثل الرسوم الحكومية أو الرواتب، يُغلق حقل الضريبة تلقائياً لمنع أي أخطاء في إقرار هيئة الزكاة."
      />

      {/* Filters Toolbar */}
      <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            السنة المالية
            <select
              aria-label="السنة"
              className={`${CONTROL} ms-2 font-mono`}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(1);
              }}
            >
              {Array.from({ length: current.year - 2019 + 2 }, (_, i) => 2020 + i).map(
                (val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            الربع الضريبي
            <select
              className={`${CONTROL} ms-2`}
              value={quarter}
              onChange={(e) => {
                setQuarter(Number(e.target.value));
                setPage(1);
              }}
            >
              {[1, 2, 3, 4].map((q) => (
                <option value={q} key={q}>
                  الربع {q}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            تصنيف المصروف
            <select
              className={`${CONTROL} ms-2`}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">جميع المصروفات</option>
              {Object.entries(EXPENSE_CATEGORIES).map(([catKey, label]) => (
                <option key={catKey} value={catKey}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <form
            className="flex min-w-56 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedSearch(search.trim());
              setPage(1);
            }}
          >
            <input
              className={`${CONTROL} min-w-0 flex-1`}
              aria-label="بحث بالمورد أو الفاتورة أو اللوحة"
              placeholder="بحث بالمورد، رقم الفاتورة أو لوحة المركبة..."
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="theme-card rounded-xl border theme-border hover:border-amber-500 px-3.5 cursor-pointer text-slate-600 dark:text-slate-300 transition"
              aria-label="بحث"
            >
              <Search className="size-4" />
            </button>
          </form>

          <button
            type="button"
            className="theme-card rounded-xl border theme-border hover:border-amber-500 p-3 cursor-pointer text-slate-600 dark:text-slate-300 transition"
            aria-label="تحديث السجل"
            onClick={() => setReload((value) => value + 1)}
          >
            <RefreshCw
              className={`size-4 ${
                isLoading ? "animate-spin text-amber-500" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t theme-border">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVoided}
              onChange={(e) => {
                setIncludeVoided(e.target.checked);
                setPage(1);
              }}
              className="size-3.5 accent-amber-600 rounded cursor-pointer"
            />
            <span>إظهار القيود الملغاة</span>
          </label>
          <p className="text-[11px] text-slate-400">
            تُحتسب الإجماليات حسب تاريخ احتساب الضريبة، وتستبعد القيود الملغاة.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="theme-card rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "المشتريات قبل الضريبة", value: data?.totals.netAmount, color: "text-slate-900 dark:text-white" },
          { label: "إجمالي ضريبة الفواتير", value: data?.totals.vatAmount, color: "text-amber-600 dark:text-amber-400" },
          { label: "ضريبة يمكن خصمها (الخانة 7)", value: data?.totals.recoverableVat, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "الإجمالي شامل الضريبة", value: data?.totals.totalAmount, color: "text-slate-900 dark:text-white" },
        ].map((card) => (
          <div key={card.label} className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className={`mt-2 font-mono text-xl sm:text-2xl font-black ${card.color}`} dir="ltr">
              {card.value ? amountLabel(card.value) : "—"}
              <span className="ms-1.5 text-xs font-bold text-slate-400">ر.س</span>
            </p>
          </div>
        ))}
      </div>

      {/* Purchases Table Container */}
      <div className="theme-card overflow-hidden rounded-2xl sm:rounded-3xl border theme-border shadow-xs">
        <div className="px-4 sm:px-5 py-3.5 border-b theme-border bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            قائمة فواتير المصروفات ({data?.items.length ?? 0} قيد)
          </span>
          <span className="text-slate-400 font-mono">
            الربع {quarter} لسنة {year}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b theme-border bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                <th className="px-4 py-3.5">المورد والفاتورة</th>
                <th className="px-4 py-3.5">التصنيف والمركبة</th>
                <th className="px-4 py-3.5">التاريخ والاحتساب</th>
                <th className="px-4 py-3.5">قبل الضريبة</th>
                <th className="px-4 py-3.5">الضريبة</th>
                <th className="px-4 py-3.5">قابل للخصم</th>
                <th className="px-4 py-3.5">الإجمالي</th>
                <th className="px-4 py-3.5 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {data?.items.map((row) => {
                const isReturn = row.documentType === "PURCHASE_RETURN";
                const isVoided = Boolean(row.voidedAt);

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition duration-150 ${
                      isVoided ? "opacity-60 bg-rose-50/30 dark:bg-rose-950/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white font-bold">
                            {row.supplierName}
                          </strong>
                          {isReturn && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              <RotateCcw className="w-3 h-3" />
                              <span>مرتجع</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          <span className="text-amber-700 dark:text-amber-400 font-bold">{row.voucher}</span>
                          {" · "}
                          <span>{row.invoiceNumber}</span>
                          {row.supplierVatNumber && (
                            <span className="text-slate-400"> ({row.supplierVatNumber})</span>
                          )}
                        </p>
                        {isVoided && (
                          <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>ملغى: {row.voidReason}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {EXPENSE_CATEGORIES[row.category]}
                      </span>
                      {row.vehiclePlate && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] font-mono text-slate-500">
                          <Truck className="w-3 h-3 text-amber-500" />
                          <span>{row.vehiclePlate}</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                      <span className="text-slate-800 dark:text-slate-200 block">{row.issueDate}</span>
                      <span className="text-[11px] text-slate-400">الضريبة: {row.vatDate}</span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap" dir="ltr">
                      {amountLabel(isReturn ? String(-Number(row.netAmount)) : row.netAmount)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap" dir="ltr">
                      {amountLabel(isReturn ? String(-Number(row.vatAmount)) : row.vatAmount)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap" dir="ltr">
                      {amountLabel(isReturn ? String(-Number(row.recoverableVat)) : row.recoverableVat)}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`font-mono font-black text-sm ${
                          isReturn ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                        }`}
                        dir="ltr"
                      >
                        {amountLabel(isReturn ? String(-Number(row.totalAmount)) : row.totalAmount)}
                      </span>{" "}
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">ر.س</span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-left">
                      <div className="inline-flex items-center gap-1.5">
                        {!row.voidedAt && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                            aria-label={`تعديل ${row.invoiceNumber}`}
                            onClick={() => setEditor(row)}
                            title="تعديل بيانات المصروف"
                          >
                            <Pencil className="size-3.5 text-amber-500" />
                            <span>تعديل</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                          aria-label={`سجل ومرفقات ${row.invoiceNumber}`}
                          onClick={() => setHistory(row.id)}
                          title="عرض تفاصيل القيد والمرفقات وسجل المراجعة"
                        >
                          <History className="size-3.5 text-slate-400" />
                          <span>السجل</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y theme-border">
          {data?.items.map((row) => {
            const isReturn = row.documentType === "PURCHASE_RETURN";
            const isVoided = Boolean(row.voidedAt);

            return (
              <div
                key={row.id}
                className={`p-4 space-y-3 ${
                  isVoided ? "opacity-60 bg-rose-50/30 dark:bg-rose-950/20" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                      {row.supplierName}
                    </strong>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                      <span className="text-amber-700 dark:text-amber-400 font-bold">{row.voucher}</span>
                      {" · "}
                      <span>{row.invoiceNumber}</span>
                    </p>
                  </div>
                  {isReturn ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 shrink-0">
                      <RotateCcw className="w-3 h-3" />
                      <span>مرتجع</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                      {EXPENSE_CATEGORIES[row.category]}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400 block">التاريخ:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{row.issueDate}</span>
                  </div>
                  <div className="text-left space-y-0.5">
                    <span className="text-[11px] text-slate-400 block">الإجمالي الشامل:</span>
                    <span
                      className={`font-mono text-sm font-black ${
                        isReturn ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                      }`}
                      dir="ltr"
                    >
                      {amountLabel(isReturn ? String(-Number(row.totalAmount)) : row.totalAmount)} ر.س
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  <span>قبل الضريبة: {amountLabel(isReturn ? String(-Number(row.netAmount)) : row.netAmount)}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    مسترد: {amountLabel(isReturn ? String(-Number(row.recoverableVat)) : row.recoverableVat)}
                  </span>
                </div>

                {row.vehiclePlate && (
                  <p className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                    <Truck className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>المركبة: {row.vehiclePlate}</span>
                  </p>
                )}

                {isVoided && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    <span>ملغى: {row.voidReason}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {!row.voidedAt && (
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border theme-card text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                      onClick={() => setEditor(row)}
                    >
                      <Pencil className="size-3.5 text-amber-500" />
                      <span>تعديل</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border theme-card text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    onClick={() => setHistory(row.id)}
                  >
                    <History className="size-3.5 text-slate-400" />
                    <span>السجل والمرفقات</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div role="status" className="space-y-3 p-8">
            {[1, 2, 3].map((val) => (
              <div key={val} className="theme-card-subtle h-12 animate-pulse rounded-xl" />
            ))}
            <span className="sr-only">جارٍ تحميل فواتير الموردين</span>
          </div>
        )}

        {data?.items.length === 0 && !isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              لا توجد فواتير موردين مسجلة لهذه الفترة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              سجّل مصروفات الوقود والصيانة وتكاليف الأسطول لاحتساب ضريبة المدخلات تلقائياً في الإقرار الضريبي.
            </p>
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEditor("NEW");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل أول مصروف</span>
            </button>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t theme-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4 text-xs">
          <button
            type="button"
            disabled={isLoading || page === 1}
            onClick={() => setPage((v) => v - 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card font-bold disabled:opacity-40 hover:border-amber-500 transition cursor-pointer"
          >
            السابق
          </button>

          <span className="font-bold text-slate-600 dark:text-slate-300">
            {data?.total ?? 0} قيد مسجل · صفحة <span className="font-mono">{page}</span>
          </span>

          <button
            type="button"
            disabled={isLoading || !data || page * 30 >= data.total}
            onClick={() => setPage((v) => v + 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card font-bold disabled:opacity-40 hover:border-amber-500 transition cursor-pointer"
          >
            التالي
          </button>
        </div>
      </div>

      {/* Editor Modal */}
      {editor && (
        <PurchaseForm
          key={typeof editor === "string" ? editor : editor.id}
          existing={typeof editor === "string" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}

      {/* History & Attachments Modal */}
      {history && (
        <PurchaseHistory
          id={history}
          onClose={() => setHistory(null)}
          onVoided={() => {
            setHistory(null);
            setReload((value) => value + 1);
            setMessage("تم إلغاء القيد مع الاحتفاظ بسجل المراجعة.");
          }}
        />
      )}
    </div>
  );
}
