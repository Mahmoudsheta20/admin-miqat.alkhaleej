"use client";
import { useUiText } from "@/lib/ui-text";

import Modal from "./Modal";

import React, { useId, useState } from "react";
import { X, User, Mail, Shield, CheckCircle2, AlertTriangle, Car, CreditCard, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
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
  const ui = useUiText();

  const { user, updateUser } = useAuth();
  const fieldPrefix = useId();
  const nameId = `${fieldPrefix}-name`;
  const phoneId = `${fieldPrefix}-phone`;
  const curPassId = `${fieldPrefix}-cur-pass`;
  const newPassId = `${fieldPrefix}-new-pass`;
  const confirmPassId = `${fieldPrefix}-confirm-pass`;

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
    <Modal label={ui("الملف الشخصي")} onClose={onClose} isBusy={isSubmitting || isChangingPass}>
      <div className="mobile-dialog-panel relative w-full max-w-lg flex flex-col theme-card rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border theme-border">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border theme-card-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-[var(--accent-gold)] flex items-center justify-center font-bold shrink-0">
              {activeTab === "profile" ? (
                <User className="w-5 h-5" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                {ui(activeTab === "profile" ? "الملف الشخصي" : "تغيير كلمة المرور")}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {ui(activeTab === "profile"
                  ? "تحديث الصورة الشخصية والبيانات الأساسية"
                  : "تعيين كلمة مرور جديدة وآمنة لحسابك")}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting || isChangingPass} onClick={onClose}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer"
            aria-label={ui("إغلاق")}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div role="tablist" aria-label={ui("أقسام الملف الشخصي")} className="flex border-b theme-border px-5 gap-2 pt-1 bg-[var(--bg-card-subtle)] shrink-0">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            onClick={() => {
              setActiveTab("profile");
              setError(null);
              setPassError(null);
            }}
            className={`min-h-11 px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "profile"
                ? "border-[var(--accent-gold)] text-[var(--accent-gold)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{ui("البيانات الشخصية")}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "password"}
            onClick={() => {
              setActiveTab("password");
              setError(null);
              setPassError(null);
            }}
            className={`min-h-11 px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "password"
                ? "border-[var(--accent-gold)] text-[var(--accent-gold)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{ui("تغيير كلمة المرور")}</span>
          </button>
        </div>

        {/* Tab 1: Profile Form */}
        {activeTab === "profile" && (
          <form
            onSubmit={handleProfileSubmit}
            className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1"
          >
            {error && (
              <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div role="status" className="p-3 rounded-xl bg-emerald-500/12 border border-emerald-600/35 text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{ui(successMsg)}</span>
              </div>
            )}

            {/* Profile Picture Upload */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border">
              <ImageUpload
                value={avatarUrl}
                onChange={(url) => setAvatarUrl(url)}
                onRemove={() => setAvatarUrl("")}
                label={ui("الصورة الشخصية")}
                shape="circle"
                size="md"
              />
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={nameId} className="block text-xs font-bold text-[var(--text-main)] mb-1.5">
                  {ui("الاسم الكامل *")}</label>
                <div className="relative">
                  <input
                    id={nameId}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={ui("اسم المستخدم")}
                    required
                    className="theme-input w-full min-h-11 sm:min-h-9 px-3 py-1.5 text-base sm:text-[0.8125rem] rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={phoneId} className="block text-xs font-bold text-[var(--text-main)] mb-1.5">
                  {ui("رقم الجوال")}</label>
                <div className="relative">
                  <input
                    id={phoneId}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className="theme-input w-full min-h-11 sm:min-h-9 px-3 py-1.5 text-base sm:text-[0.8125rem] rounded-lg font-mono text-start"
                  />
                </div>
              </div>
            </div>

            {/* Read-Only System Info */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border space-y-2 text-xs text-[var(--text-muted)]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                  {ui("البريد الإلكتروني:")}</span>
                <span className="font-mono text-[var(--text-main)] font-bold truncate" dir="ltr">
                  {user.email}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                  {ui("نوع الحساب:")}</span>
                <span className="font-bold text-[var(--accent-gold)]">
                  {ui(user.role === "ADMIN" ? "المدير العام (Admin)" : "كابتن ميداني (Captain)")}
                </span>
              </div>

              {user.nationalId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                    {ui("رقم الهوية:")}</span>
                  <span className="font-mono text-[var(--text-main)] font-bold" dir="ltr">
                    {user.nationalId}
                  </span>
                </div>
              )}

              {user.assignedVehiclePlate && (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                    {ui("المركبة المسندة:")}</span>
                  <span className="font-mono text-[var(--text-main)] font-bold">
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
                className="min-h-11 sm:min-h-9 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer"
              >
                {ui("إلغاء")}</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-11 sm:min-h-9 px-5 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {ui(isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات")}
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
              <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div role="status" className="p-3 rounded-xl bg-emerald-500/12 border border-emerald-600/35 text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{ui(passSuccess)}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-xs text-[var(--text-main)] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-[var(--accent-gold)]">
                <Shield className="w-4 h-4" aria-hidden="true" />
                <span>{ui("أمان الحساب:")}</span>
              </p>
              <p className="text-xs leading-relaxed">
                {ui("يجب ألا تقل كلمة المرور الجديدة عن 8 خانات، وتختلف عن كلمة المرور الحالية.")}</p>
            </div>

            {/* Current Password */}
            <div>
              <label htmlFor={curPassId} className="block text-xs font-bold text-[var(--text-main)] mb-1.5">
                {ui("كلمة المرور الحالية *")}</label>
              <div dir="ltr" className="relative flex items-center">
                <input
                  id={curPassId}
                  type={showCurrentPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={ui("أدخل كلمة المرور الحالية")}
                  required
                  dir="ltr"
                  className="theme-input w-full min-h-11 sm:min-h-9 ps-3 pe-10 py-1.5 text-base sm:text-[0.8125rem] rounded-lg font-mono text-start"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  aria-label={ui(showCurrentPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور")}
                  aria-pressed={showCurrentPass}
                  className="absolute end-1 h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor={newPassId} className="block text-xs font-bold text-[var(--text-main)] mb-1.5">
                {ui("كلمة المرور الجديدة *")}</label>
              <div dir="ltr" className="relative flex items-center">
                <input
                  id={newPassId}
                  type={showNewPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={ui("كلمة مرور جديدة (8 خانات على الأقل)")}
                  required
                  dir="ltr"
                  className="theme-input w-full min-h-11 sm:min-h-9 ps-3 pe-10 py-1.5 text-base sm:text-[0.8125rem] rounded-lg font-mono text-start"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  aria-label={ui(showNewPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور")}
                  aria-pressed={showNewPass}
                  className="absolute end-1 h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor={confirmPassId} className="block text-xs font-bold text-[var(--text-main)] mb-1.5">
                {ui("تأكيد كلمة المرور الجديدة *")}</label>
              <div dir="ltr" className="relative flex items-center">
                <input
                  id={confirmPassId}
                  type={showConfirmPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={ui("أعد إدخال كلمة المرور الجديدة للتأكيد")}
                  required
                  dir="ltr"
                  className="theme-input w-full min-h-11 sm:min-h-9 ps-3 pe-10 py-1.5 text-base sm:text-[0.8125rem] rounded-lg font-mono text-start"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  aria-label={ui(showConfirmPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور")}
                  aria-pressed={showConfirmPass}
                  className="absolute end-1 h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting || isChangingPass} onClick={onClose}
                className="min-h-11 sm:min-h-9 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer"
              >
                {ui("إلغاء")}</button>
              <button
                type="submit"
                disabled={isChangingPass}
                className="min-h-11 sm:min-h-9 px-5 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isChangingPass ? (
                  <>
                    <div aria-hidden="true" className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>{ui("جاري التحديث...")}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{ui("تحديث كلمة المرور")}</span>
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
