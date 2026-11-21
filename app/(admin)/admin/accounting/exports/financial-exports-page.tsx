"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileCode2,
  FileDown,
  FileSpreadsheet,
  Layers,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { getVehicles } from "@/app/_actions/fleet";
import AccountingPeriodSelector from "@/app/_components/AccountingPeriodSelector";
import { PageHeader } from "@/app/_components/ui";
import {
  amountLabel,
  currentSaudiPeriod,
  filterCashBankAccounts,
  reportPeriodSlug,
  type Account,
} from "@/lib/accounting";
import { useAuth } from "@/lib/authContext";
import {
  allowedExportSections,
  buildPeriodShortcut,
  countActiveAdvancedFilters,
  DEFAULT_EXPORT_FILTERS,
  downloadFinancialExport,
  EXPORT_PRESETS,
  EXPORT_SECTION_META,
  previewFinancialExport,
  resolvePresetSections,
  serializeReportPeriod,
  type ExportFormat,
  type ExportLanguage,
  type ExportSectionId,
  type FinancialExportFilters,
  type FinancialExportPreviewResponse,
} from "@/lib/financial-exports";
import { useLanguage } from "@/lib/languageContext";
import { moneyMinor } from "@/lib/money";
import type { Vehicle } from "@/lib/types";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { useReportPeriod } from "@/lib/use-report-period";
import { useUrlState } from "@/lib/use-url-state";
import { ExportFiltersPanel } from "./export-filters-panel";
import { ExportPreviewTabs } from "./export-preview-tabs";

interface PreviewState {
  key: string;
  data: FinancialExportPreviewResponse | null;
  error: string | null;
}

export default function FinancialExportsPage() {
  const { t, dir, isRTL } = useLanguage();
  const isEn = !isRTL;
  const l = (ar: string, en: string) => (isEn ? en : ar);

  const { user } = useAuth();
  const [period, setPeriod] = useReportPeriod();
  const [search, setSearch] = useUrlState<string>("q", "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const authorizedSections = useMemo(
    () => allowedExportSections(user),
    [user],
  );

  const [selectedOverride, setSelectedOverride] = useState<
    ExportSectionId[] | null
  >(null);
  const selectedSections = useMemo(() => {
    const allowedSet = new Set(authorizedSections);
    if (selectedOverride !== null) {
      return selectedOverride.filter((id) => allowedSet.has(id));
    }
    return [...authorizedSections];
  }, [selectedOverride, authorizedSections]);

  const [filters, setFilters] = useState<FinancialExportFilters>(
    DEFAULT_EXPORT_FILTERS,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<ExportSectionId>("INVOICES");
  const [exportLang, setExportLang] = useState<ExportLanguage>(
    isEn ? "en" : "ar",
  );
  const [reloadCount, setReloadCount] = useState(0);
  const [downloadingFormat, setDownloadingFormat] =
    useState<ExportFormat | null>(null);
  const [exportNotice, setExportNotice] = useState("");
  const [exportError, setExportError] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const accountsQuery = useAccountingQuery<{ items: Account[] }>(
    "/accounts",
    reloadCount,
  );
  const allAccounts = useMemo(
    () =>
      [...(accountsQuery.data?.items ?? [])].sort((a, b) =>
        a.code.localeCompare(b.code, "en"),
      ),
    [accountsQuery.data?.items],
  );
  const cashAccounts = useMemo(
    () => filterCashBankAccounts(allAccounts),
    [allAccounts],
  );

  useEffect(() => {
    let active = true;
    void getVehicles().then((res) => {
      if (active && res.vehicles) {
        setVehicles(res.vehicles);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const effectiveFilters = useMemo<FinancialExportFilters>(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  const amountRangeError = useMemo(() => {
    const minStr = effectiveFilters.minAmount.trim();
    const maxStr = effectiveFilters.maxAmount.trim();
    if (!minStr && !maxStr) return "";
    const minVal = minStr ? moneyMinor(minStr) : BigInt(0);
    const maxVal = maxStr ? moneyMinor(maxStr) : null;
    if ((minStr && minVal === null) || (maxStr && maxVal === null)) {
      return isEn
        ? "Enter valid decimal amounts (e.g. 100.00)"
        : "أدخل قيماً مالية صحيحة بدقتين عشريتين (مثال: 100.00)";
    }
    if (
      minStr &&
      maxStr &&
      minVal !== null &&
      maxVal !== null &&
      minVal > maxVal
    ) {
      return isEn
        ? "Minimum amount cannot exceed maximum amount"
        : "الحد الأدنى للمبلغ يجب أن لا يتجاوز الحد الأقصى";
    }
    return "";
  }, [effectiveFilters.minAmount, effectiveFilters.maxAmount, isEn]);

  const serializedPeriod = useMemo(
    () => serializeReportPeriod(period),
    [period],
  );

  const requestKey =
    selectedSections.length > 0 && !amountRangeError
      ? JSON.stringify({
          period: serializedPeriod,
          sections: selectedSections,
          filters: effectiveFilters,
          reloadCount,
        })
      : "";

  const [previewState, setPreviewState] = useState<PreviewState>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    const payload = {
      period: serializedPeriod,
      sections: selectedSections,
      filters: effectiveFilters,
    };

    void previewFinancialExport(payload).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setPreviewState({ key: requestKey, data: res.data, error: null });
      } else {
        setPreviewState((prev) => ({
          key: requestKey,
          data: prev.data,
          error:
            res.error ||
            (isEn
              ? "Failed to load financial preview"
              : "تعذر تحميل المعاينة المالية"),
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [requestKey, serializedPeriod, selectedSections, effectiveFilters, isEn]);

  const isPreviewLoading =
    Boolean(requestKey) && previewState.key !== requestKey;
  const activeAdvancedCount = countActiveAdvancedFilters(filters);
  const filtersPanelOpen = showFilters || activeAdvancedCount > 0;
  const todaySaudi = currentSaudiPeriod().day;

  function patchFilters(patch: Partial<FinancialExportFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function resetAllFilters() {
    setFilters(DEFAULT_EXPORT_FILTERS);
    setSearch("");
    setDebouncedSearch("");
  }

  function toggleSection(id: ExportSectionId) {
    setExportError("");
    setExportNotice("");
    const exists = selectedSections.includes(id);
    const next = exists
      ? selectedSections.filter((s) => s !== id)
      : [...selectedSections, id];
    setSelectedOverride(next);
    if (!exists) {
      setActiveTab(id);
    }
  }

  async function handleExport(format: ExportFormat) {
    if (selectedSections.length === 0 || amountRangeError || downloadingFormat) {
      return;
    }
    setDownloadingFormat(format);
    setExportError("");
    setExportNotice("");
    try {
      const slug = reportPeriodSlug(period);
      const filename = `miqat-financial-export-${slug}.${format}`;
      await downloadFinancialExport(
        {
          period: serializedPeriod,
          sections: selectedSections,
          filters: effectiveFilters,
          format,
          language: exportLang,
        },
        filename,
      );
      setExportNotice(
        l(
          `تم تصدير الملف بنجاح (${filename})`,
          `Exported ${filename} successfully`,
        ),
      );
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : l("تعذر تصدير الملف المالي", "Export failed"),
      );
    } finally {
      setDownloadingFormat(null);
    }
  }

  const availablePresets = useMemo(
    () =>
      EXPORT_PRESETS.filter(
        (preset) => resolvePresetSections(preset, authorizedSections).length > 0,
      ),
    [authorizedSections],
  );

  const helpGuide = useMemo(() => {
    const tr = (ar: string, en: string) => (isEn ? en : ar);
    return {
      title: tr(
        "دليل مركز التصدير المالي الموحد",
        "Unified Financial Exports Center Guide",
      ),
      summary: tr(
        "شاشة واحدة لتصدير ومراجعة كافة الفواتير والمشتريات وسندات القبض والصرف والقيود وميزان المراجعة وربحية المركبات والإقرار الضريبي بفلاتر متقدمة.",
        "One hub to filter, preview, and export invoices, purchases, payments, journals, P&L, trial balance, vehicle profitability, accounts, and VAT return.",
      ),
      cards: [
        {
          title: tr("١. الحزم الجاهزة والأقسام", "1. Presets & Section Selection"),
          badge: "9 Datasets",
          items: [
            {
              label: tr("ملف المراجعة الشامل", "Complete Audit Pack"),
              description: tr(
                "يحدد جميع الأقسام المالية التسعة المصرح لك بعرضها دفعة واحدة.",
                "Selects all 9 authorized financial datasets at once.",
              ),
            },
            {
              label: tr("تصدير مخصص", "Custom Selection"),
              description: tr(
                "فعّل أو عطّل أي قسم مالي ليُضمّن في نفس ملف PDF أو Excel CSV أو JSON.",
                "Toggle individual datasets to bundle them into one CSV, A4 PDF, or JSON package.",
              ),
            },
          ],
        },
        {
          title: tr("٢. الفلاتر المتقدمة", "2. Advanced Filters"),
          badge: tr("مطابقة لحظية", "Live Preview"),
          items: [
            {
              label: tr("فلاتر مخصصة لكل كيان", "Entity-Specific Filters"),
              description: tr(
                "تصفية بحالة السداد (مدفوع/جزئي/آجل)، تصنيف المصروف، رقم اللوحة، الحساب النقدي، أو نطاق المبالغ.",
                "Filter by payment status, expense category, vehicle plate, GL/cash account, or min/max amount.",
              ),
            },
          ],
        },
      ],
      tip: tr(
        "يمكنك التبديل بين لغة التصدير (العربية أو الإنجليزية) قبل تنزيل PDF أو CSV دون تغيير لغة الواجهة الحالية.",
        "Switch Export Language between Arabic and English before downloading PDF or CSV without changing your current UI language.",
      ),
    };
  }, [isEn]);

  const previewData = previewState.data;

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      <PageHeader
        title={l("مركز التصدير المالي الموحد", "Financial Exports Center")}
        subtitle={l(
          "تصفية متقدمة ومعاينة حية وتصدير كافة التقارير والفواتير والمصروفات والقيود في صفحة واحدة",
          "Filter, preview, and export all invoices, purchases, payments, journals, VAT & profitability in one place",
        )}
        badge={t("section.financeReview")}
        icon={FileDown}
        onRefresh={() => setReloadCount((v) => v + 1)}
        isRefreshing={isPreviewLoading}
        helpGuide={helpGuide}
      />

      {/* 1. One-Click Bundles / Presets */}
      <section
        aria-label={l("حزم التصدير الجاهزة", "Quick export presets")}
        className="space-y-2.5"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
          <Layers className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
          <span>{l("حزم تصدير جاهزة بنقرة واحدة:", "One-Click Export Bundles:")}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {availablePresets.map((preset) => {
            const presetSecs = resolvePresetSections(preset, authorizedSections);
            const isExactActive =
              presetSecs.length === selectedSections.length &&
              presetSecs.every((id) => selectedSections.includes(id));
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isExactActive}
                onClick={() => {
                  setSelectedOverride(presetSecs);
                  if (presetSecs[0]) setActiveTab(presetSecs[0]);
                }}
                className={`min-h-11 rounded-2xl border p-3.5 text-start transition cursor-pointer ${
                  isExactActive
                    ? "bg-[var(--accent-surface)] border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/35"
                    : "theme-card theme-border hover:border-[var(--accent-gold)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                    {isEn ? preset.en : preset.ar}
                  </strong>
                  <span className="rounded-full bg-[var(--bg-card-subtle)] border theme-border px-2 py-0.5 text-[11px] font-mono text-[var(--accent-gold)]">
                    {presetSecs.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {isEn ? preset.descriptionEn : preset.descriptionAr}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Period, Search & Advanced Filters */}
      <section className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <AccountingPeriodSelector value={period} onChange={setPeriod} />
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["THIS_MONTH", l("هذا الشهر", "This Month")],
                  ["THIS_QUARTER", l("هذا الربع", "This Quarter")],
                  ["THIS_YEAR", l("هذا العام", "This Year")],
                ] as const
              ).map(([presetKey, label]) => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() =>
                    setPeriod(buildPeriodShortcut(presetKey, todaySaudi))
                  }
                  className="min-h-8 rounded-full border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-3 py-1 text-[11px] font-bold text-[var(--text-main)] transition cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px] justify-end">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                maxLength={200}
                aria-label={l(
                  "بحث شامل في الفواتير والموردين والقيود",
                  "Global search across financial data",
                )}
                placeholder={l(
                  "بحث برقم الفاتورة، العميل، المورد، اللوحة أو القيد...",
                  "Search invoice #, customer, supplier, plate or JE...",
                )}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="theme-input min-h-11 sm:min-h-9 w-full rounded-lg ps-9 pe-3 py-1.5 text-base sm:text-[0.8125rem]"
              />
            </div>

            <button
              type="button"
              aria-expanded={filtersPanelOpen}
              onClick={() => setShowFilters((v) => !v)}
              className={`min-h-11 sm:min-h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                filtersPanelOpen || activeAdvancedCount > 0
                  ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                  : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
              }`}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              <span>{l("فلاتر متقدمة", "Advanced filters")}</span>
              {activeAdvancedCount > 0 && (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--accent-btn-bg)] text-[11px] font-bold text-[var(--accent-btn-fg)]">
                  {activeAdvancedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <ExportFiltersPanel
          open={filtersPanelOpen}
          filters={filters}
          onChange={patchFilters}
          onReset={resetAllFilters}
          activeCount={activeAdvancedCount}
          cashAccounts={cashAccounts}
          allAccounts={allAccounts}
          vehicles={vehicles}
          amountRangeError={amountRangeError}
          isEn={isEn}
        />
      </section>

      {/* 3. Dataset Selection Grid + Export Action Bar */}
      <div className="grid gap-4 xl:grid-cols-12 items-start">
        <section
          aria-label={l("اختيار الأقسام للتصدير", "Datasets to export")}
          className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-3 xl:col-span-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                {l("الأقسام المضمنة في التصدير", "Datasets Included in Export")}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {l(
                  `محدد ${selectedSections.length} من أصل ${authorizedSections.length} أقسام متاحة`,
                  `${selectedSections.length} of ${authorizedSections.length} authorized sections selected`,
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedOverride([...authorizedSections])}
                className="min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-2.5 py-1 text-xs font-bold text-[var(--text-main)] cursor-pointer"
              >
                {l("تحديد الكل", "Select all")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOverride([])}
                className="min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-rose-500 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
              >
                {l("إلغاء الكل", "Clear")}
              </button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {authorizedSections.map((id) => {
              const selected = selectedSections.includes(id);
              const meta = EXPORT_SECTION_META[id];
              const secStats = previewData?.sections[id];
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSection(id)}
                  className={`min-h-11 rounded-xl border p-3 text-start transition cursor-pointer flex items-start justify-between gap-2 ${
                    selected
                      ? "border-[var(--accent-gold)] bg-[var(--accent-surface)]/55 text-[var(--text-main)]"
                      : "theme-card border-[var(--control-border)] text-[var(--text-muted)] hover:border-[var(--accent-gold)]"
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex size-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          selected
                            ? "border-[var(--accent-gold)] bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)]"
                            : "border-[var(--control-border)]"
                        }`}
                      >
                        {selected && <Check className="size-3" aria-hidden="true" />}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-main)] truncate">
                        {isEn ? meta.en : meta.ar}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-[var(--text-muted)] line-clamp-2">
                      {isEn ? meta.descriptionEn : meta.descriptionAr}
                    </p>
                  </div>
                  {secStats && (
                    <span className="shrink-0 rounded-full bg-[var(--bg-card)] border theme-border px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--accent-gold)]">
                      {secStats.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Export Action Card */}
        <aside
          aria-label={l("خيارات التنزيل", "Export download controls")}
          className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-4 xl:col-span-4"
        >
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
              {l("تنزيل الحزمة المالية", "Download Financial Package")}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {l(
                "يشمل جميع السجلات المطابقة للفلاتر الحالية في ملف واحد.",
                "Includes all matching filtered rows across selected sections.",
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[var(--text-main)] block">
              {l("لغة التقرير المصدر", "Export document language")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["ar", "العربية (RTL)"],
                  ["en", "English (LTR)"],
                ] as const
              ).map(([langCode, label]) => (
                <button
                  key={langCode}
                  type="button"
                  aria-pressed={exportLang === langCode}
                  onClick={() => setExportLang(langCode)}
                  className={`min-h-11 sm:min-h-9 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    exportLang === langCode
                      ? "bg-[var(--accent-btn-bg)] border-[var(--accent-btn-border)] text-[var(--accent-btn-fg)]"
                      : "theme-card border-[var(--control-border)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={
                selectedSections.length === 0 ||
                Boolean(amountRangeError) ||
                downloadingFormat !== null
              }
              onClick={() => void handleExport("pdf")}
              className="gold-gradient-btn w-full min-h-11 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition"
            >
              <Download className="size-4" aria-hidden="true" />
              <span>
                {downloadingFormat === "pdf"
                  ? l("جارٍ تجهيز PDF…", "Generating PDF…")
                  : l("تصدير تقرير PDF رسمي (A4)", "Export Official PDF (A4)")}
              </span>
            </button>

            <button
              type="button"
              disabled={
                selectedSections.length === 0 ||
                Boolean(amountRangeError) ||
                downloadingFormat !== null
              }
              onClick={() => void handleExport("csv")}
              className="w-full min-h-11 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-2 text-xs sm:text-sm font-bold text-[var(--text-main)] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition"
            >
              <FileSpreadsheet className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              <span>
                {downloadingFormat === "csv"
                  ? l("جارٍ تجهيز CSV…", "Generating CSV…")
                  : l("تصدير ملف Excel / CSV شامل", "Export Unified Excel / CSV")}
              </span>
            </button>

            <button
              type="button"
              disabled={
                selectedSections.length === 0 ||
                Boolean(amountRangeError) ||
                downloadingFormat !== null
              }
              onClick={() => void handleExport("json")}
              className="w-full min-h-11 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-2 text-xs sm:text-sm font-bold text-[var(--text-main)] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition"
            >
              <FileCode2 className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>
                {downloadingFormat === "json"
                  ? l("جارٍ التجهيز…", "Generating JSON…")
                  : l("تصدير حزمة JSON للأنظمة", "Export Structured JSON")}
              </span>
            </button>
          </div>

          {exportNotice && (
            <div
              role="status"
              className="rounded-xl border border-emerald-600/35 bg-emerald-500/12 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>{exportNotice}</span>
            </div>
          )}

          {(exportError || previewState.error) && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{exportError || previewState.error}</span>
            </div>
          )}
        </aside>
      </div>

      {/* 4. Executive Summary Strip */}
      {previewData && (
        <section
          aria-label={l("ملخص نتائج الفلاتر الحالية", "Filtered Executive Summary")}
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        >
          <div className="theme-card rounded-2xl border theme-border p-4">
            <span className="text-xs font-bold text-[var(--text-muted)] block">
              {l("إجمالي المبيعات المطابقة", "Filtered Sales Total")}
            </span>
            <p className="mt-2 font-mono text-xl font-semibold text-[var(--text-main)]" dir="ltr">
              {amountLabel(previewData.summary.totalSalesTotal)} <span className="text-xs text-[var(--text-muted)]">SAR</span>
            </p>
            <span className="text-[11px] text-[var(--text-muted)] font-mono" dir="ltr">
              {l("ضريبة:", "VAT:")} {amountLabel(previewData.summary.totalSalesVat)} SAR
            </span>
          </div>

          <div className="theme-card rounded-2xl border theme-border p-4">
            <span className="text-xs font-bold text-[var(--text-muted)] block">
              {l("إجمالي المشتريات المطابقة", "Filtered Purchases Total")}
            </span>
            <p className="mt-2 font-mono text-xl font-semibold text-[var(--text-main)]" dir="ltr">
              {amountLabel(previewData.summary.totalPurchasesTotal)} <span className="text-xs text-[var(--text-muted)]">SAR</span>
            </p>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono" dir="ltr">
              {l("قابلة للخصم:", "Recoverable VAT:")} {amountLabel(previewData.summary.totalRecoverableVat)} SAR
            </span>
          </div>

          <div className="theme-card rounded-2xl border theme-border p-4">
            <span className="text-xs font-bold text-[var(--text-muted)] block">
              {l("التحصيلات / صافي الربح", "Receipts / Net Profit")}
            </span>
            <p className="mt-2 font-mono text-xl font-semibold text-[var(--accent-gold)]" dir="ltr">
              {amountLabel(previewData.summary.netProfitBeforeTax)} <span className="text-xs text-[var(--text-muted)]">SAR</span>
            </p>
            <span className="text-[11px] text-[var(--text-muted)] font-mono" dir="ltr">
              {l("سندات قبض:", "Receipts:")} {amountLabel(previewData.summary.totalReceipts)} SAR
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800/95 border border-slate-700 p-4 text-white">
            <span className="text-xs font-bold text-slate-200 block">
              {l("صافي ضريبة القيمة المضافة", "Net VAT Position")}
            </span>
            <p className="mt-2 font-mono text-xl font-semibold text-amber-300" dir="ltr">
              {amountLabel(previewData.summary.netVatDue)} <span className="text-xs text-slate-300">SAR</span>
            </p>
            <span className="text-[11px] text-slate-300 font-mono" dir="ltr">
              {previewData.range.start} — {previewData.range.endInclusive}
            </span>
          </div>
        </section>
      )}

      {/* 5. Interactive Live Preview Tabs */}
      {previewData && (
        <ExportPreviewTabs
          preview={previewData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isEn={isEn}
        />
      )}
    </div>
  );
}
