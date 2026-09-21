"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/lib/themeContext";
import { requestPasswordResetAction } from "@/app/_actions/auth";

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();

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
      const siteUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "https://admin.miqatalkhaleej.com/reset-password";

      // 1. Send via verified Gmail SMTP Server Action with exact client origin
      const clientOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
      const res = await requestPasswordResetAction(cleanEmail, clientOrigin);

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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-hidden" dir="rtl">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-slate-400/5 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between relative z-10">
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لتسجيل الدخول</span>
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:border-amber-500/50 text-slate-700 dark:text-slate-300 transition shadow-xs"
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/95 dark:bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
            {/* Logo and Heading */}
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
                <span>استعادة حساب النظام</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                نسيت كلمة المرور؟
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                أدخل بريدك الإلكتروني وسنرسل لك رمزاً ورابطاً آمناً لإعادة تعيين كلمة المرور
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in-50">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Success State */}
            {submitted ? (
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    تم إرسال رمز ورابط إعادة التعيين بنجاح!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    يُرجى فحص صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها) في بريدك الإلكتروني
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 mx-1" dir="ltr">
                      {email}
                    </span>
                    يمكنك إما الضغط على الرابط في البريد، أو إدخال رمز التحقق المكون من 6 أرقام مباشرة.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <Link
                    href={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                    className="w-full py-2.5 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-xs font-bold text-white shadow-xs"
                  >
                    <span>إدخال رمز التحقق وإعادة التعيين</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>

                  <div className="flex items-center justify-between px-1 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setErrorMessage("");
                      }}
                      className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      إعادة إرسال لبريد آخر
                    </button>

                    <Link
                      href="/login"
                      className="text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition"
                    >
                      العودة لشاشة الدخول
                    </Link>
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
                    البريد الإلكتروني المعتمد
                  </label>

                  <div
                    className={`relative flex items-center rounded-xl border transition-all duration-200 ${
                      emailError
                        ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                        : "border-slate-300 dark:border-slate-700 bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 focus-within:border-amber-500"
                    }`}
                  >
                    <div className="pr-3 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage("");
                      }}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="example@miqat.com"
                      className="w-full px-3 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden font-mono text-left"
                    />
                  </div>

                  {emailError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1.5 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl gold-gradient-btn flex items-center justify-center gap-2 text-sm font-black shadow-md transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري إرسال الرابط...</span>
                    </>
                  ) : (
                    <>
                      <span>إرسال رابط إعادة التعيين</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-xs font-bold text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition"
                  >
                    تذكرت كلمة المرور؟ تسجيل الدخول
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 px-4 relative z-10 font-medium">
        <span>شركة ميقات الخليج للنقل البري © 2026 - جميع الحقوق محفوظة</span>
        <span className="font-mono text-[11px] text-slate-400">نظام المصادقة الآمن عبر Supabase & Gmail SMTP</span>
      </footer>
    </div>
  );
}
