"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  Crown,
  Users,
  CheckCircle2,
  XCircle,
  Trash2,
  Power,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Mail,
  Phone,
  User,
  X,
  Lock,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import {
  getAdminsListAction,
  createAdminUserAction,
  toggleAdminStatusAction,
  deleteAdminUserAction,
  resetAdminTemporaryPasswordAction,
} from "@/app/_actions/adminManagement";
import { AdminUserItem, SUPER_ADMIN_EMAIL } from "@/lib/adminConstants";

export default function AdminManagementPage() {
  const { user } = useAuth();

  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuper, setIsSuper] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Created Admin Success State
  const [createdAdmin, setCreatedAdmin] = useState<{
    admin: AdminUserItem;
    temporaryPassword: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetLoadingAdminId, setResetLoadingAdminId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminsListAction();
      if (res.success && res.admins) {
        setAdmins(res.admins);
        setIsSuper(Boolean(res.isCallerSuperAdmin));
      } else {
        setError(res.error || "تعذر تحميل قائمة المسؤولين");
      }
    } catch {
      setError("حدث خطأ أثناء الاتصال بقاعدة البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
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
        setName("");
        setEmail("");
        setPhone("");
        fetchAdmins();
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
    try {
      const res = await toggleAdminStatusAction(admin.id);
      if (res.success) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, active: Boolean(res.active) } : a))
        );
      } else {
        alert(res.error || "فشل تعديل حالة المسؤول");
      }
    } catch {
      alert("تعذر تعديل الحالة");
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget || deleteTarget.isSuperAdmin) return;
    setDeleteLoading(true);
    try {
      const res = await deleteAdminUserAction(deleteTarget.id);
      if (res.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(res.error || "فشل حذف حساب المسؤول");
      }
    } catch {
      alert("تعذر حذف حساب المسؤول");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleResetAdminPassword = async (adm: AdminUserItem) => {
    if (!confirm(`هل أنت متأكد من رغبتك في إعادة تعيين كلمة المرور المؤقتة للمسؤول "${adm.name}"؟`)) {
      return;
    }
    setResetLoadingAdminId(adm.id);
    try {
      const res = await resetAdminTemporaryPasswordAction(adm.id);
      if (res.success && res.temporaryPassword) {
        setCreatedAdmin({
          admin: adm,
          temporaryPassword: res.temporaryPassword,
        });
        fetchAdmins();
      } else {
        alert(res.error || "فشل إعادة تعيين كلمة المرور");
      }
    } catch {
      alert("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setResetLoadingAdminId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>خاصية المدير العام الأساسي (Super Admin)</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <span>إدارة فريق المسؤولين</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            التحكم في حسابات الإدارة وإضافة مسؤولين جدد بصلاحيات كاملة على النظام.
          </p>
        </div>

        {isSuper && (
          <button
            onClick={() => {
              setCreatedAdmin(null);
              setFormError(null);
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مسؤول جديد</span>
          </button>
        )}
      </div>

      {/* Access Guard Notice for regular admins */}
      {!isSuper && !loading && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">تنبيه الصلاحية:</p>
            <p className="leading-relaxed">
              أنت مسجل بصلاحية مسؤول. خاصية إضافة وتعديل المسؤولين الآخرين محصورة بالمدير العام الأساسي (
              <span className="font-mono font-bold" dir="ltr">
                {SUPER_ADMIN_EMAIL}
              </span>
              ).
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">إجمالي المسؤولين</p>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {admins.length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">المسؤولون النشطون</p>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {admins.filter((a) => a.active).length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Crown className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">المدير العام الأساسي</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate max-w-[150px]" dir="ltr">
              {SUPER_ADMIN_EMAIL}
            </p>
          </div>
        </div>
      </div>

      {/* Admins Table Card */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>سجل مسؤولي النظام المعتمدين</span>
          </h2>
          <span className="text-xs font-mono font-bold text-slate-400">{admins.length} مسؤول</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 mx-auto border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs font-semibold">جاري تحميل قائمة المسؤولين...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs font-semibold">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4 font-bold">المسؤول</th>
                  <th className="py-3 px-4 font-bold">البريد الإلكتروني</th>
                  <th className="py-3 px-4 font-bold">رقم الهاتف</th>
                  <th className="py-3 px-4 font-bold">الرتبة</th>
                  <th className="py-3 px-4 font-bold">الحالة</th>
                  <th className="py-3 px-4 font-bold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {admins.map((adm) => (
                  <tr
                    key={adm.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {adm.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{adm.name}</span>
                            {adm.isSuperAdmin && (
                              <span title="المدير العام الأساسي">
                                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </p>
                          {adm.mustChangePassword && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              (بانتظار تغيير كلمة المرور المؤقتة)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                      {adm.email}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                      {adm.phone || "—"}
                    </td>

                    <td className="py-3 px-4">
                      {adm.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                          <Crown className="w-3 h-3 text-amber-500" />
                          <span>المدير الأساسي</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                          مسؤول نظام
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {adm.active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>معطل</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-left">
                      {isSuper && !adm.isSuperAdmin ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleResetAdminPassword(adm)}
                            disabled={resetLoadingAdminId === adm.id}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="إعادة تعيين كلمة المرور المؤقتة"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(adm)}
                            className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
                              adm.active
                                ? "border-slate-200 dark:border-slate-800 text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={adm.active ? "تعطيل الحساب" : "تفعيل الحساب"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(adm)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="حذف المسؤول"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">محمي</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  إضافة مسؤول جديد للنظام
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            {createdAdmin ? (
              /* Success Card with Temporary Password */
              <div className="space-y-4 py-2 animate-in zoom-in-95">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    تم إنشاء حساب المسؤول بنجاح!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    تم إرسال بريد إلكتروني رسمي يحتوي على بيانات الدخول للمسؤول الجديد عبر Gmail SMTP.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block">اسم المسؤول:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {createdAdmin.admin.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">البريد الإلكتروني:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs" dir="ltr">
                      {createdAdmin.admin.email}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] block mb-1">
                      كلمة المرور المؤقتة (Temporary Password):
                    </span>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                      <span dir="ltr">{createdAdmin.temporaryPassword}</span>
                      <button
                        onClick={() => handleCopy(createdAdmin.temporaryPassword)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition flex items-center gap-1 shadow-xs"
                      >
                        {copiedPass ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPass ? "تم النسخ" : "نسخ"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full py-2.5 rounded-xl gold-gradient-btn text-xs font-bold text-white shadow-xs"
                >
                  إغلاق وتحديث القائمة
                </button>
              </div>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    اسم المسؤول بالكامل <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus-within:border-amber-500">
                    <div className="pr-3 text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: م. عبد الله الشمري"
                      className="w-full px-3 py-2 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    البريد الإلكتروني المعتمد <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus-within:border-amber-500">
                    <div className="pr-3 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full px-3 py-2 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    رقم الهاتف (اختياري)
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus-within:border-amber-500">
                    <div className="pr-3 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+9665XXXXXXXX"
                      className="w-full px-3 py-2 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                  <p className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>آلية الأمان وتعيين كلمة المرور:</span>
                  </p>
                  <p>
                    سيقوم النظام بتوليد كلمة مرور مؤقتة فريدة وتوجيه المسؤول لتغييرها إلزامياً عند أول تسجيل دخول.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 rounded-xl gold-gradient-btn text-xs font-bold text-white shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري الإنشاء...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>إنشاء حساب المسؤول</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                تأكيد حذف حساب المسؤول
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                هل أنت متأكد من رغبتك في حذف حساب المسؤول (
                <span className="font-bold text-slate-900 dark:text-white">{deleteTarget.name}</span>
                )؟ لن يتمكن من الدخول للنظام بعد الآن.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition"
              >
                تراجع
              </button>

              <button
                disabled={deleteLoading}
                onClick={handleDeleteAdmin}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {deleteLoading ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
