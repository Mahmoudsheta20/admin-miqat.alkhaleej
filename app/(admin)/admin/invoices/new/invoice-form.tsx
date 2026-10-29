"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, ChevronDown, Loader2, Plus, Save, Settings2, Truck } from "lucide-react";
import InvoiceTaxFields from "./invoice-tax-fields";
import InvoiceTypeSelector from "./invoice-type-selector";
import InvoiceBankFields, { EMPTY_BANK } from "@/app/_components/InvoiceBankFields";
import InvoicePhoneField from "./invoice-phone-field";
import { invoicePhoneFrom, invoicePhoneNumber } from "@/lib/invoice-phone";
import BookingFields from "./booking-fields";
import ContractPicker, { type InvoiceContractOption } from "./contract-picker";
import InvoiceLineEditor from "./invoice-line-editor";
import TransportFields from "./transport-fields";
import { bookingNotes, emptyBooking, validateBooking, type InvoiceBooking } from "@/lib/invoice-booking";
import { getVehicles } from "@/app/_actions/fleet";
import type { Vehicle } from "@/lib/types";
import { emptyTransport, transportPayload, validateTransportDraft, type TransportDetails, type TransportDefaults } from "@/lib/invoice-transport";
import { emptyInvoiceLine, estimateInvoice, saudiDateTimeInput } from "@/lib/invoice-draft";
import { INVOICE_TYPE_LABELS, invoiceRequest, type InvoiceDocumentType, type Buyer, type InvoiceLineInput, type InvoiceSettings, type InvoiceDetail, type TaxDocument } from "@/lib/invoices";
interface InvoiceFormProps { contractId?: string; initialDocumentType: InvoiceDocumentType; originalInvoiceId?: string; noteKind?: TaxDocument["kind"] }
interface FormLine { id: string; input: InvoiceLineInput }
interface BuyerForm { name: string; vatNumber: string; street: string; building: string; district: string; city: string; postalCode: string; commercialRegistration: string }
const EMPTY_BUYER: BuyerForm = { name: "", vatNumber: "", street: "", building: "", district: "", city: "", postalCode: "", commercialRegistration: "" };
const INPUT = "theme-input mt-1.5 h-11 w-full min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";
function heading(number: string, title: string, description: string) {
  return <header className="mb-5 flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">{number}</span><div><h2 className="text-base font-bold">{title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p></div></header>;
}
function difference(before: string, after: string): string { const cents = BigInt(before.replace(".", "")) - BigInt(after.replace(".", "")); return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`; }
function amount(value: string): string { const [whole, decimals] = value.split("."); return decimals === undefined ? value : `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`; }
export default function InvoiceForm({ contractId: initialContractId, initialDocumentType, originalInvoiceId, noteKind = "INVOICE" }: InvoiceFormProps) {
  const router = useRouter(), isTaxMode = initialDocumentType === "TAX";
  const [taxDocument, setTaxDocument] = useState<TaxDocument>({ kind: noteKind, profile: "SIMPLIFIED", supplyDate: saudiDateTimeInput().slice(0, 10), ...(originalInvoiceId ? { originalInvoiceId } : {}) });
  const [original, setOriginal] = useState<InvoiceDetail | null>(null);
  const [documentType, setDocumentType] = useState(initialDocumentType), [hasBankDetails, setHasBankDetails] = useState(false), [bankDetails, setBankDetails] = useState(EMPTY_BANK);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null), [isLoading, setIsLoading] = useState(true), [reload, setReload] = useState(0);
  const [error, setError] = useState(""), [isSaving, setIsSaving] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(""), [paymentCode, setPaymentCode] = useState("10"), [isReviewed, setIsReviewed] = useState(false);
  const [buyer, setBuyer] = useState<BuyerForm>(EMPTY_BUYER), [showBuyerDetails, setShowBuyerDetails] = useState(false);
  const [selectedContract, setSelectedContract] = useState<InvoiceContractOption | null>(null), [isSourceLoading, setIsSourceLoading] = useState(false), [sourceError, setSourceError] = useState("");
  const [transport, setTransport] = useState<TransportDetails>(() => ({ ...emptyTransport(), tripDate: saudiDateTimeInput().slice(0, 10) })), [hasTransportError, setHasTransportError] = useState(false);
  const [phone, setPhone] = useState(() => invoicePhoneFrom());
  const [booking, setBooking] = useState<InvoiceBooking>(emptyBooking);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]), [isLoadingVehicles, setIsLoadingVehicles] = useState(true), [vehicleError, setVehicleError] = useState(""), [vehicleReload, setVehicleReload] = useState(0);
  const [rows, setRows] = useState<FormLine[]>([{ id: "line-1", input: emptyInvoiceLine() }]);
  const nextRow = useRef(2), operationKey = useRef(""), sourceVersion = useRef(0), errorRegion = useRef<HTMLDivElement>(null);
  const applyOriginal = useCallback((invoice: InvoiceDetail) => {
    setOriginal(invoice); setBuyer({ ...EMPTY_BUYER, ...invoice.snapshot.input.buyer, ...invoice.snapshot.input.buyer.address, vatNumber: invoice.snapshot.input.buyer.vatNumber || "" });
    setTaxDocument(current => ({ ...current, originalInvoiceId: invoice.id, profile: invoice.snapshot.input.taxDocument?.profile || "SIMPLIFIED" }));
    setRows(invoice.snapshot.input.lines.map((input, index) => ({ id: `original-${index}`, input }))); nextRow.current = invoice.snapshot.input.lines.length + 1;
    if (invoice.snapshot.input.transport) { setTransport(invoice.snapshot.input.transport); setPhone(invoicePhoneFrom(invoice.snapshot.input.transport.contactPhone)); }
    setShowBuyerDetails(Boolean(invoice.snapshot.input.buyer.address)); setIsReviewed(false);
  }, []);
  async function selectOriginal(id: string) {
    if (!id) { setOriginal(null); setTaxDocument(current => ({ ...current, originalInvoiceId: undefined })); return; }
    setIsSourceLoading(true); setSourceError("");
    const result = await invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(id)}`);
    if (result.data) applyOriginal(result.data); else setSourceError(result.error || "تعذر تحميل الفاتورة الأصلية");
    setIsSourceLoading(false);
  }
  useEffect(() => {
    let active = true;
    void Promise.all([invoiceRequest<InvoiceSettings>("/settings"), initialContractId ? invoiceRequest<TransportDefaults>(`/transport-defaults/${encodeURIComponent(initialContractId)}`) : Promise.resolve(null), originalInvoiceId ? invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(originalInvoiceId)}`) : Promise.resolve(null)]).then(([config, linked, originalResult]) => {
      if (!active) return;
      setSettings(config.data || null);
      setBankDetails({ ...EMPTY_BANK, ...config.data?.company?.bankDetails }); setHasBankDetails(Boolean(config.data?.company?.bankDetails));
      setError(config.error || ""); setInvoiceDate(saudiDateTimeInput());
      if (linked?.data && initialContractId) {
        const { transport: details, customerName } = linked.data;
        setSelectedContract({ id: initialContractId, referenceNumber: details.contractReference || initialContractId, customerName, origin: details.origin, destination: details.destination, tripDate: details.tripDate });
        setBuyer(current => ({ ...current, name: customerName })); setTransport(details); setPhone(invoicePhoneFrom(details.contactPhone));
        setRows([{ id: "line-1", input: { ...emptyInvoiceLine(), description: `خدمة نقل من ${details.origin} إلى ${details.destination}`.slice(0, 200) } }]);
      } else if (initialContractId) setSourceError(linked?.error || "تعذر تحميل العقد المرتبط.");
      if (originalResult?.data) applyOriginal(originalResult.data); else if (originalInvoiceId) setSourceError(originalResult?.error || "تعذر تحميل الفاتورة الأصلية");
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [initialContractId, originalInvoiceId, reload, applyOriginal]);
  useEffect(() => { let active = true; void getVehicles().then(result => { if (!active) return; setVehicles(result.vehicles || []); setVehicleError(result.error || ""); setIsLoadingVehicles(false); }); return () => { active = false; }; }, [vehicleReload]);
  const estimate = estimateInvoice(rows.map(row => row.input)), beforeDiscount = estimateInvoice(rows.map(row => ({ ...row.input, discount: "0" })));
  const discountTotal = estimate.isValid && beforeDiscount.isValid ? difference(beforeDiscount.net, estimate.net) : "—";
  const canSave = Boolean(settings?.company) && !isLoading && !isSaving && !isSourceLoading && !sourceError;
  function updateBuyer(change: Partial<BuyerForm>) { setBuyer(current => ({ ...current, ...change })); if (isTaxMode && change.vatNumber !== undefined && !original) { setTaxDocument(current => ({ ...current, profile: change.vatNumber ? "STANDARD" : "SIMPLIFIED" })); if (change.vatNumber) setShowBuyerDetails(true); } setIsReviewed(false); }
  function updateRow(id: string, change: Partial<InvoiceLineInput>) { setRows(current => current.map(row => row.id === id ? { ...row, input: { ...row.input, ...change } } : row)); setIsReviewed(false); }
  function updateBooking(change: Partial<InvoiceBooking>) { setBooking(current => ({ ...current, ...change })); setIsReviewed(false); }
  function updateTransport(change: Partial<TransportDetails>) { setTransport(current => ({ ...current, ...change })); setIsReviewed(false); }
  function addService(description = "") { const index = nextRow.current++; setRows(current => [...current, { id: `line-${index}`, input: { ...emptyInvoiceLine(index), description } }]); setIsReviewed(false); }
  async function selectContract(contract: InvoiceContractOption) {
    const version = ++sourceVersion.current; setSelectedContract(contract); setIsSourceLoading(true); setSourceError(""); setIsReviewed(false);
    const result = await invoiceRequest<TransportDefaults>(`/transport-defaults/${encodeURIComponent(contract.id)}`);
    if (version !== sourceVersion.current) return;
    if (result.data) { const { customerName, transport: details } = result.data; setBuyer(current => current.name === customerName ? current : { ...EMPTY_BUYER, name: customerName }); setTransport(details); setPhone(invoicePhoneFrom(details.contactPhone)); setRows(current => current.length === 1 ? [{ ...current[0], input: { ...current[0].input, description: `خدمة نقل من ${details.origin} إلى ${details.destination}`.slice(0, 200) } }] : current); }
    else setSourceError(result.error || "تعذر تحميل تفاصيل العقد.");
    setIsSourceLoading(false);
  }
  function clearContract() { sourceVersion.current++; setSelectedContract(null); setIsSourceLoading(false); setSourceError(""); setTransport(current => ({ ...current, contractReference: undefined })); setIsReviewed(false); }
  function showError(message: string) { setError(message); requestAnimationFrame(() => errorRegion.current?.focus()); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canSave) return; setError(""); setHasTransportError(false);
    if (isTaxMode && taxDocument.kind !== "INVOICE" && (!original || !taxDocument.adjustmentReason?.trim())) { showError("اختر الفاتورة الأصلية وأدخل سبب الإشعار."); return; }
    if (isTaxMode && taxDocument.profile === "STANDARD" && (!buyer.vatNumber || ![buyer.street, buyer.building, buyer.district, buyer.city, buyer.postalCode].every(v => v.trim()))) { setShowBuyerDetails(true); showError("أكمل الرقم الضريبي والعنوان الوطني للمشتري."); return; }
    if (!estimate.isValid) { showError(estimate.error || "راجع قيم الخدمات."); return; }
    const addressParts = [buyer.street, buyer.building, buyer.district, buyer.city, buyer.postalCode], hasAddress = addressParts.some(value => value.trim());
    if (hasAddress && !addressParts.every(value => value.trim())) { setShowBuyerDetails(true); showError("أكمل عنوان العميل: الشارع والمبنى والحي والمدينة والرمز البريدي."); return; }
    const contactPhone = invoicePhoneNumber(phone);
    if (!contactPhone) { showError("أدخل رقم جوال صحيحًا مع اختيار كود الدولة المناسب."); return; }
    const bookingError = validateBooking(booking, transport); if (bookingError) { showError(bookingError); return; }
    const transportError = validateTransportDraft(transport); if (transportError) { setHasTransportError(true); showError(transportError); return; }
    setIsSaving(true);
    try {
      const payloadBuyer: Buyer = original ? original.snapshot.input.buyer : { name: buyer.name.trim(), ...(buyer.commercialRegistration.trim() ? { identification: buyer.commercialRegistration.trim(), identificationScheme: "CRN" } : {}), ...(buyer.vatNumber.trim() ? { vatNumber: buyer.vatNumber.trim() } : {}), ...(hasAddress ? { address: { street: buyer.street.trim(), building: buyer.building.trim(), district: buyer.district.trim(), city: buyer.city.trim(), postalCode: buyer.postalCode.trim(), country: "SA" } } : {}) };
      if (!operationKey.current) operationKey.current = crypto.randomUUID();
      const result = await invoiceRequest<{ id: string }>("", "POST", { documentType, ...(isTaxMode ? { taxDocument: { ...taxDocument, ...(taxDocument.kind !== "INVOICE" ? { adjustmentReason: taxDocument.adjustmentReason?.trim() } : { originalInvoiceId: undefined, adjustmentReason: undefined, adjustmentEventDate: undefined }) } } : {}), ...((documentType === "PROFORMA" || isTaxMode) && hasBankDetails ? { bankDetails: Object.fromEntries(Object.entries(bankDetails).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)) } : {}), operationKey: operationKey.current, invoiceDate: new Date(`${invoiceDate}+03:00`).toISOString(), buyer: payloadBuyer, paymentCode, accountingApproved: isReviewed,
        ...(selectedContract ? { contractId: selectedContract.id } : {}), transport: transportPayload({ ...transport, contactPhone, notes: bookingNotes(booking, transport) }),
        lines: rows.map(row => ({ ...row.input, code: row.input.code.trim(), description: row.input.description.trim(), discount: row.input.discount || "0", billingUnit: row.input.billingUnit || "TRIP", taxReviewed: isReviewed, ...(row.input.category === "S" ? { exemptionCode: undefined, exemptionReason: undefined } : {}) })),
      });
      if (result.data) router.push(`/admin/invoices/${encodeURIComponent(result.data.id)}`); else showError(result.error || "تعذر حفظ الفاتورة. حاول مرة أخرى.");
    } catch { showError("تعذر حفظ الفاتورة. راجع البيانات وحاول مرة أخرى."); }
    finally { setIsSaving(false); }
  }
  return <div className="mx-auto max-w-[1380px] pb-6" dir="rtl">
    <Link href="/admin/invoices" className="mb-5 inline-flex items-center gap-2 rounded-lg text-xs font-bold text-slate-500 hover:text-amber-700"><ArrowRight className="size-3.5" />الفواتير</Link>
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight">إنشاء {INVOICE_TYPE_LABELS[documentType]}</h1><p className="mt-2 text-sm text-slate-500">تفاصيل الرحلة والضيف والأسعار، في فاتورة واحدة.</p></div><Link href="/admin/invoices" className="rounded-xl border theme-border px-4 py-2.5 text-xs font-bold text-slate-500">إلغاء</Link></header>
    {error && <div ref={errorRegion} tabIndex={-1} role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{error}</span>{!settings && <button type="button" className="font-bold underline" onClick={() => { setIsLoading(true); setReload(value => value + 1); }}>إعادة المحاولة</button>}</div>}
    {isLoading ? <p role="status" className="theme-card animate-pulse rounded-2xl p-8">جارٍ تحميل صفحة الفاتورة…</p> : <form id="invoice-create-form" onSubmit={save} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <fieldset disabled={isSaving || isSourceLoading} className="min-w-0 space-y-5 disabled:opacity-70">
        <>{isTaxMode ? <InvoiceTaxFields value={taxDocument} original={original} onChange={value => { setTaxDocument(value); if (value.kind === "INVOICE") setOriginal(null); setIsReviewed(false); }} onSelectOriginal={id => void selectOriginal(id)} /> : <InvoiceTypeSelector value={documentType} onChange={value => { setDocumentType(value); setIsReviewed(false); }} />}</>
        {!settings?.company && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><p>أضف بيانات شركتك لتظهر في الفاتورة.</p><Link href="/admin/invoices/settings" className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold">بيانات الشركة</Link></div>}
        <section className="theme-card rounded-2xl p-5 sm:p-6">{heading("01", "تفاصيل الحجز", "حدد مسار الرحلة ومواعيدها والمركبة المناسبة.")}<BookingFields booking={booking} transport={transport} vehicles={vehicles} isLoadingVehicles={isLoadingVehicles} vehicleError={vehicleError} onRetryVehicles={() => { setIsLoadingVehicles(true); setVehicleReload(value => value + 1); }} onBookingChange={updateBooking} onTransportChange={updateTransport} /></section>
        <section className="theme-card rounded-2xl p-5 sm:p-6">
          {heading("02", "بيانات الضيف والفاتورة", "أدخل بيانات التواصل والاسم الذي ستصدر به الفاتورة.")}
          <div className="mb-5 border-b theme-border pb-5"><ContractPicker selected={selectedContract} isLoading={isSourceLoading} onSelect={contract => void selectContract(contract)} onClear={clearContract} />{sourceError && <p role="alert" className="mt-3 text-xs text-rose-600">{sourceError} <button type="button" className="font-bold underline" onClick={() => selectedContract ? void selectContract(selectedContract) : setReload(value => value + 1)}>إعادة المحاولة</button></p>}</div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">فاتورة باسم *<input name="customerName" readOnly={Boolean(original)} required maxLength={200} autoComplete="name" placeholder="اسم الفرد أو الشركة" className={INPUT} value={buyer.name} onChange={event => updateBuyer({ name: event.target.value })} /></label><label className="text-sm font-bold">الرقم الضريبي (إن وجد)<input name="customerVat" readOnly={Boolean(original)} inputMode="numeric" pattern="3\d{13}3" maxLength={15} placeholder="15 رقمًا" className={`${INPUT} font-mono`} value={buyer.vatNumber} onChange={event => updateBuyer({ vatNumber: event.target.value })} /></label>
            <label className="text-sm font-bold">اسم الضيف<input required maxLength={160} autoComplete="name" className={INPUT} value={transport.contactName || ""} onChange={event => updateTransport({ contactName: event.target.value })} /></label><InvoicePhoneField value={phone} onChange={value => { setPhone(value); setIsReviewed(false); }} /><label className="text-sm font-bold">البريد الإلكتروني (اختياري)<input type="email" maxLength={160} className={INPUT} value={booking.email} onChange={event => updateBooking({ email: event.target.value })} /></label><label className="text-sm font-bold">عدد الركاب<input required type="number" min={1} max={100} step={1} className={`${INPUT} font-mono`} value={transport.passengerCount ?? ""} onChange={event => updateTransport({ passengerCount: event.target.value ? Number(event.target.value) : undefined })} /></label>
          </div>
          {isTaxMode && <label className="mt-4 block text-sm font-bold">السجل التجاري للمشتري (اختياري)<input readOnly={Boolean(original)} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className={INPUT} value={original ? original.snapshot.input.buyer.identification || "" : buyer.commercialRegistration} onChange={event => updateBuyer({ commercialRegistration: event.target.value })} /></label>}
          <button type="button" aria-expanded={showBuyerDetails} className="mt-4 inline-flex items-center gap-2 py-1 text-xs font-bold text-slate-500" onClick={() => setShowBuyerDetails(!showBuyerDetails)}>{isTaxMode && taxDocument.profile === "STANDARD" ? "العنوان الوطني للمشتري (مطلوب)" : "عنوان العميل (اختياري)"}<ChevronDown className={`size-4 ${showBuyerDetails ? "rotate-180" : ""}`} /></button>
          {showBuyerDetails && <div className="mt-5 grid gap-4 border-t theme-border pt-5 sm:grid-cols-2">{([{ key: "street", label: "الشارع" }, { key: "building", label: "رقم المبنى", pattern: "\\d{4}" }, { key: "district", label: "الحي" }, { key: "city", label: "المدينة" }, { key: "postalCode", label: "الرمز البريدي", pattern: "\\d{5}" }] as const).map(field => <label key={field.key} className="text-xs font-bold text-slate-500">{field.label}<input readOnly={Boolean(original)} maxLength={200} className={INPUT} value={buyer[field.key]} pattern={"pattern" in field ? field.pattern : undefined} onChange={event => updateBuyer({ [field.key]: event.target.value })} /></label>)}</div>}
        </section>
        <section className="theme-card rounded-2xl p-5 sm:p-6">{heading("03", "تفاصيل النقل والملاحظات", "بيانات السائق والمسافة وأي تعليمات خاصة بالرحلة.")}<TransportFields isSupplemental value={transport} hasValidationError={hasTransportError} onChange={value => { setTransport(value); setIsReviewed(false); }} /></section>
        <section className="theme-card rounded-2xl p-5 sm:p-6">{heading("04", "الأسعار والرسوم", "أدخل قيمة الخدمة قبل الضريبة واختر معاملتها الضريبية.")}<div className="space-y-4">{rows.map((row, index) => <InvoiceLineEditor key={row.id} isBooking={index === 0} index={index} value={row.input} canRemove={rows.length > 1 && index > 0} amount={estimate.lines[index]?.gross} onChange={change => updateRow(row.id, change)} onRemove={() => { setRows(current => current.filter(item => item.id !== row.id)); setIsReviewed(false); }} />)}</div><button type="button" disabled={rows.length >= 200} onClick={() => addService()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed theme-border px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-amber-700 disabled:opacity-40"><Plus className="size-4" />إضافة خدمة</button><div className="mt-3 flex flex-wrap gap-2">{["رسوم إضافية", "رسوم نقل نسك"].map(label => <button key={label} type="button" disabled={rows.length >= 200} onClick={() => addService(label)} className="inline-flex items-center gap-1.5 rounded-lg border theme-border px-3 py-2 text-xs font-bold text-slate-500 disabled:opacity-40"><Plus className="size-3.5" />{label}</button>)}</div></section>
        {(documentType === "PROFORMA" || isTaxMode) && <InvoiceBankFields isEnabled={hasBankDetails} value={bankDetails} onToggle={value => { setHasBankDetails(value); setIsReviewed(false); }} onChange={value => { setBankDetails(value); setIsReviewed(false); }} />}
      </fieldset>
      <aside className="min-w-0 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto"><fieldset disabled={isSaving} className="min-w-0 space-y-5">
        <section className="theme-card rounded-2xl p-5"><h2 className="mb-4 text-sm font-bold">بيانات الفاتورة</h2><div className="space-y-4"><label className="block text-xs font-bold text-slate-500">تاريخ الفاتورة (السعودية)<input required type="datetime-local" className={INPUT} value={invoiceDate} onChange={event => { setInvoiceDate(event.target.value); setIsReviewed(false); }} /></label><label className="block text-xs font-bold text-slate-500">طريقة الدفع<select className={INPUT} value={paymentCode} onChange={event => { setPaymentCode(event.target.value); setIsReviewed(false); }}><option value="10">نقدًا</option><option value="30">تحويل</option><option value="42">حساب بنكي</option><option value="48">بطاقة</option></select></label></div></section>
        <section className="overflow-hidden rounded-2xl border theme-border bg-white dark:bg-slate-900"><div className="border-b theme-border px-5 py-4"><h2 className="text-sm font-bold">ملخص {INVOICE_TYPE_LABELS[documentType]}</h2><p className="mt-1 text-xs text-slate-500">{rows.length} خدمة{buyer.name ? ` · ${buyer.name}` : ""}</p></div><dl aria-live="polite" className="space-y-3 px-5 py-4 text-sm">{[["الإجمالي قبل الخصم", beforeDiscount.net], ["الخصم", discountTotal], ["قبل الضريبة", estimate.net], ["ضريبة القيمة المضافة", estimate.vat]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="font-mono" dir="ltr">{amount(value)}</dd></div>)}</dl><div className="mx-4 mb-4 rounded-xl bg-slate-900 px-4 py-4 text-white dark:bg-slate-800"><p className="text-xs text-slate-300">الإجمالي شامل الضريبة</p><div className="mt-1.5 flex items-baseline gap-2"><strong className="font-mono text-3xl tracking-tight" dir="ltr" data-testid="invoice-total">{amount(estimate.gross)}</strong><span className="text-xs text-slate-400">ر.س</span></div></div>{!estimate.isValid && <p className="px-5 pb-4 text-xs leading-relaxed text-slate-500">{estimate.error}</p>}
          <div className="border-t theme-border px-5 py-4"><label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500"><input type="checkbox" required checked={isReviewed} onChange={event => setIsReviewed(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-amber-600" /><span>راجعت بيانات العميل والخدمات والأسعار والضريبة.</span></label><button type="submit" disabled={!canSave} className="gold-gradient-btn mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none">{isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{isSaving ? "جارٍ الحفظ…" : "حفظ الفاتورة"}</button><p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">{isTaxMode ? "يُحفظ المستند محليًا مع QR ضريبي للمرحلة الأولى، دون إرسال للهيئة." : "تُحفظ الفاتورة ويمكن تنزيل نسخة PDF للعميل."}</p></div>
        </section>
        {settings?.company && <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400"><Check className="size-3" />{settings.company.legalName}</p>}<Link href="/admin/invoices/settings" className="flex items-center justify-center gap-1.5 py-1 text-xs text-slate-400"><Settings2 className="size-3.5" />بيانات الشركة</Link>
      </fieldset></aside>
    </form>}
    <p className="mt-6 flex items-center gap-2 text-xs text-slate-400"><Truck className="size-3.5" />تفاصيل الرحلة محفوظة مع الفاتورة · نسخة العميل تعرض عدد الركاب فقط.</p>
  </div>;
}
