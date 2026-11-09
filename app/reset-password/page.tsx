"use client";
import AuthShell from "@/app/_components/AuthShell";
import { useUiText } from "@/lib/ui-text";


import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, Mail, Send } from "lucide-react";
import { verifyResetTokenAction, resetPasswordWithTokenAction, requestPasswordResetAction } from "@/app/_actions/auth";

function ResetPasswordContent() {
  const ui = useUiText();

  const router = useRouter();
  const searchParams = useSearchParams();

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
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

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

        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => {
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

  return <AuthShell hasBackLink title={ui("إعادة تعيين كلمة المرور")} description={ui("أدخل كلمة المرور الجديدة لحسابك لتأكيد التحديث والولوج للنظام")}>

            {/* Verifying Session Loader */}
            {isVerifyingSession && (
              <div role="status" className="py-10 text-center space-y-3">
                <div className="w-8 h-8 mx-auto border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" aria-hidden="true" />
                <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 font-semibold">
                  {ui("جاري التحقق من صلاحية الرابط...")}</p>
              </div>
            )}

            {/* Info Message */}
            {!isVerifyingSession && infoMessage && (
              <div role="status" className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span className="font-semibold">{ui(infoMessage)}</span>
              </div>
            )}

            {/* Error Message */}
            {!isVerifyingSession && errorMessage && (
              <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                <span className="font-semibold">{ui(errorMessage)}</span>
              </div>
            )}

            {/* Success State */}
            {!isVerifyingSession && successMessage && (
              <div role="status" className="text-center py-6 space-y-4 animate-in zoom-in-95">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {ui(successMessage)}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 mt-2">
                    {ui("جاري توجيهك تلقائياً إلى صفحة تسجيل الدخول...")}</p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="w-full min-h-11 py-2.5 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-xs font-bold shadow-xs"
                  >
                    <span>{ui("الانتقال لتسجيل الدخول الآن")}</span>
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
                    {ui("البريد الإلكتروني")}<span className="text-rose-700" aria-hidden="true">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="ps-3 text-[var(--text-muted)]">
                      <Mail className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      dir="ltr"
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@example.com"
                      readOnly={isAutoVerified}
                      className={`w-full px-3 py-2.5 bg-transparent text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-start ${
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
                      {ui("رمز التحقق")}<span className="text-rose-700" aria-hidden="true">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendingCode}
                      className="min-h-10 sm:min-h-8 px-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      {resendingCode ? (
                        <span>{ui("جاري الإرسال...")}</span>
                      ) : (
                        <>
                          <Send className="w-3 h-3" aria-hidden="true" />
                          <span>{ui("إرسال رمز جديد")}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="ps-3 text-[var(--text-muted)]">
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="reset-token"
                      type="text"
                      required
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={tokenInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\s+/g, "").replace(/-/g, "");
                        setTokenInput(val);
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder={ui("أدخل رمز التحقق (مثل: 739104)")}
                      readOnly={isAutoVerified && tokenInput.length > 0}
                      className="w-full px-3 py-2.5 bg-transparent text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-center tracking-widest font-bold"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                  >
                    {ui("كلمة المرور الجديدة")}<span className="text-rose-700" aria-hidden="true">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="ps-3 text-[var(--text-muted)]">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      dir="ltr"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={ui("أدخل 8 خانات على الأقل")}
                      className="w-full px-3 py-2.5 bg-transparent text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-start"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-pressed={showNewPassword}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                      aria-label={ui(showNewPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور")}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                  >
                    {ui("تأكيد كلمة المرور الجديدة")}<span className="text-rose-700" aria-hidden="true">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 focus-within:bg-white dark:bg-slate-900/70 focus-within:border-amber-500 transition-all">
                    <div className="ps-3 text-[var(--text-muted)]">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      dir="ltr"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={ui("أعد إدخال كلمة المرور للتأكيد")}
                      className="w-full px-3 py-2.5 bg-transparent text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-start"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-pressed={showConfirmPassword}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                      aria-label={ui(showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور")}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-11 mt-2 py-3 rounded-xl gold-gradient-btn text-xs font-semibold shadow-md disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" />
                      <span>{ui("جاري تعيين كلمة المرور...")}</span>
                    </>
                  ) : (
                    <span>{ui("تأكيد وتعيين كلمة المرور")}</span>
                  )}
                </button>
              </form>
            )}
          </AuthShell>;
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
