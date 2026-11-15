"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCode2,
  FileText,
  Loader2,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import Modal from "@/app/_components/Modal";
import { Money } from "@/app/_components/ui";
import { useApiQuery } from "@/lib/use-api-query";
import { useUiText } from "@/lib/ui-text";
import {
  AUDIT_LABELS,
  dateLabel,
  OUTCOME_LABELS,
  STATUS_LABELS,
  zatcaRequest,
} from "@/lib/zatca";
import {
  buildZatcaInvoicesQueryPath,
  downloadZatcaArtifact,
  zatcaQrImageUrl,
  type ElectronicInvoiceDetail,
  type ElectronicInvoiceListResponse,
  type ExtendedEgsUnit,
} from "./zatca-helpers";

interface ElectronicInvoicesSectionProps {
  disabled: boolean;
  egsUnits: ExtendedEgsUnit[];
  canWrite: boolean;
  canApprove: boolean;
  refreshSignal?: number;
}

const INPUT =
  "theme-input min-h-11 sm:min-h-9 rounded-lg px-2.5 py-1 text-xs font-semibold";
const DETAIL_LOAD_FAILED = "__DETAIL_LOAD_FAILED__";

function ZatcaQrThumb({ invoiceId }: { invoiceId: string }) {
  const ui = useUiText();
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    void fetch(zatcaQrImageUrl(invoiceId), {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoiceId]);

  if (failed || !src) return null;
  return (
    <div className="rounded-xl border theme-border bg-white p-2.5 text-center inline-block">
      <Image
        src={src}
        alt={ui.language === "en" ? "ZATCA Electronic QR" : "رمز QR الإلكتروني"}
        width={132}
        height={132}
        unoptimized
        className="mx-auto rounded"
      />
    </div>
  );
}

export default function ElectronicInvoicesSection({
  disabled,
  egsUnits,
  canWrite,
  canApprove,
  refreshSignal = 0,
}: ElectronicInvoicesSectionProps) {
  const ui = useUiText();
  const text = (ar: string, en: string) => (ui.language === "en" ? en : ar);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [profile, setProfile] = useState("");
  const [egsId, setEgsId] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [deliverableOnly, setDeliverableOnly] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ElectronicInvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [artifactBusy, setArtifactBusy] = useState<string | null>(null);

  function selectInvoiceDetail(id: string | null) {
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setConfirmIssue(false);
    setActionFeedback("");
    setDetailLoading(Boolean(id));
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const queryPath = useMemo(
    () =>
      disabled
        ? null
        : buildZatcaInvoicesQueryPath({
            page,
            status,
            kind,
            profile,
            egsId,
            overdue,
            deliverableOnly,
            search: debouncedSearch,
          }),
    [disabled, page, status, kind, profile, egsId, overdue, deliverableOnly, debouncedSearch],
  );

  const query = useApiQuery<ElectronicInvoiceListResponse>(queryPath, refreshSignal);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void zatcaRequest<ElectronicInvoiceDetail>(`/invoices/${encodeURIComponent(selectedId)}`).then(
      (res) => {
        if (!active) return;
        setDetailLoading(false);
        if (res.data) setDetail(res.data);
        else setDetailError(res.error || DETAIL_LOAD_FAILED);
      },
    );
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function reloadDetail(targetId: string) {
    setDetailLoading(true);
    setDetailError("");
    const res = await zatcaRequest<ElectronicInvoiceDetail>(`/invoices/${encodeURIComponent(targetId)}`);
    setDetailLoading(false);
    if (res.data) setDetail(res.data);
    else setDetailError(res.error || text("تعذر التحديث", "Failed to reload"));
  }

  async function runInvoiceAction(
    endpoint: "validate" | "issue" | "retry",
    body: unknown,
    successText: string,
  ) {
    if (!selectedId) return;
    setActionBusy(true);
    setDetailError("");
    setActionFeedback("");
    try {
      const res = await zatcaRequest(
        `/invoices/${encodeURIComponent(selectedId)}/${endpoint}`,
        "POST",
        body,
      );
      if (res.success) {
        setActionFeedback(successText);
        setConfirmIssue(false);
        await reloadDetail(selectedId);
        query.refetch();
      } else {
        setDetailError(res.error || text("تعذر تنفيذ الإجراء", "Action failed"));
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDownloadArtifact(id: string, artifactKind: "PDF" | "XML" | "QR") {
    setArtifactBusy(artifactKind);
    setDetailError("");
    try {
      await downloadZatcaArtifact(id, artifactKind);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : text("تعذر التنزيل", "Download failed"));
    } finally {
      setArtifactBusy(null);
    }
  }

  if (disabled) return null;

  const isNotFound = !query.data && query.status === 404;
  const items = query.data?.items || [];
  const totalPages = Math.max(1, Math.ceil((query.data?.total || 0) / 30));
  const hasFilters = Boolean(search || status || kind || profile || egsId || overdue || deliverableOnly);

  return (
    <section className="theme-card rounded-2xl border theme-border p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{text("سجل الفوترة الإلكترونية (المرحلة الثانية)", "Phase-2 Electronic Invoices Queue")}</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {text(
              "متابعة الاعتماد، الإبلاغ خلال 24 ساعة، إعادة الإرسال، وتنزيل ملفات XML و PDF.",
              "Track clearance, 24h simplified reporting, submission retries, and XML/PDF artifacts.",
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => query.refetch()}
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-1.5 text-xs font-bold hover:border-[var(--accent-gold)] transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${query.isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          <span>{text("تحديث السجل", "Refresh")}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
        <input
          type="search"
          placeholder={text("بحث بالرقم أو العميل أو UUID…", "Search number, buyer, UUID…")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={`${INPUT} lg:col-span-2`}
        />
        <select
          aria-label={text("حالة الهيئة", "ZATCA status")}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={INPUT}
        >
          <option value="">{text("كل الحالات", "All Statuses")}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {text(v, k)}
            </option>
          ))}
        </select>
        <select
          aria-label={text("النوع", "Kind")}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(1);
          }}
          className={INPUT}
        >
          <option value="">{text("كل الأنواع", "All Kinds")}</option>
          <option value="INVOICE">{text("فاتورة", "Invoice")}</option>
          <option value="CREDIT">{text("إشعار دائن", "Credit Note")}</option>
          <option value="DEBIT">{text("إشعار مدين", "Debit Note")}</option>
        </select>
        <select
          aria-label={text("النموذج", "Profile")}
          value={profile}
          onChange={(e) => {
            setProfile(e.target.value);
            setPage(1);
          }}
          className={INPUT}
        >
          <option value="">{text("كل النماذج", "All Profiles")}</option>
          <option value="STANDARD">{text("قياسية B2B", "Standard B2B")}</option>
          <option value="SIMPLIFIED">{text("مبسطة B2C", "Simplified B2C")}</option>
        </select>
        <select
          aria-label={text("جهاز الفوترة", "EGS unit")}
          value={egsId}
          onChange={(e) => {
            setEgsId(e.target.value);
            setPage(1);
          }}
          className={INPUT}
        >
          <option value="">{text("كل الأجهزة", "All EGS Units")}</option>
          {egsUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.identity}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
        <label className="inline-flex min-h-9 items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => {
              setOverdue(e.target.checked);
              setPage(1);
            }}
            className="size-4 accent-amber-600"
          />
          <span>{text("متأخرة عن مهلة 24 ساعة فقط", "Overdue (>24h) only")}</span>
        </label>
        <label className="inline-flex min-h-9 items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={deliverableOnly}
            onChange={(e) => {
              setDeliverableOnly(e.target.checked);
              setPage(1);
            }}
            className="size-4 accent-amber-600"
          />
          <span>{text("قابلة للتسليم للعميل فقط", "Deliverable only")}</span>
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setKind("");
              setProfile("");
              setEgsId("");
              setOverdue(false);
              setDeliverableOnly(false);
              setPage(1);
            }}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--control-border)] px-2.5 py-1 text-[var(--accent-gold)] hover:border-[var(--accent-gold)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{text("مسح التصفية", "Clear")}</span>
          </button>
        )}
      </div>

      {isNotFound ? (
        <p className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 text-xs sm:text-sm text-[var(--text-muted)]">
          {text(
            "نقطة عرض الفواتير الإلكترونية غير متاحة في هذه البيئة التجريبية.",
            "Electronic invoice queue endpoint is unavailable in this environment.",
          )}
        </p>
      ) : query.error && query.status !== 409 ? (
        <p role="alert" className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 text-xs font-bold text-rose-700 dark:text-rose-300">
          {query.error}
        </p>
      ) : query.isLoading && !query.data ? (
        <div role="status" className="py-10 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />
          <span className="text-xs text-[var(--text-muted)]">{text("جارٍ تحميل السجل…", "Loading queue…")}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-xs sm:text-sm text-[var(--text-muted)]">
          {text(
            "لا توجد فواتير إلكترونية مطابقة للمعايير المحددة.",
            "No Phase-2 electronic invoices match the current filters.",
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)] font-bold whitespace-nowrap">
                  <th className="p-3">{text("الرقم", "Number")}</th>
                  <th className="p-3">{text("العميل", "Buyer")}</th>
                  <th className="p-3">{text("النوع / الجهاز", "Type / EGS")}</th>
                  <th className="p-3">{text("الإجمالي", "Total")}</th>
                  <th className="p-3">{text("الحالة", "Status")}</th>
                  <th className="p-3 text-end">{text("الإجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="p-3 font-mono font-bold whitespace-nowrap" dir="ltr">
                      <div>{row.invoiceNumber || text("مسودة", "DRAFT")}</div>
                      <div className="text-[11px] font-normal text-[var(--text-muted)]">
                        {dateLabel(row.createdAt, ui.language)}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-[var(--text-main)]">
                      {row.customerName || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold">
                        {row.kind} · {row.profile}
                      </div>
                      {row.egs && (
                        <div className="text-[11px] text-[var(--text-muted)] font-mono" dir="ltr">
                          {row.egs.identity} ({row.egs.environment})
                        </div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono">
                      <Money amount={row.totalAmount} size="xs" />
                    </td>
                    <td className="p-3 whitespace-nowrap space-y-1">
                      <span className="inline-block rounded-full border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-0.5 font-bold">
                        {text(STATUS_LABELS[row.status] || row.status, row.status)}
                      </span>
                      {row.authorityOutcome && (
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {text(
                            OUTCOME_LABELS[row.authorityOutcome] || row.authorityOutcome,
                            row.authorityOutcome,
                          )}
                        </div>
                      )}
                      {row.isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[11px] font-bold">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {text("تجاوزت 24 ساعة", "Overdue >24h")}
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-end">
                        <button
                          type="button"
                          onClick={() => selectInvoiceDetail(row.id)}
                          className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1 font-bold hover:border-[var(--accent-gold)] transition cursor-pointer"
                        >
                        <Eye className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                        <span>{text("التفاصيل", "Inspect")}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs font-bold">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 rounded-lg border border-[var(--control-border)] px-3 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 ltr:rotate-180" aria-hidden="true" />
                <span>{text("السابق", "Previous")}</span>
              </button>
              <span className="font-mono text-[var(--text-muted)]">
                {page} / {totalPages} ({query.data?.total || 0})
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 rounded-lg border border-[var(--control-border)] px-3 disabled:opacity-40 cursor-pointer"
              >
                <span>{text("التالي", "Next")}</span>
                <ChevronLeft className="w-4 h-4 ltr:rotate-180" aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail & Operations Modal */}
      {selectedId && (
        <Modal
          label={text("تفاصيل الفاتورة الإلكترونية", "Electronic Invoice Details")}
          onClose={() => !actionBusy && selectInvoiceDetail(null)}
          isBusy={actionBusy}
        >
          <div className="mobile-dialog-panel theme-card w-full max-w-2xl rounded-3xl border theme-border p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-base font-bold text-[var(--text-main)]">
                {detail?.invoiceNumber || text("تفاصيل الفاتورة الإلكترونية", "Electronic Invoice Details")}
              </h3>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => selectInvoiceDetail(null)}
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg border border-[var(--control-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                aria-label={text("إغلاق", "Close")}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {detailError && (
              <p role="alert" className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
                {detailError === DETAIL_LOAD_FAILED
                  ? text("تعذر تحميل تفاصيل الفاتورة", "Unable to load invoice details")
                  : detailError}
              </p>
            )}
            {actionFeedback && (
              <p role="status" className="rounded-xl border border-emerald-600/35 bg-emerald-500/12 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {actionFeedback}
              </p>
            )}

            {detailLoading && !detail ? (
              <div className="py-10 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-gold)] mx-auto" />
              </div>
            ) : detail ? (
              <div className="space-y-4 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 font-bold">
                      <span className="rounded-full border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-0.5">
                        {text(STATUS_LABELS[detail.status] || detail.status, detail.status)}
                      </span>
                      {detail.authorityOutcome && (
                        <span className="rounded-full border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-0.5">
                          {text(OUTCOME_LABELS[detail.authorityOutcome] || detail.authorityOutcome, detail.authorityOutcome)}
                        </span>
                      )}
                      {detail.icv !== null && detail.icv !== undefined && (
                        <span className="rounded-full border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-0.5 font-mono">
                          ICV #{detail.icv}
                        </span>
                      )}
                    </div>
                    {detail.uuid && (
                      <p className="font-mono text-[11px] text-[var(--text-muted)] break-all" dir="ltr">
                        UUID: {detail.uuid}
                      </p>
                    )}
                    <div className="font-mono text-sm font-bold text-[var(--text-main)]" dir="ltr">
                      Net: {detail.netAmount ?? detail.snapshot?.totals?.net ?? "0.00"} · VAT: {detail.vatAmount} · Gross: {detail.totalAmount} SAR
                    </div>
                    {detail.creditBalance && detail.kind === "INVOICE" && (
                      <p className="text-emerald-700 dark:text-emerald-300 font-bold font-mono" dir="ltr">
                        Available to Credit: {detail.creditBalance.availableGross} SAR
                      </p>
                    )}
                    {detail.originalInvoice && (
                      <div className="pt-1">
                        <span className="text-[var(--text-muted)]">{text("الأصل:", "Original:")} </span>
                        <button
                          type="button"
                          onClick={() => selectInvoiceDetail(detail.originalInvoice?.id || null)}
                          className="font-mono font-bold text-[var(--accent-gold)] hover:underline cursor-pointer"
                        >
                          {detail.originalInvoice.invoiceNumber || detail.originalInvoice.id.slice(0, 8)}
                        </button>
                      </div>
                    )}
                  </div>

                  {detail.deliverable && <ZatcaQrThumb invoiceId={detail.id} />}
                </div>

                {/* Artifacts */}
                {detail.artifacts && detail.artifacts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t theme-border">
                    {(["PDF", "XML", "QR"] as const).map((artifactKind) => (
                      <button
                        key={artifactKind}
                        type="button"
                        disabled={artifactBusy !== null}
                        onClick={() => void handleDownloadArtifact(detail.id, artifactKind)}
                        className="inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] px-3 py-1 font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition cursor-pointer"
                      >
                        {artifactKind === "XML" ? (
                          <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : artifactKind === "QR" ? (
                          <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {artifactBusy === artifactKind
                            ? text("جارٍ التحميل…", "Downloading…")
                            : `${text("تنزيل", "Download")} ${artifactKind}`}
                        </span>
                        <Download className="w-3 h-3" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Lifecycle Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t theme-border">
                  {canWrite && detail.status === "DRAFT" && (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() =>
                        void runInvoiceAction(
                          "validate",
                          {},
                          text("تم اعتماد جاهزية المسودة للإصدار.", "Draft validated and marked READY."),
                        )
                      }
                      className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-1.5 font-bold hover:border-[var(--accent-gold)] cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                      <span>{text("اعتماد الجاهزية (Validate)", "Mark Ready")}</span>
                    </button>
                  )}

                  {canApprove && (detail.status === "DRAFT" || detail.status === "READY") && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 w-full">
                      <label className="inline-flex items-center gap-2 font-bold cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={confirmIssue}
                          onChange={(e) => setConfirmIssue(e.target.checked)}
                          className="size-4 accent-amber-600"
                        />
                        <span>
                          {text(
                            "أؤكد توقيع وإرسال هذه الفاتورة رسمياً لبوابة هيئة الزكاة.",
                            "Confirm official signing and ZATCA submission (irreversible).",
                          )}
                        </span>
                      </label>
                      <button
                        type="button"
                        disabled={actionBusy || !confirmIssue}
                        onClick={() =>
                          void runInvoiceAction(
                            "issue",
                            { confirmIssuance: true },
                            text("تم توقيع الفاتورة وبدء الإرسال للهيئة.", "Invoice signed and queued for ZATCA."),
                          )
                        }
                        className="gold-gradient-btn inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 rounded-lg px-3.5 py-1 font-bold disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{text("إصدار وإرسال للهيئة", "Issue to ZATCA")}</span>
                      </button>
                    </div>
                  )}

                  {canApprove &&
                    (detail.status === "TRANSMISSION_FAILED" ||
                      detail.status === "PENDING_REPORTING" ||
                      detail.status === "PENDING_CLEARANCE") && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          void runInvoiceAction(
                            "retry",
                            {},
                            text("تمت إعادة جدولة الإرسال للهيئة.", "ZATCA submission retried."),
                          )
                        }
                        className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] px-3 py-1.5 font-bold text-[var(--accent-gold)] cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{text("إعادة محاولة الإرسال", "Retry ZATCA Submission")}</span>
                      </button>
                    )}
                </div>

                {/* Job & Submissions */}
                {detail.job?.lastError && (
                  <p role="alert" className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-300 font-semibold">
                    {text("آخر خطأ في الطابور:", "Queue error:")} {detail.job.lastError}
                  </p>
                )}

                {detail.submissions && detail.submissions.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t theme-border">
                    <h4 className="font-bold text-[var(--text-main)]">
                      {text("محاولات الإرسال للهيئة", "Submission Attempts")}
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {detail.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-lg border theme-border bg-[var(--bg-card-subtle)] p-2.5 flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-bold">#{sub.attempt}</span>{" "}
                            {sub.outcome && (
                              <span>
                                · {text(OUTCOME_LABELS[sub.outcome] || sub.outcome, sub.outcome)}
                              </span>
                            )}{" "}
                            {sub.httpStatus ? `(HTTP ${sub.httpStatus})` : ""}{" "}
                            {sub.errorCode && (
                              <span className="text-rose-700 dark:text-rose-300 font-mono">
                                [{sub.errorCode}]
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-[var(--text-muted)]" dir="ltr">
                            {dateLabel(sub.attemptedAt, ui.language)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Trail */}
                {detail.audit && detail.audit.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t theme-border">
                    <h4 className="font-bold text-[var(--text-main)]">
                      {text("سجل العمليات (Audit)", "Audit Trail")}
                    </h4>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {detail.audit.map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                          <span className="font-semibold text-[var(--text-main)]">
                            {text(AUDIT_LABELS[ev.action] || ev.action, ev.action)}
                          </span>
                          <span className="font-mono" dir="ltr">
                            {dateLabel(ev.createdAt, ui.language)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </section>
  );
}
