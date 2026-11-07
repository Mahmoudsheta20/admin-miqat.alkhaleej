"use client";
import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useUiText } from "@/lib/ui-text";
import { commercialRequest, csvDownload, type Customer, type Commercial } from "@/lib/commercial";
import { invoiceRequest, type InvoiceDetail, type BookingInvoiceInput } from "@/lib/invoices";
import { currentSaudiPeriod } from "@/lib/accounting";
import { PageHeader, StatCard, StatRow } from "@/app/_components/ui";
import { Building2, UserPlus, Users, User, Download, Edit, ReceiptText, Truck, Wallet, ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import RecordPaymentModal from "@/app/(admin)/admin/invoices/record-payment-modal";
import { BUTTON, INPUT, SECONDARY, Field, Notice, Panel, LoadingRows, useCommercialData, useMutation } from "./shared";

export function CustomerEditor({ customer, onSaved, onClose }: { customer?: Customer; onSaved: () => void; onClose: () => void }) {
  const ui = useUiText(), mutation = useMutation();
  const [form, setForm] = useState({
    type: customer?.type || "INDIVIDUAL",
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    vatRegistered: customer?.vatRegistered || false,
    vatNumber: customer?.vatNumber || "",
    identification: customer?.identification || "",
    active: customer?.active ?? true,
    street: customer?.address?.street || "",
    building: customer?.address?.building || "",
    district: customer?.address?.district || "",
    city: customer?.address?.city || "",
    postalCode: customer?.address?.postalCode || "",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const hasAddress = [form.street, form.building, form.district, form.city, form.postalCode].some(Boolean);
    const payload = {
      type: form.type,
      name: form.name,
      phone: form.phone,
      email: form.email,
      vatRegistered: form.vatRegistered,
      ...(form.vatRegistered && form.vatNumber ? { vatNumber: form.vatNumber } : {}),
      ...(form.identification ? { identification: form.identification } : {}),
      active: form.active,
      ...(hasAddress
        ? {
            address: {
              street: form.street,
              building: form.building,
              district: form.district,
              city: form.city,
              postalCode: form.postalCode,
              country: "SA" as const,
            },
          }
        : {}),
    };
    await mutation.run(
      () =>
        commercialRequest(
          customer ? `/customers/${customer.id}` : "/customers",
          customer ? "PUT" : "POST",
          customer ? { version: customer.version, customer: payload } : payload,
        ),
      onSaved,
    );
  }

  const fields = [
    ["name", "اسم العميل"],
    ["phone", "رقم التواصل"],
    ["email", "البريد الإلكتروني"],
    ["identification", "رقم السجل أو معرف العميل"],
    ["street", "الشارع"],
    ["building", "رقم المبنى"],
    ["district", "الحي"],
    ["city", "المدينة"],
    ["postalCode", "الرمز البريدي"],
  ] as const;

  return (
    <Panel title={customer ? "تعديل العميل" : "إضافة عميل"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع العميل">
            <select
              className={INPUT}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Customer["type"] })}
            >
              <option value="INDIVIDUAL">{ui("فرد")}</option>
              <option value="COMPANY">{ui("شركة")}</option>
            </select>
          </Field>
          {fields.map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                required={key === "name"}
                type={key === "email" ? "email" : "text"}
                className={INPUT}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="مسجل في ضريبة القيمة المضافة">
            <input
              className="ms-2 accent-amber-600"
              type="checkbox"
              checked={form.vatRegistered}
              onChange={(e) => setForm({ ...form, vatRegistered: e.target.checked })}
            />
          </Field>
          {form.vatRegistered && (
            <Field label="الرقم الضريبي">
              <input
                className={INPUT}
                required
                inputMode="numeric"
                maxLength={15}
                value={form.vatNumber}
                onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
              />
            </Field>
          )}
          <Field label="نشط">
            <input
              className="ms-2 accent-amber-600"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
          </Field>
        </div>
        <Notice message={mutation.error} error />
        <div className="flex gap-2">
          <button className={BUTTON} disabled={mutation.busy}>
            {ui("حفظ العميل")}
          </button>
          <button type="button" className={SECONDARY} onClick={onClose}>
            {ui("إغلاق")}
          </button>
        </div>
      </form>
    </Panel>
  );
}

export function CustomersPage() {
  const ui = useUiText();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | "NEW" | null>(null);
  const q = new URLSearchParams({ search, page: String(page), ...(type ? { type } : {}) });
  const list = useCommercialData<{ items: Customer[]; total: number }>(`/customers?${q}`);

  const customersHelpGuide = useMemo(
    () => ({
      title: ui("دليل إدارة العملاء والفواتير"),
      summary: ui("العميل مسؤول عن الحساب، والضيف هو الراكب في الرحلة."),
      cards: [
        {
          title: ui("العميل والضيف"),
          badge: ui("العلاقة"),
          items: [
            {
              label: ui("العميل المسؤول"),
              description: ui("الجهة أو الشخص المسؤول عن السداد والفوترة وله ملف ضريبي وحساب مستقل."),
            },
            {
              label: ui("الضيف الراكب"),
              description: ui("الراكب الفعلي داخل الرحلة، ويمكن أن يتطابق مع العميل أو يختلف عنه."),
            },
          ],
        },
        {
          title: ui("إصدار الفواتير المجمعة"),
          badge: ui("المبيعات"),
          items: [
            {
              label: ui("تجميع الرحلات"),
              description: ui("تحديد عدة رحلات منتهية لنفس العميل وإصدار فاتورة ضريبية واحدة تشمل تفاصيل كل رحلة."),
            },
            {
              label: ui("منع التكرار"),
              description: ui("يتحقق النظام من عدم فوترة أي رحلة مرتين في فواتير ضريبية معتمدة."),
            },
          ],
        },
      ],
      tip: ui("يمكنك النقر على اسم أي عميل لفتح ملفه واستعراض رحلاته وفواتيره وتنزيل كشف حسابه المالي."),
    }),
    [ui],
  );

  const companyCount = list.data?.items.filter((c) => c.type === "COMPANY").length ?? 0;
  const individualCount = list.data?.items.filter((c) => c.type === "INDIVIDUAL").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ui("العملاء وفواتيرهم")}
        subtitle={ui("العميل مسؤول عن الحساب، والضيف هو الراكب في الرحلة.")}
        badge={ui("العملاء والمبيعات")}
        icon={Building2}
        primaryAction={{
          label: `+ ${ui("إضافة عميل")}`,
          onClick: () => setEditing("NEW"),
          icon: UserPlus,
          variant: "primary",
        }}
        helpGuide={customersHelpGuide}
        onRefresh={list.reload}
        isRefreshing={list.loading}
      />

      {/* KPI Stats Ribbon */}
      <StatRow columns={3}>
        <StatCard
          label={ui("إجمالي العملاء")}
          value={list.data?.total ?? list.data?.items.length ?? 0}
          unit={ui("عميل")}
          icon={Users}
          isActive={type === ""}
          onClick={() => {
            setType("");
            setPage(1);
          }}
        />
        <StatCard
          label={ui("الشركات")}
          value={companyCount}
          unit={ui("شركة")}
          icon={Building2}
          variant="amber"
          isActive={type === "COMPANY"}
          onClick={() => {
            setType("COMPANY");
            setPage(1);
          }}
        />
        <StatCard
          label={ui("الأفراد")}
          value={individualCount}
          unit={ui("فرد")}
          icon={User}
          variant="emerald"
          isActive={type === "INDIVIDUAL"}
          onClick={() => {
            setType("INDIVIDUAL");
            setPage(1);
          }}
        />
      </StatRow>

      {editing && (
        <CustomerEditor
          key={editing === "NEW" ? "new" : editing.id}
          customer={editing === "NEW" ? undefined : editing}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-wrap gap-3">
        <input
          aria-label={ui("بحث عن عميل")}
          placeholder={ui("بحث عن عميل")}
          className={`${INPUT} sm:max-w-sm`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label={ui("نوع العميل")}
          className={`${INPUT} sm:max-w-48`}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{ui("كل العملاء")}</option>
          <option value="INDIVIDUAL">{ui("فرد")}</option>
          <option value="COMPANY">{ui("شركة")}</option>
        </select>
      </div>

      <Notice message={list.error} error />

      {list.loading ? (
        <LoadingRows />
      ) : (
        <div className="theme-card divide-y theme-border rounded-2xl shadow-xs overflow-hidden">
          {list.data?.items.length ? (
            list.data.items.map((c) => (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition" key={c.id}>
                <div>
                  <Link className="font-bold hover:underline text-slate-900 dark:text-white" href={`/admin/customers/${c.id}`}>
                    {c.name}
                  </Link>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {ui(c.type === "COMPANY" ? "شركة" : "فرد")} · {c.phone || "—"} · {ui(c.active ? "نشط" : "موقوف")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link className={SECONDARY} href={`/admin/customers/${c.id}`}>
                    {ui("الفواتير وكشف الحساب")}
                  </Link>
                  <button className={SECONDARY} onClick={() => setEditing(c)}>
                    {ui("تعديل")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-slate-400">{ui("لا توجد نتائج")}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className={SECONDARY} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          {ui("السابق")}
        </button>
        <span className="text-sm font-bold font-mono">{page}</span>
        <button className={SECONDARY} disabled={page * 30 >= (list.data?.total || 0)} onClick={() => setPage((p) => p + 1)}>
          {ui("التالي")}
        </button>
      </div>
    </div>
  );
}

interface CustomerTrip {
  id: string;
  referenceNumber: string;
  tripDate: string;
  tripTime: string;
  customerName: string;
  origin: string;
  destination: string;
  commercial: Commercial;
}

interface CustomerInvoice {
  id: string;
  number: number;
  invoiceDate: string;
  customerName: string;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  snapshot: InvoiceDetail["snapshot"];
}

interface CustomerDetail {
  customer: Customer;
  contracts: CustomerTrip[];
  invoices: CustomerInvoice[];
  payments: {
    id: string;
    documentId: string;
    amount: string;
    direction: string;
    paymentDate: string;
    reference: string;
  }[];
  balances: {
    invoiceId: string;
    balance: string;
    netDocumentAmount?: string;
    settledAmount?: string;
    direction?: string;
  }[];
  outstanding: string;
}

export function CustomerDetailPage({ id }: { id: string }) {
  const ui = useUiText();
  const detail = useCommercialData<CustomerDetail>(`/customers/${id}`);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [docType, setDocType] = useState<"TAX" | "PROFORMA">("TAX");
  const [invoiceDay, setInvoiceDay] = useState(currentSaudiPeriod().day);
  const [reviewed, setReviewed] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<CustomerInvoice | null>(null);
  const mutation = useMutation();

  if (detail.loading) return <LoadingRows />;
  if (!detail.data) return <Notice message={detail.error} error />;
  const d = detail.data,
    c = d.customer;

  async function issue(e: FormEvent) {
    e.preventDefault();
    if (!detail.data) return;
    const d = detail.data,
      c = d.customer,
      tripRows = d.contracts.filter((t) => selected.includes(t.id)),
      firstDate = tripRows.map((t) => t.tripDate).sort()[0];

    const payload: BookingInvoiceInput & { customerId: string; contractIds: string[] } = {
      operationKey: crypto.randomUUID(),
      documentType: docType,
      customerId: c.id,
      contractIds: selected,
      contractVersions: Object.fromEntries(tripRows.map((t) => [t.id, t.commercial.version])),
      invoiceDate: `${invoiceDay}T12:00:00+03:00`,
      buyer: {
        name: c.name,
        ...(c.vatNumber ? { vatNumber: c.vatNumber } : {}),
        ...(c.identification ? { identification: c.identification, identificationScheme: c.type === "COMPANY" ? "CRN" : "OTH" } : {}),
        ...(c.address ? { address: c.address } : {}),
      },
      paymentCode: "42",
      accountingApproved: reviewed,
      lines: [
        {
          code: "TRIP",
          description: "رحلات العميل",
          quantity: "1",
          unitPrice: "0",
          discount: "0",
          category: "S",
          rate: "15",
          component: "OWN_SUPPLY",
          taxReviewed: true,
        },
      ],
      ...(docType === "TAX"
        ? { taxDocument: { kind: "INVOICE", profile: c.type === "COMPANY" ? "STANDARD" : "SIMPLIFIED", supplyDate: firstDate } }
        : {
            transport: {
              serviceType: "OTHER",
              passengers: [],
              distanceUnit: "KM",
              tripDate: firstDate,
              origin: tripRows[0]?.origin || "",
              destination: tripRows[0]?.destination || "",
            },
          }),
    };

    await mutation.run(
      async () => {
        const r = await invoiceRequest<{ id: string }>("", "POST", payload);
        if (!r.success || !r.data) throw new Error(r.error || "تعذر إصدار الفاتورة");
        setReceipt(r.data.id);
      },
      () => {
        setSelected([]);
        setReviewed(false);
        detail.reload();
      },
    );
  }

  function downloadStatement() {
    csvDownload(`customer-${id}.csv`, [
      ["كشف حساب العميل", c.name],
      ["المتبقي", d.outstanding],
      ["الفاتورة", "التاريخ", "الصافي", "الضريبة", "الإجمالي", "المتبقي"],
      ...d.invoices.map((i) => [
        i.number,
        i.invoiceDate.slice(0, 10),
        i.netAmount,
        i.vatAmount,
        i.totalAmount,
        d.balances.find((b) => b.invoiceId === i.id)?.balance || "",
      ]),
      [],
      ["التحصيل / الاسترداد", "التاريخ", "المبلغ", "المرجع"],
      ...d.payments.map((p) => [p.direction, p.paymentDate.slice(0, 10), p.amount, p.reference]),
    ]);
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1">
        ← {ui("العودة للعملاء")}
      </Link>

      <PageHeader
        title={c.name}
        subtitle={`${ui(c.type === "COMPANY" ? "شركة" : "فرد")} · ${c.phone || "—"}`}
        badge={ui("ملف العميل")}
        icon={Building2}
        primaryAction={{
          label: ui("تنزيل كشف الحساب"),
          onClick: downloadStatement,
          icon: Download,
          variant: "secondary",
        }}
        secondaryActions={[
          {
            label: ui("تعديل العميل"),
            onClick: () => setEditing(!editing),
            icon: Edit,
            variant: "subtle",
          },
        ]}
        onRefresh={detail.reload}
        isRefreshing={detail.loading}
      />

      <Notice message={detail.error} error />

      {editing && (
        <CustomerEditor
          customer={c}
          onSaved={() => {
            setEditing(false);
            detail.reload();
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {/* KPI Stats Ribbon */}
      <StatRow columns={3}>
        <StatCard
          label={ui("المتبقي على العميل")}
          value={d.outstanding}
          unit="SAR"
          icon={Wallet}
          variant="rose"
        />
        <StatCard
          label={ui("عدد الفواتير")}
          value={d.invoices.length}
          unit={ui("فاتورة")}
          icon={ReceiptText}
          variant="amber"
        />
        <StatCard
          label={ui("عدد الرحلات")}
          value={d.contracts.length}
          unit={ui("رحلة")}
          icon={Truck}
          variant="emerald"
        />
      </StatRow>

      <Panel title="رحلات العميل وإصدار الفاتورة">
        <p className="mb-4 text-sm opacity-70">
          {ui("اختر رحلة أو عدة رحلات من شهر واحد ومعاملة ضريبية متوافقة. الفاتورة الفعلية تتطلب تأكيد التنفيذ.")}
        </p>
        <form onSubmit={issue} className="space-y-4">
          <div className="max-h-96 overflow-auto rounded-xl border theme-border divide-y">
            {d.contracts.length ? (
              d.contracts.map((t) => (
                <label key={t.id} className="flex items-start gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition cursor-pointer">
                  <input
                    className="mt-1 accent-amber-600 h-4 w-4 rounded"
                    type="checkbox"
                    checked={selected.includes(t.id)}
                    onChange={(e) =>
                      setSelected(e.target.checked ? [...selected, t.id] : selected.filter((v) => v !== t.id))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <Link className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline" href={`/admin/contracts/${t.id}`}>
                      {t.referenceNumber}
                    </Link>
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {t.customerName} · {t.origin} — {t.destination}
                    </span>
                    <small className="text-slate-400">
                      {t.tripDate} · {ui(t.commercial.executionStatus === "COMPLETED" ? "تم التنفيذ" : t.commercial.executionStatus === "CANCELLED" ? "أُلغيت" : "لم تُنفذ")}
                    </small>
                  </span>
                  <strong dir="ltr" className="font-mono text-sm text-slate-900 dark:text-white">
                    {t.commercial.netAmount} SAR
                  </strong>
                </label>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-slate-400">{ui("اربط العميل بالعقد لتظهر الرحلات هنا.")}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نوع المستند">
              <select className={INPUT} value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
                <option value="TAX">{ui("فاتورة ضريبية")}</option>
                <option value="PROFORMA">{ui("فاتورة مبدئية")}</option>
              </select>
            </Field>
            <Field label="تاريخ الفاتورة">
              <input className={INPUT} type="date" required value={invoiceDay} onChange={(e) => setInvoiceDay(e.target.value)} />
            </Field>
          </div>
          {selected.length > 0 && (
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              {ui("عدد الرحلات المختارة")}: {selected.length} · {ui("إجمالي الصافي")}: {sumTrips(d.contracts.filter((t) => selected.includes(t.id)))} SAR
            </p>
          )}
          <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <input required type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 accent-amber-600 h-4 w-4" />
            {ui("راجعت العميل والرحلات والأسعار والضريبة. ستُسجل الفاتورة آجلة في حساب العميل.")}
          </label>
          <Notice message={mutation.error} error />
          <Notice message={mutation.message} />
          {receipt && (
            <Link className="block font-bold text-amber-700 dark:text-amber-400 underline" href={`/admin/invoices/${receipt}`}>
              {ui("فتح الفاتورة الصادرة")}
            </Link>
          )}
          <button className={BUTTON} disabled={mutation.busy || !selected.length || !reviewed}>
            {ui("إصدار الفاتورة المختارة")}
          </button>
        </form>
      </Panel>

      <Panel title="الفواتير والإشعارات">
        <div className="space-y-3">
          {d.invoices.map((i) => {
            const invBal = d.balances.find((b) => b.invoiceId === i.id);
            const remaining = invBal ? Number(invBal.balance) : 0;
            const settled = invBal
              ? Number(invBal.settledAmount ?? (Number(i.totalAmount) - remaining).toFixed(2))
              : 0;
            const isFullyPaid = remaining <= 0.001;
            const isPartiallyPaid = remaining > 0.001 && settled > 0.001;

            return (
              <div
                key={i.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border theme-border p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/invoices/${i.id}`}
                      className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      #{i.number}
                    </Link>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {i.snapshot.input.documentType} · {i.snapshot.input.taxDocument?.kind || "INVOICE"}
                    </span>
                    {isFullyPaid ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                        {ui("مسددة بالكامل")}
                      </span>
                    ) : isPartiallyPaid ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                        {ui("مسددة جزئياً")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                        {ui("غير مسددة")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">{i.invoiceDate.slice(0, 10)}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-end">
                    <div className="text-xs text-slate-400">{ui("الإجمالي")}</div>
                    <strong dir="ltr" className="font-mono tabular-nums text-sm text-slate-900 dark:text-white">
                      {i.totalAmount} SAR
                    </strong>
                    {!isFullyPaid && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-mono tabular-nums font-semibold mt-0.5">
                        {ui("المتبقي")}: {remaining.toFixed(2)} SAR
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/admin/invoices/${i.id}`} className={SECONDARY}>
                      {ui("عرض")}
                    </Link>
                    {!isFullyPaid && (
                      <button
                        type="button"
                        onClick={() => setPayingInvoice(i)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition shadow-xs flex items-center gap-1.5"
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        {ui("تسجيل سند قبض")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!d.invoices.length && <p className="text-sm text-slate-400 p-2">{ui("لا توجد فواتير لهذا العميل")}</p>}
        </div>
      </Panel>

      <Panel title="التحصيلات والاستردادات">
        <div className="divide-y theme-border">
          {d.payments.map((p) => {
            const isReceipt = p.direction === "RECEIPT";
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      isReceipt
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
                    }`}
                  >
                    {isReceipt ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    {ui(isReceipt ? "سند قبض" : "سند صرف")}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.reference}</p>
                    <p className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
                      {p.paymentDate.slice(0, 10)}
                    </p>
                  </div>
                </div>

                <div className="text-end">
                  <strong
                    dir="ltr"
                    className={`font-mono tabular-nums text-base font-bold ${
                      isReceipt ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isReceipt ? "+" : "−"}
                    {p.amount} SAR
                  </strong>
                </div>
              </div>
            );
          })}
          {!d.payments.length && <p className="text-sm text-slate-400 p-2">{ui("لا توجد تحصيلات مسجلة")}</p>}
        </div>
      </Panel>

      {payingInvoice && (
        <RecordPaymentModal
          isOpen={true}
          invoiceId={payingInvoice.id}
          invoiceNumber={String(payingInvoice.number)}
          customerName={c.name}
          totalAmount={payingInvoice.totalAmount}
          onClose={() => setPayingInvoice(null)}
          onPaymentSuccess={() => {
            setPayingInvoice(null);
            detail.reload();
          }}
        />
      )}
    </div>
  );
}

function sumTrips(trips: CustomerTrip[]) {
  const cents = trips.reduce((sum, t) => {
    const [n, f = ""] = t.commercial.netAmount.split(".");
    return sum + BigInt(n) * BigInt(100) + BigInt(f.padEnd(2, "0"));
  }, BigInt(0));
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
