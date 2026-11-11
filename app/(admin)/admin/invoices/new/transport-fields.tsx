"use client";
import { useUiText } from "@/lib/ui-text";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  distanceDelta,
  TRANSPORT_SERVICE_LABELS,
  type TransportDetails,
} from "@/lib/invoice-transport";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
interface TransportFieldsProps {
  value: TransportDetails;
  onChange: (value: TransportDetails) => void;
  hasValidationError?: boolean;
  isSupplemental?: boolean;
}
interface TransportField {
  key: keyof TransportDetails;
  label: string;
  type?: string;
  required?: boolean;
}
const INLINE_INPUT =
  "theme-input min-h-11 sm:min-h-9 w-full min-w-0 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";
const INPUT = `mt-1.5 ${INLINE_INPUT}`;
const CORE: TransportField[] = [
  { key: "origin", label: "من", required: true },
  { key: "destination", label: "إلى", required: true },
  { key: "tripDate", label: "تاريخ الرحلة", type: "date", required: true },
  { key: "departureTime", label: "المغادرة (السعودية)", type: "time" },
  { key: "driverName", label: "السائق" },
  { key: "vehiclePlate", label: "لوحة المركبة" },
];
const EXTRA: TransportField[] = [
  { key: "driverPhone", label: "هاتف السائق", type: "tel" },
  { key: "driverLicenseNumber", label: "رقم رخصة السائق" },
  { key: "vehicleDescription", label: "نوع المركبة / الطراز" },
  { key: "contactName", label: "مسؤول المجموعة / الضيف" },
  { key: "contactPhone", label: "هاتف التواصل", type: "tel" },
  { key: "arrivalDate", label: "تاريخ الوصول", type: "date" },
  { key: "arrivalTime", label: "الوصول (السعودية)", type: "time" },
  { key: "flightCarrier", label: "شركة الطيران" },
  { key: "flightNumber", label: "رقم رحلة الطيران" },
];
export default function TransportFields({
  value,
  onChange,
  hasValidationError = false,
  isSupplemental = false,
}: TransportFieldsProps) {
  const ui = useUiText();

  const [isExpanded, setIsExpanded] = useState(false),
    [hasNames, setHasNames] = useState(false);
  const update = (change: Partial<TransportDetails>) =>
    onChange({ ...value, ...change });
  const delta = distanceDelta(value.odometerStart, value.odometerEnd),
    unit = value.distanceUnit === "MI" ? "ميل" : "كم";
  const expanded = isExpanded || hasValidationError;
  const field = (item: TransportField) => {
    const fieldVal = String(value[item.key] ?? "");
    if (item.type === "date" || item.type === "time") {
      return (
        <label
          key={item.key}
          className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]"
        >
          {ui(item.label)}
          <input
            type={item.type}
            required={item.required}
            maxLength={160}
            className={INPUT}
            value={fieldVal}
            onChange={(event) => update({ [item.key]: event.target.value })}
          />
        </label>
      );
    }
    return (
      <ExpandableField
        key={item.key}
        label={ui(item.label)}
        required={item.required}
        type={item.type || "text"}
        dir={item.type === "tel" ? "ltr" : undefined}
        maxLength={160}
        value={fieldVal}
        onApply={(next) => update({ [item.key]: next })}
      >
        <input
          type={item.type || "text"}
          dir={item.type === "tel" ? "ltr" : undefined}
          required={item.required}
          maxLength={160}
          className={INLINE_INPUT}
          value={fieldVal}
          onChange={(event) => update({ [item.key]: event.target.value })}
        />
      </ExpandableField>
    );
  };
  return (
    <div>
    <div className="grid gap-4 sm:grid-cols-2">{(isSupplemental ? CORE.filter(item => item.key === "driverName" || item.key === "vehiclePlate") : CORE).map(field)}</div>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {!isSupplemental && (
        <ExpandableField
          label={ui("عدد الركاب")}
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          placeholder={ui("اختياري")}
          value={value.passengerCount !== undefined ? String(value.passengerCount) : ""}
          onApply={next => {
            const trimmed = next.trim();
            const parsed = Number(trimmed);
            update({ passengerCount: trimmed && Number.isFinite(parsed) ? parsed : undefined });
          }}
        >
          <input type="number" min={1} max={100} step={1} className={INLINE_INPUT} value={value.passengerCount ?? ""} onChange={event => update({ passengerCount: event.target.value ? Number(event.target.value) : undefined })} placeholder={ui("اختياري")} />
        </ExpandableField>
      )}
      <ExpandableField
        label={ui("المسافة المفوترة")}
        dir="ltr"
        inputMode="decimal"
        pattern="\d{1,9}(\.\d{1,3})?"
        placeholder={ui("اختياري")}
        value={value.billedDistance || ""}
        onApply={billedDistance => update({ billedDistance })}
      >
        <input inputMode="decimal" dir="ltr" pattern="\d{1,9}(\.\d{1,3})?" className={`${INLINE_INPUT} font-mono`} value={value.billedDistance || ""} onChange={event => update({ billedDistance: event.target.value })} placeholder={ui("اختياري")} />
      </ExpandableField>
      <FullscreenSelect
        label={ui("وحدة المسافة")}
        searchable={false}
        value={value.distanceUnit}
        onChange={nextUnit => update({ distanceUnit: nextUnit as "KM" | "MI", billedDistance: undefined, odometerStart: undefined, odometerEnd: undefined })}
        options={[
          { value: "KM", label: ui("كيلومتر"), badge: "KM" },
          { value: "MI", label: ui("ميل"), badge: "MI" },
        ]}
      />
    </div>
    {isSupplemental && (
      <div className="mt-4">
        <ExpandableField
          label={ui("ملاحظات الحجز")}
          multiline
          maxLength={350}
          placeholder={ui("تعليمات الاستقبال أو أي تفاصيل إضافية…")}
          value={value.notes || ""}
          onApply={(notes) => update({ notes })}
        >
          <textarea rows={3} maxLength={350} placeholder={ui("تعليمات الاستقبال أو أي تفاصيل إضافية…")} className="theme-input w-full min-h-24 rounded-lg p-3 text-base sm:text-[0.8125rem] leading-relaxed" value={value.notes || ""} onChange={event => update({ notes: event.target.value })} />
        </ExpandableField>
        <span className="mt-1 block text-end font-mono text-xs font-normal text-[var(--text-muted)]">{value.notes?.length || 0} / 350</span>
      </div>
    )}
    <button type="button" aria-expanded={expanded} onClick={() => setIsExpanded(!isExpanded)} className="mt-5 flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg py-1 text-xs sm:text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-pointer transition-colors">{ui("تفاصيل إضافية للنقل")}<ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button>
    {expanded && (
      <div className="mt-4 space-y-5 border-t theme-border pt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FullscreenSelect
          label={ui("نوع الخدمة")}
          searchable={false}
          value={value.serviceType}
          onChange={nextServiceType => update({ serviceType: nextServiceType as TransportDetails["serviceType"] })}
          options={Object.entries(TRANSPORT_SERVICE_LABELS).map(([key, label]) => ({ value: key, label: ui(label) }))}
        />
        {(isSupplemental ? EXTRA.filter(item => !["contactName", "contactPhone", "vehicleDescription"].includes(item.key)) : EXTRA).map(field)}
        <ExpandableField
          label={ui("سعة المركبة")}
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          value={value.vehicleCapacity !== undefined ? String(value.vehicleCapacity) : ""}
          onApply={next => {
            const trimmed = next.trim();
            const parsed = Number(trimmed);
            update({ vehicleCapacity: trimmed && Number.isFinite(parsed) ? parsed : undefined });
          }}
        >
          <input type="number" min={1} max={100} className={INLINE_INPUT} value={value.vehicleCapacity ?? ""} onChange={event => update({ vehicleCapacity: event.target.value ? Number(event.target.value) : undefined })} />
        </ExpandableField>
      </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-subtle)] p-4">
            <h3 className="mb-3 text-base font-bold text-[var(--text-main)]">
              {ui("قراءات العداد (")}
              {ui(unit)})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { key: "odometerStart", label: "بداية العداد" },
                  { key: "odometerEnd", label: "نهاية العداد" },
                ] as const
              ).map((item) => (
                <ExpandableField
                  key={item.key}
                  label={ui(item.label)}
                  dir="ltr"
                  inputMode="decimal"
                  pattern="\d{1,9}(\.\d{1,3})?"
                  value={value[item.key] || ""}
                  onApply={(next) => update({ [item.key]: next })}
                >
                  <input
                    inputMode="decimal"
                    dir="ltr"
                    pattern="\d{1,9}(\.\d{1,3})?"
                    className={`${INLINE_INPUT} font-mono`}
                    value={value[item.key] || ""}
                    onChange={(event) =>
                      update({ [item.key]: event.target.value })
                    }
                  />
                </ExpandableField>
              ))}
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {ui("مسافة العداد:")}{" "}
              <b className="font-mono">{delta ?? "—"}</b>{" "}
              {ui(unit)} {ui("· تُراجع المسافة المفوترة حسب الاتفاق.")}
            </p>
          </div>
          {!isSupplemental && (
            <ExpandableField
              label={ui("ملاحظات الخدمة")}
              multiline
              maxLength={1000}
              value={value.notes || ""}
              onApply={(notes) => update({ notes })}
            >
              <textarea
                rows={3}
                maxLength={1000}
                className="theme-input w-full min-h-24 rounded-lg p-3 text-base sm:text-[0.8125rem] leading-relaxed"
                value={value.notes || ""}
                onChange={(event) => update({ notes: event.target.value })}
              />
            </ExpandableField>
          )}
          <div>
            <button
              type="button"
              aria-expanded={hasNames || hasValidationError}
              onClick={() => setHasNames(!hasNames)}
              className="flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-pointer transition-colors"
            >
              {ui("أسماء الركاب المسجلة (")}
              {value.passengers.length})
              <ChevronDown
                className={`size-4 ${hasNames ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {(hasNames || hasValidationError) && (
              <div className="mt-4 space-y-3">
                {value.passengers.map((passenger, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch sm:items-end gap-3 rounded-xl border theme-border sm:border-0 p-3 sm:p-0"
                  >
                    <ExpandableField
                      label={`${ui("الراكب")} ${index + 1}`}
                      required
                      maxLength={160}
                      value={passenger.name}
                      onApply={(nextName) =>
                        update({
                          passengers: value.passengers.map((item, position) =>
                            position === index
                              ? { ...item, name: nextName }
                              : item,
                          ),
                        })
                      }
                    >
                      <input
                        required
                        maxLength={160}
                        className={INLINE_INPUT}
                        value={passenger.name}
                        onChange={(event) =>
                          update({
                            passengers: value.passengers.map(
                              (item, position) =>
                                position === index
                                  ? { ...item, name: event.target.value }
                                  : item,
                            ),
                          })
                        }
                      />
                    </ExpandableField>
                    <ExpandableField
                      label={ui("الجنسية")}
                      maxLength={160}
                      value={passenger.nationality || ""}
                      onApply={(nextNat) =>
                        update({
                          passengers: value.passengers.map((item, position) =>
                            position === index
                              ? { ...item, nationality: nextNat }
                              : item,
                          ),
                        })
                      }
                    >
                      <input
                        maxLength={160}
                        className={INLINE_INPUT}
                        value={passenger.nationality || ""}
                        onChange={(event) =>
                          update({
                            passengers: value.passengers.map(
                              (item, position) =>
                                position === index
                                  ? { ...item, nationality: event.target.value }
                                  : item,
                            ),
                          })
                        }
                      />
                    </ExpandableField>
                    <button
                      type="button"
                      aria-label={ui(`حذف الراكب ${index + 1}`)}
                      className="min-h-11 sm:min-h-9 inline-flex items-center justify-center rounded-lg border border-transparent px-3.5 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30 cursor-pointer"
                      onClick={() =>
                        update({
                          passengers: value.passengers.filter(
                            (_, position) => position !== index,
                          ),
                        })
                      }
                    >
                      {ui("حذف")}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={value.passengers.length >= 100}
                  className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)] px-3.5 py-1.5 text-xs sm:text-sm font-bold disabled:opacity-40 cursor-pointer transition"
                  onClick={() =>
                    update({ passengers: [...value.passengers, { name: "" }] })
                  }
                >
                  {ui("إضافة اسم")}
                </button>
                <p className="text-sm text-[var(--text-muted)]">
                  {ui("أسماء الركاب لا تُطبع في نسخة العميل.")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
