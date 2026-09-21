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
  const [activeTab, setActiveTab] = useState<"captains" | "history">("captains");
  const [captains, setCaptains] = useState<CaptainInspectionItem[]>([]);
  const [inspections, setInspections] = useState<InspectionWithMeta[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState({
    totalCaptains: 0,
    inspectedToday: 0,
    pendingToday: 0,
    totalInspections: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "INSPECTED">("ALL");

  // Direct pass action loading indicator per captain ID
  const [executingCaptainId, setExecutingCaptainId] = useState<string | null>(null);

  // Notification Banner
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [selectedInspectionForView, setSelectedInspectionForView] = useState<VehicleInspection | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Form state
  const [customCaptainId, setCustomCaptainId] = useState("");
  const [customVehiclePlate, setCustomVehiclePlate] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [customChecks, setCustomChecks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    ALL_CHECK_ITEMS.forEach((item) => {
      init[item.key] = true;
    });
    return init;
  });

  // Load Data
  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [overviewRes, historyRes, vehiclesRes] = await Promise.all([
        getCaptainsInspectionOverview(),
        getAllInspectionsList({ limit: 150 }),
        getVehicles(),
      ]);

      if (overviewRes.success && overviewRes.captains) {
        setCaptains(overviewRes.captains);
        if (overviewRes.stats) {
          setStats(overviewRes.stats);
        }
      }

      if (historyRes.success && historyRes.inspections) {
        setInspections(historyRes.inspections);
      }

      if (vehiclesRes.success && vehiclesRes.vehicles) {
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

        // Silently reload history in background
        getAllInspectionsList({ limit: 150 }).then((hRes) => {
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

    const selectedCap = captains.find((c) => c.id === customCaptainId);
    const effectivePlate =
      customVehiclePlate.trim() || selectedCap?.assignedVehiclePlate || "ا ص ل 7223";

    setIsSubmittingCustom(true);

    try {
      const res = await submitInspection({
        captainId: customCaptainId,
        vehiclePlate: effectivePlate,
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
    return captains.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.assignedVehiclePlate && c.assignedVehiclePlate.includes(search));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "INSPECTED" && c.hasTodayInspection) ||
        (statusFilter === "PENDING" && !c.hasTodayInspection);

      return matchesSearch && matchesStatus;
    });
  }, [captains, search, statusFilter]);

  // Filtered history inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((insp) => {
      const matchesSearch =
        search === "" ||
        (insp.captainName && insp.captainName.toLowerCase().includes(search.toLowerCase())) ||
        (insp.vehiclePlate && insp.vehiclePlate.includes(search)) ||
        (insp.notes && insp.notes.toLowerCase().includes(search.toLowerCase())) ||
        insp.id.toLowerCase().includes(search.toLowerCase());

      return matchesSearch;
    });
  }, [inspections, search]);

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
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 max-w-fit">
            <button
              onClick={() => setActiveTab("captains")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "captains"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              كباتن اليوم وحالة الفحص
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {captains.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              سجل الفحوصات التشغيلية
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black bg-purple-500/10 text-purple-700 dark:text-purple-400">
                {inspections.length}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 md:max-w-xs">
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
              className="theme-input w-full pr-9 pl-4 py-1.5 text-xs rounded-xl"
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
              الكل ({captains.length})
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
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b theme-border bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-bold">
                    <th className="py-3 px-4">الكابتن</th>
                    <th className="py-3 px-4">رقم الجوال</th>
                    <th className="py-3 px-4">المركبة المسندة</th>
                    <th className="py-3 px-4">حالة فحص اليوم</th>
                    <th className="py-3 px-4">توقيت الفحص</th>
                    <th className="py-3 px-4 text-center">الإجراءات المباشرة</th>
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
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-amber-500/10 border border-amber-500/20 shrink-0 flex items-center justify-center font-bold text-amber-700 dark:text-amber-300">
                              {c.avatarUrl ? (
                                <Image
                                  src={c.avatarUrl}
                                  alt={c.name}
                                  fill
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
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                          {c.phone || "—"}
                        </td>

                        {/* Assigned Vehicle */}
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
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
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* IF NOT INSPECTED TODAY: Show Prominent Direct 1-Click Pass Button! */}
                            {!c.hasTodayInspection ? (
                              <button
                                onClick={() => handleDirectPass(c)}
                                disabled={isExecutingThis}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gold-gradient-btn text-xs font-black shadow-sm transition hover:shadow-md active:scale-95 disabled:opacity-50"
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
                            ) : (
                              <>
                                <button
                                  onClick={() => setSelectedInspectionForView(c.todayInspection)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition shadow-xs"
                                  title="عرض تفاصيل كشف الفحص التشغيلي"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                                  تفاصيل الفحص
                                </button>

                                <button
                                  onClick={() => handleDirectPass(c)}
                                  disabled={isExecutingThis}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b theme-border bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-bold">
                    <th className="py-3 px-4">كود الفحص</th>
                    <th className="py-3 px-4">الكابتن</th>
                    <th className="py-3 px-4">المركبة</th>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">حالة البنود</th>
                    <th className="py-3 px-4">العقود المرتبطة</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border text-xs">
                  {filteredInspections.map((insp) => (
                    <tr
                      key={insp.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition duration-150"
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        #{insp.id.slice(0, 8)}
                      </td>

                      {/* Captain */}
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {insp.vehiclePlate}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                            {new Date(insp.createdAt || insp.inspectionDate).toLocaleDateString("en-GB")}
                          </span>
                          <span className="text-[10px]" dir="ltr">
                            {new Date(insp.createdAt || insp.inspectionDate).toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Pass status (16/16) */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          16/16 مكتمل
                        </span>
                      </td>

                      {/* Linked Contracts Count */}
                      <td className="py-3.5 px-4 font-mono text-center">
                        {insp.contractCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-xs">
                            {insp.contractCount} عقد
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">لا يوجد</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedInspectionForView(insp)}
                            className="p-1.5 rounded-lg border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="عرض تفاصيل الفحص"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(insp.id)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
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
                  <span className="text-slate-400 block text-[11px]">تاريخ وتوقيت الفحص:</span>
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
            <div className="p-4 border-t theme-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                معتمد رسمياً في نظام ميقات الخليج
              </span>
              <button
                onClick={() => setSelectedInspectionForView(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                إغلاق
              </button>
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
                        const found = captains.find((c) => c.id === capId);
                        if (found?.assignedVehiclePlate) {
                          setCustomVehiclePlate(found.assignedVehiclePlate);
                        }
                      }}
                      required
                      className="theme-input w-full p-2.5 text-xs rounded-xl"
                    >
                      <option value="">-- اختر الكابتن المراد فحصه --</option>
                      {captains.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.hasTodayInspection ? "(تم فحصه اليوم)" : "(غير مفحوص اليوم)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      لوحة المركبة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customVehiclePlate}
                      onChange={(e) => setCustomVehiclePlate(e.target.value)}
                      placeholder="مثال: ا ص ل 7223"
                      required
                      className="theme-input w-full p-2.5 text-xs rounded-xl font-mono"
                    />
                  </div>
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ملاحظات الفحص التشغيلي (اختياري)
                  </label>
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
              <div className="p-4 border-t theme-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
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
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl gold-gradient-btn text-xs font-black shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingCustom ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      جاري حفظ الفحص...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      اعتماد وتوثيق الفحص التشغيلي
                    </>
                  )}
                </button>
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
    </div>
  );
}
