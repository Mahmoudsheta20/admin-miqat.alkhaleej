"use client";
import { useUiText } from "@/lib/ui-text";

import LoadError from "@/app/_components/LoadError";

import Modal from "@/app/_components/Modal";

import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Gauge,
  Calendar,
  Car,
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
import { PageHeader, FilterBar } from "@/app/_components/ui";
import {
  fetchCached,
  getCachedData,
  invalidateClientCache,
} from "@/lib/clientCache";
import { useLanguage } from "@/lib/languageContext";

export default function FleetManagementPage() {
  const ui = useUiText();

  const { t, isRTL } = useLanguage();
  const cachedFleet =
    getCachedData<Awaited<ReturnType<typeof getVehicles>>>("fleet_vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (Array.isArray(cachedFleet)) return cachedFleet;
    if (
      cachedFleet &&
      typeof cachedFleet === "object" &&
      Array.isArray(cachedFleet.vehicles)
    ) {
      return cachedFleet.vehicles;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => !cachedFleet);
  const [loadError, setLoadError] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
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
    })
      .then((res) => {
        if (res?.success && Array.isArray(res?.vehicles)) {
          setVehicles(res.vehicles);
          setLoadError("");
        } else {
          setLoadError(res.error || "تعذر تحميل البيانات");
        }
      })
      .catch((err) => {
        setLoadError("تعذر الاتصال بالخادم");
        console.error("Failed to load vehicles:", err);
      })
      .finally(() => {
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
      year: new Date().getFullYear(),
      category: "VIP_VAN",
      capacity: 7,
      status: "AVAILABLE",
      registrationExpiry: "",
      insuranceExpiry: "",
      currentMileage: 0,
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
    if (
      !formData.plateNumberAr.trim() ||
      !formData.make.trim() ||
      !formData.model.trim()
    ) {
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

  const availableCount = safeVehicles.filter((v) => v.status === "AVAILABLE").length;
  const onTripCount = safeVehicles.filter((v) => v.status === "ON_TRIP").length;
  const maintenanceCount = safeVehicles.filter((v) => v.status === "MAINTENANCE").length;

  const fleetHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل أسطول المركبات ومتابعة الجاهزية والتراخيص" : "Fleet Management & Readiness Guide",
    summary: isRTL
      ? "يُدار في هذا القسم أسطول حافلات وسيارات شركة ميقات الخليج للنقل البري، مع توثيق اللوحات بالعربية والإنجليزية، السعة الركابية، عداد المسافات، وتواريخ انتهاء الاستمارة والتأمين."
      : "Manages Miqat Al-Khaleej fleet vehicles and buses, tracking Arabic/English plates, passenger capacity, odometer readings, and registration/insurance expiry.",
    cards: [
      {
        title: isRTL ? "١. فئات الأسطول وحالات الجاهزية" : "1. Fleet Categories & Status",
        badge: isRTL ? "إدارة الأسطول" : "Fleet Operations",
        items: [
          {
            label: isRTL ? "تصنيف المركبات" : "Vehicle Classification",
            code: "BUS / COASTER / SUV_VIP",
            description: isRTL
              ? "تحديد فئة المركبة (حافلة، كوستر، جمس VIP، فان، سيدان) وسعة المقاعد لاختيار المركبة المناسبة لحجم الوفد."
              : "Defines vehicle class (Bus, Coaster, VIP SUV, Van, Sedan) and seating capacity for party size matching.",
          },
          {
            label: isRTL ? "حالات التشغيل" : "Operational Statuses",
            code: "AVAILABLE / ON_TRIP / MAINTENANCE",
            description: isRTL
              ? "تتبع ما إذا كانت المركبة جاهزة للتشغيل، أو في رحلة حالية، أو داخل الصيانة الدورية."
              : "Tracks whether a vehicle is available for dispatch, currently on a trip, or undergoing scheduled maintenance.",
          },
        ],
      },
      {
        title: isRTL ? "٢. التراخيص والتأمين والعداد" : "2. Compliance & Mileage",
        badge: isRTL ? "الامتثال النظامي" : "Regulatory Compliance",
        items: [
          {
            label: isRTL ? "صلاحية الاستمارة والتأمين" : "Registration & Insurance Expiry",
            description: isRTL
              ? "مراقبة تواريخ انتهاء رخصة السير (الاستمارة) ووثيقة التأمين لتفادي إيقاف الخدمات أو المخالفات."
              : "Monitors vehicle registration and insurance expiry dates to avoid fines and operational disruption.",
          },
          {
            label: isRTL ? "قراءة عداد المسافات (Odometer)" : "Odometer Tracking",
            description: isRTL
              ? "تحديث المسافة المقطوعة بالكيلومتر لمتابعة مواعيد تغيير الزيوت والإطارات والصيانة الوقائية."
              : "Records kilometers driven to schedule timely oil changes, tyre replacements, and preventative maintenance.",
          },
        ],
      },
      {
        title: isRTL ? "٣. الربط المحاسبي بالمركبة" : "3. Cost Center Accounting",
        badge: isRTL ? "مراكز التكلفة" : "Cost Centers",
        items: [
          {
            label: isRTL ? "الأصول الثابتة للأسطول" : "Fixed Assets",
            code: "1201",
            description: isRTL
              ? "تندرج قيمة أسطول السيارات والحافلات ضمن حساب (1201 - أسطول السيارات والمركبات والحافلات)."
              : "Fleet assets post to account 1201 (Vehicles and Bus Fleet) in the chart of accounts.",
          },
          {
            label: isRTL ? "ربط المصروفات باللوحة" : "Plate Expense Tracking",
            code: "5101 / 5102 / 5104",
            description: isRTL
              ? "عند تسجيل فاتورة وقود أو صيانة أو تأمين في قسم المشتريات، يمكن ربطها برقم لوحة المركبة لتتبع تكلفة كل مركبة."
              : "Supplier fuel, maintenance, and insurance bills link directly to vehicle plates for per-vehicle cost analysis.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "ربط رقم لوحة المركبة بفواتير الوقود والصيانة والعقود يساعدك على معرفة ربحية وتكلفة تشغيل كل مركبة بدقة."
      : "Linking vehicle plates to fuel, repair, and trip contracts provides accurate per-vehicle profitability and operating cost tracking.",
  }), [isRTL]);

  return (
    <div className="space-y-6">
      <LoadError
        message={loadError}
        onRetry={() => {
          void loadVehicles(true);
        }}
        isLoading={isLoading}
      />

      {/* Page Header with On-Demand Guide */}
      <PageHeader
        title={ui(t("fleet.title"))}
        subtitle={ui(t("fleet.subtitle"))}
        badge={isRTL ? "إدارة أسطول النقل" : "Fleet Management"}
        icon={Car}
        onRefresh={() => void loadVehicles(true)}
        isRefreshing={isLoading}
        helpGuide={fleetHelpGuide}
        onSeeded={(msg) => {
          setLoadError("");
          setSeedMessage(msg);
          invalidateClientCache("fleet_vehicles");
          void loadVehicles(true);
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setLoadError(err);
        }}
        primaryAction={{
          label: t("fleet.add"),
          onClick: openAddModal,
          icon: Plus,
          variant: "primary",
        }}
      />

      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {ui(seedMessage)}
        </p>
      )}

      {/* Unified Filter and Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={ui(isRTL ? "البحث باللوحة، الشركة المصنعة، أو الطراز..." : "Search by plate, make, or model...")}
        tabs={[
          { id: "ALL", label: t("common.all"), count: safeVehicles.length },
          { id: "AVAILABLE", label: isRTL ? "جاهزة" : "Available", count: availableCount },
          { id: "ON_TRIP", label: isRTL ? "في رحلة" : "On Trip", count: onTripCount },
          { id: "MAINTENANCE", label: isRTL ? "صيانة" : "Maintenance", count: maintenanceCount },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
      />

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center theme-card rounded-2xl border theme-border">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400">{ui("جاري تحميل أسطول المركبات...")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm theme-card rounded-2xl border theme-border">
          {ui("لا توجد مركبات تطابق شروط البحث.")}</div>
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
                      {ui(v.make)} {ui(v.model)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ui("موديل")}{ui(v.year)} {ui("• سعة")}{ui(v.capacity)} {ui("ركاب")}</p>
                  </div>
                  <StatusBadge type="vehicle" status={v.status} />
                </div>

                {/* Plates Badges */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border theme-border flex items-center justify-between">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">
                      {ui("اللوحة بالعربية")}</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {v.plateNumberAr}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">
                      Plate (EN)
                    </span>
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
                      {ui("العداد الحالي")}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {ui(v.currentMileage?.toLocaleString() || 0)} {ui("كم")}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      {ui("انتهاء الاستمارة")}</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {ui(v.registrationExpiry)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      {ui("انتهاء التأمين")}</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {ui(v.insuranceExpiry)}
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
                  {ui("تعديل")}</button>
                <button
                  onClick={() => setDeleteId(v.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border theme-card hover:border-rose-500 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {ui("حذف")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingVehicle) && (
        <Modal
          label={ui("بيانات المركبة")}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingVehicle(null);
          }}
          isBusy={isSubmitting}
        >
          <div className="mobile-dialog-panel relative w-full max-w-lg flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {ui(editingVehicle
                  ? "تعديل بيانات المركبة"
                  : "إضافة مركبة جديدة للأسطول")}
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

            <form
              onSubmit={handleSave}
              className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                  {ui(formError)}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("رقم اللوحة (عربي) *")}</label>
                  <input
                    type="text"
                    required
                    value={formData.plateNumberAr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plateNumberAr: e.target.value,
                      })
                    }
                    placeholder={ui("ا ص ل 7223")}
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("رقم اللوحة (إنجليزي) *")}</label>
                  <input
                    type="text"
                    required
                    value={formData.plateNumberEn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plateNumberEn: e.target.value,
                      })
                    }
                    placeholder="ASL 7223"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("الشركة المصنعة *")}</label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    placeholder="GMC"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("الموديل والطراز *")}</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="Yukon XL VIP"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("سنة الصنع")}</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("سعة الركاب")}</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("حالة المركبة")}</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as VehicleStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="AVAILABLE">{ui("جاهزة")}</option>
                    <option value="ON_TRIP">{ui("في رحلة")}</option>
                    <option value="MAINTENANCE">{ui("صيانة")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("العداد الحالي (كم)")}</label>
                  <input
                    type="number"
                    value={formData.currentMileage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentMileage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("تاريخ انتهاء الاستمارة")}</label>
                  <input
                    type="text"
                    value={formData.registrationExpiry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationExpiry: e.target.value,
                      })
                    }
                    placeholder="2027/05/14"
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("تاريخ انتهاء التأمين")}</label>
                  <input
                    type="text"
                    value={formData.insuranceExpiry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insuranceExpiry: e.target.value,
                      })
                    }
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
                  {ui("إلغاء")}</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition disabled:opacity-50"
                >
                  {ui(isSubmitting
                    ? "جاري الحفظ..."
                    : editingVehicle
                      ? "حفظ التعديلات"
                      : "إضافة المركبة")}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title={ui("تأكيد حذف المركبة")}
        message="هل أنت متأكد من رغبتك في حذف هذه المركبة من الأسطول بشكل نهائي؟"
        variant="danger"
        confirmText={ui("تأكيد الحذف")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
