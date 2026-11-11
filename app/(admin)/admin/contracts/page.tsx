"use client";
import { createHelpGuide } from "./help-guide";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";

import dynamic from "next/dynamic";
import LoadError from "@/app/_components/LoadError";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Users,
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
  ArrowLeftRight,
} from "lucide-react";
import { getContracts, deleteContract } from "@/app/_actions/contract";
import { getCaptains } from "@/app/_actions/captain";
import { Contract, OperationType, SystemUser } from "@/lib/types";
import ContractActions from "./contract-actions";
import ContractMobileCard from "./contract-mobile-card";
import Modal from "@/app/_components/Modal";
import StatusBadge from "@/app/_components/StatusBadge";
const PdfPreviewModal = dynamic(
  () => import("@/app/_components/PdfPreviewModal"),
  { ssr: false },
);
import ConfirmDialog from "@/app/_components/ConfirmDialog";
import ReverseTripModal from "@/app/_components/ReverseTripModal";
import {
  PageHeader,
  StatCard,
  StatRow,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/app/_components/ui";
import { formatOfficialDate } from "@/lib/contractConstants";
import {
  fetchCached,
  getCachedData,
  invalidateClientCache,
} from "@/lib/clientCache";
import { useLanguage } from "@/lib/languageContext";

export default function AdminContractsPage() {
  const ui = useUiText();

  const { t, isRTL } = useLanguage();
  const cachedContracts =
    getCachedData<Awaited<ReturnType<typeof getContracts>>>(
      "contracts_ALL_ALL_",
    );
  const cachedCaptains =
    getCachedData<Awaited<ReturnType<typeof getCaptains>>>("captains_list");

  // Data states
  const [contracts, setContracts] = useState<Contract[]>(() => {
    if (Array.isArray(cachedContracts)) return cachedContracts;
    if (
      cachedContracts &&
      typeof cachedContracts === "object" &&
      Array.isArray(cachedContracts.contracts)
    ) {
      return cachedContracts.contracts;
    }
    return [];
  });
  const [captains, setCaptains] = useState<
    (SystemUser & { contractCount?: number; hasTodayInspection?: boolean })[]
  >(() => {
    if (Array.isArray(cachedCaptains)) return cachedCaptains;
    if (
      cachedCaptains &&
      typeof cachedCaptains === "object" &&
      Array.isArray(cachedCaptains.captains)
    ) {
      return cachedCaptains.captains;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => !cachedContracts);
  const [isLoadingCaptains, setIsLoadingCaptains] = useState(
    () => !cachedCaptains,
  );

  const [loadError, setLoadError] = useState("");

  // Filters
  const [submittedSearch, setSubmittedSearch] = useUrlState<string>("q", "");
  const [searchDraft, setSearch] = useState<string | null>(null);
  const search = searchDraft ?? submittedSearch;
  const [typeFilter, setTypeFilter] = useUrlState<string>("type", "ALL", [
    "ALL",
    "AIRPORT_TRANSFER",
    "CITY_TOUR",
    "INTERCITY",
    "HAJJ_UMRAH",
  ]);
  const [captainFilter, setCaptainFilter] = useUrlState<string>(
    "captain",
    "ALL",
  );
  const [inspectionFilter, setInspectionFilter] = useUrlState<
    "ALL" | "INSPECTED" | "PENDING"
  >("inspection", "ALL", ["ALL", "INSPECTED", "PENDING"]);

  // Pagination states
  const [currentPage, setCurrentPage] = useUrlState<number>("page", 1);
  const [pageSize, setPageSize] = useUrlState<number>(
    "size",
    10,
    [10, 25, 50, 100],
  );

  // Modal states
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );
  const [contractModalFocus, setContractModalFocus] = useState<
    "inspection" | "passengers" | null
  >(null);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);
  const [previewPdfRef, setPreviewPdfRef] = useState<string>("");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Action feedback
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Quick copy reference state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reverse trip state
  const [reverseContract, setReverseContract] = useState<Contract | null>(null);

  // Deletion states
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedContract || !contractModalFocus) return;
    const frameId = requestAnimationFrame(() => {
      const targetId =
        contractModalFocus === "inspection"
          ? "contract-modal-inspection"
          : "contract-modal-passengers";
      document
        .getElementById(targetId)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(frameId);
  }, [selectedContract, contractModalFocus]);

  const openContractDetails = (
    contract: Contract,
    focus?: "inspection" | "passengers",
  ) => {
    setContractModalFocus(focus ?? null);
    setSelectedContract(contract);
  };

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteContract(contractToDelete.id);
      if (res.success) {
        invalidateClientCache("contracts_");
        invalidateClientCache("dashboard_stats");
        setContracts((prev) =>
          prev.filter((c) => c.id !== contractToDelete.id),
        );
        if (selectedContract?.id === contractToDelete.id) {
          setSelectedContract(null);
          setContractModalFocus(null);
        }
        setSyncStatus(
          isRTL
            ? `تم حذف العقد ${contractToDelete.referenceNumber} بنجاح`
            : `Contract ${contractToDelete.referenceNumber} deleted successfully`,
        );
        setContractToDelete(null);
      } else {
        throw new Error(res.error || "فشل حذف العقد");
      }
    } catch (err) {
      console.error("Delete contract error:", err);
      throw err instanceof Error
        ? err
        : new Error("حدث خطأ أثناء محاولة حذف العقد");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(ref).catch(() => {});
    setCopiedRef(ref);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
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
    forceRefresh = false,
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
            operationType:
              activeType !== "ALL" ? (activeType as OperationType) : undefined,
            captainId: activeCaptain !== "ALL" ? activeCaptain : undefined,
            search: activeQuery || undefined,
          }),
        { ttlMs: 45_000, forceRefresh },
      );
      if (res.success && res.contracts) {
        setContracts(res.contracts);
        setLoadError("");
      } else {
        setLoadError(res.error || "تعذر تحميل العقود");
      }
    } catch (e) {
      setLoadError("تعذر تحميل العقود، يرجى إعادة المحاولة");
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
        const res = await fetchCached("captains_list", getCaptains, {
          ttlMs: 120_000,
        });
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
              operationType:
                typeFilter !== "ALL"
                  ? (typeFilter as OperationType)
                  : undefined,
              captainId: captainFilter !== "ALL" ? captainFilter : undefined,
              search: submittedSearch.trim() || undefined,
            }),
          { ttlMs: 45_000 },
        );
        if (!isCancelled && res.success && res.contracts) {
          setContracts(res.contracts);
          setLoadError("");
        } else if (!isCancelled) {
          setLoadError(res.error || "تعذر تحميل العقود");
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
    const inspected = contracts.filter((c) =>
      Boolean(c.inspectionId || c.inspection),
    ).length;
    const pending = total - inspected;
    const totalPassengers = contracts.reduce(
      (acc, c) => acc + (c.passengers?.length || 0),
      0,
    );
    return { total, inspected, pending, totalPassengers };
  }, [contracts]);

  // Pagination calculation
  const totalPages = Math.max(
    1,
    Math.ceil(filteredContracts.length / pageSize),
  );
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
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          safeCurrentPage - 1,
          safeCurrentPage,
          safeCurrentPage + 1,
          "...",
          totalPages,
        );
      }
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "ALL" ||
    captainFilter !== "ALL" ||
    inspectionFilter !== "ALL";

  const contractsHelpGuide = useMemo(() => createHelpGuide(isRTL), [isRTL]);

  return (
    <div className="space-y-6 pb-12">
      <LoadError
        message={loadError}
        onRetry={() => {
          void fetchContractsData(undefined, true);
        }}
        isLoading={isLoading}
      />
      {/* Sync Status Alert Banner */}
      {syncStatus && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-[var(--text-main)] text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardCheck
              className="w-5 h-5 text-[var(--accent-gold)] shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">{ui(syncStatus)}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            aria-label={ui("إغلاق")}
            className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg hover:bg-amber-500/15 text-[var(--accent-gold)] transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Header Section with On-Demand Slide-Over Guide */}
      <PageHeader
        title={ui(t("contracts.title"))}
        subtitle={ui(t("contracts.subtitle"))}
        badge={
          isRTL
            ? "عقود النقل البري المعتمدة"
            : "Licensed Land Transport Contracts"
        }
        icon={FileText}
        onRefresh={() => void fetchContractsData(undefined, true)}
        isRefreshing={isLoading}
        helpGuide={contractsHelpGuide}
        onSeeded={(msg) => {
          invalidateClientCache("contracts_");
          invalidateClientCache("captains_list");
          setSyncStatus(msg);
          void fetchContractsData(undefined, true);
        }}
        onSeedError={(err) => setSyncStatus(err)}
        primaryAction={{
          label: `+ ${t("contracts.newContract")}`,
          href: "/admin/contracts/new",
          icon: FileText,
          variant: "primary",
        }}
      />

      {/* KPI Stats Ribbon */}
      <StatRow columns={4}>
        <StatCard
          label={ui(isRTL ? "إجمالي العقود" : "Total Contracts")}
          value={stats.total}
          unit={isRTL ? "عقد" : "contracts"}
          icon={FileText}
          isActive={inspectionFilter === "ALL"}
          onClick={() => setInspectionFilter("ALL")}
          isLoading={isLoading}
        />
        <StatCard
          label={ui(isRTL ? "فحص تشغيلي معتمد" : "Approved Inspections")}
          value={stats.inspected}
          unit={isRTL ? "مكتمل" : "passed"}
          icon={ClipboardCheck}
          variant="emerald"
          isActive={inspectionFilter === "INSPECTED"}
          onClick={() => setInspectionFilter("INSPECTED")}
          isLoading={isLoading}
        />
        <StatCard
          label={ui(isRTL ? "بانتظار الفحص" : "Pending Inspection")}
          value={stats.pending}
          unit={isRTL ? "معلق" : "pending"}
          icon={AlertCircle}
          variant="amber"
          isActive={inspectionFilter === "PENDING"}
          onClick={() => setInspectionFilter("PENDING")}
          isLoading={isLoading}
        />
        <StatCard
          label={ui(isRTL ? "إجمالي الركاب والضيوف" : "Total Passengers")}
          value={stats.totalPassengers}
          unit={isRTL ? "راكب" : "guests"}
          icon={Users}
          variant="blue"
          isLoading={isLoading}
        />
      </StatRow>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="md:col-span-6 lg:col-span-5 theme-card px-3.5 py-2.5 rounded-2xl border theme-border flex items-center gap-2.5 focus-within:border-[var(--accent-gold)] transition shadow-xs"
          >
            <Search
              className="w-4 h-4 text-[var(--text-muted)] shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ui(
                "ابحث برقم العقد، اسم العميل، اللوحة، أو رقم الرحلة...",
              )}
              aria-label={ui(
                "ابحث برقم العقد، اسم العميل، اللوحة، أو رقم الرحلة...",
              )}
              className="w-full min-h-9 bg-transparent border-none text-base sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                aria-label={ui("إغلاق")}
                onClick={() => {
                  setSearch("");
                  setSubmittedSearch("");
                  setCurrentPage(1);
                }}
                className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="min-h-11 sm:min-h-8 px-3 py-1.5 rounded-xl bg-[var(--accent-btn-bg)] hover:bg-[var(--accent-btn-hover)] text-[var(--accent-btn-fg)] border border-[var(--accent-btn-border)] text-xs font-bold transition shrink-0 cursor-pointer"
            >
              {ui("بحث")}
            </button>
          </form>

          {/* Captain Selector Filter */}
          <div className="md:col-span-6 lg:col-span-4 theme-card px-3 py-2 rounded-2xl border theme-border flex items-center gap-2.5 focus-within:border-[var(--accent-gold)] transition shadow-xs">
            <User
              className="w-4 h-4 text-[var(--accent-gold)] shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <label
                htmlFor="captainFilterSelect"
                className="block text-xs text-[var(--text-muted)] font-medium leading-none mb-1"
              >
                {ui("تصفية حسب الكابتن:")}
              </label>
              {isLoadingCaptains ? (
                <div className="h-5 w-32 bg-[var(--bg-card-subtle)] rounded-md animate-pulse my-0.5" />
              ) : (
                <select
                  id="captainFilterSelect"
                  value={captainFilter}
                  onChange={(e) => handleCaptainFilterSelect(e.target.value)}
                  className="w-full min-h-8 bg-transparent border-none text-base sm:text-sm font-bold text-[var(--text-main)] focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL" className="bg-[var(--bg-card)] text-[var(--text-main)]">
                    {ui("جميع الكباتن (")}
                    {Array.isArray(captains) ? captains.length : 0})
                  </option>
                  {(Array.isArray(captains) ? captains : []).map((cap) => (
                    <option
                      key={cap.id}
                      value={cap.id}
                      className="bg-[var(--bg-card)] text-[var(--text-main)]"
                    >
                      {cap.name}
                      {cap.assignedVehiclePlate
                        ? ` (${cap.assignedVehiclePlate})`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {captainFilter !== "ALL" && !isLoadingCaptains && (
              <button
                type="button"
                aria-label={ui("إلغاء تصفية الكابتن")}
                onClick={() => handleCaptainFilterSelect("ALL")}
                className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0 cursor-pointer"
                title={ui("إلغاء تصفية الكابتن")}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Inspection Filter Dropdown */}
          <div className="md:col-span-6 lg:col-span-3 theme-card px-3 py-2 rounded-2xl border theme-border flex items-center gap-2.5 focus-within:border-[var(--accent-gold)] transition shadow-xs">
            <ClipboardCheck
              className="w-4 h-4 text-[var(--accent-gold)] shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <label
                htmlFor="inspectionFilterSelect"
                className="block text-xs text-[var(--text-muted)] font-medium leading-none mb-1"
              >
                {ui("الفحص التشغيلي:")}
              </label>
              <select
                id="inspectionFilterSelect"
                value={inspectionFilter}
                onChange={(e) => {
                  setInspectionFilter(
                    e.target.value as "ALL" | "INSPECTED" | "PENDING",
                  );
                  setCurrentPage(1);
                }}
                className="w-full min-h-8 bg-transparent border-none text-base sm:text-sm font-bold text-[var(--text-main)] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL" className="bg-[var(--bg-card)] text-[var(--text-main)]">
                  {ui("كافة الحالات")}
                </option>
                <option
                  value="INSPECTED"
                  className="bg-[var(--bg-card)] text-[var(--text-main)]"
                >
                  {ui("مفحوص ومعتمد فقط (")}
                  {stats.inspected})
                </option>
                <option value="PENDING" className="bg-[var(--bg-card)] text-[var(--text-main)]">
                  {ui("بانتظار الفحص فقط (")}
                  {stats.pending})
                </option>
              </select>
            </div>
            {inspectionFilter !== "ALL" && (
              <button
                type="button"
                aria-label={ui("إلغاء التصفية")}
                onClick={() => {
                  setInspectionFilter("ALL");
                  setCurrentPage(1);
                }}
                className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0 cursor-pointer"
                title={ui("إلغاء التصفية")}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
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
                type="button"
                key={op.id}
                onClick={() => handleTypeFilterSelect(op.id)}
                className={`min-h-10 sm:min-h-8 px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 cursor-pointer ${
                  typeFilter === op.id
                    ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border-[var(--accent-btn-border)] shadow-xs"
                    : "theme-card text-[var(--text-muted)] border theme-border hover:border-[var(--accent-gold)] hover:text-[var(--text-main)]"
                }`}
              >
                {ui(op.label)}
              </button>
            ))}
          </div>

          {/* Reset Filters button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex min-h-10 sm:min-h-8 items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 hover:underline font-bold self-start sm:self-auto shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              {ui("إعادة ضبط جميع عوامل التصفية")}
            </button>
          )}
        </div>
      </div>

      {/* Main Table & Mobile Cards Container */}
      <section
        aria-labelledby="contracts-list-heading"
        className="space-y-3 lg:space-y-0 lg:theme-card lg:rounded-3xl lg:overflow-hidden lg:border lg:theme-border lg:shadow-xs"
      >
        <div className="flex items-center justify-between px-1 lg:sr-only">
          <h2
            id="contracts-list-heading"
            className="text-xs font-semibold text-[var(--text-muted)]"
          >
            {ui("قائمة العقود")}
          </h2>
          {!isLoading && (
            <span className="text-xs font-mono font-semibold text-[var(--accent-gold)]">
              {filteredContracts.length} {ui("عقد")}
            </span>
          )}
        </div>
        {/* Loading State Skeleton */}
        {isLoading ? (
          <>
            {/* Desktop Table Skeleton */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader className="bg-[var(--table-header-bg)] border-b theme-border text-[var(--text-muted)] font-bold">
                  <TableRow>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("رقم العقد والعملية")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("العميل / الطرف الثاني")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("الكابتن واللوحة")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("مسار الرحلة والموعد")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("الفحص التشغيلي")}
                    </TableHead>
                    <TableHead className="px-3 py-3.5 text-center whitespace-nowrap">
                      {ui("الركاب")}
                    </TableHead>
                    <TableHead className="sticky end-0 z-20 px-3.5 py-3.5 text-end whitespace-nowrap bg-[var(--table-header-bg)] border-s theme-border">
                      {ui("الإجراءات")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[var(--text-main)]">
                  {[...Array(6)].map((_, i) => (
                    <TableRow key={`tbl-skel-${i}`} className="animate-pulse">
                      {/* Ref & Operation */}
                      <TableCell className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 bg-[var(--bg-card-subtle)] rounded-md" />
                          <div className="h-4 w-20 bg-[var(--bg-card-subtle)] rounded-full" />
                        </div>
                      </TableCell>
                      {/* Customer */}
                      <TableCell className="px-3.5 py-3 align-middle border-b theme-border">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-[var(--bg-card-subtle)] shrink-0" />
                          <div className="space-y-1.5 min-w-0">
                            <div className="h-3.5 w-24 bg-[var(--bg-card-subtle)] rounded-md" />
                            <div className="h-2.5 w-16 bg-[var(--bg-card-subtle)] rounded-sm" />
                          </div>
                        </div>
                      </TableCell>
                      {/* Captain & Vehicle */}
                      <TableCell className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-20 bg-[var(--bg-card-subtle)] rounded-md" />
                          <div className="h-4 w-16 bg-[var(--bg-card-subtle)] rounded-md" />
                        </div>
                      </TableCell>
                      {/* Route & Date */}
                      <TableCell className="px-3.5 py-3 align-middle border-b theme-border">
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-32 bg-[var(--bg-card-subtle)] rounded-md" />
                          <div className="h-2.5 w-20 bg-[var(--bg-card-subtle)] rounded-sm" />
                        </div>
                      </TableCell>
                      {/* Inspection */}
                      <TableCell className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                        <div className="h-6 w-24 bg-[var(--bg-card-subtle)] rounded-xl" />
                      </TableCell>
                      {/* Passengers */}
                      <TableCell className="px-3 py-3 align-middle text-center whitespace-nowrap border-b theme-border">
                        <div className="inline-block h-6 w-10 bg-[var(--bg-card-subtle)] rounded-xl" />
                      </TableCell>
                      {/* Actions (Sticky end) */}
                      <TableCell className="sticky end-0 z-10 bg-[var(--bg-card)] px-3.5 py-3 align-middle text-end whitespace-nowrap border-b theme-border border-s theme-border">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-16 h-9 bg-[var(--bg-card-subtle)] rounded-lg" />
                          <div className="w-14 h-9 bg-[var(--bg-card-subtle)] rounded-lg" />
                          <div className="w-9 h-9 bg-[var(--bg-card-subtle)] rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards Skeleton */}
            <div className="lg:hidden space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={`mob-skel-${i}`}
                  className="theme-card rounded-2xl border theme-border p-4 space-y-3.5 animate-pulse"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 bg-[var(--bg-card-subtle)] rounded-md" />
                      <div className="h-3 w-36 bg-[var(--bg-card-subtle)] rounded-sm" />
                    </div>
                    <div className="h-5 w-16 bg-[var(--bg-card-subtle)] rounded-full" />
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border space-y-2.5">
                    <div className="h-3.5 w-48 bg-[var(--bg-card)] rounded-md" />
                    <div className="pt-2 border-t theme-border flex items-center justify-between">
                      <div className="h-3 w-20 bg-[var(--bg-card)] rounded-sm" />
                      <div className="h-3 w-28 bg-[var(--bg-card)] rounded-md" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-11 rounded-xl bg-[var(--bg-card-subtle)]" />
                    <div className="h-11 rounded-xl bg-[var(--bg-card-subtle)]" />
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t theme-border">
                    <div className="flex-1 h-11 bg-[var(--bg-card-subtle)] rounded-lg" />
                    <div className="flex-1 h-11 bg-[var(--bg-card-subtle)] rounded-lg" />
                    <div className="w-11 h-11 bg-[var(--bg-card-subtle)] rounded-lg" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="theme-card rounded-2xl border theme-border lg:rounded-none lg:border-0 lg:border-t lg:bg-[var(--bg-card-subtle)] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="h-4 w-44 bg-[var(--bg-card)] rounded-md" />
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 bg-[var(--bg-card)] rounded-xl" />
                <div className="w-8 h-8 bg-[var(--bg-card)] rounded-xl" />
                <div className="w-8 h-8 bg-[var(--bg-card)] rounded-xl" />
                <div className="w-8 h-8 bg-[var(--bg-card)] rounded-xl" />
              </div>
            </div>
          </>
        ) : filteredContracts.length === 0 ? (
          /* Empty State */
          <div className="theme-card rounded-2xl border theme-border lg:border-0 lg:rounded-none p-10 sm:p-16 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-main)]">
              {ui("لا توجد عقود مسجلة")}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {ui(
                hasActiveFilters
                  ? "لا توجد نتائج تطابق معايير البحث والتصفية المحددة. جرب تغيير المدخلات أو إعادة ضبط التصفية."
                  : "لم يتم إنشاء أي عقود بعد. ابدأ بإنشاء عقد جديد وتوثيقه في النظام.",
              )}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-11 sm:min-h-9 px-4 py-2 text-xs font-bold rounded-xl border border-[var(--control-border)] theme-card hover:border-[var(--accent-gold)] text-[var(--accent-gold)] transition cursor-pointer"
              >
                {ui("إلغاء عوامل التصفية")}
              </button>
            ) : (
              <Link
                href="/admin/contracts/new"
                className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-xs"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                {ui("+ إنشاء أول عقد")}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (lg and up) (shadcn Table) */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader className="bg-[var(--table-header-bg)] border-b theme-border text-[var(--text-muted)] font-bold">
                  <TableRow>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("رقم العقد والعملية")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("العميل / الطرف الثاني")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("الكابتن واللوحة")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("مسار الرحلة والموعد")}
                    </TableHead>
                    <TableHead className="px-3.5 py-3.5 whitespace-nowrap">
                      {ui("الفحص التشغيلي")}
                    </TableHead>
                    <TableHead className="px-3 py-3.5 text-center whitespace-nowrap">
                      {ui("الركاب")}
                    </TableHead>
                    <TableHead className="sticky end-0 z-20 px-3.5 py-3.5 text-end whitespace-nowrap bg-[var(--table-header-bg)] border-s theme-border">
                      {ui("الإجراءات")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[var(--text-main)]">
                  {paginatedContracts.map((c) => {
                    const isInspected = Boolean(c.inspectionId || c.inspection);

                    return (
                      <TableRow
                        key={c.id}
                        className="group hover:bg-[var(--table-row-hover)] transition-colors duration-150"
                      >
                        {/* Reference & Operation Type */}
                        <TableCell className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/contracts/${c.id}`}
                              className="font-mono font-semibold text-[var(--accent-gold)] text-sm tracking-tight hover:underline"
                            >
                              {c.referenceNumber}
                            </Link>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopyRef(c.referenceNumber, e)
                              }
                              aria-label={`${ui("نسخ رقم العقد")} ${c.referenceNumber}`}
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--accent-surface)] transition cursor-pointer"
                              title={ui("نسخ رقم العقد")}
                            >
                              {copiedRef === c.referenceNumber ? (
                                <Check
                                  className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Copy
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <StatusBadge
                              type="operation"
                              status={c.operationType}
                              size="sm"
                            />
                            {c.status && (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold border ${
                                  c.status === "APPROVED" ||
                                  c.status === "ACTIVE"
                                    ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35"
                                    : c.status === "REJECTED" ||
                                        c.status === "CANCELLED"
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                                      : c.status === "EXPIRED"
                                        ? "bg-[var(--bg-card-subtle)] text-[var(--text-muted)] theme-border"
                                        : "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/30"
                                }`}
                              >
                                {ui(
                                  c.status === "APPROVED"
                                    ? "معتمد"
                                    : c.status === "ACTIVE"
                                      ? "نشط"
                                      : c.status === "REJECTED"
                                        ? "مرفوض"
                                        : c.status === "CANCELLED"
                                          ? "ملغي"
                                          : c.status === "EXPIRED"
                                            ? "منتهي"
                                            : "قيد المراجعة",
                                )}
                              </span>
                            )}
                            {c.flightNumber && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 font-mono text-xs font-bold">
                                <Plane
                                  className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400"
                                  aria-hidden="true"
                                />
                                <bdi>
                                  {c.flightCarrier ? `${c.flightCarrier} ` : ""}
                                  {c.flightNumber}
                                </bdi>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="px-3.5 py-3 align-middle border-b theme-border">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-xl bg-[var(--bg-card-subtle)] text-[var(--text-main)] font-bold text-xs flex items-center justify-center shrink-0 border theme-border"
                              aria-hidden="true"
                            >
                              {c.customerName
                                ? c.customerName.trim().charAt(0)
                                : "ع"}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="font-bold text-[var(--text-main)] text-xs truncate max-w-[140px]"
                                title={c.customerName}
                              >
                                {c.customerName}
                              </div>
                              {c.customerPhone ? (
                                <a
                                  href={`tel:${c.customerPhone}`}
                                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-gold)] font-mono transition inline-flex items-center gap-1 mt-0.5"
                                  dir="ltr"
                                >
                                  <Phone
                                    className="w-2.5 h-2.5 opacity-75"
                                    aria-hidden="true"
                                  />
                                  <span>{c.customerPhone}</span>
                                </a>
                              ) : (
                                <span className="text-xs text-[var(--text-muted)]">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Captain & Vehicle */}
                        <TableCell className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                          <div className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)] shrink-0"
                              aria-hidden="true"
                            />
                            <span
                              className="truncate max-w-[130px]"
                              title={c.captain?.name || ui("الكابتن")}
                            >
                              {c.captain?.name || ui("الكابتن")}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-card-subtle)] font-mono text-xs font-bold text-[var(--text-main)] border theme-border">
                            <Car
                              className="w-3 h-3 text-[var(--accent-gold)]"
                              aria-hidden="true"
                            />
                            <bdi>{c.vehiclePlate}</bdi>
                          </div>
                        </TableCell>

                        {/* Route & Date */}
                        <TableCell className="px-3.5 py-3 align-middle border-b theme-border">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[var(--text-main)] font-semibold text-xs">
                              <MapPin
                                className="w-3 h-3 text-[var(--accent-gold)] shrink-0"
                                aria-hidden="true"
                              />
                              <span
                                className="truncate max-w-[140px]"
                                title={c.origin}
                              >
                                {c.origin}
                              </span>
                              <span
                                className="text-[var(--text-muted)] text-xs mx-0.5"
                                aria-hidden="true"
                              >
                                {isRTL ? "←" : "→"}
                              </span>
                              <span
                                className="truncate max-w-[140px]"
                                title={c.destination}
                              >
                                {c.destination}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <Calendar
                                  className="w-2.5 h-2.5"
                                  aria-hidden="true"
                                />
                                <bdi dir="ltr">{c.tripDate}</bdi>
                              </span>
                              <span aria-hidden="true">•</span>
                              <span className="flex items-center gap-1">
                                <Clock
                                  className="w-2.5 h-2.5"
                                  aria-hidden="true"
                                />
                                <bdi dir="ltr">{c.tripTime}</bdi>
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Inspection Status Check */}
                        <TableCell className="px-3.5 py-3 align-middle whitespace-nowrap border-b theme-border">
                          {isInspected ? (
                            <button
                              type="button"
                              onClick={() =>
                                openContractDetails(c, "inspection")
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/12 text-emerald-800 border border-emerald-600/35 text-xs font-bold hover:bg-emerald-500/20 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35 dark:hover:bg-emerald-950/70 transition cursor-pointer"
                              title={ui("فحص تشغيلي مكتمل - اضغط للتفاصيل")}
                            >
                              <ClipboardCheck
                                className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300"
                                aria-hidden="true"
                              />
                              <span>{ui("مفحوص ومعتمد")}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openContractDetails(c, "inspection")
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/35 text-xs font-bold hover:bg-amber-500/15 transition cursor-pointer"
                              title={ui(
                                "تنبيه: بانتظار الفحص التشغيلي قبل الرحلة",
                              )}
                            >
                              <AlertCircle
                                className="w-3.5 h-3.5 text-[var(--accent-gold)]"
                                aria-hidden="true"
                              />
                              <span>{ui("بانتظار الفحص")}</span>
                            </button>
                          )}
                        </TableCell>

                        {/* Passenger Count Button */}
                        <TableCell className="px-3 py-3 align-middle text-center whitespace-nowrap border-b theme-border">
                          <button
                            type="button"
                            onClick={() => openContractDetails(c, "passengers")}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[var(--bg-card-subtle)] hover:bg-[var(--accent-surface)] text-[var(--text-main)] font-bold text-xs transition border theme-border hover:border-[var(--accent-gold)] cursor-pointer"
                            title={ui("عرض كشف الركاب والمرافقين")}
                          >
                            <Users
                              className="w-3.5 h-3.5 text-[var(--accent-gold)]"
                              aria-hidden="true"
                            />
                            <span className="font-mono">
                              {c.passengers?.length || 0}
                            </span>
                          </button>
                        </TableCell>

                        {/* Action Buttons (Sticky end) */}
                        <TableCell className="sticky end-0 z-10 bg-[var(--bg-card)] group-hover:bg-[var(--bg-card-subtle)] transition-colors px-3.5 py-3 align-middle text-end whitespace-nowrap border-b theme-border border-s theme-border">
                          <ContractActions
                            contractId={c.id}
                            onPreview={() => openPdf(c)}
                            onReverse={() => setReverseContract(c)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View (< lg) */}
            <div className="lg:hidden space-y-3">
              {paginatedContracts.map((c) => (
                <ContractMobileCard
                  key={c.id}
                  contract={c}
                  isRTL={isRTL}
                  isCopied={copiedRef === c.referenceNumber}
                  onCopyRef={handleCopyRef}
                  onPreviewPdf={openPdf}
                  onReverseTrip={setReverseContract}
                  onInspectOrManifest={openContractDetails}
                />
              ))}
            </div>

            {/* Pagination Controls Section */}
            <div className="theme-card rounded-2xl border theme-border mt-3 lg:mt-0 lg:rounded-none lg:border-0 lg:border-t lg:bg-[var(--bg-card-subtle)] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items Counter Summary & Page Size */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] w-full sm:w-auto justify-between sm:justify-start">
                <span>
                  {ui("عرض")}{" "}
                  <strong className="text-[var(--text-main)] font-mono">
                    {startIndex + 1}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-[var(--text-main)] font-mono">
                    {endIndex}
                  </strong>{" "}
                  {ui("من إجمالي")}{" "}
                  <strong className="text-[var(--accent-gold)] font-mono">
                    {filteredContracts.length}
                  </strong>{" "}
                  {ui("عقد")}
                </span>

                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="contracts-page-size"
                    className="text-xs text-[var(--text-muted)]"
                  >
                    {ui("العرض:")}
                  </label>
                  <select
                    id="contracts-page-size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="theme-input min-h-11 sm:min-h-8 rounded-lg px-2 py-1 text-base sm:text-xs font-bold focus:outline-hidden"
                  >
                    <option value={10}>{ui("10 / صفحة")}</option>
                    <option value={25}>{ui("25 / صفحة")}</option>
                    <option value={50}>{ui("50 / صفحة")}</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons (Direction-aware Previous / Next) */}
              <div className="flex items-center gap-1.5 sm:gap-1 flex-wrap justify-center">
                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={safeCurrentPage <= 1}
                  className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 p-2 inline-flex items-center justify-center rounded-xl border border-[var(--control-border)] theme-card text-[var(--text-main)] hover:border-[var(--accent-gold)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title={ui("الصفحة السابقة")}
                  aria-label={ui("الصفحة السابقة")}
                >
                  {isRTL ? (
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>

                {/* Numbered Page Buttons */}
                {pageNumbers.map((page, idx) => {
                  if (page === "...") {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 py-1 text-xs text-[var(--text-muted)] font-mono"
                      >
                        ...
                      </span>
                    );
                  }

                  const isCurrent = page === safeCurrentPage;
                  return (
                    <button
                      type="button"
                      key={`page-${page}`}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setCurrentPage(page as number)}
                      className={`min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                        isCurrent
                          ? "gold-gradient-btn shadow-xs"
                          : "theme-card border border-[var(--control-border)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={safeCurrentPage >= totalPages}
                  className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 p-2 inline-flex items-center justify-center rounded-xl border border-[var(--control-border)] theme-card text-[var(--text-main)] hover:border-[var(--accent-gold)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title={ui("الصفحة التالية")}
                  aria-label={ui("الصفحة التالية")}
                >
                  {isRTL ? (
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Contract Details & Manifest & Inspection Modal */}
      {selectedContract && (
        <Modal
          label={ui("تفاصيل العقد")}
          onClose={() => {
            setSelectedContract(null);
            setContractModalFocus(null);
          }}
        >
          <div className="mobile-dialog-panel relative w-full max-w-2xl flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)] truncate">
                    {ui("تفاصيل العقد:")}{" "}
                    <bdi>{selectedContract.referenceNumber}</bdi>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] break-words">
                    {ui("العميل:")} <bdi>{selectedContract.customerName}</bdi>{" "}
                    {ui("• تاريخ الإصدار:")}{" "}
                    <span
                      className="font-mono text-[var(--accent-gold)] font-bold"
                      dir="ltr"
                    >
                      {formatOfficialDate(
                        selectedContract.issueDate ||
                          selectedContract.createdAt,
                      )}
                    </span>{" "}
                    {ui("• الرحلة:")}{" "}
                    <bdi dir="ltr">
                      {selectedContract.tripDate} {selectedContract.tripTime}
                    </bdi>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedContract(null);
                  setContractModalFocus(null);
                }}
                aria-label={ui("إغلاق")}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* Trip & Captain Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border text-xs">
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">
                    {ui("الكابتن المعتمد")}
                  </span>
                  <span className="font-bold text-[var(--text-main)]">
                    {selectedContract.captain?.name || ui("كابتن ميقات")}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">
                    {ui("رقم اللوحة")}
                  </span>
                  <span className="font-mono font-bold text-[var(--text-main)]">
                    <bdi>{selectedContract.vehiclePlate}</bdi>
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">
                    {ui("محطة الانطلاق")}
                  </span>
                  <span className="font-semibold text-[var(--text-main)]">
                    {selectedContract.origin}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs block">
                    {ui("الوجهة المقصودة")}
                  </span>
                  <span className="font-semibold text-[var(--text-main)]">
                    {selectedContract.destination}
                  </span>
                </div>
              </div>

              {/* Inspection Check Information Box */}
              <div
                id="contract-modal-inspection"
                className={`p-4 rounded-2xl border space-y-3 transition ${
                  contractModalFocus === "inspection"
                    ? "border-emerald-600/60 ring-2 ring-emerald-500/20"
                    : "theme-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)] flex items-center gap-2">
                    <ClipboardCheck
                      className="w-4 h-4 text-emerald-700 dark:text-emerald-300"
                      aria-hidden="true"
                    />
                    {ui("بيانات الفحص والإقرار التشغيلي")}
                  </h3>
                  {selectedContract.inspectionId ||
                  selectedContract.inspection ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-800 border border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35 text-xs font-bold inline-flex items-center gap-1">
                      <CheckCircle2
                        className="w-3 h-3 text-emerald-700 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                      {ui("معتمد ومكتمل")}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/35 text-xs font-bold inline-flex items-center gap-1">
                      <AlertCircle
                        className="w-3 h-3 text-[var(--accent-gold)]"
                        aria-hidden="true"
                      />
                      {ui("بانتظار الفحص")}
                    </span>
                  )}
                </div>

                {selectedContract.inspection ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                      <div>
                        <span className="text-[var(--text-muted)] text-xs block">
                          {ui("تاريخ الفحص")}
                        </span>
                        <span
                          className="font-mono font-bold text-[var(--text-main)]"
                          dir="ltr"
                        >
                          {selectedContract.inspection.inspectionDate
                            ? new Date(
                                selectedContract.inspection.inspectionDate,
                              ).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] text-xs block">
                          {ui("لوحة المركبة المفحوصة")}
                        </span>
                        <span className="font-mono font-bold text-[var(--text-main)]">
                          <bdi>{selectedContract.inspection.vehiclePlate}</bdi>
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] text-xs block">
                          {ui("إقرار الكابتن")}
                        </span>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                          {ui("تم الإقرار والتعهد")}
                        </span>
                      </div>
                    </div>

                    {/* Checklist summary pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold border ${selectedContract.inspection.fireExtinguisher ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/30 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35" : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"}`}
                      >
                        {ui("طفاية الحريق:")}{" "}
                        {ui(
                          selectedContract.inspection.fireExtinguisher
                            ? "جاهزة"
                            : "غير متوفرة",
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold border ${selectedContract.inspection.firstAidKit ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/30 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35" : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"}`}
                      >
                        {ui("حقيبة الإسعافات:")}{" "}
                        {ui(
                          selectedContract.inspection.firstAidKit
                            ? "جاهزة"
                            : "غير متوفرة",
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold border ${selectedContract.inspection.seatBelts ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/30 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35" : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"}`}
                      >
                        {ui("أحزمة الأمان:")}{" "}
                        {ui(
                          selectedContract.inspection.seatBelts
                            ? "سليمة"
                            : "فحص مطلوب",
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold border ${selectedContract.inspection.tires ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/30 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35" : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"}`}
                      >
                        {ui("سلامة الإطارات:")}{" "}
                        {ui(
                          selectedContract.inspection.tires
                            ? "سليمة"
                            : "فحص مطلوب",
                        )}
                      </span>
                    </div>
                  </div>
                ) : selectedContract.inspectionId ? (
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 p-3 rounded-xl bg-emerald-500/12 border border-emerald-600/30 dark:bg-emerald-950/45 dark:border-emerald-500/35">
                    {ui(
                      "تم ربط فحص تشغيلي وإقرار معتمد لهذا العقد برقم معرّف:",
                    )}{" "}
                    <code className="font-mono font-bold" dir="ltr">
                      {selectedContract.inspectionId.slice(0, 12)}...
                    </code>
                  </p>
                ) : (
                  <div className="p-3 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-xs text-[var(--text-main)] space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-[var(--accent-gold)]">
                      <AlertCircle
                        className="w-4 h-4 text-[var(--accent-gold)]"
                        aria-hidden="true"
                      />
                      {ui("تنبيه تشغيلي إلزامي:")}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {ui(
                        "لم يتم إرفاق الفحص اليومي والإقرار التشغيلي المسبق للمركبة قبل انطلاق هذه الرحلة. يُرجى توجيه الكابتن لإتمام الفحص التشغيلي اليومي عبر بوابته.",
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Passengers Manifest Table */}
              <div
                id="contract-modal-passengers"
                className={
                  contractModalFocus === "passengers"
                    ? "rounded-2xl ring-2 ring-[var(--accent-gold)]/25 p-2 -m-2 transition"
                    : undefined
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)] flex items-center gap-2">
                    <Users
                      className="w-4 h-4 text-[var(--accent-gold)]"
                      aria-hidden="true"
                    />
                    {ui("كشف الركاب والمرافقين المعتمد (")}
                    {selectedContract.passengers?.length || 0} {ui("راكباً)")}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    {ui("الصفحة 2 من وثيقة العقد")}
                  </span>
                </div>

                {!selectedContract.passengers?.length ? (
                  <p className="text-xs text-[var(--text-muted)] p-4 text-center rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                    {ui(
                      "لا يوجد ركاب مرافقين مضافين لهذا العقد (تم قيد الضيف الرئيسي فقط)",
                    )}
                  </p>
                ) : (
                  <div className="rounded-xl border theme-border overflow-hidden">
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader className="bg-[var(--table-header-bg)] border-b theme-border text-[var(--text-muted)] font-bold">
                          <TableRow>
                            <TableHead className="px-3 py-2 text-center w-10">
                              #
                            </TableHead>
                            <TableHead className="px-3 py-2">
                              {ui("اسم الضيف / الراكب")}
                            </TableHead>
                            <TableHead className="px-3 py-2">
                              {ui("الجنسية")}
                            </TableHead>
                            <TableHead className="px-3 py-2">
                              {ui("الهوية / الجواز")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y theme-border">
                          {selectedContract.passengers.map((p, idx) => (
                            <TableRow key={p.id || idx}>
                              <TableCell className="px-3 py-2 text-center font-mono font-bold text-[var(--text-muted)]">
                                {p.sequence || idx + 1}
                              </TableCell>
                              <TableCell className="px-3 py-2 font-bold text-[var(--text-main)]">
                                {p.name}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-[var(--text-muted)]">
                                {p.nationality || "—"}
                              </TableCell>
                              <TableCell
                                className="px-3 py-2 font-mono text-[var(--text-main)]"
                                dir="ltr"
                              >
                                {p.idNumber || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards for Modal */}
                    <div className="sm:hidden divide-y theme-border p-3 space-y-2">
                      {selectedContract.passengers.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="pt-2 first:pt-0 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[var(--bg-card-subtle)] text-xs font-mono flex items-center justify-center text-[var(--text-muted)] font-bold border theme-border">
                                {p.sequence || idx + 1}
                              </span>
                              <span>{p.name}</span>
                            </span>
                            {p.nationality && (
                              <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-card-subtle)] text-[var(--text-muted)] border theme-border">
                                {p.nationality}
                              </span>
                            )}
                          </div>
                          {p.idNumber && (
                            <div
                              className="text-xs text-[var(--text-muted)] font-mono ps-6"
                              dir="ltr"
                            >
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
                <div className="p-3.5 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-xs">
                  <span className="font-bold text-[var(--accent-gold)] block mb-1">
                    {ui("ملاحظات الرحلة والتشغيل:")}
                  </span>
                  <p className="text-[var(--text-main)]">
                    {selectedContract.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t theme-border theme-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <Link
                  href={`/admin/contracts/${selectedContract.id}`}
                  className="col-span-2 sm:col-span-1 min-h-11 sm:min-h-9 flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("صفحة المراجعة والاعتماد")}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedContract;
                    setSelectedContract(null);
                    setContractModalFocus(null);
                    openPdf(c);
                  }}
                  className="min-h-11 sm:min-h-9 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] text-[var(--accent-gold)] hover:bg-amber-500/15 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>{ui("استعراض الـ PDF")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedContract;
                    setSelectedContract(null);
                    setContractModalFocus(null);
                    setReverseContract(c);
                  }}
                  className="min-h-11 sm:min-h-9 flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:border-sky-500 hover:bg-sky-500/15 transition cursor-pointer"
                  title={ui("إنشاء رحلة عكسية من هذا العقد")}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("رحلة عكسية")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedContract;
                    setSelectedContract(null);
                    setContractModalFocus(null);
                    setContractToDelete(c);
                  }}
                  className="col-span-2 sm:col-span-1 min-h-11 sm:min-h-9 flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl danger-btn transition cursor-pointer"
                  title={ui("حذف العقد نهائياً")}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("حذف العقد")}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedContract(null);
                  setContractModalFocus(null);
                }}
                className="w-full sm:w-auto min-h-11 sm:min-h-9 px-4 py-2 text-xs rounded-xl secondary-btn transition cursor-pointer"
              >
                {ui("إغلاق")}
              </button>
            </div>
          </div>
        </Modal>
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
        title={ui("تأكيد حذف العقد")}
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

      {/* Reverse Trip Modal */}
      {reverseContract && (
        <ReverseTripModal
          isOpen={!!reverseContract}
          onClose={() => setReverseContract(null)}
          contract={reverseContract}
          onSuccess={() => {
            invalidateClientCache("contracts_");
            fetchContractsData(undefined, true);
          }}
        />
      )}
    </div>
  );
}
