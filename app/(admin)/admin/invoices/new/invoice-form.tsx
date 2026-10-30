"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileSpreadsheet,
  HelpCircle,
  Landmark,
  Loader2,
  Plus,
  ReceiptText,
  Save,
  Truck,
  Wallet,
} from "lucide-react";

import InvoiceTypeSelector, { type UnifiedDocChoice } from "./invoice-type-selector";
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
import {
  emptyTransport,
  transportPayload,
  validateTransportDraft,
  type TransportDetails,
  type TransportDefaults,
} from "@/lib/invoice-transport";
import { emptyInvoiceLine, estimateInvoice, saudiDateTimeInput } from "@/lib/invoice-draft";
import {
  INVOICE_TYPE_LABELS,
  invoiceRequest,
  type InvoiceDocumentType,
  type Buyer,
  type InvoiceLineInput,
  type InvoiceSettings,
  type InvoiceDetail,
  type TaxDocument,
} from "@/lib/invoices";
import { accountingRequest } from "@/lib/accounting";

export type FormStage = "DOCUMENT_AND_CUSTOMER" | "TRIP_AND_SERVICE" | "PRICE_AND_TAX" | "PAYMENT_AND_REVIEW";

interface InvoiceFormProps {
  contractId?: string;
  initialDocumentType: InvoiceDocumentType;
  originalInvoiceId?: string;
  noteKind?: TaxDocument["kind"];
}

interface FormLine {
  id: string;
  input: InvoiceLineInput;
}

interface BuyerForm {
  name: string;
  vatNumber: string;
  street: string;
  building: string;
  district: string;
  city: string;
  postalCode: string;
  commercialRegistration: string;
}

const EMPTY_BUYER: BuyerForm = {
  name: "",
  vatNumber: "",
  street: "",
  building: "",
  district: "",
  city: "",
  postalCode: "",
  commercialRegistration: "",
};

const INPUT =
  "theme-input mt-1.5 h-11 w-full min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";

const STAGES: { id: FormStage; number: string; title: string; subtitle: string }[] = [
  { id: "DOCUMENT_AND_CUSTOMER", number: "١", title: "نوع المستند والعميل", subtitle: "اختر نوع المستند وبيانات العميل" },
  { id: "TRIP_AND_SERVICE", number: "٢", title: "مسار الرحلة والخدمة", subtitle: "حدد مسار الرحلة وموعدها والمركبة" },
  { id: "PRICE_AND_TAX", number: "٣", title: "السعر والضريبة", subtitle: "أدخل قيمة الخدمة والمعاملة الضريبية" },
  { id: "PAYMENT_AND_REVIEW", number: "٤", title: "الدفع والمراجعة", subtitle: "هل دفع العميل والمراجعة النهائية" },
];

function difference(before: string, after: string): string {
  const cents = BigInt(before.replace(".", "")) - BigInt(after.replace(".", ""));
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}

function amount(value: string): string {
  const [whole, decimals] = value.split(".");
  return decimals === undefined ? value : `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`;
}

export default function InvoiceForm({
  contractId: initialContractId,
  initialDocumentType,
  originalInvoiceId,
  noteKind = "INVOICE",
}: InvoiceFormProps) {
  const router = useRouter();

  // Active Stepper Stage
  const [currentStage, setCurrentStage] = useState<FormStage>("DOCUMENT_AND_CUSTOMER");

  const [documentType, setDocumentType] = useState<InvoiceDocumentType>(initialDocumentType);
  const [taxDocument, setTaxDocument] = useState<TaxDocument>({
    kind: noteKind,
    profile: "SIMPLIFIED",
    supplyDate: saudiDateTimeInput().slice(0, 10),
    ...(originalInvoiceId ? { originalInvoiceId } : {}),
  });

  const isTaxMode = documentType === "TAX" || taxDocument.kind !== "INVOICE";

  const [original, setOriginal] = useState<InvoiceDetail | null>(null);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState(EMPTY_BANK);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [isReviewed, setIsReviewed] = useState(false);

  // Simplified Payment UX: "هل دفع العميل؟"
  const [paymentStatusChoice, setPaymentStatusChoice] = useState<"NOT_PAID" | "FULLY_PAID" | "PARTIALLY_PAID">("NOT_PAID");
  const [fullPaymentMethod, setFullPaymentMethod] = useState<"BANK_TRANSFER" | "CASH" | "CARD">("BANK_TRANSFER");
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<"BANK_TRANSFER" | "CASH">("BANK_TRANSFER");

  // Show Accountant details (collapsible)
  const [showAccountantDetails, setShowAccountantDetails] = useState(false);

  // Supplemental Trip details (collapsible)
  const [showSupplementalTrip, setShowSupplementalTrip] = useState(false);

  const [buyer, setBuyer] = useState<BuyerForm>(EMPTY_BUYER);
  const [showBuyerDetails, setShowBuyerDetails] = useState(false);

  const [selectedContract, setSelectedContract] = useState<InvoiceContractOption | null>(null);
  const [isSourceLoading, setIsSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");

  const [transport, setTransport] = useState<TransportDetails>(() => ({
    ...emptyTransport(),
    tripDate: saudiDateTimeInput().slice(0, 10),
  }));
  const [hasTransportError, setHasTransportError] = useState(false);

  const [phone, setPhone] = useState(() => invoicePhoneFrom());
  const [revenueAccountCode, setRevenueAccountCode] = useState("4101");
  const [settlementAccountCode, setSettlementAccountCode] = useState("1103");
  const [booking, setBooking] = useState<InvoiceBooking>(emptyBooking);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleReload, setVehicleReload] = useState(0);

  const [rows, setRows] = useState<FormLine[]>([{ id: "line-1", input: emptyInvoiceLine() }]);
  const nextRow = useRef(2);
  const operationKey = useRef("");
  const sourceVersion = useRef(0);
  const errorRegion = useRef<HTMLDivElement>(null);

  // Synchronize settlementAccountCode & paymentCode based on "هل دفع العميل؟"
  const changePaymentStatusChoice = (choice: "NOT_PAID" | "FULLY_PAID" | "PARTIALLY_PAID") => {
    setPaymentStatusChoice(choice);
    if (choice === "NOT_PAID" || choice === "PARTIALLY_PAID") {
      setSettlementAccountCode("1103");
    } else if (choice === "FULLY_PAID") {
      setSettlementAccountCode(fullPaymentMethod === "CASH" ? "1101" : "1102");
    }
  };

  const changeFullPaymentMethod = (method: "BANK_TRANSFER" | "CASH" | "CARD") => {
    setFullPaymentMethod(method);
    if (paymentStatusChoice === "FULLY_PAID") {
      setSettlementAccountCode(method === "CASH" ? "1101" : "1102");
    }
  };

  const paymentCode = useMemo(() => {
    if (paymentStatusChoice === "NOT_PAID") return "30"; // Credit / Transfer
    if (paymentStatusChoice === "FULLY_PAID") {
      if (fullPaymentMethod === "CASH") return "10";
      if (fullPaymentMethod === "CARD") return "48";
      return "42"; // Bank
    }
    return "30";
  }, [paymentStatusChoice, fullPaymentMethod]);

  const applyOriginal = useCallback((invoice: InvoiceDetail) => {
    setOriginal(invoice);
    setBuyer({
      ...EMPTY_BUYER,
      ...invoice.snapshot.input.buyer,
      ...invoice.snapshot.input.buyer.address,
      vatNumber: invoice.snapshot.input.buyer.vatNumber || "",
    });
    setTaxDocument((current) => ({
      ...current,
      originalInvoiceId: invoice.id,
      profile: invoice.snapshot.input.taxDocument?.profile || "SIMPLIFIED",
    }));
    setRows(invoice.snapshot.input.lines.map((input, index) => ({ id: `original-${index}`, input })));
    nextRow.current = invoice.snapshot.input.lines.length + 1;
    if (invoice.snapshot.input.transport) {
      setTransport(invoice.snapshot.input.transport);
      setPhone(invoicePhoneFrom(invoice.snapshot.input.transport.contactPhone));
    }
    setShowBuyerDetails(Boolean(invoice.snapshot.input.buyer.address));
    setIsReviewed(false);
  }, []);

  async function selectOriginal(id: string) {
    if (!id) {
      setOriginal(null);
      setTaxDocument((current) => ({ ...current, originalInvoiceId: undefined }));
      return;
    }
    setIsSourceLoading(true);
    setSourceError("");
    const result = await invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(id)}`);
    if (result.data) {
      applyOriginal(result.data);
    } else {
      setSourceError(result.error || "تعذر تحميل الفاتورة الأصلية");
    }
    setIsSourceLoading(false);
  }

  // Handle Unified Doc Choice
  const handleDocChoice = (choice: UnifiedDocChoice) => {
    setIsReviewed(false);
    if (choice === "CUSTOMER") {
      setDocumentType("BOOKING");
      setTaxDocument((prev) => ({ ...prev, kind: "INVOICE", originalInvoiceId: undefined }));
    } else if (choice === "PROFORMA") {
      setDocumentType("PROFORMA");
      setTaxDocument((prev) => ({ ...prev, kind: "INVOICE", originalInvoiceId: undefined }));
    } else if (choice === "CREDIT_NOTE") {
      setDocumentType("TAX");
      setTaxDocument((prev) => ({ ...prev, kind: "CREDIT" }));
    } else if (choice === "DEBIT_NOTE") {
      setDocumentType("TAX");
      setTaxDocument((prev) => ({ ...prev, kind: "DEBIT" }));
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      invoiceRequest<InvoiceSettings>("/settings"),
      initialContractId
        ? invoiceRequest<TransportDefaults>(`/transport-defaults/${encodeURIComponent(initialContractId)}`)
        : Promise.resolve(null),
      originalInvoiceId
        ? invoiceRequest<InvoiceDetail>(`/${encodeURIComponent(originalInvoiceId)}`)
        : Promise.resolve(null),
    ]).then(([config, linked, originalResult]) => {
      if (!active) return;
      setSettings(config.data || null);
      setBankDetails({ ...EMPTY_BANK, ...config.data?.company?.bankDetails });
      setHasBankDetails(Boolean(config.data?.company?.bankDetails));
      setError(config.error || "");
      setInvoiceDate(saudiDateTimeInput());

      if (linked?.data && initialContractId) {
        const { transport: details, customerName } = linked.data;
        setSelectedContract({
          id: initialContractId,
          referenceNumber: details.contractReference || initialContractId,
          customerName,
          origin: details.origin,
          destination: details.destination,
          tripDate: details.tripDate,
        });
        setBuyer((current) => ({ ...current, name: customerName }));
        setTransport(details);
        setPhone(invoicePhoneFrom(details.contactPhone));
        setRows([
          {
            id: "line-1",
            input: {
              ...emptyInvoiceLine(),
              description: `خدمة نقل من ${details.origin} إلى ${details.destination}`.slice(0, 200),
            },
          },
        ]);
      } else if (initialContractId) {
        setSourceError(linked?.error || "تعذر تحميل العقد المرتبط.");
      }

      if (originalResult?.data) {
        applyOriginal(originalResult.data);
      } else if (originalInvoiceId) {
        setSourceError(originalResult?.error || "تعذر تحميل الفاتورة الأصلية");
      }

      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [initialContractId, originalInvoiceId, reload, applyOriginal]);

  useEffect(() => {
    let active = true;
    void getVehicles().then((result) => {
      if (!active) return;
      setVehicles(result.vehicles || []);
      setVehicleError(result.error || "");
      setIsLoadingVehicles(false);
    });
    return () => {
      active = false;
    };
  }, [vehicleReload]);

  const estimate = estimateInvoice(rows.map((row) => row.input));
  const beforeDiscount = estimateInvoice(rows.map((row) => ({ ...row.input, discount: "0" })));
  const discountTotal =
    estimate.isValid && beforeDiscount.isValid ? difference(beforeDiscount.net, estimate.net) : "—";
  const canSave = Boolean(settings?.company) && !isLoading && !isSaving && !isSourceLoading && !sourceError;

  function updateBuyer(change: Partial<BuyerForm>) {
    setBuyer((current) => ({ ...current, ...change }));
    if (isTaxMode && change.vatNumber !== undefined && !original) {
      setTaxDocument((current) => ({ ...current, profile: change.vatNumber ? "STANDARD" : "SIMPLIFIED" }));
      if (change.vatNumber) setShowBuyerDetails(true);
    }
    setIsReviewed(false);
  }

  function updateRow(id: string, change: Partial<InvoiceLineInput>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, input: { ...row.input, ...change } } : row)));
    setIsReviewed(false);
  }

  function updateBooking(change: Partial<InvoiceBooking>) {
    setBooking((current) => ({ ...current, ...change }));
    setIsReviewed(false);
  }

  function updateTransport(change: Partial<TransportDetails>) {
    setTransport((current) => ({ ...current, ...change }));
    setIsReviewed(false);
  }

  function addService(description = "") {
    const index = nextRow.current++;
    setRows((current) => [...current, { id: `line-${index}`, input: { ...emptyInvoiceLine(index), description } }]);
    setIsReviewed(false);
  }

  async function selectContract(contract: InvoiceContractOption) {
    const version = ++sourceVersion.current;
    setSelectedContract(contract);
    setIsSourceLoading(true);
    setSourceError("");
    setIsReviewed(false);
    const result = await invoiceRequest<TransportDefaults>(`/transport-defaults/${encodeURIComponent(contract.id)}`);
    if (version !== sourceVersion.current) return;
    if (result.data) {
      const { customerName, transport: details } = result.data;
      setBuyer((current) => (current.name === customerName ? current : { ...EMPTY_BUYER, name: customerName }));
      setTransport(details);
      setPhone(invoicePhoneFrom(details.contactPhone));
      setRows((current) =>
        current.length === 1
          ? [
              {
                ...current[0],
                input: {
                  ...current[0].input,
                  description: `خدمة نقل من ${details.origin} إلى ${details.destination}`.slice(0, 200),
                },
              },
            ]
          : current
      );
    } else {
      setSourceError(result.error || "تعذر تحميل تفاصيل العقد.");
    }
    setIsSourceLoading(false);
  }

  function clearContract() {
    sourceVersion.current++;
    setSelectedContract(null);
    setIsSourceLoading(false);
    setSourceError("");
    setTransport((current) => ({ ...current, contractReference: undefined }));
    setIsReviewed(false);
  }

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRegion.current?.focus());
  }

  // Save / Issue Invoice
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setError("");
    setHasTransportError(false);

    if (isTaxMode && taxDocument.kind !== "INVOICE" && (!original || !taxDocument.adjustmentReason?.trim())) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      showError("اختر الفاتورة الأصلية وأدخل سبب إصدار الإشعار في المرحلة الأولى.");
      return;
    }

    if (
      isTaxMode &&
      taxDocument.profile === "STANDARD" &&
      (!buyer.vatNumber ||
        ![buyer.street, buyer.building, buyer.district, buyer.city, buyer.postalCode].every((v) => v.trim()))
    ) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      setShowBuyerDetails(true);
      showError("أكمل الرقم الضريبي والعنوان الوطني للمشتري في المرحلة الأولى.");
      return;
    }

    if (!estimate.isValid) {
      setCurrentStage("PRICE_AND_TAX");
      showError(estimate.error || "راجع قيم الخدمات في المرحلة الثالثة.");
      return;
    }

    const addressParts = [buyer.street, buyer.building, buyer.district, buyer.city, buyer.postalCode];
    const hasAddress = addressParts.some((value) => value.trim());
    if (hasAddress && !addressParts.every((value) => value.trim())) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      setShowBuyerDetails(true);
      showError("أكمل عنوان العميل: الشارع والمبنى والحي والمدينة والرمز البريدي.");
      return;
    }

    const contactPhone = invoicePhoneNumber(phone);
    if (!contactPhone) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      showError("أدخل رقم جوال صحيحًا مع اختيار كود الدولة المناسب في المرحلة الأولى.");
      return;
    }

    const bookingError = validateBooking(booking, transport);
    if (bookingError) {
      setCurrentStage("TRIP_AND_SERVICE");
      showError(bookingError);
      return;
    }

    const transportError = validateTransportDraft(transport);
    if (transportError) {
      setHasTransportError(true);
      setCurrentStage("TRIP_AND_SERVICE");
      showError(transportError);
      return;
    }

    setIsSaving(true);
    try {
      const payloadBuyer: Buyer = original
        ? original.snapshot.input.buyer
        : {
            name: buyer.name.trim(),
            ...(buyer.commercialRegistration.trim()
              ? { identification: buyer.commercialRegistration.trim(), identificationScheme: "CRN" }
              : {}),
            ...(buyer.vatNumber.trim() ? { vatNumber: buyer.vatNumber.trim() } : {}),
            ...(hasAddress
              ? {
                  address: {
                    street: buyer.street.trim(),
                    building: buyer.building.trim(),
                    district: buyer.district.trim(),
                    city: buyer.city.trim(),
                    postalCode: buyer.postalCode.trim(),
                    country: "SA",
                  },
                }
              : {}),
          };

      if (!operationKey.current) operationKey.current = crypto.randomUUID();

      const result = await invoiceRequest<{ id: string }>("", "POST", {
        documentType,
        ...(isTaxMode
          ? {
              taxDocument: {
                ...taxDocument,
                ...(taxDocument.kind !== "INVOICE"
                  ? { adjustmentReason: taxDocument.adjustmentReason?.trim() }
                  : { originalInvoiceId: undefined, adjustmentReason: undefined, adjustmentEventDate: undefined }),
              },
            }
          : {}),
        ...((documentType === "PROFORMA" || isTaxMode) && hasBankDetails
          ? {
              bankDetails: Object.fromEntries(
                Object.entries(bankDetails)
                  .map(([key, value]) => [key, value.trim()])
                  .filter(([, value]) => value)
              ),
            }
          : {}),
        operationKey: operationKey.current,
        invoiceDate: new Date(`${invoiceDate}+03:00`).toISOString(),
        buyer: payloadBuyer,
        paymentCode,
        accountingApproved: isReviewed,
        ...(documentType !== "PROFORMA" ? { accounting: { revenueAccountCode, settlementAccountCode } } : {}),
        ...(selectedContract ? { contractId: selectedContract.id } : {}),
        transport: transportPayload({
          ...transport,
          contactPhone,
          notes: bookingNotes(booking, transport),
        }),
        lines: rows.map((row) => ({
          ...row.input,
          code: row.input.code.trim(),
          description: row.input.description.trim(),
          discount: row.input.discount || "0",
          billingUnit: row.input.billingUnit || "TRIP",
          taxReviewed: isReviewed,
          ...(row.input.category === "S" ? { exemptionCode: undefined, exemptionReason: undefined } : {}),
        })),
      });

      if (result.data) {
        // If partial payment was entered during creation, issue the payment voucher immediately!
        if (
          documentType !== "PROFORMA" &&
          paymentStatusChoice === "PARTIALLY_PAID" &&
          Number(partialPaymentAmount) > 0
        ) {
          try {
            await accountingRequest("/payments", "POST", {
              operationKey: crypto.randomUUID(),
              documentType: "SALE",
              documentId: result.data.id,
              amount: Number(partialPaymentAmount).toFixed(2),
              paymentDate: invoiceDate.slice(0, 10),
              cashAccount: partialPaymentMethod === "CASH" ? "1101" : "1102",
              reference: `دفعة أولى مستلمة عند إصدار الفاتورة #${result.data.id.slice(0, 8)}`,
            });
          } catch (payErr) {
            console.error("Failed to post initial partial payment voucher:", payErr);
          }
        }

        router.push(`/admin/invoices/${encodeURIComponent(result.data.id)}`);
      } else {
        showError(result.error || "تعذر حفظ الفاتورة. حاول مرة أخرى.");
      }
    } catch {
      showError("تعذر حفظ الفاتورة. راجع البيانات وحاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  // Calculate Remaining Balance for Stage 4
  const totalAmountNum = Number(estimate.gross || "0");
  const partialAmountNum = Number(partialPaymentAmount || "0");
  const remainingBalance =
    paymentStatusChoice === "FULLY_PAID"
      ? "0.00"
      : paymentStatusChoice === "PARTIALLY_PAID"
        ? (Math.max(0, totalAmountNum - partialAmountNum)).toFixed(2)
        : estimate.gross;

  return (
    <div className="mx-auto max-w-[1380px] pb-12" dir="rtl">
      {/* Top Breadcrumb & Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 rounded-xl border theme-border px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-amber-500 transition"
        >
          <ArrowRight className="size-3.5" />
          <span>العودة لسجل الفواتير</span>
        </Link>
        <Link
          href="/admin/invoices"
          className="rounded-xl border theme-border px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition"
        >
          إلغاء الأمر
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ReceiptText className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              إنشاء {documentType === "PROFORMA" ? "فاتورة مبدئية (عرض أسعار)" : INVOICE_TYPE_LABELS[documentType]}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              أدخل بيانات المستند في ٤ خطوات واضحة وميسرة دون تعقيد محاسبي
            </p>
          </div>
        </div>
      </header>

      {/* 4-Stage Interactive Stepper Header */}
      <nav aria-label="مراحل إنشاء الفاتورة" className="mb-6 theme-card rounded-2xl border theme-border p-2 sm:p-3 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STAGES.map((st, idx) => {
            const isCurrent = currentStage === st.id;
            const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
            const isCompleted = idx < currentIndex;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setCurrentStage(st.id)}
                className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl text-right transition cursor-pointer select-none ${
                  isCurrent
                    ? "bg-amber-500/15 border border-amber-500/40 ring-1 ring-amber-500/30 text-amber-900 dark:text-amber-200"
                    : isCompleted
                      ? "bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/10"
                      : "theme-card border theme-border text-slate-500 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div
                  className={`size-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isCurrent
                      ? "bg-amber-500 text-white"
                      : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="size-3.5" /> : st.number}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-black truncate ${isCurrent ? "text-amber-700 dark:text-amber-300" : ""}`}>
                    {st.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                    {st.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Global Error Banner */}
      {error && (
        <div
          ref={errorRegion}
          tabIndex={-1}
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-300 shadow-xs"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
          <span className="flex-1">{error}</span>
          {!settings && (
            <button
              type="button"
              className="underline"
              onClick={() => {
                setIsLoading(true);
                setReload((v) => v + 1);
              }}
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div role="status" className="theme-card animate-pulse rounded-2xl p-12 text-center text-slate-400 text-xs sm:text-sm">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-amber-500" />
          <span>جارٍ تجهيز شاشة الفاتورة…</span>
        </div>
      ) : (
        <form id="invoice-create-form" onSubmit={save} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main Stepper Stages Area */}
          <fieldset disabled={isSaving || isSourceLoading} className="min-w-0 space-y-6 disabled:opacity-75">
            {/* =========================================================================
                المرحلة الأولى: نوع المستند والعميل (§5 المرحلة الأولى)
               ========================================================================= */}
            {currentStage === "DOCUMENT_AND_CUSTOMER" && (
              <div className="space-y-6">
                {/* 1a. Unified Document Selector */}
                <InvoiceTypeSelector
                  documentType={documentType}
                  taxKind={taxDocument.kind}
                  onChangeType={handleDocChoice}
                />

                {/* 1b. If Credit or Debit Note, choose Original Invoice and Reason */}
                {isTaxMode && taxDocument.kind !== "INVOICE" && (
                  <section className="theme-card rounded-2xl p-5 sm:p-6 border border-amber-500/30 bg-amber-500/[0.03]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs font-black">
                        ربط الفاتورة الأصلية للإشعار
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                      يُشترط نظاماً ربط الإشعار برقم الفاتورة الصادرة سابقاً. سيتم نسخ بيانات العميل والمسار والضريبة تلقائياً.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-bold sm:col-span-2">
                        اختر الفاتورة الأصلية *
                        <input
                          className={INPUT}
                          placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                          onChange={(e) => void selectOriginal(e.target.value)}
                        />
                      </label>
                      <label className="text-xs font-bold sm:col-span-2">
                        سبب إصدار هذا الإشعار بالعربية *
                        <input
                          required
                          maxLength={200}
                          className={INPUT}
                          placeholder={
                            taxDocument.kind === "CREDIT"
                              ? "مثال: خصم تجاري ممنوح أو إلغاء رحلة جزئياً"
                              : "مثال: رسوم جولة إضافية وتمديد ساعات الخدمة"
                          }
                          value={taxDocument.adjustmentReason || ""}
                          onChange={(e) => setTaxDocument({ ...taxDocument, adjustmentReason: e.target.value })}
                        />
                      </label>
                    </div>
                  </section>
                )}

                {/* 1c. Fast Import: Use Existing Contract */}
                <section className="theme-card rounded-2xl p-5 sm:p-6 border theme-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-4 mb-4">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        بيانات العميل والفاتورة
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        اختر العقد لاستيراد كافة بيانات الرحلة والعميل بضغطة زر، أو أدخلها يدوياً
                      </p>
                    </div>
                  </div>

                  {/* Contract Picker */}
                  <div className="mb-5 pb-5 border-b theme-border">
                    <ContractPicker
                      selected={selectedContract}
                      isLoading={isSourceLoading}
                      onSelect={(c) => void selectContract(c)}
                      onClear={clearContract}
                    />
                    {sourceError && (
                      <p role="alert" className="mt-2 text-xs font-bold text-rose-600">
                        {sourceError}
                      </p>
                    )}
                  </div>

                  {/* Customer Information Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      الفاتورة باسم (العميل أو المنشأة) *
                      <input
                        name="customerName"
                        readOnly={Boolean(original)}
                        required
                        maxLength={200}
                        autoComplete="name"
                        placeholder="اسم الفرد، الفندق، أو الشركة"
                        className={INPUT}
                        value={buyer.name}
                        onChange={(e) => updateBuyer({ name: e.target.value })}
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      الرقم الضريبي للمشتري (للمنشآت B2B)
                      <input
                        name="customerVat"
                        readOnly={Boolean(original)}
                        inputMode="numeric"
                        pattern="3\d{13}3"
                        maxLength={15}
                        placeholder="3xxxxxxxxxxxxxx3 (15 رقماً)"
                        className={`${INPUT} font-mono`}
                        value={buyer.vatNumber}
                        onChange={(e) => updateBuyer({ vatNumber: e.target.value })}
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      اسم الضيف أو مسؤول المجموعة (اختياري)
                      <input
                        maxLength={160}
                        autoComplete="name"
                        placeholder="إذا كان مختلفاً عن صاحب الفاتورة"
                        className={INPUT}
                        value={transport.contactName || ""}
                        onChange={(e) => updateTransport({ contactName: e.target.value })}
                      />
                    </label>

                    {/* Phone with Country Code */}
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        رقم الجوال للتواصل والفاتورة *
                      </span>
                      <InvoicePhoneField
                        value={phone}
                        onChange={(v) => {
                          setPhone(v);
                          setIsReviewed(false);
                        }}
                      />
                    </div>

                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      البريد الإلكتروني (اختياري)
                      <input
                        type="email"
                        maxLength={160}
                        placeholder="customer@example.com"
                        className={INPUT}
                        value={booking.email}
                        onChange={(e) => updateBooking({ email: e.target.value })}
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      عدد الركاب في الرحلة *
                      <input
                        required
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        placeholder="مثال: 4 ركاب"
                        className={`${INPUT} font-mono`}
                        value={transport.passengerCount ?? ""}
                        onChange={(e) =>
                          updateTransport({
                            passengerCount: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </label>
                  </div>

                  {/* Commercial Registration if entered */}
                  {isTaxMode && (
                    <label className="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      رقم السجل التجاري للعميل (اختياري)
                      <input
                        readOnly={Boolean(original)}
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        placeholder="10 أرقام"
                        className={`${INPUT} font-mono`}
                        value={
                          original
                            ? original.snapshot.input.buyer.identification || ""
                            : buyer.commercialRegistration
                        }
                        onChange={(e) => updateBuyer({ commercialRegistration: e.target.value })}
                      />
                    </label>
                  )}

                  {/* National Address: auto-opened if B2B/VAT or toggleable */}
                  <div className="mt-4 pt-3 border-t theme-border">
                    <button
                      type="button"
                      aria-expanded={showBuyerDetails}
                      className="inline-flex items-center gap-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-amber-600 transition cursor-pointer"
                      onClick={() => setShowBuyerDetails(!showBuyerDetails)}
                    >
                      <span>
                        {buyer.vatNumber
                          ? "العنوان الوطني للمشتري (مطلوب للفواتير الضريبية B2B)"
                          : "عنوان العميل الوطني (اختياري)"}
                      </span>
                      <ChevronDown className={`size-3.5 transition-transform ${showBuyerDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showBuyerDetails && (
                      <div className="mt-3 grid gap-3 border theme-border rounded-xl p-3.5 sm:grid-cols-2 bg-slate-50/50 dark:bg-slate-900/20">
                        {([
                          { key: "street", label: "اسم الشارع" },
                          { key: "building", label: "رقم المبنى (٤ أرقام)", pattern: "\\d{4}" },
                          { key: "district", label: "الحي" },
                          { key: "city", label: "المدينة" },
                          { key: "postalCode", label: "الرمز البريدي (٥ أرقام)", pattern: "\\d{5}" },
                        ] as const).map((field) => (
                          <label key={field.key} className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {field.label}
                            <input
                              readOnly={Boolean(original)}
                              maxLength={200}
                              className={INPUT}
                              value={buyer[field.key]}
                              pattern={"pattern" in field ? field.pattern : undefined}
                              onChange={(e) => updateBuyer({ [field.key]: e.target.value })}
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* Stage 1 Footer Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStage("TRIP_AND_SERVICE")}
                    className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-black cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    <span>المتابعة: مسار الرحلة والخدمة</span>
                    <ArrowLeft className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                المرحلة الثانية: الرحلة والخدمة (§5 المرحلة الثانية)
               ========================================================================= */}
            {currentStage === "TRIP_AND_SERVICE" && (
              <div className="space-y-6">
                <section className="theme-card rounded-2xl p-5 sm:p-6 border theme-border">
                  <div className="border-b theme-border pb-4 mb-5">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      مسار الرحلة ومواعيدها
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      حدد نوع الرحلة، محطة الانطلاق، وجهة الوصول، والتاريخ
                    </p>
                  </div>

                  {/* Booking Fields Component (handles roundtrip, hourly, stops) */}
                  <BookingFields
                    booking={booking}
                    transport={transport}
                    vehicles={vehicles}
                    isLoadingVehicles={isLoadingVehicles}
                    vehicleError={vehicleError}
                    onRetryVehicles={() => {
                      setIsLoadingVehicles(true);
                      setVehicleReload((v) => v + 1);
                    }}
                    onBookingChange={updateBooking}
                    onTransportChange={updateTransport}
                  />

                  {/* Informative Passengers Notice (§5 المرحلة الثانية) */}
                  <div className="mt-5 rounded-xl border border-blue-500/25 bg-blue-500/[0.04] p-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <HelpCircle className="size-4 text-blue-500 shrink-0" />
                    <span>
                      ملاحظة: تظهر في نسخة العميل المطبوعة أعداد الركاب الإجمالية؛ تفاصيل الأسماء والهويات تُراجع من سجل العقد والرحلة.
                    </span>
                  </div>
                </section>

                {/* Collapsible Supplemental Details: Driver, Odometer, Distance */}
                <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                  <button
                    type="button"
                    onClick={() => setShowSupplementalTrip(!showSupplementalTrip)}
                    className="flex w-full items-center justify-between text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="size-4 text-amber-500" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          تفاصيل الرحلة التشغيلية الإضافية (اختياري)
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          بيانات السائق، قراءة العداد، المسافة المقطوعة، وملاحظات التشغيل
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`size-4 text-slate-400 transition-transform ${showSupplementalTrip ? "rotate-180" : ""}`} />
                  </button>

                  {showSupplementalTrip && (
                    <div className="mt-4 pt-4 border-t theme-border">
                      <TransportFields
                        isSupplemental
                        value={transport}
                        hasValidationError={hasTransportError}
                        onChange={(v) => {
                          setTransport(v);
                          setIsReviewed(false);
                        }}
                      />
                    </div>
                  )}
                </section>

                {/* Stage 2 Stepper Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStage("DOCUMENT_AND_CUSTOMER")}
                    className="theme-card inline-flex items-center gap-2 rounded-xl border theme-border hover:border-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <ArrowRight className="size-4" />
                    <span>السابق</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStage("PRICE_AND_TAX")}
                    className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-black cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    <span>المتابعة: السعر والضريبة</span>
                    <ArrowLeft className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                المرحلة الثالثة: السعر والضريبة (§5 المرحلة الثالثة)
               ========================================================================= */}
            {currentStage === "PRICE_AND_TAX" && (
              <div className="space-y-6">
                <section className="theme-card rounded-2xl p-5 sm:p-6 border theme-border">
                  <div className="border-b theme-border pb-4 mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        الخدمات والأسعار والمعاملة الضريبية
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        أدخل تفاصيل الخدمات، ويمكنك كتابة السعر قبل الضريبة أو السعر الإجمالي شامل 15%
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                      مثال: خدمة ٣٠٠ ر.س + ضريبة ٤٥ ر.س = ٣٤٥ ر.س إجمالي
                    </div>
                  </div>

                  {/* Line Items Editor */}
                  <div className="space-y-4">
                    {rows.map((row, index) => (
                      <InvoiceLineEditor
                        key={row.id}
                        isBooking={index === 0}
                        index={index}
                        value={row.input}
                        canRemove={rows.length > 1 && index > 0}
                        amount={estimate.lines[index]?.gross}
                        onChange={(change) => updateRow(row.id, change)}
                        onRemove={() => {
                          setRows((current) => current.filter((item) => item.id !== row.id));
                          setIsReviewed(false);
                        }}
                      />
                    ))}
                  </div>

                  {/* Add Service Buttons */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t theme-border">
                    <button
                      type="button"
                      disabled={rows.length >= 200}
                      onClick={() => addService()}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-black text-amber-800 dark:text-amber-300 transition cursor-pointer"
                    >
                      <Plus className="size-4" />
                      <span>إضافة خدمة جديدة</span>
                    </button>
                    {["رسوم نقل إضافية", "جولة سياحية وزيارات", "رسوم انتظار"].map((label) => (
                      <button
                        key={label}
                        type="button"
                        disabled={rows.length >= 200}
                        onClick={() => addService(label)}
                        className="inline-flex items-center gap-1.5 rounded-lg border theme-border px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                      >
                        <Plus className="size-3" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Company Bank Details on Document (if proforma or tax) */}
                {(documentType === "PROFORMA" || isTaxMode) && (
                  <InvoiceBankFields
                    isEnabled={hasBankDetails}
                    value={bankDetails}
                    onToggle={(v) => {
                      setHasBankDetails(v);
                      setIsReviewed(false);
                    }}
                    onChange={(v) => {
                      setBankDetails(v);
                      setIsReviewed(false);
                    }}
                  />
                )}

                {/* Stage 3 Stepper Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStage("TRIP_AND_SERVICE")}
                    className="theme-card inline-flex items-center gap-2 rounded-xl border theme-border hover:border-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <ArrowRight className="size-4" />
                    <span>السابق</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStage("PAYMENT_AND_REVIEW")}
                    className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-black cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    <span>المتابعة: الدفع والمراجعة</span>
                    <ArrowLeft className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                المرحلة الرابعة: الدفع والمراجعة (§5 المرحلة الرابعة)
               ========================================================================= */}
            {currentStage === "PAYMENT_AND_REVIEW" && (
              <div className="space-y-6">
                {/* 4a. The User Question: "هل دفع العميل؟" */}
                {documentType !== "PROFORMA" ? (
                  <section className="theme-card rounded-2xl p-5 sm:p-6 border theme-border">
                    <div className="border-b theme-border pb-4 mb-5">
                      <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Wallet className="size-5 text-amber-500" />
                        <span>هل دفع العميل قيمة الفاتورة؟</span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        حدد حالة تحصيل المبلغ الفعلي لتسجيل الدفعة وتوجيه القيود بدقة
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* NOT PAID (آجل) */}
                      <label
                        className={`p-4 rounded-xl border cursor-pointer transition text-right ${
                          paymentStatusChoice === "NOT_PAID"
                            ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30"
                            : "theme-card theme-border hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentStatusChoice"
                          value="NOT_PAID"
                          checked={paymentStatusChoice === "NOT_PAID"}
                          onChange={() => changePaymentStatusChoice("NOT_PAID")}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">لم يدفع بعد (آجل)</span>
                          <span className="size-4 rounded-full border border-amber-500 flex items-center justify-center">
                            {paymentStatusChoice === "NOT_PAID" && <span className="size-2 rounded-full bg-amber-500" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          تُسجل الفاتورة على ذمة العميل وتظهر في قائمة المتبقي لمتابعتها لاحقاً.
                        </p>
                      </label>

                      {/* FULLY PAID */}
                      <label
                        className={`p-4 rounded-xl border cursor-pointer transition text-right ${
                          paymentStatusChoice === "FULLY_PAID"
                            ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                            : "theme-card theme-border hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentStatusChoice"
                          value="FULLY_PAID"
                          checked={paymentStatusChoice === "FULLY_PAID"}
                          onChange={() => changePaymentStatusChoice("FULLY_PAID")}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">دفع المبلغ كاملاً</span>
                          <span className="size-4 rounded-full border border-emerald-500 flex items-center justify-center">
                            {paymentStatusChoice === "FULLY_PAID" && <span className="size-2 rounded-full bg-emerald-500" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          تم استلام كامل قيمة الفاتورة وتغذية حساب البنك أو الصندوق.
                        </p>
                      </label>

                      {/* PARTIALLY PAID */}
                      <label
                        className={`p-4 rounded-xl border cursor-pointer transition text-right ${
                          paymentStatusChoice === "PARTIALLY_PAID"
                            ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
                            : "theme-card theme-border hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentStatusChoice"
                          value="PARTIALLY_PAID"
                          checked={paymentStatusChoice === "PARTIALLY_PAID"}
                          onChange={() => changePaymentStatusChoice("PARTIALLY_PAID")}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">دفع جزءاً من المبلغ</span>
                          <span className="size-4 rounded-full border border-blue-500 flex items-center justify-center">
                            {paymentStatusChoice === "PARTIALLY_PAID" && <span className="size-2 rounded-full bg-blue-500" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          تسجيل دفعة مقدمة الآن مع بقاء الرصيد المتبقي للمتابعة.
                        </p>
                      </label>
                    </div>

                    {/* If FULLY PAID: choose bank or cash */}
                    {paymentStatusChoice === "FULLY_PAID" && (
                      <div className="mt-5 pt-4 border-t theme-border space-y-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          كيف استلمت المبلغ من العميل؟
                        </span>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${fullPaymentMethod === "BANK_TRANSFER" ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300" : "theme-border"}`}>
                            <input
                              type="radio"
                              name="fullPaymentMethod"
                              checked={fullPaymentMethod === "BANK_TRANSFER"}
                              onChange={() => changeFullPaymentMethod("BANK_TRANSFER")}
                              className="size-3.5 accent-amber-600"
                            />
                            <Landmark className="size-4" />
                            <span>تحويل بنكي (البنك الأهلي SNB)</span>
                          </label>
                          <label className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${fullPaymentMethod === "CASH" ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300" : "theme-border"}`}>
                            <input
                              type="radio"
                              name="fullPaymentMethod"
                              checked={fullPaymentMethod === "CASH"}
                              onChange={() => changeFullPaymentMethod("CASH")}
                              className="size-3.5 accent-amber-600"
                            />
                            <Wallet className="size-4" />
                            <span>نقداً بالصندوق</span>
                          </label>
                          <label className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${fullPaymentMethod === "CARD" ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300" : "theme-border"}`}>
                            <input
                              type="radio"
                              name="fullPaymentMethod"
                              checked={fullPaymentMethod === "CARD"}
                              onChange={() => changeFullPaymentMethod("CARD")}
                              className="size-3.5 accent-amber-600"
                            />
                            <CreditCard className="size-4" />
                            <span>بطاقة مدى / دفع إلكتروني</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* If PARTIALLY PAID: input partial amount & method */}
                    {paymentStatusChoice === "PARTIALLY_PAID" && (
                      <div className="mt-5 pt-4 border-t theme-border grid gap-4 sm:grid-cols-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          المبلغ المدفوع مقدماً الآن (ر.س) *
                          <input
                            required
                            type="number"
                            min="0.01"
                            max={estimate.gross}
                            step="0.01"
                            placeholder="0.00"
                            className={`${INPUT} font-mono`}
                            value={partialPaymentAmount}
                            onChange={(e) => setPartialPaymentAmount(e.target.value)}
                          />
                        </label>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          طريقة استلام الدفعة الأولى
                          <select
                            className={INPUT}
                            value={partialPaymentMethod}
                            onChange={(e) => setPartialPaymentMethod(e.target.value as "BANK_TRANSFER" | "CASH")}
                          >
                            <option value="BANK_TRANSFER">تحويل بنكي / الحساب البنكي SNB</option>
                            <option value="CASH">نقداً في الصندوق</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="theme-card rounded-2xl p-5 border border-blue-500/30 bg-blue-500/[0.03]">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs">
                      <FileSpreadsheet className="size-4" />
                      <span>فاتورة مبدئية (عرض أسعار)</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      الفاتورة المبدئية هي عرض سعر مبدئي لا يتطلب تسوية أو تحصيل في هذه المرحلة. يتم تأكيد الدفع عند إصدار الفاتورة الفعلية للعميل.
                    </p>
                  </section>
                )}

                {/* 4b. Collapsible "تفاصيل للمحاسب (تلقائية)" (§5 المرحلة الرابعة) */}
                {documentType !== "PROFORMA" && (
                  <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                    <button
                      type="button"
                      onClick={() => setShowAccountantDetails(!showAccountantDetails)}
                      className="flex w-full items-center justify-between text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Landmark className="size-4 text-slate-400" />
                        <div>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            تفاصيل التوجيه المحاسبي (تلقائية ومخصصة للمحاسب)
                          </span>
                          <p className="text-[11px] text-slate-400">
                            حساب الإيراد ({revenueAccountCode}) وحساب التسوية ({settlementAccountCode})
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`size-4 text-slate-400 transition-transform ${showAccountantDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showAccountantDetails && (
                      <div className="mt-4 pt-4 border-t theme-border grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-bold text-slate-500">
                          حساب الإيراد
                          <select
                            className={INPUT}
                            value={revenueAccountCode}
                            onChange={(e) => {
                              setRevenueAccountCode(e.target.value);
                              setIsReviewed(false);
                            }}
                          >
                            <option value="4101">4101 · إيرادات خدمات النقل والمطارات</option>
                            <option value="4102">4102 · إيرادات كبار الشخصيات والعمرة والزيارة</option>
                            <option value="4103">4103 · إيرادات النقل الصفرية أو المعفاة</option>
                          </select>
                        </label>
                        <label className="block text-xs font-bold text-slate-500">
                          حساب التسوية المالية
                          <select
                            className={INPUT}
                            value={settlementAccountCode}
                            onChange={(e) => {
                              setSettlementAccountCode(e.target.value);
                              setIsReviewed(false);
                            }}
                          >
                            <option value="1103">1103 · ذمم العملاء (آجل)</option>
                            <option value="1102">1102 · البنك الأهلي السعودي - SNB</option>
                            <option value="1101">1101 · النقدية بالصندوق</option>
                          </select>
                        </label>
                        <p className="sm:col-span-2 text-[11px] text-slate-400 leading-relaxed">
                          يوجه النظام القيود تلقائياً بناءً على إجابتك في سؤال «هل دفع العميل؟». يمكنك تغيير الحساب هنا للمحاسبة المتقدمة فقط.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* 4c. Pre-Issuance Summary & Review Card (§5 المرحلة الرابعة) */}
                <section className="theme-card rounded-2xl p-5 sm:p-6 border theme-border">
                  <div className="border-b theme-border pb-4 mb-4">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      مراجعة بيانات المستند قبل الإصدار
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تأكد من صحة المبالغ والمسار قبل الضغط على زر الإصدار
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border theme-border">
                      <span className="text-slate-400 block mb-1">العميل والمستند:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{buyer.name || "—"}</p>
                      {phone.number && (
                        <p className="text-slate-400 font-mono mt-0.5">{phone.number}</p>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border theme-border">
                      <span className="text-slate-400 block mb-1">مسار وموعد الرحلة:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100">
                        {transport.origin || "—"} ← {transport.destination || "—"}
                      </p>
                      <p className="text-slate-400 font-mono mt-0.5">{transport.tripDate || "—"}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border theme-border">
                      <span className="text-slate-400 block mb-1">تاريخ ووقت الفاتورة:</span>
                      <input
                        required
                        type="datetime-local"
                        className={`${INPUT} font-mono`}
                        value={invoiceDate}
                        onChange={(e) => {
                          setInvoiceDate(e.target.value);
                          setIsReviewed(false);
                        }}
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border theme-border">
                      <span className="text-slate-400 block mb-1">حالة السداد والمتبقي:</span>
                      <p className="font-black font-mono text-sm">
                        {paymentStatusChoice === "FULLY_PAID" ? (
                          <span className="text-emerald-600 dark:text-emerald-400">مدفوع بالكامل (٠.٠٠ متبقي)</span>
                        ) : paymentStatusChoice === "PARTIALLY_PAID" ? (
                          <span className="text-blue-600 dark:text-blue-400">
                            مدفوع: {partialPaymentAmount || "0"} ر.س · متبقي: {remainingBalance} ر.س
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">آجل بالكامل (المتبقي: {estimate.gross} ر.س)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Review Checkbox */}
                  <div className="mt-5 pt-4 border-t theme-border">
                    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={isReviewed}
                        onChange={(e) => setIsReviewed(e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-amber-600 cursor-pointer"
                      />
                      <span>أقر بأنني راجعت بيانات العميل والرحلة والأسعار والضريبة وهي صحيحة ومعتمدة للإصدار.</span>
                    </label>
                  </div>
                </section>

                {/* Stage 4 Stepper Navigation & Primary Save Button */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStage("PRICE_AND_TAX")}
                    className="theme-card inline-flex items-center gap-2 rounded-xl border theme-border hover:border-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <ArrowRight className="size-4" />
                    <span>السابق</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!canSave || !isReviewed}
                    className="gold-gradient-btn flex min-h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm sm:text-base font-black transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    <span>
                      {isSaving
                        ? "جارٍ الإصدار والحفظ…"
                        : documentType === "PROFORMA"
                          ? "حفظ الفاتورة المبدئية"
                          : "إصدار الفاتورة وتوليد PDF"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </fieldset>

          {/* Sticky Financial Summary Sidebar on Desktop */}
          <aside className="min-w-0 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
            <fieldset disabled={isSaving} className="min-w-0 space-y-4">
              <section className="overflow-hidden rounded-2xl border theme-border bg-white dark:bg-slate-900 shadow-xs">
                <div className="border-b theme-border px-5 py-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">ملخص المستند</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {rows.length} {rows.length === 1 ? "خدمة" : "خدمات"}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                    {documentType === "PROFORMA" ? "فاتورة مبدئية" : INVOICE_TYPE_LABELS[documentType]}
                  </h3>
                  {buyer.name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      العميل: {buyer.name}
                    </p>
                  )}
                </div>

                <dl aria-live="polite" className="space-y-3 px-5 py-4 text-xs">
                  {[
                    ["الإجمالي قبل الخصم", beforeDiscount.net],
                    ["قيمة الخصم", discountTotal],
                    ["المبلغ قبل الضريبة", estimate.net],
                    ["ضريبة القيمة المضافة (15%)", estimate.vat],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                      <dd className="font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                        {amount(val)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Big Total Box */}
                <div className="mx-4 mb-4 rounded-xl bg-slate-950 p-4 text-white dark:bg-slate-800/90 border border-slate-800">
                  <p className="text-[11px] text-slate-400 font-bold">الإجمالي المطلوب شامل الضريبة</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <strong className="font-mono text-3xl font-black tracking-tight" dir="ltr" data-testid="invoice-total">
                      {amount(estimate.gross)}
                    </strong>
                    <span className="text-xs font-bold text-amber-400">ر.س</span>
                  </div>
                </div>

                {/* Remaining Amount Box if Partial or Not Paid */}
                {paymentStatusChoice !== "FULLY_PAID" && (
                  <div className="mx-4 mb-4 rounded-xl bg-amber-500/10 p-3 text-xs border border-amber-500/20">
                    <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-bold">
                      <span>المبلغ المتبقي:</span>
                      <span className="font-mono font-black" dir="ltr">
                        {amount(remainingBalance)} ر.س
                      </span>
                    </div>
                  </div>
                )}

                {!estimate.isValid && (
                  <p className="px-5 pb-4 text-xs leading-relaxed text-rose-600 dark:text-rose-400 font-bold">
                    {estimate.error}
                  </p>
                )}
              </section>

              {settings?.company && (
                <div className="rounded-xl border theme-border p-3 text-center text-xs text-slate-500">
                  <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>{settings.company.legalName}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    الرقم الضريبي: {settings.company.vatNumber}
                  </p>
                </div>
              )}
            </fieldset>
          </aside>
        </form>
      )}

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <Truck className="size-3.5" />
        <span>تفاصيل الرحلة والمسار محفوظة مع الفاتورة · نسخة العميل المطبوعة تعرض أعداد الركاب فقط.</span>
      </p>
    </div>
  );
}
