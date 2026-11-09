"use client";
import { createHelpGuide } from "./help-guide";
import { DASHBOARD_ITEMS, EXTERNAL_ITEMS, SAFETY_ITEMS, ALL_CHECK_ITEMS } from "@/lib/inspection";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";

import dynamic from "next/dynamic";

import Modal from "@/app/_components/Modal";
import InspectionChecklist from "@/app/_components/form/InspectionChecklist";

import React, { useState, useEffect, useId, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { ClipboardCheck, CheckCircle2, XCircle, AlertCircle, Zap, Search, RefreshCw, Plus, Eye, Trash2, Check, ShieldCheck, Car, Phone, Calendar, X, FileText, AlertTriangle, UserCheck, Gauge, ShieldAlert, Sparkles, Edit3 } from "lucide-react";
import { getCaptainsInspectionOverview, directPassInspection, getAllInspectionsList, deleteInspection, submitInspection, CaptainInspectionItem, InspectionWithMeta } from "@/app/_actions/inspection";
import { getVehicles } from "@/app/_actions/fleet";
import { Vehicle, VehicleInspection } from "@/lib/types";
const InspectionPdfPreviewModal = dynamic(() => import("@/app/_components/InspectionPdfPreviewModal"), { ssr: false });
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import {
  PageHeader,
  StatCard,
  StatRow,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/app/_components/ui";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";
import { getSaudiTodayDateStr, formatOfficialDate } from "@/lib/contractConstants";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";
import { useLanguage } from "@/lib/languageContext";

// Checklist Definitions
export default function AdminInspectionsPage() {
  const ui = useUiText();

  const { t, isRTL } = useLanguage();
  const cachedOverview = getCachedData<Awaited<ReturnType<typeof getCaptainsInspectionOverview>>>("inspections_overview");
  const cachedHistory = getCachedData<Awaited<ReturnType<typeof getAllInspectionsList>>>("inspections_history");
  const cachedVehicles = getCachedData<Awaited<ReturnType<typeof getVehicles>>>("fleet_vehicles");

  const [activeTab, setActiveTab] = useUrlState<"captains" | "history">("view", "captains", ["captains", "history"]);
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
  const [search, setSearch] = useUrlState<string>("q", "");
  const [statusFilter, setStatusFilter] = useUrlState<"ALL" | "PENDING" | "INSPECTED">("status", "ALL", ["ALL","PENDING","INSPECTED"]);
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [captainFilter, setCaptainFilter] = useState("");

  // Direct pass action loading indicator per captain ID
  const [executingCaptainId, setExecutingCaptainId] = useState<string | null>(null);

  // Notification Banner
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formId = useId();

  // Modals
  const [selectedInspectionForView, setSelectedInspectionForView] = useState<VehicleInspection | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewPdfInspection, setPreviewPdfInspection] = useState<{
    id: string;
    captainName?: string;
    vehiclePlate?: string;
    pdfPath?: string | null;
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

  const safeCaptains = captains;
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeInspections = inspections;

  // Fetch inspection datasets (shared between mount effect and user-triggered refresh)
  const fetchInspectionDatasets = useCallback((forceRefresh: boolean) => {
    return Promise.all([
      fetchCached("inspections_overview", getCaptainsInspectionOverview, {
        ttlMs: 60_000,
        forceRefresh,
      }),
      fetchCached(
        "inspections_history",
        () => getAllInspectionsList({ limit: 40 }),
        {
          ttlMs: 60_000,
          forceRefresh,
        }
      ),
      fetchCached("fleet_vehicles", getVehicles, {
        ttlMs: 120_000,
        forceRefresh,
      }),
    ]);
  }, []);

  const applyInspectionDatasets = useCallback(
    ([overviewRes, historyRes, vehiclesRes]: Awaited<ReturnType<typeof fetchInspectionDatasets>>) => {
      const failure = [overviewRes, historyRes, vehiclesRes].find(result => !result.success);
      if (failure) {
        setBanner({
          type: "error",
          message: failure.error || (isRTL ? "تعذر تحميل بيانات الفحص" : "Failed to load inspection data"),
        });
      }

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
    },
    [isRTL]
  );

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      try {
        const results = await fetchInspectionDatasets(showRefresh);
        applyInspectionDatasets(results);
      } catch (error) {
        console.error("Failed to load inspection data:", error);
        setBanner({
          type: "error",
          message: isRTL ? "تعذر جلب بيانات الفحص التشغيلي" : "Failed to fetch operational inspection records",
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applyInspectionDatasets, fetchInspectionDatasets, isRTL]
  );

  useEffect(() => {
    let active = true;
    void fetchInspectionDatasets(false)
      .then((results) => {
        if (!active) return;
        applyInspectionDatasets(results);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load inspection data:", error);
        setBanner({
          type: "error",
          message: isRTL ? "تعذر جلب بيانات الفحص التشغيلي" : "Failed to fetch operational inspection records",
        });
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [applyInspectionDatasets, fetchInspectionDatasets, isRTL]);

  function showBanner(type: "success" | "error", message: string) {
    setBanner({ type, message });
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }

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
        const inspection = res.inspection;
        showBanner(
          "success",
          isRTL
            ? `تم إتمام واعتماد الفحص المباشر للكابتن (${captain.name}) بنجاح!`
            : `Direct inspection passed and certified for captain (${captain.name})!`,
        );

        // Update local state immediately for snappy response
        setCaptains((prev) =>
          prev.map((c) =>
            c.id === captain.id
              ? {
                  ...c,
                  hasTodayInspection: true,
                  todayInspection: inspection,
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
        showBanner("error", res.error || (isRTL ? "فشل إتمام الفحص المباشر" : "Direct inspection failed"));
      }
    } catch (err) {
      console.error("Direct pass error:", err);
      showBanner("error", isRTL ? "حدث خطأ غير متوقع أثناء إتمام الفحص" : "Unexpected error while completing inspection");
    } finally {
      setExecutingCaptainId(null);
    }
  };

  // Submit custom inspection modal
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCaptainId) {
      showBanner("error", isRTL ? "يرجى اختيار الكابتن" : "Please select a captain");
      return;
    }

    const selectedCap = safeCaptains.find((c) => c.id === customCaptainId);
    const effectivePlate =
      customVehiclePlate.trim() || selectedCap?.assignedVehiclePlate || "";

    if (!effectivePlate) {
      showBanner("error", isRTL ? "يرجى اختيار المركبة قبل تسجيل الفحص" : "Please select a vehicle before recording inspection");
      return;
    }

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
        showBanner("success", isRTL ? "تم حفظ وتوثيق الفحص التشغيلي بنجاح" : "Operational inspection saved and certified successfully");
        setIsCustomModalOpen(false);
        resetCustomForm();
        invalidateClientCache("inspections_");
        invalidateClientCache("dashboard_stats");
        loadData(true);
      } else {
        showBanner("error", res.error || (isRTL ? "تعذر حفظ الفحص" : "Failed to save inspection"));
      }
    } catch (err) {
      console.error("Custom inspection submit error:", err);
      showBanner("error", isRTL ? "حدث خطأ غير متوقع" : "Unexpected error");
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
        showBanner("success", isRTL ? "تم حذف سجل الفحص التشغيلي بنجاح" : "Operational inspection record deleted");
        setInspections((prev) => prev.filter((i) => i.id !== deleteConfirmId));
        setDeleteConfirmId(null);
        invalidateClientCache("inspections_");
        invalidateClientCache("dashboard_stats");
        loadData(true);
      } else {
        showBanner("error", res.error || (isRTL ? "تعذر حذف سجل الفحص" : "Failed to delete inspection record"));
      }
    } catch (err) {
      console.error("Delete inspection error:", err);
      showBanner("error", isRTL ? "حدث خطأ أثناء الحذف" : "Error while deleting record");
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
  }, [safeInspections, search, historyDateFilter, captainFilter]);

  const inspectionsHelpGuide = useMemo(() => createHelpGuide(isRTL), [isRTL]);

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {banner && (
        <div
          role={banner.type === "error" ? "alert" : "status"}
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-lg transition-all duration-300 ${
            banner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {banner.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
            )}
            <p className="text-sm font-bold">{banner.message}</p>
          </div>
          <button
            type="button"
            aria-label={ui("إغلاق")}
            onClick={() => setBanner(null)}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Page Header with On-Demand Guide */}
      <PageHeader
        title={ui(t("inspections.title"))}
        subtitle={ui(t("inspections.subtitle"))}
        badge={isRTL ? "إدارة السلامة والجودة" : "Safety & Fleet Compliance"}
        icon={ClipboardCheck}
        onRefresh={() => void loadData(true)}
        isRefreshing={isRefreshing}
        helpGuide={inspectionsHelpGuide}
        onSeeded={(msg) => {
          showBanner("success", msg);
          invalidateClientCache("inspections_");
          invalidateClientCache("dashboard_stats");
          void loadData(true);
        }}
        onSeedError={(err) => showBanner("error", err)}
        actions={
          <button
            type="button"
            onClick={() => {
              resetCustomForm();
              setIsCustomModalOpen(true);
            }}
            className="flex items-center gap-1.5 min-h-11 sm:min-h-10 px-4 py-2 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>{ui(t("inspections.customInspection"))}</span>
          </button>
        }
      />

      {/* KPI Stats Cards */}
      <StatRow columns={4}>
        <StatCard
          label={ui(t("inspections.totalCaptains"))}
          value={stats.totalCaptains}
          unit={isRTL ? "كابتن نشط" : "captains"}
          subtext={isRTL ? "عرض جميع الكباتن" : "View all captains"}
          icon={UserCheck}
          variant="blue"
          isActive={activeTab === "captains" && statusFilter === "ALL"}
          onClick={() => {
            setActiveTab("captains");
            setStatusFilter("ALL");
          }}
        />
        <StatCard
          label={ui(t("inspections.inspectedToday"))}
          value={stats.inspectedToday}
          unit={isRTL ? "مكتمل" : "passed"}
          subtext={isRTL ? "جاهزون ومؤهلون لإنشاء الرحلات" : "Qualified for trips"}
          icon={ShieldCheck}
          variant="emerald"
          isActive={activeTab === "captains" && statusFilter === "INSPECTED"}
          onClick={() => {
            setActiveTab("captains");
            setStatusFilter("INSPECTED");
          }}
        />
        <StatCard
          label={ui(t("inspections.pendingToday"))}
          value={stats.pendingToday}
          unit={isRTL ? "معلق" : "pending"}
          subtext={isRTL ? "يتطلب إتمام الفحص قبل الرحلة" : "Requires inspection"}
          icon={AlertTriangle}
          variant="amber"
          isActive={activeTab === "captains" && statusFilter === "PENDING"}
          onClick={() => {
            setActiveTab("captains");
            setStatusFilter("PENDING");
          }}
        />
        <StatCard
          label={ui(t("inspections.totalInspections"))}
          value={stats.totalInspections}
          unit={isRTL ? "فحص موثق" : "records"}
          subtext={isRTL ? "عرض سجل الفحوصات" : "View archived logs"}
          icon={ClipboardCheck}
          isActive={activeTab === "history"}
          onClick={() => setActiveTab("history")}
        />
      </StatRow>

      {/* Daily Fleet Readiness Progress Bar */}
      {stats.totalCaptains > 0 && (
        <div className="theme-card px-4 py-3 rounded-2xl border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 dark:text-slate-200">
                  {ui("مؤشر جاهزية الكباتن للفحص اليومي")}</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {Math.round((stats.inspectedToday / Math.max(1, stats.totalCaptains)) * 100)}% ({stats.inspectedToday}/{stats.totalCaptains})
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((stats.inspectedToday / Math.max(1, stats.totalCaptains)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {stats.pendingToday > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("captains");
                setStatusFilter("PENDING");
              }}
              className="min-h-10 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition shrink-0 cursor-pointer"
            >
              {ui("عرض الكباتن بانتظار الفحص (")}{stats.pendingToday})
            </button>
          )}
        </div>
      )}

      {/* Tabs & Search Filter Bar */}
      <div className="theme-card p-3 sm:p-4 rounded-2xl border theme-border space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("captains")}
              className={`flex items-center justify-center gap-2 min-h-10 sm:min-h-8 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${
                activeTab === "captains"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{ui("كباتن اليوم وحالة الفحص")}</span>
              <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {safeCaptains.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center justify-center gap-2 min-h-10 sm:min-h-8 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{ui("سجل الفحوصات التشغيلية")}</span>
              <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400">
                {safeInspections.length}
              </span>
            </button>
          </div>

          {/* Quick Search & Captain Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 md:max-w-lg">
            {/* Captain Selector */}
            <div className="relative min-w-[170px] sm:w-52 shrink-0">
              <div className="absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <select
                aria-label={isRTL ? "تصفية حسب الكابتن" : "Filter by captain"}
                value={captainFilter}
                onChange={(e) => setCaptainFilter(e.target.value)}
                className="theme-input w-full min-h-11 sm:min-h-9 ps-8 pe-8 py-1.5 text-sm sm:text-xs rounded-xl cursor-pointer"
              >
                <option value="">{ui("جميع الكباتن (")}{safeCaptains.length})</option>
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
                  aria-label={ui("إلغاء تصفية الكابتن")}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 min-h-8 min-w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-rose-700 dark:hover:text-rose-400 transition cursor-pointer"
                  title={ui("إلغاء تصفية الكابتن")}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" aria-hidden="true" />
              <input
                type="text"
                aria-label={ui(activeTab === "captains"
                    ? "بحث باسم الكابتن أو الجوال أو اللوحة..."
                    : "بحث في السجل أو الكابتن أو الملاحظات...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={ui(activeTab === "captains"
                    ? "بحث باسم الكابتن أو الجوال أو اللوحة..."
                    : "بحث في السجل أو الكابتن أو الملاحظات...")}
                className="theme-input w-full min-h-11 sm:min-h-9 ps-9 pe-9 py-1.5 text-sm sm:text-xs rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  aria-label={ui("مسح الحقل")}
                  onClick={() => setSearch("")}
                  className="absolute end-1 top-1/2 -translate-y-1/2 min-h-9 min-w-9 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Chips (only for captains tab) */}
        {activeTab === "captains" && (
          <div className="flex items-center gap-2 pt-2 border-t theme-border flex-wrap text-xs">
            <span className="text-[var(--text-muted)] font-medium me-1">{ui("تصفية الحالة:")}</span>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`min-h-10 sm:min-h-8 px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border theme-border text-[var(--text-muted)] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {ui("الكل (")}{safeCaptains.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`min-h-10 sm:min-h-8 px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                statusFilter === "PENDING"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              {ui("بانتظار الفحص (")}{stats.pendingToday})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INSPECTED")}
              className={`min-h-10 sm:min-h-8 px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                statusFilter === "INSPECTED"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/10"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              {ui("تم الفحص اليوم (")}{stats.inspectedToday})
            </button>

            {captainFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold">
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {ui("الكابتن:")}{" "}
                {safeCaptains.find((c) => c.id === captainFilter)?.name || captainFilter}
                <button
                  type="button"
                  onClick={() => setCaptainFilter("")}
                  aria-label={ui("إلغاء تصفية الكابتن")}
                  className="hover:text-rose-700 dark:hover:text-rose-400 p-0.5 transition cursor-pointer"
                  title={ui("إلغاء تصفية الكابتن")}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Date Filter Bar (for history tab) */}
        {activeTab === "history" && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t theme-border flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor={`${formId}-history-date`} className="text-[var(--text-muted)] font-medium me-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                {ui("تصفية التاريخ:")}</label>
              <input
                id={`${formId}-history-date`}
                type="date"
                dir="ltr"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="theme-input min-h-11 sm:min-h-9 px-2.5 py-1 text-sm sm:text-xs rounded-xl font-mono cursor-pointer text-start"
              />
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter("")}
                  className="min-h-10 sm:min-h-8 px-2.5 py-1 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  {ui("إلغاء تصفية التاريخ (")}{historyDateFilter})
                </button>
              )}

              {captainFilter && (
                <button
                  type="button"
                  onClick={() => setCaptainFilter("")}
                  className="min-h-10 sm:min-h-8 px-2.5 py-1 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  {ui("الكابتن:")}{" "}
                  {safeCaptains.find((c) => c.id === captainFilter)?.name || captainFilter}
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            {(historyDateFilter || captainFilter) && (
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {ui("عدد النتائج:")} {filteredInspections.length} {ui("سجل")}</span>
            )}
          </div>
        )}
      </div>

      {/* Main Content View */}
      {isLoading ? (
        <div className="theme-card p-12 rounded-2xl border theme-border flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-[var(--text-muted)] dark:text-slate-400">
            {ui("جاري تحميل سجلات الفحص التشغيلي...")}</p>
        </div>
      ) : activeTab === "captains" ? (
        /* TAB 1: CAPTAINS TODAY STATUS TABLE */
        <div className="theme-card rounded-2xl border theme-border overflow-hidden">
          {filteredCaptains.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {ui("لا توجد نتائج مطابقة")}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {ui("جرب تغيير خيارات التصفية أو مسح عبارة البحث")}</p>
            </div>
          ) : (
            <>
              {/* Header Bar with Count */}
              <div className="p-3 sm:p-4 border-b theme-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("قائمة الكباتن (")}{filteredCaptains.length})
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {stats.inspectedToday} {ui("تم الفحص /")} {stats.pendingToday} {ui("بانتظار")}</span>
              </div>

              {/* Desktop Table View (Hidden on mobile, visible on md and up) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b theme-border bg-slate-50/70 dark:bg-slate-800/40 text-[var(--text-muted)] dark:text-slate-400 text-xs font-bold whitespace-nowrap">
                      <TableHead className="py-3 px-4 min-w-[200px]">{ui("الكابتن")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[120px]">{ui("رقم الجوال")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[130px]">{ui("المركبة المسندة")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[160px]">{ui("حالة فحص اليوم")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[120px]">{ui("توقيت الفحص")}</TableHead>
                      <TableHead className="py-3 px-4 text-center min-w-[190px]">{ui("الإجراءات المباشرة")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y theme-border text-xs">
                    {filteredCaptains.map((c) => {
                      const isExecutingThis = executingCaptainId === c.id;

                      return (
                        <TableRow
                          key={c.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition duration-150 ${
                            !c.hasTodayInspection
                              ? "bg-amber-500/[0.02] dark:bg-amber-500/[0.02]"
                              : ""
                          }`}
                        >
                          {/* Captain details */}
                          <TableCell className="py-3.5 px-4 whitespace-nowrap">
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
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-rose-500/10 text-rose-700 dark:text-rose-400">
                                      {ui("معطل")}</span>
                                  )}
                                </div>
                                <div className="text-xs text-[var(--text-muted)] font-mono">
                                  {c.nationalId ? <>{ui("هوية:")} <span dir="ltr">{c.nationalId}</span></> : <span dir="ltr">{c.email}</span>}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Phone */}
                          <TableCell className="py-3.5 px-4 font-mono text-[var(--text-muted)] dark:text-slate-300 whitespace-nowrap" dir="ltr">
                            {c.phone || "—"}
                          </TableCell>

                          {/* Assigned Vehicle */}
                          <TableCell className="py-3.5 px-4 whitespace-nowrap">
                            {c.assignedVehiclePlate ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border theme-border font-mono font-bold">
                                <Car className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                                <bdi>{c.assignedVehiclePlate}</bdi>
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)] text-xs">{ui("غير محددة")}</span>
                            )}
                          </TableCell>

                          {/* Inspection Status */}
                          <TableCell className="py-3.5 px-4 whitespace-nowrap">
                            {c.hasTodayInspection ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                                {ui("تم الفحص ومؤهل للرحلات")}</div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                                {ui("لم يتم الفحص اليوم")}</div>
                            )}
                          </TableCell>

                          {/* Inspection Date/Time */}
                          <TableCell className="py-3.5 px-4 font-mono text-xs text-[var(--text-muted)] dark:text-slate-400 whitespace-nowrap">
                            {c.todayInspection ? (
                              <div className="flex flex-col">
                                <span className="text-slate-900 dark:text-white font-bold" dir="ltr">
                                  {new Date(c.todayInspection.createdAt || c.todayInspection.inspectionDate).toLocaleTimeString(ui.locale, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]" dir="ltr">
                                  {new Date(c.todayInspection.inspectionDate).toLocaleDateString("en-GB")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {/* IF NOT INSPECTED TODAY: Show Prominent Direct 1-Click Pass Button + Manual Date Option */}
                              {!c.hasTodayInspection ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDirectPass(c)}
                                    disabled={isExecutingThis}
                                    className="min-h-9 flex items-center gap-1.5 px-3 py-1.5 rounded-xl gold-gradient-btn text-xs font-semibold shadow-sm transition hover:shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                                    title={ui("إتمام واعتماد الفحص المباشر فوراً بضغطة زر")}
                                  >
                                    {isExecutingThis ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                        {ui("جاري الاعتماد...")}</>
                                    ) : (
                                      <>
                                        <Zap className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                                        {ui("إتمام الفحص المباشر")}</>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetCustomForm();
                                      setCustomCaptainId(c.id);
                                      if (c.assignedVehiclePlate) {
                                        setCustomVehiclePlate(c.assignedVehiclePlate);
                                      }
                                      setCustomInspectionDateMode("MANUAL");
                                      setIsCustomModalOpen(true);
                                    }}
                                    aria-label={`${ui("إجراء فحص مخصص وتحديد تاريخ يدوي للكابتن")} — ${c.name}`}
                                    className="min-h-9 min-w-9 p-1.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] dark:text-slate-300 inline-flex items-center justify-center transition shadow-2xs cursor-pointer"
                                    title={ui("إجراء فحص مخصص وتحديد تاريخ يدوي للكابتن")}
                                  >
                                    <Calendar className="w-4 h-4 text-amber-500" aria-hidden="true" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInspectionForView(c.todayInspection)}
                                    className="min-h-9 flex items-center gap-1 px-2.5 py-1.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition shadow-xs cursor-pointer"
                                    title={ui("عرض تفاصيل كشف الفحص التشغيلي")}
                                  >
                                    <Eye className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                                    {ui("تفاصيل الفحص")}</button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (c.todayInspection?.id) {
                                        setPreviewPdfInspection({
                                          id: c.todayInspection.id,
                                          captainName: c.name,
                                          vehiclePlate: c.assignedVehiclePlate || c.todayInspection.vehiclePlate,
                                          pdfPath: c.todayInspection.pdfPath,
                                        });
                                      }
                                    }}
                                    className="min-h-9 flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition shadow-xs cursor-pointer"
                                    title={ui("توليد ومعاينة مستند PDF الرسمي للفحص")}
                                  >
                                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>PDF</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDirectPass(c)}
                                    disabled={isExecutingThis}
                                    aria-label={`${ui("إعادة الفحص المباشر وتحديث التوقيت")} — ${c.name}`}
                                    className="min-h-9 min-w-9 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition cursor-pointer"
                                    title={ui("إعادة الفحص المباشر وتحديث التوقيت")}
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isExecutingThis ? "animate-spin text-amber-500" : ""}`} aria-hidden="true" />
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Captains Inspection Cards (Shown on mobile screens < md) */}
              <div className="md:hidden p-3.5 space-y-3">
                {filteredCaptains.map((c) => {
                  const isExecutingThis = executingCaptainId === c.id;
                  return (
                    <MobileRecordCard
                      key={c.id}
                      className={!c.hasTodayInspection ? "border-amber-500/30 bg-amber-500/[0.03]" : undefined}
                      title={
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-amber-500/10 border border-amber-500/20 shrink-0 flex items-center justify-center font-semibold text-amber-700 dark:text-amber-300">
                            {c.avatarUrl ? (
                              <Image
                                src={c.avatarUrl}
                                alt={c.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              c.name.charAt(0)
                            )}
                          </div>
                          <span className="truncate">{c.name}</span>
                          {!c.active && (
                            <Badge variant="destructive" className="text-[10px]">
                              {ui("معطل")}
                            </Badge>
                          )}
                        </div>
                      }
                      subtitle={
                        <div className="text-xs text-[var(--text-muted)] font-mono flex flex-wrap items-center gap-2">
                          {c.phone && (
                            <span dir="ltr" className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3 text-amber-500" aria-hidden="true" />
                              {c.phone}
                            </span>
                          )}
                          {c.nationalId && <span>{ui("هوية:")} <span dir="ltr">{c.nationalId}</span></span>}
                        </div>
                      }
                      badge={
                        c.hasTodayInspection ? (
                          <Badge variant="success" className="text-[11px] gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            <span>{ui("تم الفحص")}</span>
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[11px] gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                            <span>{ui("غير مفحوص")}</span>
                          </Badge>
                        )
                      }
                      footer={
                        !c.hasTodayInspection ? (
                          <>
                            <Button
                              type="button"
                              variant="gold"
                              size="sm"
                              onClick={() => handleDirectPass(c)}
                              disabled={isExecutingThis}
                              className="flex-1 min-h-11 gap-1.5 text-xs font-semibold"
                            >
                              {isExecutingThis ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                                  <span>{ui("جاري الاعتماد...")}</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 fill-current" aria-hidden="true" />
                                  <span>{ui("إتمام الفحص المباشر")}</span>
                                </>
                              )}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                resetCustomForm();
                                setCustomCaptainId(c.id);
                                if (c.assignedVehiclePlate) {
                                  setCustomVehiclePlate(c.assignedVehiclePlate);
                                }
                                setCustomInspectionDateMode("MANUAL");
                                setIsCustomModalOpen(true);
                              }}
                              className="min-h-11 w-11 p-0 shrink-0"
                              aria-label={`${ui("تحديد تاريخ يدوي")} — ${c.name}`}
                              title={ui("تحديد تاريخ يدوي")}
                            >
                              <Calendar className="w-4 h-4 text-amber-500" aria-hidden="true" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedInspectionForView(c.todayInspection)}
                              className="flex-1 min-h-11 gap-1.5 text-xs font-bold"
                            >
                              <Eye className="w-4 h-4 text-amber-500" aria-hidden="true" />
                              <span>{ui("تفاصيل الفحص")}</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (c.todayInspection?.id) {
                                  setPreviewPdfInspection({
                                    id: c.todayInspection.id,
                                    captainName: c.name,
                                    vehiclePlate: c.assignedVehiclePlate || c.todayInspection.vehiclePlate,
                                    pdfPath: c.todayInspection.pdfPath,
                                  });
                                }
                              }}
                              className="min-h-11 px-3.5 gap-1.5 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold"
                            >
                              <FileText className="w-4 h-4" aria-hidden="true" />
                              <span>PDF</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDirectPass(c)}
                              disabled={isExecutingThis}
                              className="min-h-11 w-11 p-0 shrink-0"
                              aria-label={`${ui("إعادة الفحص")} — ${c.name}`}
                              title={ui("إعادة الفحص")}
                            >
                              <RefreshCw className={`w-4 h-4 ${isExecutingThis ? "animate-spin text-amber-500" : ""}`} aria-hidden="true" />
                            </Button>
                          </>
                        )
                      }
                    >
                      <MobileCardMetaGrid>
                        <MobileCardField
                          label={ui("المركبة")}
                          mono
                          value={c.assignedVehiclePlate ? <bdi>{c.assignedVehiclePlate}</bdi> : ui("غير محددة")}
                        />
                        <MobileCardField
                          label={ui("التوقيت")}
                          mono
                          value={
                            c.todayInspection ? (
                              <span dir="ltr">
                                {new Date(c.todayInspection.createdAt || c.todayInspection.inspectionDate).toLocaleTimeString(ui.locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              "—"
                            )
                          }
                        />
                      </MobileCardMetaGrid>
                    </MobileRecordCard>
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
                {ui("لا توجد سجلات فحص تشغيلي")}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {ui("لم يتم العثور على أي سجل فحص مطابق لخيارات البحث")}</p>
            </div>
          ) : (
            <>
              {/* Header Bar with Count */}
              <div className="p-3 sm:p-4 border-b theme-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("سجلات الفحص التشغيلي (")}{filteredInspections.length})
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {ui("إجمالي السجلات:")} {stats.totalInspections}
                </span>
              </div>

              {/* Desktop Table View (Hidden on mobile, visible on md and up) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b theme-border bg-slate-50/70 dark:bg-slate-800/40 text-[var(--text-muted)] dark:text-slate-400 text-xs font-bold whitespace-nowrap">
                      <TableHead className="py-3 px-4 min-w-[100px]">{ui("كود الفحص")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[180px]">{ui("الكابتن")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[120px]">{ui("المركبة")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[140px]">{ui("التاريخ والوقت")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[130px]">{ui("حالة البنود")}</TableHead>
                      <TableHead className="py-3 px-4 min-w-[110px]">{ui("العقود المرتبطة")}</TableHead>
                      <TableHead className="py-3 px-4 text-center min-w-[160px]">{ui("الإجراءات")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y theme-border text-xs">
                    {filteredInspections.map((insp) => {
                      const passedCount = ALL_CHECK_ITEMS.filter((item) => Boolean(insp[item.key])).length;
                      const allPassed = passedCount === ALL_CHECK_ITEMS.length;
                      return (
                      <TableRow
                        key={insp.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition duration-150"
                      >
                        {/* Code */}
                        <TableCell className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap" dir="ltr">
                          #{insp.id.slice(0, 8)}
                        </TableCell>

                        {/* Captain */}
                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {insp.captainName || ui("كابتن غير محدد")}
                          </div>
                          {insp.captainPhone && (
                            <div className="text-xs text-[var(--text-muted)] font-mono" dir="ltr">
                              {insp.captainPhone}
                            </div>
                          )}
                        </TableCell>

                        {/* Vehicle */}
                        <TableCell className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          <bdi>{insp.vehiclePlate}</bdi>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell className="py-3.5 px-4 font-mono text-xs text-[var(--text-muted)] dark:text-slate-400 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                              {insp.inspectionDate || insp.createdAt ? new Date(insp.inspectionDate || insp.createdAt || "").toLocaleDateString("en-GB") : "—"}
                            </span>
                            <span className="text-xs" dir="ltr">
                              {new Date(insp.createdAt || insp.inspectionDate).toLocaleTimeString(ui.locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </TableCell>

                        {/* Pass status */}
                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                              allPassed
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                            }`}
                          >
                            {allPassed ? (
                              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            )}
                            <span dir="ltr">{passedCount}/{ALL_CHECK_ITEMS.length}</span>{" "}
                            <span>{allPassed ? ui("مكتمل") : (isRTL ? "بها ملاحظات" : "needs review")}</span>
                          </span>
                        </TableCell>

                        {/* Linked Contracts Count */}
                        <TableCell className="py-3.5 px-4 font-mono text-center whitespace-nowrap">
                          {insp.contractCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-xs">
                              {insp.contractCount} {ui("عقد")}</span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-xs">{ui("لا يوجد")}</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`${ui("عرض تفاصيل الفحص")} #${insp.id.slice(0, 8)}`}
                              onClick={() => setSelectedInspectionForView(insp)}
                              className="min-h-9 min-w-9 p-1.5 rounded-lg border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-muted)] dark:text-slate-300 inline-flex items-center justify-center transition cursor-pointer"
                              title={ui("عرض تفاصيل الفحص")}
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPdfInspection({
                                  id: insp.id,
                                  captainName: insp.captainName,
                                  vehiclePlate: insp.vehiclePlate,
                                  pdfPath: insp.pdfPath,
                                })
                              }
                              className="min-h-9 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition cursor-pointer"
                              title={ui("توليد وتحميل مستند PDF الرسمي للفحص")}
                            >
                              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>PDF</span>
                            </button>

                            <button
                              type="button"
                              aria-label={`${ui("حذف سجل الفحص")} #${insp.id.slice(0, 8)}`}
                              onClick={() => setDeleteConfirmId(insp.id)}
                              className="min-h-9 min-w-9 p-1.5 rounded-lg border border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center justify-center transition cursor-pointer"
                              title={ui("حذف سجل الفحص")}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile History Record Cards (Shown on mobile screens < md) */}
              <div className="md:hidden p-3.5 space-y-3">
                {filteredInspections.map((insp) => {
                  const passedCount = ALL_CHECK_ITEMS.filter((item) => Boolean(insp[item.key])).length;
                  const allPassed = passedCount === ALL_CHECK_ITEMS.length;
                  return (
                  <MobileRecordCard
                    key={insp.id}
                    title={
                      <span dir="ltr" className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        #{insp.id.slice(0, 8)}
                      </span>
                    }
                    subtitle={
                      <span dir="ltr" className="font-mono">
                        {insp.inspectionDate || insp.createdAt ? new Date(insp.inspectionDate || insp.createdAt || "").toLocaleDateString("en-GB") : "—"}{" "}
                        ·{" "}
                        {new Date(insp.createdAt || insp.inspectionDate).toLocaleTimeString(ui.locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    }
                    badge={
                      <Badge variant={allPassed ? "success" : "warning"} className="text-[11px] gap-1">
                        {allPassed ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span dir="ltr">{passedCount}/{ALL_CHECK_ITEMS.length}</span>{" "}
                        <span>{allPassed ? ui("مكتمل") : (isRTL ? "بها ملاحظات" : "needs review")}</span>
                      </Badge>
                    }
                    footer={
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInspectionForView(insp)}
                          className="flex-1 min-h-11 gap-1.5 text-xs font-bold"
                        >
                          <Eye className="w-4 h-4 text-amber-500" aria-hidden="true" />
                          <span>{ui("تفاصيل")}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPreviewPdfInspection({
                              id: insp.id,
                              captainName: insp.captainName,
                              vehiclePlate: insp.vehiclePlate,
                              pdfPath: insp.pdfPath,
                            })
                          }
                          className="flex-1 min-h-11 gap-1.5 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold"
                        >
                          <FileText className="w-4 h-4" aria-hidden="true" />
                          <span>{ui("وثيقة PDF")}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(insp.id)}
                          className="min-h-11 w-11 p-0 border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 shrink-0"
                          aria-label={`${ui("حذف")} #${insp.id.slice(0, 8)}`}
                          title={ui("حذف")}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </>
                    }
                  >
                    <MobileCardMetaGrid columns={3}>
                      <MobileCardField
                        label={ui("الكابتن")}
                        value={insp.captainName || ui("كابتن غير محدد")}
                      />
                      <MobileCardField
                        label={ui("المركبة")}
                        mono
                        value={<bdi>{insp.vehiclePlate}</bdi>}
                      />
                      <MobileCardField
                        label={ui("العقود")}
                        mono
                        value={
                          insp.contractCount > 0
                            ? `${insp.contractCount} ${ui("عقد")}`
                            : ui("لا عقود")
                        }
                      />
                    </MobileCardMetaGrid>
                  </MobileRecordCard>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: INSPECTION DETAILS MODAL (16-POINT BREAKDOWN)
      ───────────────────────────────────────────────────────────────────────────── */}
      {selectedInspectionForView && (
        <Modal label={ui("تفاصيل الفحص")} onClose={() => setSelectedInspectionForView(null)} isBusy={false}>
          <div className="mobile-dialog-panel theme-card w-full max-w-2xl rounded-3xl border theme-border shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b theme-border flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {ui("كشف الفحص التشغيلي اليومي للمركبة")}</h3>
                  <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 font-mono">
                    {ui("كود الفحص: #")}<span dir="ltr">{selectedInspectionForView.id.slice(0, 10)}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label={ui("إغلاق")}
                onClick={() => setSelectedInspectionForView(null)}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Meta Info Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border theme-border text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block text-xs">{ui("الكابتن:")}</span>
                  <strong className="text-slate-900 dark:text-white">
                    {selectedInspectionForView.captainName || ui("غير محدد")}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-xs">{ui("لوحة المركبة:")}</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {selectedInspectionForView.vehiclePlate}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-xs">{ui("تاريخ الفحص:")}</span>
                  <strong className="font-mono text-slate-900 dark:text-white" dir="ltr">
                    {new Date(selectedInspectionForView.inspectionDate).toLocaleDateString("en-GB")}
                  </strong>
                </div>
              </div>

              {/* Group 1: Dashboard Indicators */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Gauge className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  {ui("مؤشرات لوحة القيادة والعدادات (Dashboard)")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DASHBOARD_ITEMS.map((item) => {
                    const val = Boolean(selectedInspectionForView[item.key as keyof VehicleInspection]);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {isRTL ? item.titleAr : item.titleEn}
                        </span>
                        {val ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            {ui("سليم")}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold text-xs">
                            <XCircle className="w-4 h-4" aria-hidden="true" />
                            {ui("عطل")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: External Inspection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Car className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  {ui("الفحص الخارجي والهيكل والإنارة")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXTERNAL_ITEMS.map((item) => {
                    const val = Boolean(selectedInspectionForView[item.key as keyof VehicleInspection]);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {isRTL ? item.titleAr : item.titleEn}
                        </span>
                        {val ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            {ui("سليم")}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold text-xs">
                            <XCircle className="w-4 h-4" aria-hidden="true" />
                            {ui("عطل")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 3: Safety & Emergency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                  {ui("تجهيزات السلامة والطوارئ")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAFETY_ITEMS.map((item) => {
                    const val = Boolean(selectedInspectionForView[item.key as keyof VehicleInspection]);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {isRTL ? item.titleAr : item.titleEn}
                        </span>
                        {val ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            {ui("متوفر")}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold text-xs">
                            <XCircle className="w-4 h-4" aria-hidden="true" />
                            {ui("غير متوفر")}</span>
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
                    {ui("ملاحظات الفاحص:")}</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {selectedInspectionForView.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                {ui("معتمد رسمياً في نظام ميقات الخليج")}</span>
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPdfInspection({
                      id: selectedInspectionForView.id,
                      captainName: selectedInspectionForView.captainName,
                      vehiclePlate: selectedInspectionForView.vehiclePlate,
                      pdfPath: selectedInspectionForView.pdfPath,
                    });
                  }}
                  className="flex-1 sm:flex-initial min-h-11 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs font-bold shadow-xs hover:shadow-md transition"
                  title={ui("معاينة وتحميل ملف PDF الرسمي")}
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>{ui("معاينة وتحميل PDF")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInspectionForView(null)}
                  className="min-h-11 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                  {ui("إغلاق")}</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: CUSTOM / NEW INSPECTION MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {isCustomModalOpen && (
        <Modal label={ui("تسجيل فحص")} onClose={() => setIsCustomModalOpen(false)} isBusy={isSubmittingCustom}>
          <div className="mobile-dialog-panel theme-card w-full max-w-3xl rounded-3xl border theme-border shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b theme-border flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {ui("تسجيل فحص تشغيلي مخصص للمركبة")}</h3>
                  <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">
                    {ui("فحص يدوي تفصيلي لـ 16 نقطة سلامة وتشغيل")}</p>
                </div>
              </div>

              <button
                type="button"
                aria-label={ui("إغلاق")}
                onClick={() => setIsCustomModalOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCustomSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* Captain & Vehicle Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`${formId}-captain`} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {ui("اختيار الكابتن")}<span className="text-rose-700">*</span>
                    </label>
                    <select
                      id={`${formId}-captain`}
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
                      className="theme-input w-full min-h-11 sm:min-h-10 p-2.5 text-sm sm:text-xs rounded-xl"
                    >
                      <option value="">{ui("-- اختر الكابتن المراد فحصه --")}</option>
                      {safeCaptains.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {ui(c.hasTodayInspection ? "(تم فحصه اليوم)" : "(غير مفحوص اليوم)")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor={`${formId}-plate`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        {ui("لوحة المركبة")}<span className="text-rose-700">*</span>
                      </label>
                      {safeVehicles.length > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {safeVehicles.length} {ui("مركبة بالأسطول")}</span>
                      )}
                    </div>
                    <input
                      id={`${formId}-plate`}
                      type="text"
                      value={customVehiclePlate}
                      onChange={(e) => setCustomVehiclePlate(e.target.value)}
                      placeholder={ui("مثال: ا ص ل 7223")}
                      required
                      className="theme-input w-full min-h-11 sm:min-h-10 p-2.5 text-sm sm:text-xs rounded-xl font-mono"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {safeVehicles.length > 0 && (
                        <select
                          aria-label={ui("اختيار سريع من مركبات الأسطول...")}
                          onChange={(e) => {
                            if (e.target.value) setCustomVehiclePlate(e.target.value);
                          }}
                          value=""
                          className="min-h-9 text-xs py-1 px-2 rounded-lg border theme-border bg-slate-100/70 dark:bg-slate-800 text-[var(--text-muted)] dark:text-slate-300 cursor-pointer hover:border-amber-500/40"
                        >
                          <option value="">{ui("اختيار سريع من مركبات الأسطول...")}</option>
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
                              onClick={() => setCustomVehiclePlate(cap.assignedVehiclePlate || "")}
                              className="min-h-9 text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
                            >
                              {ui("مركبة الكابتن (")}{cap.assignedVehiclePlate})
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
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                        {ui("تاريخ الفحص التشغيلي")}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {ui("يمكن اعتماد تاريخ اليوم الفعلي تلقائياً أو اختيار تاريخ يدوي مخصص")}</p>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border theme-border self-start sm:self-auto shadow-2xs">
                      <button
                        type="button"
                        aria-pressed={customInspectionDateMode === "AUTO"}
                        onClick={() => setCustomInspectionDateMode("AUTO")}
                        className={`min-h-10 sm:min-h-8 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          customInspectionDateMode === "AUTO"
                            ? "gold-gradient-btn shadow-xs"
                            : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        {ui("اليوم (تلقائي)")}</button>
                      <button
                        type="button"
                        aria-pressed={customInspectionDateMode === "MANUAL"}
                        onClick={() => setCustomInspectionDateMode("MANUAL")}
                        className={`min-h-10 sm:min-h-8 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          customInspectionDateMode === "MANUAL"
                            ? "gold-gradient-btn shadow-xs"
                            : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        {ui("يدوي (تاريخ مخصص)")}</button>
                    </div>
                  </div>

                  {customInspectionDateMode === "AUTO" ? (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t theme-border text-xs">
                      <span className="text-[var(--text-muted)] dark:text-slate-400">
                        {ui("تاريخ الفحص المعتمد في السجلات والوثيقة:")}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span dir="ltr">{formatOfficialDate(getSaudiTodayDateStr())}</span> {ui("(تاريخ اليوم الفعلي بتوقيت المملكة)")}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t theme-border">
                      <div className="w-full sm:w-64">
                        <CustomDatePicker
                          label={ui("تاريخ الفحص المعتمد")}
                          required
                          value={customInspectionDate}
                          onChange={setCustomInspectionDate}
                        />
                      </div>
                      <div className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 sm:self-end min-h-11">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                        <span>
                          {ui("سيتم توثيق الفحص واعتماده بهذا التاريخ المخصص في السجلات وتقارير الفحص ووثيقة الـ PDF الرسمية.")}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Toggle All Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    {ui("تحديد جميع نقاط الفحص (16/16) كسليمة ومجتازة")}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allPass: Record<string, boolean> = {};
                        ALL_CHECK_ITEMS.forEach((i) => (allPass[i.key] = true));
                        setCustomChecks(allPass);
                      }}
                      className="min-h-10 sm:min-h-8 px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
                    >
                      {ui("تحديد الكل سليم")}</button>
                    <button
                      type="button"
                      onClick={() => {
                        const allFail: Record<string, boolean> = {};
                        ALL_CHECK_ITEMS.forEach((i) => (allFail[i.key] = false));
                        setCustomChecks(allFail);
                      }}
                      className="min-h-10 sm:min-h-8 px-3 py-1 rounded-lg border theme-border text-xs text-[var(--text-muted)] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    >
                      {ui("إلغاء التحديد")}</button>
                  </div>
                </div>

                {/* Checklist Sections */}
                <InspectionChecklist
                  checks={customChecks}
                  onChange={(key, value) =>
                    setCustomChecks((prev) => ({ ...prev, [key]: value }))
                  }
                />

                {/* Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor={`${formId}-notes`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {ui("ملاحظات الفحص التشغيلي (اختياري)")}</label>
                    <span className="text-xs text-[var(--text-muted)]">
                      {ui("اقتراحات سريعة")}</span>
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
                        className="min-h-9 text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border theme-border text-[var(--text-muted)] dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 transition cursor-pointer"
                      >
                        {ui(preset)}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id={`${formId}-notes`}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    rows={2}
                    placeholder={ui("اكتب أي ملاحظات فنية أو تفاصيل إضافية عن حالة المركبة...")}
                    className="theme-input w-full p-2.5 text-sm sm:text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t theme-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{ui("يتم حفظ البيانات وتوليد وتخزين وثيقة PDF فورياً في النظام")}</span>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCustomModalOpen(false)}
                    className="min-h-11 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  >
                    {ui("إلغاء")}</button>

                  <button
                    type="submit"
                    disabled={isSubmittingCustom}
                    className="min-h-11 flex items-center gap-1.5 px-6 py-2 rounded-xl gold-gradient-btn text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingCustom ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        {ui("جاري حفظ وتخزين الفحص...")}</>
                    ) : (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        {ui("اعتماد وتوثيق الفحص التشغيلي")}</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 3: DELETE CONFIRMATION DIALOG
      ───────────────────────────────────────────────────────────────────────────── */}
      {deleteConfirmId && (
        <Modal label={ui("حذف الفحص")} onClose={() => setDeleteConfirmId(null)} isBusy={isDeleting}>
          <div className="mobile-dialog-panel overflow-y-auto theme-card w-full max-w-md rounded-3xl border border-rose-500/30 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" aria-hidden="true" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {ui("تأكيد حذف سجل الفحص التشغيلي")}</h2>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">
                {ui("هل أنت متأكد من رغبتك في حذف هذا السجل بشكل نهائي؟ سيتم فك ارتباط أي عقد مرتبط به.")}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 min-h-11 py-2.5 rounded-xl border theme-border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {ui("تراجع")}</button>

              <button
                type="button"
                onClick={handleDeleteInspection}
                disabled={isDeleting}
                className="flex-1 min-h-11 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    {ui("جاري الحذف...")}</>
                ) : (
                  <>{ui("حذف نهائي")}</>
                )}
              </button>
            </div>
          </div>
        </Modal>
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
          pdfUrl={previewPdfInspection.pdfPath}
        />
      )}
    </div>
  );
}
