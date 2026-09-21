"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  Building2,
  FileCheck2,
  KeyRound,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useTheme } from "@/lib/themeContext";
import { SystemUser } from "@/lib/types";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, login, completePasswordChange } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Form State (No static hardcoded users)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveSession, setSaveSession] = useState(true);

  // Mandatory Password Change State (When logging in with a temporary password)
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & UI State
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
    newPassword?: boolean;
    confirmPassword?: boolean;
  }>({});
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // If already logged in and no password change is needed, redirect based on role
  useEffect(() => {
    if (user && !user.mustChangePassword) {
      if (user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "CAPTAIN") {
        router.push("/captain");
      }
    }
  }, [user, router]);

  // Restore saved email preference on mount if user checked "Remember Me" previously
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("miqat_remembered_email");
      const savedSession = localStorage.getItem("miqat_save_session");
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedSession !== null) {
        setSaveSession(savedSession === "true");
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const validateEmail = (val: string): string => {
    if (!val.trim()) {
      return "يرجى إدخال البريد الإلكتروني";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      return "صيغة البريد الإلكتروني غير صحيحة (مثال: name@miqat.com)";
    }
    return "";
  };

  const validatePassword = (val: string): string => {
    if (!val) {
      return "يرجى إدخال كلمة المرور";
    }
    if (val.length < 6) {
      return "كلمة المرور يجب ألا تقل عن 6 خانات";
    }
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setEmail(newVal);
    if (errors.email) {
      setErrors((prev) => ({
        ...prev,
        email: validateEmail(newVal) || undefined,
      }));
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setPassword(newVal);
    if (errors.password) {
      setErrors((prev) => ({
        ...prev,
        password: validatePassword(newVal) || undefined,
      }));
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const handleBlur = (field: "email" | "password" | "newPassword" | "confirmPassword") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      const err = validateEmail(email);
      setErrors((prev) => ({ ...prev, email: err || undefined }));
    } else if (field === "password") {
      const err = validatePassword(password);
      setErrors((prev) => ({ ...prev, password: err || undefined }));
    }
  };

  // Step 1: Standard Login Form Submission
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      setErrors({
        email: emailErr || undefined,
        password: passErr || undefined,
      });
      setTouched({ email: true, password: true });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await login(email, password, saveSession);

      if (res.success && res.mustChangePassword && res.user) {
        // User logged in with temporary password -> Switch to mandatory password change step
        setPendingUser(res.user);
        setIsChangingPassword(true);
        setNewPassword("");
        setConfirmPassword("");
        setTouched({});
        setErrors({});
      } else if (res.success && res.user) {
        // Normal successful login
        if (saveSession) {
          localStorage.setItem("miqat_remembered_email", email.trim().toLowerCase());
          localStorage.setItem("miqat_save_session", "true");
        } else {
          localStorage.removeItem("miqat_remembered_email");
          localStorage.setItem("miqat_save_session", "false");
        }

        setLoginSuccess(true);
        setTimeout(() => {
          if (res.user?.role === "ADMIN") {
            router.push("/admin");
          } else {
            router.push("/captain");
          }
        }, 600);
      } else {
        setErrors({
          general: res.error || "بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور.",
        });
      }
    } catch {
      setErrors({
        general: "حدث خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Mandatory Password Change Submission
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    if (!newPassword || newPassword.length < 6) {
      setErrors({ newPassword: "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف أو أرقام" });
      setTouched({ newPassword: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "تأكيد كلمة المرور غير متطابق مع كلمة المرور الجديدة" });
      setTouched({ confirmPassword: true });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await completePasswordChange(
        pendingUser.id,
        newPassword,
        confirmPassword,
        saveSession
      );

      if (res.success && res.user) {
        setLoginSuccess(true);
        setTimeout(() => {
          if (res.user?.role === "ADMIN") {
            router.push("/admin");
          } else {
            router.push("/captain");
          }
        }, 800);
      } else {
        setErrors({
          general: res.error || "تعذر حفظ كلمة المرور الجديدة، يرجى المحاولة ثانية.",
        });
      }
    } catch {
      setErrors({
        general: "حدث خطأ في حفظ كلمة المرور الجديدة.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPendingUser(null);
    setPassword("");
    setErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-100 via-amber-50/20 to-slate-50 dark:from-[#060a12] dark:via-[#0c121e] dark:to-[#070b13] text-slate-900 dark:text-slate-100 relative selection:bg-amber-500/20 selection:text-amber-800 dark:selection:text-amber-300">
      {/* Ambient Decorative Gradients */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
            <Image
              src="/logo.svg"
              alt="ميقات الخليج"
              width={96}
              height={96}
              className="object-contain w-full h-full"
              priority
            />
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">الوضع النهاري</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline">الوضع الليلي</span>
            </>
          )}
        </button>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-6xl w-full mx-auto my-auto py-6 sm:py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Brand Overview & Official Credentials */}
          <section className="lg:col-span-5 space-y-6 text-right">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-[1.3]">
                منظومة عمليات <br />
                <span className="gold-gradient-text">
                  ميقات الخليج للنقل البري
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                بوابة الدخول المركزية الموحدة لإدارة الأسطول، الفحص اليومي الإلزامي للكباتن، وتوثيق عقود النقل البري المعتمدة وفقاً للائحة الهيئة العامة للنقل.
              </p>
            </div>

            {/* Official Verification Checklist */}
            <div className="p-5 rounded-2xl bg-white/95 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    الرقم الموحد المعتمد
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    7054842252
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    ترخيص هيئة النقل العام
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    35/00009318
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  توثيق فوري للعقود وفحص المركبات التشغيلي اليومي
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: Secure Login / Change Password Card */}
          <section className="lg:col-span-7">
            <div className="p-5 sm:p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-black/50 space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {isChangingPassword ? (
                      <>
                        <KeyRound className="w-5 h-5 text-amber-500" />
                        تعيين كلمة مرور جديدة للحساب
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 text-amber-500" />
                        تسجيل الدخول للنظام
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {isChangingPassword
                      ? "يجب تغيير كلمة المرور المؤقتة لتعيين كلمة مرور خاصة بك قبل المتابعة"
                      : "أدخل البريد الإلكتروني وكلمة المرور المعتمدة للولوج إلى مساحة العمل"}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>اتصال آمن ومشفر</span>
                </div>
              </div>

              {/* General Error Banner */}
              {errors.general && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="flex-1">{errors.general}</div>
                </div>
              )}

              {/* Success Notification */}
              {loginSuccess && (
                <div
                  role="status"
                  className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in"
                >
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {isChangingPassword
                      ? "تم تعيين كلمة المرور بنجاح! جاري التوجيه إلى مساحة العمل..."
                      : "تم التحقق بنجاح! جاري التوجيه لمساحة العمل..."}
                  </span>
                </div>
              )}

              {/* VIEW 1: MANDATORY PASSWORD CHANGE FORM */}
              {isChangingPassword && pendingUser ? (
                <form onSubmit={handlePasswordChangeSubmit} noValidate className="space-y-4 pt-1">
                  {/* Notice Pill */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-black">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>تنبيه أمني إلزامي ({pendingUser.name})</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      لقد سجلت الدخول باستخدام كلمة مرور مؤقتة ({pendingUser.email}). يُرجى إنشاء كلمة مرور جديدة خاصة بك تتكون من 6 خانات على الأقل للمتابعة.
                    </p>
                  </div>

                  {/* New Password Input */}
                  <div>
                    <label
                      htmlFor="new-password"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                    >
                      كلمة المرور الجديدة <span className="text-rose-500">*</span>
                    </label>
                    <div
                      className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                        errors.newPassword && touched.newPassword
                          ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 focus-within:border-amber-500"
                      }`}
                    >
                      <input
                        id="new-password"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        dir="ltr"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                        }}
                        onBlur={() => handleBlur("newPassword")}
                        placeholder="أدخل 6 أحرف/أرقام على الأقل"
                        className="w-full px-4 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1.5 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.newPassword}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirm New Password Input */}
                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                    >
                      تأكيد كلمة المرور الجديدة <span className="text-rose-500">*</span>
                    </label>
                    <div
                      className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                        errors.confirmPassword && touched.confirmPassword
                          ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 focus-within:border-amber-500"
                      }`}
                    >
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        dir="ltr"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        onBlur={() => handleBlur("confirmPassword")}
                        placeholder="أعد إدخال كلمة المرور للتأكيد"
                        className="w-full px-4 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1.5 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.confirmPassword}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={loading || loginSuccess}
                      className="w-full py-3 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-sm font-black shadow-md transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري حفظ كلمة المرور...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>حفظ كلمة المرور والدخول للنظام</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelPasswordChange}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl border theme-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      الرجوع لشاشة تسجيل الدخول
                    </button>
                  </div>
                </form>
              ) : (
                /* VIEW 2: STANDARD LOGIN FORM (NO STATIC/HARDCODED DEFAULTS) */
                <form onSubmit={handleStandardLogin} noValidate className="space-y-4 pt-1">
                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="email"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                    >
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                        البريد الإلكتروني المعتمد
                      </span>
                    </label>

                    <div
                      className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                        errors.email && touched.email
                          ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 focus-within:border-amber-500"
                      }`}
                    >
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        dir="ltr"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={() => handleBlur("email")}
                        placeholder="example@miqat.com"
                        className="w-full px-4 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                      />
                    </div>

                    {errors.email && touched.email && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1.5 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <label
                      htmlFor="current-password"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                    >
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                        كلمة المرور
                      </span>
                    </label>

                    <div
                      className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                        errors.password && touched.password
                          ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 focus-within:border-amber-500"
                      }`}
                    >
                      <input
                        id="current-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        dir="ltr"
                        value={password}
                        onChange={handlePasswordChange}
                        onBlur={() => handleBlur("password")}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {errors.password && touched.password && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1.5 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.password}</span>
                      </p>
                    )}
                  </div>

                  {/* Save Session & Forgot Password */}
                  <div className="flex items-center justify-between pt-1">
                    <label htmlFor="save-session" className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="save-session"
                        checked={saveSession}
                        onChange={(e) => setSaveSession(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-500"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        تذكرني على هذا الجهاز
                      </span>
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition"
                    >
                      نسيت كلمة المرور؟
                    </Link>
                  </div>

                  {/* Submit Action */}
                  <button
                    type="submit"
                    disabled={loading || loginSuccess}
                    className="w-full py-3 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-sm font-black shadow-md transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري التحقق والولوج...</span>
                      </>
                    ) : (
                      <>
                        <span>تسجيل الدخول</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 relative z-10 font-medium">
        <span>شركة ميقات الخليج للنقل البري © 2026 - جميع الحقوق محفوظة</span>
        <span className="font-mono">مكة المكرمة • المملكة العربية السعودية</span>
      </footer>
    </div>
  );
}
