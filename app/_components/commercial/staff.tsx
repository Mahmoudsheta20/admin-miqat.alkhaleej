"use client";
import { useEffect, useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useUiText } from "@/lib/ui-text";
import { commercialRequest, csvDownload, type Member, type StaffStatement, type Payroll } from "@/lib/commercial";
import { getCaptains } from "@/app/_actions/captain";
import { currentSaudiPeriod } from "@/lib/accounting";
import { useAuth } from "@/lib/authContext";
import { PageHeader, StatCard, StatRow } from "@/app/_components/ui";
import { UserCheck, Users, UserPlus, Download, Wallet, Coins, HandCoins } from "lucide-react";
import { BUTTON, INPUT, SECONDARY, Field, Notice, Panel, LoadingRows, useCommercialData, useMutation } from "./shared";

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
          ).map(([k, label]) => (
            <Field label={label} key={k}>
              <input className={INPUT} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </Field>
          ))}
          <Field label="يستحق عمولات إحالة">
            <input
              className="ms-2 accent-amber-600"
              type="checkbox"
              checked={f.isRepresentative}
              onChange={(e) => setF({ ...f, isRepresentative: e.target.checked })}
            />
          </Field>
          <Field label="نشط">
            <input
              className="ms-2 accent-amber-600"
              type="checkbox"
              checked={f.active}
              onChange={(e) => setF({ ...f, active: e.target.checked })}
            />
          </Field>
        </div>
        <Notice message={lookupError || m.error} error />
        <div className="flex gap-2">
          <button disabled={m.busy} className={BUTTON}>
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
  const [search, setSearch] = useState("");

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

  const activeCount = list.data?.items.filter((r) => r.active).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ui(representatives ? "المناديب وعمولات الإحالة" : "حسابات السائقين والعاملين")}
        subtitle={ui("المستحقات والعهد والسلف منفصلة، وكل حركة جديدة مرتبطة بدفتر الأستاذ.")}
        badge={representatives ? ui("الوسطاء والمناديب") : ui("إدارة العاملين والسائقين")}
        icon={representatives ? Users : UserCheck}
        primaryAction={{
          label: `+ ${ui("إضافة مندوب أو موظف")}`,
          onClick: () => setEditing("NEW"),
          icon: UserPlus,
          variant: "primary",
        }}
        helpGuide={membersHelpGuide}
        onRefresh={list.reload}
        isRefreshing={list.loading}
      />

      {/* KPI Stats Ribbon */}
      <StatRow columns={2}>
        <StatCard
          label={ui(representatives ? "المناديب وعمولات الإحالة" : "حسابات السائقين والعاملين")}
          value={list.data?.items.length ?? 0}
          unit={ui("حساب مالي")}
          icon={representatives ? Users : UserCheck}
        />
        <StatCard
          label={ui("نشط")}
          value={activeCount}
          unit={ui("حساب مالي")}
          icon={UserCheck}
          variant="emerald"
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

      <input
        className={`${INPUT} sm:max-w-md`}
        aria-label={ui("بحث بالاسم")}
        placeholder={ui("بحث بالاسم")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Notice message={list.error} error />

      {list.loading ? (
        <LoadingRows />
      ) : (
        <div className="theme-card divide-y theme-border rounded-2xl shadow-xs overflow-hidden">
          {list.data?.items
            .filter((r) => r.name.includes(search))
            .map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                <div>
                  <Link className="font-bold underline text-slate-900 dark:text-white" href={`/admin/staff/${r.id}`}>
                    {r.name}
                  </Link>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {ui(KIND_LABELS[r.kind])} · {ui(r.active ? "نشط" : "موقوف")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link className={SECONDARY} href={`/admin/staff/${r.id}`}>
                    {ui("كشف الحساب والمستحقات")}
                  </Link>
                  <button className={SECONDARY} onClick={() => setEditing(r)}>
                    {ui("تعديل")}
                  </button>
                </div>
              </div>
            ))}
          {!list.data?.items.length && <p className="p-6 text-center text-sm text-slate-400">{ui("افتح حساب السائق من صفحة الكباتن، أو أضف مندوبًا جديدًا.")}</p>}
        </div>
      )}
    </div>
  );
}

export function StaffPage({ memberId, captainId, readOnly = false }: { memberId?: string; captainId?: string; readOnly?: boolean }) {
  const { user } = useAuth();
  const path = memberId ? `/members/${memberId}` : `/captains/${captainId || user?.id || ""}`;
  const result = useCommercialData<StaffStatement>(path),
    ui = useUiText(),
    [tab, setTab] = useState("SALARY");

  if (result.loading) return <LoadingRows />;
  if (!result.data) return <Notice message={result.error} error />;
  const d = result.data;

  const ops = d.operations.filter((o) =>
    tab === "SALARY"
      ? ["SALARY", "PAYOUT", "REVERSAL"].includes(o.kind)
      : tab === "CUSTODY"
        ? o.custodyDelta !== "0"
        : tab === "ADVANCE"
          ? o.advanceDelta !== "0"
          : o.kind === "COMMISSION" || o.kind === "COMMISSION_BILL",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={d.member.name}
        subtitle={ui("حساب السائق والمستحقات")}
        badge={ui(KIND_LABELS[d.member.kind] || "حساب مالي")}
        icon={UserCheck}
        primaryAction={{
          label: ui("تنزيل كشف الحساب"),
          onClick: () =>
            csvDownload(`staff-${d.member.id}.csv`, [
              ["كشف المستحقات", d.member.name],
              ["المستحق", d.balances.entitlement, "العهد", d.balances.custody, "السلف", d.balances.advance],
              ["التاريخ", "النوع", "البيان", "المبلغ", "تغير المستحق", "تغير العهدة", "تغير السلفة"],
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

      {/* KPI Stats Ribbon */}
      <StatRow columns={3}>
        <StatCard
          label={ui("مستحقات متاحة للصرف")}
          value={d.balances.entitlement}
          unit="SAR"
          icon={Wallet}
          variant="emerald"
        />
        <StatCard
          label={ui("عهدة لم تُسوَّ")}
          value={d.balances.custody}
          unit="SAR"
          icon={Coins}
          variant="amber"
        />
        <StatCard
          label={ui("سلف متبقية")}
          value={d.balances.advance}
          unit="SAR"
          icon={HandCoins}
          variant="rose"
        />
      </StatRow>

      <div role="tablist" aria-label={ui("أقسام حساب السائق")} className="flex flex-wrap gap-2">
        {(
          [
            ["SALARY", "الرواتب"],
            ["CUSTODY", "العهد"],
            ["ADVANCE", "السلف"],
            ["COMMISSION", "عمولات الرحلات"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              tab === k
                ? "bg-amber-500 text-white shadow-xs"
                : "border theme-border theme-card text-slate-700 dark:text-slate-300 hover:border-amber-500"
            }`}
            onClick={() => setTab(k)}
          >
            {ui(label)}
          </button>
        ))}
      </div>

      {tab === "SALARY" && (
        <Panel title="الرواتب الشهرية">
          {!readOnly && <SalaryForms memberId={d.member.id} reload={result.reload} />}
          <div className="mt-4 space-y-2">
            {d.salaryTerms.map((t) => (
              <p key={t.id} className="text-sm font-medium">
                {ui("راتب ساري من")}: {t.effectiveFrom.slice(0, 10)} · <b dir="ltr" className="font-mono text-amber-700 dark:text-amber-400">{t.amount} SAR</b>
              </p>
            ))}
            {d.payroll.map((p) => (
              <PayrollRow key={`${p.id}:${p.version}`} row={p} readOnly={readOnly} reload={result.reload} />
            ))}
            {!d.payroll.length && <p className="text-sm text-slate-400 p-2">{ui("لا توجد مسيرات رواتب")}</p>}
          </div>
        </Panel>
      )}

      {tab === "COMMISSION" && (
        <Panel title="عمولات الرحلات">
          {d.commissions.map((c) => (
            <div key={c.contractId} className="flex flex-wrap justify-between gap-2 border-b theme-border py-3">
              <Link href={readOnly ? "/captain" : `/admin/contracts/${c.contractId}`} className="font-mono text-sm underline text-amber-700 dark:text-amber-400">
                {c.contract?.referenceNumber || c.contractId}
              </Link>
              <span className="text-sm">
                {ui(c.status === "COMPLETED" ? "تم التنفيذ" : c.status === "CANCELLED" ? "أُلغيت" : "لم تُنفذ")} ·{" "}
                <b className="font-mono">{c.amount} SAR</b> · {ui(c.paymentStatus === "PAID" ? "مصروف" : c.paymentStatus === "DUE" ? "مستحق" : "متوقع")}
                <small className="block text-xs text-slate-400">
                  {ui("المدفوع من العمولة")}: {c.paidAmount} · {ui("المتبقي من العمولة")}: {c.remainingAmount}
                </small>
              </span>
            </div>
          ))}
          {!d.commissions.length && <p className="text-sm text-slate-400 p-2">{ui("لا توجد عمولات رحلات")}</p>}
        </Panel>
      )}

      {!readOnly && <MovementForm key={d.member.id} statement={d} reload={result.reload} />}

      <Panel title="الحركات المسجلة">
        <div className="space-y-2">
          {ops.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b theme-border py-3">
              <div>
                <strong className="text-sm block">{ui(OPERATION_LABELS[o.kind] || o.kind)}</strong>
                <p className="text-xs text-slate-400 mt-0.5">
                  {o.effectiveDate.slice(0, 10)} · {o.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <b dir="ltr" className="font-mono text-sm">
                  {o.amount} SAR
                </b>
                {!readOnly && o.kind !== "REVERSAL" && !d.operations.some((r) => r.reversalOfId === o.id) && (
                  <ReverseButton id={o.id} reload={result.reload} />
                )}
              </div>
            </div>
          ))}
          {!ops.length && <p className="text-sm text-slate-400 p-2">{ui("لا توجد حركات في هذا القسم")}</p>}
        </div>
      </Panel>

      {d.legacy.length > 0 && (
        <Panel title="حركات سابقة غير مصنفة">
          <p className="mb-3 text-xs text-slate-400">
            {ui("هذه الحركات محفوظة كما هي، ولم تُرحَّل مرة أخرى أو تُعتبر رواتب أو سلفًا تلقائيًا.")}
          </p>
          {d.legacy.map((l) => (
            <div key={l.id} className="flex flex-wrap justify-between gap-2 border-b theme-border py-2 text-sm">
              <span>
                {l.effectiveDate.slice(0, 10)} · {l.description}
              </span>
              <b dir="ltr" className="font-mono">
                {l.direction} {l.amount} SAR
              </b>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

function SalaryForms({ memberId, reload }: { memberId: string; reload: () => void }) {
  const ui = useUiText(),
    m = useMutation(),
    [amount, setAmount] = useState(""),
    [from, setFrom] = useState(currentSaudiPeriod().day),
    [month, setMonth] = useState(currentSaudiPeriod().day.slice(0, 7)),
    [override, setOverride] = useState(""),
    [reason, setReason] = useState("");

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void m.run(() => commercialRequest(`/members/${memberId}/salary-terms`, "POST", { amount, effectiveFrom: from }), reload);
        }}
      >
        <Field label="الراتب الشهري">
          <input required className={INPUT} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="يسري من">
          <input required type="date" className={INPUT} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <button disabled={m.busy} className={SECONDARY}>
          {ui("حفظ الراتب")}
        </button>
      </form>
      <form
        className="grid items-end gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void m.run(
            () => commercialRequest(`/members/${memberId}/payroll`, "POST", { month, ...(override ? { amount: override } : {}), adjustmentReason: reason }),
            reload,
          );
        }}
      >
        <Field label="شهر المسير">
          <input required className={INPUT} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field label="المبلغ المعدل اختياريًا">
          <input className={INPUT} inputMode="decimal" value={override} onChange={(e) => setOverride(e.target.value)} />
        </Field>
        <Field label="سبب تعديل الشهر الجزئي">
          <input className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <button disabled={m.busy} className={SECONDARY}>
          {ui("إنشاء مسودة المسير")}
        </button>
      </form>
      <Notice message={m.error} error />
      <Notice message={m.message} />
    </div>
  );
}

function PayrollRow({ row, readOnly, reload }: { row: Payroll; readOnly: boolean; reload: () => void }) {
  const ui = useUiText(),
    m = useMutation(),
    [editing, setEditing] = useState(false),
    [amount, setAmount] = useState(row.amount),
    [reason, setReason] = useState(row.adjustmentReason);

  return (
    <div className="rounded-xl border theme-border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {row.month} · <b className="font-mono">{row.amount} SAR</b> · {ui(row.status === "APPROVED" ? "معتمد" : "مسودة")}
        </span>
        {!readOnly && row.status === "DRAFT" && (
          <div className="flex gap-2">
            <button className={SECONDARY} onClick={() => setEditing(!editing)}>
              {ui("تعديل")}
            </button>
            <button
              disabled={m.busy}
              className={BUTTON}
              onClick={() => void m.run(() => commercialRequest(`/payroll/${row.id}/approve`, "POST", { version: row.version }), reload)}
            >
              {ui("اعتماد الاستحقاق")}
            </button>
          </div>
        )}
      </div>
      {editing && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void m.run(() => commercialRequest(`/payroll/${row.id}`, "PUT", { version: row.version, amount, adjustmentReason: reason }), reload);
          }}
        >
          <Field label="المبلغ">
            <input required className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="سبب التعديل">
            <input required className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <button className={SECONDARY} disabled={m.busy}>
            {ui("حفظ")}
          </button>
        </form>
      )}
      <Notice message={m.error} error />
    </div>
  );
}

function MovementForm({ statement, reload }: { statement: StaffStatement; reload: () => void }) {
  const ui = useUiText(),
    m = useMutation(),
    [kind, setKind] = useState("PAYOUT"),
    [amount, setAmount] = useState(""),
    [day, setDay] = useState(currentSaudiPeriod().day),
    [description, setDescription] = useState(""),
    [deduct, setDeduct] = useState("0"),
    [cashAccount, setCashAccount] = useState("1102"),
    [purchaseId, setPurchaseId] = useState(""),
    [billSearch, setBillSearch] = useState(""),
    [commissionId, setCommissionId] = useState(""),
    [operationKey, setOperationKey] = useState<string | null>(null);

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
        commercialRequest(`/members/${statement.member.id}/operations`, "POST", {
          operationKey: key,
          kind,
          amount,
          effectiveDate: day,
          description,
          cashAccount,
          deductAdvance: kind === "PAYOUT" ? deduct : "0",
          ...(["CUSTODY_SETTLE", "COMMISSION_BILL"].includes(kind) ? { purchaseId } : {}),
          ...(kind === "COMMISSION_BILL" ? { commissionId } : {}),
        }),
      () => {
        setOperationKey(null);
        setAmount("");
        setDescription("");
        reload();
      },
    );
  }

  return (
    <Panel title="تسجيل حركة مالية">
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع الحركة">
            <select
              className={INPUT}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setOperationKey(null);
              }}
            >
              {Object.entries(OPERATION_LABELS)
                .filter(([k]) => !["SALARY", "COMMISSION", "REVERSAL"].includes(k) && (k !== "COMMISSION_BILL" || statement.member.kind.startsWith("EXTERNAL")))
                .map(([k, label]) => (
                  <option value={k} key={k}>
                    {ui(label)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={kind === "PAYOUT" ? "المبلغ النقدي المراد صرفه" : "المبلغ"}>
            <input
              className={INPUT}
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setOperationKey(null);
              }}
            />
          </Field>
          <Field label="تاريخ الحركة">
            <input
              className={INPUT}
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
          <Field label="البيان">
            <input
              required
              className={INPUT}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setOperationKey(null);
              }}
            />
          </Field>
          {kind === "PAYOUT" && (
            <Field label="خصم سلفة إضافي من المستحق">
              <input
                className={INPUT}
                inputMode="decimal"
                value={deduct}
                onChange={(e) => {
                  setDeduct(e.target.value);
                  setOperationKey(null);
                }}
              />
            </Field>
          )}
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
          {["CUSTODY_SETTLE", "COMMISSION_BILL"].includes(kind) && (
            <>
              <Field label="بحث عن فاتورة مورد">
                <input className={INPUT} value={billSearch} onChange={(e) => setBillSearch(e.target.value)} />
              </Field>
              <Field label="فاتورة المورد الآجلة">
                <select
                  required
                  className={INPUT}
                  value={purchaseId}
                  onChange={(e) => {
                    setOperationKey(null);
                    setPurchaseId(e.target.value);
                    setAmount(bills.data?.items.find((b) => b.id === e.target.value)?.totalAmount || "");
                  }}
                >
                  <option value="">{ui("اختر الفاتورة")}</option>
                  {bills.data?.items
                    .filter((b) => b.postingStatus === "POSTED" && b.paymentAccountCode === "2101")
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.supplierName} · {b.invoiceNumber} · {b.totalAmount}
                      </option>
                    ))}
                </select>
              </Field>
              <Link className="self-end underline text-sm font-bold text-amber-700 dark:text-amber-400" href="/admin/purchases">
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
        <Notice message={m.message} />
        <p className="text-xs text-slate-400">
          {ui("صرف المستحقات يخفض الرصيد المستحق؛ العهدة والسلفة تظلان منفصلتين.")}
        </p>
        <button disabled={m.busy} className={BUTTON}>
          {ui("حفظ الحركة وترحيل القيد")}
        </button>
      </form>
    </Panel>
  );
}

function ReverseButton({ id, reload }: { id: string; reload: () => void }) {
  const ui = useUiText(),
    m = useMutation(),
    [open, setOpen] = useState(false),
    [reason, setReason] = useState("");

  return (
    <div>
      <button className={SECONDARY} onClick={() => setOpen(!open)}>
        {ui("عكس موثق")}
      </button>
      {open && (
        <form
          className="mt-2 space-y-2 p-3 rounded-xl border theme-border"
          onSubmit={(e) => {
            e.preventDefault();
            void m.run(() => commercialRequest(`/operations/${id}/reverse`, "POST", { day: currentSaudiPeriod().day, reason }), reload);
          }}
        >
          <Field label="سبب العكس">
            <input required className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <button disabled={m.busy} className={SECONDARY}>
            {ui("تأكيد العكس")}
          </button>
        </form>
      )}
      <Notice message={m.error} error />
    </div>
  );
}
