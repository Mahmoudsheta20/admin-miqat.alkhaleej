"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  Check,
  ShieldCheck,
  Car,
  Phone,
  Calendar,
  Clock,
  ChevronDown,
  ChevronLeft,
  X,
  FileText,
  AlertTriangle,
  UserCheck,
  Gauge,
  Flame,
  ShieldAlert,
  Sparkles,
  Edit3,
} from "lucide-react";
import {
  getCaptainsInspectionOverview,
  directPassInspection,
  getAllInspectionsList,
  deleteInspection,
  submitInspection,
  CaptainInspectionItem,
  InspectionWithMeta,
  InspectionInput,
} from "@/app/_actions/inspection";
import { getVehicles } from "@/app/_actions/fleet";
import { Vehicle, VehicleInspection } from "@/lib/types";
import InspectionPdfPreviewModal from "@/app/_components/InspectionPdfPreviewModal";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { getSaudiTodayDateStr, formatOfficialDate } from "@/lib/contractConstants";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

// Checklist Definitions
interface CheckItemConfig {
  key: keyof Omit<
    InspectionInput,
    "captainId" | "vehiclePlate" | "driverDeclared" | "notes" | "inspectionDate"
  >;
  titleAr: string;
  titleEn: string;
  category: "dashboard" | "external" | "safety";
}

const DASHBOARD_ITEMS: CheckItemConfig[] = [
  { key: "fuelGauge", titleAr: "مؤشر الوقود", titleEn: "Fuel Gauge", category: "dashboard" },
  { key: "tempGauge", titleAr: "مؤشر الحرارة", titleEn: "Temp Gauge", category: "dashboard" },
  { key: "oilPressure", titleAr: "مؤشر ضغط الزيت", titleEn: "Oil Pressure", category: "dashboard" },
  { key: "checkEngine", titleAr: "لمبة فحص المحرك", titleEn: "Check Engine", category: "dashboard" },
  { key: "absLight", titleAr: "لمبة نظام ABS", titleEn: "ABS Light", category: "dashboard" },
  { key: "warningLights", titleAr: "لمبات التحذير العامة", titleEn: "Warning Lights", category: "dashboard" },
];

const EXTERNAL_ITEMS: CheckItemConfig[] = [
  { key: "tires", titleAr: "الإطارات وضغط الهواء", titleEn: "Tires & Pressure", category: "external" },
  { key: "headlights", titleAr: "الأنوار الأمامية والخلفية", titleEn: "Headlights", category: "external" },
  { key: "signals", titleAr: "إشارات الانعطاف والطوارئ", titleEn: "Signals & Hazard", category: "external" },
  { key: "mirrors", titleAr: "الزجاج والمرايا الجانبية", titleEn: "Mirrors & Glass", category: "external" },
  { key: "noLeaks", titleAr: "عدم وجود تسريبات أسفل الحافلة", titleEn: "No Fluid Leaks", category: "external" },
];

const SAFETY_ITEMS: CheckItemConfig[] = [
  { key: "fireExtinguisher", titleAr: "طفاية حريق سارية الصلاحية", titleEn: "Fire Extinguisher", category: "safety" },
  { key: "warningTriangle", titleAr: "المثلث العاكس للتحذير", titleEn: "Warning Triangle", category: "safety" },
  { key: "firstAidKit", titleAr: "حقيبة الإسعافات الأولية", titleEn: "First Aid Kit", category: "safety" },
  { key: "glassHammer", titleAr: "مطرقة كسر الزجاج", titleEn: "Glass Hammer", category: "safety" },
  { key: "seatBelts", titleAr: "أحزمة الأمان لجميع المقاعد", titleEn: "Seat Belts", category: "safety" },
];

const ALL_CHECK_ITEMS = [...DASHBOARD_ITEMS, ...EXTERNAL_ITEMS, ...SAFETY_ITEMS];

export default function AdminInspectionsPage() {
  const cachedOverview = getCachedData<any>("inspections_overview");
  const cachedHistory = getCachedData<any>("inspections_history");
  const cachedVehicles = getCachedData<any>("fleet_vehicles");

  const [activeTab, setActiveTab] = useState<"captains" | "history">("captains");
  const [captains, setCaptains] = useState<CaptainInspectionItem[]>(() => {
    if (Array.isArray(cachedOverview)) return cachedOverview;
    if (cachedOverview && typeof cachedOverview === "object" && Array.isArray(cachedOverview.captains)) {
      return cachedOverview.captains;
    }
    return [];
  });
  const [inspections, setInspections] = useState<InspectionWithMeta[]>(() => {
    if (Array.isArray(cachedHistory)) return cachedHistory;
    if (cachedHistory && typeof cachedHistory === "object" && Array.isArray(cachedHistory.inspections)) {
      return cachedHistory.inspections;
    }
    return [];
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (Array.isArray(cachedVehicles)) return cachedVehicles;
    if (cachedVehicles && typeof cachedVehicles === "object" && Array.isArray(cachedVehicles.vehicles)) {
      return cachedVehicles.vehicles;
    }
    return [];
  });
  const [stats, setStats] = useState<{
    totalCaptains: number;
    inspectedToday: number;
    pendingToday: number;
    totalInspections: number;
  }>(() => ({
    totalCaptains: cachedOverview?.stats?.totalCaptains || 0,
    inspectedToday: cachedOverview?.stats?.inspectedToday || 0,
    pendingToday: cachedOverview?.stats?.pendingToday || 0,
    totalInspections: cachedOverview?.stats?.totalInspections || 0,
  }));

  const [isLoading, setIsLoading] = useState(() => !cachedOverview);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "INSPECTED">("ALL");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [captainFilter, setCaptainFilter] = useState("");

  // Direct pass action loading indicator per captain ID
  const [executingCaptainId, setExecutingCaptainId] = useState<string | null>(null);

  // Notification Banner
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [selectedInspectionForView, setSelectedInspectionForView] = useState<VehicleInspection | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewPdfInspection, setPreviewPdfInspection] = useState<{
    id: string;
    captainName?: string;
    vehiclePlate?: string;
  } | null>(null);

  // Custom Form state
  const [customCaptainId, setCustomCaptainId] = useState("");
  const [customVehiclePlate, setCustomVehiclePlate] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customInspectionDateMode, setCustomInspectionDateMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [customInspectionDate, setCustomInspectionDate] = useState(() => getSaudiTodayDateStr());
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [customChecks, setCustomChecks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    ALL_CHECK_ITEMS.forEach((item) => {
      init[item.key] = true;
    });
    return init;
  });

  const safeCaptains = Array.isArray(captains) ? captains : [];
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeInspections = Array.isArray(inspections) ? inspections : [];

  // Load Data with caching and deduplication
  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else if ((Array.isArray(captains) ? captains.length : 0) === 0) setIsLoading(true);

    try {
      const [overviewRes, historyRes, vehiclesRes] = await Promise.all([
        fetchCached("inspections_overview", getCaptainsInspectionOverview, {
          ttlMs: 60_000,
          forceRefresh: showRefresh,
        }),
        fetchCached(
          "inspections_history",
          () => getAllInspectionsList({ limit: 40 }),
          {
            ttlMs: 60_000,
            forceRefresh: showRefresh,
          }
        ),
        fetchCached("fleet_vehicles", getVehicles, {
          ttlMs: 120_000,
          forceRefresh: showRefresh,
        }),
      ]);

      if (overviewRes?.success && Array.isArray(overviewRes?.captains)) {
        setCaptains(overviewRes.captains);
        if (overviewRes.stats) {
          setStats(overviewRes.stats);
        }
      }

      if (historyRes?.success && Array.isArray(historyRes?.inspections)) {
        setInspections(historyRes.inspections);
      }

      if (vehiclesRes?.success && Array.isArray(vehiclesRes?.vehicles)) {
        setVehicles(vehiclesRes.vehicles);
      }
    } catch (error) {
      console.error("Failed to load inspection data:", error);
      showBanner("error", "تعذر جلب بيانات الفحص التشغيلي");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // 1-Click Direct Inspection Finish Action
  const handleDirectPass = async (captain: CaptainInspectionItem) => {
    setExecutingCaptainId(captain.id);
    try {
      const res = await directPassInspection(
        captain.id,
        captain.assignedVehiclePlate || undefined,
        "تم الفحص والاعتماد المباشر من قبل إدارة العمليات (اجتياز كامل الفحص التشغيلي)"
      );

      if (res.success && res.inspection) {
        showBanner("success", `⚡ تم إتمام واعتماد الفحص المباشر للكابتن (${captain.name}) بنجاح!`);

        // Update local state immediately for snappy response
        setCaptains((prev) =>
          prev.map((c) =>
            c.id === captain.id
              ? {
                  ...c,
                  hasTodayInspection: true,
                  todayInspection: res.inspection!,
                  totalInspections: c.totalInspections + 1,
                }
              : c
          )
        );

        setStats((prev) => ({
          ...prev,
          inspectedToday: prev.inspectedToday + (captain.hasTodayInspection ? 0 : 1),
          pendingToday: Math.max(0, prev.pendingToday - (captain.hasTodayInspection ? 0 : 1)),
          totalInspections: prev.totalInspections + (captain.hasTodayInspection ? 0 : 1),
        }));

        // Invalidate inspections cache
        invalidateClientCache("inspections_");
        invalidateClientCache("dashboard_stats");

        // Silently reload history in background
        getAllInspectionsList({ limit: 40 }).then((hRes) => {
          if (hRes.success && hRes.inspections) {
            setInspections(hRes.inspections);
          }
        });
      } else {
        showBanner("error", res.error || "فشل إتمام الفحص المباشر");
      }
    } catch (err) {
      console.error("Direct pass error:", err);
      showBanner("error", "حدث خطأ غير متوقع أثناء إتمام الفحص");
    } finally {
      setExecutingCaptainId(null);
    }
  };

  // Submit custom inspection modal
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCaptainId) {
      showBanner("error", "يرجى اختيار الكابتن");
      return;
    }

    const selectedCap = safeCaptains.find((c) => c.id === customCaptainId);
    const effectivePlate =
      customVehiclePlate.trim() || selectedCap?.assignedVehiclePlate || "ا ص ل 7223";

    const effectiveDate =
      customInspectionDateMode === "MANUAL" && customInspectionDate
        ? customInspectionDate
        : getSaudiTodayDateStr();

    setIsSubmittingCustom(true);

    try {
      const res = await submitInspection({
        captainId: customCaptainId,
        vehiclePlate: effectivePlate,
        inspectionDate: effectiveDate,
        fuelGauge: Boolean(customChecks.fuelGauge),
        tempGauge: Boolean(customChecks.tempGauge),
        oilPressure: Boolean(customChecks.oilPressure),
        checkEngine: Boolean(customChecks.checkEngine),
        absLight: Boolean(customChecks.absLight),
        warningLights: Boolean(customChecks.warningLights),
        tires: Boolean(customChecks.tires),
        headlights: Boolean(customChecks.headlights),
        signals: Boolean(customChecks.signals),
        mirrors: Boolean(customChecks.mirrors),
        noLeaks: Boolean(customChecks.noLeaks),
        fireExtinguisher: Boolean(customChecks.fireExtinguisher),
        warningTriangle: Boolean(customChecks.warningTriangle),
        firstAidKit: Boolean(customChecks.firstAidKit),
        glassHammer: Boolean(customChecks.glassHammer),
        seatBelts: Boolean(customChecks.seatBelts),
        driverDeclared: true,
        notes: customNotes.trim() || "تم الفحص والاعتماد التشغيلي من قبل الإدارة",
      });

      if (res.success && res.inspection) {
        showBanner("success", "تم حفظ وتوثيق الفحص التشغيلي بنجاح");
        setIsCustomModalOpen(false);
        resetCustomForm();
        invalidateClientCache("inspections_");
        invalidateClientCache("dashboard_stats");
        loadData(true);
      } else {
        showBanner("error", res.error || "تعذر حفظ الفحص");
      }
    } catch (err) {
      console.error("Custom inspection submit error:", err);
      showBanner("error", "حدث خطأ غير متوقع");
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const resetCustomForm = () => {
    setCustomCaptainId("");
    setCustomVehiclePlate("");
    setCustomNotes("");
    setCustomInspectionDateMode("AUTO");
    setCustomInspectionDate(getSaudiTodayDateStr());
    const init: Record<string, boolean> = {};
    ALL_CHECK_ITEMS.forEach((item) => {
      init[item.key] = true;
    });
    setCustomChecks(init);
  };

  const handleDeleteInspection = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const res = await deleteInspection(deleteConfirmId);
      if (res.success) {
        showBanner("success", "تم حذف سجل الفحص التشغيلي بنجاح");
        setInspections((prev) => prev.filter((i) => i.id !== deleteConfirmId));
        setDeleteConfirmId(null);
        invalidateClientCache("inspections_");
        invalidateClientCache("dashboard_stats");
        loadData(true);
      } else {
        showBanner("error", res.error || "تعذر حذف سجل الفحص");
      }
    } catch (err) {
      console.error("Delete inspection error:", err);
      showBanner("error", "حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered captains
  const filteredCaptains = useMemo(() => {
    return safeCaptains.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.assignedVehiclePlate && c.assignedVehiclePlate.includes(search));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "INSPECTED" && c.hasTodayInspection) ||
        (statusFilter === "PENDING" && !c.hasTodayInspection);

      const matchesCaptain = !captainFilter || c.id === captainFilter;

      return matchesSearch && matchesStatus && matchesCaptain;
    });
  }, [safeCaptains, search, statusFilter, captainFilter]);

  // Filtered history inspections
  const filteredInspections = useMemo(() => {
    return safeInspections.filter((insp) => {
      const matchesSearch =
        search === "" ||
        (insp.captainName && insp.captainName.toLowerCase().includes(search.toLowerCase())) ||
        (insp.vehiclePlate && insp.vehiclePlate.includes(search)) ||
        (insp.notes && insp.notes.toLowerCase().includes(search.toLowerCase())) ||
        insp.id.toLowerCase().includes(search.toLowerCase());

      const rawDate = String(insp.inspectionDate || insp.createdAt || "").replace(/\//g, "-");
      const matchesDate = !historyDateFilter || rawDate.startsWith(historyDateFilter);

      const matchesCaptain = !captainFilter || insp.captainId === captainFilter;

      return matchesSearch && matchesDate && matchesCaptain;
    });
  }, [inspections, search, historyDateFilter, captainFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {banner && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
            banner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {banner.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <p className="text-sm font-bold">{banner.message}</p>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
              إدارة السلامة والجودة
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              الرقابة والتشغيل اليومي
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-amber-500" />
            فحص الكباتن والمركبات اليومي
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            متابعة واعتماد الفحص التشغيلي اليومي للمركبات، وإتمام الفحص المباشر للكباتن فورياً
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
          </button>

          <button
            onClick={() => {
              resetCustomForm();
              setIsCustomModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            فحص مخصص جديد
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Captains */}
        <div className="theme-card p-4 sm:p-5 rounded-2xl border theme-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي الكباتن النشطين
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {stats.totalCaptains}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">كابتن مسجل ومصرح بالعمل</p>
        </div>

        {/* Inspected Today */}
        <div className="theme-card p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              تم فحصهم اليوم
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {stats.inspectedToday}
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
            جاهزون ومؤهلون لإنشاء الرحلات
          </p>
        </div>

        {/* Pending Today */}
        <div className="theme-card p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              بانتظار الفحص اليوم
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {stats.pendingToday}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
            يتطلب إتمام الفحص قبل الرحلة
          </p>
        </div>

        {/* Total Historical Inspections */}
        <div className="theme-card p-4 sm:p-5 rounded-2xl border theme-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي الفحوصات الموثقة
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {stats.totalInspections}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">سجل تشغيلي محفوظ في النظام</p>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="theme-card p-3 sm:p-4 rounded-2xl border theme-border space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("captains")}
              className={`flex items-center justify-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${
                activeTab === "captains"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>كباتن اليوم وحالة الفحص</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {safeCaptains.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center justify-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>سجل الفحوصات التشغيلية</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black bg-purple-500/10 text-purple-700 dark:text-purple-400">
                {safeInspections.length}
              </span>
            </button>
          </div>

          {/* Quick Search & Captain Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 md:max-w-lg">
            {/* Captain Selector */}
            <div className="relative min-w-[170px] sm:w-52 shrink-0">
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <select
                value={captainFilter}
                onChange={(e) => setCaptainFilter(e.target.value)}
                className="theme-input w-full pr-8 pl-6 py-1.5 text-xs rounded-xl cursor-pointer"
              >
                <option value="">جميع الكباتن ({safeCaptains.length})</option>
                {safeCaptains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {captainFilter && (
                <button
                  type="button"
                  onClick={() => setCaptainFilter("")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title="إلغاء تصفية الكابتن"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "captains"
                    ? "بحث باسم الكابتن أو الجوال أو اللوحة..."
                    : "بحث في السجل أو الكابتن أو الملاحظات..."
                }
                className="theme-input w-full pr-9 pl-7 py-1.5 text-xs rounded-xl"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Chips (only for captains tab) */}
        {activeTab === "captains" && (
          <div className="flex items-center gap-2 pt-2 border-t theme-border flex-wrap text-xs">
            <span className="text-slate-400 font-medium ml-1">تصفية الحالة:</span>
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border theme-border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              الكل ({safeCaptains.length})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                statusFilter === "PENDING"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              بانتظار الفحص ({stats.pendingToday})
            </button>
            <button
              onClick={() => setStatusFilter("INSPECTED")}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                statusFilter === "INSPECTED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم الفحص اليوم ({stats.inspectedToday})
            </button>

            {captainFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold animate-in fade-in">
                <UserCheck className="w-3.5 h-3.5" />
                الكابتن: {safeCaptains.find((c) => c.id === captainFilter)?.name || captainFilter}
                <button
                  type="button"
                  onClick={() => setCaptainFilter("")}
                  className="hover:text-rose-600 dark:hover:text-rose-400 p-0.5 transition cursor-pointer"
                  title="إلغاء تصفية الكابتن"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Date Filter Bar (for history tab) */}
        {activeTab === "history" && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t theme-border flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-medium ml-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                تصفية التاريخ:
              </span>
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="theme-input px-2.5 py-1 text-xs rounded-xl font-mono cursor-pointer"
              />
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter("")}
                  className="px-2.5 py-1 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  إلغاء تصفية التاريخ ({historyDateFilter})
                </button>
              )}

              {captainFilter && (
                <button
                  type="button"
                  onClick={() => setCaptainFilter("")}
                  className="px-2.5 py-1 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  الكابتن: {safeCaptains.find((c) => c.id === captainFilter)?.name || captainFilter}
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {(historyDateFilter || captainFilter) && (
              <span className="text-[11px] text-slate-400 font-mono">
                عدد النتائج: {filteredInspections.length} سجل
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content View */}
      {isLoading ? (
        <div className="theme-card p-12 rounded-2xl border theme-border flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            جاري تحميل سجلات الفحص التشغيلي...
          </p>
        </div>
      ) : activeTab === "captains" ? (
        /* TAB 1: CAPTAINS TODAY STATUS TABLE */
        <div className="theme-card rounded-2xl border theme-border overflow-hidden">
          {filteredCaptains.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد نتائج مطابقة
              </h3>
              <p className="text-xs text-slate-400">
                جرب تغيير خيارات التصفية أو مسح عبارة البحث
              </p>
            </div>
          ) : (
            <>
              {/* Header Bar with Count */}
              <div className="p-3 sm:p-4 border-b theme-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  قائمة الكباتن ({filteredCaptains.length})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {stats.inspectedToday} تم الفحص / {stats.pendingToday} بانتظار
                </span>
              </div>

              {/* Desktop Table View (Hidden on mobile, visible on md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b theme-border bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-bold whitespace-nowrap">
                          <th className="py-3 px-4 min-w-[200px]">الكابتن</th>
                          <th className="py-3 px-4 min-w-[120px]">رقم الجوال</th>
                          <th className="py-3 px-4 min-w-[130px]">المركبة المسندة</th>
                          <th className="py-3 px-4 min-w-[160px]">حالة فحص اليوم</th>
                          <th className="py-3 px-4 min-w-[120px]">توقيت الفحص</th>
                          <th className="py-3 px-4 text-center min-w-[190px]">الإجراءات المباشرة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y theme-border text-xs">
                        {filteredCaptains.map((c) => {
                          const isExecutingThis = executingCaptainId === c.id;

                          return (
                            <tr
                              key={c.id}
                              className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition duration-150 ${
                                !c.hasTodayInspection
                                  ? "bg-amber-500/[0.02] dark:bg-amber-500/[0.02]"
                                  : ""
                              }`}
                            >
                              {/* Captain details */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-9 h-9 rounded-full overflow-hidden bg-amber-500/10 border border-amber-500/20 shrink-0 flex items-center justify-center font-bold text-amber-700 dark:text-amber-300">
                                    {c.avatarUrl ? (
                                      <Image
                                        src={c.avatarUrl}
                                        alt={c.name}
                                        fill
                                        sizes="36px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      c.name.charAt(0)
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                      {c.name}
                                      {!c.active && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/10 text-rose-600">
                                          معطل
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {c.nationalId ? `هوية: ${c.nationalId}` : c.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Phone */}
                              <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap" dir="ltr">
                                {c.phone || "—"}
                              </td>

                              {/* Assigned Vehicle */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {c.assignedVehiclePlate ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border theme-border font-mono font-bold">
                                    <Car className="w-3.5 h-3.5 text-amber-500" />
                                    {c.assignedVehiclePlate}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">غير محددة</span>
                                )}
                              </td>

                              {/* Inspection Status */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {c.hasTodayInspection ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    تم الفحص ومؤهل للرحلات
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    لم يتم الفحص اليوم
                                  </div>
                                )}
                              </td>

                              {/* Inspection Date/Time */}
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {c.todayInspection ? (
                                  <div className="flex flex-col">
                                    <span className="text-slate-900 dark:text-white font-bold" dir="ltr">
                                      {new Date(c.todayInspection.createdAt || c.todayInspection.inspectionDate).toLocaleTimeString("ar-SA", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <span className="text-[10px] text-slate-400" dir="ltr">
                                      {new Date(c.todayInspection.inspectionDate).toLocaleDateString("en-GB")}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  {/* IF NOT INSPECTED TODAY: Show Prominent Direct 1-Click Pass Button + Manual Date Option */}
                                  {!c.hasTodayInspection ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleDirectPass(c)}
                                        disabled={isExecutingThis}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gold-gradient-btn text-xs font-black shadow-sm transition hover:shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                                        title="إتمام واعتماد الفحص المباشر فوراً بضغطة زر"
                                      >
                                        {isExecutingThis ? (
                                          <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            جاري الاعتماد...
                                          </>
                                        ) : (
                                          <>
                                            <Zap className="w-3.5 h-3.5 fill-current" />
                                            إتمام الفحص المباشر
                                          </>
                                        )}
                                      </button>

                                      <button
                                        onClick={() => {
                                          resetCustomForm();
                                          setCustomCaptainId(c.id);
                                          if (c.assignedVehiclePlate) {
                                            setCustomVehiclePlate(c.assignedVehiclePlate);
                                          }
                                          setCustomInspectionDateMode("MANUAL");
                                          setIsCustomModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-2xs cursor-pointer"
                                        title="إجراء فحص مخصص وتحديد تاريخ يدوي للكابتن"
                                      >
                                        <Calendar className="w-4 h-4 text-amber-500" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setSelectedInspectionForView(c.todayInspection)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition shadow-xs cursor-pointer"
                                        title="عرض تفاصيل كشف الفحص التشغيلي"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                                        تفاصيل الفحص
                                      </button>

                                      <button
                                        onClick={() => {
                                          if (c.todayInspection?.id) {
                                            setPreviewPdfInspection({
                                              id: c.todayInspection.id,
                                              captainName: c.name,
                                              vehiclePlate: c.assignedVehiclePlate || c.todayInspection.vehiclePlate,
                                            });
                                          }
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition shadow-xs cursor-pointer"
                                        title="توليد ومعاينة مستند PDF الرسمي للفحص"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>PDF</span>
                                      </button>

                                      <button
                                        onClick={() => handleDirectPass(c)}
                                        disabled={isExecutingThis}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                        title="إعادة الفحص المباشر وتحديث التوقيت"
                                      >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isExecutingThis ? "animate-spin text-amber-500" : ""}`} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
              </div>

              {/* Mobile Captains Inspection Cards (Shown on mobile screens < md) */}
              <div className="md:hidden divide-y theme-border">
                  {filteredCaptains.map((c) => {
                    const isExecutingThis = executingCaptainId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`p-4 space-y-3 transition duration-150 ${
                          !c.hasTodayInspection
                            ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.03]"
                            : ""
                        }`}
                      >
                        {/* Top: Avatar, Name, Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-amber-500/10 border border-amber-500/20 shrink-0 flex items-center justify-center font-black text-amber-700 dark:text-amber-300">
                              {c.avatarUrl ? (
                                <Image
                                  src={c.avatarUrl}
                                  alt={c.name}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              ) : (
                                c.name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                <span className="truncate">{c.name}</span>
                                {!c.active && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-600 font-bold shrink-0">
                                    معطل
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                {c.phone && (
                                  <span dir="ltr" className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-amber-500" />
                                    {c.phone}
                                  </span>
                                )}
                                {c.nationalId && <span>هوية: {c.nationalId}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {c.hasTodayInspection ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                تم الفحص
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                غير مفحوص
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Vehicle & Time info */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border theme-border text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-slate-400 text-[11px]">المركبة:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                              {c.assignedVehiclePlate || "غير محددة"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-400 text-[11px]">التوقيت:</span>
                            {c.todayInspection ? (
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]" dir="ltr">
                                {new Date(c.todayInspection.createdAt || c.todayInspection.inspectionDate).toLocaleTimeString("ar-SA", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-1">
                          {!c.hasTodayInspection ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDirectPass(c)}
                                disabled={isExecutingThis}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl gold-gradient-btn text-xs font-black shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer"
                              >
                                {isExecutingThis ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    جاري الاعتماد...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4 fill-current" />
                                    إتمام الفحص المباشر
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  resetCustomForm();
                                  setCustomCaptainId(c.id);
                                  if (c.assignedVehiclePlate) {
                                    setCustomVehiclePlate(c.assignedVehiclePlate);
                                  }
                                  setCustomInspectionDateMode("MANUAL");
                                  setIsCustomModalOpen(true);
                                }}
                                className="p-2.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 cursor-pointer"
                                title="تحديد تاريخ يدوي"
                              >
                                <Calendar className="w-4 h-4 text-amber-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedInspectionForView(c.todayInspection)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4 text-amber-500" />
                                <span>تفاصيل الفحص</span>
                              </button>

                              <button
                                onClick={() => {
                                  if (c.todayInspection?.id) {
                                    setPreviewPdfInspection({
                                      id: c.todayInspection.id,
                                      captainName: c.name,
                                      vehiclePlate: c.assignedVehiclePlate || c.todayInspection.vehiclePlate,
                                    });
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition cursor-pointer"
                              >
                                <FileText className="w-4 h-4" />
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={() => handleDirectPass(c)}
                                disabled={isExecutingThis}
                                className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                                title="إعادة الفحص"
                              >
                                <RefreshCw className={`w-4 h-4 ${isExecutingThis ? "animate-spin text-amber-500" : ""}`} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </>
          )}
        </div>
      ) : (
        /* TAB 2: INSPECTION HISTORY LOGS */
        <div className="theme-card rounded-2xl border theme-border overflow-hidden">
          {filteredInspections.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد سجلات فحص تشغيلي
              </h3>
              <p className="text-xs text-slate-400">
                لم يتم العثور على أي سجل فحص مطابق لخيارات البحث
              </p>
            </div>
          ) : (
            <>
              {/* Header Bar with Count */}
              <div className="p-3 sm:p-4 border-b theme-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  سجلات الفحص التشغيلي ({filteredInspections.length})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  إجمالي السجلات: {stats.totalInspections}
                </span>
              </div>

              {/* Desktop Table View (Hidden on mobile, visible on md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b theme-border bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-bold whitespace-nowrap">
                          <th className="py-3 px-4 min-w-[100px]">كود الفحص</th>
                          <th className="py-3 px-4 min-w-[180px]">الكابتن</th>
                          <th className="py-3 px-4 min-w-[120px]">المركبة</th>
                          <th className="py-3 px-4 min-w-[140px]">التاريخ والوقت</th>
                          <th className="py-3 px-4 min-w-[130px]">حالة البنود</th>
                          <th className="py-3 px-4 min-w-[110px]">العقود المرتبطة</th>
                          <th className="py-3 px-4 text-center min-w-[160px]">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y theme-border text-xs">
                        {filteredInspections.map((insp) => (
                          <tr
                            key={insp.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition duration-150"
                          >
                            {/* Code */}
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              #{insp.id.slice(0, 8)}
                            </td>

                            {/* Captain */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {insp.captainName || "كابتن غير محدد"}
                              </div>
                              {insp.captainPhone && (
                                <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                                  {insp.captainPhone}
                                </div>
                              )}
                            </td>

                            {/* Vehicle */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {insp.vehiclePlate}
                            </td>

                            {/* Date & Time */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                                  {new Date(insp.inspectionDate || insp.createdAt || Date.now()).toLocaleDateString("en-GB")}
                                </span>
                                <span className="text-[10px]" dir="ltr">
                                  {new Date(insp.createdAt || insp.inspectionDate || Date.now()).toLocaleTimeString("ar-SA", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </td>

                            {/* Pass status (16/16) */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                16/16 مكتمل
                              </span>
                            </td>

                            {/* Linked Contracts Count */}
                            <td className="py-3.5 px-4 font-mono text-center whitespace-nowrap">
                              {insp.contractCount > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-xs">
                                  {insp.contractCount} عقد
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">لا يوجد</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedInspectionForView(insp)}
                                  className="p-1.5 rounded-lg border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                  title="عرض تفاصيل الفحص"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() =>
                                    setPreviewPdfInspection({
                                      id: insp.id,
                                      captainName: insp.captainName,
                                      vehiclePlate: insp.vehiclePlate,
                                    })
                                  }
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition cursor-pointer"
                                  title="توليد وتحميل مستند PDF الرسمي للفحص"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>

                                <button
                                  onClick={() => setDeleteConfirmId(insp.id)}
                                  className="p-1.5 rounded-lg border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                  title="حذف سجل الفحص"
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

                  {/* Mobile History Record Cards (Shown on mobile screens < md) */}
                  <div className="md:hidden divide-y theme-border">
                  {filteredInspections.map((insp) => (
                    <div key={insp.id} className="p-4 space-y-3">
                      {/* Top: Code, Safe Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          #{insp.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          16/16 مكتمل
                        </span>
                      </div>

                      {/* Middle: Captain & Vehicle */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 text-[11px] block">الكابتن:</span>
                          <strong className="text-slate-900 dark:text-white truncate block">
                            {insp.captainName || "كابتن غير محدد"}
                          </strong>
                          {insp.captainPhone && (
                            <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                              {insp.captainPhone}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">المركبة:</span>
                          <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {insp.vehiclePlate}
                          </strong>
                        </div>
                      </div>

                      {/* Date & Linked Contracts */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border theme-border text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span dir="ltr">
                            {new Date(insp.inspectionDate || insp.createdAt || Date.now()).toLocaleDateString("en-GB")}
                          </span>
                          <span className="text-slate-400 text-[10px]" dir="ltr">
                            {new Date(insp.createdAt || insp.inspectionDate || Date.now()).toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div>
                          {insp.contractCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-[11px]">
                              {insp.contractCount} عقد مرتبط
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">لا عقود</span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setSelectedInspectionForView(insp)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-amber-500" />
                          <span>تفاصيل</span>
                        </button>

                        <button
                          onClick={() =>
                            setPreviewPdfInspection({
                              id: insp.id,
                              captainName: insp.captainName,
                              vehiclePlate: insp.vehiclePlate,
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>وثيقة PDF</span>
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(insp.id)}
                          className="p-2 rounded-xl border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: INSPECTION DETAILS MODAL (16-POINT BREAKDOWN)
      ───────────────────────────────────────────────────────────────────────────── */}
      {selectedInspectionForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="theme-card w-full max-w-2xl rounded-3xl border theme-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b theme-border flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    كشف الفحص التشغيلي اليومي للمركبة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    كود الفحص: #{selectedInspectionForView.id.slice(0, 10)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedInspectionForView(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Meta Info Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border theme-border text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">الكابتن:</span>
                  <strong className="text-slate-900 dark:text-white">
                    {selectedInspectionForView.captainName || "غير محدد"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">لوحة المركبة:</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {selectedInspectionForView.vehiclePlate}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">تاريخ الفحص:</span>
                  <strong className="font-mono text-slate-900 dark:text-white" dir="ltr">
                    {new Date(selectedInspectionForView.inspectionDate).toLocaleDateString("en-GB")}
                  </strong>
                </div>
              </div>

              {/* Group 1: Dashboard Indicators */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Gauge className="w-4 h-4 text-amber-500" />
                  مؤشرات لوحة القيادة والعدادات (Dashboard)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DASHBOARD_ITEMS.map((item) => {
                    const val = Boolean(selectedInspectionForView[item.key as keyof VehicleInspection]);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.titleAr}
                        </span>
                        {val ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-4 h-4" />
                            سليم
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-[11px]">
                            <XCircle className="w-4 h-4" />
                            عطل
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: External Inspection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Car className="w-4 h-4 text-blue-500" />
                  الفحص الخارجي والهيكل والإنارة
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXTERNAL_ITEMS.map((item) => {
                    const val = Boolean(selectedInspectionForView[item.key as keyof VehicleInspection]);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.titleAr}
                        </span>
                        {val ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-4 h-4" />
                            سليم
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-[11px]">
                            <XCircle className="w-4 h-4" />
                            عطل
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 3: Safety & Emergency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  تجهيزات السلامة والطوارئ
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAFETY_ITEMS.map((item) => {
                    const val = Boolean(selectedInspectionForView[item.key as keyof VehicleInspection]);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.titleAr}
                        </span>
                        {val ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-4 h-4" />
                            متوفر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-[11px]">
                            <XCircle className="w-4 h-4" />
                            غير متوفر
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedInspectionForView.notes && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block">
                    ملاحظات الفاحص:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {selectedInspectionForView.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                معتمد رسمياً في نظام ميقات الخليج
              </span>
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPdfInspection({
                      id: selectedInspectionForView.id,
                      captainName: selectedInspectionForView.captainName,
                      vehiclePlate: selectedInspectionForView.vehiclePlate,
                    });
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs font-bold shadow-xs hover:shadow-md transition"
                  title="معاينة وتحميل ملف PDF الرسمي"
                >
                  <FileText className="w-4 h-4" />
                  <span>معاينة وتحميل PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInspectionForView(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: CUSTOM / NEW INSPECTION MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="theme-card w-full max-w-3xl rounded-3xl border theme-border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b theme-border flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    تسجيل فحص تشغيلي مخصص للمركبة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    فحص يدوي تفصيلي لـ 16 نقطة سلامة وتشغيل
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCustomSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* Captain & Vehicle Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اختيار الكابتن <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={customCaptainId}
                      onChange={(e) => {
                        const capId = e.target.value;
                        setCustomCaptainId(capId);
                        const found = safeCaptains.find((c) => c.id === capId);
                        if (found?.assignedVehiclePlate) {
                          setCustomVehiclePlate(found.assignedVehiclePlate);
                        }
                      }}
                      required
                      className="theme-input w-full p-2.5 text-xs rounded-xl"
                    >
                      <option value="">-- اختر الكابتن المراد فحصه --</option>
                      {safeCaptains.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.hasTodayInspection ? "(تم فحصه اليوم)" : "(غير مفحوص اليوم)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        لوحة المركبة <span className="text-rose-500">*</span>
                      </label>
                      {safeVehicles.length > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {safeVehicles.length} مركبة بالأسطول
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customVehiclePlate}
                      onChange={(e) => setCustomVehiclePlate(e.target.value)}
                      placeholder="مثال: ا ص ل 7223"
                      required
                      className="theme-input w-full p-2.5 text-xs rounded-xl font-mono"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {safeVehicles.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) setCustomVehiclePlate(e.target.value);
                          }}
                          value=""
                          className="text-[11px] py-1 px-2 rounded-lg border theme-border bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer hover:border-amber-500/40"
                        >
                          <option value="">اختيار سريع من مركبات الأسطول...</option>
                          {safeVehicles.map((v) => (
                            <option key={v.id} value={v.plateNumberAr}>
                              {v.plateNumberAr} - {v.make} {v.model}
                            </option>
                          ))}
                        </select>
                      )}
                      {customCaptainId && (() => {
                        const cap = safeCaptains.find((c) => c.id === customCaptainId);
                        if (cap?.assignedVehiclePlate && cap.assignedVehiclePlate !== customVehiclePlate) {
                          return (
                            <button
                              type="button"
                              onClick={() => setCustomVehiclePlate(cap.assignedVehiclePlate!)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
                            >
                              مركبة الكابتن ({cap.assignedVehiclePlate})
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Inspection Date Mode & Manual Date Selection */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border theme-border space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        تاريخ الفحص التشغيلي
                      </label>
                      <p className="text-[11px] text-slate-400">
                        يمكن اعتماد تاريخ اليوم الفعلي تلقائياً أو اختيار تاريخ يدوي مخصص
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border theme-border self-start sm:self-auto shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setCustomInspectionDateMode("AUTO")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          customInspectionDateMode === "AUTO"
                            ? "gold-gradient-btn text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        اليوم (تلقائي)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomInspectionDateMode("MANUAL")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          customInspectionDateMode === "MANUAL"
                            ? "gold-gradient-btn text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        يدوي (تاريخ مخصص)
                      </button>
                    </div>
                  </div>

                  {customInspectionDateMode === "AUTO" ? (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t theme-border text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        تاريخ الفحص المعتمد في السجلات والوثيقة:
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {formatOfficialDate(getSaudiTodayDateStr())} (تاريخ اليوم الفعلي بتوقيت المملكة)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t theme-border">
                      <div className="w-full sm:w-64">
                        <CustomDatePicker
                          label="تاريخ الفحص المعتمد"
                          required
                          value={customInspectionDate}
                          onChange={setCustomInspectionDate}
                        />
                      </div>
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 sm:self-end h-11">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>
                          سيتم توثيق الفحص واعتماده بهذا التاريخ المخصص في السجلات وتقارير الفحص ووثيقة الـ PDF الرسمية.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Toggle All Button */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    تحديد جميع نقاط الفحص (16/16) كسليمة ومجتازة
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allPass: Record<string, boolean> = {};
                        ALL_CHECK_ITEMS.forEach((i) => (allPass[i.key] = true));
                        setCustomChecks(allPass);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                    >
                      تحديد الكل سليم
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allFail: Record<string, boolean> = {};
                        ALL_CHECK_ITEMS.forEach((i) => (allFail[i.key] = false));
                        setCustomChecks(allFail);
                      }}
                      className="px-3 py-1 rounded-lg border theme-border text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                {/* Checklist Sections */}
                <div className="space-y-4">
                  {/* Dashboard */}
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-500" />
                      مؤشرات لوحة القيادة
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DASHBOARD_ITEMS.map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition"
                        >
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {item.titleAr}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(customChecks[item.key])}
                            onChange={(e) =>
                              setCustomChecks((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* External */}
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-blue-500" />
                      الفحص الخارجي والهيكل
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {EXTERNAL_ITEMS.map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition"
                        >
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {item.titleAr}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(customChecks[item.key])}
                            onChange={(e) =>
                              setCustomChecks((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Safety */}
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      تجهيزات السلامة والطوارئ
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SAFETY_ITEMS.map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition"
                        >
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {item.titleAr}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(customChecks[item.key])}
                            onChange={(e) =>
                              setCustomChecks((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ملاحظات الفحص التشغيلي (اختياري)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      اقتراحات سريعة
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {[
                      "تم الفحص والاعتماد التشغيلي رسمياً من قبل إدارة العمليات",
                      "المركبة جاهزة ومكتملة التجهيزات التشغيلية والرحلات",
                      "فحص دوري معتمد - الحالة الفنية ممتازة",
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomNotes(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border theme-border text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    rows={2}
                    placeholder="اكتب أي ملاحظات فنية أو تفاصيل إضافية عن حالة المركبة..."
                    className="theme-input w-full p-2.5 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t theme-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>يتم حفظ البيانات وتوليد وتخزين وثيقة PDF فورياً في النظام</span>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCustomModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingCustom}
                    className="flex items-center gap-1.5 px-6 py-2 rounded-xl gold-gradient-btn text-xs font-black shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingCustom ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        جاري حفظ وتخزين الفحص...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        اعتماد وتوثيق الفحص التشغيلي
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 3: DELETE CONFIRMATION DIALOG
      ───────────────────────────────────────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="theme-card w-full max-w-md rounded-3xl border border-rose-500/30 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد حذف سجل الفحص التشغيلي
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                هل أنت متأكد من رغبتك في حذف هذا السجل بشكل نهائي؟ سيتم فك ارتباط أي عقد مرتبط به.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border theme-border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                تراجع
              </button>

              <button
                type="button"
                onClick={handleDeleteInspection}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  <>حذف نهائي</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 4: OFFICIAL VEHICLE INSPECTION PDF PREVIEW & DOWNLOAD MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {previewPdfInspection && (
        <InspectionPdfPreviewModal
          isOpen={!!previewPdfInspection}
          onClose={() => setPreviewPdfInspection(null)}
          inspectionId={previewPdfInspection.id}
          captainName={previewPdfInspection.captainName}
          vehiclePlate={previewPdfInspection.vehiclePlate}
        />
      )}
    </div>
  );
}
