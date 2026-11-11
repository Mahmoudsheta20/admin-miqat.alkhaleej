"use client";
import { useUrlState } from "@/lib/use-url-state";
import { useUiText } from "@/lib/ui-text";


import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BookOpen, Landmark, Plus, Search, X, Copy, Check, FolderTree, Folder, FileSpreadsheet, Layers, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import { Badge, Button, PageHeader } from "@/app/_components/ui";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { accountingRequest, type Account } from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { useLanguage } from "@/lib/languageContext";

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

const TYPES: Record<
  string,
  { label: string; codePrefix: string; color: string }
> = {
  ASSET: {
    label: "الأصول",
    codePrefix: "1xxx",
    color: "text-sky-800 dark:text-sky-300 bg-sky-500/10 border-sky-600/30",
  },
  LIABILITY: {
    label: "الالتزامات",
    codePrefix: "2xxx",
    color:
      "text-[var(--accent-gold)] bg-[var(--accent-surface)] border-amber-600/30",
  },
  EQUITY: {
    label: "حقوق الملكية",
    codePrefix: "3xxx",
    color:
      "text-indigo-800 dark:text-indigo-300 bg-indigo-500/10 border-indigo-600/30",
  },
  REVENUE: {
    label: "الإيرادات",
    codePrefix: "4xxx",
    color:
      "text-emerald-800 dark:text-emerald-300 bg-emerald-500/12 border-emerald-600/35 dark:bg-emerald-950/45 dark:border-emerald-500/35",
  },
  EXPENSE: {
    label: "المصروفات والتكاليف",
    codePrefix: "5xxx",
    color: "text-rose-800 dark:text-rose-300 bg-rose-500/10 border-rose-600/30",
  },
};

const INPUT = "theme-input mt-2 h-11 w-full rounded-xl px-3 text-sm";

function suggestNextChildCode(
  parentCode: string,
  allAccounts: Account[],
): string {
  const children = allAccounts.filter(
    (a) => a.code !== parentCode && a.code.startsWith(parentCode),
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

function Editor({
  account,
  prefillParent,
  accounts,
  onClose,
  onSaved,
}: EditorProps) {
  const ui = useUiText();

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
        profitSection:
          (account.profitSection as AccountForm["profitSection"]) ||
          "OPERATING",
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
        normalBalance:
          prefillParent.normalBalance as AccountForm["normalBalance"],
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
          },
    );

    setSaving(false);
    if (result.success) {
      onSaved();
    } else {
      setError(
        result.error || "تعذر حفظ الحساب. تحقق من صحة الرمز والبيانات المدخلة.",
      );
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
      onClose={onClose}
      aria-labelledby="account-editor-title"
      className="theme-card mobile-dialog-panel m-auto max-h-[92dvh] w-[calc(100%_-_24px)] max-w-2xl rounded-2xl p-6 text-[var(--text-main)] shadow-2xl backdrop:bg-black/60 border theme-border overflow-y-auto"
      dir={ui.dir}
    >
      <form onSubmit={save}>
        <div className="flex items-start justify-between gap-4 border-b theme-border pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[var(--accent-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-gold)] border border-[var(--accent-gold)]/35">
                {isEditing
                  ? ui.language === "en"
                    ? `Edit Account #${account.code}`
                    : `تعديل الحساب #${account.code}`
                  : ui("إنشاء حساب جديد")}
              </span>
              {prefillParent && (
                <span className="text-xs text-[var(--text-muted)]">
                  {ui("تابع للحساب الرئيسي:")}{" "}
                  <bdi dir="ltr" className="font-mono">{prefillParent.code}</bdi> -{" "}
                  {ui.language === "en" && prefillParent.nameEn ? prefillParent.nameEn : ui(prefillParent.nameAr)}
                </span>
              )}
            </div>
            <h2 id="account-editor-title" className="mt-1 text-xl font-semibold text-[var(--text-main)]">
              {isEditing
                ? ui.language === "en" && account.nameEn
                  ? account.nameEn
                  : ui(account.nameAr)
                : ui("إضافة حساب إلى شجرة الحسابات")}
            </h2>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label={ui("إغلاق")}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl p-2 hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Code */}
          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("رمز الحساب (من 4 إلى 8 أرقام) *")}<input
              required
              readOnly={isEditing}
              pattern="[0-9]{4,8}"
              placeholder={ui("مثال: 1105 أو 5107")}
              className={`${INPUT} font-mono ${isEditing ? "opacity-75 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}`}
              value={form.code}
              onChange={(e) => update({ code: e.target.value })}
            />
            <span className="mt-1 block text-xs text-[var(--text-muted)] font-normal">
              {ui(isEditing
                ? "رمز الحساب مقفل للحفاظ على سلامة القيود التاريخية."
                : "حدد رمزاً فريداً يتبع ترقيم الفئة الرئيسية (مثال: 1xxx للأصول، 5xxx للمصروفات).")}
            </span>
          </label>

          {/* Type */}
          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("نوع الحساب *")}<select
              disabled={isEditing}
              className={`${INPUT} ${isEditing ? "opacity-75 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}`}
              value={form.type}
              onChange={(e) => {
                const newType = e.target.value as AccountForm["type"];
                update({
                  type: newType,
                  parentId: null,
                  normalBalance: ["ASSET", "EXPENSE"].includes(newType)
                    ? "DEBIT"
                    : "CREDIT",
                });
              }}
            >
              {Object.entries(TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {ui(v.label)} ({v.codePrefix})
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[var(--text-muted)] font-normal">
              {ui("يحدد الباب الرئيسي للحساب في ميزان المراجعة وقائمة الدخل.")}</span>
          </label>

          {/* Arabic Name */}
          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("الاسم العربي للحساب *")}<input
              required
              maxLength={300}
              placeholder={ui("مثال: مصروف وقود حافلات كبار الشخصيات")}
              className={INPUT}
              value={form.nameAr}
              onChange={(e) => update({ nameAr: e.target.value })}
            />
          </label>

          {/* English Name */}
          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("الاسم الإنجليزي للحساب *")}<input
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
          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("الحساب الرئيسي الأب (التجميعي)")}<select
              disabled={isEditing}
              className={`${INPUT} ${isEditing ? "opacity-75 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}`}
              value={form.parentId || ""}
              onChange={(e) => update({ parentId: e.target.value || null })}
            >
              <option value="">
                {ui("(بدون حساب أب — حساب رئيسي من المستوى الأول)")}</option>
              {accounts
                .filter((a) => !a.isPosting && a.type === form.type)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr)}
                  </option>
                ))}
            </select>
            <span className="mt-1 block text-xs text-[var(--text-muted)] font-normal">
              {ui("اختر الحساب التجميعي الذي ينتمي إليه هذا الحساب.")}</span>
          </label>

          {/* Normal Balance */}
          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("طبيعة الرصيد *")}<select
              disabled={isEditing}
              className={`${INPUT} ${isEditing ? "opacity-75 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}`}
              value={form.normalBalance}
              onChange={(e) =>
                update({
                  normalBalance: e.target.value as AccountForm["normalBalance"],
                })
              }
            >
              <option value="DEBIT">
                {ui("مدين (Debit) — طبيعي للأصول والمصروفات")}</option>
              <option value="CREDIT">
                {ui("دائن (Credit) — طبيعي للالتزامات والملكية والإيرادات")}</option>
            </select>
          </label>

          {/* Profit Section (Only for Expenses) */}
          {form.type === "EXPENSE" && (
            <label className="text-xs font-bold text-[var(--text-main)] sm:col-span-2">
              {ui("تصنيف قائمة الدخل")}<select
                className={INPUT}
                value={form.profitSection}
                onChange={(e) =>
                  update({
                    profitSection: e.target
                      .value as AccountForm["profitSection"],
                  })
                }
              >
                <option value="OPERATING">
                  {ui("مصروف تشغيلي / إداري مباشر (ضمن الأرباح التشغيلية)")}</option>
                <option value="TAX">
                  {ui("مصروف زكاة شرعية / ضريبة دخل مُسجل يدويًا (بعد صافي الربح)")}</option>
              </select>
            </label>
          )}
        </div>

        {/* Posting & Active Switches with Clear Educational Explanations */}
        <div className="mt-5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 space-y-3">
          <label className="flex min-h-11 items-start gap-3 cursor-pointer">
            <Checkbox
              disabled={isEditing}
              className="mt-0.5"
              checked={form.isPosting}
              onChange={(e) => update({ isPosting: e.target.checked })}
            />
            <div>
              <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                {ui("حساب فرعي يقبل الترحيل المباشر (Posting Sub-Account)")}</span>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                {ui("إذا تم تفعيل هذا الخيار، سيظهر هذا الحساب في شاشات تسجيل الفواتير والمشتريات ومصروفات الأسطول وسندات القبض وقيود اليومية. إذا عطلته، سيصبح حساباً تجميعياً لحساب مجاميع الفروع فقط.")}</p>
            </div>
          </label>

          <label className="flex min-h-11 items-start gap-3 cursor-pointer border-t theme-border pt-3">
            <Checkbox
              disabled={isEditing && Boolean(account.isSystem)}
              className="mt-0.5"
              checked={form.isActive}
              onChange={(e) => update({ isActive: e.target.checked })}
            />
            <div>
              <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                {ui("الحساب نشط وجاهز للاستخدام")}</span>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                {ui("الحسابات النشطة فقط هي التي تظهر في القوائم المنسدلة للعمليات المحاسبية. الحسابات النظامية الأساسية تظل نشطة دائماً.")}</p>
            </div>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-600/35 bg-rose-500/10 p-3 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{ui(error)}</span>
          </div>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t theme-border pt-4">
          <button
            type="button"
            disabled={saving}
            className="min-h-11 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-2.5 text-xs sm:text-sm font-bold text-[var(--text-main)] cursor-pointer transition disabled:opacity-50"
            onClick={onClose}
          >
            {ui("إلغاء")}</button>
          <button
            type="submit"
            disabled={saving}
            className="gold-gradient-btn min-h-11 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold disabled:opacity-50 cursor-pointer transition shadow-sm"
          >
            {ui(saving
              ? "جارٍ الحفظ…"
              : isEditing
                ? "حفظ التعديلات"
                : "حفظ وإضافة الحساب")}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default function AccountsPage() {
  const ui = useUiText();

  const { t, dir, isRTL } = useLanguage();
  const [search, setSearch] = useUrlState<string>("q", "");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [postingFilter, setPostingFilter] = useState<
    "ALL" | "POSTING" | "GROUP"
  >("ALL");
  const [viewMode, setViewMode] = useState<"TREE" | "TABLE">("TREE");
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showFaqGuide, setShowFaqGuide] = useState(true);

  const [reload, setReload] = useState(0);
  const [seedMessage, setSeedMessage] = useState("");
  const [seedError, setSeedError] = useState("");
  const [editor, setEditor] = useState<{
    account: Account | "NEW";
    prefillParent?: Account | null;
  } | null>(null);

  const { data, error, isLoading } = useAccountingQuery<{ items: Account[] }>(
    "/accounts",
    reload,
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
    return {
      total,
      posting,
      group,
      assets,
      liabilities,
      equity,
      revenues,
      expenses,
    };
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

  const accountsHelpGuide = useMemo(() => ({
    title: isRTL ? "دليل شجرة الحسابات المحاسبية والتوجيه المالي" : "Chart of Accounts & Posting Guide",
    summary: isRTL
      ? "شجرة الحسابات هي العمود الفقري لكافة الحركات المالية لنظام ميقات الخليج. توضح القواعد التالية كيف تُرحل الفواتير والمشتريات وتفادي اختيار الحسابات التجميعية غير القابلة للقيد."
      : "The Chart of Accounts is the general ledger backbone for Miqat Al-Khaleej. Use posting sub-accounts for invoices and journals, avoiding parent group accounts.",
    cards: [
      {
        title: isRTL ? "١. الفرق الحاسم: تجميعي vs فرعي" : "1. Group vs. Posting Sub-Account",
        badge: isRTL ? "قاعدة القيد المزدوج" : "Posting Rules",
        items: [
          {
            label: isRTL ? "❌ الحساب التجميعي (Group)" : "❌ Group Accounts (isPosting = false)",
            description: isRTL
              ? "عناوين رئيسية كبرى مثل (1000 الأصول، 2000 الالتزامات، 4000 الإيرادات، 5000 المصروفات). دورها فقط تجميع الأرصدة في الميزانية وقائمة الدخل، ولا يقبل النظام أي قيد أو فاتورة عليها نهائياً."
              : "Major category roll-up headers (e.g. 1000 Assets, 4000 Revenue). Never allowed in transaction journals or invoice posting.",
          },
          {
            label: isRTL ? "✅ الحساب الفرعي (Posting)" : "✅ Posting Accounts (isPosting = true)",
            description: isRTL
              ? "الحسابات الميدانية التفصيلية مثل (1102 البنك، 4101 إيرادات النقل، 5101 الوقود). هذه فقط هي الحسابات الصالحة للاختيار في القيود والفواتير وسندات الصرف."
              : "Operational leaf accounts (e.g. 1102 SNB Bank, 4101 Transport Revenue, 5101 Fuel). Exclusively permitted for journal entry lines.",
          },
        ],
      },
      {
        title: isRTL ? "٢. جدول التوجيه السريع للعمليات" : "2. Account Mapping Cheat Sheet",
        badge: "Cheat Sheet",
        items: [
          {
            label: isRTL ? "فواتير المبيعات والعمرة" : "Sales & Trip Invoices",
            code: "4101 / 4102 + 210201",
            description: isRTL
              ? "الطرف الدائن: إيراد النقل (4101) أو VIP (4102) + ضريبة المخرجات (210201). الطرف المدين: البنك (1102) أو الصندوق (1101) أو ذمم العملاء (1103)."
              : "Credit: Revenue (4101) + Output VAT (210201). Debit: Bank (1102), Cash (1101), or Accounts Receivable (1103).",
          },
          {
            label: isRTL ? "مشتريات ومصروفات الأسطول" : "Fleet Expenses & Purchases",
            code: "5101–5104 + 210202",
            description: isRTL
              ? "الوقود (5101)، الصيانة (5102)، النقل بالباطن (5103)، التأمين (5104) + ضريبة المدخلات (210202) مقابل البنك (1102) أو الموردين (2101)."
              : "Debit: Operating expenses + Input VAT (210202). Credit: Bank (1102) or Accounts Payable (2101).",
          },
          {
            label: isRTL ? "الرواتب والرسوم الحكومية TGA" : "Salaries & Government Fees",
            code: "5105 / 5106 (0% VAT)",
            description: isRTL
              ? "رواتب السائقين (5105) ورسوم هيئة النقل (5106) تُسجل كمعاملة خارج نطاق الضريبة (0.00 ضريبة) لحماية ضريبة المدخلات."
              : "Driver salaries (5105) and TGA license fees (5106) are logged at 0% VAT outside the scope of value-added tax.",
          },
        ],
      },
      {
        title: isRTL ? "٣. دلالات أرقام الحسابات (Coding)" : "3. Account Numbering Convention",
        badge: "1000–5203",
        items: [
          {
            label: isRTL ? "1xxx الأصول و 2xxx الالتزامات" : "1xxx Assets & 2xxx Liabilities",
            description: isRTL
              ? "1101 صندوق، 1102 بنك SNB، 1103 عملاء، 1201 أسطول الحافلات | 2101 موردين، 210201 ضريبة مخرجات، 210202 ضريبة مدخلات."
              : "1101 Cash, 1102 Bank, 1103 AR, 1201 Vehicles | 2101 AP, 210201 Output VAT, 210202 Input VAT.",
          },
          {
            label: isRTL ? "3xxx الملكية، 4xxx الإيراد، 5xxx المصروف" : "3xxx Equity, 4xxx Revenue, 5xxx Expenses",
            description: isRTL
              ? "3101 رأس المال (300,000 ر.س) | 4101 إيراد نقل 15%، 4103 صفري | 5101 وقود، 5102 صيانة، 5201 إيجار ومرافق."
              : "3101 Paid-in Capital | 4101 Transport 15% Revenue | 5101 Fuel, 5102 Repairs, 5201 Facility rent.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "إذا واجهت رسالة «اختر حسابات فرعية نشطة قابلة للترحيل»، استخدم زر الفلترة السريع أدناه «فرعي (يقبل القيود)» لتصفية الحسابات الصالحة للاستخدام المباشر."
      : "If prompted with 'Select active posting sub-accounts', filter by 'Posting' to see eligible accounts.",
    formula: "Journal Rule: Line Account must satisfy (isPosting === true && isActive === true)",
  }), [isRTL]);

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* Top Header with On-Demand Help Guide */}
      <PageHeader
        title={ui(t("nav.accounts"))}
        subtitle={ui(isRTL
            ? "الدليل المحاسبي الموحد للأسطول والعمليات: الأصول، الالتزامات، حقوق الملكية، الإيرادات، والمصروفات"
            : "Unified Chart of Accounts: Assets, Liabilities, Equity, Revenues, and Expenses")}
        badge={t("section.financeReview")}
        icon={BookOpen}
        onRefresh={() => setReload((v) => v + 1)}
        isRefreshing={isLoading}
        helpGuide={accountsHelpGuide}
        onSeeded={(msg) => {
          setSeedError("");
          setSeedMessage(msg);
          setReload((v) => v + 1);
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setSeedError(err);
        }}
        actions={
          <>
            <Link
              href="/admin/accounting"
              className="inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-3.5 py-2 text-xs font-bold transition shadow-2xs text-[var(--text-main)]"
            >
              <Landmark className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui(t("accounting.title"))}</span>
            </Link>

            <button
              type="button"
              className="gold-gradient-btn inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer shadow-sm hover:shadow-md transition"
              onClick={() => setEditor({ account: "NEW" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>+ {ui(t("common.create"))}</span>
            </button>
          </>
        }
      />

      {/* Seed Alerts */}
      {seedMessage && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-600/35 bg-emerald-500/12 dark:border-emerald-500/35 dark:bg-emerald-950/45 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
            <span>{ui(seedMessage)}</span>
          </div>
          <button
            type="button"
            aria-label={ui("إغلاق")}
            onClick={() => setSeedMessage("")}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-lg text-emerald-800 dark:text-emerald-300 hover:opacity-75 cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {seedError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-600/35 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-rose-700 dark:text-rose-300 shrink-0" aria-hidden="true" />
            <span>{ui(seedError)}</span>
          </div>
          <button
            type="button"
            aria-label={ui("إغلاق")}
            onClick={() => setSeedError("")}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-lg text-rose-700 dark:text-rose-300 hover:opacity-75 cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Prominent Quick-Fix Callout Banner */}
      {showFaqGuide && (
        <section
          aria-label={ui("تنبيه حل المشكلة")}
          className="theme-card rounded-2xl border border-sky-600/35 bg-sky-500/[0.06] p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-800 dark:text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
              <HelpCircle className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-main)] flex flex-wrap items-center gap-2">
                <span>
                  {ui("لماذا يظهر تنبيه: «اختر حسابات فرعية نشطة قابلة للترحيل»؟")}</span>
                <span className="rounded-md bg-sky-500/15 text-sky-800 dark:text-sky-300 text-xs font-bold px-2 py-0.5 border border-sky-600/30">
                  {ui("حل فوري")}</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {ui("يظهر هذا التنبيه عند محاولة اختيار حساب رئيسي تجميعي مثل")}{" "}
                <code className="font-mono font-bold text-[var(--accent-gold)]">
                  1000
                </code>{" "}
                {ui("أو")}{" "}
                <code className="font-mono font-bold text-[var(--accent-gold)]">
                  2000
                </code>{" "}
                {ui("أو")}{" "}
                <code className="font-mono font-bold text-[var(--accent-gold)]">
                  5000
                </code>{" "}
                {ui("في قيد أو فاتورة. لتفادي ذلك، اختر دائماً الحساب الفرعي النشط التابع له (مثل")}{" "}
                <code className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  {ui("1102 البنك")}</code>
                {ui("،")}{" "}
                <code className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  {ui("4101 الإيرادات")}</code>
                {ui("، أو")}{" "}
                <code className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  {ui("5101 الوقود")}</code>
                ).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPostingFilter("POSTING")}
                  className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg bg-[var(--accent-btn-bg)] hover:bg-[var(--accent-btn-hover)] text-[var(--accent-btn-fg)] px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  <span>{ui("تصفية الحسابات الفرعية القابلة للترحيل الآن")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPostingFilter("ALL");
                    setTypeFilter("ALL");
                    setSearch("");
                  }}
                  className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer"
                >
                  {ui("إلغاء الفلترة وعرض الكل")}</button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFaqGuide(false)}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition shrink-0 cursor-pointer"
            aria-label={ui("إخفاء التنبيه")}
            title={ui("إخفاء التنبيه")}
          >
            <X className="size-4" aria-hidden="true" />
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
          className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
            typeFilter === "ALL" && postingFilter === "ALL"
              ? "bg-[var(--accent-surface)] border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/30"
              : "theme-card theme-border hover:border-[var(--accent-gold)]/50"
          }`}
        >
          <span className="text-xs font-bold text-[var(--text-muted)]">
            {ui("إجمالي الحسابات")}</span>
          <div className="text-xl sm:text-2xl font-semibold font-mono text-[var(--text-main)] mt-1">
            {isLoading ? "—" : stats.total}
          </div>
          <span className="text-xs text-[var(--text-muted)]">{ui("شاملة الفئات الـ 5")}</span>
        </button>

        {/* Posting Sub-Accounts */}
        <button
          type="button"
          onClick={() =>
            setPostingFilter(postingFilter === "POSTING" ? "ALL" : "POSTING")
          }
          className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
            postingFilter === "POSTING"
              ? "bg-emerald-500/12 border-emerald-600 ring-1 ring-emerald-600/30 dark:bg-emerald-950/45 dark:border-emerald-500 dark:ring-emerald-500/30"
              : "theme-card theme-border hover:border-emerald-600/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {ui("يقبل الترحيل (فرعي)")}</span>
            <CheckCircle2 className="size-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold font-mono text-emerald-800 dark:text-emerald-300 mt-1">
            {isLoading ? "—" : stats.posting}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {ui("صالحة للقيود والفواتير")}</span>
        </button>

        {/* Group Accounts */}
        <button
          type="button"
          onClick={() =>
            setPostingFilter(postingFilter === "GROUP" ? "ALL" : "GROUP")
          }
          className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
            postingFilter === "GROUP"
              ? "bg-[var(--accent-surface)] border-amber-600 ring-1 ring-amber-600/30"
              : "theme-card theme-border hover:border-amber-600/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--accent-gold)]">
              {ui("تجميعي (رئيسي)")}</span>
            <Folder className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold font-mono text-[var(--accent-gold)] mt-1">
            {isLoading ? "—" : stats.group}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {ui("لحساب مجاميع الفروع")}</span>
        </button>

        {/* Assets 1xxx */}
        <button
          type="button"
          onClick={() =>
            setTypeFilter(typeFilter === "ASSET" ? "ALL" : "ASSET")
          }
          className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
            typeFilter === "ASSET"
              ? "bg-sky-500/10 border-sky-600 ring-1 ring-sky-600/30"
              : "theme-card theme-border hover:border-sky-600/50"
          }`}
        >
          <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
            {ui("1000 الأصول")}</span>
          <div className="text-xl sm:text-2xl font-semibold font-mono text-sky-800 dark:text-sky-300 mt-1">
            {isLoading ? "—" : stats.assets}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {ui("الصندوق، البنك، الأسطول")}</span>
        </button>

        {/* Revenues 4xxx */}
        <button
          type="button"
          onClick={() =>
            setTypeFilter(typeFilter === "REVENUE" ? "ALL" : "REVENUE")
          }
          className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
            typeFilter === "REVENUE"
              ? "bg-emerald-500/12 border-emerald-600 ring-1 ring-emerald-600/30 dark:bg-emerald-950/45 dark:border-emerald-500 dark:ring-emerald-500/30"
              : "theme-card theme-border hover:border-emerald-600/50"
          }`}
        >
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            {ui("4000 الإيرادات")}</span>
          <div className="text-xl sm:text-2xl font-semibold font-mono text-emerald-800 dark:text-emerald-300 mt-1">
            {isLoading ? "—" : stats.revenues}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {ui("نقل، VIP، عمرة، صادرات")}</span>
        </button>

        {/* Expenses 5xxx */}
        <button
          type="button"
          onClick={() =>
            setTypeFilter(typeFilter === "EXPENSE" ? "ALL" : "EXPENSE")
          }
          className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
            typeFilter === "EXPENSE"
              ? "bg-rose-500/10 border-rose-600 ring-1 ring-rose-600/30"
              : "theme-card theme-border hover:border-rose-600/50"
          }`}
        >
          <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
            {ui("5000 المصروفات")}</span>
          <div className="text-xl sm:text-2xl font-semibold font-mono text-rose-800 dark:text-rose-300 mt-1">
            {isLoading ? "—" : stats.expenses}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {ui("وقود، صيانة، رواتب، TGA")}</span>
        </button>
      </div>

      {/* Toolbar: Search, Category Tabs & View Mode Switcher */}
      <div className="theme-card p-4 rounded-2xl border theme-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ui("ابحث بالرمز (1102)، الاسم العربي (البنك الأهلي)، أو الإنجليزي (Fuel)...")}
            className="theme-input w-full h-11 ps-10 pe-11 py-2.5 text-xs sm:text-sm rounded-xl"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute end-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              aria-label={ui("مسح البحث")}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Category Pills & Posting Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="theme-input h-11 rounded-xl px-3 text-xs font-bold"
            aria-label={ui("فلترة بنوع الحساب")}
          >
            <option value="ALL">{ui("جميع الأبواب الرئيسية")}</option>
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {ui(v.label)} ({v.codePrefix})
              </option>
            ))}
          </select>

          <select
            value={postingFilter}
            onChange={(e) =>
              setPostingFilter(e.target.value as "ALL" | "POSTING" | "GROUP")
            }
            className="theme-input h-11 rounded-xl px-3 text-xs font-bold"
            aria-label={ui("فلترة بطبيعة الترحيل")}
          >
            <option value="ALL">{ui("كافة الحسابات (فرعي ورئيسي)")}</option>
            <option value="POSTING">{ui("حسابات فرعية فقط (يقبل القيود)")}</option>
            <option value="GROUP">{ui("حسابات رئيسية تجميعية فقط")}</option>
          </select>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border theme-border p-1 bg-[var(--bg-card-subtle)] gap-1">
            <button
              type="button"
              aria-pressed={viewMode === "TREE"}
              onClick={() => setViewMode("TREE")}
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "TREE"
                  ? "bg-[var(--bg-card)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/45"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <FolderTree className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("شجرة هرمية")}</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "TABLE"}
              onClick={() => setViewMode("TABLE")}
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-[var(--bg-card)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/45"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <Layers className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("جدول منبسط")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error & Loading Indicators */}
      {error && (
        <p role="alert" className="text-sm font-bold text-rose-700 dark:text-rose-300">
          {ui(error)}
        </p>
      )}
      {isLoading && (
        <div
          role="status"
          className="theme-card h-64 animate-pulse rounded-2xl flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
            <RefreshCw className="size-6 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />
            <span className="text-xs font-bold">{ui("جارٍ تحميل شجرة الحسابات…")}</span>
          </div>
        </div>
      )}

      {/* View Mode 1: Hierarchical Category Tree View */}
      {viewMode === "TREE" && !isLoading && (
        <div className="space-y-4">
          {(
            ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const
          ).map((typeKey) => {
            const typeInfo = TYPES[typeKey];
            const typeAccounts = groupedByType[typeKey] || [];
            if (typeAccounts.length === 0 && (typeFilter !== "ALL" || search))
              return null;

            const isCollapsed = Boolean(collapsedTypes[typeKey]);
            const postingCount = typeAccounts.filter((a) => a.isPosting).length;

            return (
              <div
                key={typeKey}
                className="theme-card rounded-2xl border theme-border overflow-hidden transition-all shadow-xs"
              >
                {/* Category Header (sibling buttons, never nested interactive controls) */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-[var(--table-header-bg)] border-b theme-border">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleTypeCollapse(typeKey)}
                    className="flex flex-1 min-w-0 min-h-11 items-center justify-between gap-3 text-start cursor-pointer hover:opacity-80 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] border border-amber-600/30 text-[var(--accent-gold)] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {typeInfo.codePrefix.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                            {ui(typeInfo.label)}
                          </h2>
                          <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
                            ({typeInfo.codePrefix})
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {typeAccounts.length} {ui("حساب مسجل ·")} {postingCount}{" "}
                          {ui("حساب فرعي يقبل الترحيل")}
                        </p>
                      </div>
                    </div>
                    <span className="p-1 text-[var(--text-muted)] shrink-0">
                      {isCollapsed ? (
                        <ChevronDown className="size-4" aria-hidden="true" />
                      ) : (
                        <ChevronUp className="size-4" aria-hidden="true" />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const rootParent =
                        typeAccounts.find(
                          (a) => !a.isPosting && depth(a) === 0,
                        ) || typeAccounts[0];
                      setEditor({
                        account: "NEW",
                        prefillParent: rootParent,
                      });
                    }}
                    className="inline-flex min-h-11 sm:min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="size-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                    <span>{ui("+ حساب فرعي")}</span>
                  </button>
                </div>

                {/* Category Accounts Body */}
                {!isCollapsed && (
                  <div className="divide-y theme-border">
                    {typeAccounts.length === 0 ? (
                      <p className="p-5 text-center text-xs text-[var(--text-muted)]">
                        {ui("لا توجد حسابات مطابقة للبحث في هذا الباب.")}</p>
                    ) : (
                      typeAccounts.map((a) => {
                        const accountDepth = depth(a);
                        const isMain = !a.isPosting;

                        return (
                          <div
                            key={a.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 transition hover:bg-[var(--table-row-hover)] ${
                              isMain
                                ? "bg-[var(--bg-card-subtle)]/55 font-bold"
                                : ""
                            }`}
                          >
                            {/* Code, Name, Indent & Icon */}
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              {/* Visual Tree Indentation (compact on mobile) */}
                              {accountDepth > 0 && (
                                <div
                                  style={{
                                    width: `clamp(14px, ${accountDepth * 12}px, 36px)`,
                                  }}
                                  className="shrink-0 flex items-center justify-end sm:hidden"
                                >
                                  <span className="text-[var(--control-border)] font-mono text-xs select-none">
                                    └─
                                  </span>
                                </div>
                              )}
                              <div
                                style={{ width: accountDepth * 22 }}
                                className="hidden sm:flex shrink-0 items-center justify-end"
                              >
                                {accountDepth > 0 && (
                                  <span className="text-[var(--control-border)] font-mono text-xs select-none">
                                    └─
                                  </span>
                                )}
                              </div>

                              {/* Branch Icon */}
                              <div className="mt-0.5 sm:mt-0 shrink-0">
                                {isMain ? (
                                  <Folder className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
                                ) : (
                                  <FileSpreadsheet className="size-4 text-[var(--accent-gold)]" aria-hidden="true" />
                                )}
                              </div>

                              {/* Code with Copy Button */}
                              <div className="flex items-center gap-1 shrink-0">
                                <code className="font-mono text-xs font-semibold text-[var(--accent-gold)] bg-[var(--accent-surface)] px-2 py-0.5 rounded-md border border-amber-600/30">
                                  {a.code}
                                </code>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyCode(a.code, e)}
                                  className="inline-flex min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 items-center justify-center rounded hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                                  aria-label={`${ui("نسخ رمز الحساب")} ${a.code}`}
                                  title={ui("نسخ رمز الحساب")}
                                >
                                  {copiedCode === a.code ? (
                                    <Check className="size-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                                  ) : (
                                    <Copy className="size-3.5" aria-hidden="true" />
                                  )}
                                </button>
                              </div>

                              {/* Name & English Subtitle */}
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                                  {(ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr))}
                                </p>
                                <p
                                  className="text-xs text-[var(--text-muted)] truncate"
                                  dir={ui.language === "en" ? "rtl" : "ltr"}
                                >
                                  {ui.language === "en" ? a.nameAr : a.nameEn}
                                </p>
                              </div>
                            </div>

                            {/* Badges & Actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
                              {/* Posting Capability Badge */}
                              {a.isPosting ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35">
                                  <CheckCircle2 className="size-3" aria-hidden="true" />
                                  <span>{ui("يقبل القيود (فرعي)")}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-surface)] px-2 py-0.5 text-xs font-bold text-[var(--accent-gold)] border border-amber-600/30">
                                  <Folder className="size-3" aria-hidden="true" />
                                  <span>{ui("تجميعي (رئيسي)")}</span>
                                </span>
                              )}

                              {/* Balance Nature */}
                              <span className="rounded-md bg-[var(--bg-card-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)] border border-[var(--border-color)]">
                                {ui(a.normalBalance === "DEBIT"
                                  ? "طبيعة: مدين"
                                  : "طبيعة: دائن")}
                              </span>

                              {/* Active Status */}
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                  a.isActive
                                    ? "bg-emerald-500/12 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300"
                                    : "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                                }`}
                              >
                                {ui(a.isActive ? "نشط" : "معطل")}
                              </span>

                              {/* System Badge */}
                              {a.isSystem && (
                                <span className="rounded-md bg-[var(--bg-card-subtle)] border border-[var(--border-color)] px-1.5 py-0.5 text-xs font-bold text-[var(--text-muted)]">
                                  {ui("نظامي")}</span>
                              )}

                              {/* Add Child Sub-Account (Only on Group Accounts) */}
                              {!a.isPosting && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditor({
                                      account: "NEW",
                                      prefillParent: a,
                                    })
                                  }
                                  className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] px-2.5 py-1 text-xs font-bold text-[var(--accent-gold)] transition cursor-pointer"
                                  title={
                                    ui.language === "en"
                                      ? `Add sub-account under ${a.code}`
                                      : `إضافة حساب فرعي تحت ${a.code}`
                                  }
                                >
                                  <Plus className="size-3" aria-hidden="true" />
                                  <span>{ui("+ فرعي")}</span>
                                </button>
                              )}

                              {/* Edit Button */}
                              <button
                                type="button"
                                className="min-h-11 sm:min-h-8 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-3 py-1 text-xs font-bold text-[var(--text-main)] cursor-pointer transition shadow-2xs"
                                onClick={() => setEditor({ account: a })}
                              >
                                {ui("تعديل")}</button>
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

      {/* View Mode 2: Flat Data Table / Mobile Cards View */}
      {viewMode === "TABLE" && !isLoading && (
        <>
          <div className="md:hidden space-y-3">
            {filteredAccounts.length === 0 ? (
              <div className="theme-card rounded-2xl border theme-border p-8 text-center text-[var(--text-muted)] text-xs">
                {ui("لا توجد حسابات مطابقة لشروط البحث.")}
              </div>
            ) : (
              filteredAccounts.map((a) => (
                <MobileRecordCard
                  key={a.id}
                  title={
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono font-bold text-[var(--accent-gold)] bg-[var(--accent-surface)] px-2 py-0.5 rounded-md border border-amber-600/30 text-xs">
                        {a.code}
                      </code>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(a.code, e)}
                        className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                        aria-label={`${ui("نسخ رمز الحساب")} ${a.code}`}
                        title={ui("نسخ رمز الحساب")}
                      >
                        {copiedCode === a.code ? (
                          <Check className="size-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                        ) : (
                          <Copy className="size-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  }
                  subtitle={
                    <div className="space-y-0.5">
                      <p className="font-bold text-[var(--text-main)]">
                        {ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]" dir={ui.language === "en" ? "rtl" : "ltr"}>
                        {ui.language === "en" ? a.nameAr : a.nameEn}
                      </p>
                    </div>
                  }
                  badge={
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Badge variant={a.isActive ? "success" : "destructive"} className="text-[10px]">
                        {ui(a.isActive ? "نشط" : "معطل")}
                      </Badge>
                      {a.isSystem && (
                        <Badge variant="outline" className="text-[10px]">
                          {ui("نظامي")}
                        </Badge>
                      )}
                    </div>
                  }
                  footer={
                    <>
                      {!a.isPosting && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditor({ account: "NEW", prefillParent: a })}
                          className="flex-1 min-h-11 gap-1 text-xs font-bold text-[var(--accent-gold)]"
                          title={
                            ui.language === "en"
                              ? `Add sub-account under ${a.code}`
                              : `إضافة حساب فرعي تحت ${a.code}`
                          }
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          <span>{ui("+ فرعي")}</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 min-h-11 text-xs font-bold"
                        onClick={() => setEditor({ account: a })}
                      >
                        {ui("تعديل")}
                      </Button>
                    </>
                  }
                >
                  <MobileCardMetaGrid>
                    <MobileCardField
                      label={ui("الباب / الطبيعة")}
                      value={`${ui(TYPES[a.type]?.label || a.type)} · ${ui(a.normalBalance === "DEBIT" ? "مدين" : "دائن")}`}
                    />
                    <MobileCardField
                      label={ui("صلاحية الترحيل")}
                      value={a.isPosting ? ui("فرعي (يقبل القيود)") : ui("تجميعي (رئيسي)")}
                    />
                  </MobileCardMetaGrid>
                </MobileRecordCard>
              ))
            )}
          </div>

          <div className="hidden md:block theme-card overflow-x-auto rounded-2xl border theme-border shadow-xs">
            <table className="w-full min-w-[760px] text-start text-xs sm:text-sm">
            <thead className="bg-[var(--table-header-bg)] text-xs text-[var(--text-muted)] font-bold border-b theme-border">
              <tr>
                <th className="px-5 py-3.5">{ui("الرمز")}</th>
                <th className="px-5 py-3.5">{ui("اسم الحساب")}</th>
                <th className="px-5 py-3.5">{ui("الباب / الطبيعة")}</th>
                <th className="px-5 py-3.5">{ui("صلاحية الترحيل")}</th>
                <th className="px-5 py-3.5">{ui("الحالة")}</th>
                <th className="px-5 py-3.5 text-end">{ui("الإجراءات")}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border text-[var(--text-main)]">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-[var(--text-muted)] text-xs"
                  >
                    {ui("لا توجد حسابات مطابقة لشروط البحث.")}</td>
                </tr>
              ) : (
                filteredAccounts.map((a) => (
                  <tr
                    key={a.id}
                    className={`hover:bg-[var(--table-row-hover)] transition ${
                      !a.isPosting
                        ? "bg-[var(--bg-card-subtle)]/55 font-bold"
                        : ""
                    }`}
                  >
                    {/* Code with Copy */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono font-bold text-[var(--accent-gold)] bg-[var(--accent-surface)] px-2 py-0.5 rounded-md border border-amber-600/30">
                          {a.code}
                        </code>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(a.code, e)}
                          className="p-1 rounded hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                          aria-label={`${ui("نسخ رمز الحساب")} ${a.code}`}
                          title={ui("نسخ رمز الحساب")}
                        >
                          {copiedCode === a.code ? (
                            <Check className="size-3 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                          ) : (
                            <Copy className="size-3" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--text-main)]">
                          {(ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr))}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]" dir={ui.language === "en" ? "rtl" : "ltr"}>
                          {ui.language === "en" ? a.nameAr : a.nameEn}
                        </p>
                      </div>
                    </td>

                    {/* Type & Balance */}
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <p className="font-bold">
                        {ui(TYPES[a.type]?.label || a.type)}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">
                        {ui(a.normalBalance === "DEBIT"
                          ? "طبيعة رصيد: مدين"
                          : "طبيعة رصيد: دائن")}
                      </p>
                    </td>

                    {/* Posting Capability */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {a.isPosting ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35">
                          <CheckCircle2 className="size-3" />
                          <span>{ui("فرعي (يقبل القيود)")}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-surface)] px-2 py-0.5 text-xs font-bold text-[var(--accent-gold)] border border-amber-600/30">
                          <Folder className="size-3" />
                          <span>{ui("تجميعي (رئيسي)")}</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          a.isActive
                            ? "bg-emerald-500/12 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300"
                            : "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                        }`}
                      >
                        {ui(a.isActive ? "نشط" : "معطل")}
                      </span>
                      {a.isSystem && (
                        <span className="ms-1.5 rounded-md bg-[var(--bg-card-subtle)] border border-[var(--border-color)] px-1.5 py-0.5 text-xs font-bold text-[var(--text-muted)]">
                          {ui("نظامي")}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {!a.isPosting && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditor({ account: "NEW", prefillParent: a })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] px-2.5 py-1.5 text-xs font-bold text-[var(--accent-gold)] transition cursor-pointer"
                            title={
                              ui.language === "en"
                                ? `Add sub-account under ${a.code}`
                                : `إضافة حساب فرعي تحت ${a.code}`
                            }
                          >
                            <Plus className="size-3" aria-hidden="true" />
                            <span>{ui("+ فرعي")}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[var(--text-main)] cursor-pointer transition shadow-2xs"
                          onClick={() => setEditor({ account: a })}
                        >
                          {ui("تعديل")}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </>
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
