"use client";
import Modal from "./Modal";

import React, { useState } from "react";
import {
  X,
  User,
  Mail,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Car,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { updateUserProfileAction, changeUserPasswordAction } from "@/app/_actions/auth";
import ImageUpload from "./ImageUpload";
import { invalidateClientCache } from "@/lib/clientCache";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profile" | "password";
}

export default function ProfileModal(props: ProfileModalProps) {
  const { user } = useAuth();
  if (!props.isOpen || !user) return null;
  return <ProfileModalContent key={`${user.id}:${props.initialTab}`} {...props} />;
}

function ProfileModalContent({
  isOpen,
  onClose,
  initialTab = "profile",
}: ProfileModalProps) {
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"profile" | "password">(initialTab);

  // Profile Edit State
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  if (!isOpen || !user) return null;

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("الاسم مطلوب");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const res = await updateUserProfileAction(user.id, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.user) {
      updateUser(res.user);
      invalidateClientCache("captains_list");
      invalidateClientCache("admins_list");
      invalidateClientCache("dashboard_stats");
      setSuccessMsg("تم تحديث وحفظ بيانات الملف الشخصي بنجاح!");

    } else {
      setError(res.error || "فشل حفظ التعديلات");
    }
  };

  // Handle Voluntary Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    const cleanCur = currentPassword;
    const cleanNew = newPassword;
    const cleanConf = confirmPassword;

    if (!cleanCur) {
      setPassError("يرجى إدخال كلمة المرور الحالية");
      return;
    }

    if (!cleanNew || cleanNew.length < 8) {
      setPassError("كلمة المرور الجديدة يجب ألا تقل عن 8 خانات");
      return;
    }

    if (cleanNew !== cleanConf) {
      setPassError("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }

    if (cleanCur === cleanNew) {
      setPassError("كلمة المرور الجديدة يجب أن تختلف عن كلمة المرور الحالية");
      return;
    }

    setIsChangingPass(true);

    try {
      const res = await changeUserPasswordAction({
        userId: user.id,
        currentPassword: cleanCur,
        newPassword: cleanNew,
        confirmPassword: cleanConf,
      });

      if (res.success) {
        setPassSuccess("تم تغيير كلمة المرور بنجاح!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

      } else {
        setPassError(res.error || "تعذر تغيير كلمة المرور");
      }
    } catch {
      setPassError("حدث خطأ غير متوقع أثناء تغيير كلمة المرور");
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <Modal label="الملف الشخصي" onClose={onClose} isBusy={isSubmitting || isChangingPass}>
      <div className="mobile-dialog-panel relative w-full max-w-lg flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              {activeTab === "profile" ? (
                <User className="w-5 h-5" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {activeTab === "profile" ? "الملف الشخصي" : "تغيير كلمة المرور"}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {activeTab === "profile"
                  ? "تحديث الصورة الشخصية والبيانات الأساسية"
                  : "تعيين كلمة مرور جديدة وآمنة لحسابك"}
              </p>
            </div>
          </div>
          <button
            disabled={isSubmitting || isChangingPass} onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b theme-border px-5 gap-2 pt-1 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("profile");
              setError(null);
              setPassError(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "profile"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>البيانات الشخصية</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("password");
              setError(null);
              setPassError(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "password"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>تغيير كلمة المرور</span>
          </button>
        </div>

        {/* Tab 1: Profile Form */}
        {activeTab === "profile" && (
          <form
            onSubmit={handleProfileSubmit}
            className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1"
          >
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Profile Picture Upload */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border">
              <ImageUpload
                value={avatarUrl}
                onChange={(url) => setAvatarUrl(url)}
                onRemove={() => setAvatarUrl("")}
                label="الصورة الشخصية"
                shape="circle"
                size="md"
              />
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الاسم الكامل *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم المستخدم"
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رقم الجوال
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono text-right"
                  />
                </div>
              </div>
            </div>

            {/* Read-Only System Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border theme-border space-y-2 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  البريد الإلكتروني:
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold" dir="ltr">
                  {user.email}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  نوع الحساب:
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {user.role === "ADMIN" ? "المدير العام (Admin)" : "كابتن ميداني (Captain)"}
                </span>
              </div>

              {user.nationalId && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    رقم الهوية:
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                    {user.nationalId}
                  </span>
                </div>
              )}

              {user.assignedVehiclePlate && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    المركبة المسندة:
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                    {user.assignedVehiclePlate}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting || isChangingPass} onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border theme-card hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password Form */}
        {activeTab === "password" && (
          <form
            onSubmit={handlePasswordSubmit}
            className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1"
          >
            {passError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                <span>أمان الحساب:</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                يجب ألا تقل كلمة المرور الجديدة عن 8 خانات، وتختلف عن كلمة المرور الحالية.
              </p>
            </div>

            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                كلمة المرور الحالية *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  required
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                كلمة المرور الجديدة *
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة مرور جديدة (8 خانات على الأقل)"
                  required
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تأكيد كلمة المرور الجديدة *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد"
                  required
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting || isChangingPass} onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border theme-card hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isChangingPass}
                className="px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isChangingPass ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>تحديث كلمة المرور</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
