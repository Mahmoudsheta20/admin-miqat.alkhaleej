"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import { useStoredPreference, setStoredPreference } from "@/lib/useStoredPreference";
import type { SystemUser } from "@/lib/types";
import AuthShell from "@/app/_components/AuthShell";
import { CustomInput } from "@/app/_components/form/CustomInput";
import { Checkbox } from "@/app/_components/ui";
interface LoginErrors { email?: string; password?: string; confirmation?: string; general?: string }
export default function LoginPage() {
  const router = useRouter();
  const { user, login, logout, completePasswordChange } = useAuth();
  const { language } = useLanguage();
  const text = (ar: string, en: string) => language === "ar" ? ar : en;
  const savedEmail = useStoredPreference("miqat_remembered_email", "");
  const [emailInput, setEmail] = useState<string | null>(null);
  const email = emailInput ?? savedEmail;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pendingUser, setPendingUser] = useState<SystemUser | null>(null);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useEffect(() => { if (user && !user.mustChangePassword) router.replace(user.role === "ADMIN" ? "/admin" : "/captain"); }, [user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const next: LoginErrors = {};
    if (!pendingUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = text("أدخل بريداً إلكترونياً صحيحاً", "Enter a valid email address");
    if (password.length < (pendingUser ? 8 : 6)) next.password = text(pendingUser ? "استخدم 8 أحرف على الأقل" : "استخدم 6 أحرف على الأقل", pendingUser ? "Use at least 8 characters" : "Use at least 6 characters");
    if (pendingUser && password !== confirmation) next.confirmation = text("كلمتا المرور غير متطابقتين", "Passwords do not match");
    setErrors(next);
    if (Object.keys(next).length) return;
    submitting.current = true; setBusy(true);
    try {
      const result = pendingUser ? await completePasswordChange(pendingUser.id, password, confirmation, remember) : await login(email.trim().toLowerCase(), password, remember);
      if (!result.success) { setErrors({ general: result.error || text("تعذر تسجيل الدخول. حاول مجدداً.", "Unable to sign in. Try again.") }); return; }
      if (result.mustChangePassword && result.user) { setPendingUser(result.user); setPassword(""); setConfirmation(""); return; }
      setStoredPreference("miqat_remembered_email", remember ? email.trim().toLowerCase() : "");
      setStoredPreference("miqat_save_session", String(remember));
    } finally { submitting.current = false; setBusy(false); }
  }
  return <AuthShell title={text(pendingUser ? "عيّن كلمة مرور جديدة" : "تسجيل الدخول", pendingUser ? "Set a new password" : "Sign in")} description={text(pendingUser ? "غيّر كلمة المرور المؤقتة قبل الدخول إلى مساحة العمل." : "أدخل بيانات حسابك للوصول إلى مساحة العمل.", pendingUser ? "Replace your temporary password before opening your workspace." : "Enter your account details to open your workspace.")}>
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={busy}>
      {errors.general && <p role="alert" className="rounded-lg border border-rose-500/35 bg-rose-500/10 p-3 text-sm font-medium text-rose-800 dark:text-rose-200">{errors.general}</p>}
      {!pendingUser && <CustomInput id="email" name="email" type="email" label={text("البريد الإلكتروني", "Email address")} value={email} onChange={event => { setEmail(event.target.value); setErrors({}); }} autoComplete="username" dir="ltr" error={errors.email} required />}
      <div className="relative"><CustomInput id="password" name="password" type={showPassword ? "text" : "password"} label={text(pendingUser ? "كلمة المرور الجديدة" : "كلمة المرور", pendingUser ? "New password" : "Password")} value={password} onChange={event => { setPassword(event.target.value); setErrors({}); }} autoComplete={pendingUser ? "new-password" : "current-password"} error={errors.password} required className="pe-14" /><button type="button" className="icon-button absolute end-1 top-6" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} aria-label={text(showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور", showPassword ? "Hide password" : "Show password")}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>
      {pendingUser && <CustomInput id="confirm-password" name="confirmPassword" type="password" label={text("تأكيد كلمة المرور", "Confirm password")} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" error={errors.confirmation} required />}
      {!pendingUser && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex min-h-11 cursor-pointer items-center gap-2 text-[var(--text-main)]"><Checkbox checked={remember} onChange={event => setRemember(event.target.checked)} />{text("تذكرني", "Remember me")}</label><Link className="font-semibold text-[var(--accent-gold)] hover:underline" href="/forgot-password">{text("نسيت كلمة المرور؟", "Forgot password?")}</Link></div>}
      <button type="submit" className="button button-primary w-full disabled:opacity-50" disabled={busy}>{busy ? text("جاري التنفيذ…", "Processing…") : text(pendingUser ? "حفظ ومتابعة" : "تسجيل الدخول", pendingUser ? "Save and continue" : "Sign in")}</button>
      {pendingUser && <button type="button" className="button secondary-btn w-full" disabled={busy} onClick={async () => { try { await logout(); setPendingUser(null); setPassword(""); setConfirmation(""); setErrors({}); } catch (error: unknown) { setErrors({ general: error instanceof Error ? error.message : text("تعذر تسجيل الخروج", "Unable to sign out") }); } }}>{text("العودة لتسجيل الدخول", "Back to sign in")}</button>}
    </form>
  </AuthShell>;
}
