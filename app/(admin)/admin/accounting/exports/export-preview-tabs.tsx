"use client";

import { amountLabel, paymentStatusMeta, type DocumentPaymentStatus } from "@/lib/accounting";
import {
  EXPORT_SECTION_META,
  type ExportSectionId,
  type FinancialExportPreviewResponse,
} from "@/lib/financial-exports";
import { Badge } from "@/app/_components/ui";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";

interface ExportPreviewTabsProps {
  preview: FinancialExportPreviewResponse;
  activeTab: ExportSectionId;
  onTabChange: (tab: ExportSectionId) => void;
  isEn: boolean;
}

export function ExportPreviewTabs({
  preview,
  activeTab,
  onTabChange,
  isEn,
}: ExportPreviewTabsProps) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  const availableTabs = preview.meta.sections.filter(
    (id) => preview.sections[id] !== undefined,
  );
  const resolvedTab = availableTabs.includes(activeTab)
    ? activeTab
    : availableTabs[0];

  if (!resolvedTab) {
    return (
      <div className="theme-card rounded-2xl border theme-border p-8 text-center text-sm text-[var(--text-muted)]">
        {l("اختر قسماً واحداً على الأقل لعرض المعاينة.", "Select at least one dataset to preview.")}
      </div>
    );
  }

  const currentSection = preview.sections[resolvedTab];

  return (
    <section
      aria-label={l("معاينة البيانات قبل التصدير", "Live Data Preview")}
      className="theme-card rounded-2xl border theme-border overflow-hidden"
    >
      <nav
        aria-label={l("تبويبات معاينة التصدير", "Export preview tabs")}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b theme-border px-4 pt-2"
      >
        {availableTabs.map((secId) => {
          const active = secId === resolvedTab;
          const meta = EXPORT_SECTION_META[secId];
          const secData = preview.sections[secId];
          const count = secData?.count ?? 0;
          return (
            <button
              key={secId}
              type="button"
              aria-pressed={active}
              onClick={() => onTabChange(secId)}
              className={`shrink-0 whitespace-nowrap min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer rounded-t-lg inline-flex items-center gap-2 ${
                active
                  ? "border-[var(--accent-gold)] bg-[var(--accent-surface)]/50 text-[var(--accent-gold)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--control-border)]"
              }`}
            >
              <span>{isEn ? meta.en : meta.ar}</span>
              <span className="rounded-full bg-[var(--bg-card-subtle)] border theme-border px-2 py-0.5 text-[11px] font-mono text-[var(--text-main)]">
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {currentSection && currentSection.truncated && (
        <div className="border-b theme-border bg-[var(--accent-surface)]/60 px-4 py-2.5 text-xs font-semibold text-[var(--text-main)] flex flex-wrap items-center justify-between gap-2">
          <span>
            {l(
              `تُعرض أول ${currentSection.rows.length} سجلًا فقط في المعاينة من أصل ${currentSection.count} سجلًا مطابقًا. التصدير الفعلي (PDF/CSV/JSON) سيشمل جميع السجلات المطابقة.`,
              `Showing the first ${currentSection.rows.length} rows of ${currentSection.count} matching records in preview. Full exports (PDF/CSV/JSON) include all matching rows.`,
            )}
          </span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {resolvedTab === "INVOICES" && preview.sections.INVOICES && (
          <InvoicesPreview section={preview.sections.INVOICES} isEn={isEn} />
        )}
        {resolvedTab === "PURCHASES" && preview.sections.PURCHASES && (
          <PurchasesPreview section={preview.sections.PURCHASES} isEn={isEn} />
        )}
        {resolvedTab === "PAYMENTS" && preview.sections.PAYMENTS && (
          <PaymentsPreview section={preview.sections.PAYMENTS} isEn={isEn} />
        )}
        {resolvedTab === "INCOME_STATEMENT" && preview.sections.INCOME_STATEMENT && (
          <IncomePreview section={preview.sections.INCOME_STATEMENT} isEn={isEn} />
        )}
        {resolvedTab === "TRIAL_BALANCE" && preview.sections.TRIAL_BALANCE && (
          <TrialPreview section={preview.sections.TRIAL_BALANCE} isEn={isEn} />
        )}
        {resolvedTab === "JOURNALS" && preview.sections.JOURNALS && (
          <JournalsPreview section={preview.sections.JOURNALS} isEn={isEn} />
        )}
        {resolvedTab === "VAT_RETURN" && preview.sections.VAT_RETURN && (
          <VatPreview section={preview.sections.VAT_RETURN} isEn={isEn} />
        )}
        {resolvedTab === "VEHICLES" && preview.sections.VEHICLES && (
          <VehiclesPreview section={preview.sections.VEHICLES} isEn={isEn} />
        )}
        {resolvedTab === "ACCOUNTS" && preview.sections.ACCOUNTS && (
          <AccountsPreview section={preview.sections.ACCOUNTS} isEn={isEn} />
        )}
      </div>
    </section>
  );
}

function EmptyPreview({ isEn }: { isEn: boolean }) {
  return (
    <p className="py-8 text-center text-xs sm:text-sm text-[var(--text-muted)]">
      {isEn
        ? "No matching records for the selected period and filters."
        : "لا توجد سجلات مطابقة للفترة والفلاتر المحددة."}
    </p>
  );
}

function InvoicesPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["INVOICES"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <>
      <div className="md:hidden space-y-3">
        {section.rows.map((r) => {
          const payMeta = r.paymentStatus
            ? paymentStatusMeta(r.paymentStatus as DocumentPaymentStatus, isEn, "SALE")
            : null;
          return (
            <MobileRecordCard
              key={r.id}
              title={<bdi dir="ltr" className="font-mono">{r.invoiceNumber}</bdi>}
              subtitle={`${r.customerName} · ${r.date}`}
              badge={
                payMeta ? (
                  <Badge variant={payMeta.variant} className="text-[11px]">
                    {payMeta.label}
                  </Badge>
                ) : undefined
              }
            >
              <MobileCardMetaGrid columns={3}>
                <MobileCardField
                  label={l("الإجمالي", "Total")}
                  mono
                  value={<bdi dir="ltr">{amountLabel(r.totalAmount)}</bdi>}
                />
                <MobileCardField
                  label={l("الضريبة", "VAT")}
                  mono
                  value={<bdi dir="ltr">{amountLabel(r.vatAmount)}</bdi>}
                />
                <MobileCardField
                  label={l("المتبقي", "Due")}
                  mono
                  value={<bdi dir="ltr">{amountLabel(r.remainingBalance)}</bdi>}
                />
              </MobileCardMetaGrid>
            </MobileRecordCard>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[780px] text-start text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
              <th className="px-3 py-2.5 text-start">{l("الفاتورة", "Invoice #")}</th>
              <th className="px-3 py-2.5 text-start">{l("التاريخ", "Date")}</th>
              <th className="px-3 py-2.5 text-start">{l("العميل", "Customer")}</th>
              <th className="px-3 py-2.5 text-start">{l("النوع", "Type")}</th>
              <th className="px-3 py-2.5 text-start">{l("الصافي", "Net")}</th>
              <th className="px-3 py-2.5 text-start">{l("الضريبة", "VAT")}</th>
              <th className="px-3 py-2.5 text-start">{l("الإجمالي", "Total")}</th>
              <th className="px-3 py-2.5 text-start">{l("السداد", "Status")}</th>
              <th className="px-3 py-2.5 text-start">{l("المتبقي", "Due")}</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {section.rows.map((r) => {
              const payMeta = r.paymentStatus
                ? paymentStatusMeta(r.paymentStatus as DocumentPaymentStatus, isEn, "SALE")
                : null;
              return (
                <tr key={r.id} className="hover:bg-[var(--table-row-hover)]">
                  <td className="px-3 py-2.5 font-mono font-bold"><bdi dir="ltr">{r.invoiceNumber}</bdi></td>
                  <td className="px-3 py-2.5 font-mono text-[var(--text-muted)]"><bdi dir="ltr">{r.date}</bdi></td>
                  <td className="px-3 py-2.5 font-semibold">{r.customerName}</td>
                  <td className="px-3 py-2.5 text-xs">{r.taxKind || r.documentType}</td>
                  <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.netAmount)}</td>
                  <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.vatAmount)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.totalAmount)}</td>
                  <td className="px-3 py-2.5">
                    {payMeta ? (
                      <Badge variant={payMeta.variant} className="text-[11px]">{payMeta.label}</Badge>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.remainingBalance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PurchasesPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["PURCHASES"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <>
      <div className="md:hidden space-y-3">
        {section.rows.map((r) => {
          const payMeta = r.paymentStatus
            ? paymentStatusMeta(r.paymentStatus as DocumentPaymentStatus, isEn, "PURCHASE")
            : null;
          return (
            <MobileRecordCard
              key={r.id}
              title={<bdi dir="ltr" className="font-mono">{r.voucher}</bdi>}
              subtitle={`${r.supplierName} · ${r.vatDate}`}
              badge={
                payMeta ? (
                  <Badge variant={payMeta.variant} className="text-[11px]">
                    {payMeta.label}
                  </Badge>
                ) : undefined
              }
            >
              <MobileCardMetaGrid columns={3}>
                <MobileCardField label={l("الصافي", "Net")} mono value={<bdi dir="ltr">{amountLabel(r.netAmount)}</bdi>} />
                <MobileCardField label={l("الخصم", "Rec. VAT")} mono value={<bdi dir="ltr">{amountLabel(r.recoverableVat)}</bdi>} />
                <MobileCardField label={l("الإجمالي", "Total")} mono value={<bdi dir="ltr">{amountLabel(r.totalAmount)}</bdi>} />
              </MobileCardMetaGrid>
            </MobileRecordCard>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[820px] text-start text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
              <th className="px-3 py-2.5 text-start">{l("السند", "Voucher")}</th>
              <th className="px-3 py-2.5 text-start">{l("المورد", "Supplier")}</th>
              <th className="px-3 py-2.5 text-start">{l("فاتورة المورد", "Bill #")}</th>
              <th className="px-3 py-2.5 text-start">{l("التصنيف", "Category")}</th>
              <th className="px-3 py-2.5 text-start">{l("التاريخ", "VAT Date")}</th>
              <th className="px-3 py-2.5 text-start">{l("اللوحة", "Plate")}</th>
              <th className="px-3 py-2.5 text-start">{l("الخصم الضريبي", "Rec. VAT")}</th>
              <th className="px-3 py-2.5 text-start">{l("الإجمالي", "Total")}</th>
              <th className="px-3 py-2.5 text-start">{l("السداد", "Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {section.rows.map((r) => {
              const payMeta = r.paymentStatus
                ? paymentStatusMeta(r.paymentStatus as DocumentPaymentStatus, isEn, "PURCHASE")
                : null;
              return (
                <tr key={r.id} className="hover:bg-[var(--table-row-hover)]">
                  <td className="px-3 py-2.5 font-mono font-bold"><bdi dir="ltr">{r.voucher}</bdi></td>
                  <td className="px-3 py-2.5 font-semibold">{r.supplierName}</td>
                  <td className="px-3 py-2.5 font-mono"><bdi dir="ltr">{r.invoiceNumber}</bdi></td>
                  <td className="px-3 py-2.5 text-xs">{r.category}</td>
                  <td className="px-3 py-2.5 font-mono text-[var(--text-muted)]"><bdi dir="ltr">{r.vatDate}</bdi></td>
                  <td className="px-3 py-2.5 font-mono">{r.vehiclePlate || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-emerald-700 dark:text-emerald-300" dir="ltr">{amountLabel(r.recoverableVat)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.totalAmount)}</td>
                  <td className="px-3 py-2.5">
                    {payMeta ? <Badge variant={payMeta.variant} className="text-[11px]">{payMeta.label}</Badge> : r.postingStatus}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PaymentsPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["PAYMENTS"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <>
      <div className="md:hidden space-y-3">
        {section.rows.map((r) => (
          <MobileRecordCard
            key={r.id}
            title={r.reference}
            subtitle={`${r.paymentDate} · ${r.journalNumber}`}
            badge={
              <Badge variant={r.direction === "RECEIPT" ? "success" : "warning"} className="text-[11px]">
                {r.direction === "RECEIPT" ? l("قبض", "Receipt") : l("صرف", "Payment")}
              </Badge>
            }
          >
            <MobileCardMetaGrid columns={2}>
              <MobileCardField label={l("المبلغ", "Amount")} mono value={<bdi dir="ltr">{amountLabel(r.amount)}</bdi>} />
              <MobileCardField label={l("المستند", "Doc")} value={r.documentRef} />
            </MobileCardMetaGrid>
          </MobileRecordCard>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-start text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
              <th className="px-3 py-2.5 text-start">{l("التاريخ", "Date")}</th>
              <th className="px-3 py-2.5 text-start">{l("الاتجاه", "Direction")}</th>
              <th className="px-3 py-2.5 text-start">{l("المستند", "Document")}</th>
              <th className="px-3 py-2.5 text-start">{l("الحساب", "Cash Account")}</th>
              <th className="px-3 py-2.5 text-start">{l("المرجع", "Reference")}</th>
              <th className="px-3 py-2.5 text-start">{l("القيد", "Journal")}</th>
              <th className="px-3 py-2.5 text-start">{l("المبلغ", "Amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {section.rows.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--table-row-hover)]">
                <td className="px-3 py-2.5 font-mono text-[var(--text-muted)]"><bdi dir="ltr">{r.paymentDate}</bdi></td>
                <td className="px-3 py-2.5">
                  <Badge variant={r.direction === "RECEIPT" ? "success" : "warning"} className="text-[11px]">
                    {r.direction === "RECEIPT" ? l("سند قبض", "Receipt") : l("سند صرف", "Disbursement")}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 font-semibold">{r.documentRef}</td>
                <td className="px-3 py-2.5 font-mono">{r.cashAccount}</td>
                <td className="px-3 py-2.5">{r.reference}</td>
                <td className="px-3 py-2.5 font-mono text-[var(--accent-gold)]"><bdi dir="ltr">{r.journalNumber}</bdi></td>
                <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function IncomePreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["INCOME_STATEMENT"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] text-start text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
            <th className="px-3 py-2.5 text-start">{l("الحساب", "Code")}</th>
            <th className="px-3 py-2.5 text-start">{l("الاسم", "Account")}</th>
            <th className="px-3 py-2.5 text-start">{l("النوع", "Type")}</th>
            <th className="px-3 py-2.5 text-start">{l("مدين", "Debit")}</th>
            <th className="px-3 py-2.5 text-start">{l("دائن", "Credit")}</th>
            <th className="px-3 py-2.5 text-start">{l("الصافي", "Net")}</th>
          </tr>
        </thead>
        <tbody className="divide-y theme-border">
          {section.rows.map((r) => (
            <tr key={r.code} className="hover:bg-[var(--table-row-hover)]">
              <td className="px-3 py-2.5 font-mono font-bold text-[var(--accent-gold)]">{r.code}</td>
              <td className="px-3 py-2.5 font-semibold">{isEn && r.nameEn ? r.nameEn : r.nameAr}</td>
              <td className="px-3 py-2.5 text-xs">{r.type}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.debit)}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.credit)}</td>
              <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrialPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["TRIAL_BALANCE"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-start text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
            <th className="px-3 py-2.5 text-start">{l("الحساب", "Code")}</th>
            <th className="px-3 py-2.5 text-start">{l("الاسم", "Name")}</th>
            <th className="px-3 py-2.5 text-start">{l("افتتاحي مدين", "Open Dr")}</th>
            <th className="px-3 py-2.5 text-start">{l("افتتاحي دائن", "Open Cr")}</th>
            <th className="px-3 py-2.5 text-start">{l("حركة مدينة", "Period Dr")}</th>
            <th className="px-3 py-2.5 text-start">{l("حركة دائنة", "Period Cr")}</th>
            <th className="px-3 py-2.5 text-start">{l("ختامي مدين", "Close Dr")}</th>
            <th className="px-3 py-2.5 text-start">{l("ختامي دائن", "Close Cr")}</th>
          </tr>
        </thead>
        <tbody className="divide-y theme-border">
          {section.rows.map((r) => (
            <tr key={r.code} className="hover:bg-[var(--table-row-hover)]">
              <td className="px-3 py-2.5 font-mono font-bold text-[var(--accent-gold)]">{r.code}</td>
              <td className="px-3 py-2.5 font-semibold">{isEn && r.nameEn ? r.nameEn : r.nameAr}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.openingDebit)}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.openingCredit)}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.debit)}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.credit)}</td>
              <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.closingDebit)}</td>
              <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.closingCredit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JournalsPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["JOURNALS"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-start text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
            <th className="px-3 py-2.5 text-start">{l("القيد", "Journal #")}</th>
            <th className="px-3 py-2.5 text-start">{l("التاريخ", "Date")}</th>
            <th className="px-3 py-2.5 text-start">{l("المصدر", "Source")}</th>
            <th className="px-3 py-2.5 text-start">{l("الحساب", "Account")}</th>
            <th className="px-3 py-2.5 text-start">{l("المركبة", "Plate")}</th>
            <th className="px-3 py-2.5 text-start">{l("البيان", "Description")}</th>
            <th className="px-3 py-2.5 text-start">{l("مدين", "Debit")}</th>
            <th className="px-3 py-2.5 text-start">{l("دائن", "Credit")}</th>
          </tr>
        </thead>
        <tbody className="divide-y theme-border">
          {section.rows.map((r) => (
            <tr key={r.id} className="hover:bg-[var(--table-row-hover)]">
              <td className="px-3 py-2.5 font-mono font-bold text-[var(--accent-gold)]"><bdi dir="ltr">{r.journalNumber}</bdi></td>
              <td className="px-3 py-2.5 font-mono text-[var(--text-muted)]"><bdi dir="ltr">{r.date}</bdi></td>
              <td className="px-3 py-2.5 text-xs">{r.sourceType}</td>
              <td className="px-3 py-2.5 font-mono">{r.accountCode} · {isEn && r.accountNameEn ? r.accountNameEn : r.accountNameAr}</td>
              <td className="px-3 py-2.5 font-mono">{r.vehiclePlate || "—"}</td>
              <td className="px-3 py-2.5">{r.description}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.debit)}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.credit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VatPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["VAT_RETURN"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-start text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
            <th className="px-3 py-2.5 text-start">{l("الخانة", "Box")}</th>
            <th className="px-3 py-2.5 text-start">{l("البيان", "Description")}</th>
            <th className="px-3 py-2.5 text-start">{l("المبلغ", "Amount")}</th>
            <th className="px-3 py-2.5 text-start">{l("التعديل", "Adjustment")}</th>
            <th className="px-3 py-2.5 text-start">{l("الضريبة / الرصيد", "VAT / Balance")}</th>
          </tr>
        </thead>
        <tbody className="divide-y theme-border">
          {section.rows.map((r) => (
            <tr key={r.box} className={r.isTotal ? "theme-card-subtle font-bold" : "hover:bg-[var(--table-row-hover)]"}>
              <td className="px-3 py-2.5 font-mono font-bold text-[var(--accent-gold)]">{r.box}</td>
              <td className="px-3 py-2.5">{r.label}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{r.amount === null ? "—" : amountLabel(r.amount)}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{r.adjustment === null ? "—" : amountLabel(r.adjustment)}</td>
              <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.displayVat ?? r.vat)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VehiclesPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["VEHICLES"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px] text-start text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
            <th className="px-3 py-2.5 text-start">{l("اللوحة", "Plate")}</th>
            <th className="px-3 py-2.5 text-start">{l("الإيراد", "Revenue")}</th>
            <th className="px-3 py-2.5 text-start">{l("التكلفة", "Cost")}</th>
            <th className="px-3 py-2.5 text-start">{l("الربح", "Profit")}</th>
            <th className="px-3 py-2.5 text-start">{l("الهامش %", "Margin %")}</th>
          </tr>
        </thead>
        <tbody className="divide-y theme-border">
          {section.rows.map((r) => (
            <tr key={r.plate} className="hover:bg-[var(--table-row-hover)]">
              <td className="px-3 py-2.5 font-mono font-bold">{r.plate}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.revenue)}</td>
              <td className="px-3 py-2.5 font-mono" dir="ltr">{amountLabel(r.cost)}</td>
              <td className="px-3 py-2.5 font-mono font-bold" dir="ltr">{amountLabel(r.profit)}</td>
              <td className="px-3 py-2.5 font-mono text-[var(--accent-gold)]" dir="ltr">{r.marginPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountsPreview({
  section,
  isEn,
}: {
  section: NonNullable<FinancialExportPreviewResponse["sections"]["ACCOUNTS"]>;
  isEn: boolean;
}) {
  const l = (ar: string, en: string) => (isEn ? en : ar);
  if (section.rows.length === 0) return <EmptyPreview isEn={isEn} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] text-start text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)]">
            <th className="px-3 py-2.5 text-start">{l("الرمز", "Code")}</th>
            <th className="px-3 py-2.5 text-start">{l("الاسم عربي", "Arabic Name")}</th>
            <th className="px-3 py-2.5 text-start">{l("الاسم إنجليزي", "English Name")}</th>
            <th className="px-3 py-2.5 text-start">{l("النوع", "Type")}</th>
            <th className="px-3 py-2.5 text-start">{l("المستوى", "Level")}</th>
            <th className="px-3 py-2.5 text-start">{l("الحالة", "Status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y theme-border">
          {section.rows.map((r) => (
            <tr key={r.code} className="hover:bg-[var(--table-row-hover)]">
              <td className="px-3 py-2.5 font-mono font-bold text-[var(--accent-gold)]">{r.code}</td>
              <td className="px-3 py-2.5 font-semibold">{r.nameAr}</td>
              <td className="px-3 py-2.5">{r.nameEn}</td>
              <td className="px-3 py-2.5 text-xs">{r.type}</td>
              <td className="px-3 py-2.5 text-xs">{r.isPosting ? l("فرعي", "Posting") : l("تجميعي", "Group")}</td>
              <td className="px-3 py-2.5">
                <Badge variant={r.isActive ? "success" : "outline"} className="text-[11px]">
                  {r.isActive ? l("نشط", "Active") : l("موقوف", "Inactive")}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
