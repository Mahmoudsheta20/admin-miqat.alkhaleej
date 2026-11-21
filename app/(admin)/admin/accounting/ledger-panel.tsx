"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Download,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react";
import {
  amountLabel,
  buildAccountLedgerPath,
  journalSourceTypeLabel,
  type Account,
  type AccountLedgerResponse,
} from "@/lib/accounting";
import { csvDownload } from "@/lib/commercial";
import { signedMoneyMinor } from "@/lib/dashboard-analytics";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { useApiQuery } from "@/lib/use-api-query";
import { useUiText } from "@/lib/ui-text";
import { useUrlState } from "@/lib/use-url-state";
import { Badge, Card } from "@/app/_components/ui";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";

const INPUT =
  "theme-input min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem] w-full";

const QUICK_LEDGER_ACCOUNTS = [
  { code: "1102", labelAr: "البنك", labelEn: "Bank" },
  { code: "1101", labelAr: "الصندوق", labelEn: "Cash" },
  { code: "1103", labelAr: "العملاء", labelEn: "Customers AR" },
  { code: "2101", labelAr: "الموردون", labelEn: "Suppliers AP" },
  { code: "2102", labelAr: "ضريبة القيمة المضافة", labelEn: "VAT Account" },
  { code: "1104", labelAr: "ضريبة المدخلات", labelEn: "Input VAT" },
] as const;

export default function LedgerPanel({
  reload,
  rangeStart,
  rangeEnd,
  onOpenJournal,
}: {
  reload: number;
  rangeStart?: string;
  rangeEnd?: string;
  onOpenJournal?: (journalNumber: number) => void;
}) {
  const ui = useUiText();
  const isEn = ui.language === "en";

  const [accountCode, setAccountCode] = useUrlState<string>("accountCode", "");
  const [accountQuery, setAccountQuery] = useState("");
  const [from, setFrom] = useUrlState<string>("ledgerFrom", "");
  const [to, setTo] = useUrlState<string>("ledgerTo", "");
  const [search, setSearch] = useUrlState<string>("ledgerSearch", "");
  const [page, setPage] = useUrlState<number>("ledgerPage", 1);

  const accounts = useAccountingQuery<{ items: Account[] }>("/accounts", reload);

  const sortedAccounts = useMemo(() => {
    const list = accounts.data?.items ?? [];
    return [...list].sort((a, b) => a.code.localeCompare(b.code, "en"));
  }, [accounts.data?.items]);

  const filteredAccounts = useMemo(() => {
    const needle = accountQuery.trim().toLowerCase();
    if (!needle) return sortedAccounts;
    return sortedAccounts.filter(
      (a) =>
        a.code === accountCode ||
        a.code.toLowerCase().includes(needle) ||
        a.nameAr.toLowerCase().includes(needle) ||
        (a.nameEn?.toLowerCase().includes(needle) ?? false),
    );
  }, [sortedAccounts, accountQuery, accountCode]);

  const quickPickAccounts = useMemo(() => {
    return QUICK_LEDGER_ACCOUNTS.flatMap((preset) => {
      if (sortedAccounts.length === 0) {
        return [
          {
            code: preset.code,
            label: isEn ? preset.labelEn : preset.labelAr,
          },
        ];
      }
      const exact = sortedAccounts.find((a) => a.code === preset.code);
      if (!exact) return [];
      return [
        {
          code: exact.code,
          label: isEn && exact.nameEn ? exact.nameEn : exact.nameAr,
        },
      ];
    });
  }, [sortedAccounts, isEn]);

  const trimmedCode = accountCode.trim();
  const ledgerPath = trimmedCode
    ? buildAccountLedgerPath(trimmedCode, { from, to, page, search })
    : null;
  const ledger = useApiQuery<AccountLedgerResponse>(ledgerPath, reload);

  const data = ledger.data;
  const pageSize = data?.pageSize || 50;
  const total = data?.total || 0;
  const hasFilters = Boolean(from.trim() || to.trim() || search.trim());

  function clearFilters() {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(1);
  }

  function exportCsv() {
    if (!data) return;
    const accName =
      isEn && data.account.nameEn ? data.account.nameEn : data.account.nameAr;
    csvDownload(`ledger-${data.account.code}${from ? `-${from}` : ""}.csv`, [
      [isEn ? "Account Ledger" : "دفتر الأستاذ العام", `${data.account.code} · ${accName}`],
      [
        isEn ? "From" : "من",
        data.from || (isEn ? "Beginning" : "البداية"),
        isEn ? "To" : "إلى",
        data.to || (isEn ? "Latest" : "الأحدث"),
      ],
      [
        isEn ? "Opening Balance" : "الرصيد الافتتاحي",
        data.openingBalance,
        isEn ? "Period Debit" : "مدين الفترة",
        data.debit,
        isEn ? "Period Credit" : "دائن الفترة",
        data.credit,
        isEn ? "Closing Balance" : "الرصيد الختامي",
        data.closingBalance,
      ],
      isEn
        ? [
            "Date",
            "Journal #",
            "Source",
            "Description",
            "Vehicle",
            "Debit",
            "Credit",
            "Balance",
          ]
        : [
            "التاريخ",
            "رقم القيد",
            "المصدر",
            "البيان",
            "المركبة",
            "مدين",
            "دائن",
            "الرصيد",
          ],
      ...data.entries.map((entry) => [
        entry.date.slice(0, 10),
        `JE-${String(entry.number).padStart(6, "0")}`,
        journalSourceTypeLabel(entry.sourceType, isEn),
        entry.description || entry.journalDescription || "",
        entry.vehiclePlate || "",
        entry.debit,
        entry.credit,
        entry.balance,
      ]),
    ]);
  }

  return (
    <section className="space-y-5">
      {/* Header & Controls Card */}
      <Card className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] shrink-0">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                {isEn ? "Account Statement & General Ledger" : "دفتر الحساب وكشف الأستاذ التفصيلي"}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {isEn
                  ? "Inspect running balances, opening/closing figures, and drill down into individual journal entries."
                  : "استعراض الحركات التفصيلية والرصيد الافتتاحي والختامي والرصيد التراكمي لأي حساب تشغيلي أو تجميعي."}
              </p>
            </div>
          </div>

          {data && (
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-3.5 py-1.5 text-xs font-bold text-[var(--text-main)] cursor-pointer transition-colors shrink-0"
            >
              <Download className="h-4 w-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{isEn ? "Export CSV" : "تصدير كشف الحساب CSV"}</span>
            </button>
          )}
        </div>

        {/* Quick-Pick Account Chips */}
        {quickPickAccounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[var(--text-muted)] me-1">
              {isEn ? "Quick pick:" : "اختيار سريع:"}
            </span>
            {quickPickAccounts.map((chip) => {
              const selected = trimmedCode === chip.code;
              return (
                <button
                  key={chip.code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setAccountCode(chip.code);
                    setPage(1);
                  }}
                  className={`min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    selected
                      ? "bg-[var(--accent-btn-bg)] border-[var(--accent-btn-border)] text-[var(--accent-btn-fg)]"
                      : "theme-card border-[var(--control-border)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                  }`}
                >
                  <bdi dir="ltr" className="font-mono">
                    {chip.code}
                  </bdi>
                  <span className="truncate max-w-[140px]">{chip.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Account & Filter Inputs */}
        <div className="grid gap-3 md:grid-cols-12 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ledger-account-select"
                className="text-xs font-bold text-[var(--text-main)]"
              >
                {isEn ? "Account" : "الحساب المحاسبي"}
              </label>
              <input
                type="search"
                aria-label={isEn ? "Filter accounts list" : "تصفية قائمة الحسابات"}
                placeholder={isEn ? "Filter code or name..." : "تصفية برمز أو اسم..."}
                value={accountQuery}
                onChange={(e) => setAccountQuery(e.target.value)}
                className="theme-input min-h-8 w-40 rounded-lg px-2.5 py-1 text-xs"
              />
            </div>
            <select
              id="ledger-account-select"
              aria-label={isEn ? "Select ledger account" : "اختر الحساب المحاسبي"}
              className={`${INPUT} mt-0!`}
              value={accountCode}
              onChange={(e) => {
                setAccountCode(e.target.value);
                setPage(1);
              }}
            >
              <option value="">
                {isEn ? "Choose an account..." : "اختر حساباً لعرض كشف الأستاذ…"}
              </option>
              {filteredAccounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} · {isEn && a.nameEn ? a.nameEn : a.nameAr}
                  {!a.isPosting ? (isEn ? " (Group)" : " (رئيسي)") : ""}
                  {!a.isActive ? (isEn ? " [Inactive]" : " [موقوف]") : ""}
                </option>
              ))}
            </select>
          </div>

          <label className="md:col-span-2 text-xs font-bold text-[var(--text-main)] space-y-1.5">
            <span>{isEn ? "From date" : "من تاريخ"}</span>
            <input
              type="date"
              dir="ltr"
              aria-label={isEn ? "Ledger from date" : "من تاريخ في دفتر الحساب"}
              className={`${INPUT} font-mono`}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="md:col-span-2 text-xs font-bold text-[var(--text-main)] space-y-1.5">
            <span>{isEn ? "To date" : "إلى تاريخ"}</span>
            <input
              type="date"
              dir="ltr"
              aria-label={isEn ? "Ledger to date" : "إلى تاريخ في دفتر الحساب"}
              className={`${INPUT} font-mono`}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <div className="md:col-span-4 flex items-end gap-2">
            <label className="flex-1 text-xs font-bold text-[var(--text-main)] space-y-1.5">
              <span>{isEn ? "Search entries" : "بحث في البيان أو القيد"}</span>
              <div className="relative">
                <Search
                  className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className={`${INPUT} ps-9`}
                  placeholder={isEn ? "Description, plate, or voucher..." : "البيان، رقم اللوحة، رقم القيد…"}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                aria-label={isEn ? "Clear ledger filters" : "مسح فلاتر دفتر الحساب"}
                className="min-h-11 sm:min-h-9 px-3 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-rose-500 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer shrink-0 inline-flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isEn ? "Clear" : "مسح"}</span>
              </button>
            )}
          </div>
        </div>

        {rangeStart && rangeEnd && (from !== rangeStart || to !== rangeEnd) && (
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)] pt-1">
            <span>
              {isEn ? "Active report range:" : "نطاق التقرير المالي الحالي:"}{" "}
              <bdi dir="ltr" className="font-mono font-semibold text-[var(--text-main)]">
                {rangeStart} — {rangeEnd}
              </bdi>
            </span>
            <button
              type="button"
              onClick={() => {
                setFrom(rangeStart);
                setTo(rangeEnd);
                setPage(1);
              }}
              className="text-xs font-bold text-[var(--accent-gold)] hover:underline cursor-pointer"
            >
              {isEn ? "Apply report dates" : "تطبيق نطاق التقرير"}
            </button>
          </div>
        )}
      </Card>

      {(accounts.error || ledger.error) && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-600/35 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-800 dark:text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{accounts.error || ledger.error}</p>
        </div>
      )}

      {!trimmedCode && (
        <Card className="theme-card rounded-2xl border theme-border p-10 text-center space-y-2">
          <BookOpen className="h-8 w-8 mx-auto text-[var(--accent-gold)]" aria-hidden="true" />
          <p className="text-sm font-bold text-[var(--text-main)]">
            {isEn ? "Select an account to view its ledger" : "اختر حساباً من القائمة لعرض دفتر الأستاذ"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {isEn
              ? "You can also click any account in the Trial Balance, Income Statement, or Chart of Accounts."
              : "يمكنك أيضاً الضغط على أي حساب من ميزان المراجعة أو قائمة الدخل أو شجرة الحسابات لفتح كشفه مباشرة."}
          </p>
        </Card>
      )}

      {trimmedCode && ledger.isLoading && !data && (
        <div
          role="status"
          className="theme-card h-56 animate-pulse rounded-2xl border theme-border flex items-center justify-center text-sm text-[var(--text-muted)]"
        >
          {isEn ? "Loading account ledger..." : "جارٍ تحميل دفتر الحساب…"}
        </div>
      )}

      {data && (
        <>
          {/* Summary Banner */}
          <Card className="theme-card rounded-2xl border theme-border p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold" className="font-mono text-xs">
                  {data.account.code}
                </Badge>
                <h3 className="text-base font-bold text-[var(--text-main)]">
                  {isEn && data.account.nameEn ? data.account.nameEn : data.account.nameAr}
                </h3>
                {!data.account.isPosting && (
                  <Badge variant="outline" className="text-[11px]">
                    {isEn ? "Group Account" : "حساب تجميعي"}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[11px] font-mono">
                  {isEn
                    ? `Normal: ${data.account.normalBalance}`
                    : data.account.normalBalance === "CREDIT"
                      ? "طبيعة الحساب: دائن"
                      : "طبيعة الحساب: مدين"}
                </Badge>
              </div>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {total} {isEn ? "entries" : "حركة"}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5">
                <span className="text-xs font-bold text-[var(--text-muted)] block">
                  {isEn ? "Opening Balance" : "الرصيد الافتتاحي"}
                </span>
                <bdi dir="ltr" className="mt-2 block font-mono text-lg font-bold text-[var(--text-main)]">
                  {amountLabel(data.openingBalance)} <span className="text-xs text-[var(--text-muted)]">SAR</span>
                </bdi>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">
                  {isEn ? "Period Debit" : "إجمالي المدين"}
                </span>
                <bdi dir="ltr" className="mt-2 block font-mono text-lg font-bold text-rose-700 dark:text-rose-300">
                  {amountLabel(data.debit)} <span className="text-xs">SAR</span>
                </bdi>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">
                  {isEn ? "Period Credit" : "إجمالي الدائن"}
                </span>
                <bdi dir="ltr" className="mt-2 block font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {amountLabel(data.credit)} <span className="text-xs">SAR</span>
                </bdi>
              </div>
              <div className="rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] p-3.5">
                <span className="text-xs font-bold text-[var(--accent-gold)] block">
                  {isEn ? "Closing Balance" : "الرصيد الختامي"}
                </span>
                <bdi dir="ltr" className="mt-2 block font-mono text-lg font-bold text-[var(--text-main)]">
                  {amountLabel(data.closingBalance)} <span className="text-xs text-[var(--accent-gold)]">SAR</span>
                </bdi>
              </div>
            </div>
          </Card>

          {/* Entries List (Desktop Table + Mobile Cards) */}
          {data.entries.length === 0 ? (
            <Card className="theme-card rounded-2xl border theme-border p-10 text-center text-sm text-[var(--text-muted)]">
              {isEn
                ? "No ledger postings match the selected account and filters."
                : "لا توجد حركات محاسبية مسجلة لهذا الحساب ضمن النطاق المحدد."}
            </Card>
          ) : (
            <Card className="theme-card overflow-hidden rounded-2xl border theme-border shadow-xs">
              {/* Mobile Cards */}
              <div className="md:hidden p-3.5 space-y-3">
                {data.entries.map((entry) => {
                  const hasDebit = signedMoneyMinor(entry.debit) > BigInt(0);
                  const hasCredit = signedMoneyMinor(entry.credit) > BigInt(0);
                  return (
                    <MobileRecordCard
                      key={entry.id}
                      title={
                        <span className="font-mono text-xs font-bold text-[var(--accent-gold)]">
                          <bdi dir="ltr">JE-{String(entry.number).padStart(6, "0")}</bdi>
                        </span>
                      }
                      subtitle={
                        <span className="text-xs text-[var(--text-main)]">
                          {entry.description || entry.journalDescription || "—"}
                        </span>
                      }
                      badge={
                        <Badge variant="outline" className="text-[11px]">
                          {journalSourceTypeLabel(entry.sourceType, isEn)}
                        </Badge>
                      }
                      footer={
                        <div className="flex items-center justify-between gap-2 w-full text-xs">
                          <span className="font-mono text-[var(--text-muted)] flex items-center gap-1">
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            <bdi dir="ltr">{entry.date.slice(0, 10)}</bdi>
                          </span>
                          {onOpenJournal && (
                            <button
                              type="button"
                              onClick={() => onOpenJournal(entry.number)}
                              className="text-xs font-bold text-[var(--accent-gold)] hover:underline cursor-pointer"
                            >
                              {isEn ? "View voucher" : "عرض القيد"}
                            </button>
                          )}
                        </div>
                      }
                    >
                      <MobileCardMetaGrid columns={3}>
                        <MobileCardField
                          label={isEn ? "Debit" : "مدين"}
                          mono
                          value={
                            <span className="text-rose-700 dark:text-rose-300" dir="ltr">
                              {hasDebit ? amountLabel(entry.debit) : "—"}
                            </span>
                          }
                        />
                        <MobileCardField
                          label={isEn ? "Credit" : "دائن"}
                          mono
                          value={
                            <span className="text-emerald-700 dark:text-emerald-300" dir="ltr">
                              {hasCredit ? amountLabel(entry.credit) : "—"}
                            </span>
                          }
                        />
                        <MobileCardField
                          label={isEn ? "Balance" : "الرصيد"}
                          mono
                          value={
                            <bdi dir="ltr" className="font-bold text-[var(--text-main)]">
                              {amountLabel(entry.balance)}
                            </bdi>
                          }
                        />
                      </MobileCardMetaGrid>
                    </MobileRecordCard>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[820px] text-start text-xs sm:text-sm border-collapse">
                  <thead className="border-b theme-border bg-[var(--table-header-bg)] text-xs font-bold text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3 text-start">{isEn ? "Date" : "التاريخ"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Journal" : "رقم القيد"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Source" : "المصدر"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Description" : "البيان"}</th>
                      <th className="px-4 py-3 text-end text-rose-700 dark:text-rose-300">
                        {isEn ? "Debit" : "مدين"}
                      </th>
                      <th className="px-4 py-3 text-end text-emerald-700 dark:text-emerald-300">
                        {isEn ? "Credit" : "دائن"}
                      </th>
                      <th className="px-4 py-3 text-end">{isEn ? "Running Balance" : "الرصيد التراكمي"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {data.entries.map((entry) => {
                      const hasDebit = signedMoneyMinor(entry.debit) > BigInt(0);
                      const hasCredit = signedMoneyMinor(entry.credit) > BigInt(0);
                      return (
                        <tr key={entry.id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                            <bdi dir="ltr">{entry.date.slice(0, 10)}</bdi>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {onOpenJournal ? (
                              <button
                                type="button"
                                onClick={() => onOpenJournal(entry.number)}
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-surface)] border border-amber-600/30 px-2 py-0.5 font-mono text-xs font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] cursor-pointer"
                              >
                                JE-{String(entry.number).padStart(6, "0")}
                              </button>
                            ) : (
                              <span className="font-mono text-xs font-bold text-[var(--accent-gold)]">
                                JE-{String(entry.number).padStart(6, "0")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge variant="outline" className="text-[11px]">
                                {journalSourceTypeLabel(entry.sourceType, isEn)}
                              </Badge>
                              {entry.reversedById && (
                                <Badge variant="destructive" className="text-[10px] gap-0.5">
                                  <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
                                  <span>{isEn ? "Reversed" : "معكوس"}</span>
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-main)] max-w-md">
                            <p className="font-medium">
                              {entry.description || entry.journalDescription || "—"}
                            </p>
                            {entry.vehiclePlate && (
                              <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
                                <Truck className="h-3 w-3" aria-hidden="true" />
                                {entry.vehiclePlate}
                              </span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 text-end font-mono tabular-nums font-medium text-rose-700 dark:text-rose-300 whitespace-nowrap"
                            dir="ltr"
                          >
                            {hasDebit ? amountLabel(entry.debit) : "—"}
                          </td>
                          <td
                            className="px-4 py-3 text-end font-mono tabular-nums font-medium text-emerald-700 dark:text-emerald-300 whitespace-nowrap"
                            dir="ltr"
                          >
                            {hasCredit ? amountLabel(entry.credit) : "—"}
                          </td>
                          <td
                            className="px-4 py-3 text-end font-mono tabular-nums font-bold text-[var(--text-main)] whitespace-nowrap"
                            dir="ltr"
                          >
                            {amountLabel(entry.balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium pt-1">
              <button
                type="button"
                className="min-h-11 sm:min-h-9 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-2 text-[var(--text-main)] disabled:opacity-40 cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
                disabled={page <= 1}
                onClick={() => setPage((v) => Math.max(1, v - 1))}
              >
                {isEn ? "Previous" : "السابق"}
              </button>
              <p className="font-mono text-[var(--text-muted)]">
                <bdi>{total}</bdi> {isEn ? "entries · Page" : "حركة · صفحة"} <bdi>{page}</bdi>
              </p>
              <button
                type="button"
                className="min-h-11 sm:min-h-9 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-2 text-[var(--text-main)] disabled:opacity-40 cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
                disabled={page * pageSize >= total}
                onClick={() => setPage((v) => v + 1)}
              >
                {isEn ? "Next" : "التالي"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
