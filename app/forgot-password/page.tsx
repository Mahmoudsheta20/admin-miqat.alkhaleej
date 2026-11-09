"use client";
import AuthShell from "@/app/_components/AuthShell";
import { useUiText } from "@/lib/ui-text";


import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { requestPasswordResetAction } from "@/app/_actions/auth";

export default function ForgotPasswordPage() {
  const ui = useUiText();


  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = (val: string): string => {
    const clean = val.trim();
    if (!clean) return "يرجى إدخال البريد الإلكتروني";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) return "صيغة البريد الإلكتروني غير صحيحة";
    return "";
  };

  const emailError = emailTouched ? validateEmail(email) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);

    const cleanEmail = email.trim().toLowerCase();
    const err = validateEmail(cleanEmail);
    if (err) {
      setErrorMessage(err);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await requestPasswordResetAction(cleanEmail);

      if (!res.success) {
        setErrorMessage(
          res.error || "تعذر إرسال رابط إعادة التعيين. يرجى التأكد من صحة البريد الإلكتروني."
        );
        setLoading(false);
        return;
      }

      // Success
      setSubmitted(true);
      setLoading(false);
    } catch {
      setErrorMessage("حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.");
      setLoading(false);
    }
  };

  return <AuthShell hasBackLink title={ui("نسيت كلمة المرور؟")} description={ui("أدخل بريدك الإلكتروني وسنرسل لك رمزاً ورابطاً آمناً لإعادة تعيين كلمة المرور")}>

            {/* Error Message Alert */}
            {errorMessage && (
              <div role="alert" className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in-50">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                <span className="font-semibold">{ui(errorMessage)}</span>
              </div>
            )}

            {/* Success State */}
            {submitted ? (
              <div role="status" className="text-center py-4 space-y-4 animate-in zoom-in-95">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {ui("تم إرسال رمز ورابط إعادة التعيين بنجاح!")}</h2>
                  <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 mt-2 leading-relaxed">
                    {ui("يُرجى فحص صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها) في بريدك الإلكتروني")}<bdi className="font-mono font-bold text-amber-700 dark:text-amber-400 mx-1" dir="ltr">
                      {email}
                    </bdi>
                    {ui("يمكنك إما الضغط على الرابط في البريد، أو إدخال رمز التحقق المكون من 6 أرقام مباشرة.")}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <Link
                    href={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                    className="w-full min-h-11 py-2.5 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-xs font-bold shadow-xs"
                  >
                    <span>{ui("إدخال رمز التحقق وإعادة التعيين")}</span>
                    <ArrowLeft className="w-4 h-4 ltr:rotate-180" aria-hidden="true" />
                  </Link>

                  <div className="flex items-center justify-between px-1 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setErrorMessage("");
                      }}
                      className="min-h-10 text-[var(--text-muted)] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      {ui("إعادة إرسال لبريد آخر")}</button>

                    <Link
                      href="/login"
                      className="min-h-10 inline-flex items-center text-[var(--text-muted)] hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-400 transition"
                    >
                      {ui("العودة لشاشة الدخول")}</Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Request Form */
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5"
                  >
                    {ui("البريد الإلكتروني المعتمد")}</label>

                  <div
                    className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                      emailError
                        ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                        : "border-slate-300 dark:border-slate-700 bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 focus-within:border-amber-500"
                    }`}
                  >
                    <div className="ps-3 text-[var(--text-muted)]">
                      <Mail className="w-4 h-4" aria-hidden="true" />
                    </div>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      dir="ltr"
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "forgot-email-error" : undefined}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage("");
                      }}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="example@miqat.com"
                      className="w-full px-3 py-2.5 bg-transparent text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-start"
                    />
                  </div>

                  {emailError && (
                    <p id="forgot-email-error" role="alert" className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1 mt-1.5 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{ui(emailError)}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-11 py-3 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-sm font-semibold shadow-md transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      <span>{ui("جاري إرسال الرابط...")}</span>
                    </>
                  ) : (
                    <>
                      <span>{ui("إرسال رابط إعادة التعيين")}</span>
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex min-h-10 items-center text-xs font-bold text-[var(--text-muted)] hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-400 transition"
                  >
                    {ui("تذكرت كلمة المرور؟ تسجيل الدخول")}</Link>
                </div>
              </form>
            )}
          </AuthShell>;
}
