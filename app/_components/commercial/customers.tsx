"use client";

import { useUrlState } from "@/lib/use-url-state";
import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useUiText } from "@/lib/ui-text";
import {
  commercialRequest,
  csvDownload,
  type Customer,
  type Commercial,
} from "@/lib/commercial";
import {
  invoiceRequest,
  type InvoiceDetail,
  type BookingInvoiceInput,
} from "@/lib/invoices";
import { currentSaudiPeriod } from "@/lib/accounting";
import {
  PageHeader,
  StatCard,
  StatRow,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Checkbox,
} from "@/app/_components/ui";
import { formatSignedMinor, signedMoneyMinor } from "@/lib/money";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";
import Modal from "@/app/_components/Modal";
import RecordPaymentModal from "@/app/(admin)/admin/invoices/record-payment-modal";
import {
  Building2,
  UserPlus,
  Users,
  User,
  Download,
  Edit,
  ReceiptText,
  Truck,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Mail,
  Search,
  X,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  INPUT,
  Field,
  Notice,
  LoadingRows,
  useCommercialData,
  useMutation,
} from "./shared";

export function CustomerEditor({
  customer,
  onSaved,
  onClose,
}: {
  customer?: Customer;
  onSaved: () => void;
  onClose: () => void;
}) {
  const ui = useUiText();
  const mutation = useMutation();
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
    const hasAddress = [
      form.street,
      form.building,
      form.district,
      form.city,
      form.postalCode,
    ].some(Boolean);

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
          customer ? { version: customer.version, customer: payload } : payload
        ),
      onSaved
    );
  }

  return (
    <Modal
      label={customer ? "تعديل العميل" : "إضافة عميل"}
      onClose={onClose}
      isBusy={mutation.busy}
    >
      <div className="mobile-dialog-panel mx-auto my-auto max-w-2xl rounded-2xl theme-card border theme-border p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b theme-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 dark:text-amber-400">
              {form.type === "COMPANY" ? (
                <Building2 className="w-5 h-5" aria-hidden="true" />
              ) : (
                <User className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {customer ? ui("تعديل العميل") : ui("إضافة عميل")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {customer
                  ? customer.name
                  : ui("العميل مسؤول عن الحساب، والضيف هو الراكب في الرحلة.")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition cursor-pointer"
            aria-label={ui("إغلاق")}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {ui("البيانات الأساسية")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نوع العميل">
                <select
                  className={INPUT}
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as Customer["type"] })
                  }
                >
                  <option value="INDIVIDUAL">{ui("فرد")}</option>
                  <option value="COMPANY">{ui("شركة")}</option>
                </select>
              </Field>
              <Field label="اسم العميل">
                <input
                  required
                  type="text"
                  autoComplete="name"
                  className={INPUT}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="رقم التواصل">
                <input
                  type="tel"
                  autoComplete="tel"
                  dir="ltr"
                  className={`${INPUT} text-start`}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="البريد الإلكتروني">
                <input
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  className={`${INPUT} text-start`}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Tax & Registration */}
          <div className="space-y-3 pt-3 border-t theme-border">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {ui("البيانات الضريبية والتسجيل")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="رقم السجل أو معرف العميل">
                <input
                  type="text"
                  className={INPUT}
                  value={form.identification}
                  onChange={(e) =>
                    setForm({ ...form, identification: e.target.value })
                  }
                />
              </Field>
              <div className="flex flex-col justify-end">
                <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium p-2.5 rounded-lg border theme-border bg-muted/20 cursor-pointer">
                  <Checkbox
                    checked={form.vatRegistered}
                    onChange={(e) =>
                      setForm({ ...form, vatRegistered: e.target.checked })
                    }
                  />
                  <span>{ui("مسجل في ضريبة القيمة المضافة")}</span>
                </label>
              </div>
              {form.vatRegistered && (
                <Field label="الرقم الضريبي">
                  <input
                    className={`${INPUT} font-mono text-start`}
                    required
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={15}
                    value={form.vatNumber}
                    onChange={(e) =>
                      setForm({ ...form, vatNumber: e.target.value })
                    }
                  />
                </Field>
              )}
            </div>
          </div>

          {/* National Address */}
          <div className="space-y-3 pt-3 border-t theme-border">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {ui("العنوان الوطني")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="المدينة">
                <input
                  type="text"
                  autoComplete="address-level2"
                  className={INPUT}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="الحي">
                <input
                  type="text"
                  className={INPUT}
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                />
              </Field>
              <Field label="الشارع">
                <input
                  type="text"
                  autoComplete="street-address"
                  className={INPUT}
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                />
              </Field>
              <Field label="رقم المبنى">
                <input
                  type="text"
                  className={INPUT}
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                />
              </Field>
              <Field label="الرمز البريدي">
                <input
                  type="text"
                  autoComplete="postal-code"
                  dir="ltr"
                  className={`${INPUT} text-start font-mono`}
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Status */}
          <div className="pt-2 border-t theme-border flex items-center justify-between">
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium cursor-pointer">
              <Checkbox
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span>{ui("نشط")}</span>
            </label>
          </div>

          <Notice message={mutation.error} error />

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t theme-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={onClose}
              disabled={mutation.busy}
            >
              {ui("إغلاق")}
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={mutation.busy}
            >
              {ui("حفظ العميل")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function CustomersPage() {
  const ui = useUiText();
  const [search, setSearch] = useUrlState<string>("q", "");
  const [type, setType] = useUrlState<string>("type", "");
  const [page, setPage] = useUrlState<number>("page", 1);
  const [editing, setEditing] = useState<Customer | "NEW" | null>(null);

  const q = new URLSearchParams({
    search,
    page: String(page),
    ...(type ? { type } : {}),
  });
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
          title: ui("إصدار الفاتورة المجمعة"),
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
    [ui]
  );

  const companyCount = list.data?.items.filter((c) => c.type === "COMPANY").length ?? 0;
  const individualCount = list.data?.items.filter((c) => c.type === "INDIVIDUAL").length ?? 0;
  const vatCount = list.data?.items.filter((c) => c.vatRegistered).length ?? 0;

  function exportCustomersReport() {
    const items = list.data?.items || [];
    csvDownload(`customers-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["تقرير العملاء — شركة ميقات الخليج"],
      ["تاريخ الاستخراج", new Date().toLocaleString("ar-SA")],
      ["إجمالي العملاء", String(items.length)],
      [],
      [
        "اسم العميل",
        "النوع",
        "الهاتف",
        "البريد الإلكتروني",
        "مسجل ضريبياً",
        "الرقم الضريبي",
        "السجل / المعرف",
        "المدينة",
        "الحي",
        "الشارع",
        "الحالة",
      ],
      ...items.map((c) => [
        c.name,
        c.type === "COMPANY" ? "شركة" : "فرد",
        c.phone || "",
        c.email || "",
        c.vatRegistered ? "نعم" : "لا",
        c.vatNumber || "",
        c.identification || "",
        c.address?.city || "",
        c.address?.district || "",
        c.address?.street || "",
        c.active ? "نشط" : "موقوف",
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء وفواتيرهم"
        subtitle="العميل مسؤول عن الحساب، والضيف هو الراكب في الرحلة."
        badge="العملاء والمبيعات"
        icon={Building2}
        primaryAction={{
          label: "إضافة عميل",
          onClick: () => setEditing("NEW"),
          icon: UserPlus,
          variant: "primary",
        }}
        secondaryActions={[
          {
            label: "تصدير تقرير العملاء",
            onClick: exportCustomersReport,
            icon: Download,
            variant: "secondary",
          },
        ]}
        helpGuide={customersHelpGuide}
        onRefresh={list.reload}
        isRefreshing={list.loading}
      />

      {/* KPI Stats Ribbon */}
      <StatRow columns={4}>
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
        <StatCard
          label={ui("مسجلون ضريبياً")}
          value={vatCount}
          unit={ui("عميل")}
          icon={ShieldCheck}
          variant="blue"
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] sm:max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            aria-label={ui("بحث عن عميل")}
            placeholder={ui("بحث بالاسم، الهاتف، الرقم الضريبي...")}
            className={`${INPUT} ps-9 pe-11 mt-0!`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 items-center justify-center absolute end-0.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={ui("إلغاء التحديد")}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <select
          aria-label={ui("نوع العميل")}
          className={`${INPUT} sm:max-w-44 mt-0!`}
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
        <div className="theme-card overflow-hidden rounded-2xl border theme-border shadow-xs">
          {!list.data?.items.length ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {ui("لا توجد نتائج")}
            </p>
          ) : (
            <>
              <div className="md:hidden space-y-3 p-3.5">
                {list.data.items.map((c) => (
                  <MobileRecordCard
                    key={c.id}
                    title={
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-bold text-sm text-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:underline"
                      >
                        {c.name}
                      </Link>
                    }
                    subtitle={
                      c.phone ? (
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <bdi>{c.phone}</bdi>
                        </span>
                      ) : (
                        ui("بدون رقم هاتف")
                      )
                    }
                    badge={
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        <Badge
                          variant={c.type === "COMPANY" ? "gold" : "secondary"}
                          className="text-[10px] gap-1 px-1.5 py-0"
                        >
                          {c.type === "COMPANY" ? (
                            <Building2 className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <User className="w-3 h-3" aria-hidden="true" />
                          )}
                          <span>{ui(c.type === "COMPANY" ? "شركة" : "فرد")}</span>
                        </Badge>
                        <Badge
                          variant={c.active ? "success" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {ui(c.active ? "نشط" : "موقوف")}
                        </Badge>
                      </div>
                    }
                    footer={
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1 min-h-11 gap-1.5 text-xs font-semibold"
                        >
                          <Link href={`/admin/customers/${c.id}`}>
                            <ReceiptText className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{ui("كشف الحساب والفواتير")}</span>
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11 px-3 text-xs gap-1.5"
                          onClick={() => setEditing(c)}
                          aria-label={`${ui("تعديل العميل")} ${c.name}`}
                        >
                          <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{ui("تعديل")}</span>
                        </Button>
                      </>
                    }
                  >
                    <MobileCardMetaGrid>
                      <MobileCardField
                        label={ui("الرقم الضريبي / السجل")}
                        mono
                        value={
                          c.vatRegistered
                            ? c.vatNumber || ui("مسجل ضريبياً")
                            : c.identification || ui("غير مسجل ضريبياً")
                        }
                      />
                      <MobileCardField
                        label={ui("المدينة والعنوان")}
                        value={
                          c.address?.city
                            ? `${c.address.city}${c.address.district ? ` · ${c.address.district}` : ""}`
                            : ui("غير مسجل")
                        }
                      />
                    </MobileCardMetaGrid>
                  </MobileRecordCard>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start">{ui("اسم العميل ونوعه")}</TableHead>
                    <TableHead className="text-start">{ui("بيانات التواصل")}</TableHead>
                    <TableHead className="text-start">{ui("الرقم الضريبي والسجل")}</TableHead>
                    <TableHead className="text-start">{ui("العنوان والمدينة")}</TableHead>
                    <TableHead className="text-end">{ui("الإجراءات")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.items.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <Link
                            href={`/admin/customers/${c.id}`}
                            className="font-bold text-sm text-foreground hover:text-amber-600 dark:hover:text-amber-400 transition hover:underline"
                          >
                            {c.name}
                          </Link>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant={c.type === "COMPANY" ? "gold" : "secondary"}
                              className="text-[10px] gap-1 px-1.5 py-0"
                            >
                              {c.type === "COMPANY" ? (
                                <Building2 className="w-3 h-3" />
                              ) : (
                                <User className="w-3 h-3" />
                              )}
                              <span>{ui(c.type === "COMPANY" ? "شركة" : "فرد")}</span>
                            </Badge>
                            <Badge
                              variant={c.active ? "success" : "outline"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {ui(c.active ? "نشط" : "موقوف")}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="space-y-1 text-xs">
                          {c.phone ? (
                            <div className="flex items-center gap-1.5 text-foreground font-mono">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              <bdi>{c.phone}</bdi>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[170px]">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="space-y-1 text-xs">
                          {c.vatRegistered ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 gap-1 px-1.5 py-0"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{c.vatNumber || ui("مسجل ضريبياً")}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] text-muted-foreground px-1.5 py-0"
                            >
                              {ui("غير مسجل ضريبياً")}
                            </Badge>
                          )}
                          {c.identification && (
                            <p className="text-[11px] font-mono text-muted-foreground">
                              {c.identification}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {c.address?.city || c.address?.district ? (
                          <div className="text-xs text-foreground">
                            <div className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>{c.address.city}</span>
                              {c.address.district && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  · {c.address.district}
                                </span>
                              )}
                            </div>
                            {c.address.street && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px]">
                                {c.address.street}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {ui("لا يوجد عنوان مسجل")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-9 gap-1.5 text-xs font-semibold"
                          >
                            <Link href={`/admin/customers/${c.id}`}>
                              <ReceiptText className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{ui("كشف الحساب والفواتير")}</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditing(c)}
                            aria-label={`${ui("تعديل العميل")} ${c.name}`}
                            title={ui("تعديل العميل")}
                          >
                            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between border-t theme-border pt-4">
        <span className="text-xs text-muted-foreground">
          {list.data?.total
            ? `${list.data.total} ${ui("عميل")}`
            : null}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {ui("السابق")}
          </Button>
          <span className="px-3 py-1 text-xs font-bold font-mono rounded-md bg-muted text-foreground">
            {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            disabled={page * 30 >= (list.data?.total || 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            {ui("التالي")}
          </Button>
        </div>
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
  const d = detail.data;
  const c = d.customer;

  async function issue(e: FormEvent) {
    e.preventDefault();
    if (!detail.data) return;
    const currentDetail = detail.data;
    const currentCustomer = currentDetail.customer;
    const tripRows = currentDetail.contracts.filter((t) => selected.includes(t.id));
    const firstDate = tripRows.map((t) => t.tripDate).sort()[0];

    const payload: BookingInvoiceInput & { customerId: string; contractIds: string[] } = {
      operationKey: crypto.randomUUID(),
      documentType: docType,
      customerId: currentCustomer.id,
      contractIds: selected,
      contractVersions: Object.fromEntries(tripRows.map((t) => [t.id, t.commercial.version])),
      invoiceDate: `${invoiceDay}T12:00:00+03:00`,
      buyer: {
        name: currentCustomer.name,
        ...(currentCustomer.vatNumber ? { vatNumber: currentCustomer.vatNumber } : {}),
        ...(currentCustomer.identification
          ? {
              identification: currentCustomer.identification,
              identificationScheme: currentCustomer.type === "COMPANY" ? "CRN" : "OTH",
            }
          : {}),
        ...(currentCustomer.address ? { address: currentCustomer.address } : {}),
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
        ? {
            taxDocument: {
              kind: "INVOICE",
              profile: currentCustomer.type === "COMPANY" ? "STANDARD" : "SIMPLIFIED",
              supplyDate: firstDate,
            },
          }
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
      }
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
      ...d.payments.map((p) => [
        p.direction,
        p.paymentDate.slice(0, 10),
        p.amount,
        p.reference,
      ]),
    ]);
  }

  const allTripIds = d.contracts.map((t) => t.id);
  const isAllSelected = allTripIds.length > 0 && allTripIds.every((tid) => selected.includes(tid));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelected([]);
    } else {
      setSelected(allTripIds);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
      >
        <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" aria-hidden="true" />
        <span>{ui("العودة للعملاء")}</span>
      </Link>

      <PageHeader
        title={c.name}
        subtitle={`${ui(c.type === "COMPANY" ? "شركة" : "فرد")} · ${c.phone || "—"}`}
        badge="ملف العميل"
        icon={Building2}
        primaryAction={{
          label: "تنزيل كشف الحساب",
          onClick: downloadStatement,
          icon: Download,
          variant: "secondary",
        }}
        secondaryActions={[
          {
            label: "تعديل بيانات العميل",
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
      <StatRow columns={4}>
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
        <StatCard
          label={ui("إجمالي التحصيلات")}
          value={d.payments.length}
          unit={ui("سند")}
          icon={ArrowDownLeft}
          variant="blue"
        />
      </StatRow>

      {/* Section 1: Customer Trips & Invoicing */}
      <Card className="theme-card border theme-border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b theme-border bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>{ui("رحلات العميل وإصدار الفاتورة")}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {ui(
                  "اختر رحلة أو عدة رحلات من شهر واحد ومعاملة ضريبية متوافقة. الفاتورة الفعلية تتطلب تأكيد التنفيذ."
                )}
              </CardDescription>
            </div>
            {d.contracts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="min-h-11 sm:min-h-9 text-xs"
                onClick={toggleSelectAll}
              >
                {isAllSelected ? ui("إلغاء التحديد") : ui("تحديد الكل")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <form onSubmit={issue} className="space-y-4">
            {!d.contracts.length ? (
              <div className="rounded-xl border theme-border">
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {ui("اربط العميل بالعقد لتظهر الرحلات هنا.")}
                </p>
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-2.5 max-h-96 overflow-y-auto pe-0.5">
                  {d.contracts.map((t) => {
                    const isChecked = selected.includes(t.id);
                    return (
                      <Card
                        key={t.id}
                        className={`theme-card border shadow-none p-3.5 transition-colors ${
                          isChecked ? "border-amber-500/50 bg-amber-500/10" : "theme-border"
                        }`}
                      >
                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox
                            className="mt-0.5 shrink-0"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, t.id]
                                  : selected.filter((v) => v !== t.id)
                              )
                            }
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link
                                className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
                                href={`/admin/contracts/${t.id}`}
                              >
                                <bdi>{t.referenceNumber}</bdi>
                              </Link>
                              <Badge
                                variant={
                                  t.commercial.executionStatus === "COMPLETED"
                                    ? "success"
                                    : t.commercial.executionStatus === "CANCELLED"
                                      ? "destructive"
                                      : "outline"
                                }
                                className="text-[10px]"
                              >
                                {ui(
                                  t.commercial.executionStatus === "COMPLETED"
                                    ? "تم التنفيذ"
                                    : t.commercial.executionStatus === "CANCELLED"
                                      ? "أُلغيت"
                                      : "لم تُنفذ"
                                )}
                              </Badge>
                            </div>
                            <div className="text-xs font-medium text-foreground">
                              {t.origin} — {t.destination}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">
                                {t.tripDate} {t.tripTime && `· ${t.tripTime}`}
                              </span>
                              <strong dir="ltr" className="font-mono text-sm font-bold text-foreground">
                                {t.commercial.netAmount} SAR
                              </strong>
                            </div>
                          </div>
                        </label>
                      </Card>
                    );
                  })}
                </div>

                <div className="hidden md:block max-h-96 overflow-auto rounded-xl border theme-border">
                  <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          aria-label={ui(isAllSelected ? "إلغاء التحديد" : "تحديد الكل")}
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-start">{ui("رقم العقد والعملية")}</TableHead>
                      <TableHead className="text-start">{ui("المسار والرحلة")}</TableHead>
                      <TableHead className="text-start">{ui("حالة التنفيذ")}</TableHead>
                      <TableHead className="text-end">{ui("الصافي")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.contracts.map((t) => {
                      const isChecked = selected.includes(t.id);
                      const tripCheckboxId = `select-trip-${t.id}`;
                      return (
                        <TableRow
                          key={t.id}
                          className={`transition-colors ${
                            isChecked ? "bg-amber-500/10" : "hover:bg-muted/40"
                          }`}
                        >
                          <TableCell className="text-center py-3">
                            <Checkbox
                              id={tripCheckboxId}
                              aria-label={`${ui("رحلة")} ${t.referenceNumber}`}
                              checked={isChecked}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, t.id]
                                    : selected.filter((v) => v !== t.id)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium py-3">
                            <Link
                              className="font-mono text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
                              href={`/admin/contracts/${t.id}`}
                            >
                              <bdi>{t.referenceNumber}</bdi>
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t.customerName}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 text-xs">
                            <label htmlFor={tripCheckboxId} className="block cursor-pointer">
                              <span className="font-medium text-foreground">
                                {t.origin} — {t.destination}
                              </span>
                              <span className="block text-muted-foreground font-mono mt-0.5">
                                {t.tripDate} {t.tripTime && `· ${t.tripTime}`}
                              </span>
                            </label>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant={
                                t.commercial.executionStatus === "COMPLETED"
                                  ? "success"
                                  : t.commercial.executionStatus === "CANCELLED"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px]"
                            >
                              {ui(
                                t.commercial.executionStatus === "COMPLETED"
                                  ? "تم التنفيذ"
                                  : t.commercial.executionStatus === "CANCELLED"
                                  ? "أُلغيت"
                                  : "لم تُنفذ"
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end py-3">
                            <strong
                              dir="ltr"
                              className="font-mono text-sm font-bold text-foreground"
                            >
                              {t.commercial.netAmount} SAR
                            </strong>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  </Table>
                </div>
              </>
            )}

            {selected.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <span className="text-xs font-bold">
                  {ui("عدد الرحلات المختارة")}: {selected.length}
                </span>
                <span className="text-sm font-bold font-mono" dir="ltr">
                  {ui("إجمالي الصافي")}:{" "}
                  {sumTrips(d.contracts.filter((t) => selected.includes(t.id)))} SAR
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نوع المستند">
                <select
                  className={INPUT}
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as typeof docType)}
                >
                  <option value="TAX">{ui("فاتورة ضريبية")}</option>
                  <option value="PROFORMA">{ui("فاتورة مبدئية")}</option>
                </select>
              </Field>
              <Field label="تاريخ الفاتورة">
                <input
                  className={INPUT}
                  type="date"
                  required
                  value={invoiceDay}
                  onChange={(e) => setInvoiceDay(e.target.value)}
                />
              </Field>
            </div>

            <label className="flex min-h-11 items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                required
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>
                {ui(
                  "راجعت العميل والرحلات والأسعار والضريبة. ستُسجل الفاتورة آجلة في حساب العميل."
                )}
              </span>
            </label>

            <Notice message={mutation.error} error />
            <Notice message={mutation.message} />

            {receipt && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                <Link
                  className="font-bold underline text-sm inline-flex min-h-11 sm:min-h-9 items-center gap-1.5"
                  href={`/admin/invoices/${receipt}`}
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{ui("فتح الفاتورة الصادرة")}</span>
                </Link>
              </div>
            )}

            <Button
              type="submit"
              variant="gold"
              size="sm"
              className="min-h-11 sm:min-h-10"
              disabled={mutation.busy || !selected.length || !reviewed}
            >
              {ui("إصدار الفاتورة المختارة")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Invoices & Credit Notes */}
      <Card className="theme-card border theme-border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b theme-border bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-amber-500" />
              <span>{ui("الفواتير والإشعارات")}</span>
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {d.invoices.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!d.invoices.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {ui("لا توجد فواتير لهذا العميل")}
            </p>
          ) : (
            <>
              <div className="md:hidden p-3.5 space-y-3">
                {d.invoices.map((i) => {
                  const invBal = d.balances.find((b) => b.invoiceId === i.id);
                  const remainingMinor = invBal ? signedMoneyMinor(invBal.balance) : BigInt(0);
                  const totalMinor = signedMoneyMinor(i.totalAmount);
                  const settledMinor = invBal?.settledAmount !== undefined
                    ? signedMoneyMinor(invBal.settledAmount)
                    : totalMinor - remainingMinor;
                  const isFullyPaid = remainingMinor <= BigInt(0);
                  const isPartiallyPaid = remainingMinor > BigInt(0) && settledMinor > BigInt(0);
                  const remainingDisplay = formatSignedMinor(remainingMinor);

                  return (
                    <MobileRecordCard
                      key={i.id}
                      title={
                        <Link
                          href={`/admin/invoices/${i.id}`}
                          className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          #{i.number}
                        </Link>
                      }
                      subtitle={
                        <span className="font-mono">
                          {i.snapshot.input.documentType} · {i.snapshot.input.taxDocument?.kind || "INVOICE"} ·{" "}
                          {i.invoiceDate.slice(0, 10)}
                        </span>
                      }
                      badge={
                        isFullyPaid ? (
                          <Badge variant="success" className="text-[10px]">
                            {ui("مسددة بالكامل")}
                          </Badge>
                        ) : isPartiallyPaid ? (
                          <Badge variant="warning" className="text-[10px]">
                            {ui("مسددة جزئياً")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            {ui("غير مسددة")}
                          </Badge>
                        )
                      }
                      footer={
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1 min-h-11 text-xs font-medium"
                          >
                            <Link href={`/admin/invoices/${i.id}`}>{ui("عرض")}</Link>
                          </Button>
                          {!isFullyPaid && (
                            <Button
                              variant="gold"
                              size="sm"
                              className="flex-1 min-h-11 gap-1 text-xs"
                              onClick={() => setPayingInvoice(i)}
                            >
                              <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{ui("تسجيل سند قبض")}</span>
                            </Button>
                          )}
                        </>
                      }
                    >
                      <MobileCardMetaGrid>
                        <MobileCardField
                          label={ui("الإجمالي")}
                          mono
                          value={<bdi dir="ltr">{i.totalAmount} SAR</bdi>}
                        />
                        <MobileCardField
                          label={ui("المبلغ المتبقي")}
                          mono
                          value={
                            !isFullyPaid ? (
                              <span className="text-rose-700 dark:text-rose-400" dir="ltr">
                                {remainingDisplay} SAR
                              </span>
                            ) : (
                              "—"
                            )
                          }
                        />
                      </MobileCardMetaGrid>
                    </MobileRecordCard>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start">{ui("رقم الفاتورة ونوعها")}</TableHead>
                    <TableHead className="text-start">{ui("تاريخ الإصدار")}</TableHead>
                    <TableHead className="text-start">{ui("حالة السداد")}</TableHead>
                    <TableHead className="text-end">{ui("الإجمالي")}</TableHead>
                    <TableHead className="text-end">{ui("المبلغ المتبقي")}</TableHead>
                    <TableHead className="text-end">{ui("الإجراءات")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.invoices.map((i) => {
                    const invBal = d.balances.find((b) => b.invoiceId === i.id);
                    const remainingMinor = invBal ? signedMoneyMinor(invBal.balance) : BigInt(0);
                    const totalMinor = signedMoneyMinor(i.totalAmount);
                    const settledMinor = invBal?.settledAmount !== undefined
                      ? signedMoneyMinor(invBal.settledAmount)
                      : totalMinor - remainingMinor;
                    const isFullyPaid = remainingMinor <= BigInt(0);
                    const isPartiallyPaid = remainingMinor > BigInt(0) && settledMinor > BigInt(0);
                    const remainingDisplay = formatSignedMinor(remainingMinor);

                    return (
                      <TableRow key={i.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <Link
                              href={`/admin/invoices/${i.id}`}
                              className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
                            >
                              #{i.number}
                            </Link>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                              {i.snapshot.input.documentType} ·{" "}
                              {i.snapshot.input.taxDocument?.kind || "INVOICE"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-xs font-mono text-muted-foreground">
                          {i.invoiceDate.slice(0, 10)}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {isFullyPaid ? (
                            <Badge variant="success" className="text-[10px]">
                              {ui("مسددة بالكامل")}
                            </Badge>
                          ) : isPartiallyPaid ? (
                            <Badge variant="warning" className="text-[10px]">
                              {ui("مسددة جزئياً")}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              {ui("غير مسددة")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-end py-3.5">
                          <strong
                            dir="ltr"
                            className="font-mono tabular-nums text-sm font-bold text-foreground"
                          >
                            {i.totalAmount} SAR
                          </strong>
                        </TableCell>
                        <TableCell className="text-end py-3.5">
                          {!isFullyPaid ? (
                            <strong
                              dir="ltr"
                              className="font-mono tabular-nums text-sm font-bold text-rose-700 dark:text-rose-400"
                            >
                              {remainingDisplay} SAR
                            </strong>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-end py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8 text-xs font-medium"
                            >
                              <Link href={`/admin/invoices/${i.id}`}>
                                {ui("عرض")}
                              </Link>
                            </Button>
                            {!isFullyPaid && (
                              <Button
                                variant="gold"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => setPayingInvoice(i)}
                              >
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                                <span>{ui("تسجيل سند قبض")}</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Payments & Collections */}
      <Card className="theme-card border theme-border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b theme-border bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-500" />
              <span>{ui("التحصيلات والاستردادات")}</span>
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {d.payments.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!d.payments.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {ui("لا توجد تحصيلات مسجلة")}
            </p>
          ) : (
            <>
              <div className="md:hidden p-3.5 space-y-3">
                {d.payments.map((p) => {
                  const isReceipt = p.direction === "RECEIPT";
                  return (
                    <MobileRecordCard
                      key={p.id}
                      title={p.reference}
                      subtitle={<span className="font-mono">{p.paymentDate.slice(0, 10)}</span>}
                      badge={
                        <Badge
                          variant={isReceipt ? "success" : "destructive"}
                          className="text-[10px] gap-1"
                        >
                          {isReceipt ? (
                            <ArrowDownLeft className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          )}
                          <span>{ui(isReceipt ? "سند قبض" : "سند صرف")}</span>
                        </Badge>
                      }
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{ui("المبلغ")}</span>
                        <strong
                          dir="ltr"
                          className={`font-mono tabular-nums text-sm font-bold ${
                            isReceipt
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {isReceipt ? "+" : "−"}
                          {p.amount} SAR
                        </strong>
                      </div>
                    </MobileRecordCard>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start">{ui("نوع السند")}</TableHead>
                    <TableHead className="text-start">{ui("المرجع والبيان")}</TableHead>
                    <TableHead className="text-start">{ui("تاريخ الإصدار")}</TableHead>
                    <TableHead className="text-end">{ui("الإجمالي")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.payments.map((p) => {
                    const isReceipt = p.direction === "RECEIPT";
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3">
                          <Badge
                            variant={isReceipt ? "success" : "destructive"}
                            className="text-[10px] gap-1"
                          >
                            {isReceipt ? (
                              <ArrowDownLeft className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                            )}
                            <span>{ui(isReceipt ? "سند قبض" : "سند صرف")}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-xs font-medium text-foreground">
                          {p.reference}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-mono text-muted-foreground">
                          {p.paymentDate.slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-end py-3">
                          <strong
                            dir="ltr"
                            className={`font-mono tabular-nums text-sm font-bold ${
                              isReceipt
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {isReceipt ? "+" : "−"}
                            {p.amount} SAR
                          </strong>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
  const minor = trips.reduce(
    (sum, t) => sum + signedMoneyMinor(t.commercial.netAmount),
    BigInt(0)
  );
  return formatSignedMinor(minor);
}
