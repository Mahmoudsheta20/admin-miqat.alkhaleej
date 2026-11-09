"use client";
import { createHelpGuide } from "./help-guide";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";

import LoadError from "@/app/_components/LoadError";

import Modal from "@/app/_components/Modal";

import React, { useEffect, useId, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, X, Gauge, Calendar, Car } from "lucide-react";
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, VehicleFormData } from "@/app/_actions/fleet";
import { Vehicle, VehicleStatus } from "@/lib/types";
import StatusBadge from "@/app/_components/StatusBadge";
import ConfirmDialog from "@/app/_components/ConfirmDialog";
import {
  PageHeader,
  FilterBar,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui";
import { MobileCardField, MobileCardMetaGrid } from "@/app/_components/mobile";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";
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
  const [search, setSearch] = useUrlState<string>("q", "");
  const [statusFilter, setStatusFilter] = useUrlState<string>("status", "ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId = useId();
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const [capacityInput, setCapacityInput] = useState("7");
  const [mileageInput, setMileageInput] = useState("0");

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
    const defaultYear = new Date().getFullYear();
    setFormData({
      plateNumberAr: "",
      plateNumberEn: "",
      make: "",
      model: "",
      year: defaultYear,
      category: "VIP_VAN",
      capacity: 7,
      status: "AVAILABLE",
      registrationExpiry: "",
      insuranceExpiry: "",
      currentMileage: 0,
    });
    setYearInput(String(defaultYear));
    setCapacityInput("7");
    setMileageInput("0");
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
      category: v.category || "VIP_VAN",
      capacity: v.capacity,
      status: v.status,
      registrationExpiry: v.registrationExpiry,
      insuranceExpiry: v.insuranceExpiry,
      currentMileage: v.currentMileage || 0,
    });
    setYearInput(String(v.year));
    setCapacityInput(String(v.capacity));
    setMileageInput(String(v.currentMileage ?? 0));
    setFormError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.plateNumberAr.trim() ||
      !formData.plateNumberEn.trim() ||
      !formData.make.trim() ||
      !formData.model.trim()
    ) {
      setFormError(
        isRTL
          ? "رقم اللوحة بالعربية والإنجليزية، الماركة والموديل مطلوبة"
          : "Arabic & English plate numbers, make, and model are required",
      );
      return;
    }

    const parsedYear = Number.parseInt(yearInput.trim(), 10);
    const parsedCapacity = Number.parseInt(capacityInput.trim(), 10);
    const parsedMileage = mileageInput.trim() === "" ? 0 : Number.parseInt(mileageInput.trim(), 10);

    if (!Number.isFinite(parsedYear) || parsedYear < 1980 || parsedYear > new Date().getFullYear() + 2) {
      setFormError(isRTL ? "يرجى إدخال سنة صنع صحيحة" : "Please enter a valid model year");
      return;
    }
    if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 120) {
      setFormError(isRTL ? "يرجى إدخال سعة ركاب صحيحة" : "Please enter a valid passenger capacity");
      return;
    }
    if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
      setFormError(isRTL ? "قراءة العداد يجب أن تكون رقماً موجباً أو صفراً" : "Mileage must be zero or positive");
      return;
    }

    const payload: VehicleFormData = {
      ...formData,
      plateNumberAr: formData.plateNumberAr.trim(),
      plateNumberEn: formData.plateNumberEn.trim(),
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: parsedYear,
      capacity: parsedCapacity,
      currentMileage: parsedMileage,
    };

    setIsSubmitting(true);
    setFormError("");

    if (editingVehicle) {
      const res = await updateVehicle(editingVehicle.id, payload);
      if (res.success) {
        setEditingVehicle(null);
        setIsAddModalOpen(false);
        invalidateClientCache("fleet_vehicles");
        invalidateClientCache("dashboard_stats");
        await loadVehicles(true);
      } else {
        setFormError(res.error || "فشل التحديث");
      }
    } else {
      const res = await createVehicle(payload);
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
    const res = await deleteVehicle(deleteId);
    if (!res.success) {
      throw new Error(res.error || (isRTL ? "تعذر حذف المركبة" : "Failed to delete vehicle"));
    }
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

  const fleetHelpGuide = useMemo(() => createHelpGuide(isRTL), [isRTL]);

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
          <p className="text-xs text-[var(--text-muted)]">{ui("جاري تحميل أسطول المركبات...")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-[var(--text-muted)] text-sm theme-card rounded-2xl border theme-border">
          {ui("لا توجد مركبات تطابق شروط البحث.")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((v) => (
            <Card
              key={v.id}
              className="theme-card border theme-border shadow-none flex flex-col justify-between hover:border-amber-500/40 transition-colors"
            >
              <CardHeader className="p-5 pb-3 space-y-0 flex-row items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    {v.make} {v.model}
                  </CardTitle>
                  <CardDescription className="text-xs text-[var(--text-muted)] mt-0">
                    {ui("موديل")} {v.year} {ui("• سعة")} {v.capacity} {ui("ركاب")}
                  </CardDescription>
                </div>
                <CardAction>
                  <StatusBadge type="vehicle" status={v.status} />
                </CardAction>
              </CardHeader>

              <CardContent className="px-5 pb-4 pt-0 space-y-3.5">
                {/* Plates Badges */}
                <MobileCardMetaGrid>
                  <MobileCardField
                    label={ui("اللوحة بالعربية")}
                    value={<bdi>{v.plateNumberAr}</bdi>}
                  />
                  <MobileCardField
                    label={ui("اللوحة بالإنجليزية")}
                    mono
                    value={<bdi dir="ltr">{v.plateNumberEn}</bdi>}
                    alignEnd
                  />
                </MobileCardMetaGrid>

                {/* Specs */}
                <div className="space-y-2 text-xs text-[var(--text-muted)] dark:text-slate-400">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Gauge className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      {ui("العداد الحالي")}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {(v.currentMileage ?? 0).toLocaleString()} {ui("كم")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
                      {ui("انتهاء الاستمارة")}
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                      {v.registrationExpiry}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                      {ui("انتهاء التأمين")}
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                      {v.insuranceExpiry}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="mt-0 px-5 py-3 border-t theme-border flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(v)}
                  className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 gap-1.5 text-xs font-bold"
                >
                  <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("تعديل")}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteId(v.id)}
                  className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:border-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("حذف")}</span>
                </Button>
              </CardFooter>
            </Card>
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
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                {ui(editingVehicle
                  ? "تعديل بيانات المركبة"
                  : "إضافة مركبة جديدة للأسطول")}
              </h3>
              <button
                type="button"
                aria-label={ui("إغلاق")}
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingVehicle(null);
                }}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1"
            >
              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold"
                >
                  {ui(formError)}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor={`${formId}-plateAr`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("رقم اللوحة (عربي) *")}</label>
                  <input
                    id={`${formId}-plateAr`}
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
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-plateEn`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("رقم اللوحة (إنجليزي) *")}</label>
                  <input
                    id={`${formId}-plateEn`}
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
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-make`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("الشركة المصنعة *")}</label>
                  <input
                    id={`${formId}-make`}
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    placeholder="GMC"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-model`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("الموديل والطراز *")}</label>
                  <input
                    id={`${formId}-model`}
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="Yukon XL VIP"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-category`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("فئة المركبة")}</label>
                  <select
                    id={`${formId}-category`}
                    value={formData.category || "VIP_VAN"}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="VIP_VAN">{ui("فان VIP")}</option>
                    <option value="SUV_VIP">{ui("دفع رباعي VIP")}</option>
                    <option value="BUS">{ui("حافلة كبيرة")}</option>
                    <option value="COASTER">{ui("كوستر متوسط")}</option>
                    <option value="SEDAN">{ui("سيدان")}</option>
                    {formData.category &&
                      !["VIP_VAN", "SUV_VIP", "BUS", "COASTER", "SEDAN"].includes(formData.category) && (
                        <option value={formData.category}>{formData.category}</option>
                      )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-status`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("حالة المركبة")}</label>
                  <select
                    id={`${formId}-status`}
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as VehicleStatus,
                      })
                    }
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="AVAILABLE">{ui("جاهزة")}</option>
                    <option value="ON_TRIP">{ui("في رحلة")}</option>
                    <option value="MAINTENANCE">{ui("صيانة")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-year`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("سنة الصنع")}</label>
                  <input
                    id={`${formId}-year`}
                    type="text"
                    inputMode="numeric"
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-capacity`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("سعة الركاب")}</label>
                  <input
                    id={`${formId}-capacity`}
                    type="text"
                    inputMode="numeric"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor={`${formId}-mileage`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("العداد الحالي (كم)")}</label>
                  <input
                    id={`${formId}-mileage`}
                    type="text"
                    inputMode="numeric"
                    value={mileageInput}
                    onChange={(e) => setMileageInput(e.target.value.replace(/[^\d]/g, ""))}
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-regExpiry`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("تاريخ انتهاء الاستمارة")}</label>
                  <input
                    id={`${formId}-regExpiry`}
                    type="text"
                    value={formData.registrationExpiry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationExpiry: e.target.value,
                      })
                    }
                    placeholder="2027-05-14"
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-insExpiry`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("تاريخ انتهاء التأمين")}</label>
                  <input
                    id={`${formId}-insExpiry`}
                    type="text"
                    value={formData.insuranceExpiry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insuranceExpiry: e.target.value,
                      })
                    }
                    placeholder="2027-01-20"
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
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
                  className="min-h-11 px-4 py-2 text-xs font-bold rounded-xl border theme-card hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {ui("إلغاء")}</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-11 px-5 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition disabled:opacity-50"
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
