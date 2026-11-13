"use client";
import { useUiText } from "@/lib/ui-text";


import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, AlertCircle, CheckCircle2, MessageSquare, X } from "lucide-react";
import type { Contract, SystemUser, Vehicle } from "@/lib/types";
import { submitContract } from "@/app/_actions/contract";
import { getCaptains } from "@/app/_actions/captain";
import { getVehicles } from "@/app/_actions/fleet";
import { getSaudiCurrentTimeStr } from "@/lib/contractConstants";
import { invalidateClientCache } from "@/lib/clientCache";
import { returnTripPayload } from "@/lib/return-trip";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { CustomTimePicker } from "@/app/_components/form/CustomTimePicker";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/languageContext";
import { useWhatsAppStatus } from "@/lib/use-whatsapp-status";
import AutoSendWhatsAppCard from "@/app/_components/AutoSendWhatsAppCard";

const SendWhatsAppModal = dynamic(() => import("@/app/_components/SendWhatsAppModal"), { ssr: false });

interface ReverseTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess?: (newContract: Contract) => void;
}

const FIELD_CLASS = "theme-input w-full min-w-0 min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";

export default function ReverseTripModal(props: ReverseTripModalProps) {


  return props.isOpen ? <ReverseTripForm key={props.contract.id} {...props} /> : null;
}

function ReverseTripForm({ onClose, contract, onSuccess }: ReverseTripModalProps) {
  const ui = useUiText();

  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [origin, setOrigin] = useState(contract.destination);
  const [destination, setDestination] = useState(contract.origin);
  const [tripDate, setTripDate] = useState("");
  const [tripTime, setTripTime] = useState(contract.tripTime || getSaudiCurrentTimeStr());
  const [captainId, setCaptainId] = useState(contract.captainId);
  const [vehiclePlate, setVehiclePlate] = useState(contract.vehiclePlate);
  const [captains, setCaptains] = useState<SystemUser[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [createdContract, setCreatedContract] = useState<Contract | null>(null);
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const whatsAppStatus = useWhatsAppStatus();
  const driverPollMode = whatsAppStatus.data?.driverWorkflow?.enabled === true;
  const submitLock = useRef(false);
  const originalDate = contract.tripDate.replace(/\//g, "-").split("T")[0];
  const isOriginalCaptainActive = captains.some(captain => captain.id === contract.captainId);
  const selectedCaptain = captains.find(captain => captain.id === captainId);

  useEffect(() => {
    dialogRef.current?.showModal();
    let isActive = true;
    // Recheck active captains instead of using stale availability from the list page.
    void Promise.all([getCaptains(), getVehicles()]).then(([caps, fleet]) => {
      if (!isActive) return;
      if (!caps.success || !fleet.success) throw new Error(isRTL ? "تعذر تحميل الكباتن والمركبات. أغلق النافذة وأعد المحاولة." : "Failed to load captains and vehicles. Close and retry.");
      const activeCaptains = (caps.captains || []).filter(captain => captain.active);
      setCaptains(activeCaptains);
      setVehicles(fleet.vehicles || []);
      if (!activeCaptains.some(captain => captain.id === contract.captainId)) {
        setCaptainId("");
        setVehiclePlate("");
      }
    }).catch(() => {
      if (isActive) setLoadError(isRTL ? "تعذر تحميل الكباتن والمركبات. أغلق النافذة وأعد المحاولة." : "Failed to load captains and vehicles. Close and retry.");
    }).finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [contract.captainId, isRTL]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || isLoading || loadError) return;
    if (!origin.trim() || !destination.trim()) {
      setError(isRTL ? "أدخل نقطة الانطلاق ووجهة الوصول." : "Please enter origin and destination.");
      return;
    }
    if (!isConfirmed || !captainId || !vehiclePlate || !tripDate || !tripTime) {
      setError(isRTL ? "اختر التاريخ والكابتن والمركبة وأكد الفحص قبل إنشاء الرحلة." : "Please select date, captain, vehicle, and confirm inspection.");
      return;
    }
    if (tripDate < originalDate) {
      setError(isRTL ? "تاريخ العودة يجب ألا يسبق تاريخ الرحلة الأصلية." : "Return date cannot be earlier than the original trip date.");
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const payload = returnTripPayload(contract, {
        origin, destination, tripDate, tripTime, captainId, vehiclePlate,
      });
      const result = await submitContract({
        ...payload,
        ...(autoSendWhatsApp && !driverPollMode ? {
          autoSendWhatsApp: true,
          ...(whatsAppPhone.trim() ? { whatsAppPhone: whatsAppPhone.trim() } : {}),
        } : {}),
      });
      if (!result.success || !result.contract) {
        setError(result.error || (isRTL ? "تعذر إنشاء رحلة العودة." : "Failed to create return trip."));
        return;
      }
      setCreatedContract(result.contract);
      invalidateClientCache("contracts_");
      invalidateClientCache("inspections_");
      invalidateClientCache("captains_list");
      invalidateClientCache("dashboard_stats");
      onSuccess?.(result.contract);
    } catch {
      setError(isRTL ? "تعذر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة." : "Network error. Please check your connection and try again.");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      dir={isRTL ? "rtl" : "ltr"}
      aria-labelledby="return-trip-title"
      onCancel={event => { if (isSubmitting) event.preventDefault(); else onClose(); }}
      onClick={event => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}
      className="return-trip-dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-2 sm:p-6"
    >
      <div className="mobile-dialog-panel mx-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border theme-border theme-card shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b theme-border p-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="return-trip-title" className="flex items-center gap-2 text-base sm:text-lg font-bold"><ArrowLeftRight aria-hidden="true" className="h-4 w-4 text-[var(--accent-gold)]" />{ui(isRTL ? "رحلة عودة" : "Return Trip")}</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{ui(isRTL ? "من العقد " : "From Contract ")}<span className="font-mono" dir="ltr">{contract.referenceNumber}</span></p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label={ui(t("common.close"))} className="flex h-11 w-11 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--table-row-hover)] cursor-pointer"><X aria-hidden="true" className="h-5 w-5" /></button>
        </header>
        {createdContract ? (
          <div className="space-y-4 p-6 text-center" role="status">
            <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-emerald-700 dark:text-emerald-300" />
            <h3 className="text-base sm:text-lg font-bold">{ui(isRTL ? "تم إنشاء رحلة العودة بنجاح" : "Return Trip Created Successfully")}</h3>
            <p className="font-mono text-sm text-[var(--text-muted)]" dir="ltr">{createdContract.referenceNumber}</p>
            {!createdContract.pdfPath && <p className="text-xs sm:text-sm text-[var(--accent-gold)]">{ui(isRTL ? "تم حفظ العقد، لكن تعذر تجهيز PDF. يمكنك إعادة المحاولة من المعاينة." : "Contract saved, but PDF generation failed. You can retry from preview.")}</p>}
            {driverPollMode && <p className="text-sm text-[var(--text-muted)]">{isRTL ? "عند الإسناد يُرسل ملف عقد العودة PDF مع استطلاع السائق. تابع التحديثات من صفحة واتساب." : "Assignment sends the return contract PDF and driver poll. Track updates on the WhatsApp page."}</p>}
            {createdContract.whatsAppAutoSend?.attempted && (
              <p role={createdContract.whatsAppAutoSend.success ? "status" : "alert"} className="break-words text-sm text-[var(--text-main)]">
                {createdContract.whatsAppAutoSend.success
                  ? (isRTL ? "تم إرسال عقد العودة إلى واتساب." : "Return contract dispatched to WhatsApp.")
                  : (isRTL ? "تم حفظ عقد العودة، لكن تعذر إرساله عبر واتساب." : "Return contract saved, but WhatsApp sending failed.")}
                {createdContract.whatsAppAutoSend.phone && <bdi dir="ltr" className="mx-1 font-mono">{createdContract.whatsAppAutoSend.phone}</bdi>}
                {!createdContract.whatsAppAutoSend.success && createdContract.whatsAppAutoSend.error && <span className="mt-1 block text-[var(--text-muted)]">{createdContract.whatsAppAutoSend.error}</span>}
              </p>
            )}
            <button type="button" onClick={() => setIsWhatsAppOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border theme-border px-4 text-sm font-semibold cursor-pointer">
              <MessageSquare aria-hidden="true" className="h-4 w-4" />
              {ui("إرسال عبر واتساب")}
            </button>
            <button type="button" onClick={() => { onClose(); router.push(`/admin/contracts/${createdContract.id}/edit`); }} className="min-h-11 sm:min-h-9 w-full rounded-lg gold-gradient-btn px-4 text-xs sm:text-sm font-bold cursor-pointer">{ui(isRTL ? "عرض وتعديل عقد العودة" : "View & Edit Return Contract")}</button>
          </div>
        ) : (
          <>
            <form id="return-trip-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="rounded-xl border theme-border theme-card-subtle p-4">
                <fieldset disabled={isSubmitting || isLoading || Boolean(loadError)} className="grid min-w-0 grid-cols-1 gap-3 disabled:opacity-60 sm:grid-cols-2">
                  <ExpandableField
                    label={ui(isRTL ? "من — نقطة الانطلاق" : "From — Origin")}
                    required
                    maxLength={500}
                    value={origin}
                    onApply={setOrigin}
                  >
                    <input type="text" required maxLength={500} value={origin} onChange={event => setOrigin(event.target.value)} className={FIELD_CLASS} />
                  </ExpandableField>
                  <ExpandableField
                    label={ui(isRTL ? "إلى — وجهة الوصول" : "To — Destination")}
                    required
                    maxLength={500}
                    value={destination}
                    onApply={setDestination}
                  >
                    <input type="text" required maxLength={500} value={destination} onChange={event => setDestination(event.target.value)} className={FIELD_CLASS} />
                  </ExpandableField>
                </fieldset>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{ui(isRTL ? "تم عكس المسار تلقائياً، ويمكنك تعديله." : "Route reversed automatically, you may adjust it.")}</p>
                <p className="mt-3 border-t theme-border pt-3 text-xs sm:text-sm text-[var(--text-muted)]">{ui(isRTL ? `نفس العميل و${contract.passengers?.length || 0} ركاب. سيُنشأ عقد جديد، وتبقى الرحلة الأصلية كما هي.` : `Same client and ${contract.passengers?.length || 0} passengers. A new contract will be created, leaving the original intact.`)}</p>
              </div>
              <fieldset disabled={isSubmitting || isLoading || Boolean(loadError)} className="min-w-0 space-y-4 disabled:opacity-60">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomDatePicker
                    label={ui(isRTL ? "تاريخ العودة" : "Return Date")}
                    required
                    minDate={originalDate}
                    value={tripDate}
                    onChange={value => setTripDate(value.replace(/\//g, "-"))}
                    className="min-w-0"
                  />
                  <CustomTimePicker
                    label={ui(isRTL ? "وقت العودة" : "Return Time")}
                    required
                    value={tripTime}
                    onChange={setTripTime}
                    className="min-w-0"
                  />
                </div>
                <FullscreenSelect
                  label={ui(isRTL ? "الكابتن" : "Captain")}
                  required
                  searchable={captains.length > 4}
                  disabled={isSubmitting || isLoading || Boolean(loadError)}
                  placeholder={ui(isRTL ? "اختر الكابتن" : "Select Captain")}
                  hint={ui(isRTL ? "يمكنك اختيار كابتن بديل إذا كان الكابتن الأصلي غير متاح." : "You can choose a replacement captain if original captain is unavailable.")}
                  value={captainId}
                  onChange={nextCaptainId => {
                    const selected = captains.find(captain => captain.id === nextCaptainId);
                    setCaptainId(nextCaptainId);
                    setVehiclePlate(selected?.id === contract.captainId ? contract.vehiclePlate : selected?.assignedVehiclePlate || "");
                    setIsConfirmed(false);
                  }}
                  options={[
                    { value: "", label: ui(isRTL ? "اختر الكابتن" : "Select Captain"), disabled: true },
                    ...captains.map(captain => ({
                      value: captain.id,
                      label: `${captain.name}${captain.id === contract.captainId ? ui(isRTL ? " — الكابتن الأصلي" : " — Original Captain") : ""}`,
                      description: captain.assignedVehiclePlate || captain.phone || undefined,
                      keywords: `${captain.name} ${captain.phone || ""} ${captain.assignedVehiclePlate || ""}`,
                    })),
                  ]}
                />
                {!isLoading && !isOriginalCaptainActive && <p className="text-xs sm:text-sm text-[var(--accent-gold)]">{ui(isRTL ? "الكابتن الأصلي غير نشط. اختر كابتناً بديلاً." : "Original captain is inactive. Please choose a replacement captain.")}</p>}
                <FullscreenSelect
                  label={ui(isRTL ? "المركبة" : "Vehicle")}
                  required
                  searchable={vehicles.length > 4}
                  disabled={isSubmitting || isLoading || Boolean(loadError)}
                  placeholder={ui(isRTL ? "اختر المركبة" : "Select Vehicle")}
                  value={vehiclePlate}
                  onChange={nextPlate => {
                    setVehiclePlate(nextPlate);
                    setIsConfirmed(false);
                  }}
                  options={[
                    { value: "", label: ui(isRTL ? "اختر المركبة" : "Select Vehicle"), disabled: true },
                    ...(vehiclePlate && !vehicles.some(vehicle => vehicle.plateNumberAr === vehiclePlate)
                      ? [{ value: vehiclePlate, label: vehiclePlate }]
                      : []),
                    ...vehicles.map(vehicle => ({
                      value: vehicle.plateNumberAr,
                      label: `${vehicle.plateNumberAr} — ${vehicle.make} ${vehicle.model}`,
                      keywords: `${vehicle.plateNumberAr} ${vehicle.make} ${vehicle.model}`,
                    })),
                  ]}
                />
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border theme-border p-3.5">
                  <Checkbox required checked={isConfirmed} onChange={event => setIsConfirmed(event.target.checked)} className="mt-0.5" />
                  <span className="text-xs sm:text-sm leading-relaxed text-[var(--text-main)]">{ui(isRTL ? "أؤكد إجراء الفحص الفني فعلياً واجتياز جميع بنوده للمركبة والكابتن المختارين، وصحة بيانات رحلة العودة. سيكون تاريخ إصدار العقد وتاريخ الفحص مطابقين لتاريخ رحلة العودة المختار." : "I confirm that safety inspection passed all 16 points for the selected vehicle and captain, and return details are accurate. Issue and inspection dates will match the return date.")}</span>
                </label>
              </fieldset>
              <AutoSendWhatsAppCard
                documentType="CONTRACT"
                checked={autoSendWhatsApp}
                onCheckedChange={setAutoSendWhatsApp}
                phone={whatsAppPhone}
                onPhoneChange={setWhatsAppPhone}
                defaultPhoneHint={selectedCaptain?.phone || ""}
                recipientLabel={isRTL ? "هاتف الكابتن" : "Captain Phone"}
                titleAr="إرسال عقد العودة تلقائياً للكابتن عبر واتساب عند الحفظ"
                subtitleAr="يُرسل العقد إلى الكابتن المختار. سيبقى العقد محفوظاً إذا تعذر الإرسال."
                titleEn="Auto-send return contract via WhatsApp on save"
                subtitleEn="Send to the selected captain. The contract stays saved if sending fails."
                waConnected={whatsAppStatus.data ? whatsAppStatus.data.status === "connected" : null}
                disabled={isSubmitting || isLoading || Boolean(loadError)}
              />
              {isLoading && <p role="status" className="text-xs sm:text-sm text-[var(--text-muted)]">{ui(isRTL ? "جاري تحميل الكباتن والمركبات..." : "Loading captains and vehicles...")}</p>}
              {(error || loadError) && <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300"><AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{error || loadError}</span></p>}
            </form>
            <footer className="grid shrink-0 grid-cols-[auto_1fr] gap-2.5 border-t theme-border p-4 sm:px-5">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="min-h-11 sm:min-h-9 rounded-lg border theme-border px-4 text-xs sm:text-sm font-bold cursor-pointer">{ui(t("common.cancel"))}</button>
              <button type="submit" form="return-trip-form" disabled={isSubmitting || isLoading || Boolean(loadError) || !isConfirmed} className="min-h-11 sm:min-h-9 rounded-lg gold-gradient-btn px-4 text-xs sm:text-sm font-bold disabled:opacity-50 cursor-pointer">{ui(isSubmitting ? (isRTL ? "جاري حفظ العقد وPDF..." : "Saving Contract & PDF...") : (isRTL ? "إنشاء عقد العودة" : "Create Return Contract"))}</button>
            </footer>
          </>
        )}
      </div>
      {createdContract && isWhatsAppOpen && (
        <SendWhatsAppModal
          isOpen
          onClose={() => setIsWhatsAppOpen(false)}
          type="CONTRACT"
          targetId={createdContract.id}
          targetTitle={createdContract.referenceNumber}
          recipientName={createdContract.captain?.name || selectedCaptain?.name || (isRTL ? "الكابتن" : "Captain")}
          defaultPhone={createdContract.whatsAppAutoSend?.phone || whatsAppPhone.trim() || createdContract.captain?.phone || selectedCaptain?.phone || ""}
        />
      )}
    </dialog>
  );
}
