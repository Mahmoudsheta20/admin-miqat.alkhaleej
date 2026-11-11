"use client";
import { useUiText } from "@/lib/ui-text";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, FileText, Loader2, MapPin, Calendar, Plane, Car, Users } from "lucide-react";
import { backendUrl, type ApiResult } from "@/lib/backend";
import type { ContractStatus } from "@/lib/types";

interface PublicContractProps {
  refNumber: string;
}

interface ContractVerification {
  id: string;
  referenceNumber: string;
  status: ContractStatus;
  issueDate: string | null;
  operationType?: string;
  origin?: string;
  destination?: string;
  tripDate?: string;
  tripTime?: string;
  flightCarrier?: string | null;
  flightNumber?: string | null;
  customerName?: string;
  customerPhone?: string | null;
  vehiclePlate?: string;
  pdfPath?: string | null;
  captain?: {
    name: string;
    phone: string;
  } | null;
  passengers?: {
    name: string;
    nationality: string;
    idNumber: string;
  }[];
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING_REVIEW: "قيد المراجعة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  CANCELLED: "ملغي",
};

export default function PublicContract({ refNumber }: PublicContractProps) {
  const ui = useUiText();

  const [contract, setContract] = useState<ContractVerification | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          backendUrl(`/contracts/verify/${encodeURIComponent(refNumber)}`),
          {
            credentials: "omit",
            cache: "no-store",
            signal: controller.signal,
          }
        );
        if (response.status === 404) {
          throw new Error("العقد غير متاح");
        }
        if (!response.ok) {
          throw new Error("تعذر الاتصال بخدمة التوثيق");
        }
        const result: ApiResult<ContractVerification> = await response.json();
        if (!result.success || !result.data) {
          throw new Error("تعذر التحقق من العقد");
        }
        if (!controller.signal.aborted) {
          setContract(result.data);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : "تعذر الاتصال بخدمة التوثيق"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [refNumber]);

  const fallbackPdfUrl = backendUrl(
    `/contracts/verify/${encodeURIComponent(refNumber)}/pdf`
  );
  const directPdfUrl =
    contract?.pdfPath && /^https?:\/\//i.test(contract.pdfPath)
      ? contract.pdfPath
      : fallbackPdfUrl;

  const pdfViewUrl = directPdfUrl;
  const pdfDownloadUrl = backendUrl(
    `/contracts/verify/${encodeURIComponent(refNumber)}/pdf?download=1`
  );

  async function download() {
    if (!contract) return;
    setIsDownloading(true);
    setError("");
    try {
      const response = await fetch(pdfDownloadUrl, {
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      });
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("application/pdf")
      ) {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = `Contract_${contract.referenceNumber}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      window.open(directPdfUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(directPdfUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main
      className="grid min-h-dvh place-items-center bg-[var(--bg-main)] px-4 py-10"
      dir={ui.dir}
    >
      <section className="theme-card w-full max-w-xl rounded-2xl p-6 sm:p-8 border theme-border shadow-lg">
        <Image
          src="/logo.svg"
          alt={ui("ميقات الخليج")}
          width={144}
          height={54}
          className="mx-auto mb-6 h-auto"
          loading="eager"
        />

        {isLoading ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]"
          >
            <Loader2 className="size-4 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />
            {ui("جارٍ التحقق من العقد…")}
          </p>
        ) : contract ? (
          <>
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-500/12 px-4 py-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300 border border-emerald-600/35 dark:border-emerald-500/35">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {ui("عقد رسمي مسجل في نظام الشركة")}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[var(--text-main)]">
                  {ui("توثيق عقد ميقات الخليج")}
                </h1>
                <p
                  className="mt-1 font-mono text-base sm:text-lg font-semibold text-[var(--accent-gold)]"
                  dir="ltr"
                >
                  {contract.referenceNumber}
                </p>
              </div>
              <span className="rounded-full bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 px-3 py-1 text-xs font-bold text-[var(--accent-gold)]">
                {ui(STATUS_LABELS[contract.status])}
              </span>
            </div>

            {/* Primary Download & View Actions */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => void download()}
                className="gold-gradient-btn flex min-h-11 sm:min-h-9 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isDownloading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                {ui(isDownloading ? "جارٍ تجهيز النسخة…" : "تنزيل العقد PDF")}
              </button>

              <a
                href={pdfViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 sm:min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-subtle)] px-4 py-2 text-xs sm:text-sm font-bold text-[var(--text-main)] transition-all duration-200"
              >
                <ExternalLink className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
                {ui("معاينة العقد PDF")}
              </a>
            </div>

            {/* Operational Details */}
            <dl className="mt-6 space-y-3.5 text-sm">
              {contract.origin && contract.destination && (
                <div className="flex items-start justify-between gap-4 rounded-xl bg-[var(--bg-card-subtle)] border theme-border p-3.5">
                  <dt className="flex items-center gap-2 text-[var(--text-muted)] font-medium shrink-0">
                    <MapPin className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
                    {ui("خط السير")}
                  </dt>
                  <dd className="font-bold text-[var(--text-main)] text-end">
                    {contract.origin} {ui.dir === "rtl" ? "⟵" : "→"} {contract.destination}
                  </dd>
                </div>
              )}

              {(contract.tripDate || contract.tripTime) && (
                <div className="flex justify-between gap-4 border-b theme-border pb-3">
                  <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Calendar className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
                    {ui("موعد الرحلة")}
                  </dt>
                  <dd className="font-mono font-bold text-[var(--text-main)]" dir="ltr">
                    {contract.tripDate} {contract.tripTime || ""}
                  </dd>
                </div>
              )}

              {contract.flightCarrier && (
                <div className="flex justify-between gap-4 border-b theme-border pb-3">
                  <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Plane className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
                    {ui("رحلة الطيران")}
                  </dt>
                  <dd className="font-bold text-[var(--text-main)]">
                    {contract.flightCarrier}{" "}
                    <span className="font-mono">{contract.flightNumber || ""}</span>
                  </dd>
                </div>
              )}

              {contract.captain?.name && (
                <div className="flex justify-between gap-4 border-b theme-border pb-3">
                  <dt className="text-[var(--text-muted)]">{ui("الكابتن المسؤول")}</dt>
                  <dd className="font-bold text-[var(--text-main)]">{contract.captain.name}</dd>
                </div>
              )}

              {contract.vehiclePlate && (
                <div className="flex justify-between gap-4 border-b theme-border pb-3">
                  <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Car className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
                    {ui("رقم اللوحة")}
                  </dt>
                  <dd className="font-mono font-bold text-[var(--text-main)]">{contract.vehiclePlate}</dd>
                </div>
              )}

              {contract.customerName && (
                <div className="flex justify-between gap-4 border-b theme-border pb-3">
                  <dt className="text-[var(--text-muted)]">{ui("الضيف الرئيسي")}</dt>
                  <dd className="font-bold text-[var(--text-main)]">{contract.customerName}</dd>
                </div>
              )}

              {contract.issueDate && (
                <div className="flex justify-between gap-4 pb-1">
                  <dt className="text-[var(--text-muted)]">{ui("تاريخ الإصدار")}</dt>
                  <dd className="font-mono text-[var(--text-main)]" dir="ltr">
                    {contract.issueDate}
                  </dd>
                </div>
              )}
            </dl>

            {/* Passenger Manifest */}
            {contract.passengers && contract.passengers.length > 0 && (
              <div className="mt-6 rounded-xl border theme-border overflow-hidden">
                <div className="bg-[var(--bg-card-subtle)] px-4 py-2.5 flex items-center justify-between border-b theme-border">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-[var(--text-main)]">
                    <Users className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                    {ui("كشف الركاب المعتمد")}
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--accent-gold)]">
                    {`${contract.passengers.length} ${ui("راكب")}`}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y theme-border text-xs">
                  {contract.passengers.map((p, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2.5 flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-[var(--text-main)]">
                        <span className="font-mono text-[var(--text-muted)] me-2">
                          {idx + 1}.
                        </span>
                        {p.name}
                      </span>
                      <span className="text-[var(--text-muted)] font-mono">
                        {p.nationality} {p.idNumber ? `• ${p.idNumber}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-6 text-center">
            <FileText className="mx-auto mb-4 size-8 text-[var(--text-muted)]" aria-hidden="true" />
            <h1 className="text-lg font-bold text-[var(--text-main)]">{ui("العقد غير متاح")}</h1>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 text-center text-sm leading-relaxed text-rose-700 dark:text-rose-300"
          >
            {ui(error)}
          </p>
        )}

        {!isLoading && !contract && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 min-h-11 sm:min-h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-main)] px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer transition"
          >
            {ui("إعادة المحاولة")}
          </button>
        )}
      </section>
    </main>
  );
}
