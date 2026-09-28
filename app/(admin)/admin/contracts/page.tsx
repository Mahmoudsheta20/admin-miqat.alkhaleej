"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Users,
  RefreshCw,
  X,
  Plane,
  MapPin,
  Calendar,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  User,
  Copy,
  Check,
  Phone,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import {
  getContracts,
  deleteContract,
} from "@/app/_actions/contract";
import { getCaptains } from "@/app/_actions/captain";
import { Contract, OperationType, SystemUser } from "@/lib/types";
import ContractActions from "./contract-actions";
import StatusBadge from "@/app/_components/StatusBadge";
import PdfPreviewModal from "@/app/_components/PdfPreviewModal";
import ConfirmDialog from "@/app/_components/ConfirmDialog";
import { formatOfficialDate } from "@/lib/contractConstants";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

export default function AdminContractsPage() {
  const cachedContracts = getCachedData<Awaited<ReturnType<typeof getContracts>>>("contracts_ALL_ALL_");
  const cachedCaptains = getCachedData<Awaited<ReturnType<typeof getCaptains>>>("captains_list");

  // Data states
  const [contracts, setContracts] = useState<Contract[]>(() => {
    if (Array.isArray(cachedContracts)) return cachedContracts;
    if (cachedContracts && typeof cachedContracts === "object" && Array.isArray(cachedContracts.contracts)) {
      return cachedContracts.contracts;
    }
    return [];
  });
  const [captains, setCaptains] = useState<(SystemUser & { contractCount?: number; hasTodayInspection?: boolean })[]>(() => {
    if (Array.isArray(cachedCaptains)) return cachedCaptains;
    if (cachedCaptains && typeof cachedCaptains === "object" && Array.isArray(cachedCaptains.captains)) {
      return cachedCaptains.captains;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => !cachedContracts);
  const [isLoadingCaptains, setIsLoadingCaptains] = useState(() => !cachedCaptains);

  // Filters
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [captainFilter, setCaptainFilter] = useState<string>("ALL");
  const [inspectionFilter, setInspectionFilter] = useState<"ALL" | "INSPECTED" | "PENDING">("ALL");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal states
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);
  const [previewPdfRef, setPreviewPdfRef] = useState<string>("");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Action feedback
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Quick copy reference state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Deletion states
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteContract(contractToDelete.id);
      setIsDeleting(false);
      if (res.success) {
        invalidateClientCache("contracts_");
        invalidateClientCache("dashboard_stats");
        setContracts((prev) => prev.filter((c) => c.id !== contractToDelete.id));
        if (selectedContract?.id === contractToDelete.id) {
          setSelectedContract(null);
        }
        setSyncStatus(`تم حذف العقد ${contractToDelete.referenceNumber} بنجاح`);
        setContractToDelete(null);
      } else {
        alert(res.error || "فشل حذف العقد");
      }
    } catch (err) {
      setIsDeleting(false);
      console.error("Delete contract error:", err);
      alert("حدث خطأ أثناء محاولة حذف العقد");
    }
  };

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => {
      setCopiedRef((curr) => (curr === ref ? null : curr));
    }, 2000);
  };

  // Load contracts helper for manual refresh
  const fetchContractsData = async (
    opts?: {
      type?: string;
      captain?: string;
      query?: string;
    },
    forceRefresh = false
  ) => {
    const activeType = opts?.type ?? typeFilter;
    const activeCaptain = opts?.captain ?? captainFilter;
    const activeQuery = (opts?.query ?? submittedSearch).trim();
    const cacheKey = `contracts_${activeType}_${activeCaptain}_${activeQuery}`;

    if (forceRefresh || contracts.length === 0) {
      setIsLoading(true);
    }
    try {
      const res = await fetchCached(
        cacheKey,
        () =>
          getContracts({
            operationType: activeType !== "ALL" ? (activeType as OperationType) : undefined,
            captainId: activeCaptain !== "ALL" ? activeCaptain : undefined,
            search: activeQuery || undefined,
          }),
        { ttlMs: 45_000, forceRefresh }
      );
      if (res.success && res.contracts) {
        setContracts(res.contracts);
      }
    } catch (e) {
      console.error("Failed to load contracts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load of captains with caching
  useEffect(() => {
    let isCancelled = false;
    const loadCaptains = async () => {
      try {
        const res = await fetchCached("captains_list", getCaptains, { ttlMs: 120_000 });
        if (!isCancelled && res?.success && Array.isArray(res?.captains)) {
          setCaptains(res.captains);
        }
      } catch (e) {
        console.error("Failed to load captains:", e);
      } finally {
        if (!isCancelled) {
          setIsLoadingCaptains(false);
        }
      }
    };
    loadCaptains();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Fetch contracts when typeFilter, captainFilter, or submittedSearch changes
  useEffect(() => {
    let isCancelled = false;
    const executeFetch = async () => {
      const cacheKey = `contracts_${typeFilter}_${captainFilter}_${submittedSearch.trim()}`;
      try {
        const res = await fetchCached(
          cacheKey,
          () =>
            getContracts({
              operationType: typeFilter !== "ALL" ? (typeFilter as OperationType) : undefined,
              captainId: captainFilter !== "ALL" ? captainFilter : undefined,
              search: submittedSearch.trim() || undefined,
            }),
          { ttlMs: 45_000 }
        );
        if (!isCancelled && res.success && res.contracts) {
          setContracts(res.contracts);
        }
      } catch (e) {
        console.error("Failed to load contracts:", e);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    executeFetch();
    return () => {
      isCancelled = true;
    };
  }, [typeFilter, captainFilter, submittedSearch]);

  // Handle operation type click
  const handleTypeFilterSelect = (id: string) => {
    setIsLoading(true);
    setTypeFilter(id);
    setCurrentPage(1);
  };

  // Handle captain select
  const handleCaptainFilterSelect = (capId: string) => {
    setIsLoading(true);
    setCaptainFilter(capId);
    setCurrentPage(1);
  };

  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSubmittedSearch(search);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setSubmittedSearch("");
    setTypeFilter("ALL");
    setCaptainFilter("ALL");
    setInspectionFilter("ALL");
    setCurrentPage(1);
  };

  // PDF Preview opener
  const openPdf = (c: Contract) => {
    setPreviewPdfId(c.id);
    setPreviewPdfRef(c.referenceNumber);
    setPreviewPdfUrl(c.pdfPath || null);
  };

  // Filtered contracts by inspectionFilter (client-side instantaneous filter)
  const filteredContracts = useMemo(() => {
    if (inspectionFilter === "INSPECTED") {
      return contracts.filter((c) => Boolean(c.inspectionId || c.inspection));
    }
    if (inspectionFilter === "PENDING") {
      return contracts.filter((c) => !c.inspectionId && !c.inspection);
    }
    return contracts;
  }, [contracts, inspectionFilter]);

  // Overall counts for stats
  const stats = useMemo(() => {
    const total = contracts.length;
    const inspected = contracts.filter((c) => Boolean(c.inspectionId || c.inspection)).length;
    const pending = total - inspected;
    const totalPassengers = contracts.reduce(
      (acc, c) => acc + (c.passengers?.length || 0),
      0
    );
    return { total, inspected, pending, totalPassengers };
  }, [contracts]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredContracts.length);
  const paginatedContracts = useMemo(() => {
    return filteredContracts.slice(startIndex, endIndex);
  }, [filteredContracts, startIndex, endIndex]);

  // Smart page numbers array
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages);
      }
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "ALL" ||
    captainFilter !== "ALL" ||
    inspectionFilter !== "ALL";

  return (
    <div className="space-y-6 pb-12">
      {/* Sync Status Alert Banner */}
      {syncStatus && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{syncStatus}</span>
          </div>
          <button
            onClick={() => setSyncStatus(null)}
            className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                سجل العقود الرسمية
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                إدارة وتوثيق عقود النقل البري، التحقق الإلكتروني عبر رمز QR، ومتابعة الفحص التشغيلي
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/contracts/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-xs hover:shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span>+ إنشاء عقد جديد</span>
          </Link>
          <button
            onClick={() => fetchContractsData(undefined, true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300 disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Contracts */}
        <div
          onClick={() => setInspectionFilter("ALL")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            inspectionFilter === "ALL"
              ? "bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/30"
              : "theme-card theme-border hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي العقود</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700/60 rounded-lg animate-pulse" />
            ) : (
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.total}
              </span>
            )}
            <span className="text-[11px] text-slate-400">عقد موثق</span>
          </div>
        </div>

        {/* Inspected Contracts */}
        <div
          onClick={() => setInspectionFilter("INSPECTED")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            inspectionFilter === "INSPECTED"
              ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30"
              : "theme-card theme-border hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              فحص تشغيلي معتمد
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-16 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-lg animate-pulse" />
            ) : (
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {stats.inspected}
              </span>
            )}
            <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">مكتمل</span>
          </div>
        </div>

        {/* Pending Inspection */}
        <div
          onClick={() => setInspectionFilter("PENDING")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            inspectionFilter === "PENDING"
              ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30"
              : "theme-card theme-border hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              بانتظار الفحص
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-16 bg-amber-500/20 dark:bg-amber-500/10 rounded-lg animate-pulse" />
            ) : (
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                {stats.pending}
              </span>
            )}
            <span className="text-[11px] text-amber-600/70 dark:text-amber-400/70">غير مفحوص</span>
          </div>
        </div>

        {/* Total Passengers */}
        <div className="p-4 rounded-2xl border theme-card theme-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي الضيوف والركاب
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-16 bg-blue-500/20 dark:bg-blue-500/10 rounded-lg animate-pulse" />
            ) : (
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.totalPassengers}
              </span>
            )}
            <span className="text-[11px] text-slate-400">راكب مسجل</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="md:col-span-6 lg:col-span-5 theme-card px-3.5 py-2.5 rounded-2xl border theme-border flex items-center gap-2.5 focus-within:border-amber-500 transition shadow-xs"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم العقد، اسم العميل، اللوحة، أو رقم الرحلة..."
              className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSubmittedSearch("");
                  setCurrentPage(1);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition shrink-0"
            >
              بحث
            </button>
          </form>

          {/* Captain Selector Filter */}
          <div className="md:col-span-6 lg:col-span-4 theme-card px-3 py-2 rounded-2xl border theme-border flex items-center gap-2.5 focus-within:border-amber-500 transition shadow-xs">
            <User className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label htmlFor="captainFilterSelect" className="block text-[10px] text-slate-400 font-medium leading-none mb-1">
                تصفية حسب الكابتن:
              </label>
              {isLoadingCaptains ? (
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700/60 rounded-md animate-pulse my-0.5" />
              ) : (
                <select
                  id="captainFilterSelect"
                  value={captainFilter}
                  onChange={(e) => handleCaptainFilterSelect(e.target.value)}
                  className="w-full bg-transparent border-none text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900">
                    جميع الكباتن ({Array.isArray(captains) ? captains.length : 0})
                  </option>
                  {(Array.isArray(captains) ? captains : []).map((cap) => (
                    <option key={cap.id} value={cap.id} className="bg-white dark:bg-slate-900">
                      {cap.name} {cap.assignedVehiclePlate ? `(${cap.assignedVehiclePlate})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {captainFilter !== "ALL" && !isLoadingCaptains && (
              <button
                onClick={() => handleCaptainFilterSelect("ALL")}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="إلغاء تصفية الكابتن"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Inspection Filter Dropdown */}
          <div className="md:col-span-6 lg:col-span-3 theme-card px-3 py-2 rounded-2xl border theme-border flex items-center gap-2.5 focus-within:border-amber-500 transition shadow-xs">
            <ClipboardCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label htmlFor="inspectionFilterSelect" className="block text-[10px] text-slate-400 font-medium leading-none mb-1">
                الفحص التشغيلي:
              </label>
              <select
                id="inspectionFilterSelect"
                value={inspectionFilter}
                onChange={(e) => {
                  setInspectionFilter(e.target.value as "ALL" | "INSPECTED" | "PENDING");
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent border-none text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900">
                  كافة الحالات
                </option>
                <option value="INSPECTED" className="bg-white dark:bg-slate-900">
                  مفحوص ومعتمد فقط ({stats.inspected})
                </option>
                <option value="PENDING" className="bg-white dark:bg-slate-900">
                  بانتظار الفحص فقط ({stats.pending})
                </option>
              </select>
            </div>
            {inspectionFilter !== "ALL" && (
              <button
                onClick={() => {
                  setInspectionFilter("ALL");
                  setCurrentPage(1);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="إلغاء التصفية"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Operation Type Chips & Active Filters Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "جميع العمليات" },
              { id: "AIRPORT_TRANSFER", label: "توصيل مطار" },
              { id: "CITY_TOUR", label: "جولة سياحية" },
              { id: "INTERCITY", label: "بين المدن" },
              { id: "HAJJ_UMRAH", label: "حج وعمرة" },
            ].map((op) => (
              <button
                key={op.id}
                onClick={() => handleTypeFilterSelect(op.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
                  typeFilter === op.id
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-xs"
                    : "theme-card text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-500/50"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>

          {/* Reset Filters button if active */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold self-start sm:self-auto shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              إعادة ضبط جميع عوامل التصفية
            </button>
          )}
        </div>
      </div>

      {/* Main Table & Mobile Cards Container */}
      <div className="theme-card rounded-2xl sm:rounded-3xl overflow-hidden border theme-border shadow-xs">
        {/* Loading State Skeleton */}
        {isLoading ? (
          <>
            {/* Desktop Table Skeleton */}
            <div className="hidden lg:block overflow-x-auto relative">
              <table className="w-full text-right text-xs border-separate border-spacing-0">
                <thead className="bg-slate-50/95 dark:bg-slate-900/90 border-b theme-border text-slate-500 dark:text-slate-400 font-bold backdrop-blur-xs">
                  <tr>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">رقم العقد والعملية</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">العميل / الطرف الثاني</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">الكابتن واللوحة</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">مسار الرحلة والموعد</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">الفحص التشغيلي</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap border-b theme-border">الركاب</th>
                    <th className="sticky left-0 z-20 px-3.5 py-3.5 text-left whitespace-nowrap border-b theme-border bg-slate-50 dark:bg-slate-900 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.5)] border-r border-slate-200/80 dark:border-slate-800">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-slate-200">
                  {[...Array(6)].map((_, i) => (
                    <tr key={`tbl-skel-${i}`} className="animate-pulse">
                      {/* Ref & Operation */}
                      <td className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                          <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
                        </div>
                      </td>
                      {/* Customer */}
                      <td className="px-3.5 py-3 align-middle border-b theme-border">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700/60 shrink-0" />
                          <div className="space-y-1.5 min-w-0">
                            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                            <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-sm" />
                          </div>
                        </div>
                      </td>
                      {/* Captain & Vehicle */}
                      <td className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700/40 rounded-md" />
                        </div>
                      </td>
                      {/* Route & Date */}
                      <td className="px-3.5 py-3 align-middle border-b theme-border">
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                          <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded-sm" />
                        </div>
                      </td>
                      {/* Inspection */}
                      <td className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                      </td>
                      {/* Passengers */}
                      <td className="px-3 py-3 align-middle text-center whitespace-nowrap border-b theme-border">
                        <div className="inline-block h-6 w-10 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                      </td>
                      {/* Actions (Sticky left) */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3.5 py-3 align-middle text-left whitespace-nowrap border-b theme-border border-r border-slate-200/80 dark:border-slate-800 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.5)]">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                          <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                          <div className="w-14 h-7 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Skeleton */}
            <div className="lg:hidden divide-y theme-border">
              {[...Array(4)].map((_, i) => (
                <div key={`mob-skel-${i}`} className="p-4 space-y-3.5 animate-pulse">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-sm" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700/60 rounded-full" />
                      <div className="h-4 w-14 bg-slate-200 dark:bg-slate-700/40 rounded-full" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700/40 rounded-sm" />
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700/40 rounded-sm" />
                      <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                    </div>
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 space-y-2">
                      <div className="h-3.5 w-48 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700/40 rounded-sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                      <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="px-4 sm:px-6 py-4 border-t theme-border bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
              </div>
            </div>
          </>
        ) : filteredContracts.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              لا توجد عقود مسجلة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters
                ? "لا توجد نتائج تطابق معايير البحث والتصفية المحددة. جرب تغيير المدخلات أو إعادة ضبط التصفية."
                : "لم يتم إنشاء أي عقود بعد. ابدأ بإنشاء عقد جديد وتوثيقه في النظام."}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-bold rounded-xl border theme-card hover:border-amber-500 text-amber-600 dark:text-amber-400 transition"
              >
                إلغاء عوامل التصفية
              </button>
            ) : (
              <Link
                href="/admin/contracts/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-xs"
              >
                <FileText className="w-4 h-4" />
                + إنشاء أول عقد
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (lg and up) */}
            <div className="hidden lg:block overflow-x-auto relative">
              <table className="w-full text-right text-xs border-separate border-spacing-0">
                <thead className="bg-slate-50/95 dark:bg-slate-900/90 border-b theme-border text-slate-500 dark:text-slate-400 font-bold backdrop-blur-xs">
                  <tr>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">رقم العقد والعملية</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">العميل / الطرف الثاني</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">الكابتن واللوحة</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">مسار الرحلة والموعد</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap border-b theme-border">الفحص التشغيلي</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap border-b theme-border">الركاب</th>
                    <th className="sticky left-0 z-20 px-3.5 py-3.5 text-left whitespace-nowrap border-b theme-border bg-slate-50 dark:bg-slate-900 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.5)] border-r border-slate-200/80 dark:border-slate-800">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-slate-200">
                  {paginatedContracts.map((c) => {
                    const isInspected = Boolean(c.inspectionId || c.inspection);

                    return (
                      <tr
                        key={c.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150"
                      >
                        {/* Reference & Operation Type */}
                        <td className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm tracking-tight">
                              {c.referenceNumber}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyRef(c.referenceNumber, e)}
                              className="p-1 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition"
                              title="نسخ رقم العقد"
                            >
                              {copiedRef === c.referenceNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <StatusBadge type="operation" status={c.operationType} size="sm" />
                            {c.status && (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                  c.status === "APPROVED"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : c.status === "REJECTED"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {c.status === "APPROVED"
                                  ? "معتمد"
                                  : c.status === "REJECTED"
                                  ? "مرفوض"
                                  : "قيد المراجعة"}
                              </span>
                            )}
                            {c.flightNumber && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold">
                                <Plane className="w-2.5 h-2.5 text-blue-500" />
                                <span>{c.flightCarrier ? `${c.flightCarrier} ` : ""}{c.flightNumber}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-3.5 py-3 align-middle border-b theme-border">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border theme-border">
                              {c.customerName ? c.customerName.trim().charAt(0) : "ع"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[130px]" title={c.customerName}>
                                {c.customerName}
                              </div>
                              {c.customerPhone ? (
                                <a
                                  href={`tel:${c.customerPhone}`}
                                  className="text-[10px] text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono transition inline-flex items-center gap-1 mt-0.5"
                                  dir="ltr"
                                >
                                  <Phone className="w-2.5 h-2.5 opacity-60" />
                                  <span>{c.customerPhone}</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Captain & Vehicle */}
                        <td className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate max-w-[110px]" title={c.captain?.name || "الكابتن"}>
                              {c.captain?.name || "الكابتن"}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 border theme-border">
                            <Car className="w-3 h-3 text-amber-500" />
                            <span>{c.vehiclePlate}</span>
                          </div>
                        </td>

                        {/* Route & Date */}
                        <td className="px-3.5 py-3 align-middle border-b theme-border">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                              <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[90px]" title={c.origin}>{c.origin}</span>
                              <span className="text-slate-400 text-[10px] mx-0.5">←</span>
                              <span className="truncate max-w-[90px]" title={c.destination}>{c.destination}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {c.tripDate}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {c.tripTime}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Inspection Status Check */}
                        <td className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                          {isInspected ? (
                            <button
                              type="button"
                              onClick={() => setSelectedContract(c)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-[11px] font-bold hover:bg-emerald-500/20 transition cursor-pointer"
                              title="فحص تشغيلي مكتمل - اضغط للتفاصيل"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span>مفحوص ومعتمد</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedContract(c)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-[11px] font-bold hover:bg-amber-500/20 transition cursor-pointer"
                              title="تنبيه: بانتظار الفحص التشغيلي قبل الرحلة"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              <span>بانتظار الفحص</span>
                            </button>
                          )}
                        </td>

                        {/* Passenger Count Button */}
                        <td className="px-3 py-3 align-middle text-center whitespace-nowrap border-b theme-border">
                          <button
                            type="button"
                            onClick={() => setSelectedContract(c)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 hover:bg-amber-500/10 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition border theme-border hover:border-amber-500/30"
                            title="عرض كشف الركاب والمرافقين"
                          >
                            <Users className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono">{c.passengers?.length || 0}</span>
                          </button>
                        </td>

                        {/* Action Buttons (STICKY LEFT-0) */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 transition-colors px-3.5 py-3 align-middle text-left whitespace-nowrap shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.5)] border-b theme-border border-r border-slate-200/80 dark:border-slate-800">
                          <ContractActions
                            contractId={c.id}
                            onView={() => setSelectedContract(c)}
                            onPreview={() => openPdf(c)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< lg) */}
            <div className="lg:hidden divide-y theme-border">
              {paginatedContracts.map((c) => {
                const isInspected = Boolean(c.inspectionId || c.inspection);

                return (
                  <div
                    key={c.id}
                    className="p-4 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Top Row: Ref, Flight, Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm block">
                          {c.referenceNumber}
                        </span>
                        {c.flightNumber && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Plane className="w-3 h-3 text-blue-500" />
                            {c.flightCarrier ? `${c.flightCarrier} • ` : ""}
                            {c.flightNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge type="operation" status={c.operationType} size="sm" />
                        {isInspected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-bold">
                            <ClipboardCheck className="w-3 h-3 text-emerald-500" />
                            مفحوص
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            بانتظار الفحص
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content Box */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border space-y-2 text-xs">
                      {/* Customer */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">الطرف الثاني:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {c.customerName}
                        </span>
                      </div>

                      {/* Captain & Vehicle */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">الكابتن والمركبة:</span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <span>{c.captain?.name || "الكابتن"}</span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {c.vehiclePlate}
                          </span>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 space-y-1">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{c.origin}</span>
                          <span className="text-slate-400 text-xs">←</span>
                          <span className="truncate">{c.destination}</span>
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {c.tripDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {c.tripTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {/* Passenger manifest count pill */}
                      <button
                        onClick={() => setSelectedContract(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-mono">{c.passengers?.length || 0} ركاب</span>
                      </button>

                      {/* Action buttons */}
                      <ContractActions
                        contractId={c.id}
                        onView={() => setSelectedContract(c)}
                        onPreview={() => openPdf(c)}
                        isFullWidth
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Section */}
            <div className="px-4 sm:px-6 py-4 border-t theme-border bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items Counter Summary & Page Size */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto justify-between sm:justify-start">
                <span>
                  عرض <strong className="text-slate-900 dark:text-white font-mono">{startIndex + 1}</strong> -{" "}
                  <strong className="text-slate-900 dark:text-white font-mono">{endIndex}</strong> من إجمالي{" "}
                  <strong className="text-amber-600 dark:text-amber-400 font-mono">{filteredContracts.length}</strong> عقد
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">العرض:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white dark:bg-slate-800 border theme-border rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value={10}>10 / صفحة</option>
                    <option value={25}>25 / صفحة</option>
                    <option value={50}>50 / صفحة</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons (RTL: Previous is ChevronRight, Next is ChevronLeft) */}
              <div className="flex items-center gap-1">
                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-2 rounded-xl border theme-card text-slate-600 dark:text-slate-300 hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Numbered Page Buttons */}
                {pageNumbers.map((page, idx) => {
                  if (page === "...") {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 py-1 text-xs text-slate-400 font-mono"
                      >
                        ...
                      </span>
                    );
                  }

                  const isCurrent = page === safeCurrentPage;
                  return (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold font-mono transition ${
                        isCurrent
                          ? "gold-gradient-btn shadow-xs text-white"
                          : "theme-card border theme-border text-slate-700 dark:text-slate-300 hover:border-amber-500"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-2 rounded-xl border theme-card text-slate-600 dark:text-slate-300 hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contract Details & Manifest & Inspection Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="mobile-dialog-panel relative w-full max-w-2xl flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    تفاصيل العقد: {selectedContract.referenceNumber}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    العميل: {selectedContract.customerName} • تاريخ الإصدار: <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{formatOfficialDate(selectedContract.issueDate || selectedContract.createdAt)}</span> • الرحلة: {selectedContract.tripDate} {selectedContract.tripTime}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* Trip & Captain Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">الكابتن المعتمد</span>
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
                  <span className="text-slate-400 text-[11px] block">محطة الانطلاق</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedContract.origin}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">الوجهة المقصودة</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedContract.destination}
                  </span>
                </div>
              </div>

              {/* Inspection Check Information Box */}
              <div className="p-4 rounded-2xl border theme-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    بيانات الفحص والإقرار التشغيلي
                  </h4>
                  {selectedContract.inspectionId || selectedContract.inspection ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      معتمد ومكتمل
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      بانتظار الفحص
                    </span>
                  )}
                </div>

                {selectedContract.inspection ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border theme-border">
                      <div>
                        <span className="text-slate-400 text-[10px] block">تاريخ الفحص</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                          {selectedContract.inspection.inspectionDate
                            ? new Date(selectedContract.inspection.inspectionDate).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">لوحة المركبة المفحوصة</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedContract.inspection.vehiclePlate}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">إقرار الكابتن</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تم الإقرار والتعهد
                        </span>
                      </div>
                    </div>

                    {/* Checklist summary pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${selectedContract.inspection.fireExtinguisher ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}>
                        طفاية الحريق: {selectedContract.inspection.fireExtinguisher ? "جاهزة" : "غير متوفرة"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${selectedContract.inspection.firstAidKit ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}>
                        حقيبة الإسعافات: {selectedContract.inspection.firstAidKit ? "جاهزة" : "غير متوفرة"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${selectedContract.inspection.seatBelts ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}>
                        أحزمة الأمان: {selectedContract.inspection.seatBelts ? "سليمة" : "فحص مطلوب"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${selectedContract.inspection.tires ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}>
                        سلامة الإطارات: {selectedContract.inspection.tires ? "سليمة" : "فحص مطلوب"}
                      </span>
                    </div>
                  </div>
                ) : selectedContract.inspectionId ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    تم ربط فحص تشغيلي وإقرار معتمد لهذا العقد برقم معرّف: <code className="font-mono font-bold">{selectedContract.inspectionId.slice(0, 12)}...</code>
                  </p>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      تنبيه تشغيلي إلزامي:
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      لم يتم إرفاق الفحص اليومي والإقرار التشغيلي المسبق للمركبة قبل انطلاق هذه الرحلة. يُرجى توجيه الكابتن لإتمام الفحص التشغيلي اليومي عبر بوابته.
                    </p>
                  </div>
                )}
              </div>

              {/* Passengers Manifest Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    كشف الركاب والمرافقين المعتمد ({selectedContract.passengers?.length || 0} راكباً)
                  </h4>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    الصفحة 2 من وثيقة العقد
                  </span>
                </div>

                {!selectedContract.passengers?.length ? (
                  <p className="text-xs text-slate-400 p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border theme-border">
                    لا يوجد ركاب مرافقين مضافين لهذا العقد (تم قيد الضيف الرئيسي فقط)
                  </p>
                ) : (
                  <div className="rounded-xl border theme-border overflow-hidden">
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b theme-border text-slate-500 font-bold">
                          <tr>
                            <th className="px-3 py-2 text-center w-10">#</th>
                            <th className="px-3 py-2">اسم الضيف / الراكب</th>
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

                    {/* Mobile Cards for Modal */}
                    <div className="sm:hidden divide-y theme-border p-3 space-y-2">
                      {selectedContract.passengers.map((p, idx) => (
                        <div key={p.id || idx} className="pt-2 first:pt-0 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-500 font-bold">
                                {p.sequence || idx + 1}
                              </span>
                              <span>{p.name}</span>
                            </span>
                            {p.nationality && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {p.nationality}
                              </span>
                            )}
                          </div>
                          {p.idNumber && (
                            <div className="text-[11px] text-slate-400 font-mono pr-6" dir="ltr">
                              ID: {p.idNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedContract.notes && (
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">
                    ملاحظات الرحلة والتشغيل:
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
                <Link
                  href={`/admin/contracts/${selectedContract.id}`}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl gold-gradient-btn text-white transition shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>صفحة المراجعة والاعتماد</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedContract;
                    setSelectedContract(null);
                    setContractToDelete(c);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border theme-card hover:border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
                  title="حذف العقد نهائياً"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف العقد</span>
                </button>
                <button
                  onClick={() => openPdf(selectedContract)}
                  className="flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  استعراض الـ PDF
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
          onClose={() => {
            setPreviewPdfId(null);
            setPreviewPdfUrl(null);
          }}
          contractId={previewPdfId}
          referenceNumber={previewPdfRef}
          pdfUrl={previewPdfUrl}
        />
      )}

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={!!contractToDelete}
        title="تأكيد حذف العقد"
        message={
          contractToDelete
            ? `هل أنت متأكد من رغبتك في حذف العقد رقم (${contractToDelete.referenceNumber}) نهائياً؟ سيتم حذف بيانات الركاب وملف الـ PDF المرتبط به ولا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel={isDeleting ? "جاري الحذف..." : "نعم، احذف العقد"}
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setContractToDelete(null);
        }}
      />
    </div>
  );
}
