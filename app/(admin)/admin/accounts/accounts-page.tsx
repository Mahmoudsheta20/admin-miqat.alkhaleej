"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BookOpen,
  Landmark,
  Plus,
  Search,
  X,
  Copy,
  Check,
  FolderTree,
  Folder,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import SeedTestDataButton from "@/app/_components/SeedTestDataButton";
import SectionGuide from "@/app/_components/SectionGuide";
import { accountingRequest, type Account } from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";

interface AccountForm {
  code: string;
  nameAr: string;
  nameEn: string;
  parentId: string | null;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
  isPosting: boolean;
  isActive: boolean;
  profitSection: "OPERATING" | "TAX";
}

const TYPES: Record<string, { label: string; codePrefix: string; color: string }> = {
  ASSET: { label: "الأصول", codePrefix: "1xxx", color: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" },
  LIABILITY: { label: "الالتزامات", codePrefix: "2xxx", color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
  EQUITY: { label: "حقوق الملكية", codePrefix: "3xxx", color: "text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  REVENUE: { label: "الإيرادات", codePrefix: "4xxx", color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  EXPENSE: { label: "المصروفات والتكاليف", codePrefix: "5xxx", color: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

const INPUT = "theme-input mt-2 h-11 w-full rounded-xl px-3 text-sm";

function suggestNextChildCode(parentCode: string, allAccounts: Account[]): string {
  const children = allAccounts.filter(
    (a) => a.code !== parentCode && a.code.startsWith(parentCode)
  );
  if (children.length === 0) {
    if (parentCode.endsWith("00")) {
      const base = parentCode.slice(0, -2);
      return `${base}01`;
    }
    return `${parentCode}01`;
  }
  const numericCodes = children
    .map((c) => Number(c.code))
    .filter((n) => Number.isFinite(n));
  if (numericCodes.length > 0) {
    const max = Math.max(...numericCodes);
    return String(max + 1);
  }
  return `${parentCode}01`;
}

interface EditorProps {
  account: Account | "NEW";
  prefillParent?: Account | null;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

function Editor({ account, prefillParent, accounts, onClose, onSaved }: EditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  const initialForm = useMemo<AccountForm>(() => {
    if (account !== "NEW") {
      return {
        code: account.code,
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        parentId: account.parentId,
        type: account.type as AccountForm["type"],
        normalBalance: account.normalBalance as AccountForm["normalBalance"],
        isPosting: account.isPosting,
        isActive: account.isActive,
        profitSection: (account.profitSection as AccountForm["profitSection"]) || "OPERATING",
      };
    }

    if (prefillParent) {
      const suggested = suggestNextChildCode(prefillParent.code, accounts);
      return {
        code: suggested,
        nameAr: "",
        nameEn: "",
        parentId: prefillParent.id,
        type: prefillParent.type as AccountForm["type"],
        normalBalance: prefillParent.normalBalance as AccountForm["normalBalance"],
        isPosting: true,
        isActive: true,
        profitSection: "OPERATING",
      };
    }

    return {
      code: "",
      nameAr: "",
      nameEn: "",
      parentId: null,
      type: "EXPENSE",
      normalBalance: "DEBIT",
      isPosting: true,
      isActive: true,
      profitSection: "OPERATING",
    };
  }, [account, prefillParent, accounts]);

  const [form, setForm] = useState<AccountForm>(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const update = (v: Partial<AccountForm>) => setForm((p) => ({ ...p, ...v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const isNew = account === "NEW";
    const result = await accountingRequest(
      isNew ? "/accounts" : `/accounts/${account.code}`,
      isNew ? "POST" : "PUT",
      isNew
        ? {
            code: form.code.trim(),
            nameAr: form.nameAr.trim(),
            nameEn: form.nameEn.trim(),
            parentId: form.parentId || null,
            type: form.type,
            normalBalance: form.normalBalance,
            isPosting: Boolean(form.isPosting),
            isActive: Boolean(form.isActive),
            profitSection: form.profitSection,
          }
        : {
            nameAr: form.nameAr.trim(),
            nameEn: form.nameEn.trim(),
            isActive: Boolean(form.isActive),
            profitSection: form.profitSection,
          }
    );

    setSaving(false);
    if (result.success) {
      onSaved();
    } else {
      setError(result.error || "تعذر حفظ الحساب. تحقق من صحة الرمز والبيانات المدخلة.");
    }
  }

  const isEditing = account !== "NEW";

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose();
      }}
      className="theme-card m-auto max-h-[92dvh] w-[calc(100%_-_24px)] max-w-2xl rounded-2xl p-6 text-[var(--text-main)] shadow-2xl backdrop:bg-slate-950/70 border theme-border overflow-y-auto"
      dir="rtl"
    >
      <form onSubmit={save}>
        <div className="flex items-start justify-between gap-4 border-b theme-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {isEditing ? `تعديل الحساب #${account.code}` : "إنشاء حساب جديد"}
              </span>
              {prefillParent && (
                <span className="text-xs text-slate-500">
                  تابع للحساب الرئيسي: {prefillParent.code} - {prefillParent.nameAr}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {isEditing ? account.nameAr : "إضافة حساب إلى شجرة الحسابات"}
            </h2>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Code */}
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            رمز الحساب (من 4 إلى 8 أرقام) *
            <input
              required
              readOnly={isEditing}
              pattern="[0-9]{4,8}"
              placeholder="مثال: 1105 أو 5107"
              className={`${INPUT} font-mono ${isEditing ? "opacity-75 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}`}
              value={form.code}
              onChange={(e) => update({ code: e.target.value })}
            />
            <span className="mt-1 block text-[11px] text-slate-500 font-normal">
              {isEditing
                ? "رمز الحساب مقفل للحفاظ على سلامة القيود التاريخية."
                : "حدد رمزاً فريداً يتبع ترقيم الفئة الرئيسية (مثال: 1xxx للأصول، 5xxx للمصروفات)."}
            </span>
          </label>

          {/* Type */}
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            نوع الحساب *
            <select
              disabled={isEditing}
              className={`${INPUT} ${isEditing ? "opacity-75 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}`}
              value={form.type}
              onChange={(e) => {
                const newType = e.target.value as AccountForm["type"];
                update({
                  type: newType,
                  parentId: null,
                  normalBalance: ["ASSET", "EXPENSE"].includes(newType) ? "DEBIT" : "CREDIT",
                });
              }}
            >
              {Object.entries(TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({v.codePrefix})
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-slate-500 font-normal">
              يحدد الباب الرئيسي للحساب في ميزان المراجعة وقائمة الدخل.
            </span>
          </label>

          {/* Arabic Name */}
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            الاسم العربي للحساب *
            <input
              required
              maxLength={300}
              placeholder="مثال: مصروف وقود حافلات كبار الشخصيات"
              className={INPUT}
              value={form.nameAr}
              onChange={(e) => update({ nameAr: e.target.value })}
            />
          </label>

          {/* English Name */}
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            الاسم الإنجليزي للحساب *
            <input
              required
              maxLength={300}
              dir="ltr"
              placeholder="e.g. VIP Bus Fuel Expense"
              className={INPUT}
              value={form.nameEn}
              onChange={(e) => update({ nameEn: e.target.value })}
            />
          </label>

          {/* Parent Account */}
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            الحساب الرئيسي الأب (التجميعي)
            <select
              disabled={isEditing}
              className={`${INPUT} ${isEditing ? "opacity-75 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}`}
              value={form.parentId || ""}
              onChange={(e) => update({ parentId: e.target.value || null })}
            >
              <option value="">(بدون حساب أب — حساب رئيسي من المستوى الأول)</option>
              {accounts
                .filter((a) => !a.isPosting && a.type === form.type)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.nameAr}
                  </option>
                ))}
            </select>
            <span className="mt-1 block text-[11px] text-slate-500 font-normal">
              اختر الحساب التجميعي الذي ينتمي إليه هذا الحساب.
            </span>
          </label>

          {/* Normal Balance */}
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            طبيعة الرصيد *
            <select
              disabled={isEditing}
              className={`${INPUT} ${isEditing ? "opacity-75 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}`}
              value={form.normalBalance}
              onChange={(e) => update({ normalBalance: e.target.value as AccountForm["normalBalance"] })}
            >
              <option value="DEBIT">مدين (Debit) — طبيعي للأصول والمصروفات</option>
              <option value="CREDIT">دائن (Credit) — طبيعي للالتزامات والملكية والإيرادات</option>
            </select>
          </label>

          {/* Profit Section (Only for Expenses) */}
          {form.type === "EXPENSE" && (
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">
              تصنيف قائمة الدخل
              <select
                className={INPUT}
                value={form.profitSection}
                onChange={(e) => update({ profitSection: e.target.value as AccountForm["profitSection"] })}
              >
                <option value="OPERATING">مصروف تشغيلي / إداري مباشر (ضمن الأرباح التشغيلية)</option>
                <option value="TAX">مصروف زكاة شرعية / ضريبة دخل مُسجل يدويًا (بعد صافي الربح)</option>
              </select>
            </label>
          )}
        </div>

        {/* Posting & Active Switches with Clear Educational Explanations */}
        <div className="mt-5 rounded-xl border theme-border bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              disabled={isEditing}
              type="checkbox"
              className="mt-1 size-4 rounded accent-amber-500 cursor-pointer"
              checked={form.isPosting}
              onChange={(e) => update({ isPosting: e.target.checked })}
            />
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                حساب فرعي يقبل الترحيل المباشر (Posting Sub-Account)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                إذا تم تفعيل هذا الخيار، سيظهر هذا الحساب في شاشات تسجيل الفواتير والمشتريات ومصروفات الأسطول وسندات القبض وقيود اليومية. إذا عطلته، سيصبح حساباً تجميعياً لحساب مجاميع الفروع فقط.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer border-t theme-border pt-3">
            <input
              disabled={isEditing && Boolean(account.isSystem)}
              type="checkbox"
              className="mt-1 size-4 rounded accent-amber-500 cursor-pointer"
              checked={form.isActive}
              onChange={(e) => update({ isActive: e.target.checked })}
            />
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                الحساب نشط وجاهز للاستخدام
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                الحسابات النشطة فقط هي التي تظهر في القوائم المنسدلة للعمليات المحاسبية. الحسابات النظامية الأساسية تظل نشطة دائماً.
              </p>
            </div>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t theme-border pt-4">
          <button
            type="button"
            disabled={saving}
            className="theme-card rounded-xl border theme-border hover:border-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold cursor-pointer transition disabled:opacity-50"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            disabled={saving}
            className="gold-gradient-btn rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold disabled:opacity-50 cursor-pointer transition shadow-sm"
          >
            {saving ? "جارٍ الحفظ…" : isEditing ? "حفظ التعديلات" : "حفظ وإضافة الحساب"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [postingFilter, setPostingFilter] = useState<"ALL" | "POSTING" | "GROUP">("ALL");
  const [viewMode, setViewMode] = useState<"TREE" | "TABLE">("TREE");
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showFaqGuide, setShowFaqGuide] = useState(true);

  const [reload, setReload] = useState(0);
  const [seedMessage, setSeedMessage] = useState("");
  const [seedError, setSeedError] = useState("");
  const [editor, setEditor] = useState<{ account: Account | "NEW"; prefillParent?: Account | null } | null>(null);

  const { data, error, isLoading } = useAccountingQuery<{ items: Account[] }>(
    "/accounts",
    reload
  );
  const accounts = useMemo(() => data?.items || [], [data]);

  // Copy code helper with visual feedback
  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((curr) => (curr === code ? null : curr));
    }, 2000);
  };

  // Toggle category collapse in tree view
  const toggleTypeCollapse = (typeKey: string) => {
    setCollapsedTypes((prev) => ({ ...prev, [typeKey]: !prev[typeKey] }));
  };

  // Stats KPI Calculation
  const stats = useMemo(() => {
    const total = accounts.length;
    const posting = accounts.filter((a) => a.isPosting && a.isActive).length;
    const group = accounts.filter((a) => !a.isPosting).length;
    const assets = accounts.filter((a) => a.type === "ASSET").length;
    const liabilities = accounts.filter((a) => a.type === "LIABILITY").length;
    const equity = accounts.filter((a) => a.type === "EQUITY").length;
    const revenues = accounts.filter((a) => a.type === "REVENUE").length;
    const expenses = accounts.filter((a) => a.type === "EXPENSE").length;
    return { total, posting, group, assets, liabilities, equity, revenues, expenses };
  }, [accounts]);

  // Account Hierarchy Depth
  function depth(a: Account) {
    let d = 0;
    let parent = a.parentId;
    const seen = new Set<string>();
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      parent = accounts.find((v) => v.id === parent)?.parentId || null;
      d++;
    }
    return d;
  }

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (postingFilter === "POSTING" && !a.isPosting) return false;
      if (postingFilter === "GROUP" && a.isPosting) return false;
      if (!q) return true;
      return (
        a.code.toLowerCase().includes(q) ||
        a.nameAr.toLowerCase().includes(q) ||
        a.nameEn.toLowerCase().includes(q)
      );
    });
  }, [accounts, search, typeFilter, postingFilter]);

  // Grouped Accounts by Type for Tree View
  const groupedByType = useMemo(() => {
    const groups: Record<string, Account[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    filteredAccounts.forEach((acc) => {
      if (groups[acc.type]) {
        groups[acc.type].push(acc);
      }
    });
    return groups;
  }, [filteredAccounts]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-500/25">
                النظام المالي الموحد
              </span>
              <span className="text-xs text-slate-500">الخريطة المحاسبية</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              شجرة الحسابات (Chart of Accounts)
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              الدليل المحاسبي الموحد للأسطول والعمليات: الأصول، الالتزامات، حقوق الملكية، الإيرادات، والمصروفات
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReload((v) => v + 1)}
            disabled={isLoading}
            className="p-2.5 rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="تحديث الحسابات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
          </button>
          <SeedTestDataButton
            onSeeded={(msg) => {
              setSeedError("");
              setSeedMessage(msg);
              setReload((v) => v + 1);
            }}
            onError={(err) => {
              setSeedMessage("");
              setSeedError(err);
            }}
          />
          <Link
            href="/admin/accounting"
            className="theme-card inline-flex items-center gap-2 rounded-xl border theme-border hover:border-amber-500 px-3.5 py-2.5 text-xs sm:text-sm font-bold transition shadow-2xs"
          >
            <Landmark className="size-4 text-amber-500" />
            <span>القيود والتقارير</span>
          </Link>
          <button
            type="button"
            className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black cursor-pointer shadow-sm hover:shadow-md transition"
            onClick={() => setEditor({ account: "NEW" })}
          >
            <Plus className="size-4" />
            <span>إضافة حساب جديد</span>
          </button>
        </div>
      </header>

      {/* Seed Alerts */}
      {seedMessage && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{seedMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSeedMessage("")}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {seedError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{seedError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSeedError("")}
            className="text-rose-700 dark:text-rose-300 hover:opacity-75"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* High-Impact Educational Guide with Solution for "اختر حسابات فرعية نشطة قابلة للترحيل" */}
      <SectionGuide
        title="دليل الخريطة المحاسبية وحل مشكلة: «اختر حسابات فرعية نشطة قابلة للترحيل»"
        summary="شجرة الحسابات هي العمود الفقري لكافة الحركات المالية لنظام ميقات الخليج. توضح القواعد التالية كيف تُرحل الفواتير والمشتريات وتفادي اختيار الحسابات التجميعية غير القابلة للقيد."
        cards={[
          {
            title: "1. الفرق الحاسم: تجميعي vs فرعي",
            badge: "قاعدة القيد المزدوج",
            items: [
              {
                label: "❌ الحساب التجميعي (Group - isPosting = false)",
                description: "عناوين رئيسية كبرى مثل (1000 الأصول، 2000 الالتزامات، 4000 الإيرادات، 5000 المصروفات). دورها فقط تجميع الأرصدة في الميزانية وقائمة الدخل، ولا يقبل النظام أي قيد أو فاتورة عليها نهائياً.",
              },
              {
                label: "✅ الحساب الفرعي (Posting - isPosting = true)",
                description: "الحسابات الميدانية التفصيلية مثل (1102 البنك، 4101 إيرادات النقل، 5101 الوقود). هذه فقط هي الحسابات الصالحة للاختيار في القيود والفواتير وسندات الصرف.",
              },
            ],
          },
          {
            title: "2. جدول التوجيه السريع للعمليات",
            badge: "Cheat Sheet",
            items: [
              {
                label: "فواتير المبيعات والعمرة",
                code: "4101 / 4102 + 210201",
                description: "الطرف الدائن: إيراد النقل (4101) أو VIP (4102) + ضريبة المخرجات (210201). الطرف المدين: البنك (1102) أو الصندوق (1101) أو ذمم العملاء (1103).",
              },
              {
                label: "مشتريات ومصروفات الأسطول",
                code: "5101–5104 + 210202",
                description: "الوقود (5101)، الصيانة (5102)، النقل بالباطن (5103)، التأمين (5104) + ضريبة المدخلات (210202) مقابل البنك (1102) أو الموردين (2101).",
              },
              {
                label: "الرواتب والرسوم الحكومية TGA",
                code: "5105 / 5106 (0% VAT)",
                description: "رواتب السائقين (5105) ورسوم هيئة النقل (5106) تُسجل كمعاملة خارج نطاق الضريبة (0.00 ضريبة) لحماية ضريبة المدخلات.",
              },
            ],
          },
          {
            title: "3. دلالات أرقام الحسابات (Coding)",
            badge: "1000–5203",
            items: [
              {
                label: "1xxx الأصول و 2xxx الالتزامات",
                description: "1101 صندوق، 1102 بنك SNB، 1103 عملاء، 1201 أسطول الحافلات | 2101 موردين، 210201 ضريبة مخرجات، 210202 ضريبة مدخلات.",
              },
              {
                label: "3xxx الملكية، 4xxx الإيراد، 5xxx المصروف",
                description: "3101 رأس المال (300,000 ر.س) | 4101 إيراد نقل 15%، 4103 صفري | 5101 وقود، 5102 صيانة، 5201 إيجار ومرافق.",
              },
            ],
          },
        ]}
        tip="إذا واجهت رسالة «اختر حسابات فرعية نشطة قابلة للترحيل»، استخدم زر الفلترة السريع أدناه «فرعي (يقبل القيود)» لتصفية الحسابات الصالحة للاستخدام المباشر."
        formula="Journal Rule: Line Account must satisfy (isPosting === true && isActive === true)"
      />

      {/* Prominent Quick-Fix Callout Banner */}
      {showFaqGuide && (
        <section
          aria-label="تنبيه حل المشكلة"
          className="theme-card rounded-2xl border border-blue-500/30 bg-blue-500/[0.04] p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <HelpCircle className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>لماذا يظهر تنبيه: «اختر حسابات فرعية نشطة قابلة للترحيل»؟</span>
                <span className="rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 border border-blue-500/20">
                  حل فوري
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                يظهر هذا التنبيه عند محاولة اختيار حساب رئيسي تجميعي مثل <code className="font-mono font-bold text-amber-700 dark:text-amber-400">1000</code> أو <code className="font-mono font-bold text-amber-700 dark:text-amber-400">2000</code> أو <code className="font-mono font-bold text-amber-700 dark:text-amber-400">5000</code> في قيد أو فاتورة. لتفادي ذلك، اختر دائماً الحساب الفرعي النشط التابع له (مثل <code className="font-mono font-bold text-emerald-700 dark:text-emerald-400">1102 البنك</code>، <code className="font-mono font-bold text-emerald-700 dark:text-emerald-400">4101 الإيرادات</code>، أو <code className="font-mono font-bold text-emerald-700 dark:text-emerald-400">5101 الوقود</code>).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPostingFilter("POSTING")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>تصفية الحسابات الفرعية القابلة للترحيل الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPostingFilter("ALL");
                    setTypeFilter("ALL");
                    setSearch("");
                  }}
                  className="theme-card rounded-lg border theme-border px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-amber-500 transition cursor-pointer"
                >
                  إلغاء الفلترة وعرض الكل
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFaqGuide(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
            title="إخفاء التنبيه"
          >
            <X className="size-4" />
          </button>
        </section>
      )}

      {/* Interactive KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <button
          type="button"
          onClick={() => {
            setTypeFilter("ALL");
            setPostingFilter("ALL");
          }}
          className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
            typeFilter === "ALL" && postingFilter === "ALL"
              ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30"
              : "theme-card theme-border hover:border-amber-500/30"
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500">إجمالي الحسابات</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {isLoading ? "—" : stats.total}
          </div>
          <span className="text-[10px] text-slate-400">شاملة الفئات الـ 5</span>
        </button>

        {/* Posting Sub-Accounts */}
        <button
          type="button"
          onClick={() => setPostingFilter(postingFilter === "POSTING" ? "ALL" : "POSTING")}
          className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
            postingFilter === "POSTING"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
              : "theme-card theme-border hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              يقبل الترحيل (فرعي)
            </span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {isLoading ? "—" : stats.posting}
          </div>
          <span className="text-[10px] text-emerald-600/80">صالحة للقيود والفواتير</span>
        </button>

        {/* Group Accounts */}
        <button
          type="button"
          onClick={() => setPostingFilter(postingFilter === "GROUP" ? "ALL" : "GROUP")}
          className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
            postingFilter === "GROUP"
              ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30"
              : "theme-card theme-border hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
              تجميعي (رئيسي)
            </span>
            <Folder className="size-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {isLoading ? "—" : stats.group}
          </div>
          <span className="text-[10px] text-amber-600/80">لحساب مجاميع الفروع</span>
        </button>

        {/* Assets 1xxx */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === "ASSET" ? "ALL" : "ASSET")}
          className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
            typeFilter === "ASSET"
              ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
              : "theme-card theme-border hover:border-blue-500/30"
          }`}
        >
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">1000 الأصول</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            {isLoading ? "—" : stats.assets}
          </div>
          <span className="text-[10px] text-slate-400">الصندوق، البنك، الأسطول</span>
        </button>

        {/* Revenues 4xxx */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === "REVENUE" ? "ALL" : "REVENUE")}
          className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
            typeFilter === "REVENUE"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
              : "theme-card theme-border hover:border-emerald-500/30"
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">4000 الإيرادات</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {isLoading ? "—" : stats.revenues}
          </div>
          <span className="text-[10px] text-slate-400">نقل، VIP، عمرة، صادرات</span>
        </button>

        {/* Expenses 5xxx */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === "EXPENSE" ? "ALL" : "EXPENSE")}
          className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
            typeFilter === "EXPENSE"
              ? "bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30"
              : "theme-card theme-border hover:border-rose-500/30"
          }`}
        >
          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">5000 المصروفات</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            {isLoading ? "—" : stats.expenses}
          </div>
          <span className="text-[10px] text-slate-400">وقود، صيانة، رواتب، TGA</span>
        </button>
      </div>

      {/* Toolbar: Search, Category Tabs & View Mode Switcher */}
      <div className="theme-card p-4 rounded-2xl border theme-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالرمز (1102)، الاسم العربي (البنك الأهلي)، أو الإنجليزي (Fuel)..."
            className="theme-input w-full pr-10 pl-8 py-2.5 text-xs sm:text-sm rounded-xl"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              aria-label="مسح البحث"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills & Posting Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="theme-input h-10 rounded-xl px-3 text-xs font-bold border theme-border"
            aria-label="فلترة بنوع الحساب"
          >
            <option value="ALL">جميع الأبواب الرئيسية</option>
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label} ({v.codePrefix})
              </option>
            ))}
          </select>

          <select
            value={postingFilter}
            onChange={(e) => setPostingFilter(e.target.value as "ALL" | "POSTING" | "GROUP")}
            className="theme-input h-10 rounded-xl px-3 text-xs font-bold border theme-border"
            aria-label="فلترة بطبيعة الترحيل"
          >
            <option value="ALL">كافة الحسابات (فرعي ورئيسي)</option>
            <option value="POSTING">حسابات فرعية فقط (يقبل القيود)</option>
            <option value="GROUP">حسابات رئيسية تجميعية فقط</option>
          </select>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border theme-border p-1 bg-slate-100 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={() => setViewMode("TREE")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "TREE"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FolderTree className="size-3.5 text-amber-500" />
              <span>شجرة هرمية</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Layers className="size-3.5 text-amber-500" />
              <span>جدول منبسط</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error & Loading Indicators */}
      {error && (
        <p role="alert" className="text-sm font-bold text-rose-600">
          {error}
        </p>
      )}
      {isLoading && (
        <div role="status" className="theme-card h-64 animate-pulse rounded-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <RefreshCw className="size-6 animate-spin text-amber-500" />
            <span className="text-xs font-bold">جارٍ تحميل شجرة الحسابات…</span>
          </div>
        </div>
      )}

      {/* View Mode 1: Hierarchical Category Tree View */}
      {viewMode === "TREE" && !isLoading && (
        <div className="space-y-4">
          {(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const).map((typeKey) => {
            const typeInfo = TYPES[typeKey];
            const typeAccounts = groupedByType[typeKey] || [];
            if (typeAccounts.length === 0 && (typeFilter !== "ALL" || search)) return null;

            const isCollapsed = Boolean(collapsedTypes[typeKey]);
            const postingCount = typeAccounts.filter((a) => a.isPosting).length;

            return (
              <div
                key={typeKey}
                className="theme-card rounded-2xl border theme-border overflow-hidden transition-all shadow-xs"
              >
                {/* Category Header */}
                <div
                  onClick={() => toggleTypeCollapse(typeKey)}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-slate-50/70 dark:bg-slate-900/50 border-b theme-border cursor-pointer select-none hover:bg-slate-100/70 dark:hover:bg-slate-900 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {typeInfo.codePrefix.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {typeInfo.label}
                        </h2>
                        <span className="font-mono text-xs font-bold text-slate-400">
                          ({typeInfo.codePrefix})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {typeAccounts.length} حساب مسجل · {postingCount} حساب فرعي يقبل الترحيل
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rootParent = typeAccounts.find((a) => !a.isPosting && depth(a) === 0) || typeAccounts[0];
                        setEditor({ account: "NEW", prefillParent: rootParent });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border theme-border bg-white dark:bg-slate-800 hover:border-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                    >
                      <Plus className="size-3 text-amber-500" />
                      <span>+ حساب فرعي</span>
                    </button>
                    <div className="p-1 text-slate-400">
                      {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                    </div>
                  </div>
                </div>

                {/* Category Accounts Body */}
                {!isCollapsed && (
                  <div className="divide-y theme-border">
                    {typeAccounts.length === 0 ? (
                      <p className="p-5 text-center text-xs text-slate-400">
                        لا توجد حسابات مطابقة للبحث في هذا الباب.
                      </p>
                    ) : (
                      typeAccounts.map((a) => {
                        const accountDepth = depth(a);
                        const isMain = !a.isPosting;

                        return (
                          <div
                            key={a.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                              isMain ? "bg-slate-50/30 dark:bg-slate-900/20 font-bold" : ""
                            }`}
                          >
                            {/* Code, Name, Indent & Icon */}
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              {/* Visual Tree Indentation */}
                              <div
                                style={{ width: accountDepth * 24 }}
                                className="shrink-0 flex items-center justify-end"
                              >
                                {accountDepth > 0 && (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none">
                                    └─
                                  </span>
                                )}
                              </div>

                              {/* Branch Icon */}
                              <div className="mt-0.5 sm:mt-0 shrink-0">
                                {isMain ? (
                                  <Folder className="size-4 text-amber-500" />
                                ) : (
                                  <FileSpreadsheet className="size-4 text-emerald-500" />
                                )}
                              </div>

                              {/* Code with Copy Button */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <code className="font-mono text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                  {a.code}
                                </code>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyCode(a.code, e)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                  title="نسخ رمز الحساب"
                                >
                                  {copiedCode === a.code ? (
                                    <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              </div>

                              {/* Name & English Subtitle */}
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {a.nameAr}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate" dir="ltr">
                                  {a.nameEn}
                                </p>
                              </div>
                            </div>

                            {/* Badges & Actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
                              {/* Posting Capability Badge */}
                              {a.isPosting ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                                  <CheckCircle2 className="size-3" />
                                  <span>يقبل القيود (فرعي)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/25">
                                  <Folder className="size-3" />
                                  <span>تجميعي (رئيسي)</span>
                                </span>
                              )}

                              {/* Balance Nature */}
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {a.normalBalance === "DEBIT" ? "طبيعة: مدين" : "طبيعة: دائن"}
                              </span>

                              {/* Active Status */}
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  a.isActive
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                }`}
                              >
                                {a.isActive ? "نشط" : "معطل"}
                              </span>

                              {/* System Badge */}
                              {a.isSystem && (
                                <span className="rounded-md bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  نظامي
                                </span>
                              )}

                              {/* Add Child Sub-Account (Only on Group Accounts) */}
                              {!a.isPosting && (
                                <button
                                  type="button"
                                  onClick={() => setEditor({ account: "NEW", prefillParent: a })}
                                  className="inline-flex items-center gap-1 rounded-lg border theme-border hover:border-amber-500 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 transition"
                                  title={`إضافة حساب فرعي تحت ${a.code}`}
                                >
                                  <Plus className="size-3" />
                                  <span>+ فرعي</span>
                                </button>
                              )}

                              {/* Edit Button */}
                              <button
                                type="button"
                                className="theme-card rounded-lg border theme-border hover:border-amber-500 px-3 py-1 text-xs font-bold cursor-pointer transition shadow-2xs"
                                onClick={() => setEditor({ account: a })}
                              >
                                تعديل
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Flat Data Table View */}
      {viewMode === "TABLE" && !isLoading && (
        <div className="theme-card overflow-x-auto rounded-2xl border theme-border shadow-xs">
          <table className="w-full min-w-[760px] text-right text-xs sm:text-sm">
            <thead className="theme-card-subtle text-xs text-slate-500 font-bold border-b theme-border">
              <tr>
                <th className="px-5 py-3.5">الرمز</th>
                <th className="px-5 py-3.5">اسم الحساب</th>
                <th className="px-5 py-3.5">الباب / الطبيعة</th>
                <th className="px-5 py-3.5">صلاحية الترحيل</th>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border text-slate-800 dark:text-slate-200">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    لا توجد حسابات مطابقة لشروط البحث.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((a) => (
                  <tr
                    key={a.id}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition ${
                      !a.isPosting ? "bg-slate-50/30 dark:bg-slate-900/20 font-bold" : ""
                    }`}
                  >
                    {/* Code with Copy */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {a.code}
                        </code>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(a.code, e)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="نسخ رمز الحساب"
                        >
                          {copiedCode === a.code ? (
                            <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white">{a.nameAr}</p>
                        <p className="text-[11px] text-slate-400" dir="ltr">
                          {a.nameEn}
                        </p>
                      </div>
                    </td>

                    {/* Type & Balance */}
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <p className="font-bold">{TYPES[a.type]?.label || a.type}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {a.normalBalance === "DEBIT" ? "طبيعة رصيد: مدين" : "طبيعة رصيد: دائن"}
                      </p>
                    </td>

                    {/* Posting Capability */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {a.isPosting ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                          <CheckCircle2 className="size-3" />
                          <span>فرعي (يقبل القيود)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/25">
                          <Folder className="size-3" />
                          <span>تجميعي (رئيسي)</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          a.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {a.isActive ? "نشط" : "معطل"}
                      </span>
                      {a.isSystem && (
                        <span className="ms-1.5 rounded-md bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          نظامي
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-left whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {!a.isPosting && (
                          <button
                            type="button"
                            onClick={() => setEditor({ account: "NEW", prefillParent: a })}
                            className="inline-flex items-center gap-1 rounded-lg border theme-border hover:border-amber-500 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 transition"
                            title={`إضافة حساب فرعي تحت ${a.code}`}
                          >
                            <Plus className="size-3" />
                            <span>+ فرعي</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="theme-card rounded-lg border theme-border hover:border-amber-500 px-3 py-1.5 text-xs font-bold cursor-pointer transition shadow-2xs"
                          onClick={() => setEditor({ account: a })}
                        >
                          تعديل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal */}
      {editor && (
        <Editor
          account={editor.account}
          prefillParent={editor.prefillParent}
          accounts={accounts}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setReload((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
