"use client";
import { useUrlState } from "@/lib/use-url-state";
import { useEffect, useId, useRef, useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useUiText } from "@/lib/ui-text";
import { commercialRequest, csvDownload, type Member, type StaffStatement, type StaffOperation, type Payroll } from "@/lib/commercial";
import { formatSignedMinor, signedMoneyMinor } from "@/lib/money";
import { getCaptains } from "@/app/_actions/captain";
import { currentSaudiPeriod } from "@/lib/accounting";
import { useAuth } from "@/lib/authContext";
import {
  PageHeader,
  StatCard,
  StatRow,
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Checkbox,
  formatMoneyValue,
} from "@/app/_components/ui";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";
import Modal from "@/app/_components/Modal";
import {
  UserCheck,
  Users,
  UserPlus,
  Download,
  Wallet,
  Coins,
  HandCoins,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Phone,
  Banknote,
  Search,
  CreditCard,
  ArrowDownLeft,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Edit2,
  X,
} from "lucide-react";
import { BUTTON, INPUT, SECONDARY, Field, Notice, Panel, LoadingRows, useCommercialData, useMutation } from "./shared";

const MEMBER_FILTERS = ["ALL", "DRIVER", "EMPLOYEE", "EXTERNAL", "ACTIVE", "INACTIVE"] as const;
type MemberFilter = (typeof MEMBER_FILTERS)[number];

const OPERATION_FILTERS = ["ALL", "PAYOUT", "SALARY", "CUSTODY", "ADVANCE", "COMMISSION"] as const;
type OperationFilter = (typeof OPERATION_FILTERS)[number];

function formatIbanDisplay(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

function isNonZeroMoney(value?: string | null): boolean {
  return signedMoneyMinor(value) !== BigInt(0);
}

function formatSignedDelta(value: string): {
  minor: bigint;
  display: string;
  negative: boolean;
  positive: boolean;
} {
  const minor = signedMoneyMinor(value);
  const negative = minor < BigInt(0);
  const positive = minor > BigInt(0);
  const formatted = formatMoneyValue(formatSignedMinor(minor));
  return {
    minor,
    display: positive ? `+${formatted}` : formatted,
    negative,
    positive,
  };
}

const KIND_LABELS: Record<Member["kind"], string> = {
  DRIVER: "سائق",
  EMPLOYEE: "موظف",
  EXTERNAL_INDIVIDUAL: "وسيط خارجي — فرد",
  EXTERNAL_COMPANY: "وسيط خارجي — شركة",
};

export const OPERATION_LABELS: Record<string, string> = {
  SALARY: "راتب",
  COMMISSION: "عمولة رحلة",
  CUSTODY_ISSUE: "صرف عهدة",
  CUSTODY_RETURN: "رد عهدة",
  ADVANCE_ISSUE: "صرف سلفة",
  ADVANCE_RETURN: "رد سلفة",
  PAYOUT: "صرف مستحقات",
  CUSTODY_SETTLE: "تسوية عهدة بفاتورة",
  COMMISSION_BILL: "ربط فاتورة الوسيط",
  REVERSAL: "عكس حركة",
};

export function MemberEditor({ member, onSaved, onClose }: { member?: Member; onSaved: () => void; onClose: () => void }) {
  const ui = useUiText(),
    m = useMutation(),
    [captains, setCaptains] = useState<{ id: string; name: string }[]>([]),
    [lookupError, setLookupError] = useState("");
  const [f, setF] = useState({
    name: member?.name || "",
    kind: member?.kind || "EXTERNAL_INDIVIDUAL",
    captainId: member?.captainId || "",
    isRepresentative: member?.isRepresentative ?? true,
    phone: member?.phone || "",
    vatNumber: member?.vatNumber || "",
    active: member?.active ?? true,
    bankName: member?.bankDetails?.bankName || "",
    accountHolder: member?.bankDetails?.accountHolder || "",
    iban: member?.bankDetails?.iban || "",
  });

  useEffect(() => {
    let alive = true;
    getCaptains()
      .then((r) => {
        if (alive && r.captains) setCaptains(r.captains);
        if (alive && !r.success) setLookupError(r.error || "تعذر تحميل السائقين");
      })
      .catch(() => {
        if (alive) setLookupError("تعذر تحميل السائقين");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: f.name,
      kind: f.kind,
      isRepresentative: f.isRepresentative,
      active: f.active,
      ...(f.kind === "DRIVER" ? { captainId: f.captainId } : {}),
      phone: f.phone,
      ...(f.kind.startsWith("EXTERNAL") && f.vatNumber ? { vatNumber: f.vatNumber } : {}),
      ...([f.bankName, f.accountHolder, f.iban].some(Boolean)
        ? {
            bankDetails: {
              bankName: f.bankName,
              accountHolder: f.accountHolder,
              iban: f.iban.replace(/\s/g, "").toUpperCase(),
            },
          }
        : {}),
    };
    await m.run(
      () =>
        commercialRequest(
          member ? `/members/${member.id}` : "/members",
          member ? "PUT" : "POST",
          member ? { version: member.version, member: payload } : payload,
        ),
      onSaved,
    );
  }

  return (
    <Panel title={member ? "تعديل الحساب" : "إضافة مندوب أو موظف"}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم">
            <input required className={INPUT} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="صفة الحساب">
            <select
              disabled={Boolean(member)}
              className={INPUT}
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value as Member["kind"] })}
            >
              {Object.entries(KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {ui(v)}
                </option>
              ))}
            </select>
          </Field>
          {f.kind === "DRIVER" && (
            <Field label="السائق المرتبط">
              <select
                disabled={Boolean(member)}
                required
                className={INPUT}
                value={f.captainId}
                onChange={(e) => {
                  const cap = captains.find((c) => c.id === e.target.value);
                  setF({ ...f, captainId: e.target.value, name: cap?.name || f.name });
                }}
              >
                <option value="">{ui("اختر السائق")}</option>
                {captains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {(
            [
              ["phone", "رقم التواصل"],
              ...(f.kind.startsWith("EXTERNAL") ? [["vatNumber", "الرقم الضريبي"]] : []),
              ["bankName", "اسم البنك"],
              ["accountHolder", "اسم صاحب الحساب"],
              ["iban", "آيبان / IBAN"],
            ] as [keyof typeof f, string][]
          ).map(([k, label]) => {
            const isLtr = k === "phone" || k === "vatNumber" || k === "iban";
            return (
              <Field label={label} key={k}>
                <input
                  type={k === "phone" ? "tel" : "text"}
                  dir={isLtr ? "ltr" : undefined}
                  className={`${INPUT}${isLtr ? " text-start font-mono" : ""}`}
                  value={String(f[k])}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                />
              </Field>
            );
          })}
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2 pt-1">
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium cursor-pointer">
              <Checkbox
                checked={f.isRepresentative}
                onChange={(e) => setF({ ...f, isRepresentative: e.target.checked })}
              />
              <span>{ui("يستحق عمولات إحالة")}</span>
            </label>
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium cursor-pointer">
              <Checkbox
                checked={f.active}
                onChange={(e) => setF({ ...f, active: e.target.checked })}
              />
              <span>{ui("نشط")}</span>
            </label>
          </div>
        </div>
        <Notice message={lookupError || m.error} error />
        <div className="flex gap-2">
          <button type="submit" disabled={m.busy} className={BUTTON}>
            {ui("حفظ الحساب")}
          </button>
          <button type="button" className={SECONDARY} onClick={onClose}>
            {ui("إغلاق")}
          </button>
        </div>
      </form>
    </Panel>
  );
}

export function MembersPage({ representatives = false }: { representatives?: boolean }) {
  const ui = useUiText();
  const list = useCommercialData<{ items: Member[] }>(`/members?representatives=${representatives}`);
  const [editing, setEditing] = useState<Member | "NEW" | null>(null);
  const [search, setSearch] = useUrlState<string>("q", "");
  const [kindFilter, setKindFilter] = useUrlState<MemberFilter>("kind", "ALL", MEMBER_FILTERS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const membersHeadingId = useId();

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const membersHelpGuide = useMemo(
    () => ({
      title: ui("دليل حسابات السائقين والمناديب"),
      summary: ui("المستحقات والعهد والسلف منفصلة، وكل حركة جديدة مرتبطة بدفتر الأستاذ."),
      cards: [
        {
          title: ui("حسابات السائقين"),
          badge: ui("إدارة العاملين والسائقين"),
          items: [
            {
              label: ui("الرواتب والمسيرات"),
              description: ui("تعريف راتب شهري ومسيرات رواتب معتمدة دون تكرار للشهر نفسه."),
            },
            {
              label: ui("العهد والسلف"),
              description: ui("العهد التشغيلية تُسوّى بالفواتير أو الرد، والسلف الشخصية تُخصم يدويًا عند الصرف."),
            },
          ],
        },
        {
          title: ui("المناديب وعمولات الإحالة"),
          badge: ui("الوسطاء والمناديب"),
          items: [
            {
              label: ui("عمولات الرحلات والمناديب"),
              description: ui("العمولات تُحسب على أساس مستقل ولا تُصرف إلا بعد اعتماد تنفيذ الرحلة."),
            },
          ],
        },
      ],
      tip: ui("افتح حساب السائق من صفحة الكباتن، أو أضف مندوبًا جديدًا."),
    }),
    [ui],
  );

  const items = list.data?.items ?? [];
  const activeCount = items.filter((r) => r.active).length;
  const repCount = items.filter((r) => r.isRepresentative).length;
  const bankReadyCount = items.filter((r) => Boolean(r.bankDetails?.iban?.trim())).length;

  const filterCounts: Record<MemberFilter, number> = {
    ALL: items.length,
    DRIVER: items.filter((r) => r.kind === "DRIVER").length,
    EMPLOYEE: items.filter((r) => r.kind === "EMPLOYEE").length,
    EXTERNAL: items.filter((r) => r.kind.startsWith("EXTERNAL")).length,
    ACTIVE: activeCount,
    INACTIVE: items.length - activeCount,
  };

  const hasActiveFilter = kindFilter !== "ALL" || search.trim().length > 0;

  const filteredItems = items.filter((r) => {
    if (kindFilter === "DRIVER" && r.kind !== "DRIVER") return false;
    if (kindFilter === "EMPLOYEE" && r.kind !== "EMPLOYEE") return false;
    if (kindFilter === "EXTERNAL" && !r.kind.startsWith("EXTERNAL")) return false;
    if (kindFilter === "ACTIVE" && !r.active) return false;
    if (kindFilter === "INACTIVE" && r.active) return false;

    const rawQ = search.trim().toLowerCase();
    if (!rawQ) return true;
    const normalizedIbanQuery = rawQ.replace(/\s+/g, "");
    const name = r.name.toLowerCase();
    const phone = (r.phone || "").toLowerCase();
    const vat = (r.vatNumber || "").toLowerCase();
    const bankName = (r.bankDetails?.bankName || "").toLowerCase();
    const holder = (r.bankDetails?.accountHolder || "").toLowerCase();
    const iban = (r.bankDetails?.iban || "").replace(/\s+/g, "").toLowerCase();
    return (
      name.includes(rawQ) ||
      phone.includes(rawQ) ||
      vat.includes(rawQ) ||
      bankName.includes(rawQ) ||
      holder.includes(rawQ) ||
      iban.includes(normalizedIbanQuery)
    );
  });

  const handleCopyIban = async (id: string, iban: string) => {
    try {
      await navigator.clipboard?.writeText(iban.replace(/\s+/g, ""));
      setCopiedId(id);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API may be unavailable in non-HTTPS contexts
    }
  };

  const resetFilters = () => {
    setKindFilter("ALL");
    setSearch("");
  };

  const filterTabs: { id: MemberFilter; label: string }[] = [
    { id: "ALL", label: "جميع الحسابات" },
    { id: "DRIVER", label: "سائقين" },
    { id: "EMPLOYEE", label: "موظفين" },
    { id: "EXTERNAL", label: "وسطاء ومناديب" },
    { id: "ACTIVE", label: "نشط" },
    { id: "INACTIVE", label: "موقوف" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={representatives ? "المناديب وعمولات الإحالة" : "حسابات السائقين والعاملين"}
        subtitle="المستحقات والعهد والسلف منفصلة، وكل حركة جديدة مرتبطة بدفتر الأستاذ."
        badge={representatives ? "الوسطاء والمناديب" : "إدارة العاملين والسائقين"}
        icon={representatives ? Users : UserCheck}
        primaryAction={{
          label: "إضافة مندوب أو موظف",
          onClick: () => setEditing("NEW"),
          icon: UserPlus,
          variant: "primary",
        }}
        secondaryActions={[
          {
            label: "تصدير التقرير",
            icon: Download,
            onClick: () => {
              csvDownload(`staff-report-${currentSaudiPeriod().day}.csv`, [
                [representatives ? "المناديب وعمولات الإحالة" : "تقرير العاملين", `إجمالي: ${filteredItems.length}`],
                [
                  "الاسم",
                  "صفة الحساب",
                  "رقم التواصل",
                  "الهوية / الرقم الضريبي",
                  "اسم البنك",
                  "صاحب الحساب",
                  "الآيبان",
                  "عمولات الإحالة",
                  "الحالة",
                ],
                ...filteredItems.map((r) => [
                  r.name,
                  ui(KIND_LABELS[r.kind] || r.kind),
                  r.phone || "—",
                  r.vatNumber || "—",
                  r.bankDetails?.bankName || "—",
                  r.bankDetails?.accountHolder || "—",
                  r.bankDetails?.iban || "—",
                  r.isRepresentative ? "مؤهل للعمولة" : "غير مؤهل",
                  r.active ? "نشط" : "موقوف",
                ]),
              ]);
            },
            variant: "secondary",
          },
        ]}
        helpGuide={membersHelpGuide}
        onRefresh={list.reload}
        isRefreshing={list.loading}
      />

      {/* KPI Stats Ribbon */}
      <StatRow columns={4}>
        <StatCard
          label={ui(representatives ? "المناديب وعمولات الإحالة" : "حسابات السائقين والعاملين")}
          value={items.length}
          unit={ui("حساب مالي")}
          icon={representatives ? Users : UserCheck}
          isActive={kindFilter === "ALL"}
          onClick={() => setKindFilter("ALL")}
          isLoading={list.loading && !list.data}
        />
        <StatCard
          label={ui("نشط")}
          value={activeCount}
          unit={ui("حساب مالي")}
          icon={CheckCircle2}
          variant="emerald"
          isActive={kindFilter === "ACTIVE"}
          onClick={() => setKindFilter(kindFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
          isLoading={list.loading && !list.data}
        />
        <StatCard
          label={ui("مؤهلون للعمولة")}
          value={repCount}
          unit={ui("حساب مالي")}
          icon={Sparkles}
          variant="amber"
          isLoading={list.loading && !list.data}
        />
        <StatCard
          label={ui("بيانات بنكية مسجلة")}
          value={bankReadyCount}
          unit={ui("حساب بنكي")}
          icon={CreditCard}
          variant="blue"
          isLoading={list.loading && !list.data}
        />
      </StatRow>

      {editing && (
        <MemberEditor
          key={editing === "NEW" ? "NEW" : editing.id}
          member={editing === "NEW" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}

      <Notice message={list.error} error />

      {/* Directory Table & Mobile Cards inside a single shadcn Card */}
      <Card className="theme-card border theme-border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b theme-border bg-[var(--bg-card-subtle)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
                {representatives ? (
                  <Users className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id={membersHeadingId}
                    className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-tight"
                  >
                    {ui(representatives ? "سجل المناديب" : "سجل الحسابات")}
                  </h2>
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {filteredItems.length} / {items.length}
                  </Badge>
                </div>
              </div>
            </div>

            {hasActiveFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="min-h-11 sm:min-h-9 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 gap-1.5"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{ui("مسح عوامل التصفية")}</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={ui("تصفية")}>
              {filterTabs.map((tab) => {
                const active = kindFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setKindFilter(tab.id)}
                    className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                      active
                        ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border-[var(--accent-btn-border)] shadow-2xs"
                        : "bg-[var(--bg-card)] border-[var(--control-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                    }`}
                  >
                    <span>{ui(tab.label)}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${
                        active
                          ? "bg-black/20 text-[var(--accent-btn-fg)] dark:bg-white/25 dark:text-[var(--accent-btn-fg)]"
                          : "bg-[var(--bg-card-subtle)] text-[var(--text-main)]"
                      }`}
                    >
                      {filterCounts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-80 shrink-0">
              <Search
                className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className="w-full min-h-11 sm:min-h-9 ps-9 pe-10 py-2 rounded-xl border border-[var(--control-border)] bg-[var(--input-bg)] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] text-base sm:text-xs outline-none focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/20"
                aria-label={ui("بحث بالاسم، الجوال، الضريبي أو الآيبان...")}
                placeholder={ui("بحث بالاسم، الجوال، الضريبي أو الآيبان...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label={ui("مسح البحث")}
                  className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center absolute end-0.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {list.loading ? (
            <>
              <div className="hidden lg:block">
                <Table
                  regionLabelledBy={membersHeadingId}
                  wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                  className="border-separate border-spacing-0"
                >
                  <TableCaption className="sr-only">
                    {ui(representatives ? "سجل المناديب" : "سجل الحسابات")}
                  </TableCaption>
                  <TableHeader className="bg-[var(--table-header-bg)]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-3 px-3 border-b theme-border whitespace-nowrap">{ui("الحساب والصفة")}</TableHead>
                      <TableHead className="py-3 px-3 border-b theme-border whitespace-nowrap">{ui("التواصل والهوية")}</TableHead>
                      <TableHead className="py-3 px-3 border-b theme-border whitespace-nowrap">{ui("البيانات البنكية")}</TableHead>
                      <TableHead className="py-3 px-3 border-b theme-border leading-snug">{ui("عمولات الإحالة")}</TableHead>
                      <TableHead className="sticky end-0 z-20 py-3 px-3 text-end border-b theme-border border-s theme-border bg-[var(--table-header-bg)] whitespace-nowrap">
                        {ui("الإجراءات")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child_td]:border-b-0 [&_tr:last-child_th]:border-b-0">
                    {[1, 2, 3, 4].map((idx) => (
                      <TableRow key={`member-skel-${idx}`} className="animate-pulse motion-reduce:animate-none">
                        <th scope="row" className="py-3.5 px-3 border-b theme-border text-start">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[var(--border-color)]/60 shrink-0" />
                            <div className="space-y-1.5">
                              <div className="h-3.5 w-28 rounded bg-[var(--border-color)]/60" />
                              <div className="flex items-center gap-1.5">
                                <div className="h-4 w-16 rounded-lg bg-[var(--bg-card-subtle)]" />
                                <div className="h-4 w-12 rounded-lg bg-[var(--border-color)]/60" />
                              </div>
                            </div>
                          </div>
                        </th>
                        <TableCell className="py-3.5 px-3 border-b theme-border">
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-24 rounded bg-[var(--border-color)]/60" />
                            <div className="h-3 w-20 rounded bg-[var(--bg-card-subtle)]" />
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-3 border-b theme-border">
                          <div className="space-y-1.5">
                            <div className="h-3 w-24 rounded bg-[var(--bg-card-subtle)]" />
                            <div className="h-5 w-44 rounded bg-[var(--border-color)]/60" />
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-3 border-b theme-border">
                          <div className="h-5 w-24 rounded-lg bg-[var(--border-color)]/60" />
                        </TableCell>
                        <TableCell className="sticky end-0 z-10 bg-[var(--bg-card)] py-3.5 px-3 border-b theme-border border-s theme-border text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="h-9 w-24 rounded-lg bg-[var(--border-color)]/60" />
                            <div className="h-9 w-16 rounded-lg bg-[var(--border-color)]/60" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="lg:hidden p-3.5 space-y-3" aria-busy="true">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={`member-mob-skel-${idx}`}
                    className="rounded-2xl border theme-border bg-[var(--bg-card)] p-4 space-y-3 animate-pulse motion-reduce:animate-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[var(--border-color)]/60" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 rounded bg-[var(--border-color)]/60" />
                          <div className="h-4 w-20 rounded-full bg-[var(--bg-card-subtle)]" />
                        </div>
                      </div>
                      <div className="h-5 w-14 rounded-full bg-[var(--border-color)]/60" />
                    </div>
                    <div className="h-14 rounded-xl bg-[var(--bg-card-subtle)]" />
                    <div className="flex gap-2">
                      <div className="h-11 flex-1 rounded-xl bg-[var(--border-color)]/60" />
                      <div className="h-11 w-20 rounded-xl bg-[var(--border-color)]/60" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : !filteredItems.length ? (
            <div className="p-10 sm:p-14 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center">
                {representatives ? (
                  <Users className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <UserCheck className="w-6 h-6" aria-hidden="true" />
                )}
              </div>
              <p className="text-sm font-bold text-[var(--text-main)]">
                {ui(hasActiveFilter ? "لا توجد نتائج مطابقة للبحث" : "لا توجد حسابات مسجلة")}
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {ui(
                  hasActiveFilter
                    ? "لا توجد حسابات تطابق معايير التصفية الحالية."
                    : "افتح حساب السائق من صفحة الكباتن، أو أضف مندوبًا جديدًا."
                )}
              </p>
              <div className="pt-1">
                {hasActiveFilter ? (
                  <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="min-h-11 sm:min-h-9">
                    {ui("مسح عوامل التصفية")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => setEditing("NEW")}
                    className="min-h-11 sm:min-h-9 gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    <span>{ui("إضافة مندوب أو موظف")}</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View (lg and up) */}
              <div className="hidden lg:block">
                <Table
                  regionLabelledBy={membersHeadingId}
                  wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                  className="border-separate border-spacing-0"
                >
                  <TableCaption className="sr-only">
                    {ui(representatives ? "سجل المناديب" : "سجل الحسابات")}
                  </TableCaption>
                  <TableHeader className="bg-[var(--table-header-bg)] text-xs font-bold text-[var(--text-muted)]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-3.5 px-3 border-b theme-border whitespace-nowrap">{ui("الحساب والصفة")}</TableHead>
                      <TableHead className="py-3.5 px-3 border-b theme-border whitespace-nowrap">{ui("التواصل والهوية")}</TableHead>
                      <TableHead className="py-3.5 px-3 border-b theme-border whitespace-nowrap">{ui("البيانات البنكية")}</TableHead>
                      <TableHead className="py-3.5 px-3 border-b theme-border leading-snug">{ui("عمولات الإحالة")}</TableHead>
                      <TableHead className="sticky end-0 z-20 py-3.5 px-3 text-end border-b theme-border border-s theme-border bg-[var(--table-header-bg)] whitespace-nowrap">
                        {ui("الإجراءات")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs [&_tr:last-child_td]:border-b-0 [&_tr:last-child_th]:border-b-0">
                    {filteredItems.map((r) => {
                      const hasAnyBank = Boolean(
                        r.bankDetails?.iban?.trim() ||
                          r.bankDetails?.bankName?.trim() ||
                          r.bankDetails?.accountHolder?.trim()
                      );

                      return (
                        <TableRow
                          key={r.id}
                          className="group hover:bg-[var(--table-row-hover)] transition-colors"
                        >
                          {/* Account, Role & Status (Semantic Row Header) */}
                          <th scope="row" className="py-3.5 px-3 text-start align-middle border-b theme-border font-normal">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${
                                  r.active
                                    ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/30"
                                    : "bg-[var(--bg-card-subtle)] text-[var(--text-muted)] theme-border"
                                }`}
                                aria-hidden="true"
                              >
                                {r.name.trim().charAt(0) || "•"}
                              </div>
                              <div className="min-w-0 space-y-1.5">
                                <Link
                                  className="block font-bold text-sm text-[var(--text-main)] hover:text-[var(--accent-gold)] hover:underline truncate max-w-[220px] transition"
                                  href={`/admin/staff/${r.id}`}
                                >
                                  {r.name}
                                </Link>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="rounded-lg text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap"
                                  >
                                    {ui(KIND_LABELS[r.kind] || r.kind)}
                                  </Badge>
                                  <Badge
                                    variant={r.active ? "success" : "secondary"}
                                    className="rounded-lg text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap"
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${r.active ? "bg-emerald-600 dark:bg-emerald-300" : "bg-[var(--text-placeholder)]"}`}
                                      aria-hidden="true"
                                    />
                                    <span>{ui(r.active ? "نشط" : "موقوف")}</span>
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </th>

                          {/* Contact & VAT / ID */}
                          <TableCell className="py-3.5 px-3 align-middle border-b theme-border">
                            {r.phone || r.vatNumber ? (
                              <div className="space-y-1">
                                {r.phone && (
                                  <div>
                                    <a
                                      href={`tel:${r.phone}`}
                                      dir="ltr"
                                      className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--text-main)] hover:text-[var(--accent-gold)] whitespace-nowrap transition"
                                    >
                                      <Phone className="w-3 h-3 text-[var(--text-muted)]" aria-hidden="true" />
                                      <span>{r.phone}</span>
                                      <span className="sr-only"> — {r.name}</span>
                                    </a>
                                  </div>
                                )}
                                {r.vatNumber && (
                                  <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                    <span>{ui("الرقم الضريبي")}:</span>
                                    <bdi dir="ltr" className="font-mono font-semibold text-[var(--text-main)]">
                                      {r.vatNumber}
                                    </bdi>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </TableCell>

                          {/* Bank & IBAN */}
                          <TableCell className="py-3.5 px-3 align-middle border-b theme-border">
                            {hasAnyBank ? (
                              <div className="space-y-1">
                                {(r.bankDetails?.bankName || r.bankDetails?.accountHolder) && (
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    {r.bankDetails?.bankName && (
                                      <span className="font-semibold text-[var(--text-main)] truncate max-w-[150px]" title={r.bankDetails.bankName}>
                                        {r.bankDetails.bankName}
                                      </span>
                                    )}
                                    {r.bankDetails?.accountHolder && r.bankDetails.accountHolder !== r.name && (
                                      <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[140px]" title={r.bankDetails.accountHolder}>
                                        · {r.bankDetails.accountHolder}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {r.bankDetails?.iban && (
                                  <div className="inline-flex items-center gap-1 rounded-lg border theme-border bg-[var(--bg-card-subtle)] text-[var(--text-main)] px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap" dir="ltr">
                                    <span className="whitespace-nowrap">{formatIbanDisplay(r.bankDetails.iban)}</span>
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyIban(r.id, r.bankDetails?.iban || "")}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--accent-surface)] hover:text-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)]/50 transition cursor-pointer shrink-0"
                                      aria-label={`${ui("نسخ الآيبان")} ${r.name}`}
                                      title={ui(copiedId === r.id ? "تم نسخ الآيبان" : "نسخ الآيبان")}
                                    >
                                      {copiedId === r.id ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)]">
                                {ui("لا توجد بيانات بنكية مسجلة")}
                              </span>
                            )}
                          </TableCell>

                          {/* Referral Eligibility */}
                          <TableCell className="py-3.5 px-3 align-middle border-b theme-border whitespace-nowrap">
                            {r.isRepresentative ? (
                              <Badge variant="gold" className="rounded-lg text-[11px] px-2 py-0.5 whitespace-nowrap">
                                {ui("مؤهل للعمولة")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="rounded-lg text-[11px] text-[var(--text-muted)] px-2 py-0.5 whitespace-nowrap">
                                {ui("غير مؤهل")}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions (Sticky end) */}
                          <TableCell className="sticky end-0 z-10 bg-[var(--bg-card)] group-hover:bg-[var(--bg-card-subtle)] transition-colors py-3.5 px-3 align-middle text-end whitespace-nowrap border-b theme-border border-s theme-border">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 px-2.5 gap-1.5 text-xs font-bold hover:border-[var(--accent-gold)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent-gold)]"
                              >
                                <Link href={`/admin/staff/${r.id}`}>
                                  <FileText className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                                  <span>{ui("كشف الحساب")}</span>
                                  <span className="sr-only"> — {r.name}</span>
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                aria-label={`${ui("تعديل")} — ${r.name}`}
                                onClick={() => setEditing(r)}
                                className="h-8 px-2.5 gap-1.5 text-xs font-bold hover:border-[var(--accent-gold)]"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                                <span>{ui("تعديل")}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile & Tablet Cards View (< lg) */}
              <div className="lg:hidden p-3.5 sm:p-4 space-y-3">
                {filteredItems.map((r) => (
                  <MobileRecordCard
                    key={r.id}
                    titleAs="h3"
                    muted={!r.active}
                    title={
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--accent-gold)]/30"
                          aria-hidden="true"
                        >
                          {r.name.trim().charAt(0) || "•"}
                        </span>
                        <Link
                          className="font-bold text-[var(--text-main)] hover:text-[var(--accent-gold)] hover:underline text-sm truncate"
                          href={`/admin/staff/${r.id}`}
                        >
                          {r.name}
                        </Link>
                      </span>
                    }
                    subtitle={
                      <span className="inline-flex flex-wrap items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[11px]">
                          {ui(KIND_LABELS[r.kind] || r.kind)}
                        </Badge>
                        {r.isRepresentative && (
                          <Badge variant="gold" className="text-[11px]">
                            {ui("مؤهل للعمولة")}
                          </Badge>
                        )}
                      </span>
                    }
                    badge={
                      <Badge variant={r.active ? "success" : "secondary"} className="text-xs">
                        {ui(r.active ? "نشط" : "موقوف")}
                      </Badge>
                    }
                    footer={
                      <div className="mobile-card-actions w-full flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1 min-h-11 gap-1.5 text-xs font-bold bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)]"
                        >
                          <Link href={`/admin/staff/${r.id}`}>
                            <FileText className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
                            <span>{ui("كشف الحساب")}</span>
                            <span className="sr-only"> — {r.name}</span>
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          aria-label={`${ui("تعديل")} — ${r.name}`}
                          className="min-h-11 px-4 gap-1.5 text-xs font-bold shrink-0"
                          onClick={() => setEditing(r)}
                        >
                          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{ui("تعديل")}</span>
                        </Button>
                      </div>
                    }
                  >
                    {(r.phone || r.vatNumber) && (
                      <MobileCardMetaGrid columns={2}>
                        {r.phone && (
                          <MobileCardField
                            label={ui("رقم التواصل")}
                            value={
                              <a href={`tel:${r.phone}`} className="font-mono text-[var(--accent-gold)] font-bold" dir="ltr">
                                {r.phone}
                              </a>
                            }
                          />
                        )}
                        {r.vatNumber && (
                          <MobileCardField
                            label={ui("الهوية / الرقم الضريبي")}
                            value={r.vatNumber}
                            mono
                            alignEnd={Boolean(r.phone)}
                          />
                        )}
                      </MobileCardMetaGrid>
                    )}
                    {(r.bankDetails?.iban || r.bankDetails?.bankName || r.bankDetails?.accountHolder) && (
                      <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[11px] font-medium text-[var(--text-muted)] block">
                            {ui("البيانات البنكية")}
                            {r.bankDetails?.bankName ? ` · ${r.bankDetails.bankName}` : ""}
                          </span>
                          {r.bankDetails?.iban ? (
                            <span className="font-mono font-bold text-xs text-[var(--text-main)] break-all tabular-nums block" dir="ltr">
                              {formatIbanDisplay(r.bankDetails.iban)}
                            </span>
                          ) : r.bankDetails?.accountHolder ? (
                            <span className="text-xs font-semibold text-[var(--text-main)] block">
                              {r.bankDetails.accountHolder}
                            </span>
                          ) : null}
                        </div>
                        {r.bankDetails?.iban && (
                          <button
                            type="button"
                            onClick={() => void handleCopyIban(r.id, r.bankDetails?.iban || "")}
                            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)]/50 transition cursor-pointer shrink-0"
                            title={ui(copiedId === r.id ? "تم نسخ الآيبان" : "نسخ الآيبان")}
                            aria-label={`${ui("نسخ الآيبان")} ${r.name}`}
                          >
                            {copiedId === r.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </MobileRecordCard>
                ))}
              </div>
            </>
          )}
        </CardContent>

        {!list.loading && filteredItems.length > 0 && (
          <CardFooter className="mt-0 px-4 sm:px-5 py-3 bg-[var(--bg-card-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span>
              {ui("عرض")}{" "}
              <strong className="font-mono tabular-nums text-[var(--text-main)]">
                {filteredItems.length}
              </strong>{" "}
              {ui("من إجمالي")}{" "}
              <strong className="font-mono tabular-nums text-[var(--accent-gold)]">
                {items.length}
              </strong>{" "}
              {ui("حساب مالي")}
            </span>
            <span className="font-mono text-[11px] tabular-nums">
              {ui("نشط")}: {activeCount} · {ui("بيانات بنكية مسجلة")}: {bankReadyCount}
            </span>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

function matchesOperationFilter(op: StaffOperation, filter: OperationFilter): boolean {
  if (filter === "PAYOUT") return op.kind === "PAYOUT";
  if (filter === "SALARY") return ["SALARY", "PAYOUT", "REVERSAL"].includes(op.kind);
  if (filter === "CUSTODY") return isNonZeroMoney(op.custodyDelta) || op.kind.startsWith("CUSTODY");
  if (filter === "ADVANCE") return isNonZeroMoney(op.advanceDelta) || op.kind.startsWith("ADVANCE");
  if (filter === "COMMISSION") return op.kind === "COMMISSION" || op.kind === "COMMISSION_BILL";
  return true;
}

export function StaffPage({
  memberId,
  captainId,
  readOnly = false,
}: {
  memberId?: string;
  captainId?: string;
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const path = memberId
    ? `/members/${memberId}`
    : `/captains/${captainId || user?.id || ""}`;
  const result = useCommercialData<StaffStatement>(path);
  const ui = useUiText();

  // Navigation tabs & URL-persisted ledger filters
  const [mainTab, setMainTab] = useState<
    "OPERATIONS" | "SALARY" | "COMMISSIONS" | "LEGACY"
  >("OPERATIONS");
  const [operationFilter, setOperationFilter] = useUrlState<OperationFilter>(
    "op",
    "ALL",
    OPERATION_FILTERS
  );
  const [searchQuery, setSearchQuery] = useUrlState<string>("q", "");
  const [copiedIban, setCopiedIban] = useState(false);
  const ibanTimerRef = useRef<number | null>(null);
  const approvePayrollMutation = useMutation();
  const [approvingPayrollId, setApprovingPayrollId] = useState<string | null>(null);

  const tabIdPrefix = useId();
  const opsHeadingId = useId();
  const payrollHeadingId = useId();
  const commissionsHeadingId = useId();
  const legacyHeadingId = useId();

  useEffect(() => {
    return () => {
      if (ibanTimerRef.current !== null) {
        window.clearTimeout(ibanTimerRef.current);
      }
    };
  }, []);

  // Modals
  const [movementModal, setMovementModal] = useState<{
    open: boolean;
    defaultKind?: string;
    defaultAmount?: string;
  }>({ open: false });
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [reverseModalOp, setReverseModalOp] = useState<StaffOperation | null>(null);

  if (result.loading) return <LoadingRows />;
  if (!result.data) return <Notice message={result.error} error />;
  const d = result.data;

  const reversedOpIds = new Set(
    d.operations
      .map((op) => op.reversalOfId)
      .filter((id): id is string => Boolean(id))
  );

  const operationFilterCounts: Record<OperationFilter, number> = {
    ALL: d.operations.length,
    PAYOUT: d.operations.filter((o) => matchesOperationFilter(o, "PAYOUT")).length,
    SALARY: d.operations.filter((o) => matchesOperationFilter(o, "SALARY")).length,
    CUSTODY: d.operations.filter((o) => matchesOperationFilter(o, "CUSTODY")).length,
    ADVANCE: d.operations.filter((o) => matchesOperationFilter(o, "ADVANCE")).length,
    COMMISSION: d.operations.filter((o) => matchesOperationFilter(o, "COMMISSION")).length,
  };

  const hasOpsFilter = operationFilter !== "ALL" || searchQuery.trim().length > 0;

  // Filter operations for table & mobile cards
  const filteredOps = d.operations.filter((o) => {
    if (!matchesOperationFilter(o, operationFilter)) return false;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const desc = (o.description || "").toLowerCase();
      const amount = o.amount || "";
      const date = o.effectiveDate.slice(0, 10).toLowerCase();
      const label = (OPERATION_LABELS[o.kind] || o.kind).toLowerCase();
      const translatedLabel = ui(OPERATION_LABELS[o.kind] || o.kind).toLowerCase();
      if (
        !desc.includes(q) &&
        !amount.includes(q) &&
        !date.includes(q) &&
        !label.includes(q) &&
        !translatedLabel.includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  // Exact minor-unit totals for filtered operations
  const opsAmountTotalMinor = filteredOps.reduce(
    (sum, o) => sum + signedMoneyMinor(o.amount),
    BigInt(0)
  );
  const opsEntitlementNetMinor = filteredOps.reduce(
    (sum, o) => sum + signedMoneyMinor(o.entitlementDelta),
    BigInt(0)
  );
  const opsCustodyNetMinor = filteredOps.reduce(
    (sum, o) => sum + signedMoneyMinor(o.custodyDelta),
    BigInt(0)
  );
  const opsAdvanceNetMinor = filteredOps.reduce(
    (sum, o) => sum + signedMoneyMinor(o.advanceDelta),
    BigInt(0)
  );
  const opsEntitlementNetFormatted = formatSignedDelta(
    formatSignedMinor(opsEntitlementNetMinor)
  );
  const opsCustodyNetFormatted = formatSignedDelta(
    formatSignedMinor(opsCustodyNetMinor)
  );
  const opsAdvanceNetFormatted = formatSignedDelta(
    formatSignedMinor(opsAdvanceNetMinor)
  );

  // Exact minor-unit totals for trip commissions
  const commTotalMinor = d.commissions.reduce(
    (sum, c) => sum + signedMoneyMinor(c.amount),
    BigInt(0)
  );
  const commPaidMinor = d.commissions.reduce(
    (sum, c) => sum + signedMoneyMinor(c.paidAmount),
    BigInt(0)
  );
  const commRemainingMinor = d.commissions.reduce(
    (sum, c) => sum + signedMoneyMinor(c.remainingAmount),
    BigInt(0)
  );

  const handleCopyIban = async () => {
    const iban = d.member.bankDetails?.iban;
    if (!iban) return;
    try {
      await navigator.clipboard?.writeText(iban.replace(/\s+/g, ""));
      setCopiedIban(true);
      if (ibanTimerRef.current !== null) {
        window.clearTimeout(ibanTimerRef.current);
      }
      ibanTimerRef.current = window.setTimeout(() => setCopiedIban(false), 2000);
    } catch {
      setCopiedIban(false);
    }
  };

  const resetOpsFilters = () => {
    setOperationFilter("ALL");
    setSearchQuery("");
  };

  const handleApprovePayroll = async (p: Payroll) => {
    setApprovingPayrollId(p.id);
    try {
      await approvePayrollMutation.run(
        () =>
          commercialRequest(`/payroll/${p.id}/approve`, "POST", {
            version: p.version,
          }),
        result.reload
      );
    } finally {
      setApprovingPayrollId(null);
    }
  };

  const activeTab = mainTab === "LEGACY" && d.legacy.length === 0 ? "OPERATIONS" : mainTab;

  const tabOrder = (
    d.legacy.length > 0
      ? ["OPERATIONS", "SALARY", "COMMISSIONS", "LEGACY"]
      : ["OPERATIONS", "SALARY", "COMMISSIONS"]
  ) as Array<"OPERATIONS" | "SALARY" | "COMMISSIONS" | "LEGACY">;

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: "OPERATIONS" | "SALARY" | "COMMISSIONS" | "LEGACY"
  ) => {
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex === -1) return;
    const isRtl = ui.dir === "rtl";
    let nextTab: "OPERATIONS" | "SALARY" | "COMMISSIONS" | "LEGACY" | undefined;
    if (e.key === "ArrowRight") {
      nextTab = tabOrder[(currentIndex + (isRtl ? -1 : 1) + tabOrder.length) % tabOrder.length];
    } else if (e.key === "ArrowLeft") {
      nextTab = tabOrder[(currentIndex + (isRtl ? 1 : -1) + tabOrder.length) % tabOrder.length];
    } else if (e.key === "Home") {
      nextTab = tabOrder[0];
    } else if (e.key === "End") {
      nextTab = tabOrder[tabOrder.length - 1];
    }
    if (!nextTab) return;
    e.preventDefault();
    setMainTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`${tabIdPrefix}-tab-${nextTab}`)?.focus();
    });
  };

  const opFilterTabs: { id: OperationFilter; label: string }[] = [
    { id: "ALL", label: "كافة الحركات" },
    { id: "PAYOUT", label: "صرف مستحق" },
    { id: "SALARY", label: "الرواتب" },
    { id: "CUSTODY", label: "العهد" },
    { id: "ADVANCE", label: "السلف" },
    { id: "COMMISSION", label: "عمولات الرحلات" },
  ];

  const entitlementPositive = signedMoneyMinor(d.balances.entitlement) > BigInt(0);
  const hasAnyBank = Boolean(
    d.member.bankDetails?.iban?.trim() ||
      d.member.bankDetails?.bankName?.trim() ||
      d.member.bankDetails?.accountHolder?.trim()
  );

  return (
    <div className="space-y-6">
      {/* Header with Title and Download / Refresh Actions */}
      <PageHeader
        title={d.member.name}
        subtitle="حساب السائق والمستحقات"
        badge={ui(KIND_LABELS[d.member.kind] || "حساب مالي")}
        icon={UserCheck}
        primaryAction={{
          label: "تنزيل كشف الحساب",
          onClick: () =>
            csvDownload(`staff-${d.member.id}.csv`, [
              ["كشف المستحقات", d.member.name],
              [
                "المستحق",
                d.balances.entitlement,
                "العهد",
                d.balances.custody,
                "السلف",
                d.balances.advance,
              ],
              [
                "التاريخ",
                "النوع",
                "البيان",
                "المبلغ",
                "تغير المستحق",
                "تغير العهدة",
                "تغير السلفة",
              ],
              ...d.operations.map((o) => [
                o.effectiveDate.slice(0, 10),
                ui(OPERATION_LABELS[o.kind] || o.kind),
                o.description,
                o.amount,
                o.entitlementDelta,
                o.custodyDelta,
                o.advanceDelta,
              ]),
            ]),
          icon: Download,
          variant: "secondary",
        }}
        onRefresh={result.reload}
        isRefreshing={result.loading}
      />

      <Notice message={result.error} error />

      {/* Member Profile and Bank Summary Card */}
      <Card className="theme-card p-4 sm:p-5 border theme-border shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl bg-[var(--accent-surface)] text-[var(--accent-gold)] font-bold text-lg flex items-center justify-center shrink-0 border border-[var(--accent-gold)]/30"
              aria-hidden="true"
            >
              {d.member.name.trim().charAt(0) || "•"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                  {d.member.name}
                </h2>
                <Badge variant="outline" className="text-xs font-semibold">
                  {ui(KIND_LABELS[d.member.kind] || "حساب مالي")}
                </Badge>
                <Badge
                  variant={d.member.active ? "success" : "secondary"}
                  className="text-xs font-semibold"
                >
                  {ui(d.member.active ? "نشط" : "موقوف")}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)] flex-wrap">
                {d.member.phone && (
                  <a
                    href={`tel:${d.member.phone}`}
                    className="inline-flex items-center gap-1 hover:text-[var(--accent-gold)] font-mono transition"
                    dir="ltr"
                  >
                    <Phone className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
                    <span>{d.member.phone}</span>
                  </a>
                )}
                {d.member.vatNumber && (
                  <span>
                    {ui("الرقم الضريبي")}:{" "}
                    <bdi dir="ltr" className="font-mono font-semibold text-[var(--text-main)]">
                      {d.member.vatNumber}
                    </bdi>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bank Account Info Box */}
          <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3 sm:px-4 sm:py-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
              <CreditCard className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("البيانات المصرفية والبنكية")}</span>
            </div>
            {hasAnyBank ? (
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {(d.member.bankDetails?.bankName || d.member.bankDetails?.accountHolder) && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {[d.member.bankDetails?.bankName, d.member.bankDetails?.accountHolder]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {d.member.bankDetails?.iban && (
                  <div
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-main)] bg-[var(--bg-card)] px-2.5 py-0.5 rounded-lg border theme-border tabular-nums"
                    dir="ltr"
                  >
                    <span>{formatIbanDisplay(d.member.bankDetails.iban)}</span>
                    <button
                      type="button"
                      onClick={() => void handleCopyIban()}
                      className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--accent-surface)] hover:text-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)]/50 transition cursor-pointer"
                      title={ui(copiedIban ? "تم نسخ الآيبان" : "نسخ الآيبان")}
                      aria-label={`${ui("نسخ الآيبان")} ${d.member.name}`}
                    >
                      {copiedIban ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {ui("لا توجد بيانات بنكية مسجلة")}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 3 Executive Financial Balance Cards with Direct Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entitlement */}
        <Card className="theme-card p-5 border theme-border shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {ui("مستحقات متاحة للصرف")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div
              className="text-2xl font-bold font-mono tabular-nums text-[var(--text-main)]"
              dir="ltr"
            >
              {formatMoneyValue(d.balances.entitlement)}{" "}
              <span className="text-xs font-sans font-bold text-[var(--text-muted)]">
                SAR
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {ui("الرصيد المستحق")}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                setMovementModal({
                  open: true,
                  defaultKind: "PAYOUT",
                  defaultAmount: entitlementPositive ? d.balances.entitlement : "",
                })
              }
              className="w-full min-h-11 sm:min-h-10 inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-xs cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{ui("صرف المستحقات")}</span>
            </button>
          )}
        </Card>

        {/* Custody */}
        <Card className="theme-card p-5 border theme-border shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {ui("عهدة لم تُسوَّ")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center">
              <Coins className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div
              className="text-2xl font-bold font-mono tabular-nums text-[var(--text-main)]"
              dir="ltr"
            >
              {formatMoneyValue(d.balances.custody)}{" "}
              <span className="text-xs font-sans font-bold text-[var(--text-muted)]">
                SAR
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {ui("العهد التشغيلية")}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                setMovementModal({
                  open: true,
                  defaultKind: "CUSTODY_ISSUE",
                })
              }
              className="w-full min-h-11 sm:min-h-10 inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-main)] transition shadow-2xs cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{ui("حركة عهدة")}</span>
            </button>
          )}
        </Card>

        {/* Advance */}
        <Card className="theme-card p-5 border theme-border shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {ui("سلف متبقية")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/12 text-rose-700 dark:text-rose-300 flex items-center justify-center">
              <HandCoins className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div
              className="text-2xl font-bold font-mono tabular-nums text-[var(--text-main)]"
              dir="ltr"
            >
              {formatMoneyValue(d.balances.advance)}{" "}
              <span className="text-xs font-sans font-bold text-[var(--text-muted)]">
                SAR
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {ui("السلف القائمة")}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                setMovementModal({
                  open: true,
                  defaultKind: "ADVANCE_ISSUE",
                })
              }
              className="w-full min-h-11 sm:min-h-10 inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-main)] transition shadow-2xs cursor-pointer"
            >
              <HandCoins className="w-3.5 h-3.5 text-rose-700 dark:text-rose-300" aria-hidden="true" />
              <span>{ui("حركة سلفة")}</span>
            </button>
          )}
        </Card>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b theme-border pb-3">
        <div
          role="tablist"
          aria-label={ui("أقسام حساب السائق")}
          className="flex flex-wrap gap-2"
        >
          <button
            id={`${tabIdPrefix}-tab-OPERATIONS`}
            type="button"
            role="tab"
            aria-selected={activeTab === "OPERATIONS"}
            aria-controls={activeTab === "OPERATIONS" ? `${tabIdPrefix}-panel-OPERATIONS` : undefined}
            onClick={() => setMainTab("OPERATIONS")}
            onKeyDown={(e) => handleTabKeyDown(e, "OPERATIONS")}
            className={`min-h-11 sm:min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "OPERATIONS"
                ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border border-[var(--accent-btn-border)] shadow-xs"
                : "border border-[var(--control-border)] theme-card text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
            }`}
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{ui("كشف العمليات والحركات")}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums ${
                activeTab === "OPERATIONS"
                  ? "bg-black/20 text-[var(--accent-btn-fg)] dark:bg-white/25 dark:text-[var(--accent-btn-fg)]"
                  : "bg-[var(--bg-card-subtle)] text-[var(--text-main)]"
              }`}
            >
              {d.operations.length}
            </span>
          </button>

          <button
            id={`${tabIdPrefix}-tab-SALARY`}
            type="button"
            role="tab"
            aria-selected={activeTab === "SALARY"}
            aria-controls={activeTab === "SALARY" ? `${tabIdPrefix}-panel-SALARY` : undefined}
            onClick={() => setMainTab("SALARY")}
            onKeyDown={(e) => handleTabKeyDown(e, "SALARY")}
            className={`min-h-11 sm:min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "SALARY"
                ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border border-[var(--accent-btn-border)] shadow-xs"
                : "border border-[var(--control-border)] theme-card text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
            }`}
          >
            <Banknote className="w-4 h-4" aria-hidden="true" />
            <span>{ui("الرواتب والمسيرات")}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums ${
                activeTab === "SALARY"
                  ? "bg-black/20 text-[var(--accent-btn-fg)] dark:bg-white/25 dark:text-[var(--accent-btn-fg)]"
                  : "bg-[var(--bg-card-subtle)] text-[var(--text-main)]"
              }`}
            >
              {d.payroll.length}
            </span>
          </button>

          <button
            id={`${tabIdPrefix}-tab-COMMISSIONS`}
            type="button"
            role="tab"
            aria-selected={activeTab === "COMMISSIONS"}
            aria-controls={activeTab === "COMMISSIONS" ? `${tabIdPrefix}-panel-COMMISSIONS` : undefined}
            onClick={() => setMainTab("COMMISSIONS")}
            onKeyDown={(e) => handleTabKeyDown(e, "COMMISSIONS")}
            className={`min-h-11 sm:min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "COMMISSIONS"
                ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border border-[var(--accent-btn-border)] shadow-xs"
                : "border border-[var(--control-border)] theme-card text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
            }`}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>{ui("عمولات الرحلات")}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums ${
                activeTab === "COMMISSIONS"
                  ? "bg-black/20 text-[var(--accent-btn-fg)] dark:bg-white/25 dark:text-[var(--accent-btn-fg)]"
                  : "bg-[var(--bg-card-subtle)] text-[var(--text-main)]"
              }`}
            >
              {d.commissions.length}
            </span>
          </button>

          {d.legacy.length > 0 && (
            <button
              id={`${tabIdPrefix}-tab-LEGACY`}
              type="button"
              role="tab"
              aria-selected={activeTab === "LEGACY"}
              aria-controls={activeTab === "LEGACY" ? `${tabIdPrefix}-panel-LEGACY` : undefined}
              onClick={() => setMainTab("LEGACY")}
              onKeyDown={(e) => handleTabKeyDown(e, "LEGACY")}
              className={`min-h-11 sm:min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "LEGACY"
                  ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border border-[var(--accent-btn-border)] shadow-xs"
                  : "border border-[var(--control-border)] theme-card text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
              }`}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>{ui("أرشيف الحركات السابقة")}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums ${
                  activeTab === "LEGACY"
                    ? "bg-black/20 text-[var(--accent-btn-fg)] dark:bg-white/25 dark:text-[var(--accent-btn-fg)]"
                    : "bg-[var(--bg-card-subtle)] text-[var(--text-main)]"
                }`}
              >
                {d.legacy.length}
              </span>
            </button>
          )}
        </div>

        {/* Global Action: New Movement Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setMovementModal({ open: true })}
            className="min-h-11 sm:min-h-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{ui("تسجيل حركة مالية")}</span>
          </button>
        )}
      </div>

      {/* TAB 1: OPERATIONS / TRANSACTIONS LEDGER */}
      {activeTab === "OPERATIONS" && (
        <div
          id={`${tabIdPrefix}-panel-OPERATIONS`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-OPERATIONS`}
        >
          <Card className="theme-card border theme-border overflow-hidden shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b theme-border bg-[var(--bg-card-subtle)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={opsHeadingId}
                      className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-tight"
                    >
                      {ui("كشف العمليات والحركات")}
                    </h2>
                    <Badge variant="outline" className="font-mono text-xs tabular-nums">
                      {filteredOps.length} / {d.operations.length}
                    </Badge>
                  </div>
                </div>

                {hasOpsFilter && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetOpsFilters}
                    className="min-h-11 sm:min-h-9 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{ui("مسح عوامل التصفية")}</span>
                  </Button>
                )}
              </div>

              {/* Sub-filters & Search Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={ui("تصفية")}>
                  {opFilterTabs.map((tab) => {
                    const active = operationFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setOperationFilter(tab.id)}
                        className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                          active
                            ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] border-[var(--accent-btn-border)] shadow-2xs"
                            : "bg-[var(--bg-card)] border-[var(--control-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                        }`}
                      >
                        <span>{ui(tab.label)}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${
                            active
                              ? "bg-black/20 text-[var(--accent-btn-fg)] dark:bg-white/25 dark:text-[var(--accent-btn-fg)]"
                              : "bg-[var(--bg-card-subtle)] text-[var(--text-main)]"
                          }`}
                        >
                          {operationFilterCounts[tab.id]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full lg:w-72 shrink-0">
                  <Search
                    className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label={ui("بحث في الحركات...")}
                    placeholder={ui("بحث في الحركات...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-11 sm:min-h-9 ps-9 pe-10 py-2 rounded-xl border border-[var(--control-border)] bg-[var(--input-bg)] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] text-base sm:text-xs outline-none focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label={ui("مسح البحث")}
                      className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center absolute end-0.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {!filteredOps.length ? (
                <div className="p-10 sm:p-14 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center">
                    <Clock className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-main)]">
                    {ui(hasOpsFilter ? "لا توجد نتائج مطابقة للبحث" : "لا توجد حركات مسجلة")}
                  </p>
                  {hasOpsFilter && (
                    <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                      {ui("لا توجد حركات تطابق البحث أو التصفية الحالية.")}
                    </p>
                  )}
                  <div className="pt-1">
                    {hasOpsFilter ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetOpsFilters}
                        className="min-h-11 sm:min-h-9"
                      >
                        {ui("مسح عوامل التصفية")}
                      </Button>
                    ) : !readOnly ? (
                      <Button
                        type="button"
                        variant="gold"
                        size="sm"
                        onClick={() => setMovementModal({ open: true })}
                        className="min-h-11 sm:min-h-9 gap-1.5"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span>{ui("تسجيل حركة مالية")}</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (lg and up) */}
                  <div className="hidden lg:block">
                    <Table
                      regionLabelledBy={opsHeadingId}
                      wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                      className="border-separate border-spacing-0"
                    >
                      <TableCaption className="sr-only">
                        {ui("كشف العمليات والحركات")}
                      </TableCaption>
                      <TableHeader className="bg-[var(--table-header-bg)] text-xs font-bold text-[var(--text-muted)]">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="py-3 px-3 border-b theme-border whitespace-nowrap">
                            {ui("التاريخ")}
                          </TableHead>
                          <TableHead className="py-3 px-3 border-b theme-border whitespace-nowrap">
                            {ui("نوع العملية")}
                          </TableHead>
                          <TableHead className="py-3 px-3 border-b theme-border">
                            {ui("البيان")}
                          </TableHead>
                          <TableHead className="py-3 px-3 border-b theme-border text-end whitespace-nowrap">
                            {ui("المبلغ")}
                          </TableHead>
                          <TableHead className="py-3 px-3 border-b theme-border text-end leading-snug">
                            {ui("أثر المستحق")}
                          </TableHead>
                          <TableHead className="py-3 px-3 border-b theme-border leading-snug">
                            {ui("أثر العهدة / السلفة")}
                          </TableHead>
                          {!readOnly && (
                            <TableHead className="sticky end-0 z-20 py-3 px-3 text-end border-b theme-border border-s theme-border bg-[var(--table-header-bg)] whitespace-nowrap">
                              {ui("الإجراءات")}
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs [&_tr:last-child_td]:border-b-0 [&_tr:last-child_th]:border-b-0">
                        {filteredOps.map((o) => {
                          const isReversal = o.kind === "REVERSAL";
                          const isAlreadyReversed = reversedOpIds.has(o.id);
                          const canReverse = !readOnly && !isReversal && !isAlreadyReversed;
                          const entitlement = formatSignedDelta(o.entitlementDelta);
                          const hasCustodyDelta = isNonZeroMoney(o.custodyDelta);
                          const hasAdvanceDelta = isNonZeroMoney(o.advanceDelta);
                          const custody = formatSignedDelta(o.custodyDelta);
                          const advance = formatSignedDelta(o.advanceDelta);

                          return (
                            <TableRow
                              key={o.id}
                              className="group hover:bg-[var(--table-row-hover)] transition-colors"
                            >
                              <th
                                scope="row"
                                className="py-3.5 px-3 text-start align-middle border-b theme-border font-mono font-semibold tabular-nums whitespace-nowrap text-[var(--text-main)]"
                              >
                                <bdi dir="ltr">{o.effectiveDate.slice(0, 10)}</bdi>
                              </th>
                              <TableCell className="py-3.5 px-3 align-middle border-b theme-border whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1">
                                  <OperationBadge kind={o.kind} />
                                  {isAlreadyReversed && (
                                    <Badge variant="secondary" className="rounded-md text-[11px] font-semibold px-2 py-0">
                                      {ui("تم عكسها")}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 px-3 align-middle border-b theme-border font-medium min-w-[140px] max-w-[230px] whitespace-normal break-words leading-relaxed text-[var(--text-main)]">
                                {o.description}
                              </TableCell>
                              <TableCell
                                className="py-3.5 px-3 align-middle border-b theme-border text-end font-mono font-bold tabular-nums whitespace-nowrap text-[var(--text-main)]"
                                dir="ltr"
                              >
                                {formatMoneyValue(o.amount)} SAR
                              </TableCell>
                              <TableCell
                                className="py-3.5 px-3 align-middle border-b theme-border text-end font-mono tabular-nums whitespace-nowrap"
                                dir="ltr"
                              >
                                {entitlement.minor !== BigInt(0) ? (
                                  <span
                                    className={
                                      entitlement.negative
                                        ? "text-rose-700 dark:text-rose-300 font-bold"
                                        : "text-emerald-800 dark:text-emerald-300 font-bold"
                                    }
                                  >
                                    {entitlement.display} SAR
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 px-3 align-middle border-b theme-border font-mono text-[11px] tabular-nums">
                                {hasCustodyDelta || hasAdvanceDelta ? (
                                  <div className="flex flex-col items-start gap-1">
                                    {hasCustodyDelta && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/25 font-semibold whitespace-nowrap">
                                        <span>{ui("العهد")}:</span>
                                        <bdi dir="ltr">{custody.display}</bdi>
                                      </span>
                                    )}
                                    {hasAdvanceDelta && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/12 text-rose-800 dark:text-rose-300 border border-rose-500/25 font-semibold whitespace-nowrap">
                                        <span>{ui("السلف")}:</span>
                                        <bdi dir="ltr">{advance.display}</bdi>
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </TableCell>
                              {!readOnly && (
                                <TableCell className="sticky end-0 z-10 bg-[var(--bg-card)] group-hover:bg-[var(--bg-card-subtle)] transition-colors py-3.5 px-3 align-middle border-b theme-border border-s theme-border text-end whitespace-nowrap">
                                  {canReverse ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setReverseModalOp(o)}
                                      className="h-8 px-2.5 gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/10"
                                      aria-label={`${ui("عكس موثق")}: ${o.description}`}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>{ui("عكس موثق")}</span>
                                    </Button>
                                  ) : (
                                    <span className="text-[var(--text-muted)]">—</span>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter className="bg-[var(--table-header-bg)] text-xs">
                        <TableRow className="hover:bg-transparent">
                          <th
                            scope="row"
                            colSpan={3}
                            className="py-3.5 px-3 text-start font-bold text-[var(--text-main)] border-t theme-border"
                          >
                            {ui("ملخص الحركات المصفاة")} ({filteredOps.length})
                          </th>
                          <TableCell
                            className="py-3.5 px-3 text-end font-mono font-bold tabular-nums text-[var(--text-main)] border-t theme-border whitespace-nowrap"
                            dir="ltr"
                          >
                            {formatMoneyValue(formatSignedMinor(opsAmountTotalMinor))} SAR
                          </TableCell>
                          <TableCell
                            className="py-3.5 px-3 text-end font-mono font-bold tabular-nums border-t theme-border whitespace-nowrap"
                            dir="ltr"
                          >
                            {opsEntitlementNetMinor !== BigInt(0) ? (
                              <span
                                className={
                                  opsEntitlementNetFormatted.negative
                                    ? "text-rose-700 dark:text-rose-300"
                                    : "text-emerald-800 dark:text-emerald-300"
                                }
                              >
                                {opsEntitlementNetFormatted.display} SAR
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">0.00 SAR</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 px-3 font-mono text-[11px] tabular-nums border-t theme-border">
                            {opsCustodyNetMinor !== BigInt(0) || opsAdvanceNetMinor !== BigInt(0) ? (
                              <div className="flex flex-col items-start gap-1">
                                {opsCustodyNetMinor !== BigInt(0) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/25 font-semibold whitespace-nowrap">
                                    <span>{ui("العهد")}:</span>
                                    <bdi dir="ltr">{opsCustodyNetFormatted.display}</bdi>
                                  </span>
                                )}
                                {opsAdvanceNetMinor !== BigInt(0) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/12 text-rose-800 dark:text-rose-300 border border-rose-500/25 font-semibold whitespace-nowrap">
                                    <span>{ui("السلف")}:</span>
                                    <bdi dir="ltr">{opsAdvanceNetFormatted.display}</bdi>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </TableCell>
                          {!readOnly && (
                            <TableCell className="sticky end-0 z-10 bg-[var(--table-header-bg)] py-3.5 px-3 border-t theme-border border-s theme-border" />
                          )}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {/* Mobile & Tablet Cards View (< lg) */}
                  <div className="lg:hidden p-3.5 sm:p-4 space-y-3">
                    {filteredOps.map((o) => {
                      const isReversal = o.kind === "REVERSAL";
                      const isAlreadyReversed = reversedOpIds.has(o.id);
                      const canReverse = !readOnly && !isReversal && !isAlreadyReversed;
                      const entitlement = formatSignedDelta(o.entitlementDelta);
                      const hasCustodyDelta = isNonZeroMoney(o.custodyDelta);
                      const hasAdvanceDelta = isNonZeroMoney(o.advanceDelta);
                      const custody = formatSignedDelta(o.custodyDelta);
                      const advance = formatSignedDelta(o.advanceDelta);

                      return (
                        <MobileRecordCard
                          key={o.id}
                          titleAs="h3"
                          muted={isAlreadyReversed}
                          title={
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <OperationBadge kind={o.kind} />
                              {isAlreadyReversed && (
                                <Badge variant="secondary" className="text-[11px] font-semibold">
                                  {ui("تم عكسها")}
                                </Badge>
                              )}
                            </span>
                          }
                          subtitle={o.description}
                          badge={
                            <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]" dir="ltr">
                              {o.effectiveDate.slice(0, 10)}
                            </span>
                          }
                          footer={
                            canReverse ? (
                              <div className="mobile-card-actions w-full flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReverseModalOp(o)}
                                  aria-label={`${ui("عكس موثق")}: ${o.description}`}
                                  className="flex-1 min-h-11 gap-1.5 px-3 bg-[var(--bg-card-subtle)] text-rose-700 dark:text-rose-300 border-rose-500/30 hover:border-rose-500/60 text-xs font-bold"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>{ui("عكس موثق")}</span>
                                </Button>
                              </div>
                            ) : undefined
                          }
                        >
                          <MobileCardMetaGrid columns={2}>
                            <MobileCardField
                              label={ui("المبلغ")}
                              value={<span dir="ltr">{formatMoneyValue(o.amount)} SAR</span>}
                              mono
                            />
                            <MobileCardField
                              label={ui("أثر المستحق")}
                              alignEnd
                              mono
                              value={
                                entitlement.minor !== BigInt(0) ? (
                                  <span
                                    className={
                                      entitlement.negative
                                        ? "text-rose-700 dark:text-rose-300"
                                        : "text-emerald-800 dark:text-emerald-300"
                                    }
                                    dir="ltr"
                                  >
                                    {entitlement.display} SAR
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )
                              }
                            />
                          </MobileCardMetaGrid>
                          {(hasCustodyDelta || hasAdvanceDelta) && (
                            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-3 py-2">
                              {hasCustodyDelta && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/25 text-xs font-mono tabular-nums font-semibold">
                                  <span>{ui("العهد")}:</span>
                                  <bdi dir="ltr">{custody.display}</bdi>
                                </span>
                              )}
                              {hasAdvanceDelta && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/12 text-rose-800 dark:text-rose-300 border border-rose-500/25 text-xs font-mono tabular-nums font-semibold">
                                  <span>{ui("السلف")}:</span>
                                  <bdi dir="ltr">{advance.display}</bdi>
                                </span>
                              )}
                            </div>
                          )}
                        </MobileRecordCard>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>

            {filteredOps.length > 0 && (
              <CardFooter className="lg:hidden mt-0 px-4 sm:px-5 py-3 bg-[var(--bg-card-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                <span>
                  {ui("عرض")}{" "}
                  <strong className="font-mono tabular-nums text-[var(--text-main)]">
                    {filteredOps.length}
                  </strong>{" "}
                  {ui("من إجمالي")}{" "}
                  <strong className="font-mono tabular-nums text-[var(--accent-gold)]">
                    {d.operations.length}
                  </strong>
                </span>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tabular-nums">
                  <span>
                    {ui("إجمالي المبالغ")}:{" "}
                    <bdi dir="ltr" className="font-bold text-[var(--text-main)]">
                      {formatMoneyValue(formatSignedMinor(opsAmountTotalMinor))} SAR
                    </bdi>
                  </span>
                  <span>
                    {ui("صافي الأثر")}:{" "}
                    <bdi
                      dir="ltr"
                      className={
                        opsEntitlementNetFormatted.negative
                          ? "font-bold text-rose-700 dark:text-rose-300"
                          : opsEntitlementNetFormatted.positive
                            ? "font-bold text-emerald-800 dark:text-emerald-300"
                            : "font-bold text-[var(--text-main)]"
                      }
                    >
                      {opsEntitlementNetFormatted.display} SAR
                    </bdi>
                  </span>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: SALARY & PAYROLL */}
      {activeTab === "SALARY" && (
        <div
          id={`${tabIdPrefix}-panel-SALARY`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-SALARY`}
          className="space-y-6"
        >
          {/* Active Salary Term Card */}
          <Card className="theme-card p-5 border theme-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                  <span>{ui("الراتب الساري")}</span>
                </h2>
                {d.salaryTerms.length > 0 ? (
                  <p className="text-sm mt-1.5 text-[var(--text-main)]">
                    {ui("راتب ساري من")}:{" "}
                    <span className="font-mono font-bold tabular-nums" dir="ltr">
                      {d.salaryTerms[0].effectiveFrom.slice(0, 10)}
                    </span>{" "}
                    ·{" "}
                    <b
                      dir="ltr"
                      className="font-mono text-base tabular-nums text-[var(--accent-gold)]"
                    >
                      {formatMoneyValue(d.salaryTerms[0].amount)} SAR
                    </b>
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {ui("لا توجد مسيرات رواتب")}
                  </p>
                )}
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSalaryModalOpen(true)}
                  className="min-h-11 sm:min-h-10 gap-2 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("تحديد راتب شهري")}</span>
                </Button>
              )}
            </div>
          </Card>

          {/* Monthly Payroll Drafts Card */}
          <Card className="theme-card border theme-border overflow-hidden shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b theme-border bg-[var(--bg-card-subtle)] flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id={payrollHeadingId}
                    className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-tight"
                  >
                    {ui("مسيرات الرواتب الشهرية")}
                  </h2>
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {d.payroll.length}
                  </Badge>
                </div>
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={() => setPayrollModalOpen(true)}
                  className="min-h-11 sm:min-h-9 gap-1.5 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("إنشاء مسير شهر جديد")}</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {approvePayrollMutation.error && (
                <div className="p-4 border-b theme-border">
                  <Notice message={approvePayrollMutation.error} error />
                </div>
              )}

              {!d.payroll.length ? (
                <div className="p-10 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center">
                    <Banknote className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-main)]">
                    {ui("لا توجد مسيرات رواتب مسجلة")}
                  </p>
                  {!readOnly && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="gold"
                        size="sm"
                        onClick={() => setPayrollModalOpen(true)}
                        className="min-h-11 sm:min-h-9 gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{ui("إنشاء مسير شهر جديد")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table (md and up) */}
                  <div className="hidden md:block">
                    <Table
                      regionLabelledBy={payrollHeadingId}
                      wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                      className="border-separate border-spacing-0"
                    >
                      <TableCaption className="sr-only">
                        {ui("مسيرات الرواتب الشهرية")}
                      </TableCaption>
                      <TableHeader className="bg-[var(--table-header-bg)] text-xs font-bold text-[var(--text-main)]">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="py-3.5 px-4 border-b theme-border whitespace-nowrap">
                            {ui("شهر المسير")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border whitespace-nowrap">
                            {ui("الحالة")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border">
                            {ui("سبب التعديل")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border text-end whitespace-nowrap">
                            {ui("المبلغ")}
                          </TableHead>
                          {!readOnly && (
                            <TableHead className="sticky end-0 z-20 py-3.5 px-4 text-end border-b theme-border border-s theme-border bg-[var(--table-header-bg)] whitespace-nowrap">
                              {ui("الإجراءات")}
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs [&_tr:last-child_td]:border-b-0 [&_tr:last-child_th]:border-b-0">
                        {d.payroll.map((p) => (
                          <TableRow
                            key={`${p.id}:${p.version}`}
                            className="group hover:bg-[var(--table-row-hover)] transition-colors"
                          >
                            <th
                              scope="row"
                              className="py-3.5 px-4 text-start align-middle border-b theme-border font-mono font-bold text-sm tabular-nums whitespace-nowrap text-[var(--text-main)]"
                            >
                              <bdi dir="ltr">{p.month}</bdi>
                            </th>
                            <TableCell className="py-3.5 px-4 align-middle border-b theme-border whitespace-nowrap">
                              <Badge
                                variant={p.status === "APPROVED" ? "success" : "warning"}
                                className="text-xs font-semibold"
                              >
                                {ui(p.status === "APPROVED" ? "معتمد" : "مسودة")}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3.5 px-4 align-middle border-b theme-border max-w-md whitespace-normal break-words">
                              {p.adjustmentReason ? (
                                <span className="text-[var(--text-main)]">
                                  {p.adjustmentReason}
                                </span>
                              ) : (
                                <span className="text-[var(--text-muted)]">
                                  {ui("بدون ملاحظات")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell
                              className="py-3.5 px-4 align-middle border-b theme-border text-end font-mono font-bold tabular-nums text-[var(--accent-gold)] whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatMoneyValue(p.amount)} SAR
                            </TableCell>
                            {!readOnly && (
                              <TableCell className="sticky end-0 z-10 bg-[var(--bg-card)] group-hover:bg-[var(--bg-card-subtle)] transition-colors py-3.5 px-4 align-middle border-b theme-border border-s theme-border text-end whitespace-nowrap">
                                {p.status === "DRAFT" ? (
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      aria-label={`${ui("تعديل")} ${p.month}`}
                                      onClick={() => setEditingPayroll(p)}
                                      className="h-9 px-3 gap-1.5 text-xs font-bold"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                                      <span>{ui("تعديل")}</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="gold"
                                      size="sm"
                                      disabled={approvePayrollMutation.busy}
                                      aria-label={`${ui("اعتماد الاستحقاق")} ${p.month}`}
                                      onClick={() => void handleApprovePayroll(p)}
                                      className="h-9 px-3 text-xs font-bold"
                                    >
                                      <span>
                                        {approvingPayrollId === p.id && approvePayrollMutation.busy
                                          ? "..."
                                          : ui("اعتماد الاستحقاق")}
                                      </span>
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards (< md) */}
                  <div className="md:hidden p-3.5 space-y-3">
                    {d.payroll.map((p) => (
                      <MobileRecordCard
                        key={`${p.id}:${p.version}`}
                        titleAs="h3"
                        title={
                          <span className="font-mono font-bold tabular-nums" dir="ltr">
                            {p.month}
                          </span>
                        }
                        badge={
                          <Badge
                            variant={p.status === "APPROVED" ? "success" : "warning"}
                            className="text-xs font-semibold"
                          >
                            {ui(p.status === "APPROVED" ? "معتمد" : "مسودة")}
                          </Badge>
                        }
                        subtitle={
                          p.adjustmentReason
                            ? `${ui("سبب التعديل")}: ${p.adjustmentReason}`
                            : undefined
                        }
                        footer={
                          !readOnly && p.status === "DRAFT" ? (
                            <div className="mobile-card-actions w-full flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                aria-label={`${ui("تعديل")} ${p.month}`}
                                onClick={() => setEditingPayroll(p)}
                                className="min-h-11 px-4 gap-1.5 text-xs font-bold shrink-0"
                              >
                                <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{ui("تعديل")}</span>
                              </Button>
                              <Button
                                type="button"
                                variant="gold"
                                size="sm"
                                disabled={approvePayrollMutation.busy}
                                aria-label={`${ui("اعتماد الاستحقاق")} ${p.month}`}
                                onClick={() => void handleApprovePayroll(p)}
                                className="flex-1 min-h-11 px-3 text-xs font-bold"
                              >
                                <span>
                                  {approvingPayrollId === p.id && approvePayrollMutation.busy
                                    ? "..."
                                    : ui("اعتماد الاستحقاق")}
                                </span>
                              </Button>
                            </div>
                          ) : undefined
                        }
                      >
                        <MobileCardMetaGrid columns={2}>
                          <MobileCardField
                            label={ui("المبلغ")}
                            mono
                            value={
                              <span dir="ltr" className="text-[var(--accent-gold)] font-bold">
                                {formatMoneyValue(p.amount)} SAR
                              </span>
                            }
                          />
                          <MobileCardField
                            label={ui("الحالة")}
                            alignEnd
                            value={ui(p.status === "APPROVED" ? "معتمد" : "مسودة")}
                          />
                        </MobileCardMetaGrid>
                      </MobileRecordCard>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: COMMISSIONS */}
      {activeTab === "COMMISSIONS" && (
        <div
          id={`${tabIdPrefix}-panel-COMMISSIONS`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-COMMISSIONS`}
        >
          <Card className="theme-card border theme-border overflow-hidden shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b theme-border bg-[var(--bg-card-subtle)] flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/25 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id={commissionsHeadingId}
                    className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-tight"
                  >
                    {ui("عمولات الرحلات")}
                  </h2>
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {d.commissions.length}
                  </Badge>
                </div>
              </div>

              {d.commissions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                  <Badge variant="outline" className="px-2.5 py-1">
                    {ui("قيمة العمولة")}: {formatMoneyValue(formatSignedMinor(commTotalMinor))} SAR
                  </Badge>
                  <Badge variant="warning" className="px-2.5 py-1">
                    {ui("المتبقي")}: {formatMoneyValue(formatSignedMinor(commRemainingMinor))} SAR
                  </Badge>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {!d.commissions.length ? (
                <div className="p-10 sm:p-12 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/25 text-[var(--accent-gold)] flex items-center justify-center">
                    <Sparkles className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-main)]">
                    {ui("لا توجد عمولات رحلات مسجلة")}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table (lg and up) */}
                  <div className="hidden lg:block">
                    <Table
                      regionLabelledBy={commissionsHeadingId}
                      wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                      className="border-separate border-spacing-0"
                    >
                      <TableCaption className="sr-only">
                        {ui("عمولات الرحلات")}
                      </TableCaption>
                      <TableHeader className="bg-[var(--table-header-bg)] text-xs font-bold text-[var(--text-main)]">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="py-3.5 px-4 border-b theme-border whitespace-nowrap">
                            {ui("رقم العقد")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border whitespace-nowrap">
                            {ui("حالة التنفيذ")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border whitespace-nowrap">
                            {ui("حالة الصرف")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border text-end whitespace-nowrap">
                            {ui("قيمة العمولة")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border text-end whitespace-nowrap">
                            {ui("المدفوع من العمولة")}
                          </TableHead>
                          <TableHead className="py-3.5 px-4 border-b theme-border text-end whitespace-nowrap">
                            {ui("المتبقي من العمولة")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs [&_tr:last-child_td]:border-b-0 [&_tr:last-child_th]:border-b-0">
                        {d.commissions.map((c) => {
                          const ref = c.contract?.referenceNumber || c.contractId;
                          const href = readOnly ? "/captain" : `/admin/contracts/${c.contractId}`;
                          return (
                            <TableRow
                              key={c.contractId}
                              className="hover:bg-[var(--table-row-hover)] transition-colors"
                            >
                              <th
                                scope="row"
                                className="py-3.5 px-4 text-start align-middle border-b theme-border font-normal"
                              >
                                <div className="space-y-1">
                                  <Link
                                    href={href}
                                    className="font-mono text-sm font-bold text-[var(--accent-gold)] hover:underline inline-flex items-center gap-1.5"
                                  >
                                    <span>{ref}</span>
                                    <ExternalLink className="w-3 h-3 opacity-80" aria-hidden="true" />
                                  </Link>
                                  {c.contract?.tripDate && (
                                    <div className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                                      {ui("تاريخ الرحلة")}:{" "}
                                      <bdi dir="ltr">{c.contract.tripDate.slice(0, 10)}</bdi>
                                    </div>
                                  )}
                                </div>
                              </th>
                              <TableCell className="py-3.5 px-4 align-middle border-b theme-border whitespace-nowrap">
                                <Badge
                                  variant={
                                    c.status === "COMPLETED"
                                      ? "success"
                                      : c.status === "CANCELLED"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="text-xs font-semibold"
                                >
                                  {ui(
                                    c.status === "COMPLETED"
                                      ? "تم التنفيذ"
                                      : c.status === "CANCELLED"
                                        ? "أُلغيت"
                                        : "لم تُنفذ"
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 align-middle border-b theme-border whitespace-nowrap">
                                <Badge
                                  variant={c.paymentStatus === "PAID" ? "success" : "warning"}
                                  className="text-xs font-semibold"
                                >
                                  {ui(
                                    c.paymentStatus === "PAID"
                                      ? "مصروف"
                                      : c.paymentStatus === "DUE"
                                        ? "مستحق"
                                        : "متوقع"
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className="py-3.5 px-4 align-middle border-b theme-border text-end font-mono font-bold tabular-nums whitespace-nowrap text-[var(--text-main)]"
                                dir="ltr"
                              >
                                {formatMoneyValue(c.amount)} SAR
                              </TableCell>
                              <TableCell
                                className="py-3.5 px-4 align-middle border-b theme-border text-end font-mono font-semibold tabular-nums text-emerald-800 dark:text-emerald-300 whitespace-nowrap"
                                dir="ltr"
                              >
                                {formatMoneyValue(c.paidAmount)} SAR
                              </TableCell>
                              <TableCell
                                className="py-3.5 px-4 align-middle border-b theme-border text-end font-mono font-bold tabular-nums text-[var(--accent-gold)] whitespace-nowrap"
                                dir="ltr"
                              >
                                {formatMoneyValue(c.remainingAmount)} SAR
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter className="bg-[var(--table-header-bg)] text-xs">
                        <TableRow className="hover:bg-transparent">
                          <th
                            scope="row"
                            colSpan={3}
                            className="py-3.5 px-4 text-start font-bold text-[var(--text-main)] border-t theme-border"
                          >
                            {ui("إجمالي العمولات")} ({d.commissions.length})
                          </th>
                          <TableCell
                            className="py-3.5 px-4 text-end font-mono font-bold tabular-nums text-[var(--text-main)] border-t theme-border whitespace-nowrap"
                            dir="ltr"
                          >
                            {formatMoneyValue(formatSignedMinor(commTotalMinor))} SAR
                          </TableCell>
                          <TableCell
                            className="py-3.5 px-4 text-end font-mono font-bold tabular-nums text-emerald-800 dark:text-emerald-300 border-t theme-border whitespace-nowrap"
                            dir="ltr"
                          >
                            {formatMoneyValue(formatSignedMinor(commPaidMinor))} SAR
                          </TableCell>
                          <TableCell
                            className="py-3.5 px-4 text-end font-mono font-bold tabular-nums text-[var(--accent-gold)] border-t theme-border whitespace-nowrap"
                            dir="ltr"
                          >
                            {formatMoneyValue(formatSignedMinor(commRemainingMinor))} SAR
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {/* Mobile & Tablet Cards (< lg) */}
                  <div className="lg:hidden p-3.5 sm:p-4 space-y-3">
                    {d.commissions.map((c) => {
                      const ref = c.contract?.referenceNumber || c.contractId;
                      const href = readOnly ? "/captain" : `/admin/contracts/${c.contractId}`;
                      return (
                        <MobileRecordCard
                          key={c.contractId}
                          titleAs="h3"
                          title={
                            <Link
                              href={href}
                              className="font-mono text-sm font-bold text-[var(--accent-gold)] hover:underline inline-flex items-center gap-1.5"
                            >
                              <span>{ref}</span>
                              <ExternalLink className="w-3 h-3 opacity-80" aria-hidden="true" />
                            </Link>
                          }
                          subtitle={
                            c.contract?.tripDate ? (
                              <span className="font-mono tabular-nums">
                                {ui("تاريخ الرحلة")}:{" "}
                                <bdi dir="ltr">{c.contract.tripDate.slice(0, 10)}</bdi>
                              </span>
                            ) : undefined
                          }
                          badge={
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <Badge
                                variant={
                                  c.status === "COMPLETED"
                                    ? "success"
                                    : c.status === "CANCELLED"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-[11px] font-semibold"
                              >
                                {ui(
                                  c.status === "COMPLETED"
                                    ? "تم التنفيذ"
                                    : c.status === "CANCELLED"
                                      ? "أُلغيت"
                                      : "لم تُنفذ"
                                )}
                              </Badge>
                              <Badge
                                variant={c.paymentStatus === "PAID" ? "success" : "warning"}
                                className="text-[11px] font-semibold"
                              >
                                {ui(
                                  c.paymentStatus === "PAID"
                                    ? "مصروف"
                                    : c.paymentStatus === "DUE"
                                      ? "مستحق"
                                      : "متوقع"
                                )}
                              </Badge>
                            </div>
                          }
                        >
                          <MobileCardMetaGrid columns={3}>
                            <MobileCardField
                              label={ui("قيمة العمولة")}
                              mono
                              value={<span dir="ltr">{formatMoneyValue(c.amount)} SAR</span>}
                            />
                            <MobileCardField
                              label={ui("المدفوع من العمولة")}
                              mono
                              value={
                                <span dir="ltr" className="text-emerald-800 dark:text-emerald-300 font-bold">
                                  {formatMoneyValue(c.paidAmount)} SAR
                                </span>
                              }
                            />
                            <MobileCardField
                              label={ui("المتبقي من العمولة")}
                              alignEnd
                              mono
                              value={
                                <span dir="ltr" className="text-[var(--accent-gold)] font-bold">
                                  {formatMoneyValue(c.remainingAmount)} SAR
                                </span>
                              }
                            />
                          </MobileCardMetaGrid>
                        </MobileRecordCard>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>

            {d.commissions.length > 0 && (
              <CardFooter className="lg:hidden mt-0 px-4 sm:px-5 py-3 bg-[var(--bg-card-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                <span>{ui("إجمالي العمولات")}</span>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tabular-nums">
                  <span>
                    {ui("قيمة العمولة")}:{" "}
                    <bdi dir="ltr" className="font-bold text-[var(--text-main)]">
                      {formatMoneyValue(formatSignedMinor(commTotalMinor))} SAR
                    </bdi>
                  </span>
                  <span>
                    {ui("المدفوع من العمولة")}:{" "}
                    <bdi dir="ltr" className="font-bold text-emerald-800 dark:text-emerald-300">
                      {formatMoneyValue(formatSignedMinor(commPaidMinor))} SAR
                    </bdi>
                  </span>
                  <span>
                    {ui("المتبقي من العمولة")}:{" "}
                    <bdi dir="ltr" className="font-bold text-[var(--accent-gold)]">
                      {formatMoneyValue(formatSignedMinor(commRemainingMinor))} SAR
                    </bdi>
                  </span>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: LEGACY HISTORICAL RECORDS */}
      {activeTab === "LEGACY" && d.legacy.length > 0 && (
        <div
          id={`${tabIdPrefix}-panel-LEGACY`}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-tab-LEGACY`}
        >
          <Card className="theme-card border theme-border overflow-hidden shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b theme-border bg-[var(--bg-card-subtle)] space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                <h2
                  id={legacyHeadingId}
                  className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-tight"
                >
                  {ui("أرشيف الحركات السابقة")}
                </h2>
                <Badge variant="outline" className="font-mono text-xs tabular-nums">
                  {d.legacy.length}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {ui(
                  "هذه الحركات محفوظة كما هي، ولم تُرحَّل مرة أخرى أو تُعتبر رواتب أو سلفًا تلقائيًا."
                )}
              </p>
            </CardHeader>

            <CardContent className="p-0">
              <div className="hidden md:block">
                <Table
                  regionLabelledBy={legacyHeadingId}
                  wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                  className="border-separate border-spacing-0"
                >
                  <TableCaption className="sr-only">
                    {ui("أرشيف الحركات السابقة")}
                  </TableCaption>
                  <TableHeader className="bg-[var(--table-header-bg)] text-xs font-bold text-[var(--text-main)]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-3.5 px-4 border-b theme-border whitespace-nowrap">
                        {ui("التاريخ")}
                      </TableHead>
                      <TableHead className="py-3.5 px-4 border-b theme-border">
                        {ui("البيان")}
                      </TableHead>
                      <TableHead className="py-3.5 px-4 border-b theme-border text-end whitespace-nowrap">
                        {ui("المبلغ")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs [&_tr:last-child_td]:border-b-0 [&_tr:last-child_th]:border-b-0">
                    {d.legacy.map((l) => (
                      <TableRow
                        key={l.id}
                        className="hover:bg-[var(--table-row-hover)] transition-colors"
                      >
                        <th
                          scope="row"
                          className="py-3.5 px-4 text-start align-middle border-b theme-border font-mono font-semibold tabular-nums whitespace-nowrap text-[var(--text-main)]"
                        >
                          <bdi dir="ltr">{l.effectiveDate.slice(0, 10)}</bdi>
                        </th>
                        <TableCell className="py-3.5 px-4 align-middle border-b theme-border whitespace-normal break-words text-[var(--text-main)]">
                          {l.description}
                        </TableCell>
                        <TableCell
                          className="py-3.5 px-4 align-middle border-b theme-border text-end font-mono font-bold tabular-nums whitespace-nowrap text-[var(--text-main)]"
                          dir="ltr"
                        >
                          {l.direction} {formatMoneyValue(l.amount)} SAR
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden p-3.5 space-y-3">
                {d.legacy.map((l) => (
                  <MobileRecordCard
                    key={l.id}
                    titleAs="h3"
                    title={
                      <span className="font-mono text-xs tabular-nums" dir="ltr">
                        {l.effectiveDate.slice(0, 10)}
                      </span>
                    }
                    subtitle={l.description}
                    badge={
                      <span className="font-mono text-xs font-bold tabular-nums text-[var(--text-main)]" dir="ltr">
                        {l.direction} {formatMoneyValue(l.amount)} SAR
                      </span>
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODALS */}
      {movementModal.open && (
        <MovementModal
          statement={d}
          defaultKind={movementModal.defaultKind}
          defaultAmount={movementModal.defaultAmount}
          onClose={() => setMovementModal({ open: false })}
          reload={result.reload}
        />
      )}

      {salaryModalOpen && (
        <SalaryTermModal
          memberId={d.member.id}
          onClose={() => setSalaryModalOpen(false)}
          reload={result.reload}
        />
      )}

      {(payrollModalOpen || editingPayroll) && (
        <PayrollModal
          memberId={d.member.id}
          editing={editingPayroll}
          onClose={() => {
            setPayrollModalOpen(false);
            setEditingPayroll(null);
          }}
          reload={result.reload}
        />
      )}

      {reverseModalOp && (
        <ReverseModal
          op={reverseModalOp}
          onClose={() => setReverseModalOp(null)}
          reload={result.reload}
        />
      )}
    </div>
  );
}

// Semantic badge for operation kinds
function OperationBadge({ kind }: { kind: string }) {
  const ui = useUiText();
  const label = ui(OPERATION_LABELS[kind] || kind);

  if (kind === "PAYOUT") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border border-emerald-600/25">
        <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (kind === "SALARY") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-sky-500/12 text-sky-800 dark:text-sky-300 border border-sky-600/25">
        <Banknote className="w-3 h-3 text-sky-700 dark:text-sky-300 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (kind === "COMMISSION" || kind === "COMMISSION_BILL") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30">
        <Sparkles className="w-3 h-3 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (kind.startsWith("CUSTODY")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-indigo-500/12 text-indigo-800 dark:text-indigo-300 border border-indigo-600/25">
        <Coins className="w-3 h-3 text-indigo-700 dark:text-indigo-300 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (kind.startsWith("ADVANCE")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-orange-500/12 text-orange-800 dark:text-orange-300 border border-orange-600/25">
        <HandCoins className="w-3 h-3 text-orange-700 dark:text-orange-300 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (kind === "REVERSAL") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-rose-500/12 text-rose-800 dark:text-rose-300 border border-rose-600/25">
        <RotateCcw className="w-3 h-3 text-rose-700 dark:text-rose-300 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-[var(--bg-card-subtle)] text-[var(--text-main)] border theme-border">
      {label}
    </span>
  );
}

// Financial Movement Modal (Payout, Custody, Advance, Settle)
function MovementModal({
  statement,
  defaultKind = "PAYOUT",
  defaultAmount = "",
  onClose,
  reload,
}: {
  statement: StaffStatement;
  defaultKind?: string;
  defaultAmount?: string;
  onClose: () => void;
  reload: () => void;
}) {
  const ui = useUiText();
  const m = useMutation();
  const [kind, setKind] = useState(defaultKind);
  const [amount, setAmount] = useState(defaultAmount);
  const [day, setDay] = useState(currentSaudiPeriod().day);
  const [description, setDescription] = useState(
    defaultKind === "PAYOUT" ? "صرف مستحقات" : ""
  );
  const [deduct, setDeduct] = useState("0");
  const [cashAccount, setCashAccount] = useState("1102");
  const [purchaseId, setPurchaseId] = useState("");
  const [billSearch, setBillSearch] = useState("");
  const [commissionId, setCommissionId] = useState("");
  const [operationKey, setOperationKey] = useState<string | null>(null);

  const bills = useCommercialData<{
    items: {
      id: string;
      invoiceNumber: string;
      supplierName: string;
      totalAmount: string;
      postingStatus: string;
      paymentAccountCode: string;
    }[];
  }>(`/purchase-options?search=${encodeURIComponent(billSearch)}`);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const key = operationKey || crypto.randomUUID();
    setOperationKey(key);
    await m.run(
      () =>
        commercialRequest(
          `/members/${statement.member.id}/operations`,
          "POST",
          {
            operationKey: key,
            kind,
            amount,
            effectiveDate: day,
            description,
            cashAccount,
            deductAdvance: kind === "PAYOUT" ? deduct : "0",
            ...(["CUSTODY_SETTLE", "COMMISSION_BILL"].includes(kind)
              ? { purchaseId }
              : {}),
            ...(kind === "COMMISSION_BILL" ? { commissionId } : {}),
          }
        ),
      () => {
        reload();
        onClose();
      }
    );
  }

  return (
    <Modal label="تسجيل حركة مالية" onClose={onClose} isBusy={m.busy}>
      <section className="mobile-dialog-panel theme-card w-full max-w-lg rounded-2xl p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("تسجيل حركة مالية")}</span>
          </h2>
          <button
            type="button"
            aria-label={ui("إغلاق")}
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-3">
            <Field label="نوع الحركة">
              <select
                className={INPUT}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setOperationKey(null);
                  if (e.target.value === "PAYOUT") {
                    setDescription("صرف مستحقات");
                  }
                }}
              >
                {Object.entries(OPERATION_LABELS)
                  .filter(
                    ([k]) =>
                      !["SALARY", "COMMISSION", "REVERSAL"].includes(k) &&
                      (k !== "COMMISSION_BILL" ||
                        statement.member.kind.startsWith("EXTERNAL"))
                  )
                  .map(([k, label]) => (
                    <option value={k} key={k}>
                      {ui(label)}
                    </option>
                  ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label={
                  kind === "PAYOUT"
                    ? "المبلغ النقدي المراد صرفه"
                    : "المبلغ"
                }
              >
                <input
                  className={`${INPUT} text-start font-mono`}
                  dir="ltr"
                  required
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setOperationKey(null);
                  }}
                  placeholder="0.00"
                />
              </Field>

              <Field label="تاريخ الحركة">
                <input
                  className={`${INPUT} text-start font-mono`}
                  dir="ltr"
                  required
                  type="date"
                  max={currentSaudiPeriod().day}
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setOperationKey(null);
                  }}
                />
              </Field>
            </div>

            <Field label="البيان">
              <input
                required
                className={INPUT}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setOperationKey(null);
                }}
                placeholder={ui("البيان")}
              />
            </Field>

            {!["CUSTODY_SETTLE", "COMMISSION_BILL"].includes(kind) && (
              <Field label="حساب الدفع">
                <select
                  className={INPUT}
                  value={cashAccount}
                  onChange={(e) => {
                    setCashAccount(e.target.value);
                    setOperationKey(null);
                  }}
                >
                  <option value="1102">{ui("البنك")}</option>
                  <option value="1101">{ui("الصندوق")}</option>
                </select>
              </Field>
            )}

            {kind === "PAYOUT" && (
              <Field label="خصم سلفة إضافي من المستحق">
                <input
                  className={`${INPUT} text-start font-mono`}
                  dir="ltr"
                  inputMode="decimal"
                  value={deduct}
                  onChange={(e) => {
                    setDeduct(e.target.value);
                    setOperationKey(null);
                  }}
                  placeholder="0"
                />
              </Field>
            )}

            {["CUSTODY_SETTLE", "COMMISSION_BILL"].includes(kind) && (
              <>
                <Field label="بحث عن فاتورة مورد">
                  <input
                    className={INPUT}
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                  />
                </Field>
                <Field label="فاتورة المورد الآجلة">
                  <select
                    required
                    className={INPUT}
                    value={purchaseId}
                    onChange={(e) => {
                      setOperationKey(null);
                      setPurchaseId(e.target.value);
                      setAmount(
                        bills.data?.items.find((b) => b.id === e.target.value)
                          ?.totalAmount || ""
                      );
                    }}
                  >
                    <option value="">{ui("اختر الفاتورة")}</option>
                    {bills.data?.items
                      .filter(
                        (b) =>
                          b.postingStatus === "POSTED" &&
                          b.paymentAccountCode === "2101"
                      )
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.supplierName} · {b.invoiceNumber} · {b.totalAmount}
                        </option>
                      ))}
                  </select>
                </Field>
                <Link
                  className="block underline text-xs font-bold text-[var(--accent-gold)]"
                  href="/admin/purchases"
                >
                  {ui("تسجيل فاتورة مورد أولًا")}
                </Link>
              </>
            )}

            {kind === "COMMISSION_BILL" && (
              <Field label="العمولة المرتبطة">
                <select
                  className={INPUT}
                  required
                  value={commissionId}
                  onChange={(e) => {
                    setCommissionId(e.target.value);
                    setOperationKey(null);
                  }}
                >
                  <option value="">{ui("اختر العمولة")}</option>
                  {statement.operations
                    .filter((o) => o.kind === "COMMISSION")
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.description} · {o.amount}
                      </option>
                    ))}
                </select>
              </Field>
            )}
          </div>

          <Notice message={bills.error} error />
          <Notice message={m.error} error />

          <p className="text-xs text-[var(--text-muted)]">
            {ui(
              "صرف المستحقات يخفض الرصيد المستحق؛ العهدة والسلفة تظلان منفصلتين."
            )}
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
            <button
              type="button"
              className={SECONDARY}
              onClick={onClose}
              disabled={m.busy}
            >
              {ui("إلغاء")}
            </button>
            <button type="submit" disabled={m.busy} className={BUTTON}>
              {ui("حفظ الحركة وترحيل القيد")}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}

// Salary Term Definition Modal
function SalaryTermModal({
  memberId,
  onClose,
  reload,
}: {
  memberId: string;
  onClose: () => void;
  reload: () => void;
}) {
  const ui = useUiText();
  const m = useMutation();
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(currentSaudiPeriod().day);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await m.run(
      () =>
        commercialRequest(`/members/${memberId}/salary-terms`, "POST", {
          amount,
          effectiveFrom: from,
        }),
      () => {
        reload();
        onClose();
      }
    );
  }

  return (
    <Modal label="الراتب الشهري" onClose={onClose} isBusy={m.busy}>
      <section className="mobile-dialog-panel theme-card w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("الراتب الشهري")}</span>
          </h2>
          <button
            type="button"
            aria-label={ui("إغلاق")}
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="الراتب الشهري">
            <input
              required
              className={`${INPUT} text-start font-mono`}
              dir="ltr"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="يسري من">
            <input
              required
              type="date"
              dir="ltr"
              className={`${INPUT} text-start font-mono`}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>

          <Notice message={m.error} error />

          <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
            <button
              type="button"
              className={SECONDARY}
              onClick={onClose}
              disabled={m.busy}
            >
              {ui("إلغاء")}
            </button>
            <button type="submit" disabled={m.busy} className={BUTTON}>
              {ui("حفظ الراتب")}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}

// Monthly Payroll Draft Creation & Editing Modal
function PayrollModal({
  memberId,
  editing,
  onClose,
  reload,
}: {
  memberId: string;
  editing: Payroll | null;
  onClose: () => void;
  reload: () => void;
}) {
  const ui = useUiText();
  const m = useMutation();
  const [month, setMonth] = useState(
    editing?.month || currentSaudiPeriod().day.slice(0, 7)
  );
  const [amount, setAmount] = useState(editing?.amount || "");
  const [reason, setReason] = useState(editing?.adjustmentReason || "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (editing) {
      await m.run(
        () =>
          commercialRequest(`/payroll/${editing.id}`, "PUT", {
            version: editing.version,
            amount,
            adjustmentReason: reason,
          }),
        () => {
          reload();
          onClose();
        }
      );
    } else {
      await m.run(
        () =>
          commercialRequest(`/members/${memberId}/payroll`, "POST", {
            month,
            ...(amount ? { amount } : {}),
            adjustmentReason: reason,
          }),
        () => {
          reload();
          onClose();
        }
      );
    }
  }

  return (
    <Modal
      label={editing ? "تعديل" : "إنشاء مسودة المسير"}
      onClose={onClose}
      isBusy={m.busy}
    >
      <section className="mobile-dialog-panel theme-card w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{editing ? ui("تعديل") : ui("إنشاء مسودة المسير")}</span>
          </h2>
          <button
            type="button"
            aria-label={ui("إغلاق")}
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {!editing && (
            <Field label="شهر المسير">
              <input
                required
                className={`${INPUT} text-start font-mono`}
                dir="ltr"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </Field>
          )}

          <Field
            label={
              editing ? "المبلغ" : "المبلغ المعدل اختياريًا"
            }
          >
            <input
              className={`${INPUT} text-start font-mono`}
              dir="ltr"
              required={Boolean(editing)}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field
            label={
              editing ? "سبب التعديل" : "سبب تعديل الشهر الجزئي"
            }
          >
            <input
              className={INPUT}
              required={Boolean(editing)}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <Notice message={m.error} error />

          <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
            <button
              type="button"
              className={SECONDARY}
              onClick={onClose}
              disabled={m.busy}
            >
              {ui("إلغاء")}
            </button>
            <button type="submit" disabled={m.busy} className={BUTTON}>
              {editing ? ui("حفظ") : ui("إنشاء مسودة المسير")}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}

// Reverse Operation Confirmation Modal
function ReverseModal({
  op,
  onClose,
  reload,
}: {
  op: StaffOperation;
  onClose: () => void;
  reload: () => void;
}) {
  const ui = useUiText();
  const m = useMutation();
  const [reason, setReason] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    await m.run(
      () =>
        commercialRequest(`/operations/${op.id}/reverse`, "POST", {
          day: currentSaudiPeriod().day,
          reason,
        }),
      () => {
        reload();
        onClose();
      }
    );
  }

  return (
    <Modal label="عكس موثق" onClose={onClose} isBusy={m.busy}>
      <section className="mobile-dialog-panel theme-card w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-700 dark:text-rose-300" aria-hidden="true" />
            <span>{ui("عكس موثق")}</span>
          </h2>
          <button
            type="button"
            aria-label={ui("إغلاق")}
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border text-xs space-y-1 font-mono text-[var(--text-main)]">
          <div>
            <span className="text-[var(--text-muted)]">{ui("البيان")}:</span>{" "}
            {op.description}
          </div>
          <div>
            <span className="text-[var(--text-muted)]">{ui("المبلغ")}:</span>{" "}
            <b>{op.amount} SAR</b>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="سبب العكس">
            <input
              required
              className={INPUT}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={ui("سبب العكس")}
              autoFocus
            />
          </Field>

          <Notice message={m.error} error />

          <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
            <button
              type="button"
              className={SECONDARY}
              onClick={onClose}
              disabled={m.busy}
            >
              {ui("إلغاء")}
            </button>
            <button type="submit" disabled={m.busy} className={BUTTON}>
              {ui("تأكيد العكس")}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}
