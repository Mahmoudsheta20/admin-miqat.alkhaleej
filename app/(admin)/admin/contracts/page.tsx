"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Download,
  Printer,
  Users,
  Eye,
  RefreshCw,
  X,
  Plane,
  MapPin,
  Calendar,
  Clock,
  Car,
  CheckCircle2,
} from "lucide-react";
import { getContracts, syncAllContractsToStorageAction } from "@/app/_actions/contract";
import { Contract, OperationType } from "@/lib/types";
import StatusBadge from "@/app/_components/StatusBadge";
import PdfPreviewModal from "@/app/_components/PdfPreviewModal";

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);
  const [previewPdfRef, setPreviewPdfRef] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const loadContracts = async () => {
    setIsLoading(true);
    const res = await getContracts({
      operationType: typeFilter !== "ALL" ? (typeFilter as OperationType) : undefined,
      search: search || undefined,
    });
    if (res.success && res.contracts) {
      setContracts(res.contracts);
    }
    setIsLoading(false);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatus("جاري توليد وحفظ كافة العقود برمز QR فريد في التخزين...");
    const res = await syncAllContractsToStorageAction();
    if (res.success) {
      setSyncStatus(`تم بنجاح حفظ ومزامنة ${res.saved} من أصل ${res.total} عقد في التخزين!`);
      loadContracts();
      setTimeout(() => setSyncStatus(null), 6000);
    } else {
      setSyncStatus(`فشل المزامنة: ${res.error}`);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    loadContracts();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadContracts();
  };

  const openPdf = (c: Contract) => {
    setPreviewPdfId(c.id);
    setPreviewPdfRef(c.referenceNumber);
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs">
          <span>{syncStatus}</span>
          <button onClick={() => setSyncStatus(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            سجل العقود الرسمية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            جميع عقود النقل البري الموثقة برمز QR فريد والمحفوظة في وحدة التخزين
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/contracts/new"
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            + عقد جديد
          </Link>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing || isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition disabled:opacity-50"
            title="توليد وحفظ ملفات الـ PDF برمز QR لكل عقد في وحدة التخزين"
          >
            <Download className={`w-3.5 h-3.5 ${isSyncing ? "animate-bounce" : ""}`} />
            {isSyncing ? "جاري الحفظ..." : "مزامنة التخزين ورموز QR"}
          </button>
          <button
            onClick={loadContracts}
            disabled={isLoading || isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 w-full theme-card p-3 rounded-2xl border theme-border flex items-center gap-3"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث برقم العقد، اسم العميل، اللوحة، أو رقم الرحلة الجوية..."
            className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition"
          >
            بحث
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "جميع العمليات" },
            { id: "AIRPORT_TRANSFER", label: "توصيل مطار" },
            { id: "CITY_TOUR", label: "جولة سياحية" },
            { id: "INTERCITY", label: "بين المدن" },
            { id: "HAJJ_UMRAH", label: "حج وعمرة" },
          ].map((op) => (
            <button
              key={op.id}
              onClick={() => setTypeFilter(op.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${
                typeFilter === op.id
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : "theme-card text-slate-600 dark:text-slate-400 hover:border-amber-500"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="theme-card rounded-2xl overflow-hidden border theme-border">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">جاري تحميل سجل العقود...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد عقود مسجلة تطابق عوامل التصفية.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b theme-border text-slate-500 dark:text-slate-400 font-bold">
                  <tr>
                    <th className="px-5 py-3.5">رقم العقد</th>
                    <th className="px-5 py-3.5">العميل / الطرف الثاني</th>
                    <th className="px-5 py-3.5">الكابتن واللوحة</th>
                    <th className="px-5 py-3.5">مسار الرحلة</th>
                    <th className="px-5 py-3.5">نوع العملية</th>
                    <th className="px-5 py-3.5">التاريخ والوقت</th>
                    <th className="px-5 py-3.5">الركاب</th>
                    <th className="px-5 py-3.5 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border text-slate-800 dark:text-slate-200">
                  {contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm block">
                          {c.referenceNumber}
                        </span>
                        {c.flightNumber && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Plane className="w-3 h-3 text-blue-500" />
                            {c.flightCarrier ? `${c.flightCarrier} - ` : ""}
                            {c.flightNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {c.customerName}
                        </div>
                        {c.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                            {c.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.captain?.name || "الكابتن"}
                        </div>
                        <div className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 mt-0.5">
                          <Car className="w-3 h-3 text-amber-500" />
                          {c.vehiclePlate}
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                          <div className="truncate">
                            <span className="text-slate-400 text-[10px] ml-1">من:</span>
                            {c.origin}
                          </div>
                          <div className="truncate">
                            <span className="text-slate-400 text-[10px] ml-1">إلى:</span>
                            {c.destination}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge type="operation" status={c.operationType} />
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400">
                        <div>{c.tripDate}</div>
                        <div className="text-[11px] text-slate-400">{c.tripTime}</div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedContract(c)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          <Users className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-mono">{c.passengers?.length || 0}</span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-left">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`/verify/contract/${c.referenceNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border theme-card hover:border-emerald-500 text-slate-500 hover:text-emerald-600 transition"
                            title="صفحة التحقق الإلكتروني عبر رمز QR"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </a>
                          <button
                            onClick={() => setSelectedContract(c)}
                            className="p-1.5 rounded-lg border theme-card hover:border-amber-500 text-slate-600 dark:text-slate-400 transition"
                            title="عرض تفاصيل العقد"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPdf(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs"
                            title="تحميل وطباعة العقد الرسمي"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y theme-border">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  {/* Top: Reference and Operation Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm block">
                        {c.referenceNumber}
                      </span>
                      {c.flightNumber && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Plane className="w-3 h-3 text-blue-500" />
                          {c.flightCarrier ? `${c.flightCarrier} - ` : ""}
                          {c.flightNumber}
                        </span>
                      )}
                    </div>
                    <StatusBadge type="operation" status={c.operationType} size="sm" />
                  </div>

                  {/* Route & Customer Details */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border theme-border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">العميل:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{c.customerName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الكابتن:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.captain?.name || "الكابتن"} ({c.vehiclePlate})
                      </span>
                    </div>

                    <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">من:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">{c.origin}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">إلى:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">{c.destination}</span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-slate-400">الموعد:</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{c.tripDate} {c.tripTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setSelectedContract(c)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-mono">{c.passengers?.length || 0} ركاب</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/verify/contract/${c.referenceNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl border theme-card hover:border-emerald-500 text-slate-500 hover:text-emerald-600 transition"
                        title="صفحة التحقق الإلكتروني عبر رمز QR"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </a>
                      <button
                        onClick={() => setSelectedContract(c)}
                        className="p-2 rounded-xl border theme-card hover:border-amber-500 text-slate-600 dark:text-slate-400 transition"
                        title="تفاصيل كشف الركاب"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openPdf(c)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contract Details & Passenger Manifest Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    تفاصيل العقد: {selectedContract.referenceNumber}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    العميل: {selectedContract.customerName} • التاريخ: {selectedContract.tripDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* Trip & Captain Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">الكابتن</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedContract.captain?.name || "كابتن ميقات"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">رقم اللوحة</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedContract.vehiclePlate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">الانطلاق</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedContract.origin}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">الوجهة</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedContract.destination}
                  </span>
                </div>
              </div>

              {/* Passengers Manifest Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    كشف الركاب المعتمد ({selectedContract.passengers?.length || 0} راكباً)
                  </h4>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    الصفحة 2 من العقد
                  </span>
                </div>

                {!selectedContract.passengers?.length ? (
                  <p className="text-xs text-slate-400 p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border theme-border">
                    لا يوجد ركاب مضافين لهذا العقد
                  </p>
                ) : (
                  <div className="rounded-xl border theme-border overflow-x-auto">
                    <table className="w-full text-right text-xs min-w-[340px]">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b theme-border text-slate-500 font-bold">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2">اسم الضيف</th>
                          <th className="px-3 py-2">الجنسية</th>
                          <th className="px-3 py-2">الهوية / الجواز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y theme-border">
                        {selectedContract.passengers.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-400">
                              {p.sequence || idx + 1}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                              {p.name}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              {p.nationality}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                              {p.idNumber || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedContract.notes && (
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">
                    ملاحظات الرحلة:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300">{selectedContract.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t theme-border theme-card-subtle flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <button
                onClick={() => setSelectedContract(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl border theme-card hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إغلاق
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a
                  href={`/verify/contract/${selectedContract.referenceNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border theme-card hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  صفحة التحقق بالـ QR
                </a>
                <button
                  onClick={() => openPdf(selectedContract)}
                  className="flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  استعراض وتحميل PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      {previewPdfId && (
        <PdfPreviewModal
          isOpen={!!previewPdfId}
          onClose={() => setPreviewPdfId(null)}
          contractId={previewPdfId}
          referenceNumber={previewPdfRef}
        />
      )}
    </div>
  );
}
