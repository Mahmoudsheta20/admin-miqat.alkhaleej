"use client";
import { createHelpGuide } from "./help-guide";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";

import LoadError from "@/app/_components/LoadError";

import Modal from "@/app/_components/Modal";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ImageUpload from "@/app/_components/ImageUpload";
import { UserPlus, Car, CheckCircle2, XCircle, Edit2, Trash2, X, KeyRound, Copy, Check, Power, Download, AlertCircle, Wallet } from "lucide-react";
import { csvDownload } from "@/lib/commercial";
import { currentSaudiPeriod } from "@/lib/accounting";
import { getCaptains, createCaptain, updateCaptain, toggleCaptainStatus, deleteCaptain, resetCaptainTemporaryPassword, CaptainFormData } from "@/app/_actions/captain";
import { SystemUser } from "@/lib/types";
import StatusBadge from "@/app/_components/StatusBadge";
import ConfirmDialog from "@/app/_components/ConfirmDialog";
import {
  PageHeader,
  FilterBar,
  Button,
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
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
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";
import { useLanguage } from "@/lib/languageContext";

type CaptainItem = SystemUser & {
  contractCount: number;
  hasTodayInspection: boolean;
};

export default function CaptainsManagementPage() {
  const ui = useUiText();

  const { t, isRTL } = useLanguage();
  const cachedCaptains =
    getCachedData<Awaited<ReturnType<typeof getCaptains>>>("captains_list");
  const [captains, setCaptains] = useState<CaptainItem[]>(() => {
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
  const [isLoading, setIsLoading] = useState(() => !cachedCaptains);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [seedMessage, setSeedMessage] = useState("");
  const formId = useId();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useUrlState<string>("q", "");
  const [statusFilter, setStatusFilter] = useUrlState<string>("status", "ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCaptain, setEditingCaptain] = useState<CaptainItem | null>(
    null,
  );
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
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

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
    active: true,
  });

  const loadCaptains = async (forceRefresh = false) => {
    return fetchCached("captains_list", getCaptains, {
      ttlMs: 120_000,
      forceRefresh,
    })
      .then((res) => {
        if (res?.success && Array.isArray(res?.captains)) {
          setCaptains(res.captains);
          setLoadError("");
        } else {
          setLoadError(res.error || "تعذر تحميل البيانات");
        }
      })
      .catch((err) => {
        setLoadError("تعذر الاتصال بالخادم");
        console.error("Failed to load captains:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadCaptains();
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleToggleStatus = async (c: CaptainItem) => {
    const newStatus = !c.active;
    setIsTogglingId(c.id);
    setActionError("");
    try {
      setCaptains((prev) =>
        prev.map((item) =>
          item.id === c.id ? { ...item, active: newStatus } : item,
        ),
      );
      const res = await toggleCaptainStatus(c.id, newStatus);
      if (res.success) {
        invalidateClientCache("captains_list");
        invalidateClientCache("dashboard_stats");
      } else {
        setCaptains((prev) =>
          prev.map((item) =>
            item.id === c.id ? { ...item, active: c.active } : item,
          ),
        );
        setActionError(res.error || (isRTL ? "تعذر تغيير حالة الكابتن" : "Failed to update captain status"));
      }
    } catch {
      setCaptains((prev) =>
        prev.map((item) =>
          item.id === c.id ? { ...item, active: c.active } : item,
        ),
      );
      setActionError(isRTL ? "حدث خطأ غير متوقع أثناء تغيير حالة الكابتن" : "Unexpected error while updating captain status");
    } finally {
      setIsTogglingId(null);
    }
  };

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
      active: true,
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
      active: c.active,
    });
    setFormError("");
    setIsAddModalOpen(true);
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
        setIsAddModalOpen(false);
        invalidateClientCache("captains_list");
        invalidateClientCache("dashboard_stats");
        await loadCaptains(true);
      } else {
        setFormError(res.error || "فشل التحديث");
      }
    } else {
      const res = await createCaptain(formData);
      if (res.success && res.captain) {
        setIsAddModalOpen(false);
        invalidateClientCache("captains_list");
        invalidateClientCache("dashboard_stats");
        await loadCaptains(true);
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
    setActionError("");
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
        setActionError(res.error || (isRTL ? "تعذر توليد كلمة المرور المؤقتة" : "Failed to generate temporary password"));
      }
    } finally {
      setIsResettingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionError("");
    const res = await deleteCaptain(deleteId);
    if (!res.success) {
      throw new Error(res.error || (isRTL ? "تعذر حذف الكابتن" : "Failed to delete captain"));
    }
    setDeleteId(null);
    invalidateClientCache("captains_list");
    invalidateClientCache("dashboard_stats");
    await loadCaptains(true);
  };

  const safeCaptains = Array.isArray(captains) ? captains : [];
  const activeCount = safeCaptains.filter((c) => c.active).length;
  const inactiveCount = safeCaptains.filter((c) => !c.active).length;
  const inspectedCount = safeCaptains.filter((c) => c.hasTodayInspection).length;

  const filtered = safeCaptains.filter((c) => {
    if (statusFilter === "ACTIVE" && !c.active) return false;
    if (statusFilter === "INACTIVE" && c.active) return false;
    if (statusFilter === "INSPECTED" && !c.hasTodayInspection) return false;

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

  const captainsHelpGuide = useMemo(() => createHelpGuide(isRTL), [isRTL]);

  return (
    <div className="space-y-6">
      <LoadError
        message={loadError}
        onRetry={() => {
          void loadCaptains(true);
        }}
        isLoading={isLoading}
      />

      {/* Page Header with On-Demand Guide */}
      <PageHeader
        title={ui(t("captains.title"))}
        subtitle={ui(t("captains.subtitle"))}
        badge={isRTL ? "إدارة الكباتن والسائقين" : "Captains & Drivers"}
        icon={UserPlus}
        onRefresh={() => void loadCaptains(true)}
        isRefreshing={isLoading}
        helpGuide={captainsHelpGuide}
        onSeeded={(msg) => {
          setLoadError("");
          setSeedMessage(msg);
          invalidateClientCache("captains_list");
          void loadCaptains(true);
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setLoadError(err);
        }}
        primaryAction={{
          label: t("captains.add"),
          onClick: openAddModal,
          icon: UserPlus,
          variant: "primary",
        }}
        secondaryActions={[
          {
            label: "تصدير التقرير",
            icon: Download,
            onClick: () => {
              csvDownload(`captains-report-${currentSaudiPeriod().day}.csv`, [
                [
                  isRTL ? "تقرير الكباتن" : "Captains Report",
                  isRTL ? `إجمالي: ${safeCaptains.length}` : `Total: ${safeCaptains.length}`,
                ],
                isRTL
                  ? [
                      "اسم الكابتن",
                      "البريد الإلكتروني",
                      "رقم الجوال",
                      "رقم الهوية",
                      "رقم الرخصة",
                      "انتهاء الرخصة",
                      "المركبة المسندة",
                      "فحص اليوم",
                      "إجمالي العقود",
                      "الحالة",
                    ]
                  : [
                      "Captain Name",
                      "Email",
                      "Phone",
                      "National ID",
                      "License No.",
                      "License Expiry",
                      "Assigned Vehicle",
                      "Today Inspection",
                      "Total Contracts",
                      "Status",
                    ],
                ...filtered.map((c) => [
                  c.name,
                  c.email,
                  c.phone || "—",
                  c.nationalId || "—",
                  c.licenseNumber || "—",
                  c.licenseExpiry || "—",
                  c.assignedVehiclePlate || "—",
                  c.hasTodayInspection
                    ? (isRTL ? "تم الفحص" : "Inspected")
                    : (isRTL ? "بانتظار الفحص" : "Pending"),
                  c.contractCount,
                  c.active
                    ? (isRTL ? "نشط" : "Active")
                    : (isRTL ? "معطل" : "Inactive"),
                ]),
              ]);
            },
            variant: "secondary",
          },
        ]}
      />

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label={ui("إغلاق")}
            className="min-h-9 min-w-9 flex items-center justify-center rounded-lg hover:bg-rose-500/15 transition"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

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
        searchPlaceholder={ui(isRTL ? "البحث بالاسم، رقم الهوية، رقم الجوال، أو اللوحة..." : "Search by name, ID, phone, or plate...")}
        tabs={[
          { id: "ALL", label: t("common.all"), count: safeCaptains.length },
          { id: "ACTIVE", label: isRTL ? "نشط" : "Active", count: activeCount },
          { id: "INSPECTED", label: isRTL ? "مفحوص اليوم" : "Inspected Today", count: inspectedCount },
          { id: "INACTIVE", label: isRTL ? "موقف" : "Inactive", count: inactiveCount },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
      />

      {/* Table */}
      <div className="theme-card rounded-2xl overflow-hidden border theme-border">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-[var(--text-muted)]">
              {ui("جاري تحميل قائمة الكباتن...")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] text-sm">
            {ui("لا يوجد كباتن مسجلين يطابقون شروط البحث.")}</div>
        ) : (
          <>
            {/* Desktop Table (shadcn Table) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ui("الكابتن")}</TableHead>
                    <TableHead>{ui("رقم الهوية / الرخصة")}</TableHead>
                    <TableHead>{ui("المركبة المسندة")}</TableHead>
                    <TableHead>{ui("فحص اليوم")}</TableHead>
                    <TableHead>{ui("إجمالي العقود")}</TableHead>
                    <TableHead>{ui("الحالة")}</TableHead>
                    <TableHead className="text-end">{ui("الإجراءات")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {c.avatarUrl ? (
                              <Image
                                src={c.avatarUrl}
                                alt={c.name}
                                fill
                                sizes="36px"
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
                            <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                              <span dir="ltr">{c.email}</span>
                              {c.phone && (
                                <span
                                  className="font-mono text-[var(--text-muted)]"
                                  dir="ltr"
                                >
                                  {c.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                            {c.nationalId || "—"}
                          </div>
                          {c.licenseNumber && (
                            <div className="text-xs text-[var(--text-muted)] font-mono">
                              {ui("رخصة:")}{" "}
                              <span dir="ltr">{c.licenseNumber}</span>
                            </div>
                          )}
                          {c.licenseExpiry && (
                            <div className="text-xs text-[var(--text-muted)]">
                              {ui("انتهاء:")}{" "}
                              <span dir="ltr">{c.licenseExpiry}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.assignedVehiclePlate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <Car className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                            <bdi>{c.assignedVehiclePlate}</bdi>
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">
                            {ui("غير مسندة")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.hasTodayInspection ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            {ui("تم الفحص")}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            {ui("بانتظار الفحص")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {c.contractCount}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] ms-1">
                          {ui("عقد")}</span>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          disabled={isTogglingId === c.id}
                          className="group inline-flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          aria-label={`${c.name} — ${ui(c.active ? "انقر لتعطيل الحساب" : "انقر لتفعيل وتنشيط الحساب")}`}
                          title={ui(c.active
                              ? "انقر لتعطيل الحساب"
                              : "انقر لتفعيل وتنشيط الحساب")}
                        >
                          <StatusBadge
                            type="captain"
                            status={c.active ? "ACTIVE" : "INACTIVE"}
                          />
                          <span
                            className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs transition border ${
                              c.active
                                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 group-hover:border-rose-500/30 group-hover:text-rose-700 dark:group-hover:text-rose-400 group-hover:bg-rose-500/10"
                                : "border-slate-300 dark:border-slate-700 text-[var(--text-muted)] group-hover:border-emerald-500/30 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:bg-emerald-500/10"
                            }`}
                          >
                            <Power
                              className={`w-3 h-3 ${isTogglingId === c.id ? "animate-spin" : ""}`}
                              aria-hidden="true"
                            />
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Link
                            className="inline-flex items-center gap-1 min-h-9 rounded-lg border theme-border px-2.5 py-1 text-xs font-bold hover:border-amber-500 hover:bg-amber-500/5 transition whitespace-nowrap"
                            href={`/admin/captains/${c.id}/account`}
                          >
                            <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                            <span>{ui("حساب السائق والمستحقات")}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            disabled={isTogglingId === c.id}
                            aria-label={`${ui(c.active ? "تعطيل حساب الكابتن مؤقتاً" : "تنشيط وتفعيل حساب الكابتن")} — ${c.name}`}
                            className={`min-h-9 min-w-9 p-2 rounded-lg border inline-flex items-center justify-center transition ${
                              c.active
                                ? "theme-card hover:border-rose-500 text-[var(--text-muted)] dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                            title={ui(c.active
                                ? "تعطيل حساب الكابتن مؤقتاً"
                                : "تنشيط وتفعيل حساب الكابتن")}
                          >
                            <Power
                              className={`w-3.5 h-3.5 ${isTogglingId === c.id ? "animate-spin" : ""}`}
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(c)}
                            disabled={isResettingId === c.id}
                            aria-label={`${ui("توليد كلمة مرور مؤقتة جديدة للكابتن")} — ${c.name}`}
                            className="min-h-9 min-w-9 p-2 rounded-lg border theme-card hover:border-amber-500 text-amber-700 dark:text-amber-400 inline-flex items-center justify-center transition"
                            title={ui("توليد كلمة مرور مؤقتة جديدة للكابتن")}
                          >
                            <KeyRound
                              className={`w-3.5 h-3.5 ${isResettingId === c.id ? "animate-spin" : ""}`}
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            aria-label={`${ui("تعديل بيانات الكابتن وحالته")} — ${c.name}`}
                            className="min-h-9 min-w-9 p-2 rounded-lg border theme-card hover:border-amber-500 text-[var(--text-muted)] dark:text-slate-400 inline-flex items-center justify-center transition"
                            title={ui("تعديل بيانات الكابتن وحالته")}
                          >
                            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(c.id)}
                            aria-label={`${ui("حذف / تعطيل الكابتن")} — ${c.name}`}
                            className="min-h-9 min-w-9 p-2 rounded-lg border theme-card hover:border-rose-500 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center justify-center transition"
                            title={ui("حذف / تعطيل الكابتن")}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Captain Cards */}
            <div className="md:hidden p-3.5 space-y-3">
              {filtered.map((c) => (
                <MobileRecordCard
                  key={c.id}
                  title={
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center text-sm shrink-0">
                        {c.avatarUrl ? (
                          <Image
                            src={c.avatarUrl}
                            alt={c.name}
                            fill
                            sizes="36px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span>{c.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <span className="truncate">{c.name}</span>
                    </div>
                  }
                  subtitle={
                    <span className="font-mono" dir="ltr">
                      <bdi>{c.email}</bdi>
                    </span>
                  }
                  badge={
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c)}
                      disabled={isTogglingId === c.id}
                      className="inline-flex items-center gap-1 min-h-11 rounded-xl transition hover:opacity-85 cursor-pointer"
                      aria-label={`${c.name} — ${ui(c.active ? "انقر للتعطيل" : "انقر للتفعيل والتنشيط")}`}
                      title={ui(c.active ? "انقر للتعطيل" : "انقر للتفعيل والتنشيط")}
                    >
                      <StatusBadge
                        type="captain"
                        status={c.active ? "ACTIVE" : "INACTIVE"}
                      />
                    </button>
                  }
                  footer={
                    <>
                      <Link
                        href={`/admin/captains/${c.id}/account`}
                        className="inline-flex items-center justify-center gap-1.5 flex-1 min-h-11 px-3 rounded-xl border theme-border bg-[var(--bg-card)] hover:border-amber-500 text-xs font-bold transition"
                      >
                        <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <span>{ui("حساب السائق")}</span>
                      </Link>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(c)}
                        className="flex-1 min-h-11 gap-1.5 text-xs font-bold"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                        <span>{ui("تعديل البيانات")}</span>
                      </Button>

                      <ActionMenu
                        label={`${ui("المزيد من الإجراءات")} — ${c.name}`}
                        triggerClassName="min-h-11 w-11 shrink-0"
                      >
                        <ActionMenuItem
                          onClick={() => handleResetPassword(c)}
                          tone="gold"
                          icon={
                            <KeyRound
                              className={`w-3.5 h-3.5 ${isResettingId === c.id ? "animate-spin" : ""}`}
                              aria-hidden="true"
                            />
                          }
                        >
                          {ui("توليد كلمة مرور مؤقتة")}
                        </ActionMenuItem>
                        <ActionMenuItem
                          onClick={() => handleToggleStatus(c)}
                          tone={c.active ? "default" : "emerald"}
                          icon={
                            <Power
                              className={`w-3.5 h-3.5 ${isTogglingId === c.id ? "animate-spin" : ""}`}
                              aria-hidden="true"
                            />
                          }
                        >
                          {ui(c.active ? "تعطيل حساب الكابتن" : "تنشيط وتفعيل الحساب")}
                        </ActionMenuItem>
                        <ActionMenuSeparator />
                        <ActionMenuItem
                          onClick={() => setDeleteId(c.id)}
                          tone="danger"
                          icon={<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                        >
                          {ui("حذف الكابتن")}
                        </ActionMenuItem>
                      </ActionMenu>
                    </>
                  }
                >
                  <MobileCardMetaGrid>
                    <MobileCardField
                      label={ui("الهوية الوطنية")}
                      mono
                      value={<bdi dir="ltr">{c.nationalId || "—"}</bdi>}
                    />
                    <MobileCardField
                      label={ui("المركبة المسندة")}
                      mono
                      value={c.assignedVehiclePlate ? <bdi>{c.assignedVehiclePlate}</bdi> : ui("غير مسندة")}
                    />
                    <MobileCardField
                      label={ui("فحص اليوم")}
                      value={
                        c.hasTodayInspection ? (
                          <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            <span>{ui("تم الفحص")}</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" aria-hidden="true" />
                            <span>{ui("بانتظار الفحص")}</span>
                          </span>
                        )
                      }
                    />
                    <MobileCardField
                      label={ui("إجمالي العقود")}
                      mono
                      value={`${c.contractCount} ${ui("عقد")}`}
                    />
                  </MobileCardMetaGrid>
                </MobileRecordCard>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingCaptain) && (
        <Modal
          label={ui("بيانات الكابتن")}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingCaptain(null);
          }}
          isBusy={isSubmitting}
        >
          <div className="mobile-dialog-panel relative w-full max-w-lg flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                {ui(editingCaptain
                  ? "تعديل بيانات الكابتن"
                  : "إضافة كابتن جديد للنظام")}
              </h3>
              <button
                type="button"
                aria-label={ui("إغلاق")}
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCaptain(null);
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

              {/* Captain Photo Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border">
                <ImageUpload
                  value={formData.avatarUrl}
                  onChange={(url) =>
                    setFormData({ ...formData, avatarUrl: url })
                  }
                  onRemove={() => setFormData({ ...formData, avatarUrl: "" })}
                  label={ui("صورة الكابتن الرسمية (تظهر في عقد النقل والبطاقة)")}
                  shape="rounded"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor={`${formId}-name`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("اسم الكابتن بالكامل *")}</label>
                  <input
                    id={`${formId}-name`}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={ui("مثال: علي أحمد غلام أحمد")}
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-email`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("البريد الإلكتروني *")}</label>
                  <input
                    id={`${formId}-email`}
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="captain@miqat.com"
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-phone`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("رقم الجوال")}</label>
                  <input
                    id={`${formId}-phone`}
                    type="tel"
                    inputMode="tel"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="0542273515"
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-nationalId`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("رقم الهوية الوطنية / الإقامة")}</label>
                  <input
                    id={`${formId}-nationalId`}
                    type="text"
                    inputMode="numeric"
                    value={formData.nationalId || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nationalId: e.target.value })
                    }
                    placeholder="2553660073"
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-licenseNumber`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("رقم رخصة القيادة")}</label>
                  <input
                    id={`${formId}-licenseNumber`}
                    type="text"
                    value={formData.licenseNumber || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        licenseNumber: e.target.value,
                      })
                    }
                    placeholder="SA-39482910"
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-licenseExpiry`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("تاريخ انتهاء الرخصة")}</label>
                  <input
                    id={`${formId}-licenseExpiry`}
                    type="text"
                    value={formData.licenseExpiry || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        licenseExpiry: e.target.value,
                      })
                    }
                    placeholder="2028/04/22"
                    dir="ltr"
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${formId}-plate`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("لوحة المركبة المسندة")}</label>
                  <input
                    id={`${formId}-plate`}
                    type="text"
                    value={formData.assignedVehiclePlate || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedVehiclePlate: e.target.value,
                      })
                    }
                    placeholder={ui("ا ص ل 7223")}
                    className="w-full min-h-11 sm:min-h-10 px-3 py-2 text-sm sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* Account Status */}
                <div className="space-y-1.5 col-span-full pt-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {ui("حالة الحساب والتشغيل")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={formData.active !== false}
                      onClick={() => setFormData({ ...formData, active: true })}
                      className={`min-h-11 p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        formData.active !== false
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-800 text-[var(--text-muted)] hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
                      <span>{ui("حساب نشط (مفعل)")}</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={formData.active === false}
                      onClick={() =>
                        setFormData({ ...formData, active: false })
                      }
                      className={`min-h-11 p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        formData.active === false
                          ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20"
                          : "border-slate-200 dark:border-slate-800 text-[var(--text-muted)] hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <XCircle className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                      <span>{ui("حساب معطل (موقوف)")}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCaptain(null);
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
                    : editingCaptain
                      ? "حفظ التعديلات"
                      : "إضافة الكابتن")}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title={ui("تأكيد حذف / إلغاء تفعيل الكابتن")}
        message="هل أنت متأكد من رغبتك في حذف هذا الكابتن؟ إذا كان مرتبطاً بعقود سابقة، سيتم تعطيل حسابه فقط حفاظاً على سجلات النظام."
        variant="danger"
        confirmText={ui("تأكيد الحذف")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Temporary Password Display Modal */}
      {tempPasswordModal && (
        <Modal
          label={ui("كلمة المرور المؤقتة")}
          onClose={() => setTempPasswordModal(null)}
          isBusy={false}
        >
          <div className="mobile-dialog-panel overflow-y-auto theme-card w-full max-w-md rounded-3xl border theme-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ui("كلمة المرور المؤقتة للحساب")}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {tempPasswordModal.captainName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={ui("إغلاق")}
                onClick={() => {
                  setTempPasswordModal(null);
                  setCopied(false);
                }}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">
                {ui("يرجى تزويد الكابتن ببيانات الدخول التالية:")}</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {ui("سيتوجب على الكابتن إدخال كلمة المرور المؤقتة لتسجيل الدخول، ثم تغييرها وتعيين كلمة سر خاصة به فور دخوله الأول.")}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border theme-border flex items-center justify-between">
                <span className="text-[var(--text-muted)] text-xs">
                  {ui("البريد الإلكتروني:")}</span>
                <span
                  className="font-mono font-bold text-slate-900 dark:text-white"
                  dir="ltr"
                >
                  {tempPasswordModal.email}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[var(--text-muted)] text-xs block font-bold">
                    {ui("كلمة المرور المؤقتة:")}</span>
                  <span
                    className="font-mono text-xl font-semibold text-amber-700 dark:text-amber-400 tracking-wider select-all"
                    dir="ltr"
                  >
                    {tempPasswordModal.tempPassword}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      tempPasswordModal.tempPassword,
                    );
                    setCopied(true);
                    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                    copyTimerRef.current = setTimeout(() => setCopied(false), 3000);
                  }}
                  className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    copied
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "gold-gradient-btn font-semibold shadow-xs hover:shadow-md"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      {ui("تم النسخ!")}</>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      {ui("نسخ")}</>
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
                className="w-full min-h-11 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                {ui("تم، إغلاق النافذة")}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
