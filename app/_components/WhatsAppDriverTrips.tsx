"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import { useApiQuery } from "@/lib/use-api-query";
import { useUrlState } from "@/lib/use-url-state";
import { assignWhatsAppTrip, dispatchNeedsReview, tripStatusLabel, type WhatsAppTrip, type WhatsAppTripNotice } from "@/lib/whatsapp-trips";

interface DriverTripsProps { canSend: boolean; managementTarget: string | null }
export default function WhatsAppDriverTrips({ canSend, managementTarget }: DriverTripsProps) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const text = (arabic: string, english: string) => ar ? arabic : english;
  const trips = useApiQuery<WhatsAppTrip[]>("/whatsapp/trips");
  const notices = useApiQuery<WhatsAppTripNotice[]>("/whatsapp/trips/notices");
  const [filter, setFilter] = useUrlState<string>("tripStatus", "all");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const lock = useRef(false);
  const { refetch, isFetching } = trips;
  const refreshNotices = notices.refetch;
  const fetchingNotices = notices.isFetching;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !isFetching && !fetchingNotices) {
        refetch(); refreshNotices();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [refetch, refreshNotices, isFetching, fetchingNotices]);
  const rows = (trips.data || []).filter(row => filter === "all" || row.status === filter);
  const date = (value: string | null) => value ? new Date(value).toLocaleString(ar ? "ar-SA" : "en-GB", { timeZone: "Asia/Riyadh", hour12: false }) : text("غير محدد", "Not set");
  async function assign(id: string) {
    if (lock.current || !canSend || trips.error) return;
    lock.current = true; setBusy(id); setFeedback("");
    try {
      await assignWhatsAppTrip(id);
      setFeedback(text("تم تأكيد إرسال إشعارات الإسناد. استلامها على الهاتف غير مؤكد.", "Assignment notifications dispatched. Mobile delivery is not confirmed."));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : text("تعذر تأكيد الإرسال. تحقق من الاستلام قبل المحاولة مجدداً.", "Dispatch could not be confirmed. Check receipt before trying again."));
    } finally { lock.current = false; setBusy(null); refetch(); refreshNotices(); }
  }
  return <section className="theme-card rounded-2xl p-5 sm:p-6 space-y-5" aria-labelledby="driver-trips-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="driver-trips-title" className="text-lg font-semibold text-[var(--text-main)]">{text("متابعة رحلات السائقين", "Driver trip tracking")}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{text("استطلاع واحد للسائق. تحديثات الإدارة ترد على إشعار العقد الأصلي.", "One driver poll. Management updates quote the original contract notice.")}</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{text("وجهة إشعارات الإدارة:", "Management notifications:")} <bdi dir="ltr" className="break-all text-[var(--text-main)]">{managementTarget || text("غير محددة", "Not configured")}</bdi></p>
      </div>
      <button type="button" disabled={isFetching || fetchingNotices} onClick={() => { refetch(); refreshNotices(); }} className="theme-input min-h-11 rounded-lg px-3 inline-flex items-center gap-2 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />{text("تحديث المتابعة", "Refresh tracking")}</button>
    </div>
    <p className="text-sm text-[var(--text-muted)]">{text("تُحدّث المتابعة كل ١٥ ثانية. الأوقات بتوقيت السعودية. حالة الرحلة مستقلة عن الاعتماد والمحاسبة.", "Refreshes every 15 seconds. Times use Saudi time. Trip status is separate from approval and accounting.")}</p>
    {!canSend && <p className="rounded-lg border theme-border p-3 text-sm">{text("الإرسال متوقف حالياً؛ يمكنك متابعة آخر حالة مسجلة.", "Sending is currently unavailable. You can view the last recorded status.")}</p>}
    {feedback && <p role="status" className="rounded-lg border theme-border p-3 text-sm break-words">{feedback}</p>}
    <div>
      <label htmlFor="driver-trip-filter" className="text-sm font-medium">{text("حالة الرحلة", "Trip status")}</label>
      <select id="driver-trip-filter" value={filter} onChange={e => setFilter(e.target.value)} className="theme-input ms-3 min-h-11 rounded-lg px-3 max-w-full">
        <option value="all">{text("كل الحالات", "All statuses")}</option>
        {["ASSIGNED", "ARRIVED_AT_PICKUP", "IN_PROGRESS", "COMPLETED", "SUPPORT_REQUESTED"].map(status => <option key={status} value={status}>{tripStatusLabel(status, ar)}</option>)}
      </select>
    </div>
    {trips.error ? <div role="alert" className="space-y-2 text-sm"><p>{text("تعذر تحميل متابعة الرحلات. أعد التحديث.", "Trip tracking could not be loaded. Refresh to try again.")}</p><p className="break-words text-[var(--text-muted)]">{trips.error}</p></div> :
      trips.isLoading ? <p role="status">{text("جار تحميل الرحلات…", "Loading trips…")}</p> :
      !rows.length ? <p className="border-t theme-border pt-5 text-sm text-[var(--text-muted)]">{text("لا توجد رحلات مطابقة. تظهر الرحلات هنا بعد تسجيل الإسناد.", "No matching trips. Trips appear here when assignment is recorded.")}</p> :
      <ul className="divide-y divide-[var(--control-border)]">
        {rows.map(row => <li key={row.contractId} className="py-5 first:pt-0 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2">
            <Link className="text-[var(--accent-gold)] font-semibold underline underline-offset-4 min-h-11 inline-flex items-center break-all" href={"/admin/contracts/" + encodeURIComponent(row.contractId)}>{row.contract.referenceNumber}</Link>
            <p className="font-medium break-words">{row.driverName}</p>
            <p className="text-sm text-[var(--text-muted)] break-words">{row.contract.origin} — {row.contract.destination}</p>
            <p className="text-sm text-[var(--text-muted)]">{text("الموعد:", "Scheduled:")} {date(row.scheduledAt)}</p>
          </div>
          <div className="min-w-0 space-y-2 text-sm">
            <p className={row.status === "SUPPORT_REQUESTED" ? "text-red-800 dark:text-red-200 font-semibold" : "font-semibold"}>{tripStatusLabel(row.status, ar)}</p>
            <p className="text-[var(--text-muted)]">{text("آخر تحديث:", "Updated:")} {date(row.updatedAt)}</p>
            <p>{text("استطلاع السائق:", "Driver poll:")} {row.pollDispatch === "SENT" ? text("تم الإرسال", "Dispatched") : row.pollDispatch === "PENDING" ? text("بانتظار الإرسال", "Awaiting dispatch") : text("يلزم التحقق من الاستلام", "Receipt review required")}</p>
            <p>{text("إشعار الإدارة:", "Management master:")} {row.masterDispatch === "SENT" ? text("تم الإرسال", "Dispatched") : row.masterDispatch === "PENDING" ? text("بانتظار الإرسال", "Awaiting dispatch") : text("يلزم التحقق من الاستلام", "Receipt review required")}</p>
            {row.lateAlerted && <p>{text("سُجل تنبيه تأخير واحد.", "A late warning was recorded.")}</p>}
            {(dispatchNeedsReview(row.pollDispatch) || dispatchNeedsReview(row.masterDispatch)) && <p className="text-[var(--text-muted)]">{text("تحقق من المحادثة وسجل الخادم قبل إعادة الإرسال.", "Check the chat and server log before resending.")}</p>}
            {(row.pollDispatch === "PENDING" || (row.pollDispatch === "SENT" && row.masterDispatch === "PENDING")) && <button type="button" onClick={() => { void assign(row.contractId); }} disabled={!canSend || Boolean(busy) || Boolean(trips.error) || isFetching} className="gold-gradient-btn min-h-11 rounded-lg px-4 disabled:opacity-50">{busy === row.contractId ? text("جار الإرسال…", "Sending…") : (row.pollDispatch === "PENDING" ? text("إرسال استطلاع السائق", "Send driver poll") : text("إرسال إشعار الإدارة", "Send management notice"))}</button>}
          </div>
        </li>)}
      </ul>}
    <p className="text-xs text-[var(--text-muted)]">{text("تُعرض آخر ١٠٠ رحلة محدّثة. الإرسال لا يؤكد القراءة على هاتف المستلم.", "Shows the latest 100 updated trips. Dispatch does not confirm reading on the recipient’s phone.")}</p>
    <div className="border-t theme-border pt-4 space-y-3">
      <h3 className="font-semibold flex gap-2 items-center"><AlertCircle size={17} aria-hidden="true" />{text("قائمة الإشعارات", "Notification queue")}</h3>
      {notices.error ? <p role="alert" className="text-sm">{text("تعذر تحميل حالة الإشعارات. أعد التحديث.", "Notification status could not be loaded. Refresh to try again.")}</p> :
        notices.isLoading ? <p role="status">{text("جار التحميل…", "Loading…")}</p> :
        !notices.data?.length ? <p className="text-sm text-[var(--text-muted)]">{text("لا توجد إشعارات معلقة ضمن آخر السجلات.", "No pending notifications in the latest records.")}</p> :
        <ul className="space-y-3">{notices.data.map(notice => <li key={notice.id} className="text-sm min-w-0">
          <Link href={"/admin/contracts/" + encodeURIComponent(notice.contractId)} className="underline min-h-11 inline-flex items-center">{text("فتح العقد", "Open contract")}</Link>
          <span className="ms-3">{notice.state === "PENDING" ? text("بانتظار الإرسال", "Awaiting dispatch") : notice.state === "CANCELLED" ? text("ملغى", "Cancelled") : text("يلزم التحقق قبل إعادة الإرسال", "Review receipt before resending")}</span>
          {notice.error && <p className="text-[var(--text-muted)] break-words">{notice.error}</p>}
        </li>)}</ul>}
    </div>
  </section>;
}
