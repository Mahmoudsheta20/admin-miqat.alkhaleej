"use client";
import { useUiText } from "@/lib/ui-text";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import CustomerPicker from "@/app/_components/commercial/customer-picker";
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
  FileText,
  HelpCircle,
  Landmark,
  Loader2,
  Plus,
  ReceiptText,
  Save,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import InvoiceTypeSelector, {
  type UnifiedDocChoice,
} from "./invoice-type-selector";
import InvoiceBankFields, {
  EMPTY_BANK,
} from "@/app/_components/InvoiceBankFields";
import InvoicePhoneField from "./invoice-phone-field";
import { invoicePhoneFrom, invoicePhoneNumber } from "@/lib/invoice-phone";
import BookingFields from "./booking-fields";
import ContractPicker, { type InvoiceContractOption } from "./contract-picker";
import InvoiceLineEditor from "./invoice-line-editor";
import TransportFields from "./transport-fields";
import {
  bookingNotes,
  emptyBooking,
  validateBooking,
  type InvoiceBooking,
} from "@/lib/invoice-booking";
import { getVehicles } from "@/app/_actions/fleet";
import type { Vehicle } from "@/lib/types";
import {
  emptyTransport,
  transportPayload,
  validateTransportDraft,
  type TransportDetails,
  type TransportDefaults,
} from "@/lib/invoice-transport";
import {
  emptyInvoiceLine,
  estimateInvoice,
  saudiDateTimeInput,
} from "@/lib/invoice-draft";
import {
  hasCompleteBankDetails,
  sanitizeBankForm,
  validateStage1Fields,
  validateStage2Fields,
  validateStage3Fields,
} from "@/lib/invoice-validation";
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
import { moneyDecimal, moneyMinor } from "@/lib/money";
import { MobileStickyActionBar } from "@/app/_components/mobile";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
import AutoSendWhatsAppCard from "@/app/_components/AutoSendWhatsAppCard";
import {
  fetchWhatsAppFlowOverview,
  fetchWhatsAppStatus,
  type WhatsAppAutoSendResult,
} from "@/lib/whatsapp";

interface OriginalInvoiceOption {
  id: string;
  invoiceNumber: string;
  customerName: string;
}

export type FormStage =
  | "DOCUMENT_AND_CUSTOMER"
  | "TRIP_AND_SERVICE"
  | "PRICE_AND_TAX"
  | "PAYMENT_AND_REVIEW";

interface InvoiceFormProps {
  contractId?: string;
  initialDocumentType: InvoiceDocumentType;
  originalInvoiceId?: string;
  noteKind?: TaxDocument["kind"];
  inModal?: boolean;
  onClose?: () => void;
  onCreated?: (invoiceId: string) => void;
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

const INLINE_INPUT =
  "theme-input min-h-11 sm:min-h-9 w-full min-w-0 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";
const INPUT = `mt-1.5 ${INLINE_INPUT}`;

const STAGES: {
  id: FormStage;
  number: string;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "DOCUMENT_AND_CUSTOMER",
    number: "١",
    title: "نوع المستند والعميل",
    subtitle: "اختر نوع المستند وبيانات العميل",
  },
  {
    id: "TRIP_AND_SERVICE",
    number: "٢",
    title: "مسار الرحلة والخدمة",
    subtitle: "حدد مسار الرحلة وموعدها والمركبة",
  },
  {
    id: "PRICE_AND_TAX",
    number: "٣",
    title: "السعر والضريبة",
    subtitle: "أدخل قيمة الخدمة والمعاملة الضريبية",
  },
  {
    id: "PAYMENT_AND_REVIEW",
    number: "٤",
    title: "الدفع والمراجعة",
    subtitle: "هل دفع العميل والمراجعة النهائية",
  },
];

function difference(before: string, after: string): string {
  const beforeMinor = moneyMinor(before);
  const afterMinor = moneyMinor(after);
  if (beforeMinor === null || afterMinor === null) return "—";
  const diff = beforeMinor - afterMinor;
  return moneyDecimal(diff < BigInt(0) ? BigInt(0) : diff);
}

function amount(value: string): string {
  const [whole, decimals] = value.split(".");
  return decimals === undefined
    ? value
    : `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`;
}

export default function InvoiceForm({
  contractId: initialContractId,
  initialDocumentType,
  originalInvoiceId,
  noteKind = "INVOICE",
  inModal = false,
  onClose,
  onCreated,
}: InvoiceFormProps) {
  const ui = useUiText();

  const router = useRouter();

  // Active Stepper Stage
  const [currentStage, setCurrentStage] = useState<FormStage>(
    "DOCUMENT_AND_CUSTOMER",
  );

  const [documentType, setDocumentType] =
    useState<InvoiceDocumentType>(initialDocumentType);
  const [taxDocument, setTaxDocument] = useState<TaxDocument>({
    kind: noteKind,
    profile: "SIMPLIFIED",
    supplyDate: saudiDateTimeInput().slice(0, 10),
    ...(originalInvoiceId ? { originalInvoiceId } : {}),
  });

  const isTaxMode = documentType === "TAX" || taxDocument.kind !== "INVOICE";

  const [original, setOriginal] = useState<InvoiceDetail | null>(null);
  const [origSearch, setOrigSearch] = useState("");
  const [origOptions, setOrigOptions] = useState<OriginalInvoiceOption[]>([]);
  const [origSearchError, setOrigSearchError] = useState("");
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState(EMPTY_BANK);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [isReviewed, setIsReviewed] = useState(false);
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(false);
  const [whatsAppPhoneOverride, setWhatsAppPhoneOverride] = useState("");
  const [whatsAppMeta, setWhatsAppMeta] = useState<{
    connected: boolean;
    adminFlowPhone: string;
  } | null>(null);
  const autoSendTouchedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      fetchWhatsAppStatus(),
      fetchWhatsAppFlowOverview(),
    ]).then(([statusRes, flowRes]) => {
      if (!active) return;
      const connected =
        statusRes.status === "fulfilled" && statusRes.value.status === "connected";
      const flowConfig =
        flowRes.status === "fulfilled" ? flowRes.value.config : null;
      setWhatsAppMeta({
        connected,
        adminFlowPhone: flowConfig?.adminPhone || "+966577842926",
      });
      if (flowConfig?.autoSendInvoiceDefault && !autoSendTouchedRef.current) {
        setAutoSendWhatsApp(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Simplified Payment UX: "هل دفع العميل؟"
  const [paymentStatusChoice, setPaymentStatusChoice] = useState<
    "NOT_PAID" | "FULLY_PAID" | "PARTIALLY_PAID"
  >("NOT_PAID");
  const [fullPaymentMethod, setFullPaymentMethod] = useState<
    "BANK_TRANSFER" | "CASH" | "CARD"
  >("BANK_TRANSFER");
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<
    "BANK_TRANSFER" | "CASH"
  >("BANK_TRANSFER");

  // Show Accountant details (collapsible)
  const [showAccountantDetails, setShowAccountantDetails] = useState(false);

  // Supplemental Trip details (collapsible)
  const [showSupplementalTrip, setShowSupplementalTrip] = useState(false);

  const [buyer, setBuyer] = useState<BuyerForm>(EMPTY_BUYER);
  const [customerId, setCustomerId] = useState("");
  const [showBuyerDetails, setShowBuyerDetails] = useState(false);

  const [selectedContract, setSelectedContract] =
    useState<InvoiceContractOption | null>(null);
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

  const [rows, setRows] = useState<FormLine[]>([
    { id: "line-1", input: emptyInvoiceLine() },
  ]);
  const nextRow = useRef(2);
  const operationKey = useRef("");
  const sourceVersion = useRef(0);
  const errorRegion = useRef<HTMLDivElement>(null);

  // Synchronize settlementAccountCode & paymentCode based on "هل دفع العميل؟"
  const changePaymentStatusChoice = (
    choice: "NOT_PAID" | "FULLY_PAID" | "PARTIALLY_PAID",
  ) => {
    setPaymentStatusChoice(choice);
    if (choice === "NOT_PAID" || choice === "PARTIALLY_PAID") {
      setSettlementAccountCode("1103");
    } else if (choice === "FULLY_PAID") {
      setSettlementAccountCode(fullPaymentMethod === "CASH" ? "1101" : "1102");
    }
  };

  const changeFullPaymentMethod = (
    method: "BANK_TRANSFER" | "CASH" | "CARD",
  ) => {
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
    const buyerInput = invoice.snapshot.input.buyer;
    const address = buyerInput?.address;
    setBuyer({
      ...EMPTY_BUYER,
      name: buyerInput?.name || "",
      vatNumber: buyerInput?.vatNumber || "",
      commercialRegistration: buyerInput?.identification || "",
      street: address?.street || "",
      building: address?.building || "",
      district: address?.district || "",
      city: address?.city || "",
      postalCode: address?.postalCode || "",
    });
    setTaxDocument((current) => ({
      ...current,
      originalInvoiceId: invoice.id,
      profile: invoice.snapshot.input.taxDocument?.profile || "SIMPLIFIED",
    }));
    setRows(
      invoice.snapshot.input.lines.map((input, index) => ({
        id: `original-${index}`,
        input,
      })),
    );
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
      setTaxDocument((current) => ({
        ...current,
        originalInvoiceId: undefined,
      }));
      return;
    }
    setIsSourceLoading(true);
    setSourceError("");
    const result = await invoiceRequest<InvoiceDetail>(
      `/${encodeURIComponent(id)}`,
    );
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
      setTaxDocument((prev) => ({
        ...prev,
        kind: "INVOICE",
        originalInvoiceId: undefined,
      }));
    } else if (choice === "PROFORMA") {
      setDocumentType("PROFORMA");
      setTaxDocument((prev) => ({
        ...prev,
        kind: "INVOICE",
        originalInvoiceId: undefined,
      }));
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
        ? invoiceRequest<TransportDefaults>(
            `/transport-defaults/${encodeURIComponent(initialContractId)}`,
          )
        : Promise.resolve(null),
      originalInvoiceId
        ? invoiceRequest<InvoiceDetail>(
            `/${encodeURIComponent(originalInvoiceId)}`,
          )
        : Promise.resolve(null),
    ]).then(([config, linked, originalResult]) => {
      if (!active) return;
      setSettings(config.data || null);
      const sanitizedBank = sanitizeBankForm(config.data?.company?.bankDetails);
      setBankDetails(sanitizedBank);
      setHasBankDetails(hasCompleteBankDetails(sanitizedBank));
      setError(config.error || "");
      setInvoiceDate(saudiDateTimeInput());

      if (linked?.data && initialContractId) {
        const { transport: details = {} as TransportDetails, customerName = "" } =
          linked.data;
        const origin = details.origin || "";
        const destination = details.destination || "";
        const tripDate =
          details.tripDate || saudiDateTimeInput().slice(0, 10);
        setSelectedContract({
          id: initialContractId,
          referenceNumber: details.contractReference || initialContractId,
          customerName: customerName || "",
          origin,
          destination,
          tripDate,
        });
        setBuyer((current) => ({ ...current, name: customerName || "" }));
        setTransport((current) => ({
          ...current,
          ...details,
          origin,
          destination,
          tripDate,
          contractReference: details.contractReference || initialContractId,
        }));
        if (details.contactPhone) {
          setPhone(invoicePhoneFrom(details.contactPhone));
        }
        if (origin && destination) {
          setRows([
            {
              id: "line-1",
              input: {
                ...emptyInvoiceLine(),
                description:
                  `خدمة نقل من ${origin} إلى ${destination}`.slice(
                    0,
                    200,
                  ),
              },
            },
          ]);
        }
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

  useEffect(() => {
    if (!isTaxMode || taxDocument.kind === "INVOICE") return;
    let active = true;
    const timer = setTimeout(() => {
      void invoiceRequest<{ items: OriginalInvoiceOption[] }>(
        `/tax-originals?search=${encodeURIComponent(origSearch)}`,
      ).then((result) => {
        if (!active) return;
        setOrigOptions(result.data?.items || []);
        setOrigSearchError(result.error || "");
      });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isTaxMode, taxDocument.kind, origSearch]);

  const estimate = estimateInvoice(rows.map((row) => row.input));
  const beforeDiscount = estimateInvoice(
    rows.map((row) => ({ ...row.input, discount: "0" })),
  );
  const discountTotal =
    estimate.isValid && beforeDiscount.isValid
      ? difference(beforeDiscount.net, estimate.net)
      : "—";
  const canSave =
    Boolean(settings?.company) &&
    !isLoading &&
    !isSaving &&
    !isSourceLoading &&
    !sourceError;

  function updateBuyer(change: Partial<BuyerForm>) {
    setBuyer((current) => {
      const next = { ...current, ...change };
      return {
        name: next.name ?? "",
        vatNumber: next.vatNumber ?? "",
        street: next.street ?? "",
        building: next.building ?? "",
        district: next.district ?? "",
        city: next.city ?? "",
        postalCode: next.postalCode ?? "",
        commercialRegistration: next.commercialRegistration ?? "",
      };
    });
    if (isTaxMode && change.vatNumber !== undefined && !original) {
      setTaxDocument((current) => ({
        ...current,
        profile: change.vatNumber ? "STANDARD" : "SIMPLIFIED",
      }));
      if (change.vatNumber) setShowBuyerDetails(true);
    }
    setIsReviewed(false);
  }

  function updateRow(id: string, change: Partial<InvoiceLineInput>) {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, input: { ...row.input, ...change } } : row,
      ),
    );
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
    if (
      rows.length === 1 &&
      !rows[0].input.description.trim() &&
      (!rows[0].input.unitPrice || rows[0].input.unitPrice === "0") &&
      description
    ) {
      updateRow(rows[0].id, { description });
      return;
    }
    const index = nextRow.current++;
    setRows((current) => [
      ...current,
      {
        id: `line-${index}`,
        input: { ...emptyInvoiceLine(index), description },
      },
    ]);
    setIsReviewed(false);
  }

  async function selectContract(contract: InvoiceContractOption) {
    const version = ++sourceVersion.current;
    setSelectedContract(contract);
    setIsSourceLoading(true);
    setSourceError("");
    setIsReviewed(false);

    // Immediately and synchronously populate route, trip date, and buyer name from the contract
    const safeCustomerName = contract.customerName || "";
    setBuyer((current) =>
      current.name === safeCustomerName
        ? current
        : { ...EMPTY_BUYER, name: safeCustomerName },
    );
    const initialOrigin = contract.origin || "";
    const initialDestination = contract.destination || "";
    const initialTripDate =
      contract.tripDate || saudiDateTimeInput().slice(0, 10);
    setTransport((current) => ({
      ...current,
      origin: initialOrigin || current.origin,
      destination: initialDestination || current.destination,
      tripDate: initialTripDate || current.tripDate,
      contractReference: contract.referenceNumber || contract.id,
    }));
    if (initialOrigin && initialDestination) {
      setRows((current) =>
        current.length === 1 &&
        (!current[0].input.description.trim() ||
          current[0].input.description.startsWith("خدمة نقل من"))
          ? [
              {
                ...current[0],
                input: {
                  ...current[0].input,
                  description:
                    `خدمة نقل من ${initialOrigin} إلى ${initialDestination}`.slice(
                      0,
                      200,
                    ),
                },
              },
            ]
          : current,
      );
    }

    const result = await invoiceRequest<TransportDefaults>(
      `/transport-defaults/${encodeURIComponent(contract.id)}`,
    );
    if (version !== sourceVersion.current) return;
    if (result.data) {
      const { customerName, transport: details } = result.data;
      const finalCustomerName = customerName || contract.customerName || "";
      setBuyer((current) =>
        current.name === finalCustomerName
          ? current
          : { ...EMPTY_BUYER, name: finalCustomerName },
      );
      const origin = details?.origin || contract.origin || "";
      const destination = details?.destination || contract.destination || "";
      const tripDate =
        details?.tripDate || contract.tripDate || saudiDateTimeInput().slice(0, 10);
      setTransport((current) => ({
        ...current,
        ...details,
        origin,
        destination,
        tripDate,
        contractReference:
          details?.contractReference || contract.referenceNumber || contract.id,
      }));
      if (details?.contactPhone) {
        setPhone(invoicePhoneFrom(details.contactPhone));
      }
      if (origin && destination) {
        setRows((current) =>
          current.length === 1 &&
          (!current[0].input.description.trim() ||
            current[0].input.description.startsWith("خدمة نقل من"))
            ? [
                {
                  ...current[0],
                  input: {
                    ...current[0].input,
                    description:
                      `خدمة نقل من ${origin} إلى ${destination}`.slice(0, 200),
                  },
                },
              ]
            : current,
        );
      }
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

  const contactPhone = invoicePhoneNumber(phone);
  const stage1Issue = validateStage1Fields({
    isTaxMode,
    taxDocument,
    hasOriginal: Boolean(original),
    buyer,
    contactPhone,
    passengerCount: transport.passengerCount,
  });
  const stage2Issue = validateStage2Fields({
    transport,
    bookingError: validateBooking(booking, transport),
    transportError: validateTransportDraft(transport),
  });
  const stage3Error = validateStage3Fields({
    lines: rows.map((row) => row.input),
    estimateValid: estimate.isValid,
    estimateError: estimate.error,
    checkBank: (documentType === "PROFORMA" || isTaxMode) && hasBankDetails,
    bankDetails,
  });

  const goToNextStage = () => {
    setError("");
    if (currentStage === "DOCUMENT_AND_CUSTOMER") {
      if (stage1Issue) {
        if (stage1Issue.openBuyerDetails) setShowBuyerDetails(true);
        showError(stage1Issue.error);
        return;
      }
      setCurrentStage("TRIP_AND_SERVICE");
    } else if (currentStage === "TRIP_AND_SERVICE") {
      if (stage2Issue) {
        if (stage2Issue.isTransportError) setHasTransportError(true);
        showError(stage2Issue.error);
        return;
      }
      setHasTransportError(false);
      setCurrentStage("PRICE_AND_TAX");
    } else if (currentStage === "PRICE_AND_TAX") {
      if (stage3Error) {
        showError(stage3Error);
        return;
      }
      setCurrentStage("PAYMENT_AND_REVIEW");
    }
  };

  const goToPreviousStage = () => {
    setError("");
    const idx = STAGES.findIndex((s) => s.id === currentStage);
    if (idx > 0) {
      setCurrentStage(STAGES[idx - 1].id);
    }
  };

  // Save / Issue Invoice
  async function submitInvoice(reviewedOverride?: boolean) {
    const reviewed = reviewedOverride ?? isReviewed;
    if (!canSave) return;
    setError("");
    setHasTransportError(false);

    if (stage1Issue) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      if (stage1Issue.openBuyerDetails) setShowBuyerDetails(true);
      showError(stage1Issue.error);
      return;
    }

    if (stage2Issue) {
      if (stage2Issue.isTransportError) setHasTransportError(true);
      setCurrentStage("TRIP_AND_SERVICE");
      showError(stage2Issue.error);
      return;
    }

    if (stage3Error) {
      setCurrentStage("PRICE_AND_TAX");
      showError(stage3Error);
      return;
    }

    const parsedInvoiceDate = invoiceDate
      ? new Date(`${invoiceDate}+03:00`)
      : null;
    if (!parsedInvoiceDate || Number.isNaN(parsedInvoiceDate.getTime())) {
      setCurrentStage("PAYMENT_AND_REVIEW");
      showError("أدخل تاريخ ووقت الفاتورة بشكل صحيح.");
      return;
    }

    if (!reviewed) {
      setCurrentStage("PAYMENT_AND_REVIEW");
      showError("يرجى تحديد خانة الإقرار بمراجعة بيانات الفاتورة قبل الإصدار.");
      document.getElementById("review-checkbox-label")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    const validPhone = contactPhone;
    if (!validPhone) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      showError(
        "أدخل رقم جوال صحيحًا مع اختيار كود الدولة المناسب في المرحلة الأولى.",
      );
      return;
    }

    const totalMinor = moneyMinor(estimate.gross);
    let partialMinor: bigint | null = null;
    if (
      documentType !== "PROFORMA" &&
      paymentStatusChoice === "PARTIALLY_PAID"
    ) {
      partialMinor = moneyMinor(partialPaymentAmount);
      if (partialMinor === null || partialMinor <= BigInt(0)) {
        setCurrentStage("PAYMENT_AND_REVIEW");
        showError("يرجى إدخال مبلغ الدفعة الأولى بشكل صحيح أكبر من الصفر.");
        return;
      }
      if (totalMinor !== null && partialMinor > totalMinor) {
        setCurrentStage("PAYMENT_AND_REVIEW");
        showError("مبلغ الدفعة المقدمة لا يمكن أن يتجاوز إجمالي الفاتورة.");
        return;
      }
    }

    const hasAddress = [
      buyer.street,
      buyer.building,
      buyer.district,
      buyer.city,
      buyer.postalCode,
    ].some((value) => value.trim());

    setIsSaving(true);
    try {
      const payloadBuyer: Buyer = original
        ? original.snapshot.input.buyer
        : {
            name: buyer.name.trim(),
            ...(buyer.commercialRegistration.trim()
              ? {
                  identification: buyer.commercialRegistration.trim(),
                  identificationScheme: "CRN",
                }
              : {}),
            ...(buyer.vatNumber.trim()
              ? { vatNumber: buyer.vatNumber.trim() }
              : {}),
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

      const normalizedBank =
        (documentType === "PROFORMA" || isTaxMode) && hasBankDetails
          ? {
              bankName: bankDetails.bankName.trim(),
              accountHolder: bankDetails.accountHolder.trim(),
              ...(bankDetails.accountNumber.trim()
                ? { accountNumber: bankDetails.accountNumber.trim() }
                : {}),
              ...(bankDetails.iban.replace(/\s/g, "").trim()
                ? {
                    iban: bankDetails.iban
                      .replace(/\s/g, "")
                      .toUpperCase(),
                  }
                : {}),
              ...(bankDetails.swiftCode.trim()
                ? { swiftCode: bankDetails.swiftCode.trim().toUpperCase() }
                : {}),
            }
          : undefined;

      if (!operationKey.current) operationKey.current = crypto.randomUUID();

      const result = await invoiceRequest<{
        id: string;
        whatsAppAutoSend?: WhatsAppAutoSendResult;
      }>("", "POST", {
        documentType,
        ...(isTaxMode
          ? {
              taxDocument: {
                ...taxDocument,
                ...(taxDocument.kind !== "INVOICE"
                  ? { adjustmentReason: taxDocument.adjustmentReason?.trim() }
                  : {
                      originalInvoiceId: undefined,
                      adjustmentReason: undefined,
                      adjustmentEventDate: undefined,
                    }),
              },
            }
          : {}),
        ...(normalizedBank ? { bankDetails: normalizedBank } : {}),
        operationKey: operationKey.current,
        invoiceDate: parsedInvoiceDate.toISOString(),
        buyer: payloadBuyer,
        ...(customerId && !original ? { customerId } : {}),
        paymentCode,
        accountingApproved: reviewed,
        ...(documentType !== "PROFORMA"
          ? { accounting: { revenueAccountCode, settlementAccountCode } }
          : {}),
        ...(selectedContract ? { contractId: selectedContract.id } : {}),
        transport: transportPayload({
          ...transport,
          origin: transport.origin.trim(),
          destination: transport.destination.trim(),
          ...(transport.billedDistance?.trim()
            ? { billedDistance: transport.billedDistance.trim() }
            : { billedDistance: undefined }),
          ...(transport.odometerStart?.trim()
            ? { odometerStart: transport.odometerStart.trim() }
            : { odometerStart: undefined }),
          ...(transport.odometerEnd?.trim()
            ? { odometerEnd: transport.odometerEnd.trim() }
            : { odometerEnd: undefined }),
          contactPhone: validPhone,
          notes: bookingNotes(booking, transport),
        }),
        lines: rows.map((row) => {
          const rawCat = row.input.category;
          const isZero = rawCat !== "S";
          const cat = rawCat === "Z_NO_REASON" ? "Z" : rawCat;
          const defaultCode =
            cat === "E"
              ? "VATEX-SA-29"
              : cat === "O"
                ? "VATEX-SA-OOS"
                : "VATEX-SA-32";
          const defaultReason =
            cat === "E"
              ? "خدمات معفاة بموجب المادة 29 من اللائحة"
              : cat === "O"
                ? "مبالغ ورسوم خارج نطاق ضريبة القيمة المضافة"
                : "توريد خاضع للنسبة الصفرية";

          return {
            code: row.input.code.trim(),
            description: row.input.description.trim(),
            quantity: row.input.quantity.trim(),
            billingUnit: row.input.billingUnit || "TRIP",
            unitPrice: row.input.unitPrice.trim(),
            discount: (row.input.discount || "0").trim() || "0",
            category: cat,
            rate: cat === "S" ? "15" : "0",
            component: row.input.component,
            taxReviewed: reviewed,
            ...(isZero
              ? {
                  exemptionCode: row.input.exemptionCode?.trim() || defaultCode,
                  exemptionReason:
                    row.input.exemptionReason?.trim() || defaultReason,
                }
              : {}),
          };
        }),
        ...(autoSendWhatsApp
          ? {
              autoSendWhatsApp: true,
              ...(whatsAppPhoneOverride.trim()
                ? { whatsAppPhone: whatsAppPhoneOverride.trim() }
                : {}),
            }
          : {}),
      });

      if (result.data) {
        // If partial payment was entered during creation, issue the payment voucher immediately!
        if (
          documentType !== "PROFORMA" &&
          paymentStatusChoice === "PARTIALLY_PAID" &&
          partialMinor !== null &&
          partialMinor > BigInt(0)
        ) {
          try {
            await accountingRequest("/payments", "POST", {
              operationKey: crypto.randomUUID(),
              documentType: "SALE",
              documentId: result.data.id,
              amount: moneyDecimal(partialMinor),
              paymentDate: invoiceDate.slice(0, 10),
              cashAccount: partialPaymentMethod === "CASH" ? "1101" : "1102",
              reference: `دفعة أولى مستلمة عند إصدار الفاتورة #${result.data.id.slice(0, 8)}`,
            });
          } catch (payErr) {
            console.error(
              "Failed to post initial partial payment voucher:",
              payErr,
            );
          }
        }

        if (onCreated) {
          onCreated(result.data.id);
        } else {
          const waAuto = result.data.whatsAppAutoSend;
          let waQuery = "";
          if (waAuto?.attempted) {
            const sp = new URLSearchParams();
            sp.set("waAuto", waAuto.success ? "sent" : "error");
            if (waAuto.phone) sp.set("waPhone", waAuto.phone);
            if (waAuto.error) sp.set("waMsg", waAuto.error);
            if (waAuto.adminPhone && waAuto.adminNotified) {
              sp.set("waAdmin", waAuto.adminPhone);
            }
            waQuery = `?${sp.toString()}`;
          }
          router.push(`/admin/invoices/${encodeURIComponent(result.data.id)}${waQuery}`);
        }
      } else {
        showError(result.error || "تعذر حفظ الفاتورة. حاول مرة أخرى.");
      }
    } catch {
      showError("تعذر حفظ الفاتورة. راجع البيانات وحاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitInvoice();
  }

  // Exact minor-unit Remaining Balance for Stage 4
  const estTotalMinor = estimate.isValid ? moneyMinor(estimate.gross) : null;
  const estPartialMinor = moneyMinor(partialPaymentAmount) ?? BigInt(0);
  const remainingBalance =
    paymentStatusChoice === "FULLY_PAID"
      ? "0.00"
      : paymentStatusChoice === "PARTIALLY_PAID" && estTotalMinor !== null
        ? moneyDecimal(
            estTotalMinor > estPartialMinor
              ? estTotalMinor - estPartialMinor
              : BigInt(0),
          )
        : estimate.gross;

  const docHeadingTitle = `${ui("إنشاء")} ${ui(
    documentType === "PROFORMA"
      ? "فاتورة مبدئية (عرض أسعار)"
      : INVOICE_TYPE_LABELS[documentType],
  )}`;
  const docHeadingSubtitle = ui(
    "أدخل بيانات المستند في ٤ خطوات واضحة وميسرة دون تعقيد محاسبي",
  );

  const linesBody = (
    <>
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
              setRows((current) =>
                current.filter((item) => item.id !== row.id),
              );
              setIsReviewed(false);
            }}
          />
        ))}
      </div>

      {/* Add Service Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t theme-border">
        <button
          type="button"
          disabled={rows.length >= 200}
          onClick={() => addService()}
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[var(--accent-gold)] transition cursor-pointer"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>{ui("إضافة خدمة جديدة")}</span>
        </button>
        {["رسوم نقل إضافية", "جولة سياحية وزيارات", "رسوم انتظار"].map(
          (label) => (
            <button
              key={label}
              type="button"
              disabled={rows.length >= 200}
              onClick={() => addService(label)}
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>{ui(label)}</span>
            </button>
          ),
        )}
      </div>
    </>
  );

  const workspaceContent = (
    <div
      className={`creation-workspace mx-auto max-w-[1680px] ${
        inModal ? "pb-6" : "pb-12"
      }`}
      dir={ui.dir}
    >
      {/* Top Breadcrumb & Header */}
      {!inModal && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/invoices"
              className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition"
            >
              <ArrowRight
                className="size-4 ltr:rotate-180"
                aria-hidden="true"
              />
              <span>{ui("العودة لسجل الفواتير")}</span>
            </Link>
            <Link
              href="/admin/invoices"
              className="inline-flex min-h-11 sm:min-h-9 items-center rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition"
            >
              {ui("إلغاء الأمر")}
            </Link>
          </div>

          <header className="mb-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 flex items-center justify-center text-[var(--accent-gold)]">
                <ReceiptText className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold text-[var(--text-main)] tracking-tight">
                  {docHeadingTitle}
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)]">
                  {docHeadingSubtitle}
                </p>
              </div>
            </div>
          </header>
        </>
      )}

      {/* 4-Stage Interactive Stepper Header */}
      <nav
        aria-label={ui("مراحل إنشاء الفاتورة")}
        className="mb-5 theme-card rounded-2xl border theme-border p-2 sm:p-2.5"
      >
        <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory touch-pan-x touch-pan-y md:grid md:grid-cols-4">
          {STAGES.map((st, idx) => {
            const isCurrent = currentStage === st.id;
            const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
            const isStageValid =
              st.id === "DOCUMENT_AND_CUSTOMER"
                ? !stage1Issue
                : st.id === "TRIP_AND_SERVICE"
                  ? !stage2Issue
                  : st.id === "PRICE_AND_TAX"
                    ? !stage3Error
                    : isReviewed;
            const isCompleted = idx < currentIndex && isStageValid;

            return (
              <button
                key={st.id}
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => setCurrentStage(st.id)}
                className={`min-h-11 shrink-0 min-w-[178px] sm:min-w-[196px] md:min-w-0 flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl text-start transition cursor-pointer select-none ${
                  isCurrent
                    ? "bg-[var(--accent-surface)] border border-[var(--accent-gold)]/55 ring-1 ring-[var(--accent-gold)]/30 text-[var(--text-main)]"
                    : isCompleted
                      ? "bg-[var(--bg-card-subtle)] border border-[var(--accent-gold)]/35 text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                      : "bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--control-border)]"
                }`}
              >
                <div
                  className={`size-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isCurrent
                      ? "bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)]"
                      : isCompleted
                        ? "border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                        : "bg-[var(--bg-card-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    ui(st.number)
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-semibold whitespace-normal leading-snug ${isCurrent ? "text-[var(--accent-gold)]" : "text-[var(--text-main)]"}`}
                  >
                    {ui(st.title)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate hidden sm:block">
                    {ui(st.subtitle)}
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
          className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-800 dark:text-rose-300 shadow-xs"
        >
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-rose-700 dark:text-rose-400"
            aria-hidden="true"
          />
          <span className="flex-1">{ui(error)}</span>
          {!settings && (
            <button
              type="button"
              className="underline cursor-pointer"
              onClick={() => {
                setIsLoading(true);
                setReload((v) => v + 1);
              }}
            >
              {ui("إعادة المحاولة")}
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div
          role="status"
          className="theme-card animate-pulse rounded-2xl p-10 text-center text-[var(--text-muted)] text-sm sm:text-base"
        >
          <Loader2 className="size-7 animate-spin mx-auto mb-3 text-[var(--accent-gold)]" />
          <span>{ui("جارٍ تجهيز شاشة الفاتورة…")}</span>
        </div>
      ) : (
        <form
          id="invoice-create-form"
          onSubmit={save}
          className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_390px]"
        >
          {/* Main Stepper Stages Area */}
          <fieldset
            disabled={isSaving || isSourceLoading}
            className="min-w-0 space-y-5 disabled:opacity-75"
          >
            {/* =========================================================================
                المرحلة الأولى: نوع المستند والعميل (§5 المرحلة الأولى)
               ========================================================================= */}
            {currentStage === "DOCUMENT_AND_CUSTOMER" && (
              <div className="space-y-5">
                {/* 1a. Unified Document Selector */}
                <InvoiceTypeSelector
                  documentType={documentType}
                  taxKind={taxDocument.kind}
                  onChangeType={handleDocChoice}
                />

                {/* 1b. If Credit or Debit Note, choose Original Invoice and Reason */}
                {isTaxMode && taxDocument.kind !== "INVOICE" && (
                  <section className="theme-card rounded-2xl p-4 sm:p-5 border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="rounded-md bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] px-2.5 py-0.5 text-xs font-semibold">
                        {ui("ربط الفاتورة الأصلية للإشعار")}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-3.5 leading-relaxed">
                      {ui(
                        "يُشترط نظاماً ربط الإشعار برقم الفاتورة الصادرة سابقاً. سيتم نسخ بيانات العميل والمسار والضريبة تلقائياً.",
                      )}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <FullscreenSelect
                          label={ui("الفاتورة الأصلية")}
                          required
                          searchable
                          columns={2}
                          clearable
                          searchValue={origSearch}
                          onSearchChange={setOrigSearch}
                          searchPlaceholder={ui("رقم الفاتورة أو اسم العميل")}
                          placeholder={ui("اختر الفاتورة الأصلية")}
                          value={taxDocument.originalInvoiceId || ""}
                          onChange={(id) => void selectOriginal(id)}
                          error={
                            origSearchError ? ui(origSearchError) : undefined
                          }
                          options={[
                            ...(original &&
                            !origOptions.some((o) => o.id === original.id)
                              ? [
                                  {
                                    value: original.id,
                                    label: `${original.invoiceNumber} · ${original.customerName}`,
                                    badge: original.invoiceNumber,
                                  },
                                ]
                              : []),
                            ...origOptions.map((item) => ({
                              value: item.id,
                              label: `${item.invoiceNumber} · ${item.customerName}`,
                              badge: item.invoiceNumber,
                              keywords: `${item.invoiceNumber} ${item.customerName}`,
                            })),
                          ]}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <ExpandableField
                          label={ui("سبب إصدار هذا الإشعار بالعربية")}
                          required
                          maxLength={200}
                          placeholder={ui(
                            taxDocument.kind === "CREDIT"
                              ? "مثال: خصم تجاري ممنوح أو إلغاء رحلة جزئياً"
                              : "مثال: رسوم جولة إضافية وتمديد ساعات الخدمة",
                          )}
                          value={taxDocument.adjustmentReason || ""}
                          onApply={(adjustmentReason) =>
                            setTaxDocument({ ...taxDocument, adjustmentReason })
                          }
                        >
                          <input
                            required
                            maxLength={200}
                            className={INLINE_INPUT}
                            placeholder={ui(
                              taxDocument.kind === "CREDIT"
                                ? "مثال: خصم تجاري ممنوح أو إلغاء رحلة جزئياً"
                                : "مثال: رسوم جولة إضافية وتمديد ساعات الخدمة",
                            )}
                            value={taxDocument.adjustmentReason || ""}
                            onChange={(e) =>
                              setTaxDocument({
                                ...taxDocument,
                                adjustmentReason: e.target.value,
                              })
                            }
                          />
                        </ExpandableField>
                      </div>
                    </div>
                    {original && (
                      <div className="mt-3.5 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--bg-card)] p-3.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <ReceiptText className="size-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                          <div>
                            <span className="font-bold text-[var(--text-main)]">
                              {ui("الفاتورة الأصلية المرتبطة")}: {original.invoiceNumber}
                            </span>
                            <span className="text-[var(--text-muted)] ms-2">
                              ({original.customerName} · {amount(original.snapshot.totals.gross)} {ui("ر.س")})
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void selectOriginal("")}
                          className="min-h-11 sm:min-h-8 inline-flex items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-main)] hover:border-rose-500 hover:text-rose-600 transition cursor-pointer"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          <span>{ui("تغيير")}</span>
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {/* 1c. Fast Import: Use Existing Contract */}
                <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-3.5 mb-4">
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                        {ui("بيانات العميل والفاتورة")}
                      </h2>
                      <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                        {ui(
                          "اختر العقد لاستيراد كافة بيانات الرحلة والعميل بضغطة زر، أو أدخلها يدوياً",
                        )}
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
                      <p
                        role="alert"
                        className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-400"
                      >
                        {ui(sourceError)}
                      </p>
                    )}
                    {selectedContract && (
                      <div className="mt-3.5 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)] flex items-center justify-center shrink-0">
                            <FileText className="size-4" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--text-main)]">
                                {ui("تم استيراد العقد")}: {selectedContract.referenceNumber}
                              </span>
                              <span className="rounded-md border theme-border bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--text-main)]">
                                {selectedContract.tripDate}
                              </span>
                            </div>
                            <p className="text-[var(--text-muted)] text-xs mt-0.5">
                              {selectedContract.customerName} · {selectedContract.origin} {ui.dir === "rtl" ? "←" : "→"} {selectedContract.destination}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearContract}
                          className="min-h-11 sm:min-h-8 inline-flex items-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold text-[var(--text-main)] hover:border-rose-500 hover:text-rose-600 transition cursor-pointer"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          <span>{ui("إلغاء الربط")}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {!original && (
                    <div className="mb-5">
                      <CustomerPicker
                        value={customerId}
                        onSelect={(c) => {
                          setCustomerId(c?.id || "");
                          if (c) {
                            setBuyer({
                              name: c.name || "",
                              vatNumber: c.vatNumber || "",
                              commercialRegistration: c.identification || "",
                              street: c.address?.street || "",
                              building: c.address?.building || "",
                              district: c.address?.district || "",
                              city: c.address?.city || "",
                              postalCode: c.address?.postalCode || "",
                            });
                            if (c.phone) {
                              setPhone(invoicePhoneFrom(c.phone));
                            }
                            setTaxDocument((v) => ({
                              ...v,
                              profile:
                                c.type === "COMPANY"
                                  ? "STANDARD"
                                  : "SIMPLIFIED",
                            }));
                          }
                        }}
                      />
                    </div>
                  )}
                  {/* Customer Information Grid */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <ExpandableField
                      label={ui("الفاتورة باسم (العميل أو المنشأة)")}
                      required
                      maxLength={200}
                      autoComplete="name"
                      disabled={Boolean(original)}
                      placeholder={ui("اسم الفرد، الفندق، أو الشركة")}
                      value={buyer.name || ""}
                      onApply={(name) => updateBuyer({ name: name || "" })}
                    >
                      <input
                        name="customerName"
                        readOnly={Boolean(original)}
                        required
                        maxLength={200}
                        autoComplete="name"
                        placeholder={ui("اسم الفرد، الفندق، أو الشركة")}
                        className={INLINE_INPUT}
                        value={buyer.name || ""}
                        onChange={(e) => updateBuyer({ name: e.target.value })}
                      />
                    </ExpandableField>

                    <ExpandableField
                      label={ui("الرقم الضريبي للمشتري (للمنشآت B2B)")}
                      inputMode="numeric"
                      pattern="3\d{13}3"
                      maxLength={15}
                      dir="ltr"
                      disabled={Boolean(original)}
                      placeholder={ui("3xxxxxxxxxxxxxx3 (15 رقماً)")}
                      value={buyer.vatNumber || ""}
                      onApply={(vatNumber) =>
                        updateBuyer({ vatNumber: vatNumber || "" })
                      }
                    >
                      <input
                        name="customerVat"
                        readOnly={Boolean(original)}
                        inputMode="numeric"
                        pattern="3\d{13}3"
                        maxLength={15}
                        dir="ltr"
                        placeholder={ui("3xxxxxxxxxxxxxx3 (15 رقماً)")}
                        className={`${INLINE_INPUT} font-mono`}
                        value={buyer.vatNumber || ""}
                        onChange={(e) =>
                          updateBuyer({ vatNumber: e.target.value })
                        }
                      />
                    </ExpandableField>

                    <ExpandableField
                      label={ui("اسم الضيف أو مسؤول المجموعة (اختياري)")}
                      maxLength={160}
                      autoComplete="name"
                      placeholder={ui("إذا كان مختلفاً عن صاحب الفاتورة")}
                      value={transport.contactName || ""}
                      onApply={(contactName) =>
                        updateTransport({ contactName: contactName || "" })
                      }
                    >
                      <input
                        maxLength={160}
                        autoComplete="name"
                        placeholder={ui("إذا كان مختلفاً عن صاحب الفاتورة")}
                        className={INLINE_INPUT}
                        value={transport.contactName || ""}
                        onChange={(e) =>
                          updateTransport({ contactName: e.target.value })
                        }
                      />
                    </ExpandableField>

                    {/* Phone with Country Code */}
                    <div>
                      <span className="block text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)] mb-1">
                        {ui("رقم الجوال للتواصل والفاتورة *")}
                      </span>
                      <InvoicePhoneField
                        value={phone}
                        onChange={(v) => {
                          setPhone(v);
                          setIsReviewed(false);
                        }}
                      />
                    </div>

                    <ExpandableField
                      label={ui("البريد الإلكتروني (اختياري)")}
                      type="email"
                      maxLength={160}
                      dir="ltr"
                      placeholder="customer@example.com"
                      value={booking.email || ""}
                      onApply={(email) => updateBooking({ email: email || "" })}
                    >
                      <input
                        type="email"
                        maxLength={160}
                        dir="ltr"
                        placeholder="customer@example.com"
                        className={INLINE_INPUT}
                        value={booking.email || ""}
                        onChange={(e) =>
                          updateBooking({ email: e.target.value })
                        }
                      />
                    </ExpandableField>

                    <ExpandableField
                      label={ui("عدد الركاب في الرحلة")}
                      required
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      placeholder={ui("مثال: 4 ركاب")}
                      value={
                        transport.passengerCount !== undefined &&
                        transport.passengerCount !== null
                          ? String(transport.passengerCount)
                          : ""
                      }
                      onApply={(next) => {
                        const trimmed = next.trim();
                        const parsed = Number(trimmed);
                        updateTransport({
                          passengerCount:
                            trimmed && Number.isFinite(parsed)
                              ? parsed
                              : undefined,
                        });
                      }}
                    >
                      <input
                        required
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        placeholder={ui("مثال: 4 ركاب")}
                        className={`${INLINE_INPUT} font-mono`}
                        value={
                          transport.passengerCount !== undefined &&
                          transport.passengerCount !== null
                            ? transport.passengerCount
                            : ""
                        }
                        onChange={(e) =>
                          updateTransport({
                            passengerCount: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                    </ExpandableField>
                  </div>

                  {/* Commercial Registration if entered */}
                  {isTaxMode && (
                    <div className="mt-5">
                      <ExpandableField
                        label={ui("رقم السجل التجاري للعميل (اختياري)")}
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        dir="ltr"
                        disabled={Boolean(original)}
                        placeholder={ui("10 أرقام")}
                        value={
                          original
                            ? original.snapshot.input.buyer.identification || ""
                            : buyer.commercialRegistration || ""
                        }
                        onApply={(commercialRegistration) =>
                          updateBuyer({
                            commercialRegistration:
                              commercialRegistration || "",
                          })
                        }
                      >
                        <input
                          readOnly={Boolean(original)}
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          dir="ltr"
                          placeholder={ui("10 أرقام")}
                          className={`${INLINE_INPUT} font-mono`}
                          value={
                            original
                              ? original.snapshot.input.buyer.identification ||
                                ""
                              : buyer.commercialRegistration || ""
                          }
                          onChange={(e) =>
                            updateBuyer({
                              commercialRegistration: e.target.value,
                            })
                          }
                        />
                      </ExpandableField>
                    </div>
                  )}

                  {/* National Address: auto-opened if B2B/VAT or toggleable */}
                  <div className="mt-4 pt-3.5 border-t theme-border">
                    <button
                      type="button"
                      aria-expanded={showBuyerDetails}
                      className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 py-1 text-xs sm:text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition cursor-pointer"
                      onClick={() => setShowBuyerDetails(!showBuyerDetails)}
                    >
                      <span>
                        {ui(
                          buyer.vatNumber
                            ? "العنوان الوطني للمشتري (مطلوب للفواتير الضريبية B2B)"
                            : "عنوان العميل الوطني (اختياري)",
                        )}
                      </span>
                      <ChevronDown
                        className={`size-4 transition-transform ${showBuyerDetails ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {showBuyerDetails && (
                      <div className="mt-3 grid gap-4 border theme-border rounded-xl p-4 sm:grid-cols-2 bg-[var(--bg-card-subtle)]">
                        {(
                          [
                            { key: "street", label: "اسم الشارع" },
                            {
                              key: "building",
                              label: "رقم المبنى (٤ أرقام)",
                              pattern: "\\d{4}",
                            },
                            { key: "district", label: "الحي" },
                            { key: "city", label: "المدينة" },
                            {
                              key: "postalCode",
                              label: "الرمز البريدي (٥ أرقام)",
                              pattern: "\\d{5}",
                            },
                          ] as const
                        ).map((field) => (
                          <ExpandableField
                            key={field.key}
                            label={ui(field.label)}
                            maxLength={200}
                            pattern={
                              "pattern" in field ? field.pattern : undefined
                            }
                            disabled={Boolean(original)}
                            value={buyer[field.key] || ""}
                            onApply={(next) =>
                              updateBuyer({ [field.key]: next || "" })
                            }
                          >
                            <input
                              readOnly={Boolean(original)}
                              maxLength={200}
                              className={INLINE_INPUT}
                              value={buyer[field.key] || ""}
                              pattern={
                                "pattern" in field ? field.pattern : undefined
                              }
                              onChange={(e) =>
                                updateBuyer({ [field.key]: e.target.value })
                              }
                            />
                          </ExpandableField>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* Stage 1 Footer Button */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  {inModal && onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex min-h-11 sm:min-h-9 items-center justify-center rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer"
                    >
                      {ui("إلغاء")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={goToNextStage}
                    className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    <span>{ui("المتابعة: مسار الرحلة والخدمة")}</span>
                    <ArrowLeft
                      className="size-4 ltr:rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                المرحلة الثانية: الرحلة والخدمة (§5 المرحلة الثانية)
               ========================================================================= */}
            {currentStage === "TRIP_AND_SERVICE" && (
              <div className="space-y-5">
                <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                  <div className="border-b theme-border pb-3.5 mb-4">
                    <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                      {ui("مسار الرحلة ومواعيدها")}
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                      {ui(
                        "حدد نوع الرحلة، محطة الانطلاق، وجهة الوصول، والتاريخ",
                      )}
                    </p>
                  </div>

                  {/* Booking Fields Component (handles roundtrip, hourly, stops) */}
                  <BookingFields
                    booking={booking}
                    transport={transport}
                    vehicles={vehicles}
                    isLoadingVehicles={isLoadingVehicles}
                    vehicleError={vehicleError}
                    selectedContract={selectedContract}
                    onSelectContract={(c) => void selectContract(c)}
                    onRetryVehicles={() => {
                      setIsLoadingVehicles(true);
                      setVehicleReload((v) => v + 1);
                    }}
                    onBookingChange={updateBooking}
                    onTransportChange={updateTransport}
                  />

                  {/* Informative Passengers Notice (§5 المرحلة الثانية) */}
                  <div className="mt-4 rounded-xl border border-sky-600/25 bg-sky-500/10 p-3 text-xs sm:text-sm text-[var(--text-main)] flex items-center gap-2">
                    <HelpCircle className="size-4 text-sky-700 dark:text-sky-400 shrink-0" />
                    <span>
                      {ui(
                        "ملاحظة: تظهر في نسخة العميل المطبوعة أعداد الركاب الإجمالية؛ تفاصيل الأسماء والهويات تُراجع من سجل العقد والرحلة.",
                      )}
                    </span>
                  </div>
                </section>

                {/* Collapsible Supplemental Details: Driver, Odometer, Distance */}
                <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                  <button
                    type="button"
                    aria-expanded={showSupplementalTrip}
                    onClick={() =>
                      setShowSupplementalTrip(!showSupplementalTrip)
                    }
                    className="flex min-h-11 sm:min-h-9 w-full items-center justify-between gap-3 text-start cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck
                        className="size-4 sm:size-5 text-[var(--accent-gold)] shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-main)]">
                          {ui("تفاصيل الرحلة التشغيلية الإضافية (اختياري)")}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          {ui(
                            "بيانات السائق، قراءة العداد، المسافة المقطوعة، وملاحظات التشغيل",
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`size-4 text-[var(--text-muted)] transition-transform shrink-0 ${showSupplementalTrip ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
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
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={goToPreviousStage}
                    className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] transition cursor-pointer"
                  >
                    <ArrowRight
                      className="size-4 ltr:rotate-180"
                      aria-hidden="true"
                    />
                    <span>{ui("السابق")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextStage}
                    className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    <span>{ui("المتابعة: السعر والضريبة")}</span>
                    <ArrowLeft
                      className="size-4 ltr:rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                المرحلة الثالثة: السعر والضريبة (§5 المرحلة الثالثة)
               ========================================================================= */}
            {currentStage === "PRICE_AND_TAX" && (
              <div className="space-y-5">
                <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                  <div className="border-b theme-border pb-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                        {ui("الخدمات والأسعار والمعاملة الضريبية")}
                      </h2>
                      <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                        {ui(
                          "أدخل تفاصيل الخدمات، ويمكنك كتابة السعر قبل الضريبة أو السعر الإجمالي شامل 15%",
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-gold)]">
                      {ui("مثال: خدمة ٣٠٠ ر.س + ضريبة ٤٥ ر.س = ٣٤٥ ر.س إجمالي")}
                    </div>
                  </div>

                  {linesBody}
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
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={goToPreviousStage}
                    className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] transition cursor-pointer"
                  >
                    <ArrowRight
                      className="size-4 ltr:rotate-180"
                      aria-hidden="true"
                    />
                    <span>{ui("السابق")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextStage}
                    className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    <span>{ui("المتابعة: الدفع والمراجعة")}</span>
                    <ArrowLeft
                      className="size-4 ltr:rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                المرحلة الرابعة: الدفع والمراجعة (§5 المرحلة الرابعة)
               ========================================================================= */}
            {currentStage === "PAYMENT_AND_REVIEW" && (
              <div className="space-y-5">
                {/* 4a. The User Question: "هل دفع العميل؟" */}
                {documentType !== "PROFORMA" ? (
                  <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                    <div className="border-b theme-border pb-3.5 mb-4">
                      <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <Wallet
                          className="size-4 sm:size-5 text-[var(--accent-gold)]"
                          aria-hidden="true"
                        />
                        <span>{ui("هل دفع العميل قيمة الفاتورة؟")}</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                        {ui(
                          "حدد حالة تحصيل المبلغ الفعلي لتسجيل الدفعة وتوجيه القيود بدقة",
                        )}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* NOT PAID (آجل) */}
                      <label
                        className={`p-3.5 rounded-xl border cursor-pointer transition text-start ${
                          paymentStatusChoice === "NOT_PAID"
                            ? "bg-[var(--accent-surface)] border-[var(--accent-gold)]/55 ring-1 ring-[var(--accent-gold)]/30"
                            : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-[var(--accent-gold)]/55"
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
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                            {ui("لم يدفع بعد (آجل)")}
                          </span>
                          <span className="size-4 rounded-full border border-[var(--accent-gold)] flex items-center justify-center">
                            {paymentStatusChoice === "NOT_PAID" && (
                              <span className="size-2 rounded-full bg-[var(--accent-gold)]" />
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {ui(
                            "تُسجل الفاتورة على ذمة العميل وتظهر في قائمة المتبقي لمتابعتها لاحقاً.",
                          )}
                        </p>
                      </label>

                      {/* FULLY PAID */}
                      <label
                        className={`p-3.5 rounded-xl border cursor-pointer transition text-start ${
                          paymentStatusChoice === "FULLY_PAID"
                            ? "bg-[var(--accent-surface)] border-[var(--accent-gold)]/55 ring-1 ring-[var(--accent-gold)]/30"
                            : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-[var(--accent-gold)]/55"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentStatusChoice"
                          value="FULLY_PAID"
                          checked={paymentStatusChoice === "FULLY_PAID"}
                          onChange={() =>
                            changePaymentStatusChoice("FULLY_PAID")
                          }
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                            {ui("دفع المبلغ كاملاً")}
                          </span>
                          <span className="size-4 rounded-full border border-[var(--accent-gold)] flex items-center justify-center">
                            {paymentStatusChoice === "FULLY_PAID" && (
                              <span className="size-2 rounded-full bg-[var(--accent-gold)]" />
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {ui(
                            "تم استلام كامل قيمة الفاتورة وتغذية حساب البنك أو الصندوق.",
                          )}
                        </p>
                      </label>

                      {/* PARTIALLY PAID */}
                      <label
                        className={`p-3.5 rounded-xl border cursor-pointer transition text-start ${
                          paymentStatusChoice === "PARTIALLY_PAID"
                            ? "bg-sky-500/10 border-sky-600/45 ring-1 ring-sky-500/30"
                            : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-sky-600/55 dark:hover:border-sky-400/55"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentStatusChoice"
                          value="PARTIALLY_PAID"
                          checked={paymentStatusChoice === "PARTIALLY_PAID"}
                          onChange={() =>
                            changePaymentStatusChoice("PARTIALLY_PAID")
                          }
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                            {ui("دفع جزءاً من المبلغ")}
                          </span>
                          <span className="size-4 rounded-full border border-sky-600 dark:border-sky-400 flex items-center justify-center">
                            {paymentStatusChoice === "PARTIALLY_PAID" && (
                              <span className="size-2 rounded-full bg-sky-600 dark:bg-sky-400" />
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {ui(
                            "تسجيل دفعة مقدمة الآن مع بقاء الرصيد المتبقي للمتابعة.",
                          )}
                        </p>
                      </label>
                    </div>

                    {/* If FULLY PAID: choose bank or cash */}
                    {paymentStatusChoice === "FULLY_PAID" && (
                      <div className="mt-4 pt-3.5 border-t theme-border space-y-2.5">
                        <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] block">
                          {ui("كيف استلمت المبلغ من العميل؟")}
                        </span>
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          <label
                            className={`min-h-11 sm:min-h-9 p-2.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition ${fullPaymentMethod === "BANK_TRANSFER" ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]" : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"}`}
                          >
                            <input
                              type="radio"
                              name="fullPaymentMethod"
                              checked={fullPaymentMethod === "BANK_TRANSFER"}
                              onChange={() =>
                                changeFullPaymentMethod("BANK_TRANSFER")
                              }
                              className="size-4 accent-amber-700 dark:accent-amber-400"
                            />
                            <Landmark
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{ui("تحويل بنكي (البنك الأهلي SNB)")}</span>
                          </label>
                          <label
                            className={`min-h-11 sm:min-h-9 p-2.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition ${fullPaymentMethod === "CASH" ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]" : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"}`}
                          >
                            <input
                              type="radio"
                              name="fullPaymentMethod"
                              checked={fullPaymentMethod === "CASH"}
                              onChange={() => changeFullPaymentMethod("CASH")}
                              className="size-4 accent-amber-700 dark:accent-amber-400"
                            />
                            <Wallet
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{ui("نقداً بالصندوق")}</span>
                          </label>
                          <label
                            className={`min-h-11 sm:min-h-9 p-2.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition ${fullPaymentMethod === "CARD" ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]" : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"}`}
                          >
                            <input
                              type="radio"
                              name="fullPaymentMethod"
                              checked={fullPaymentMethod === "CARD"}
                              onChange={() => changeFullPaymentMethod("CARD")}
                              className="size-4 accent-amber-700 dark:accent-amber-400"
                            />
                            <CreditCard
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{ui("بطاقة مدى / دفع إلكتروني")}</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* If PARTIALLY PAID: input partial amount & method */}
                    {paymentStatusChoice === "PARTIALLY_PAID" && (
                      <div className="mt-5 pt-4 border-t theme-border grid gap-4 sm:grid-cols-2">
                        <ExpandableField
                          label={ui("المبلغ المدفوع مقدماً الآن (ر.س)")}
                          required
                          inputMode="decimal"
                          dir="ltr"
                          placeholder="0.00"
                          value={partialPaymentAmount}
                          onApply={setPartialPaymentAmount}
                        >
                          <input
                            required
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            placeholder="0.00"
                            className={`${INLINE_INPUT} font-mono text-start`}
                            value={partialPaymentAmount}
                            onChange={(e) =>
                              setPartialPaymentAmount(e.target.value)
                            }
                          />
                        </ExpandableField>
                        <FullscreenSelect
                          label={ui("طريقة استلام الدفعة الأولى")}
                          searchable={false}
                          value={partialPaymentMethod}
                          onChange={(nextMethod) =>
                            setPartialPaymentMethod(
                              nextMethod as "BANK_TRANSFER" | "CASH",
                            )
                          }
                          options={[
                            {
                              value: "BANK_TRANSFER",
                              label: ui("تحويل بنكي / الحساب البنكي SNB"),
                            },
                            { value: "CASH", label: ui("نقداً في الصندوق") },
                          ]}
                        />
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="theme-card rounded-2xl p-5 border border-sky-600/30 bg-sky-500/10">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-sm">
                      <FileSpreadsheet className="size-5" aria-hidden="true" />
                      <span>{ui("فاتورة مبدئية (عرض أسعار)")}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--text-main)] leading-relaxed">
                      {ui(
                        "الفاتورة المبدئية هي عرض سعر مبدئي لا يتطلب تسوية أو تحصيل في هذه المرحلة. يتم تأكيد الدفع عند إصدار الفاتورة الفعلية للعميل.",
                      )}
                    </p>
                  </section>
                )}

                {/* 4b. Collapsible "تفاصيل للمحاسب (تلقائية)" (§5 المرحلة الرابعة) */}
                {documentType !== "PROFORMA" && (
                  <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                    <button
                      type="button"
                      aria-expanded={showAccountantDetails}
                      onClick={() =>
                        setShowAccountantDetails(!showAccountantDetails)
                      }
                      className="flex min-h-11 sm:min-h-9 w-full items-center justify-between gap-3 text-start cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Landmark
                          className="size-4 sm:size-5 text-[var(--text-muted)] shrink-0"
                          aria-hidden="true"
                        />
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)]">
                            {ui(
                              "تفاصيل التوجيه المحاسبي (تلقائية ومخصصة للمحاسب)",
                            )}
                          </span>
                          <p className="text-xs text-[var(--text-muted)]">
                            {ui("حساب الإيراد")}: {revenueAccountCode} ·{" "}
                            {ui("حساب التسوية المالية")}:{" "}
                            {settlementAccountCode}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`size-4 text-[var(--text-muted)] transition-transform shrink-0 ${showAccountantDetails ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {showAccountantDetails && (
                      <div className="mt-4 pt-4 border-t theme-border grid gap-4 sm:grid-cols-2">
                        <FullscreenSelect
                          label={ui("حساب الإيراد")}
                          searchable={false}
                          value={revenueAccountCode}
                          onChange={(nextCode) => {
                            setRevenueAccountCode(nextCode);
                            setIsReviewed(false);
                          }}
                          options={[
                            {
                              value: "4101",
                              label: ui("4101 · إيرادات خدمات النقل والمطارات"),
                              badge: "4101",
                            },
                            {
                              value: "4102",
                              label: ui(
                                "4102 · إيرادات كبار الشخصيات والعمرة والزيارة",
                              ),
                              badge: "4102",
                            },
                          ]}
                        />
                        <FullscreenSelect
                          label={ui("حساب التسوية المالية")}
                          searchable={false}
                          value={settlementAccountCode}
                          onChange={(nextCode) => {
                            setSettlementAccountCode(nextCode);
                            setIsReviewed(false);
                          }}
                          options={[
                            {
                              value: "1103",
                              label: ui("1103 · ذمم العملاء (آجل)"),
                              badge: "1103",
                            },
                            {
                              value: "1102",
                              label: ui("1102 · البنك الأهلي السعودي - SNB"),
                              badge: "1102",
                            },
                            {
                              value: "1101",
                              label: ui("1101 · النقدية بالصندوق"),
                              badge: "1101",
                            },
                          ]}
                        />
                        <p className="sm:col-span-2 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                          {ui(
                            "يوجه النظام القيود تلقائياً بناءً على إجابتك في سؤال «هل دفع العميل؟». يمكنك تغيير الحساب هنا للمحاسبة المتقدمة فقط.",
                          )}
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* 4c. Pre-Issuance Summary & Review Card (§5 المرحلة الرابعة) */}
                <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
                  <div className="border-b theme-border pb-3.5 mb-4">
                    <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                      {ui("مراجعة بيانات المستند قبل الإصدار")}
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                      {ui(
                        "تأكد من صحة المبالغ والمسار قبل الضغط على زر الإصدار",
                      )}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                      <span className="text-[var(--text-muted)] block mb-1">
                        {ui("العميل والمستند:")}
                      </span>
                      <p className="font-bold text-sm text-[var(--text-main)]">
                        {buyer.name || "—"}
                      </p>
                      {phone.number && (
                        <p
                          className="text-[var(--text-muted)] font-mono mt-0.5"
                          dir="ltr"
                        >
                          {phone.number}
                        </p>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                      <span className="text-[var(--text-muted)] block mb-1">
                        {ui("مسار وموعد الرحلة:")}
                      </span>
                      <p className="font-bold text-sm text-[var(--text-main)]">
                        {transport.origin || "—"} {ui.dir === "rtl" ? "←" : "→"}{" "}
                        {transport.destination || "—"}
                      </p>
                      <p
                        className="text-[var(--text-muted)] font-mono mt-0.5"
                        dir="ltr"
                      >
                        {transport.tripDate || "—"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                      <span className="text-[var(--text-muted)] block mb-1">
                        {ui("تاريخ ووقت الفاتورة:")}
                      </span>
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

                    <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
                      <span className="text-[var(--text-muted)] block mb-1">
                        {ui("حالة السداد والمتبقي:")}
                      </span>
                      <p className="font-semibold font-mono text-sm">
                        {paymentStatusChoice === "FULLY_PAID" ? (
                          <span className="text-[var(--accent-gold)]">
                            {ui("مدفوع بالكامل (٠.٠٠ متبقي)")}
                          </span>
                        ) : paymentStatusChoice === "PARTIALLY_PAID" ? (
                          <span className="text-sky-700 dark:text-sky-300">
                            {ui("مدفوع:")} {partialPaymentAmount || "0"}{" "}
                            {ui("ر.س · متبقي:")} {remainingBalance} {ui("ر.س")}
                          </span>
                        ) : (
                          <span className="text-[var(--accent-gold)]">
                            {ui("آجل بالكامل (المتبقي:")} {estimate.gross}{" "}
                            {ui("ر.س)")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border sm:col-span-2">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[var(--text-muted)]">
                          {ui("الخدمات والضريبة:")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStage("PRICE_AND_TAX")}
                          className="text-xs font-semibold text-[var(--accent-gold)] hover:underline cursor-pointer"
                        >
                          {ui("تعديل")}
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {rows.map((row, idx) => (
                          <div
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                          >
                            <span
                              className={
                                row.input.description.trim()
                                  ? "font-semibold text-[var(--text-main)]"
                                  : "font-semibold text-rose-700 dark:text-rose-400"
                              }
                            >
                              {idx + 1}.{" "}
                              {row.input.description.trim() ||
                                ui("بند بدون وصف")}
                            </span>
                            <span
                              className="font-mono text-[var(--text-muted)]"
                              dir="ltr"
                            >
                              {estimate.lines[idx]?.gross
                                ? `${estimate.lines[idx].gross} ${ui("ر.س")}`
                                : "—"}{" "}
                              ({row.input.rate || "0"}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Auto-Send Invoice via WhatsApp Option */}
                  <div className="mt-4">
                    <AutoSendWhatsAppCard
                      checked={autoSendWhatsApp}
                      onCheckedChange={(next) => {
                        autoSendTouchedRef.current = true;
                        setAutoSendWhatsApp(next);
                      }}
                      phone={whatsAppPhoneOverride}
                      onPhoneChange={setWhatsAppPhoneOverride}
                      defaultPhoneHint={contactPhone || ""}
                      recipientLabel={ui("هاتف العميل")}
                      titleAr="إرسال الفاتورة تلقائياً للعميل عبر واتساب فور الإصدار"
                      subtitleAr="عند التفعيل سيُرسل ملف الفاتورة (PDF) للعميل مع إخطار رقم الإدارة ضمن مسار التدفق، دون تعطيل حفظ الفاتورة إذا كان الواتساب غير متصل."
                      waConnected={whatsAppMeta ? whatsAppMeta.connected : null}
                      adminFlowPhone={whatsAppMeta?.adminFlowPhone}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Review Checkbox */}
                  <div className="mt-4 pt-3.5 border-t theme-border">
                    <label
                      id="review-checkbox-label"
                      className={`flex min-h-11 sm:min-h-9 items-start gap-2.5 text-xs sm:text-sm leading-relaxed font-semibold cursor-pointer p-3 rounded-xl border transition ${
                        isReviewed
                          ? "border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] text-[var(--text-main)]"
                          : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/50"
                      }`}
                    >
                      <Checkbox
                        required
                        checked={isReviewed}
                        onChange={(e) => setIsReviewed(e.target.checked)}
                        className="mt-1 shrink-0"
                      />
                      <span>
                        {ui(
                          "أقر بأنني راجعت بيانات العميل والرحلة والأسعار والضريبة وهي صحيحة ومعتمدة للإصدار.",
                        )}
                      </span>
                    </label>
                  </div>
                </section>

                {/* Stage 4 Stepper Navigation & Primary Save Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={goToPreviousStage}
                    className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] transition cursor-pointer"
                  >
                    <ArrowRight
                      className="size-4 ltr:rotate-180"
                      aria-hidden="true"
                    />
                    <span>{ui("السابق")}</span>
                  </button>

                  <button
                    id="invoice-submit-btn"
                    type="submit"
                    disabled={!canSave}
                    className="gold-gradient-btn flex min-h-11 sm:min-h-9 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg px-6 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    <span>
                      {ui(
                        isSaving
                          ? "جارٍ الإصدار والحفظ…"
                          : documentType === "PROFORMA"
                            ? "حفظ الفاتورة المبدئية"
                            : "إصدار الفاتورة وتوليد PDF",
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </fieldset>

          {/* Sticky Financial Summary Sidebar on Desktop */}
          <aside className="min-w-0 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
            <fieldset disabled={isSaving} className="min-w-0 space-y-4">
              <section className="overflow-hidden rounded-2xl border theme-border bg-[var(--bg-card)]">
                <div className="border-b theme-border px-4 py-3.5 bg-[var(--bg-card-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--accent-gold)]">
                      {ui("ملخص المستند")}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-muted)] font-mono">
                      {rows.length} {ui(rows.length === 1 ? "خدمة" : "خدمات")}
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)] mt-1">
                    {ui(
                      documentType === "PROFORMA"
                        ? "فاتورة مبدئية"
                        : INVOICE_TYPE_LABELS[documentType],
                    )}
                  </h2>
                  {buyer.name && (
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate mt-0.5">
                      {ui("العميل:")} {buyer.name}
                    </p>
                  )}
                </div>

                <dl aria-live="polite" className="space-y-2.5 px-4 py-3.5 text-xs sm:text-sm">
                  {[
                    ["الإجمالي قبل الخصم", beforeDiscount.net],
                    ["قيمة الخصم", discountTotal],
                    ["المبلغ قبل الضريبة", estimate.net],
                    [
                      rows.every((r) => r.input.rate === "0")
                        ? "ضريبة القيمة المضافة (0%)"
                        : rows.every((r) => r.input.rate === "15")
                          ? "ضريبة القيمة المضافة (15%)"
                          : "ضريبة القيمة المضافة",
                      estimate.vat,
                    ],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-[var(--text-muted)]">
                        {ui(label)}
                      </dt>
                      <dd
                        className="font-mono font-bold text-[var(--text-main)]"
                        dir="ltr"
                      >
                        {amount(val)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Dark Slate Signature Total Box */}
                <div className="mx-3.5 mb-3.5 rounded-xl bg-slate-900 dark:bg-slate-800/95 p-3.5 text-white border border-slate-700">
                  <p className="text-xs text-slate-200 font-bold">
                    {ui("الإجمالي المطلوب شامل الضريبة")}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <strong
                      className="font-mono text-2xl font-semibold tracking-tight text-white"
                      dir="ltr"
                      data-testid="invoice-total"
                    >
                      {amount(estimate.gross)}
                    </strong>
                    <span className="text-xs sm:text-sm font-bold text-amber-300">
                      {ui("ر.س")}
                    </span>
                  </div>
                </div>

                {/* Remaining Amount Box if Partial or Not Paid */}
                {paymentStatusChoice !== "FULLY_PAID" && (
                  <div className="mx-4 mb-4 rounded-xl bg-[var(--accent-surface)] p-3.5 text-sm border border-[var(--accent-gold)]/35">
                    <div className="flex items-center justify-between text-[var(--accent-gold)] font-bold">
                      <span>{ui("المبلغ المتبقي:")}</span>
                      <span className="font-mono font-semibold" dir="ltr">
                        {amount(remainingBalance)} {ui("ر.س")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Desktop Stage Progression in Sidebar */}
                <div className="hidden lg:block border-t theme-border p-3.5 bg-[var(--bg-card-subtle)] space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-main)]">
                      {ui("المرحلة")}{" "}
                      {ui(STAGES.find((s) => s.id === currentStage)?.number)}:{" "}
                      {ui(STAGES.find((s) => s.id === currentStage)?.title)}
                    </span>
                    <span>
                      {ui(STAGES.find((s) => s.id === currentStage)?.number)} / {ui("٤")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentStage !== "DOCUMENT_AND_CUSTOMER" && (
                      <button
                        type="button"
                        onClick={goToPreviousStage}
                        className="flex-1 min-h-9 inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer"
                      >
                        <ArrowRight className="size-3.5 ltr:rotate-180" aria-hidden="true" />
                        <span>{ui("السابق")}</span>
                      </button>
                    )}
                    {currentStage !== "PAYMENT_AND_REVIEW" ? (
                      <button
                        type="button"
                        onClick={goToNextStage}
                        className="flex-1 min-h-9 gold-gradient-btn inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs hover:shadow-sm transition"
                      >
                        <span>{ui("التالي")}</span>
                        <ArrowLeft className="size-3.5 ltr:rotate-180" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isReviewed) setIsReviewed(true);
                          void submitInvoice(true);
                        }}
                        disabled={!canSave}
                        className="flex-1 min-h-9 gold-gradient-btn inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs hover:shadow-sm transition disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        <span>
                          {ui(
                            documentType === "PROFORMA"
                              ? "حفظ الفاتورة"
                              : "إصدار الفاتورة",
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {!estimate.isValid && (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-rose-700 dark:text-rose-400 font-bold">
                    {ui(estimate.error)}
                  </p>
                )}
              </section>

              {settings?.company && (
                <div className="rounded-xl border theme-border p-3.5 text-center text-sm text-[var(--text-muted)]">
                  <p className="font-bold text-[var(--text-main)] flex items-center justify-center gap-1.5">
                    <CheckCircle2
                      className="size-4 text-[var(--accent-gold)]"
                      aria-hidden="true"
                    />
                    <span>{settings.company.legalName}</span>
                  </p>
                  <p className="text-sm text-[var(--text-muted)] font-mono mt-0.5">
                    {ui("الرقم الضريبي:")} {settings.company.vatNumber}
                  </p>
                </div>
              )}
            </fieldset>
          </aside>
        </form>
      )}

      {/* Mobile Sticky Wizard Summary & Step Controls (never duplicates type="submit") */}
      {!isLoading && (
        <MobileStickyActionBar sticky={!inModal} className="mt-4">
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--text-muted)] block">
              {ui("الإجمالي الشامل")} · {ui("المرحلة")}{" "}
              {ui(STAGES.find((s) => s.id === currentStage)?.number)} /{" "}
              {ui("٤")}
            </span>
            <div className="flex items-baseline gap-1">
              <strong
                className="font-mono text-lg font-semibold text-[var(--text-main)]"
                dir="ltr"
              >
                {amount(estimate.gross)}
              </strong>
              <span className="text-sm font-bold text-[var(--accent-gold)]">
                {ui("ر.س")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentStage !== "DOCUMENT_AND_CUSTOMER" && (
              <button
                type="button"
                onClick={goToPreviousStage}
                className="min-h-11 px-3.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-sm font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] inline-flex items-center gap-1 cursor-pointer transition"
              >
                <ArrowRight
                  className="size-4 ltr:rotate-180"
                  aria-hidden="true"
                />
                <span>{ui("السابق")}</span>
              </button>
            )}

            {currentStage !== "PAYMENT_AND_REVIEW" ? (
              <button
                type="button"
                onClick={goToNextStage}
                className="gold-gradient-btn min-h-11 px-4 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition"
              >
                <span>{ui("التالي")}</span>
                <ArrowLeft
                  className="size-4 ltr:rotate-180"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!isReviewed) setIsReviewed(true);
                  void submitInvoice(true);
                }}
                disabled={!canSave}
                className="gold-gradient-btn min-h-11 px-4 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                <span>
                  {ui(
                    documentType === "PROFORMA"
                      ? "حفظ الفاتورة"
                      : "إصدار الفاتورة",
                  )}
                </span>
              </button>
            )}
          </div>
        </MobileStickyActionBar>
      )}

      <p className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Truck className="size-4" />
        <span>
          {ui(
            "تفاصيل الرحلة والمسار محفوظة مع الفاتورة · نسخة العميل المطبوعة تعرض أعداد الركاب فقط.",
          )}
        </span>
      </p>
    </div>
  );

  return workspaceContent;
}
