"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useTheme } from "@/lib/themeContext";
import { UserRole } from "@/lib/types";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, login, quickLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Form State
  const [email, setEmail] = useState("admin@miqat.com");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [saveSession, setSaveSession] = useState(true);

  // Validation & UI State
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
  }>({});
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // If already logged in, redirect based on role
  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "CAPTAIN") {
        router.push("/captain");
      }
    }
  }, [user, router]);

  // Restore saved session preferences on mount
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

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      const err = validateEmail(email);
      setErrors((prev) => ({ ...prev, email: err || undefined }));
    } else if (field === "password") {
      const err = validatePassword(password);
      setErrors((prev) => ({ ...prev, password: err || undefined }));
    }
  };

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
      const ok = await login(email, undefined, saveSession);

      if (ok) {
        if (saveSession) {
          localStorage.setItem("miqat_remembered_email", email.trim().toLowerCase());
          localStorage.setItem("miqat_save_session", "true");
        } else {
          localStorage.removeItem("miqat_remembered_email");
          localStorage.setItem("miqat_save_session", "false");
        }

        setLoginSuccess(true);
      } else {
        setErrors({
          general: "بيانات الدخول غير صحيحة أو الحساب غير مسجل في النظام.",
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

  const handleQuickLogin = async (role: UserRole) => {
    setLoading(true);
    setErrors({});
    const ok = await quickLogin(role, saveSession);
    if (ok) {
      setLoginSuccess(true);
    } else {
      setErrors({
        general: `تعذر الدخول السريع بحساب ${role === "ADMIN" ? "المدير العام" : "الكابتن"}`,
      });
      setLoading(false);
    }
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
          {/* Left Column: Brand Overview */}
          <section className="lg:col-span-5 space-y-6 text-right">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-[1.3]">
                منظومة عمليات <br />
                <span className="gold-gradient-text">
                  ميقات الخليج للنقل البري
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                هندسة برمجية متطورة بنظام الصلاحيتين المزدوج (المدير العام والكابتن). إدارة الأسطول، الفحص اليومي الإلزامي، وتوثيق عقود النقل البري المعتمدة وفقاً للائحة هيئة النقل.
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
                  إصدار فوري للعقد الموحد (3 صفحات مع كشف الركاب والفحص)
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: Login Card & Quick Roles */}
          <section className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-black/50 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    تسجيل الدخول للنظام
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    أدخل بيانات حسابك المعتمد أو استخدم الدخول السريع
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>اتصال مشفر</span>
                </div>
              </div>

              {/* General Error Banner */}
              {errors.general && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="flex-1">{errors.general}</div>
                </div>
              )}

              {/* Success Notification */}
              {loginSuccess && (
                <div
                  role="status"
                  className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5"
                >
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>تم التحقق بنجاح! جاري التوجيه لمساحة العمل...</span>
                </div>
              )}

              {/* Quick Login Role Cards */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  دخول سريع حسب الصلاحية:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("ADMIN")}
                    disabled={loading || loginSuccess}
                    className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition text-right group flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-amber-700 dark:text-amber-400">
                        المدير العام (Main Admin)
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        admin@miqat.com
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-500 group-hover:-translate-x-1 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("CAPTAIN")}
                    disabled={loading || loginSuccess}
                    className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition text-right group flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                        كابتن الميدان (Captain)
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        captain@miqat.com
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:-translate-x-1 transition" />
                  </button>
                </div>
              </div>

              {/* Standard Login Form */}
              <form onSubmit={handleStandardLogin} noValidate className="space-y-4 pt-2 border-t theme-border">
                {/* Email Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="email"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                      <span>البريد الإلكتروني</span>
                    </label>
                  </div>

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
                      placeholder="admin@miqat.com"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="current-password"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                      <span>كلمة المرور</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">(123456)</span>
                  </div>

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

                {/* Save Session */}
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
                      حفظ تسجيل الدخول على هذا الجهاز
                    </span>
                  </label>
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
