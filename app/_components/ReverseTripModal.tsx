"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, AlertCircle, CheckCircle2, X } from "lucide-react";
import type { Contract, SystemUser, Vehicle } from "@/lib/types";
import { submitContract } from "@/app/_actions/contract";
import { getCaptains } from "@/app/_actions/captain";
import { getVehicles } from "@/app/_actions/fleet";
import { getSaudiCurrentTimeStr } from "@/lib/contractConstants";
import { invalidateClientCache } from "@/lib/clientCache";
import { returnTripPayload } from "@/lib/return-trip";

interface ReverseTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess?: (newContract: Contract) => void;
}

const FIELD_CLASS = "theme-input w-full min-w-0 min-h-12 rounded-xl px-3 py-2 text-base";

export default function ReverseTripModal(props: ReverseTripModalProps) {
  return props.isOpen ? <ReverseTripForm key={props.contract.id} {...props} /> : null;
}

function ReverseTripForm({ onClose, contract, onSuccess }: ReverseTripModalProps) {
  const router = useRouter();
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
  const submitLock = useRef(false);
  const originalDate = contract.tripDate.replace(/\//g, "-").split("T")[0];
  const isOriginalCaptainActive = captains.some(captain => captain.id === contract.captainId);

  useEffect(() => {
    dialogRef.current?.showModal();
    let isActive = true;
    // Recheck active captains instead of using stale availability from the list page.
    void Promise.all([getCaptains(), getVehicles()]).then(([caps, fleet]) => {
      if (!isActive) return;
      if (!caps.success || !fleet.success) throw new Error("تعذر تحميل الكباتن والمركبات. أغلق النافذة وأعد المحاولة.");
      const activeCaptains = (caps.captains || []).filter(captain => captain.active);
      setCaptains(activeCaptains);
      setVehicles(fleet.vehicles || []);
      if (!activeCaptains.some(captain => captain.id === contract.captainId)) {
        setCaptainId("");
        setVehiclePlate("");
      }
    }).catch(() => {
      if (isActive) setLoadError("تعذر تحميل الكباتن والمركبات. أغلق النافذة وأعد المحاولة.");
    }).finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [contract.captainId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || isLoading || loadError) return;
    if (!origin.trim() || !destination.trim()) {
      setError("أدخل نقطة الانطلاق ووجهة الوصول.");
      return;
    }
    if (!isConfirmed || !captainId || !vehiclePlate || !tripDate || !tripTime) {
      setError("اختر التاريخ والكابتن والمركبة وأكد الفحص قبل إنشاء الرحلة.");
      return;
    }
    if (tripDate < originalDate) {
      setError("تاريخ العودة يجب ألا يسبق تاريخ الرحلة الأصلية.");
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const payload = returnTripPayload(contract, {
        origin, destination, tripDate, tripTime, captainId, vehiclePlate,
      });
      const result = await submitContract(payload);
      if (!result.success || !result.contract) {
        setError(result.error || "تعذر إنشاء رحلة العودة.");
        return;
      }
      setCreatedContract(result.contract);
      invalidateClientCache("contracts_");
      invalidateClientCache("inspections_");
      invalidateClientCache("captains_list");
      invalidateClientCache("dashboard_stats");
      onSuccess?.(result.contract);
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="return-trip-title"
      onCancel={event => { if (isSubmitting) event.preventDefault(); else onClose(); }}
      onClick={event => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}
      className="return-trip-dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-2 sm:p-6"
    >
      <div className="mobile-dialog-panel mx-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border theme-border theme-card shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b theme-border p-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="return-trip-title" className="flex items-center gap-2 text-lg font-bold"><ArrowLeftRight className="h-5 w-5 text-amber-500" />رحلة عودة</h2>
            <p className="mt-1 text-xs text-slate-500">من العقد <span className="font-mono">{contract.referenceNumber}</span></p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="إغلاق" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </header>
        {createdContract ? (
          <div className="space-y-4 p-6 text-center" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="text-lg font-bold">تم إنشاء رحلة العودة</h3>
            <p className="font-mono">{createdContract.referenceNumber}</p>
            {!createdContract.pdfPath && <p className="text-sm text-amber-700 dark:text-amber-400">تم حفظ العقد، لكن تعذر تجهيز PDF. يمكنك إعادة المحاولة من المعاينة.</p>}
            <button type="button" onClick={() => { onClose(); router.push(`/admin/contracts/${createdContract.id}/edit`); }} className="min-h-12 w-full rounded-xl gold-gradient-btn px-4 font-bold">عرض وتعديل عقد العودة</button>
          </div>
        ) : (
          <>
            <form id="return-trip-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <div className="rounded-xl border theme-border theme-card-subtle p-4">
                <fieldset disabled={isSubmitting || isLoading || Boolean(loadError)} className="grid min-w-0 grid-cols-1 gap-3 disabled:opacity-60 sm:grid-cols-2">
                  <label className="block min-w-0 space-y-2"><span className="text-sm font-bold">من — نقطة الانطلاق</span><input type="text" required maxLength={500} value={origin} onChange={event => setOrigin(event.target.value)} className={FIELD_CLASS} /></label>
                  <label className="block min-w-0 space-y-2"><span className="text-sm font-bold">إلى — وجهة الوصول</span><input type="text" required maxLength={500} value={destination} onChange={event => setDestination(event.target.value)} className={FIELD_CLASS} /></label>
                </fieldset>
                <p className="mt-2 text-xs text-slate-500">تم عكس المسار تلقائياً، ويمكنك تعديله.</p>
                <p className="mt-3 border-t theme-border pt-3 text-sm text-slate-500">نفس العميل و{contract.passengers?.length || 0} ركاب. سيُنشأ عقد جديد، وتبقى الرحلة الأصلية كما هي.</p>
              </div>
              <fieldset disabled={isSubmitting || isLoading || Boolean(loadError)} className="min-w-0 space-y-4 disabled:opacity-60">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block space-y-2"><span className="text-sm font-bold">تاريخ العودة</span><input autoFocus type="date" required min={originalDate} value={tripDate} onChange={event => setTripDate(event.target.value)} dir="ltr" className={FIELD_CLASS} /></label>
                  <label className="block space-y-2"><span className="text-sm font-bold">وقت العودة</span><input type="time" required value={tripTime} onChange={event => setTripTime(event.target.value)} dir="ltr" className={FIELD_CLASS} /></label>
                </div>
                <label className="block space-y-2"><span className="text-sm font-bold">الكابتن</span>
                  <select required value={captainId} onChange={event => {
                    const selected = captains.find(captain => captain.id === event.target.value);
                    setCaptainId(event.target.value);
                    setVehiclePlate(selected?.id === contract.captainId ? contract.vehiclePlate : selected?.assignedVehiclePlate || "");
                    setIsConfirmed(false);
                  }} className={FIELD_CLASS}>
                    <option value="">اختر الكابتن</option>
                    {captains.map(captain => <option key={captain.id} value={captain.id}>{captain.name}{captain.id === contract.captainId ? " — الكابتن الأصلي" : ""}</option>)}
                  </select>
                  <span className="block text-xs text-slate-500">يمكنك اختيار كابتن بديل إذا كان الكابتن الأصلي غير متاح.</span>
                </label>
                {!isLoading && !isOriginalCaptainActive && <p className="text-sm text-amber-700 dark:text-amber-400">الكابتن الأصلي غير نشط. اختر كابتناً بديلاً.</p>}
                <label className="block space-y-2"><span className="text-sm font-bold">المركبة</span>
                  <select required value={vehiclePlate} onChange={event => { setVehiclePlate(event.target.value); setIsConfirmed(false); }} className={FIELD_CLASS}>
                    <option value="">اختر المركبة</option>
                    {vehiclePlate && !vehicles.some(vehicle => vehicle.plateNumberAr === vehiclePlate) && <option value={vehiclePlate}>{vehiclePlate}</option>}
                    {vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.plateNumberAr}>{vehicle.plateNumberAr} — {vehicle.make} {vehicle.model}</option>)}
                  </select>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border theme-border p-4">
                  <input type="checkbox" required checked={isConfirmed} onChange={event => setIsConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-amber-600" />
                  <span className="text-sm leading-relaxed">أؤكد إجراء الفحص الفني فعلياً واجتياز جميع بنوده للمركبة والكابتن المختارين، وصحة بيانات رحلة العودة. سيكون تاريخ إصدار العقد وتاريخ الفحص مطابقين لتاريخ رحلة العودة المختار.</span>
                </label>
              </fieldset>
              {isLoading && <p role="status" className="text-sm text-slate-500">جاري تحميل الكباتن والمركبات...</p>}
              {(error || loadError) && <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"><AlertCircle className="h-5 w-5 shrink-0" />{error || loadError}</p>}
            </form>
            <footer className="grid shrink-0 grid-cols-[auto_1fr] gap-3 border-t theme-border p-4 sm:px-6">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="min-h-12 rounded-xl border theme-border px-4 text-sm font-bold">إلغاء</button>
              <button type="submit" form="return-trip-form" disabled={isSubmitting || isLoading || Boolean(loadError) || !isConfirmed} className="min-h-12 rounded-xl gold-gradient-btn px-4 text-sm font-bold disabled:opacity-50">{isSubmitting ? "جاري حفظ العقد وPDF..." : "إنشاء عقد العودة"}</button>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}
