"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  KeyRound,
  Mail,
  Send,
} from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import {
  verifyResetTokenAction,
  resetPasswordWithTokenAction,
  requestPasswordResetAction,
} from "@/app/_actions/auth";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  // Form Inputs
  const [emailInput, setEmailInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [isAutoVerified, setIsAutoVerified] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Inspect Query Params on mount
  useEffect(() => {
    let active = true;

    async function initializeVerification() {
      const queryToken = searchParams?.get("token") || "";
      const queryEmail = searchParams?.get("email") || "";

      if (queryEmail) {
        setEmailInput(queryEmail);
      }

      if (queryToken && queryEmail) {
        const cleanTok = queryToken.trim().replace(/\s+/g, "").replace(/-/g, "");
        setTokenInput(cleanTok);

        try {
          const res = await verifyResetTokenAction({
            email: queryEmail,
            token: cleanTok,
          });

          if (active) {
            if (res.success && res.valid) {
              setIsAutoVerified(true);
              setInfoMessage("تم التحقق من الرابط بنجاح! يُرجى إدخال كلمة المرور الجديدة أدناه.");
            } else {
              setErrorMessage(res.error || "رمز التحقق أو الرابط غير صالح أو انتهت صلاحيته.");
            }
            setIsVerifyingSession(false);
          }
        } catch {
          if (active) {
            setErrorMessage("تعذر التحقق من صحة الرابط.");
            setIsVerifyingSession(false);
          }
        }
      } else {
        // No token in query params -> Show form immediately without delay
        if (active) {
          setIsVerifyingSession(false);
        }
      }
    }

    initializeVerification();

    return () => {
      active = false;
    };
  }, [searchParams]);

  // Request/Resend Code
  const handleResendCode = async () => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("يرجى إدخال البريد الإلكتروني أولاً لإرسال رمز التحقق إليه.");
      return;
    }

    setResendingCode(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const res = await requestPasswordResetAction(cleanEmail);

      if (res.success) {
        setInfoMessage(res.message || "تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح.");
        setIsAutoVerified(false);
        setTokenInput("");
      } else {
        setErrorMessage(res.error || "تعذر إرسال الرمز.");
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء إرسال رمز التحقق.");
    } finally {
      setResendingCode(false);
    }
  };

  // Submit Password Reset
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanToken = tokenInput.trim().replace(/\s+/g, "").replace(/-/g, "");
    const cleanPass = newPassword;
    const cleanConfirm = confirmPassword;

    if (!cleanEmail) {
      setErrorMessage("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (!cleanToken) {
      setErrorMessage("يرجى إدخال رمز التحقق المرسل بالبريد");
      return;
    }

    if (cleanToken.length < 6) {
      setErrorMessage("رمز التحقق غير مكتمل");
      return;
    }

    if (!cleanPass || cleanPass.length < 8) {
      setErrorMessage("كلمة المرور الجديدة يجب ألا تقل عن 8 خانات");
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordWithTokenAction({
        email: cleanEmail,
        token: cleanToken,
        newPassword: cleanPass,
        confirmPassword: cleanConfirm,
      });

      if (res.success) {
        setSuccessMessage("تم تعيين وتحديث كلمة المرور بنجاح! جاري تحويلك...");
        setLoading(false);

        setTimeout(() => {
          router.push("/login");
        }, 1800);
        return;
      }

      setErrorMessage(res.error || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
      setLoading(false);
    } catch {
      setErrorMessage("حدث خطأ غير متوقع أثناء معالجة الطلب.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-hidden"
      dir="rtl"
    >
      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-slate-400/5 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between relative z-10">
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لتسجيل الدخول</span>
        </Link>

        <button
          onClick={toggleTheme}
          type="button"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:border-amber-500/50 text-slate-700 dark:text-slate-300 transition shadow-xs cursor-pointer"
          title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
          aria-label="تبديل المظهر"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/95 dark:bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
            {/* Brand Logo & Header */}
            <div className="text-center mb-6">
              <div className="inline-flex justify-center mb-4">
                <Image
                  src="/logo.svg"
                  alt="ميقات الخليج"
                  width={150}
                  height={45}
                  className="h-9 w-auto object-contain"
                  priority
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تعيين كلمة المرور</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                إعادة تعيين كلمة المرور
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                أدخل كلمة المرور الجديدة لحسابك لتأكيد التحديث والولوج للنظام
              </p>
            </div>

            {/* Verifying Session Loader */}
            {isVerifyingSession && (
              <div className="py-10 text-center space-y-3">
                <div className="w-8 h-8 mx-auto border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  جاري التحقق من صلاحية الرابط...
                </p>
              </div>
            )}

            {/* Info Message */}
            {!isVerifyingSession && infoMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <span className="font-semibold">{infoMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {!isVerifyingSession && errorMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Success State */}
            {!isVerifyingSession && successMessage && (
              <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {successMessage}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    جاري توجيهك تلقائياً إلى صفحة تسجيل الدخول...
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="w-full py-2.5 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-xs font-bold text-white shadow-xs"
                  >
                    <span>الانتقال لتسجيل الدخول الآن</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Password Reset Form */}
            {!isVerifyingSession && !successMessage && (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="reset-email"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                  >
                    البريد الإلكتروني <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="pr-3 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      dir="ltr"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@example.com"
                      readOnly={isAutoVerified}
                      className={`w-full px-3 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left ${
                        isAutoVerified ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Verification Code / Token Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="reset-token"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      رمز التحقق <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendingCode}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      {resendingCode ? (
                        <span>جاري الإرسال...</span>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>إرسال رمز جديد</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="pr-3 text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-token"
                      type="text"
                      required
                      dir="ltr"
                      value={tokenInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\s+/g, "").replace(/-/g, "");
                        setTokenInput(val);
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder="أدخل رمز التحقق (مثل: 739104)"
                      readOnly={isAutoVerified && tokenInput.length > 0}
                      className="w-full px-3 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-center tracking-widest font-bold"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                  >
                    كلمة المرور الجديدة <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="pr-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      dir="ltr"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل 8 خانات على الأقل"
                      className="w-full px-3 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition cursor-pointer"
                      aria-label={showNewPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                  >
                    تأكيد كلمة المرور الجديدة <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="pr-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      dir="ltr"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور للتأكيد"
                      className="w-full px-3 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition cursor-pointer"
                      aria-label={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl gold-gradient-btn text-xs font-black text-white shadow-md disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جاري تعيين كلمة المرور...</span>
                    </>
                  ) : (
                    <span>تأكيد وتعيين كلمة المرور</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-500 relative z-10">
        <p>© {new Date().getFullYear()} شركة ميقات الخليج للنقل البري. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#080c14]">
          <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
