"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import ImageUpload from "@/app/_components/ImageUpload";
import {
  UserPlus,
  Search,
  Phone,
  CreditCard,
  Car,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  FileCheck,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import {
  getCaptains,
  createCaptain,
  updateCaptain,
  deleteCaptain,
  resetCaptainTemporaryPassword,
  CaptainFormData,
} from "@/app/_actions/captain";
import { SystemUser } from "@/lib/types";
import StatusBadge from "@/app/_components/StatusBadge";
import ConfirmDialog from "@/app/_components/ConfirmDialog";

type CaptainItem = SystemUser & {
  contractCount: number;
  hasTodayInspection: boolean;
};

export default function CaptainsManagementPage() {
  const [captains, setCaptains] = useState<CaptainItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCaptain, setEditingCaptain] = useState<CaptainItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Temporary password display modal
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    open: boolean;
    captainName: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isResettingId, setIsResettingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CaptainFormData>({
    name: "",
    email: "",
    phone: "",
    nationalId: "",
    licenseNumber: "",
    licenseExpiry: "",
    assignedVehiclePlate: "",
    avatarUrl: "",
  });

  const loadCaptains = async () => {
    setIsLoading(true);
    const res = await getCaptains();
    if (res.success && res.captains) {
      setCaptains(res.captains);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCaptains();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      nationalId: "",
      licenseNumber: "",
      licenseExpiry: "",
      assignedVehiclePlate: "",
      avatarUrl: "",
    });
    setFormError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: CaptainItem) => {
    setEditingCaptain(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      nationalId: c.nationalId || "",
      licenseNumber: c.licenseNumber || "",
      licenseExpiry: c.licenseExpiry || "",
      assignedVehiclePlate: c.assignedVehiclePlate || "",
      avatarUrl: c.avatarUrl || "",
    });
    setFormError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("الاسم والبريد الإلكتروني مطلوبان");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    if (editingCaptain) {
      const res = await updateCaptain(editingCaptain.id, formData);
      if (res.success) {
        setEditingCaptain(null);
        await loadCaptains();
      } else {
        setFormError(res.error || "فشل التحديث");
      }
    } else {
      const res = await createCaptain(formData);
      if (res.success && res.captain) {
        setIsAddModalOpen(false);
        await loadCaptains();
        if (res.temporaryPassword) {
          setTempPasswordModal({
            open: true,
            captainName: res.captain.name,
            email: res.captain.email,
            tempPassword: res.temporaryPassword,
          });
        }
      } else {
        setFormError(res.error || "فشل الإضافة");
      }
    }

    setIsSubmitting(false);
  };

  const handleResetPassword = async (c: CaptainItem) => {
    setIsResettingId(c.id);
    try {
      const res = await resetCaptainTemporaryPassword(c.id);
      if (res.success && res.temporaryPassword) {
        setTempPasswordModal({
          open: true,
          captainName: c.name,
          email: c.email,
          tempPassword: res.temporaryPassword,
        });
      } else {
        alert(res.error || "تعذر توليد كلمة المرور المؤقتة");
      }
    } finally {
      setIsResettingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCaptain(deleteId);
    setDeleteId(null);
    await loadCaptains();
  };

  const filtered = captains.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.nationalId && c.nationalId.includes(q)) ||
      (c.assignedVehiclePlate && c.assignedVehiclePlate.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            إدارة الكباتن
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            سجل الكباتن، الفحص الميداني اليومي، ورخص القيادة المعتمدة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCaptains}
            disabled={isLoading}
            className="p-2 rounded-xl border theme-card hover:border-amber-500 transition text-slate-600 dark:text-slate-400 disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl gold-gradient-btn transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            إضافة كابتن جديد
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="theme-card p-4 rounded-2xl border theme-border flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="البحث بالاسم، رقم الهوية، رقم الجوال، أو اللوحة..."
          className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            إلغاء
          </button>
        )}
      </div>

      {/* Table */}
      <div className="theme-card rounded-2xl overflow-hidden border theme-border">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">جاري تحميل قائمة الكباتن...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا يوجد كباتن مسجلين يطابقون شروط البحث.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b theme-border text-slate-500 dark:text-slate-400 font-bold">
                  <tr>
                    <th className="px-5 py-3.5">الكابتن</th>
                    <th className="px-5 py-3.5">رقم الهوية / الرخصة</th>
                    <th className="px-5 py-3.5">المركبة المسندة</th>
                    <th className="px-5 py-3.5">فحص اليوم</th>
                    <th className="px-5 py-3.5">إجمالي العقود</th>
                    <th className="px-5 py-3.5">الحالة</th>
                    <th className="px-5 py-3.5 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border text-slate-800 dark:text-slate-200">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {c.avatarUrl ? (
                              <Image
                                src={c.avatarUrl}
                                alt={c.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <span>{c.name.slice(0, 1)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{c.email}</span>
                              {c.phone && (
                                <span className="font-mono text-slate-400" dir="ltr">
                                  {c.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {c.nationalId || "—"}
                          </div>
                          {c.licenseNumber && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              رخصة: {c.licenseNumber}
                            </div>
                          )}
                          {c.licenseExpiry && (
                            <div className="text-[10px] text-slate-400">
                              انتهاء: {c.licenseExpiry}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {c.assignedVehiclePlate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <Car className="w-3.5 h-3.5 text-amber-500" />
                            {c.assignedVehiclePlate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">غير مسندة</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {c.hasTodayInspection ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم الفحص
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <XCircle className="w-3.5 h-3.5" />
                            بانتظار الفحص
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {c.contractCount}
                        </span>
                        <span className="text-[11px] text-slate-400 mr-1">عقد</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          type="captain"
                          status={c.active ? "ACTIVE" : "INACTIVE"}
                        />
                      </td>
                      <td className="px-5 py-4 text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleResetPassword(c)}
                            disabled={isResettingId === c.id}
                            className="p-1.5 rounded-lg border theme-card hover:border-amber-500 text-amber-600 dark:text-amber-400 transition"
                            title="توليد كلمة مرور مؤقتة جديدة للكابتن"
                          >
                            <KeyRound className={`w-3.5 h-3.5 ${isResettingId === c.id ? "animate-spin" : ""}`} />
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg border theme-card hover:border-amber-500 text-slate-600 dark:text-slate-400 transition"
                            title="تعديل بيانات الكابتن"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="p-1.5 rounded-lg border theme-card hover:border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="حذف / تعطيل الكابتن"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Captain Cards */}
            <div className="md:hidden divide-y theme-border">
              {filtered.map((c) => (
                <div key={c.id} className="p-4 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  {/* Top Bar: Avatar, Name, and Status */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-sm shrink-0">
                        {c.avatarUrl ? (
                          <Image
                            src={c.avatarUrl}
                            alt={c.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span>{c.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate" dir="ltr">
                          {c.email}
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      type="captain"
                      status={c.active ? "ACTIVE" : "INACTIVE"}
                    />
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border theme-border">
                    <div>
                      <span className="text-slate-400 text-[11px] block">الهوية الوطنية</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                        {c.nationalId || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">المركبة المسندة</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {c.assignedVehiclePlate || "غير مسندة"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">فحص اليوم</span>
                      <span className="mt-0.5 inline-block">
                        {c.hasTodayInspection ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> تم الفحص
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> بانتظار الفحص
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">إجمالي العقود</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {c.contractCount} عقد
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleResetPassword(c)}
                      disabled={isResettingId === c.id}
                      className="px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold transition text-xs flex items-center gap-1.5"
                      title="توليد كلمة مرور مؤقتة"
                    >
                      <KeyRound className={`w-3.5 h-3.5 ${isResettingId === c.id ? "animate-spin" : ""}`} />
                      <span>كلمة مؤقتة</span>
                    </button>
                    <button
                      onClick={() => openEditModal(c)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                      تعديل البيانات
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-xs"
                      title="حذف / تعطيل الكابتن"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingCaptain) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {editingCaptain ? "تعديل بيانات الكابتن" : "إضافة كابتن جديد للنظام"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCaptain(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                  {formError}
                </div>
              )}

              {/* Captain Photo Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border">
                <ImageUpload
                  value={formData.avatarUrl}
                  onChange={(url) => setFormData({ ...formData, avatarUrl: url })}
                  onRemove={() => setFormData({ ...formData, avatarUrl: "" })}
                  label="صورة الكابتن الرسمية (تظهر في عقد النقل والبطاقة)"
                  shape="rounded"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    اسم الكابتن بالكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: علي أحمد غلام أحمد"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="captain@miqat.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    رقم الجوال
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0542273515"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    رقم الهوية الوطنية / الإقامة
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId || ""}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="2553660073"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    رقم رخصة القيادة
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber || ""}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="SA-39482910"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تاريخ انتهاء الرخصة
                  </label>
                  <input
                    type="text"
                    value={formData.licenseExpiry || ""}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    placeholder="2028/04/22"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    لوحة المركبة المسندة
                  </label>
                  <input
                    type="text"
                    value={formData.assignedVehiclePlate || ""}
                    onChange={(e) => setFormData({ ...formData, assignedVehiclePlate: e.target.value })}
                    placeholder="ا ص ل 7223"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCaptain(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl border theme-card hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition disabled:opacity-50"
                >
                  {isSubmitting ? "جاري الحفظ..." : editingCaptain ? "حفظ التعديلات" : "إضافة الكابتن"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="تأكيد حذف / إلغاء تفعيل الكابتن"
        message="هل أنت متأكد من رغبتك في حذف هذا الكابتن؟ إذا كان مرتبطاً بعقود سابقة، سيتم تعطيل حسابه فقط حفاظاً على سجلات النظام."
        variant="danger"
        confirmText="تأكيد الحذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Temporary Password Display Modal */}
      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="theme-card w-full max-w-md rounded-3xl border theme-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    كلمة المرور المؤقتة للحساب
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {tempPasswordModal.captainName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTempPasswordModal(null);
                  setCopied(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">يرجى تزويد الكابتن ببيانات الدخول التالية:</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                سيتوجب على الكابتن إدخال كلمة المرور المؤقتة لتسجيل الدخول، ثم تغييرها وتعيين كلمة سر خاصة به فور دخوله الأول.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border theme-border flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">البريد الإلكتروني:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                  {tempPasswordModal.email}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">كلمة المرور المؤقتة:</span>
                  <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400 tracking-wider select-all" dir="ltr">
                    {tempPasswordModal.tempPassword}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPasswordModal.tempPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    copied
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "gold-gradient-btn text-slate-900 font-black shadow-xs hover:shadow-md"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      تم النسخ!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      نسخ
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setTempPasswordModal(null);
                  setCopied(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                تم، إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
