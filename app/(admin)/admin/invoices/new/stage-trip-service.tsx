"use client";

import { ArrowLeft, ArrowRight, ChevronDown, HelpCircle, Truck } from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import type { InvoiceBooking } from "@/lib/invoice-booking";
import type { TransportDetails } from "@/lib/invoice-transport";
import type { Vehicle } from "@/lib/types";
import BookingFields from "./booking-fields";
import TransportFields from "./transport-fields";
import type { InvoiceContractOption } from "./contract-picker";

interface StageTripServiceProps {
  booking: InvoiceBooking;
  transport: TransportDetails;
  vehicles: Vehicle[];
  isLoadingVehicles: boolean;
  vehicleError: string;
  selectedContract: InvoiceContractOption | null;
  hasTransportError: boolean;
  showSupplementalTrip: boolean;
  onToggleSupplementalTrip: () => void;
  onSelectContract: (c: InvoiceContractOption) => void;
  onRetryVehicles: () => void;
  onBookingChange: (change: Partial<InvoiceBooking>) => void;
  onTransportChange: (change: Partial<TransportDetails>) => void;
  onTransportReplace: (next: TransportDetails) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StageTripService({
  booking,
  transport,
  vehicles,
  isLoadingVehicles,
  vehicleError,
  selectedContract,
  hasTransportError,
  showSupplementalTrip,
  onToggleSupplementalTrip,
  onSelectContract,
  onRetryVehicles,
  onBookingChange,
  onTransportChange,
  onTransportReplace,
  onBack,
  onNext,
}: StageTripServiceProps) {
  const ui = useUiText();

  return (
    <div className="space-y-5">
      <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
        <div className="border-b theme-border pb-3.5 mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
            {ui("مسار الرحلة ومواعيدها")}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            {ui("حدد نوع الرحلة، محطة الانطلاق، وجهة الوصول، والتاريخ")}
          </p>
        </div>

        <BookingFields
          booking={booking}
          transport={transport}
          vehicles={vehicles}
          isLoadingVehicles={isLoadingVehicles}
          vehicleError={vehicleError}
          selectedContract={selectedContract}
          onSelectContract={onSelectContract}
          onRetryVehicles={onRetryVehicles}
          onBookingChange={onBookingChange}
          onTransportChange={onTransportChange}
        />

        <div className="mt-4 rounded-xl border border-sky-600/25 bg-sky-500/10 p-3 text-xs sm:text-sm text-[var(--text-main)] flex items-center gap-2">
          <HelpCircle className="size-4 text-sky-700 dark:text-sky-400 shrink-0" />
          <span>
            {ui(
              "ملاحظة: تظهر في نسخة العميل المطبوعة أعداد الركاب الإجمالية؛ تفاصيل الأسماء والهويات تُراجع من سجل العقد والرحلة.",
            )}
          </span>
        </div>
      </section>

      {/* Collapsible Supplemental Details: Driver, Odometer, Distance */}
      <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
        <button
          type="button"
          aria-expanded={showSupplementalTrip}
          onClick={onToggleSupplementalTrip}
          className="flex min-h-11 sm:min-h-9 w-full items-center justify-between gap-3 text-start cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Truck
              className="size-4 sm:size-5 text-[var(--accent-gold)] shrink-0"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                {ui("تفاصيل الرحلة التشغيلية الإضافية (اختياري)")}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {ui(
                  "بيانات السائق، قراءة العداد، المسافة المقطوعة، وملاحظات التشغيل",
                )}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`size-4 text-[var(--text-muted)] transition-transform shrink-0 ${showSupplementalTrip ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {showSupplementalTrip && (
          <div className="mt-4 pt-4 border-t theme-border">
            <TransportFields
              isSupplemental
              value={transport}
              hasValidationError={hasTransportError}
              onChange={onTransportReplace}
            />
          </div>
        )}
      </section>

      {/* Stage 2 Stepper Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] transition cursor-pointer"
        >
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
          <span>{ui("السابق")}</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm hover:shadow-md transition"
        >
          <span>{ui("المتابعة: السعر والضريبة")}</span>
          <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
