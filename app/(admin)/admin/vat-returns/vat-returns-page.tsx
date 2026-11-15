"use client";
import { useReportPeriod } from "@/lib/use-report-period";
import { useUiText } from "@/lib/ui-text";


import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Calculator, Download, RefreshCw, AlertCircle, CheckCircle2, ExternalLink, ShoppingBag, ReceiptText, FileSpreadsheet, FileCheck2, TrendingDown, TrendingUp, Plus, Search, SlidersHorizontal, Save, Trash2 } from "lucide-react";
import { accountingRequest, amountLabel, computeClientManualVatReport, downloadAccounting, downloadManualVatReturn, isValidVatReport, periodBody, periodQuery, vatPeriodEnd, type VatReport, type VatSale } from "@/lib/accounting";
import { buildInvoiceListQueryPath, invoiceRiyadhDateKey, invoiceRequest, type InvoiceRow } from "@/lib/invoices";
import { commercialRequest } from "@/lib/commercial";
import { signedMoneyMinor } from "@/lib/dashboard-analytics";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { useUrlState } from "@/lib/use-url-state";
import AccountingPeriodSelector from "@/app/_components/AccountingPeriodSelector";
import { Checkbox, PageHeader } from "@/app/_components/ui";
import VatReturnTable from "./vat-return-table";
import ReturnSettings from "./return-settings";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";

interface SavedSelectionOption {
  id: string;
  name: string;
  invoiceIds: string[];
  version: number;
}

export default function VatReturnsPage() {
  const ui = useUiText();
  const { user } = useAuth();
  const canEditSettings = hasClientPermission(user, "vatReturns", "write");
  const canSearchInvoices = hasClientPermission(user, "invoices", "view");

  const { t, dir, isRTL } = useLanguage();
  const [period, setPeriod] = useReportPeriod();
  const [selectionMode, setSelectionMode] = useUrlState<"auto" | "manual">("selection", "auto", ["auto", "manual"]);
  const [urlGroupId, setUrlGroupId] = useUrlState<string>("groupId", "");
  const [failure, setFailure] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [reload, setReload] = useState(0);
  const [manualReload, setManualReload] = useState(0);

  // Manual invoice selection state
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [includeAllPurchases, setIncludeAllPurchases] = useState(true);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [extraSales, setExtraSales] = useState<VatSale[]>([]);
  const [checklistSearch, setChecklistSearch] = useState("");
  const [checklistDocType, setChecklistDocType] = useState<"" | "TAX" | "BOOKING">("");
  const [invoiceLookupQuery, setInvoiceLookupQuery] = useState("");
  const [invoiceLookupResults, setInvoiceLookupResults] = useState<InvoiceRow[]>([]);
  const [invoiceLookupLoading, setInvoiceLookupLoading] = useState(false);
  const [invoiceLookupError, setInvoiceLookupError] = useState("");
  const [manualData, setManualData] = useState<VatReport | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [savedGroups, setSavedGroups] = useState<SavedSelectionOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupNotice, setGroupNotice] = useState("");

  const { year, quarter } = period;

  const vatHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل إعداد ومطابقة الإقرار الضريبي (الخانات 1–16)" : "VAT Return Preparation Guide (Boxes 1–16)",
    summary: isRTL
      ? "يجهز هذا القسم أرقام الإقرار من المستندات المسجلة وتواريخ احتساب الضريبة، مع استبعاد المسودات والفواتير المبدئية. راجع المستندات وفروق التقريب قبل التقديم."
      : "Prepares return figures from recorded documents and VAT dates, excluding drafts and proformas. Review the evidence and rounding differences before filing.",
    cards: [
      {
        title: isRTL ? "١. ضريبة المبيعات والمخرجات (1–6)" : "1. Output Sales VAT (Boxes 1–6)",
        badge: "Output VAT",
        items: [
          {
            label: isRTL ? "الخانة 1 (المبيعات الخاضعة 15%)" : "Box 1 (Standard 15% Sales)",
            description: isRTL
              ? "تُعرض المبالغ قبل الضريبة. يخفض الإشعار الدائن المبلغ أو يظهر كتعديل بحسب الفترة الأصلية وتاريخ تقديم إقرارها."
              : "Amounts exclude VAT. Credits reduce Amount or appear as Adjustments according to the original period and its filing date.",
          },
          {
            label: isRTL ? "الخانة 6 (إجمالي ضريبة المبيعات)" : "Box 6 (Total Output VAT)",
            description: isRTL
              ? "مجموع ضريبة القيمة المضافة المحصلة عن كافة الرحلات والتوريدات الخاضعة خلال الفترة."
              : "Total VAT collected across all taxable trips and services during the period.",
          },
        ],
      },
      {
        title: isRTL ? "٢. ضريبة المشتريات والمدخلات (7–12)" : "2. Input Purchases VAT (Boxes 7–12)",
        badge: "Input VAT",
        items: [
          {
            label: isRTL ? "الخانة 7 (المشتريات الخاضعة 15%)" : "Box 7 (Standard 15% Purchases)",
            description: isRTL
              ? "صافي مشتريات الوقود والصيانة والتكاليف المؤيدة بفواتير ضريبية صحيحة للموردين."
              : "Net fuel, maintenance, and operating purchases supported by valid supplier tax invoices.",
          },
          {
            label: isRTL ? "الخانة 12 (إجمالي الضريبة القابلة للاسترداد)" : "Box 12 (Total Recoverable Input VAT)",
            description: isRTL
              ? "مجموع الضريبة المؤهلة للخصم بعد استبعاد المصروفات غير الخاضعة كرواتب السائقين والرسوم الحكومية."
              : "Total deductible VAT excluding non-taxable costs like driver salaries and licensing fees.",
          },
        ],
      },
      {
        title: isRTL ? "٣. التسوية وصافي الضريبة (13–16)" : "3. Settlement & Net VAT (Boxes 13–16)",
        badge: isRTL ? "الرصيد النهائي" : "Net Balance",
        items: [
          {
            label: isRTL ? "الخانة 13 (ضريبة الفترة)" : "Box 13 (Total VAT Due for Period)",
            description: isRTL
              ? "الفارق بين ضريبة المبيعات وضريبة المشتريات (الخانة 6 − الخانة 12)."
              : "Net output tax minus recoverable input tax (Box 6 − Box 12).",
          },
          {
            label: isRTL ? "الخانة 16 (صافي الضريبة المستحقة أو المستردة)" : "Box 16 (Net VAT Due or Refundable)",
            description: isRTL
              ? "الرقم النهائي الواجب سداده للهيئة أو رصيد دائن مستحق للمنشأة بعد خصم الرصيد المرحل والتصحيحات."
              : "Final amount payable to ZATCA or refundable credit after carried forward balance and corrections.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "استخدم «نسخ للإدخال» للحقول القابلة للتعبئة، و«نسخ للمطابقة» لمراجعة الضريبة والإجماليات التي تحتسبها البوابة."
      : "Use Copy for entry for editable fields, and Copy for review to reconcile VAT and totals calculated by the portal.",
    formula: "Box 16 = Box 6 (Output VAT) − Box 12 (Recoverable Input VAT) + Box 14 (Corrections) − Box 15 (Carried Credit)",
  }), [isRTL]);

  const { data, error, isLoading } = useAccountingQuery<VatReport>(
    `/vat-return?${periodQuery(period)}`,
    reload,
  );
  const validBaseData = isValidVatReport(data) ? data : null;

  // Load saved selection groups when Manual Mode is active
  useEffect(() => {
    if (selectionMode !== "manual") return;
    let alive = true;
    commercialRequest<{ items: SavedSelectionOption[] }>("/selections")
      .then((res) => {
        if (!alive) return;
        const items = res?.items || [];
        setSavedGroups(items);
        if (urlGroupId) {
          const matched = items.find((g) => g.id === urlGroupId);
          if (matched) {
            setSelectedGroupId(matched.id);
            setGroupName(matched.name);
            setSelectedSaleIds(matched.invoiceIds);
          }
        }
      })
      .catch(() => {
        if (alive) setSavedGroups([]);
      });
    return () => {
      alive = false;
    };
  }, [selectionMode, urlGroupId]);

  // Search all invoices by number or customer name to manually add any invoice
  useEffect(() => {
    const q = invoiceLookupQuery.trim();
    if (selectionMode !== "manual" || !canSearchInvoices || !q) return;
    let alive = true;
    const timer = setTimeout(() => {
      setInvoiceLookupLoading(true);
      setInvoiceLookupError("");
      invoiceRequest<{ items: InvoiceRow[] }>(
        buildInvoiceListQueryPath({ page: 1, search: q, archived: false }),
      )
        .then((res) => {
          if (!alive) return;
          if (!res.success || !res.data) {
            setInvoiceLookupError(res.error || (isRTL ? "تعذر البحث في الفواتير" : "Could not search invoices"));
            setInvoiceLookupResults([]);
          } else {
            setInvoiceLookupResults(
              (res.data.items || []).filter((item) => item.documentType !== "PROFORMA"),
            );
          }
        })
        .catch(() => {
          if (alive) {
            setInvoiceLookupError(isRTL ? "تعذر البحث في الفواتير" : "Could not search invoices");
            setInvoiceLookupResults([]);
          }
        })
        .finally(() => {
          if (alive) setInvoiceLookupLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [selectionMode, canSearchInvoices, invoiceLookupQuery, isRTL]);

  // Live backend manual VAT return calculation (falls back gracefully to client BigInt preview if endpoint is unavailable in fixture mode)
  useEffect(() => {
    if (selectionMode !== "manual" || !validBaseData) return;
    let alive = true;
    void Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setManualLoading(true);
        setManualError("");
        return accountingRequest<VatReport>("/vat-return/manual", "POST", {
          period: periodBody(period),
          invoiceIds: selectedSaleIds,
          ...(includeAllPurchases ? {} : { purchaseIds: selectedPurchaseIds }),
          includeAllPurchases,
        });
      })
      .then((res) => {
        if (!alive || !res) return;
        if (res.success && isValidVatReport(res.data)) {
          setManualData(res.data);
          setManualError("");
        } else if (res.success || res.status === 404) {
          setManualData(null);
          setManualError("");
        } else {
          setManualData(null);
          setManualError(res.error || (isRTL ? "تعذر احتساب الإقرار اليدوي" : "Could not calculate manual VAT return"));
        }
      })
      .catch(() => {
        if (alive) {
          setManualData(null);
        }
      })
      .finally(() => {
        if (alive) setManualLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectionMode, validBaseData, period, selectedSaleIds, includeAllPurchases, selectedPurchaseIds, manualReload, isRTL]);

  const activeManualData = selectionMode === "manual" && isValidVatReport(manualData) ? manualData : null;
  const visibleLookupResults = invoiceLookupQuery.trim() ? invoiceLookupResults : [];
  const visibleLookupError = invoiceLookupQuery.trim() ? invoiceLookupError : "";
  const visibleLookupLoading = Boolean(invoiceLookupQuery.trim()) && invoiceLookupLoading;

  const clientManualPreview = useMemo(() => {
    if (selectionMode !== "manual" || !validBaseData) return null;
    return computeClientManualVatReport(
      validBaseData,
      selectedSaleIds,
      includeAllPurchases ? null : selectedPurchaseIds,
      extraSales,
    );
  }, [selectionMode, validBaseData, selectedSaleIds, includeAllPurchases, selectedPurchaseIds, extraSales]);

  const rawActiveData =
    selectionMode === "manual"
      ? (activeManualData ?? clientManualPreview)
      : validBaseData;
  const activeData = isValidVatReport(rawActiveData) ? rawActiveData : null;

  const periodSalesPool = useMemo(() => {
    const byId = new Map<string, VatSale>();
    for (const row of activeManualData?.availableSales || validBaseData?.sales || []) {
      byId.set(row.id, row);
    }
    for (const row of extraSales) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    return [...byId.values()];
  }, [activeManualData, validBaseData, extraSales]);

  const filteredPeriodSales = useMemo(() => {
    const q = checklistSearch.trim().toLowerCase();
    return periodSalesPool.filter((row) => {
      if (checklistDocType && (row.documentType || "TAX") !== checklistDocType) return false;
      if (!q) return true;
      return `${row.number} ${row.customerName || ""} ${row.date}`.toLowerCase().includes(q);
    });
  }, [periodSalesPool, checklistSearch, checklistDocType]);

  const periodPurchasesPool = useMemo(
    () => activeManualData?.availablePurchases || validBaseData?.purchases || [],
    [activeManualData, validBaseData],
  );

  function addManualInvoice(row: InvoiceRow) {
    if (row.documentType === "PROFORMA") return;
    const isCredit = row.taxDocument?.kind === "CREDIT";
    const signPrefix = isCredit ? "-" : "";
    const normalizedNet = row.netAmount.startsWith("-") ? row.netAmount : `${signPrefix}${row.netAmount}`;
    const normalizedVat = row.vatAmount.startsWith("-") ? row.vatAmount : `${signPrefix}${row.vatAmount}`;
    const saleEntry: VatSale = {
      id: row.id,
      number: row.invoiceNumber,
      source: "LOCAL",
      kind: row.taxDocument?.kind || "INVOICE",
      date: invoiceRiyadhDateKey(row.invoiceDate),
      net: normalizedNet,
      vat: normalizedVat,
      isPriorPeriodAdjustment: false,
      customerName: row.customerName,
      documentType: row.documentType || "TAX",
    };
    setExtraSales((prev) => (prev.some((s) => s.id === saleEntry.id) ? prev : [saleEntry, ...prev]));
    setSelectedSaleIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
  }

  function toggleManualSale(id: string, checked: boolean) {
    setSelectedSaleIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  }

  function toggleManualPurchase(id: string, checked: boolean) {
    setSelectedPurchaseIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  }

  async function saveManualSelectionGroup() {
    if (!canEditSettings || !groupName.trim() || groupBusy) return;
    setGroupBusy(true);
    setGroupNotice("");
    setFailure("");
    try {
      const existing = savedGroups.find((g) => g.id === selectedGroupId);
      const saved = await commercialRequest<SavedSelectionOption>(
        existing ? `/selections/${existing.id}` : "/selections",
        existing ? "PUT" : "POST",
        {
          name: groupName.trim(),
          invoiceIds: selectedSaleIds,
          ...(existing ? { version: existing.version } : {}),
        },
      );
      setSavedGroups((prev) => {
        const next = prev.filter((g) => g.id !== saved.id);
        return [saved, ...next];
      });
      setSelectedGroupId(saved.id);
      setUrlGroupId(saved.id);
      setGroupNotice(isRTL ? "تم حفظ مجموعة الفواتير بنجاح." : "Invoice selection group saved.");
    } catch (e) {
      setFailure(e instanceof Error ? e.message : isRTL ? "تعذر حفظ المجموعة" : "Failed to save selection group");
    } finally {
      setGroupBusy(false);
    }
  }

  async function download(format: "pdf" | "csv") {
    setFailure("");
    setIsExporting(true);
    try {
      const periodTag =
        period.mode === "QUARTER"
          ? `${year}-Q${quarter}`
          : period.mode === "YEAR"
            ? String(year)
            : `${period.startDate || year}_${period.endDate || year}`;
      if (selectionMode === "manual") {
        await downloadManualVatReturn(
          format,
          {
            period: periodBody(period),
            invoiceIds: selectedSaleIds,
            ...(includeAllPurchases ? {} : { purchaseIds: selectedPurchaseIds }),
            includeAllPurchases,
          },
          `miqat-vat-return-manual-${periodTag}.${format}`,
          activeData,
        );
      } else {
        await downloadAccounting(
          `/exports/${format}?${periodQuery(period)}`,
          `miqat-vat-return-${periodTag}.${format}`,
        );
      }
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "تعذر التصدير؛ حاول مرة أخرى",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const isRefundable = signedMoneyMinor(activeData?.summary?.netVatDue) < BigInt(0);

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* 1. Header & Actions with On-Demand Guide */}
      <PageHeader
        title={ui(t("vat.title"))}
        subtitle={ui(t("vat.subtitle"))}
        badge={t("section.financeReview")}
        icon={Calculator}
        onRefresh={() => setReload((v) => v + 1)}
        isRefreshing={isLoading}
        helpGuide={vatHelpGuide}
        onSeeded={(msg) => {
          setFailure("");
          setSeedMessage(msg);
          setReload((v) => v + 1);
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setFailure(err);
        }}
        actions={
          <>
            <Link
              href="/admin/vat-returns/selected"
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition shadow-2xs"
            >
              <FileCheck2 className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("اختيار فواتير لتقرير مستقل")}</span>
            </Link>

            <Link
              href="/admin/purchases"
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition shadow-2xs"
            >
              <ShoppingBag className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui(t("purchases.title"))}</span>
            </Link>

            <Link
              href="/admin/invoices"
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition shadow-2xs"
            >
              <ReceiptText className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui(t("invoice.title"))}</span>
            </Link>
          </>
        }
      />

      {/* Official ZATCA Submission Notice Banner (§14.1) */}
      <div className="p-4 rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] text-[var(--text-main)] text-xs sm:text-sm leading-relaxed flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--accent-gold)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <strong className="font-semibold text-[var(--text-main)] block">
            {isRTL ? "طريقة تقديم الإقرار الضريبي الرسمي:" : "Official ZATCA Tax Return Filing:"}
          </strong>
          <p className="text-[var(--text-main)]">
            {isRTL ? (
              <>
                {ui("يتم تقديم الإقرار الضريبي رسمياً عبر بوابة هيئة الزكاة والضريبة والجمارك (")}<a
                  href="https://zatca.gov.sa"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-[var(--accent-gold)] inline-flex items-center gap-0.5"
                >
                  zatca.gov.sa
                  <ExternalLink className="size-3" />
                </a>
                {ui("). صُممت هذه الصفحة لمراجعة وتدقيق مبالغ المبيعات والمشتريات بدقة، وتتيح لك نسخ الأرقام بنقرة واحدة ولصقها في الخانة المقابلة بالبوابة.")}</>
            ) : (
              <>
                File your official tax return via the ZATCA portal (
                <a
                  href="https://zatca.gov.sa"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-[var(--accent-gold)] inline-flex items-center gap-0.5"
                >
                  zatca.gov.sa
                  <ExternalLink className="size-3" />
                </a>
                ). This page audits sales and purchases, enabling single-click copy for portal entry.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-600/35 bg-emerald-500/12 dark:border-emerald-500/35 dark:bg-emerald-950/45 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300"
        >
          {ui(seedMessage)}
        </p>
      )}
      {failure && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{ui(failure)}</span>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{ui(error)}</span>
          </div>
          <Link
            href="/admin/invoices/settings"
            className="inline-flex min-h-11 sm:min-h-9 items-center px-3 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition shrink-0"
          >
            {isRTL ? "تعديل بيانات الشركة" : "Edit Company Profile"}
          </Link>
        </div>
      )}

      {/* 2. Period Selector, Selection Mode Toggle & Export Bar (§14.2) */}
      <section className="theme-card space-y-4 rounded-2xl border theme-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AccountingPeriodSelector value={period} onChange={setPeriod} />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setReload((value) => value + 1);
                if (selectionMode === "manual") setManualReload((value) => value + 1);
              }}
              disabled={isLoading || manualLoading}
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition cursor-pointer"
              title={ui(t("common.refresh"))}
            >
              <RefreshCw
                className={`size-4 ${isLoading || manualLoading ? "animate-spin text-[var(--accent-gold)]" : ""}`}
                aria-hidden="true"
              />
              <span>{ui(t("common.refresh"))}</span>
            </button>

            <button
              type="button"
              disabled={!activeData || isLoading || isExporting}
              onClick={() => void download("csv")}
              className="theme-card inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition disabled:opacity-50 cursor-pointer"
              title="CSV"
            >
              <FileSpreadsheet className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui(t("accounting.exportCsv"))}</span>
            </button>

            <button
              type="button"
              disabled={!activeData || isLoading || isExporting}
              onClick={() => void download("pdf")}
              className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
              title="PDF"
            >
              <Download className="size-4" aria-hidden="true" />
              <span>{ui(t("common.downloadPdf"))}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t theme-border pt-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
            <SlidersHorizontal className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{isRTL ? "نطاق احتساب الفواتير:" : "Invoice Calculation Scope:"}</span>
          </div>
          <div
            role="group"
            aria-label={isRTL ? "نطاق احتساب الفواتير" : "Invoice Calculation Scope"}
            className="inline-flex flex-wrap rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] p-1 gap-1"
          >
            <button
              type="button"
              onClick={() => setSelectionMode("auto")}
              className={`min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectionMode === "auto"
                  ? "gold-gradient-btn shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              {isRTL ? "تلقائي — كافة فواتير الفترة" : "Auto — All Period Invoices"}
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode("manual")}
              className={`min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectionMode === "manual"
                  ? "gold-gradient-btn shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              {isRTL ? "يدوي — اختيار الفواتير المراد إضافتها" : "Manual — Choose Invoices to Add"}
              {selectedSaleIds.length > 0 && (
                <span className="ms-1.5 rounded-full bg-black/15 px-1.5 py-0.5 font-mono text-[11px]">
                  {selectedSaleIds.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Manual Invoice Selection Builder */}
      {selectionMode === "manual" && validBaseData && (
        <section
          aria-label={isRTL ? "الاختيار اليدوي للفواتير" : "Manual Invoice Selection"}
          className="theme-card rounded-2xl border border-[var(--accent-gold)]/45 p-4 sm:p-5 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b theme-border pb-3.5">
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                {isRTL ? "اختيار الفواتير يدويًا لحساب الإقرار" : "Manually Choose Invoices for VAT Return"}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {isRTL
                  ? "أضف الفواتير التي تريد إدراجها فقط من قائمة الفترة أو ابحث برقم الفاتورة أو العميل. تنعكس الخانات (1–16) والتصدير فورًا."
                  : "Pick only the invoices you want to include from this period or search by number/customer. Boxes 1–16 and exports update immediately."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 px-3 py-1 text-[var(--accent-gold)] font-mono">
                {isRTL ? `المختارة: ${selectedSaleIds.length}` : `Selected: ${selectedSaleIds.length}`}
              </span>
              {manualLoading && (
                <span className="text-[var(--text-muted)]">
                  {isRTL ? "جارٍ التحديث…" : "Updating…"}
                </span>
              )}
            </div>
          </div>

          {manualError && (
            <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}

          {groupNotice && (
            <p role="status" className="p-3 rounded-xl border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              {groupNotice}
            </p>
          )}

          {/* Search & Add Any Invoice by Number / Customer */}
          {canSearchInvoices && (
            <div className="rounded-xl bg-[var(--bg-card-subtle)] border theme-border p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Search className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{isRTL ? "ابحث وأضف فاتورة محددة (من أي فترة):" : "Search & Add Specific Invoice (Any Period):"}</span>
                </label>
                {invoiceLookupQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceLookupQuery("");
                      setInvoiceLookupResults([]);
                    }}
                    className="min-h-11 sm:min-h-8 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] px-2 cursor-pointer"
                  >
                    {isRTL ? "مسح البحث" : "Clear search"}
                  </button>
                )}
              </div>
              <input
                type="search"
                value={invoiceLookupQuery}
                onChange={(e) => setInvoiceLookupQuery(e.target.value)}
                placeholder={isRTL ? "اكتب رقم الفاتورة (مثل TAX-00012) أو اسم العميل…" : "Type invoice number (e.g. TAX-00012) or customer name…"}
                className="theme-input min-h-11 w-full rounded-xl px-3.5 py-2 text-sm"
              />
              {visibleLookupError && (
                <p role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-300">{visibleLookupError}</p>
              )}
              {visibleLookupLoading && (
                <p className="text-xs text-[var(--text-muted)]">{isRTL ? "جارٍ البحث عن الفواتير…" : "Searching invoices…"}</p>
              )}
              {visibleLookupResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto divide-y theme-border rounded-xl border theme-border bg-[var(--bg-card)]">
                  {visibleLookupResults.map((row) => {
                    const isAdded = selectedSaleIds.includes(row.id);
                    return (
                      <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="font-mono text-[var(--text-main)]" dir="ltr">{row.invoiceNumber}</b>
                            <span className="rounded-md bg-[var(--bg-card-subtle)] border theme-border px-1.5 py-0.5 text-[11px] font-bold">
                              {row.documentType || "TAX"}
                            </span>
                            <span className="text-[var(--text-muted)]">{invoiceRiyadhDateKey(row.invoiceDate)}</span>
                          </div>
                          <p className="text-[var(--text-muted)] truncate mt-0.5">{row.customerName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--accent-gold)]" dir="ltr">
                            {row.vatAmount} SAR
                          </span>
                          {isAdded ? (
                            <button
                              type="button"
                              onClick={() => toggleManualSale(row.id, false)}
                              className="min-h-11 sm:min-h-9 inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                              <span>{isRTL ? "إزالة" : "Remove"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addManualInvoice(row)}
                              className="gold-gradient-btn min-h-11 sm:min-h-9 inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold cursor-pointer"
                            >
                              <Plus className="size-3.5" aria-hidden="true" />
                              <span>{isRTL ? "إضافة للإقرار" : "Add to Return"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!visibleLookupLoading && invoiceLookupQuery.trim().length > 0 && visibleLookupResults.length === 0 && !visibleLookupError && (
                <p className="text-xs text-[var(--text-muted)]">
                  {isRTL ? "لا توجد فواتير مطابقة للبحث (تُستبعد الفواتير المبدئية)." : "No matching invoices found (proforma invoices are excluded)."}
                </p>
              )}
            </div>
          )}

          {/* Period Sales Checklist & Saved Groups */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={checklistSearch}
                  onChange={(e) => setChecklistSearch(e.target.value)}
                  placeholder={isRTL ? "تصفية فواتير الفترة…" : "Filter period invoices…"}
                  className="theme-input min-h-11 sm:min-h-9 flex-1 min-w-44 rounded-lg px-3 py-1.5 text-xs"
                />
                <select
                  aria-label={isRTL ? "نوع الفاتورة" : "Invoice document type"}
                  value={checklistDocType}
                  onChange={(e) => setChecklistDocType(e.target.value as "" | "TAX" | "BOOKING")}
                  className="theme-input min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold"
                >
                  <option value="">{isRTL ? "كل الأنواع" : "All types"}</option>
                  <option value="TAX">{isRTL ? "ضريبية (TAX)" : "Tax Invoices"}</option>
                  <option value="BOOKING">{isRTL ? "فواتير حجز (BOOKING)" : "Booking Invoices"}</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSaleIds((prev) => [...new Set([...prev, ...filteredPeriodSales.map((s) => s.id)])])}
                  className="theme-card min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1 text-xs font-bold text-[var(--text-main)] cursor-pointer"
                >
                  {isRTL ? "إضافة كل النتائج" : "Add All Filtered"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSaleIds((prev) => [
                      ...new Set([
                        ...prev,
                        ...periodSalesPool.filter((s) => (s.documentType || "TAX") === "TAX").map((s) => s.id),
                      ]),
                    ])
                  }
                  className="theme-card min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1 text-xs font-bold text-[var(--text-main)] cursor-pointer"
                >
                  {isRTL ? "إضافة الضريبية فقط" : "Add TAX Only"}
                </button>
                <button
                  type="button"
                  disabled={selectedSaleIds.length === 0}
                  onClick={() => setSelectedSaleIds([])}
                  className="theme-card min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] hover:border-rose-500/50 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 disabled:opacity-45 cursor-pointer"
                >
                  {isRTL ? "مسح كل المبيعات المختارة" : "Clear All Selected"}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y theme-border rounded-xl border theme-border bg-[var(--bg-card)]">
                {filteredPeriodSales.map((row) => {
                  const checked = selectedSaleIds.includes(row.id);
                  return (
                    <label
                      key={`${row.source}-${row.id}`}
                      className={`flex flex-wrap items-center gap-3 min-h-11 px-3 py-2.5 text-xs cursor-pointer transition ${
                        checked ? "bg-[var(--accent-surface)]/55" : "hover:bg-[var(--table-row-hover)]"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={(e) => toggleManualSale(row.id, e.target.checked)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <b className="font-mono text-[var(--text-main)]" dir="ltr">{row.number}</b>
                          <span className="rounded bg-[var(--bg-card-subtle)] border theme-border px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                            {row.kind === "CREDIT" ? (isRTL ? "إشعار دائن" : "Credit") : row.kind === "DEBIT" ? (isRTL ? "إشعار مدين" : "Debit") : (row.documentType || "TAX")}
                          </span>
                          <span className="text-[var(--text-muted)]" dir="ltr">{row.date}</span>
                        </span>
                        {row.customerName && (
                          <span className="block text-[var(--text-muted)] truncate mt-0.5">{row.customerName}</span>
                        )}
                      </span>
                      <span className="font-mono text-end" dir="ltr">
                        <span className="block font-bold text-[var(--accent-gold)]">{row.vat} SAR VAT</span>
                        <span className="block text-[11px] text-[var(--text-muted)]">{row.net} net</span>
                      </span>
                    </label>
                  );
                })}
                {filteredPeriodSales.length === 0 && (
                  <p className="p-6 text-center text-xs text-[var(--text-muted)]">
                    {isRTL
                      ? "لا توجد فواتير مبيعات مطابقة في هذه الفترة. استخدم البحث أعلاه لإضافة أي فاتورة."
                      : "No matching sales invoices in this period. Use the search bar above to add any invoice."}
                  </p>
                )}
              </div>
            </div>

            {/* Right column: Saved Groups + Purchases Control */}
            <div className="space-y-4">
              <div className="rounded-xl bg-[var(--bg-card-subtle)] border theme-border p-3.5 space-y-2.5">
                <h3 className="text-xs font-semibold text-[var(--text-main)]">
                  {isRTL ? "مجموعات الاختيار المحفوظة" : "Saved Selection Groups"}
                </h3>
                <select
                  aria-label={isRTL ? "تحميل مجموعة محفوظة" : "Load saved selection group"}
                  value={selectedGroupId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedGroupId(id);
                    setUrlGroupId(id);
                    const found = savedGroups.find((g) => g.id === id);
                    if (found) {
                      setGroupName(found.name);
                      setSelectedSaleIds(found.invoiceIds);
                    } else {
                      setGroupName("");
                    }
                  }}
                  className="theme-input min-h-11 sm:min-h-9 w-full rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="">{isRTL ? "— اختر مجموعة محفوظة —" : "— Load saved group —"}</option>
                  {savedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.invoiceIds.length})
                    </option>
                  ))}
                </select>
                {canEditSettings && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder={isRTL ? "اسم المجموعة للحفظ…" : "Group name to save…"}
                      className="theme-input min-h-11 sm:min-h-9 w-full rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={groupBusy || !groupName.trim()}
                      onClick={() => void saveManualSelectionGroup()}
                      className="theme-card inline-flex min-h-11 sm:min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--control-border)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] disabled:opacity-45 cursor-pointer"
                    >
                      <Save className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                      <span>{selectedGroupId ? (isRTL ? "تحديث المجموعة" : "Update Group") : (isRTL ? "حفظ كمجموعة" : "Save Selection Group")}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-[var(--bg-card-subtle)] border theme-border p-3.5 space-y-2.5">
                <h3 className="text-xs font-semibold text-[var(--text-main)]">
                  {isRTL ? "فواتير المشتريات الداخلة في الإقرار" : "Input Purchases Included"}
                </h3>
                <label className="flex items-center gap-2 min-h-11 sm:min-h-9 text-xs font-bold cursor-pointer">
                  <Checkbox
                    checked={includeAllPurchases}
                    onChange={(e) => {
                      const nextAll = e.target.checked;
                      setIncludeAllPurchases(nextAll);
                      if (!nextAll && selectedPurchaseIds.length === 0) {
                        setSelectedPurchaseIds(periodPurchasesPool.map((p) => p.id));
                      }
                    }}
                  />
                  <span>{isRTL ? `تضمين كافة مشتريات الفترة (${periodPurchasesPool.length})` : `Include all period purchases (${periodPurchasesPool.length})`}</span>
                </label>

                {!includeAllPurchases && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPurchaseIds(periodPurchasesPool.map((p) => p.id))}
                        className="min-h-11 sm:min-h-8 rounded border theme-border px-2 py-0.5 text-[11px] font-bold cursor-pointer"
                      >
                        {isRTL ? "تحديد الكل" : "All"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPurchaseIds([])}
                        className="min-h-11 sm:min-h-8 rounded border theme-border px-2 py-0.5 text-[11px] font-bold cursor-pointer"
                      >
                        {isRTL ? "استبعاد الكل" : "None"}
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y theme-border rounded-lg border theme-border bg-[var(--bg-card)]">
                      {periodPurchasesPool.map((p) => (
                        <label key={p.id} className="flex items-center justify-between gap-2 min-h-11 px-2.5 py-1.5 text-[11px] cursor-pointer">
                          <span className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={selectedPurchaseIds.includes(p.id)}
                              onChange={(e) => toggleManualPurchase(p.id, e.target.checked)}
                            />
                            <span className="truncate font-bold">{p.supplierName}</span>
                          </span>
                          <span className="font-mono text-emerald-700 dark:text-emerald-300 shrink-0" dir="ltr">
                            {p.recoverableVat} SAR
                          </span>
                        </label>
                      ))}
                      {periodPurchasesPool.length === 0 && (
                        <p className="p-3 text-center text-[11px] text-[var(--text-muted)]">
                          {isRTL ? "لا توجد مشتريات في الفترة" : "No purchases in period"}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {period.mode !== "QUARTER" && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-900 dark:text-sky-200 text-xs font-bold">
          {ui("ملاحظة: هذا العرض مخصص للتحليل الإحصائي للفترة المحددة. لتقديم الإقرار الفعلي للهيئة، اختر الربع الضريبي (Q1–Q4).")}</div>
      )}

      {isLoading && (
        <div
          role="status"
          className="theme-card space-y-4 rounded-2xl p-8 border theme-border"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)]">
            <div className="size-5 border-2 border-[var(--accent-gold)]/25 border-t-[var(--accent-gold)] rounded-full animate-spin" />
            <span>{ui("جارٍ حساب خانات الإقرار ومطابقة القيود…")}</span>
          </div>
        </div>
      )}

      {activeData && (
        <>
          {/* Company & Due Date Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-4 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border">
            <div>
              <p className="font-semibold text-[var(--text-main)] text-sm">
                {activeData.company?.legalName || ""}
              </p>
              <p className="text-[var(--text-muted)] mt-0.5 font-mono">
                {ui("الرقم الضريبي:")}{" "}
                <bdi dir="ltr" className="font-bold text-[var(--text-main)]">
                  {activeData.company?.vatNumber || ""}
                </bdi>
              </p>
            </div>
            <div className="text-end">
              <span className="text-[var(--text-muted)] block">{ui("الفترة الضريبية:")}</span>
              <p className="font-mono font-bold text-[var(--text-main)]">
                <bdi dir="ltr">{activeData.period?.start || ""}</bdi> {ui("إلى")}{" "}
                <bdi dir="ltr">{vatPeriodEnd(activeData.period)}</bdi>
              </p>
              {activeData.period?.dueDate && (
                <p className="text-[var(--accent-gold)] font-bold mt-0.5">
                  {ui("آخر موعد اعتيادي للسداد:")}{" "}
                  <bdi dir="ltr" className="font-mono">{activeData.period.dueDate}</bdi>
                </p>
              )}
            </div>
          </div>

          {/* 3. KPI Summary Ribbon (§14.3) */}
          <section
            className="grid grid-cols-2 lg:grid-cols-5 gap-3"
            aria-label={ui("ملخص الأرقام الحاسم")}
          >
            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-[var(--text-muted)] block">
                {ui("إجمالي صافي المبيعات")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-[var(--text-main)]"
                dir="ltr"
              >
                {amountLabel(activeData.summary?.netSales ?? "0.00")}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س (غير شامل الضريبة)")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-[var(--accent-gold)] block">
                {ui("ضريبة المبيعات (خ6)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-[var(--accent-gold)]"
                dir="ltr"
              >
                {amountLabel(activeData.summary?.outputVat ?? "0.00")}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س ضريبة مخرجات")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-[var(--text-muted)] block">
                {ui("إجمالي المشتريات الداخلة في الإقرار")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-[var(--text-main)]"
                dir="ltr"
              >
                {amountLabel(activeData.summary?.netPurchases ?? "0.00")}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س تكاليف الأسطول")}</span>
            </div>

            <div className="theme-card rounded-2xl border theme-border p-4 sm:p-5">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">
                {ui("ضريبة قابلة للخصم (خ12)")}</span>
              <p
                className="mt-2 font-mono text-lg sm:text-xl font-semibold text-emerald-700 dark:text-emerald-300"
                dir="ltr"
              >
                {amountLabel(activeData.summary?.recoverableInputVat ?? "0.00")}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("ر.س ضريبة مدخلات")}</span>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 col-span-2 lg:col-span-1 ${
                isRefundable
                  ? "bg-emerald-500/12 border-emerald-600/45 text-[var(--text-main)] dark:bg-emerald-950/45 dark:border-emerald-500/45"
                  : "bg-slate-900 dark:bg-slate-800/95 text-white border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold block ${isRefundable ? "text-[var(--text-main)]" : "text-slate-200"}`}>
                  {ui(isRefundable
                    ? "رصيد دائن لصالح المنشأة (خ16)"
                    : "صافي الضريبة المستحقة (خ16)")}
                </span>
                {isRefundable ? (
                  <TrendingDown className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                ) : (
                  <TrendingUp className="size-4 text-amber-300" aria-hidden="true" />
                )}
              </div>
              <p
                className={`mt-2 font-mono text-xl sm:text-2xl font-semibold ${isRefundable ? "text-emerald-800 dark:text-emerald-300" : "text-amber-300"}`}
                dir="ltr"
              >
                {amountLabel(activeData.summary?.netVatDue ?? "0.00")}
              </p>
              <span className={`text-xs ${isRefundable ? "text-[var(--text-muted)]" : "text-slate-300"}`}>
                {ui(isRefundable
                  ? "يخضع الاسترداد أو الترحيل للإجراء المناسب لدى الهيئة"
                  : "واجب السداد لهيئة الزكاة")}
              </span>
            </div>
          </section>

          {/* 4. Table 1–16 Boxes with clean copy buttons (§14.4) */}
          <VatReturnTable rows={activeData.rows || []} domesticPurchasesOnly={activeData.coverage?.domesticPurchasesOnly ?? true} />

          {/* 5. Previous Balances & Settlement Settings (§14.6) */}
          {period.mode === "QUARTER" && activeData.settings && (
            <ReturnSettings
              key={`${year}-${quarter}-${activeData.settings.version ?? 0}`}
              year={year}
              quarter={quarter}
              value={activeData.settings}
              canEdit={canEditSettings}
              onSaved={() => {
                setReload((value) => value + 1);
                setManualReload((value) => value + 1);
              }}
            />
          )}

          {/* 6. Matching & Audit Checklist (§14.5) */}
          <section className="theme-card rounded-2xl border theme-border p-5 space-y-4">
            <div className="flex items-center gap-2 border-b theme-border pb-3">
              <FileCheck2 className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                {ui("مطابقة وفحص القيود المسجلة")}</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-[var(--text-muted)] block mb-1">
                  {ui("إجمالي مشتريات الأسطول:")}</span>
                <strong className="font-mono font-bold text-sm text-[var(--text-main)]">
                  <bdi dir="ltr">{amountLabel(activeData.summary?.netPurchases ?? "0.00")}</bdi> {ui("ر.س")}
                </strong>
                <span className="text-xs text-[var(--text-muted)] block mt-1">
                  {ui("ضريبة مسجلة:")}{" "}
                  <bdi dir="ltr">{amountLabel(activeData.summary?.recordedInputVat ?? "0.00")}</bdi> {ui("ر.س")}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-[var(--text-muted)] block mb-1">
                  {ui("الضريبة غير القابلة للخصم:")}</span>
                <strong className="font-mono font-bold text-sm text-[var(--text-main)]">
                  <bdi dir="ltr">{amountLabel(activeData.summary?.nonRecoverableInputVat ?? "0.00")}</bdi> {ui("ر.س")}
                </strong>
                <span className="text-xs text-[var(--text-muted)] block mt-1">
                  {ui("تُضاف تلقائياً إلى تكلفة المصروف")}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                <span className="text-[var(--text-muted)] block mb-1">
                  {ui("فواتير مبدئية مستبعدة:")}</span>
                <strong className="font-mono font-bold text-sm text-[var(--text-main)]">
                  {activeData.coverage?.proformaCount ?? 0} {ui("فاتورة")}
                </strong>
                <span className="text-xs text-[var(--text-muted)] block mt-1">
                  {ui("عروض أسعار لا تدخل في الإقرار")}</span>
              </div>
            </div>

            {/* Warnings list if any */}
            {(activeData.warnings || []).length > 0 ? (
              <div className="p-4 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-xs text-[var(--text-main)] space-y-1.5">
                <strong className="font-semibold block text-[var(--accent-gold)]">
                  {ui("ملاحظات التحقق من القيود:")}</strong>
                {(activeData.warnings || []).map((w, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/12 border border-emerald-600/35 text-xs font-bold text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  {ui("لا توجد تنبيهات حسابية في هذا التقرير. راجع المستندات ونطاق التغطية قبل التقديم.")}</span>
              </div>
            )}

            {/* 7. Document Drill-down (§14.7) */}
            <details className="mt-4 border-t theme-border pt-4">
              <summary className="min-h-11 flex items-center cursor-pointer text-xs font-bold text-[var(--accent-gold)] hover:underline">
                {ui("عرض المستندات المؤيدة للإقرار (فواتير المبيعات:")}{" "}
                {(activeData.sales || []).length} {ui("· فواتير المشتريات:")} {(activeData.purchases || []).length})
              </summary>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto text-xs divide-y theme-border">
                {(activeData.sales || []).map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5"
                    key={`${row.source}-${row.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        className="font-mono font-semibold text-[var(--accent-gold)] hover:underline"
                        href={`/admin/invoices/${row.id}`}
                      >
                        <bdi>{row.number}</bdi>
                      </Link>
                      <span className="text-[var(--text-muted)]">
                        {ui({
                          CREDIT: "إشعار دائن (تخفيض)",
                          DEBIT: "إشعار مدين (إضافة)",
                          INVOICE: "فاتورة مبيعات",
                        }[row.kind] || row.kind)}
                      </span>
                    </div>
                    <p className="font-mono text-[var(--text-main)]">
                      <bdi dir="ltr">{row.date}</bdi> {ui("· الصافي:")}{" "}
                      <strong dir="ltr">{row.net}</strong> {ui("· الضريبة:")}{" "}
                      <strong dir="ltr">{row.vat}</strong> {ui("ر.س")}
                    </p>
                  </div>
                ))}

                {(activeData.purchases || []).map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5"
                    key={row.id}
                  >
                    <p className="font-bold text-[var(--text-main)]">
                      {row.supplierName} ·{" "}
                      <span className="font-mono text-[var(--text-muted)]">
                        {row.invoiceNumber}
                      </span>
                    </p>
                    <p className="font-mono text-[var(--text-main)]">
                      {ui("الصافي:")} <strong dir="ltr">{row.netAmount}</strong>{" "}
                      {ui("· ضريبة قابلة للخصم:")}{" "}
                      <strong dir="ltr" className="text-emerald-700 dark:text-emerald-300">
                        {row.recoverableVat}
                      </strong>{" "}
                      {ui("ر.س")}
                    </p>
                  </div>
                ))}

                {(activeData.sales || []).length + (activeData.purchases || []).length === 0 && (
                  <p className="py-4 text-center text-[var(--text-muted)]">
                    {ui("لا توجد مستندات مسجلة ضمن هذه الفترة.")}</p>
                )}
              </div>
            </details>
          </section>

          {/* Footer note & link */}
          <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)] pt-2">
            <p>
              {ui("آخر احتساب:")}{" "}
              {activeData.generatedAt
                ? new Date(activeData.generatedAt).toLocaleString(ui.locale, {
                    calendar: "gregory",
                    timeZone: "Asia/Riyadh",
                  })
                : "—"}
            </p>
            <a
              href="https://zatca.gov.sa/en/eServices/UserManual/Pages/UserManual-009.aspx"
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 text-[var(--accent-gold)] font-bold"
            >
              <span>{ui("دليل هيئة الزكاة لتقديم الإقرار الإلكتروني")}</span>
              <ExternalLink className="size-3" />
            </a>
          </footer>
        </>
      )}
    </div>
  );
}
