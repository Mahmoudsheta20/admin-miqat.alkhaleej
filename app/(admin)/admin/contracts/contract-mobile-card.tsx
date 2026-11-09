"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Car,
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  MapPin,
  Phone,
  Plane,
  Users,
} from "lucide-react";
import { Badge, Card, CardContent, CardFooter, CardHeader } from "@/app/_components/ui";
import StatusBadge from "@/app/_components/StatusBadge";
import ContractActions from "./contract-actions";
import { cn } from "@/lib/utils";
import { useUiText } from "@/lib/ui-text";
import type { Contract, ContractStatus } from "@/lib/types";

export interface ContractMobileCardProps {
  contract: Contract;
  isRTL: boolean;
  isCopied: boolean;
  onCopyRef: (ref: string, e: MouseEvent<HTMLButtonElement>) => void;
  onPreviewPdf: (contract: Contract) => void;
  onReverseTrip: (contract: Contract) => void;
  onInspectOrManifest: (contract: Contract, focus?: "inspection" | "passengers") => void;
}

const STATUS_BADGE_MAP: Record<
  ContractStatus,
  {
    label: string;
    variant: "success" | "destructive" | "secondary" | "warning";
  }
> = {
  APPROVED: { label: "معتمد", variant: "success" },
  ACTIVE: { label: "نشط", variant: "success" },
  REJECTED: { label: "مرفوض", variant: "destructive" },
  CANCELLED: { label: "ملغي", variant: "destructive" },
  EXPIRED: { label: "منتهي", variant: "secondary" },
  PENDING_REVIEW: { label: "قيد المراجعة", variant: "warning" },
};

export default function ContractMobileCard({
  contract: c,
  isRTL,
  isCopied,
  onCopyRef,
  onPreviewPdf,
  onReverseTrip,
  onInspectOrManifest,
}: ContractMobileCardProps) {
  const ui = useUiText();
  const isInspected = Boolean(c.inspectionId || c.inspection);
  const passengersCount = c.passengers?.length || 0;
  const statusInfo = c.status ? STATUS_BADGE_MAP[c.status] : undefined;
  const customerInitial = c.customerName?.trim().charAt(0) || "ع";

  return (
    <Card className="theme-card border theme-border shadow-xs rounded-2xl overflow-hidden transition-colors">
      <article className="flex flex-col">
        {/* Header: Contract # + Status, followed by Customer, Contact, Operation & Flight */}
        <CardHeader className="p-4 pb-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight flex items-center gap-1 min-w-0">
              <Link
                href={`/admin/contracts/${c.id}`}
                className="font-mono font-semibold text-amber-700 dark:text-amber-400 hover:underline truncate min-h-11 inline-flex items-center"
              >
                <bdi>{c.referenceNumber}</bdi>
              </Link>
              <button
                type="button"
                onClick={(e) => onCopyRef(c.referenceNumber, e)}
                className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition shrink-0 cursor-pointer"
                title={ui("نسخ رقم العقد")}
                aria-label={`${ui("نسخ رقم العقد")} ${c.referenceNumber}`}
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </h3>

            {statusInfo && (
              <Badge variant={statusInfo.variant} className="text-[11px] shrink-0 border">
                {ui(statusInfo.label)}
              </Badge>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t theme-border">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border theme-border text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0"
                >
                  {customerInitial}
                </span>
                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {c.customerName}
                </span>
              </div>

              {c.customerPhone && (
                <a
                  href={`tel:${c.customerPhone}`}
                  dir="ltr"
                  aria-label={`${ui("الاتصال بالعميل")} ${c.customerName}`}
                  className="inline-flex items-center gap-1.5 min-h-11 px-2.5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] text-xs font-mono font-medium text-amber-700 dark:text-amber-400 hover:border-amber-500/50 transition shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{c.customerPhone}</span>
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge type="operation" status={c.operationType} size="sm" />
              {c.flightNumber && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 font-mono text-[11px] font-semibold">
                  <Plane className="w-3 h-3 text-blue-500" aria-hidden="true" />
                  <bdi>
                    {c.flightCarrier ? `${c.flightCarrier} • ` : ""}
                    {c.flightNumber}
                  </bdi>
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Body: Organized in 3 clean bands (Route & Schedule, Assignment, Operational Checks) */}
        <CardContent className="px-4 pt-0 pb-3.5 space-y-2.5 text-xs">
          {/* 1. Full-Width Route & Trip Schedule */}
          <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3 space-y-2">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>{ui("مسار الرحلة")}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  <bdi className="break-words">{c.origin}</bdi>
                </span>
                {isRTL ? (
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                )}
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <bdi className="break-words">{c.destination}</bdi>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t theme-border flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {ui("موعد الرحلة")}
              </span>
              <span className="inline-flex items-center gap-2 font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                  <bdi dir="ltr">{c.tripDate}</bdi>
                </span>
                {c.tripTime && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      <bdi dir="ltr">{c.tripTime}</bdi>
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 2. Atomic Crew & Fleet Assignment */}
          <dl className="grid grid-cols-2 gap-2.5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3">
            <div className="min-w-0 space-y-0.5">
              <dt className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                {ui("الكابتن")}
              </dt>
              <dd className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                <span className="truncate">{c.captain?.name || ui("الكابتن")}</span>
              </dd>
            </div>

            <div className="min-w-0 space-y-0.5">
              <dt className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                {ui("المركبة")}
              </dt>
              <dd className="text-xs font-semibold font-mono text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
                <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                <bdi className="truncate">{c.vehiclePlate}</bdi>
              </dd>
            </div>
          </dl>

          {/* 3. Interactive Operational Compliance & Passenger Manifest Summary */}
          <div className="grid grid-cols-[1.45fr_1fr] gap-2">
            <button
              type="button"
              onClick={() => onInspectOrManifest(c, "inspection")}
              className={cn(
                "min-h-11 w-full rounded-xl border px-3 py-2 text-start transition flex items-center justify-between gap-2 cursor-pointer",
                isInspected
                  ? "border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 text-amber-800 dark:text-amber-300",
              )}
              title={ui("تفاصيل الفحص")}
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">
                  {ui("الفحص التشغيلي")}
                </span>
                <span className="block text-xs font-semibold leading-tight mt-0.5">
                  {ui(isInspected ? "مفحوص" : "بانتظار الفحص")}
                </span>
              </span>
              {isInspected ? (
                <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onInspectOrManifest(c, "passengers")}
              className="min-h-11 w-full rounded-xl border theme-border bg-[var(--bg-card-subtle)] hover:border-amber-500/50 hover:bg-amber-500/5 px-3 py-2 text-start transition flex items-center justify-between gap-2 cursor-pointer"
              title={ui("كشف الركاب")}
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-[var(--text-muted)] leading-tight">
                  {ui("الركاب")}
                </span>
                <span className="block text-xs font-semibold leading-tight mt-0.5 text-slate-900 dark:text-white">
                  <span className="font-mono tabular-nums">{passengersCount}</span> {ui("ركاب")}
                </span>
              </span>
              <Users className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
            </button>
          </div>

          {c.reviewNotes && (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-800 dark:text-rose-300">
              <span className="font-semibold">{ui("ملاحظة المراجعة")}: </span>
              <span>{c.reviewNotes}</span>
            </div>
          )}
        </CardContent>

        {/* Footer: Full-width Contract Actions */}
        <CardFooter className="mt-0 px-4 py-3 border-t theme-border bg-slate-50/50 dark:bg-slate-900/35">
          <ContractActions
            contractId={c.id}
            onPreview={() => onPreviewPdf(c)}
            onReverse={() => onReverseTrip(c)}
            isFullWidth
          />
        </CardFooter>
      </article>
    </Card>
  );
}

