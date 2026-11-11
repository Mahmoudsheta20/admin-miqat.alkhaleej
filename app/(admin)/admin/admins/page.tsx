"use client";
import { useUiText } from "@/lib/ui-text";


import ConfirmDialog from "@/app/_components/ConfirmDialog";
import Modal from "@/app/_components/Modal";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";
import { Badge } from "@/app/_components/ui";

import React, { useState, useEffect, useId, useRef } from "react";
import { ShieldCheck, UserPlus, Crown, Users, CheckCircle2, Trash2, Power, Copy, Check, AlertCircle, Sparkles, Mail, Phone, User, X, Lock, KeyRound } from "lucide-react";
import { getAdminsListAction, createAdminUserAction, toggleAdminStatusAction, deleteAdminUserAction, resetAdminTemporaryPasswordAction } from "@/app/_actions/adminManagement";
import { AdminUserItem, SUPER_ADMIN_EMAIL } from "@/lib/adminConstants";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

export default function AdminManagementPage() {
  const ui = useUiText();


  const cachedAdmins = getCachedData<{ success: boolean; admins?: AdminUserItem[] }>("admins_list");
  const [admins, setAdmins] = useState<AdminUserItem[]>(() =>
    Array.isArray(cachedAdmins?.admins) ? cachedAdmins.admins : []
  );
  const [loading, setLoading] = useState(() => !cachedAdmins);
  const [isSuper, setIsSuper] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Created / Reset Admin Success State
  const [createdAdmin, setCreatedAdmin] = useState<{
    admin: AdminUserItem;
    temporaryPassword: string;
    isReset?: boolean;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameFieldId = useId();
  const emailFieldId = useId();
  const phoneFieldId = useId();

  // Delete, Reset & Inline Feedback State
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null);
  const [resetLoadingAdminId, setResetLoadingAdminId] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    type: "success" | "error";
    message: string;
    dynamic?: boolean;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const fetchAdmins = async (forceRefresh = false) => {
    return fetchCached("admins_list", getAdminsListAction, {
        ttlMs: 120_000,
        forceRefresh,
      }).then(res => {
      setError(null);
      if (res.success && res.admins) {
        setAdmins(res.admins);
        setIsSuper(Boolean(res.isCallerSuperAdmin));
      } else {
        setError(res.error || "تعذر تحميل قائمة المسؤولين");
      }
    }).catch(() => {
      setError("حدث خطأ أثناء الاتصال بقاعدة البيانات");
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCopyError(null);
    setFormLoading(true);

    try {
      const res = await createAdminUserAction({
        name,
        email,
        phone,
      });

      if (res.success && res.admin && res.temporaryPassword) {
        setCreatedAdmin({
          admin: res.admin,
          temporaryPassword: res.temporaryPassword,
        });
        invalidateClientCache("admins_list");
        setName("");
        setEmail("");
        setPhone("");
        fetchAdmins(true);
      } else {
        setFormError(res.error || "فشل إنشاء حساب المسؤول");
      }
    } catch {
      setFormError("حدث خطأ غير متوقع أثناء إنشاء الحساب");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (admin: AdminUserItem) => {
    if (admin.isSuperAdmin) return;
    setActionBanner(null);
    try {
      const res = await toggleAdminStatusAction(admin.id);
      if (res.success) {
        const nextActive = Boolean(res.active);
        invalidateClientCache("admins_list");
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, active: nextActive } : a))
        );
        setActionBanner({
          type: "success",
          message: nextActive
            ? "تم تفعيل حساب المسؤول بنجاح."
            : "تم تعطيل حساب المسؤول بنجاح.",
        });
      } else {
        setActionBanner({
          type: "error",
          message: res.error || ui("فشل تعديل حالة المسؤول"),
          dynamic: Boolean(res.error),
        });
      }
    } catch {
      setActionBanner({
        type: "error",
        message: "تعذر تعديل الحالة",
      });
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget || deleteTarget.isSuperAdmin) return;
    setDeleteLoading(true);
    setActionBanner(null);
    try {
      const res = await deleteAdminUserAction(deleteTarget.id);
      if (res.success) {
        invalidateClientCache("admins_list");
        setAdmins((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        setDeleteTarget(null);
        setActionBanner({
          type: "success",
          message: "تم حذف حساب المسؤول بنجاح.",
        });
      } else {
        setActionBanner({
          type: "error",
          message: res.error || ui("فشل حذف حساب المسؤول"),
          dynamic: Boolean(res.error),
        });
      }
    } catch {
      setActionBanner({
        type: "error",
        message: "تعذر حذف حساب المسؤول",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    setCopyError(null);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(text);
      setCopiedPass(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedPass(false), 2000);
    } catch {
      setCopiedPass(false);
      setCopyError("تعذر النسخ التلقائي — يرجى نسخ كلمة المرور يدوياً");
    }
  };

  const handleConfirmResetPassword = async () => {
    const adm = resetTarget;
    if (!adm || adm.isSuperAdmin) return;
    setResetLoadingAdminId(adm.id);
    setActionBanner(null);
    setCopyError(null);
    try {
      const res = await resetAdminTemporaryPasswordAction(adm.id);
      if (res.success && res.temporaryPassword) {
        invalidateClientCache("admins_list");
        setCreatedAdmin({
          admin: adm,
          temporaryPassword: res.temporaryPassword,
          isReset: true,
        });
        setFormError(null);
        setResetTarget(null);
        setModalOpen(true);
        fetchAdmins(true);
      } else {
        setResetTarget(null);
        setActionBanner({
          type: "error",
          message: res.error || ui("فشل إعادة تعيين كلمة المرور"),
          dynamic: Boolean(res.error),
        });
      }
    } catch {
      setResetTarget(null);
      setActionBanner({
        type: "error",
        message: "حدث خطأ في الاتصال بالسيرفر",
      });
    } finally {
      setResetLoadingAdminId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16" dir={ui.dir}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-[var(--accent-gold)] text-xs font-bold">
              <Crown className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("خاصية المدير العام الأساسي (Super Admin)")}</span>
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-[var(--text-main)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("إدارة فريق المسؤولين")}</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {ui("التحكم في حسابات الإدارة وإضافة مسؤولين جدد بصلاحيات كاملة على النظام.")}</p>
        </div>

        {isSuper && (
          <button
            type="button"
            onClick={() => {
              setCreatedAdmin(null);
              setFormError(null);
              setCopyError(null);
              setModalOpen(true);
            }}
            className="min-h-11 sm:min-h-9 px-3.5 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>{ui("إضافة مسؤول جديد")}</span>
          </button>
        )}
      </div>

      {actionBanner && (
        <div
          role={actionBanner.type === "error" ? "alert" : "status"}
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            actionBanner.type === "success"
              ? "bg-emerald-500/12 border-emerald-600/35 text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {actionBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{actionBanner.dynamic ? actionBanner.message : ui(actionBanner.message)}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            aria-label={ui("إغلاق")}
            className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Access Guard Notice for regular admins */}
      {!isSuper && !loading && (
        <div className="p-4 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-[var(--text-main)] text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--accent-gold)] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-bold text-[var(--accent-gold)]">{ui("تنبيه الصلاحية:")}</p>
            <p className="leading-relaxed text-[var(--text-muted)]">
              {ui("أنت مسجل بصلاحية مسؤول. خاصية إضافة وتعديل المسؤولين الآخرين محصورة بالمدير العام الأساسي (")}<bdi className="font-mono font-bold text-[var(--text-main)]" dir="ltr">
                {SUPER_ADMIN_EMAIL}
              </bdi>
              ).
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl theme-card shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)]">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">{ui("إجمالي المسؤولين")}</p>
            <p className="text-xl font-semibold text-[var(--text-main)] font-mono">
              {admins.length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl theme-card shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/12 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">{ui("المسؤولون النشطون")}</p>
            <p className="text-xl font-semibold text-[var(--text-main)] font-mono">
              {admins.filter((a) => a.active).length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl theme-card shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)]">
            <Crown className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">{ui("المدير العام الأساسي")}</p>
            <p className="text-xs font-bold text-[var(--text-main)] font-mono truncate max-w-[150px]" dir="ltr">
              {SUPER_ADMIN_EMAIL}
            </p>
          </div>
        </div>
      </div>

      {/* Admins Table Card */}
      <div className="theme-card rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b theme-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("سجل مسؤولي النظام المعتمدين")}</span>
          </h2>
          <span className="text-xs font-mono font-bold text-[var(--text-muted)]">{admins.length} {ui("مسؤول")}</span>
        </div>

        {loading ? (
          <div role="status" className="py-16 text-center text-[var(--text-muted)] space-y-2">
            <div className="w-8 h-8 mx-auto border-3 border-[var(--accent-gold)]/20 border-t-[var(--accent-gold)] rounded-full animate-spin" aria-hidden="true" />
            <p className="text-xs font-semibold">{ui("جاري تحميل قائمة المسؤولين...")}</p>
          </div>
        ) : error ? (
          <div role="alert" className="p-8 text-center text-rose-700 dark:text-rose-400 text-xs font-semibold">{error}</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b theme-border text-[var(--text-muted)] bg-[var(--table-header-bg)]">
                  <th className="py-3 px-4 font-bold">{ui("المسؤول")}</th>
                  <th className="py-3 px-4 font-bold">{ui("البريد الإلكتروني")}</th>
                  <th className="py-3 px-4 font-bold">{ui("رقم الهاتف")}</th>
                  <th className="py-3 px-4 font-bold">{ui("الرتبة")}</th>
                  <th className="py-3 px-4 font-bold">{ui("الحالة")}</th>
                  <th className="py-3 px-4 font-bold text-end">{ui("الإجراءات")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {admins.map((adm) => (
                  <tr
                    key={adm.id}
                    className="hover:bg-[var(--table-row-hover)] transition"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {adm.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                            <span>{adm.name}</span>
                            {adm.isSuperAdmin && (
                              <span title={ui("المدير العام الأساسي")}>
                                <Crown className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                              </span>
                            )}
                          </p>
                          {adm.mustChangePassword && (
                            <span className="text-xs text-[var(--accent-gold)] font-semibold">
                              {ui("(بانتظار تغيير كلمة المرور المؤقتة)")}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[var(--text-main)]" dir="ltr">
                      {adm.email}
                    </td>

                    <td className="py-3 px-4 font-mono text-[var(--text-muted)]" dir="ltr">
                      {adm.phone || "—"}
                    </td>

                    <td className="py-3 px-4">
                      {adm.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/35 text-xs font-bold">
                          <Crown className="w-3 h-3 text-[var(--accent-gold)]" aria-hidden="true" />
                          <span>{ui("المدير الأساسي")}</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--bg-card-subtle)] text-[var(--text-main)] border theme-border text-xs font-bold">
                          {ui("مسؤول نظام")}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {adm.active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
                          <span>{ui("نشط")}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                          <span>{ui("معطل")}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-end">
                      {isSuper && !adm.isSuperAdmin ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setResetTarget(adm)}
                            disabled={resetLoadingAdminId === adm.id}
                            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-surface)] transition cursor-pointer"
                            title={ui("إعادة تعيين كلمة المرور المؤقتة")}
                            aria-label={`${ui("إعادة تعيين كلمة المرور المؤقتة")} — ${adm.name}`}
                          >
                            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(adm)}
                            className={`min-h-9 min-w-9 inline-flex items-center justify-center rounded-xl border text-xs transition cursor-pointer ${
                              adm.active
                                ? "border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-surface)]"
                                : "border-emerald-600/40 text-emerald-800 dark:text-emerald-300 bg-emerald-500/12 hover:bg-emerald-500/20"
                            }`}
                            title={ui(adm.active ? "تعطيل الحساب" : "تفعيل الحساب")}
                            aria-label={`${ui(adm.active ? "تعطيل الحساب" : "تفعيل الحساب")} — ${adm.name}`}
                          >
                            <Power className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(adm)}
                            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title={ui("حذف المسؤول")}
                            aria-label={`${ui("حذف المسؤول")} — ${adm.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] font-medium">{ui("محمي")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Admin Cards */}
          <div className="md:hidden p-3 space-y-3">
            {admins.map((adm) => (
              <MobileRecordCard
                key={adm.id}
                title={
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] font-semibold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {adm.name.slice(0, 1)}
                    </span>
                    <span className="truncate">{adm.name}</span>
                    {adm.isSuperAdmin && (
                      <span title={ui("المدير العام الأساسي")} className="shrink-0">
                        <Crown className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                }
                subtitle={
                  <span className="inline-flex flex-wrap items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className={
                        adm.isSuperAdmin
                          ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/35 text-xs"
                          : "text-xs"
                      }
                    >
                      {ui(adm.isSuperAdmin ? "المدير الأساسي" : "مسؤول نظام")}
                    </Badge>
                    {adm.mustChangePassword && (
                      <span className="text-xs text-[var(--accent-gold)] font-semibold">
                        {ui("(كلمة مرور مؤقتة)")}
                      </span>
                    )}
                  </span>
                }
                badge={
                  <Badge variant={adm.active ? "success" : "secondary"} className="text-xs">
                    {ui(adm.active ? "نشط" : "معطل")}
                  </Badge>
                }
                footer={
                  isSuper && !adm.isSuperAdmin ? (
                    <div className="mobile-card-actions w-full flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setResetTarget(adm)}
                        disabled={resetLoadingAdminId === adm.id}
                        className="flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)] text-xs font-bold transition cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                        <span>{ui("إعادة كلمة المرور")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(adm)}
                        className={`flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          adm.active
                            ? "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                            : "border-emerald-600/40 text-emerald-800 dark:text-emerald-300 bg-emerald-500/12 hover:bg-emerald-500/20"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{ui(adm.active ? "تعطيل الحساب" : "تفعيل الحساب")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(adm)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center px-3 rounded-xl border border-[var(--control-border)] text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500 transition cursor-pointer shrink-0"
                        title={ui("حذف المسؤول")}
                        aria-label={`${ui("حذف المسؤول")} — ${adm.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full text-end text-xs text-[var(--text-muted)] font-medium">
                      {ui("حساب محمي بصلاحيات المدير الأساسي")}
                    </div>
                  )
                }
              >
                <MobileCardMetaGrid columns={2}>
                  <MobileCardField
                    label={ui("البريد الإلكتروني")}
                    value={<span dir="ltr">{adm.email}</span>}
                    mono
                    className={adm.phone ? "" : "col-span-2"}
                  />
                  {adm.phone && (
                    <MobileCardField
                      label={ui("رقم الهاتف")}
                      value={<span dir="ltr">{adm.phone}</span>}
                      mono
                      alignEnd
                    />
                  )}
                </MobileCardMetaGrid>
              </MobileRecordCard>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Add / Temporary Credentials Modal */}
      {modalOpen && (
        <Modal
          label={createdAdmin ? ui("بيانات الدخول المؤقتة") : ui("إضافة مسؤول")}
          onClose={() => setModalOpen(false)}
          isBusy={formLoading}
        >
          <div className="mobile-dialog-panel overflow-y-auto w-full max-w-md theme-card rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center gap-2">
                {createdAdmin ? (
                  <KeyRound className="w-5 h-5 text-[var(--accent-gold)]" aria-hidden="true" />
                ) : (
                  <UserPlus className="w-5 h-5 text-[var(--accent-gold)]" aria-hidden="true" />
                )}
                <h2 className="text-sm font-semibold text-[var(--text-main)]">
                  {createdAdmin ? ui("بيانات الدخول المؤقتة") : ui("إضافة مسؤول جديد للنظام")}
                </h2>
              </div>
              <button
                type="button"
                aria-label={ui("إغلاق")}
                onClick={() => setModalOpen(false)}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-subtle)] transition cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            {createdAdmin ? (
              /* Success Card with Temporary Password */
              <div className="space-y-4 py-2 animate-in zoom-in-95">
                <div className="p-4 rounded-2xl bg-emerald-500/12 border border-emerald-600/35 dark:bg-emerald-950/45 dark:border-emerald-500/35 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-[var(--text-main)]">
                    {ui(
                      createdAdmin.isReset
                        ? "تم إصدار كلمة مرور مؤقتة جديدة بنجاح!"
                        : "تم إنشاء حساب المسؤول بنجاح!"
                    )}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {ui("احفظ بيانات الدخول وشاركها مع المسؤول الجديد بطريقة آمنة. لن يتم إرسالها بالبريد الإلكتروني.")}</p>
                </div>

                <div className="p-4 rounded-2xl theme-card-subtle space-y-3">
                  <div>
                    <span className="text-[var(--text-muted)] text-xs block">{ui("اسم المسؤول:")}</span>
                    <span className="font-bold text-[var(--text-main)] text-xs">
                      {createdAdmin.admin.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--text-muted)] text-xs block">{ui("البريد الإلكتروني:")}</span>
                    <bdi className="font-mono font-bold text-[var(--accent-gold)] text-xs" dir="ltr">
                      {createdAdmin.admin.email}
                    </bdi>
                  </div>

                  <div className="pt-2 border-t theme-border">
                    <span className="text-[var(--text-muted)] text-xs block mb-1">
                      {ui("كلمة المرور المؤقتة (Temporary Password):")}</span>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 font-mono font-semibold text-[var(--accent-gold)] text-sm">
                      <bdi dir="ltr">{createdAdmin.temporaryPassword}</bdi>
                      <button
                        type="button"
                        onClick={() => void handleCopy(createdAdmin.temporaryPassword)}
                        className="min-h-11 sm:min-h-8 px-3 py-1 rounded-lg gold-gradient-btn text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                      >
                        {copiedPass ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                        <span>{ui(copiedPass ? "تم النسخ" : "نسخ")}</span>
                      </button>
                    </div>
                    {copyError && (
                      <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                        {ui(copyError)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-full min-h-11 sm:min-h-9 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
                >
                  {ui("إغلاق وتحديث القائمة")}</button>
              </div>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label
                    htmlFor={nameFieldId}
                    className="text-xs font-bold text-[var(--text-main)] block mb-1"
                  >
                    {ui("اسم المسؤول بالكامل")}<span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <div className="relative flex items-center rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] focus-within:border-[var(--accent-gold)] transition">
                    <div className="ps-3 text-[var(--text-muted)]">
                      <User className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id={nameFieldId}
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={ui("مثال: م. عبد الله الشمري")}
                      className="w-full min-h-11 sm:min-h-9 px-3 py-1.5 bg-transparent text-base sm:text-[0.8125rem] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={emailFieldId}
                    className="text-xs font-bold text-[var(--text-main)] block mb-1"
                  >
                    {ui("البريد الإلكتروني المعتمد")}<span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <div className="relative flex items-center rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] focus-within:border-[var(--accent-gold)] transition">
                    <div className="ps-3 text-[var(--text-muted)]">
                      <Mail className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id={emailFieldId}
                      type="email"
                      required
                      dir="ltr"
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full min-h-11 sm:min-h-9 px-3 py-1.5 bg-transparent text-base sm:text-[0.8125rem] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] outline-hidden font-mono text-start"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={phoneFieldId}
                    className="text-xs font-bold text-[var(--text-main)] block mb-1"
                  >
                    {ui("رقم الهاتف (اختياري)")}</label>
                  <div className="relative flex items-center rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] focus-within:border-[var(--accent-gold)] transition">
                    <div className="ps-3 text-[var(--text-muted)]">
                      <Phone className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id={phoneFieldId}
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+9665XXXXXXXX"
                      className="w-full min-h-11 sm:min-h-9 px-3 py-1.5 bg-transparent text-base sm:text-[0.8125rem] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] outline-hidden font-mono text-start"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl theme-card-subtle text-xs text-[var(--text-muted)] space-y-1">
                  <p className="flex items-center gap-1 font-bold text-[var(--text-main)]">
                    <Lock className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                    <span>{ui("آلية الأمان وتعيين كلمة المرور:")}</span>
                  </p>
                  <p>
                    {ui("سيقوم النظام بتوليد كلمة مرور مؤقتة فريدة وتوجيه المسؤول لتغييرها إلزامياً عند أول تسجيل دخول.")}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg secondary-btn text-xs sm:text-sm cursor-pointer"
                  >
                    {ui("إلغاء")}</button>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="min-h-11 sm:min-h-9 px-5 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        <span>{ui("جاري الإنشاء...")}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{ui("إنشاء حساب المسؤول")}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* Reset Temporary Password Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(resetTarget)}
        title="تأكيد إعادة تعيين كلمة المرور"
        message={
          resetTarget
            ? `${ui("هل أنت متأكد من رغبتك في إعادة تعيين كلمة المرور المؤقتة للمسؤول التالي؟")} (${resetTarget.name})`
            : ""
        }
        confirmLabel="تأكيد"
        cancelLabel="تراجع"
        variant="warning"
        onConfirm={handleConfirmResetPassword}
        onCancel={() => {
          if (!resetLoadingAdminId) setResetTarget(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal label={ui("تأكيد حذف المسؤول")} onClose={() => setDeleteTarget(null)} isBusy={deleteLoading}>
          <div className="mobile-dialog-panel overflow-y-auto w-full max-w-sm theme-card rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" aria-hidden="true" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-sm font-semibold text-[var(--text-main)]">
                {ui("تأكيد حذف حساب المسؤول")}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {ui("هل أنت متأكد من رغبتك في حذف حساب المسؤول (")}<span className="font-bold text-[var(--text-main)]">{deleteTarget.name}</span>
                {ui(")؟ لن يتمكن من الدخول للنظام بعد الآن.")}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                autoFocus
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg secondary-btn text-xs sm:text-sm cursor-pointer"
              >
                {ui("تراجع")}</button>

              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteAdmin}
                className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {ui(deleteLoading ? "جاري الحذف..." : "تأكيد الحذف")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
