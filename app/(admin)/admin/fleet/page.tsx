"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Gauge,
  Calendar,
} from "lucide-react";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  VehicleFormData,
} from "@/app/_actions/fleet";
import { Vehicle, VehicleStatus } from "@/lib/types";
import StatusBadge from "@/app/_components/StatusBadge";
import ConfirmDialog from "@/app/_components/ConfirmDialog";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

export default function FleetManagementPage() {
  const cachedFleet = getCachedData<Awaited<ReturnType<typeof getVehicles>>>("fleet_vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (Array.isArray(cachedFleet)) return cachedFleet;
    if (cachedFleet && typeof cachedFleet === "object" && Array.isArray(cachedFleet.vehicles)) {
      return cachedFleet.vehicles;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => !cachedFleet);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState<VehicleFormData>({
    plateNumberAr: "",
    plateNumberEn: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    category: "VIP_VAN",
    capacity: 7,
    status: "AVAILABLE",
    registrationExpiry: "",
    insuranceExpiry: "",
    currentMileage: 0,
  });

  const loadVehicles = async (forceRefresh = false) => {
    return fetchCached("fleet_vehicles", getVehicles, {
        ttlMs: 120_000,
        forceRefresh,
      }).then(res => {
      if (res?.success && Array.isArray(res?.vehicles)) {
        setVehicles(res.vehicles);
      }
    }).catch(err => {
      console.error("Failed to load vehicles:", err);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const openAddModal = () => {
    setFormData({
      plateNumberAr: "",
      plateNumberEn: "",
      make: "",
      model: "",
      year: 2025,
      category: "VIP_VAN",
      capacity: 7,
      status: "AVAILABLE",
      registrationExpiry: "2027/05/14",
      insuranceExpiry: "2027/01/20",
      currentMileage: 10000,
    });
    setFormError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      plateNumberAr: v.plateNumberAr,
      plateNumberEn: v.plateNumberEn,
      make: v.make,
      model: v.model,
      year: v.year,
      category: v.category,
      capacity: v.capacity,
      status: v.status,
      registrationExpiry: v.registrationExpiry,
      insuranceExpiry: v.insuranceExpiry,
      currentMileage: v.currentMileage || 0,
    });
    setFormError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plateNumberAr.trim() || !formData.make.trim() || !formData.model.trim()) {
      setFormError("رقم اللوحة، الماركة والموديل مطلوبة");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    if (editingVehicle) {
      const res = await updateVehicle(editingVehicle.id, formData);
      if (res.success) {
        setEditingVehicle(null);
        invalidateClientCache("fleet_vehicles");
        invalidateClientCache("dashboard_stats");
        await loadVehicles(true);
      } else {
        setFormError(res.error || "فشل التحديث");
      }
    } else {
      const res = await createVehicle(formData);
      if (res.success) {
        setIsAddModalOpen(false);
        invalidateClientCache("fleet_vehicles");
        invalidateClientCache("dashboard_stats");
        await loadVehicles(true);
      } else {
        setFormError(res.error || "فشل الإضافة");
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteVehicle(deleteId);
    setDeleteId(null);
    invalidateClientCache("fleet_vehicles");
    invalidateClientCache("dashboard_stats");
    await loadVehicles(true);
  };

  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const filtered = safeVehicles.filter((v) => {
    if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.plateNumberAr.includes(q) ||
      v.plateNumberEn.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            أسطول المركبات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة حافلات وسيارات ميقات الخليج ومتابعة الجاهزية والتأمين
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadVehicles(true)}
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
            <Plus className="w-4 h-4" />
            إضافة مركبة جديدة
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full theme-card p-3 rounded-2xl border theme-border flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باللوحة، الشركة المصنعة، أو الطراز..."
            className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {["ALL", "AVAILABLE", "ON_TRIP", "MAINTENANCE"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${
                statusFilter === st
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : "theme-card text-slate-600 dark:text-slate-400 hover:border-amber-500"
              }`}
            >
              {st === "ALL" && "الكل"}
              {st === "AVAILABLE" && "جاهزة"}
              {st === "ON_TRIP" && "في رحلة"}
              {st === "MAINTENANCE" && "صيانة"}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center theme-card rounded-2xl border theme-border">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400">جاري تحميل أسطول المركبات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm theme-card rounded-2xl border theme-border">
          لا توجد مركبات تطابق شروط البحث.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="theme-card rounded-2xl border theme-border p-5 flex flex-col justify-between hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {v.make} {v.model}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      موديل {v.year} • سعة {v.capacity} ركاب
                    </p>
                  </div>
                  <StatusBadge type="vehicle" status={v.status} />
                </div>

                {/* Plates Badges */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border theme-border flex items-center justify-between">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">اللوحة بالعربية</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {v.plateNumberAr}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Plate (EN)</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {v.plateNumberEn}
                    </span>
                  </div>
                </div>

                {/* Specs */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Gauge className="w-3.5 h-3.5 text-amber-500" />
                      العداد الحالي
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {v.currentMileage?.toLocaleString() || 0} كم
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      انتهاء الاستمارة
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {v.registrationExpiry}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      انتهاء التأمين
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {v.insuranceExpiry}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t theme-border flex items-center justify-between">
                <button
                  onClick={() => openEditModal(v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  تعديل
                </button>
                <button
                  onClick={() => setDeleteId(v.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border theme-card hover:border-rose-500 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="mobile-dialog-panel relative w-full max-w-lg flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {editingVehicle ? "تعديل بيانات المركبة" : "إضافة مركبة جديدة للأسطول"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingVehicle(null);
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    رقم اللوحة (عربي) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plateNumberAr}
                    onChange={(e) => setFormData({ ...formData, plateNumberAr: e.target.value })}
                    placeholder="ا ص ل 7223"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    رقم اللوحة (إنجليزي) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plateNumberEn}
                    onChange={(e) => setFormData({ ...formData, plateNumberEn: e.target.value })}
                    placeholder="ASL 7223"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    الشركة المصنعة *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="GMC"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    الموديل والطراز *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Yukon XL VIP"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    سنة الصنع
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    سعة الركاب
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    حالة المركبة
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="AVAILABLE">جاهزة</option>
                    <option value="ON_TRIP">في رحلة</option>
                    <option value="MAINTENANCE">صيانة</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    العداد الحالي (كم)
                  </label>
                  <input
                    type="number"
                    value={formData.currentMileage}
                    onChange={(e) => setFormData({ ...formData, currentMileage: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تاريخ انتهاء الاستمارة
                  </label>
                  <input
                    type="text"
                    value={formData.registrationExpiry}
                    onChange={(e) => setFormData({ ...formData, registrationExpiry: e.target.value })}
                    placeholder="2027/05/14"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تاريخ انتهاء التأمين
                  </label>
                  <input
                    type="text"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    placeholder="2027/01/20"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingVehicle(null);
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
                  {isSubmitting ? "جاري الحفظ..." : editingVehicle ? "حفظ التعديلات" : "إضافة المركبة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="تأكيد حذف المركبة"
        message="هل أنت متأكد من رغبتك في حذف هذه المركبة من الأسطول بشكل نهائي؟"
        variant="danger"
        confirmText="تأكيد الحذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
