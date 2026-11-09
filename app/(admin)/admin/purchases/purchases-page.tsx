"use client";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";


import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, History, Pencil, Plus, RefreshCw, Search, ShoppingBag, RotateCcw, ShieldAlert, Truck } from "lucide-react";
import { amountLabel, currentSaudiPeriod, EXPENSE_CATEGORIES, type PurchaseList, type PurchaseRow } from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, Button, PageHeader, StatCard, StatRow, Money } from "@/app/_components/ui";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";
import PurchaseForm from "./purchase-form";
import PurchaseHistory from "./purchase-history";
import { useLanguage } from "@/lib/languageContext";

const CONTROL = "theme-input h-11 rounded-xl px-3 text-xs sm:text-sm";

function signedPurchaseAmount(raw: string, isReturn: boolean): string {
  const cleaned = raw.trim();
  if (!isReturn) return cleaned;
  return cleaned.startsWith("-") ? cleaned : `-${cleaned}`;
}

export default function PurchasesPage() {
  const ui = useUiText();

  const { t, dir, isRTL } = useLanguage();
  const current = currentSaudiPeriod();
  const [year, setYear] = useUrlState<number>("year", current.year);
  const [quarter, setQuarter] = useUrlState<number>("quarter", current.quarter, [1,2,3,4]);
  const [category, setCategory] = useUrlState<string>("category", "");
  const [submittedSearch, setSubmittedSearch] = useUrlState<string>("q", "");
  const [searchDraft, setSearch] = useState<string | null>(null);
  const search = searchDraft ?? submittedSearch;
  const [page, setPage] = useUrlState<number>("page", 1);
  const [reload, setReload] = useState(0);
  const [includeVoided, setIncludeVoided] = useUrlState<boolean>("voided", false);
  const [editor, setEditor] = useState<
    PurchaseRow | "NEW" | "NEW_RETURN" | null
  >(null);
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
    reload,
  );

  function saved() {
    setEditor(null);
    setMessage(isRTL ? "تم حفظ فاتورة المورد وتحديث السجل المالي والضريبي." : "Supplier invoice saved and ledger updated.");
    setReload((value) => value + 1);
  }

  const purchasesHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل المصروفات والمشتريات ومعالجة ضريبة المدخلات" : "Purchases & Input VAT Guide",
    summary: isRTL
      ? "يُسجل في هذا القسم كافة فواتير الموردين ومصاريف تشغيل الأسطول من وقود وصيانة وتأمين، مع احتساب ضريبة المشتريات القابلة للخصم في الإقرار."
      : "Records all supplier invoices and fleet operating expenses (fuel, maintenance, insurance), tracking deductible input VAT for the tax return.",
    cards: [
      {
        title: isRTL ? "١. فئات مصروفات الأسطول" : "1. Fleet Expense Categories",
        badge: isRTL ? "التكاليف التشغيلية" : "Operating Costs",
        items: [
          {
            label: isRTL ? "مصروفات المركبات والتشغيل" : "Vehicle & Operations",
            description: isRTL
              ? "الوقود (5101)، الصيانة والإطارات (5102)، النقل من الباطن (5103)، وتأمين المركبات (5104)."
              : "Fuel (5101), Maintenance & Tyres (5102), Subcontracted Transport (5103), Vehicle Insurance (5104).",
          },
          {
            label: isRTL ? "الرواتب والرسوم الحكومية" : "Salaries & Government Fees",
            description: isRTL
              ? "رواتب وعمولات السائقين (5105) والرسوم والتراخيص (5106)؛ وتُضبط ضريبتها على 0.00 ر.س تلقائياً لعدم تضخيم الضريبة."
              : "Driver salaries & commissions (5105), licensing & government fees (5106); VAT locked at 0.00 SAR.",
          },
        ],
      },
      {
        title: isRTL ? "٢. ضريبة مشتريات يمكن خصمها" : "2. Deductible Input VAT",
        badge: "ZATCA 15%",
        items: [
          {
            label: isRTL ? "شروط استحقاق الخصم" : "Deduction Eligibility",
            description: isRTL
              ? "توفر فاتورة ضريبية رسمية باسم الشركة، ورقم ضريبي للمورد، ورقم مرجعي للمستند."
              : "Official company tax invoice, supplier tax number, and reference voucher number.",
          },
          {
            label: isRTL ? "حساب الضريبة من الإجمالي" : "VAT Extracted from Gross",
            description: isRTL
              ? "يدعم النظام إدخال الصافي قبل الضريبة أو استخراج الضريبة عكسياً من الإجمالي شامل 15% بدقة هللة واحدة."
              : "Supports net entry or reverse extraction from 15% gross with halala precision.",
          },
        ],
      },
      {
        title: isRTL ? "٣. طريقة الدفع والأرشفة" : "3. Payment & Archiving",
        badge: isRTL ? "المرفقات والقيود" : "Ledger & Attachments",
        items: [
          {
            label: isRTL ? "طرق السداد المعتمدة" : "Payment Methods",
            description: isRTL
              ? "آجل على حساب المورد (2101) أو تحويل بنكي (1102) أو نقداً من الصندوق (1101)."
              : "Payable to supplier (2101), bank transfer (1102), or petty cash (1101).",
          },
          {
            label: isRTL ? "رفع صورة الفاتورة أو PDF" : "Receipt / PDF Upload",
            description: isRTL
              ? "يمكن إرفاق نسخة الفاتورة أو الإيصال مباشرة لحفظ المستند المؤيد للخصم الضريبي."
              : "Upload invoice photos or PDF receipts to archive supporting documentation.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "عند تسجيل مصروفات غير خاضعة للضريبة مثل الرسوم الحكومية أو الرواتب، يُغلق حقل الضريبة تلقائياً لمنع أي أخطاء في إقرار هيئة الزكاة."
      : "Non-taxable expenses like government fees or salaries automatically lock VAT to 0.00 to prevent return errors.",
  }), [isRTL]);

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* Top Page Header with Slide-Over Help */}
      <PageHeader
        title={ui(t("purchases.title"))}
        subtitle={ui(t("purchases.subtitle"))}
        badge={t("section.financeDaily")}
        icon={ShoppingBag}
        onRefresh={() => setReload((value) => value + 1)}
        isRefreshing={isLoading}
        helpGuide={purchasesHelpGuide}
        onSeeded={(msg) => {
          setMessage(msg);
          setReload((value) => value + 1);
        }}
        onSeedError={(err) => setMessage(err)}
        actions={
          <>
            <Link
              href="/admin/vat-returns"
              className="theme-card inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2 text-xs font-bold transition shadow-2xs text-slate-700 dark:text-slate-200"
            >
              <Calculator className="size-4 text-amber-500" aria-hidden="true" />
              <span>{ui(t("nav.vatReturnsShort"))}</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEditor("NEW_RETURN");
              }}
              className="theme-card inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>+ {ui(t("purchases.newReturn"))}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEditor("NEW");
              }}
              className="gold-gradient-btn inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>{ui(t("purchases.newPurchase"))}</span>
            </button>
          </>
        }
      />

      {/* Filters Toolbar */}
      <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {ui("السنة المالية")}<select
              aria-label={ui("السنة")}
              className={`${CONTROL} ms-2 font-mono`}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(1);
              }}
            >
              {Array.from(
                { length: current.year - 2019 + 2 },
                (_, i) => 2020 + i,
              ).map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {ui("الربع الضريبي")}<select
              className={`${CONTROL} ms-2`}
              value={quarter}
              onChange={(e) => {
                setQuarter(Number(e.target.value));
                setPage(1);
              }}
            >
              {[1, 2, 3, 4].map((q) => (
                <option value={q} key={q}>
                  {ui("الربع")} {q}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {ui("تصنيف المصروف")}<select
              className={`${CONTROL} ms-2`}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{ui("جميع المصروفات")}</option>
              {Object.entries(EXPENSE_CATEGORIES).map(([catKey, label]) => (
                <option key={catKey} value={catKey}>
                  {ui(label)}
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
              aria-label={ui("بحث بالمورد أو الفاتورة أو اللوحة")}
              placeholder={ui("بحث بالمورد، رقم الفاتورة أو لوحة المركبة...")}
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="theme-card inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border theme-border hover:border-amber-500 px-3.5 cursor-pointer text-[var(--text-muted)] dark:text-slate-300 transition"
              aria-label={ui("بحث")}
            >
              <Search className="size-4" aria-hidden="true" />
            </button>
          </form>

          <button
            type="button"
            className="theme-card inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border theme-border hover:border-amber-500 p-3 cursor-pointer text-[var(--text-muted)] dark:text-slate-300 transition"
            aria-label={ui("تحديث السجل")}
            onClick={() => setReload((value) => value + 1)}
          >
            <RefreshCw
              className={`size-4 ${
                isLoading ? "animate-spin text-amber-500" : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t theme-border">
          <label className="inline-flex min-h-11 items-center gap-2.5 text-xs font-bold text-[var(--text-muted)] dark:text-slate-400 cursor-pointer">
            <Checkbox
              checked={includeVoided}
              onChange={(e) => {
                setIncludeVoided(e.target.checked);
                setPage(1);
              }}
            />
            <span>{ui("إظهار القيود الملغاة")}</span>
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            {ui("تُحتسب الإجماليات حسب تاريخ احتساب الضريبة، وتستبعد القيود الملغاة.")}</p>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {ui(message)}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="theme-card rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-400"
        >
          {ui(error)}
        </p>
      )}

      {/* KPI Cards Ribbon */}
      <StatRow columns={4}>
        <StatCard
          label={ui(t("purchases.subtotal"))}
          value={data?.totals.netAmount ? amountLabel(data.totals.netAmount) : "0.00"}
          unit={t("common.sar")}
          icon={ShoppingBag}
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("purchases.totalVat"))}
          value={data?.totals.vatAmount ? amountLabel(data.totals.vatAmount) : "0.00"}
          unit={t("common.sar")}
          icon={Calculator}
          variant="amber"
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("purchases.recoverableVat"))}
          value={data?.totals.recoverableVat ? amountLabel(data.totals.recoverableVat) : "0.00"}
          unit={t("common.sar")}
          icon={RotateCcw}
          variant="emerald"
          isLoading={isLoading && !data}
        />
        <StatCard
          label={ui(t("purchases.total"))}
          value={data?.totals.totalAmount ? amountLabel(data.totals.totalAmount) : "0.00"}
          unit={t("common.sar")}
          icon={ShoppingBag}
          variant="blue"
          isLoading={isLoading && !data}
        />
      </StatRow>

      {/* Purchases Table Container */}
      <div className="theme-card overflow-hidden rounded-2xl sm:rounded-3xl border theme-border shadow-xs">
        <div className="px-4 sm:px-5 py-3.5 border-b theme-border bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {isRTL
              ? `قائمة فواتير المصروفات (${data?.items.length ?? 0} قيد)`
              : `Expense & purchase vouchers (${data?.items.length ?? 0})`}
          </span>
          <span className="text-[var(--text-muted)] font-mono">
            {isRTL ? `الربع ${quarter} لسنة ${year}` : `Q${quarter} ${year}`}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className={`w-full min-w-[900px] ${"text-start"} text-xs sm:text-sm border-collapse`}>
            <thead>
              <tr className="border-b theme-border bg-slate-50/80 dark:bg-slate-900/50 text-[var(--text-muted)] dark:text-slate-400 font-bold whitespace-nowrap">
                <th className="px-4 py-3.5">{ui(t("purchases.supplier"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.category"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.date"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.subtotal"))}</th>
                <th className="px-4 py-3.5">{ui(t("invoice.vat"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.recoverableVat"))}</th>
                <th className="px-4 py-3.5">{ui(t("purchases.total"))}</th>
                <th className={`px-4 py-3.5 ${"text-end"}`}>{ui(t("common.actions"))}</th>
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
                      isVoided
                        ? "opacity-60 bg-rose-50/30 dark:bg-rose-950/20"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white font-bold">
                            {row.supplierName}
                          </strong>
                          {isReturn && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              <RotateCcw className="w-3 h-3" aria-hidden="true" />
                              <span>{ui("مرتجع")}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          <bdi className="text-amber-700 dark:text-amber-400 font-bold">
                            {row.voucher}
                          </bdi>{" "}
                          · <bdi>{row.invoiceNumber}</bdi>
                          {row.supplierVatNumber && (
                            <span className="text-[var(--text-muted)]">
                              {" "}
                              (<bdi dir="ltr">{row.supplierVatNumber}</bdi>)
                            </span>
                          )}
                        </p>
                        {isVoided && (
                          <p className="text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                            <span>{ui("ملغى:")} {row.voidReason}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {ui(EXPENSE_CATEGORIES[row.category])}
                      </span>
                      {row.vehiclePlate && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
                          <Truck className="w-3 h-3 text-amber-500" aria-hidden="true" />
                          <span>{row.vehiclePlate}</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                      <bdi dir="ltr" className="text-slate-800 dark:text-slate-200 block">
                        {row.issueDate}
                      </bdi>
                      <span className="text-xs text-[var(--text-muted)]">
                        {ui("الضريبة:")} <bdi dir="ltr">{row.vatDate}</bdi>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Money
                        amount={signedPurchaseAmount(row.netAmount, isReturn)}
                        color="muted"
                        size="xs"
                      />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Money
                        amount={signedPurchaseAmount(row.vatAmount, isReturn)}
                        color="muted"
                        size="xs"
                      />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Money
                        amount={signedPurchaseAmount(row.recoverableVat, isReturn)}
                        color="emerald"
                        size="xs"
                      />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Money
                        amount={signedPurchaseAmount(row.totalAmount, isReturn)}
                        color={isReturn ? "rose" : "default"}
                        size="sm"
                      />
                    </td>

                    <td className={`px-4 py-3.5 whitespace-nowrap ${"text-end"}`}>
                      <div className="inline-flex items-center gap-1.5">
                        {!row.voidedAt && (
                          <button
                            type="button"
                            className="inline-flex min-h-11 lg:min-h-9 items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                            aria-label={isRTL ? `تعديل ${row.invoiceNumber}` : `Edit ${row.invoiceNumber}`}
                            onClick={() => setEditor(row)}
                            title={ui(t("common.edit"))}
                          >
                            <Pencil className="size-3.5 text-amber-500" aria-hidden="true" />
                            <span>{ui(t("common.edit"))}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="inline-flex min-h-11 lg:min-h-9 items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                          aria-label={isRTL ? `سجل ومرفقات ${row.invoiceNumber}` : `History & attachments for ${row.invoiceNumber}`}
                          onClick={() => setHistory(row.id)}
                          title={ui(t("common.details"))}
                        >
                          <History className="size-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                          <span>{ui(t("common.details"))}</span>
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
        <div className="md:hidden p-3.5 space-y-3">
          {data?.items.map((row) => {
            const isReturn = row.documentType === "PURCHASE_RETURN";
            const isVoided = Boolean(row.voidedAt);

            return (
              <MobileRecordCard
                key={row.id}
                muted={isVoided}
                title={row.supplierName}
                subtitle={
                  <span className="font-mono">
                    <bdi className="text-amber-700 dark:text-amber-400 font-bold">
                      {row.voucher}
                    </bdi>{" "}
                    · <bdi>{row.invoiceNumber}</bdi> · <bdi dir="ltr">{row.issueDate}</bdi>
                  </span>
                }
                badge={
                  isReturn ? (
                    <Badge variant="destructive" className="text-[11px] gap-1 shrink-0">
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>{ui("مرتجع")}</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[11px] shrink-0">
                      {ui(EXPENSE_CATEGORIES[row.category])}
                    </Badge>
                  )
                }
                footer={
                  <>
                    {!row.voidedAt && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 min-h-11 gap-1.5 text-xs font-bold"
                        onClick={() => setEditor(row)}
                      >
                        <Pencil className="size-3.5 text-amber-500" aria-hidden="true" />
                        <span>{ui("تعديل")}</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 min-h-11 gap-1.5 text-xs font-bold"
                      onClick={() => setHistory(row.id)}
                    >
                      <History className="size-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                      <span>{ui("السجل والمرفقات")}</span>
                    </Button>
                  </>
                }
              >
                <MobileCardMetaGrid columns={3}>
                  <MobileCardField
                    label={ui(t("purchases.subtotal"))}
                    value={
                      <Money
                        amount={signedPurchaseAmount(row.netAmount, isReturn)}
                        size="xs"
                        color="muted"
                      />
                    }
                  />
                  <MobileCardField
                    label={ui(t("purchases.recoverableVat"))}
                    value={
                      <Money
                        amount={signedPurchaseAmount(row.recoverableVat, isReturn)}
                        size="xs"
                        color="emerald"
                      />
                    }
                  />
                  <MobileCardField
                    label={ui(t("purchases.total"))}
                    value={
                      <Money
                        amount={signedPurchaseAmount(row.totalAmount, isReturn)}
                        color={isReturn ? "rose" : "default"}
                        size="sm"
                      />
                    }
                  />
                </MobileCardMetaGrid>

                {row.vehiclePlate && (
                  <p className="flex items-center gap-1 text-xs font-mono text-[var(--text-muted)]">
                    <Truck className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
                    <span>
                      {ui("المركبة:")} {row.vehiclePlate}
                    </span>
                  </p>
                )}

                {isVoided && (
                  <p className="text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>
                      {ui("ملغى:")} {row.voidReason}
                    </span>
                  </p>
                )}
              </MobileRecordCard>
            );
          })}
        </div>

        {isLoading && (
          <div role="status" className="space-y-3 p-8">
            {[1, 2, 3].map((val) => (
              <div
                key={val}
                className="theme-card-subtle h-12 animate-pulse rounded-xl"
              />
            ))}
            <span className="sr-only">{ui("جارٍ تحميل فواتير الموردين")}</span>
          </div>
        )}

        {data?.items.length === 0 && !isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {ui("لا توجد فواتير موردين مسجلة لهذه الفترة")}</h3>
            <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 max-w-sm mx-auto">
              {ui("سجّل مصروفات الوقود والصيانة وتكاليف الأسطول لاحتساب ضريبة المدخلات تلقائياً في الإقرار الضريبي.")}</p>
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEditor("NEW");
              }}
              className="inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{ui("تسجيل أول مصروف")}</span>
            </button>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t theme-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4 text-xs">
          <button
            type="button"
            disabled={isLoading || page === 1}
            onClick={() => setPage((v) => v - 1)}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card font-bold disabled:opacity-40 hover:border-amber-500 transition cursor-pointer"
          >
            {ui(t("common.back"))}
          </button>

          <span className="font-bold text-[var(--text-muted)] dark:text-slate-300">
            {data?.total ?? 0} · {ui(t("common.page"))}{" "}
            <span className="font-mono">{page}</span>
          </span>

          <button
            type="button"
            disabled={isLoading || !data || page * 30 >= data.total}
            onClick={() => setPage((v) => v + 1)}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card font-bold disabled:opacity-40 hover:border-amber-500 transition cursor-pointer"
          >
            {ui(t("common.next"))}
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
            setMessage(
              isRTL
                ? "تم إلغاء القيد مع الاحتفاظ بسجل المراجعة."
                : "Purchase entry voided while retaining audit history."
            );
          }}
        />
      )}
    </div>
  );
}
