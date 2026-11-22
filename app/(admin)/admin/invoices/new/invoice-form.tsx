"use client";
import { useUiText } from "@/lib/ui-text";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ReceiptText,
  Save,
  Truck,
} from "lucide-react";

import { type UnifiedDocChoice } from "./invoice-type-selector";
import { EMPTY_BANK } from "@/app/_components/InvoiceBankFields";
import { invoicePhoneFrom, invoicePhoneNumber } from "@/lib/invoice-phone";
import { type InvoiceContractOption } from "./contract-picker";
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
  creditLimitError,
  INVOICE_TYPE_LABELS,
  invoiceRequest,
  type InvoiceDocumentType,
  type Buyer,
  type InvoiceLineInput,
  type InvoiceSettings,
  type InvoiceDetail,
  type TaxDocument,
  type TaxOriginalRow,
} from "@/lib/invoices";
import { accountingRequest } from "@/lib/accounting";
import { moneyDecimal, moneyMinor } from "@/lib/money";
import { MobileStickyActionBar } from "@/app/_components/mobile";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";
import {
  fetchWhatsAppFlowOverview,
  fetchWhatsAppStatus,
  type WhatsAppAutoSendResult,
} from "@/lib/whatsapp";

import {
  amount,
  difference,
  EMPTY_BUYER,
  STAGES,
  type BuyerForm,
  type FormLine,
  type FormStage,
} from "./invoice-form-types";
import InvoiceSummarySidebar from "./invoice-summary-sidebar";
import StageDocumentCustomer from "./stage-document-customer";
import StageTripService from "./stage-trip-service";
import StagePriceTax from "./stage-price-tax";
import StagePaymentReview from "./stage-payment-review";

interface InvoiceFormProps {
  contractId?: string;
  initialDocumentType: InvoiceDocumentType;
  originalInvoiceId?: string;
  noteKind?: TaxDocument["kind"];
  inModal?: boolean;
  onClose?: () => void;
  onCreated?: (invoiceId: string) => void;
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
  const text = (ar: string, en: string) => (ui.language === "en" ? en : ar);
  const { user, isLoading: authLoading } = useAuth();
  const canViewWhatsApp = hasClientPermission(user, "whatsapp", "view");

  const router = useRouter();

  const [currentStage, setCurrentStage] = useState<FormStage>(
    "DOCUMENT_AND_CUSTOMER",
  );

  const [customerSubtype, setCustomerSubtype] = useState<"BOOKING" | "TAX">(
    initialDocumentType === "TAX" ? "TAX" : "BOOKING",
  );
  const [documentType, setDocumentType] =
    useState<InvoiceDocumentType>(initialDocumentType);
  const [taxDocument, setTaxDocument] = useState<TaxDocument>({
    kind: noteKind,
    profile: "SIMPLIFIED",
    supplyDate: saudiDateTimeInput().slice(0, 10),
    ...(originalInvoiceId ? { originalInvoiceId } : {}),
  });
  const manualProfileRef = useRef(false);

  const isTaxMode = documentType === "TAX" || taxDocument.kind !== "INVOICE";
  const isCreditNote = isTaxMode && taxDocument.kind === "CREDIT";

  const [original, setOriginal] = useState<InvoiceDetail | null>(null);
  const [origSearch, setOrigSearch] = useState("");
  const [origOptions, setOrigOptions] = useState<TaxOriginalRow[]>([]);
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
    if (authLoading) return;
    let active = true;
    void Promise.allSettled([
      fetchWhatsAppStatus(),
      canViewWhatsApp ? fetchWhatsAppFlowOverview() : Promise.resolve(null),
    ]).then(([statusRes, flowRes]) => {
      if (!active) return;
      const connected =
        statusRes.status === "fulfilled" && statusRes.value.status === "connected";
      const flowConfig =
        flowRes.status === "fulfilled" ? flowRes.value?.config ?? null : null;
      setWhatsAppMeta({
        connected,
        adminFlowPhone: flowConfig?.adminPhone?.trim() || "",
      });
      if (flowConfig?.autoSendInvoiceDefault && !autoSendTouchedRef.current) {
        setAutoSendWhatsApp(true);
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, canViewWhatsApp]);

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

  const [showAccountantDetails, setShowAccountantDetails] = useState(false);
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

  const paymentCode =
    paymentStatusChoice === "FULLY_PAID"
      ? fullPaymentMethod === "CASH"
        ? "10"
        : fullPaymentMethod === "CARD"
          ? "48"
          : "42"
      : "30";

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

  const handleDocChoice = (choice: UnifiedDocChoice) => {
    setIsReviewed(false);
    setError("");
    if (choice === "CUSTOMER") {
      setDocumentType(customerSubtype);
      setOriginal(null);
      setTaxDocument((prev) => ({
        ...prev,
        kind: "INVOICE",
        originalInvoiceId: undefined,
        adjustmentReason: undefined,
        adjustmentEventDate: undefined,
      }));
    } else if (choice === "PROFORMA") {
      setDocumentType("PROFORMA");
      setOriginal(null);
      setTaxDocument((prev) => ({
        ...prev,
        kind: "INVOICE",
        originalInvoiceId: undefined,
        adjustmentReason: undefined,
        adjustmentEventDate: undefined,
      }));
    } else if (choice === "CREDIT_NOTE") {
      setDocumentType("TAX");
      setTaxDocument((prev) => ({ ...prev, kind: "CREDIT" }));
      if (paymentStatusChoice === "PARTIALLY_PAID") {
        setPaymentStatusChoice("NOT_PAID");
        setSettlementAccountCode("1103");
        setPartialPaymentAmount("");
      }
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
                  `خدمة نقل من ${origin} إلى ${destination}`.slice(0, 200),
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
      void invoiceRequest<{ items: TaxOriginalRow[] }>(
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
  const sellerMissingTax = Boolean(
    isTaxMode &&
      settings?.company &&
      (!settings.company.vatNumber ||
        !settings.company.commercialRegistration ||
        !settings.company.address),
  );
  const selectedOrigSummary = origOptions.find(
    (item) => item.id === original?.id,
  );
  const creditCapError =
    isCreditNote && estimate.isValid
      ? creditLimitError(
          estimate.gross,
          original?.creditBalance || selectedOrigSummary,
          ui.language === "en",
        )
      : "";
  const canSave =
    Boolean(settings?.company) &&
    !isLoading &&
    !isSaving &&
    !isSourceLoading &&
    !sourceError;

  function updateBuyer(change: Partial<BuyerForm>) {
    const nextBuyer = { ...buyer, ...change };
    setBuyer({
      name: nextBuyer.name ?? "",
      vatNumber: nextBuyer.vatNumber ?? "",
      street: nextBuyer.street ?? "",
      building: nextBuyer.building ?? "",
      district: nextBuyer.district ?? "",
      city: nextBuyer.city ?? "",
      postalCode: nextBuyer.postalCode ?? "",
      commercialRegistration: nextBuyer.commercialRegistration ?? "",
    });
    if (
      isTaxMode &&
      !original &&
      !manualProfileRef.current &&
      (change.vatNumber !== undefined ||
        change.commercialRegistration !== undefined)
    ) {
      const hasTaxId = Boolean(
        nextBuyer.vatNumber.trim() || nextBuyer.commercialRegistration.trim(),
      );
      setTaxDocument((currDoc) => ({
        ...currDoc,
        profile: hasTaxId ? "STANDARD" : "SIMPLIFIED",
      }));
    }
    if (change.vatNumber || change.commercialRegistration) {
      setShowBuyerDetails(true);
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

  const validateTaxDatesError = (): string => {
    if (!isTaxMode || taxDocument.kind === "INVOICE" || !taxDocument.adjustmentEventDate) {
      return "";
    }
    const eventDate = taxDocument.adjustmentEventDate.trim();
    const issueDay = invoiceDate.slice(0, 10) || saudiDateTimeInput().slice(0, 10);
    if (eventDate > issueDay) {
      return text(
        "تاريخ واقعة الإشعار لا يمكن أن يتجاوز تاريخ إصدار الإشعار.",
        "Adjustment event date cannot be later than the note issue date.",
      );
    }
    if (original) {
      const origIssue = original.invoiceDate.slice(0, 10);
      const origSupply = original.snapshot.input.taxDocument?.supplyDate || origIssue;
      const origPoint = origSupply < origIssue ? origSupply : origIssue;
      if (eventDate < origPoint) {
        return text(
          `تاريخ واقعة الإشعار لا يسبق تاريخ الفاتورة أو التوريد الأصلي (${origPoint}).`,
          `Adjustment event date cannot precede the original tax/supply date (${origPoint}).`,
        );
      }
    }
    return "";
  };

  const goToNextStage = () => {
    setError("");
    if (currentStage === "DOCUMENT_AND_CUSTOMER") {
      if (sellerMissingTax) {
        showError(
          text(
            "أكمل الرقم الضريبي والسجل التجاري والعنوان الوطني في إعدادات الشركة لإصدار مستند ضريبي.",
            "Complete seller VAT, CRN, and National Address in Company Settings before creating a tax document.",
          ),
        );
        return;
      }
      if (stage1Issue) {
        if (stage1Issue.openBuyerDetails) setShowBuyerDetails(true);
        showError(stage1Issue.error);
        return;
      }
      const taxDateErr = validateTaxDatesError();
      if (taxDateErr) {
        showError(taxDateErr);
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
      if (creditCapError) {
        showError(creditCapError);
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

  async function submitInvoice(reviewedOverride?: boolean) {
    const reviewed = reviewedOverride ?? isReviewed;
    if (!canSave) return;
    setError("");
    setHasTransportError(false);

    if (sellerMissingTax) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      showError(
        text(
          "أكمل الرقم الضريبي والسجل التجاري والعنوان الوطني في إعدادات الشركة لإصدار مستند ضريبي.",
          "Complete seller VAT, CRN, and National Address in Company Settings before creating a tax document.",
        ),
      );
      return;
    }

    if (stage1Issue) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      if (stage1Issue.openBuyerDetails) setShowBuyerDetails(true);
      showError(stage1Issue.error);
      return;
    }

    const taxDateErr = validateTaxDatesError();
    if (taxDateErr) {
      setCurrentStage("DOCUMENT_AND_CUSTOMER");
      showError(taxDateErr);
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

    if (creditCapError) {
      setCurrentStage("PRICE_AND_TAX");
      showError(creditCapError);
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
      !isCreditNote &&
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
                    iban: bankDetails.iban.replace(/\s/g, "").toUpperCase(),
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
                kind: taxDocument.kind,
                profile: taxDocument.profile,
                supplyDate: taxDocument.supplyDate,
                ...(taxDocument.kind !== "INVOICE"
                  ? {
                      originalInvoiceId: taxDocument.originalInvoiceId,
                      adjustmentReason: taxDocument.adjustmentReason?.trim(),
                      ...(taxDocument.adjustmentEventDate?.trim()
                        ? {
                            adjustmentEventDate:
                              taxDocument.adjustmentEventDate.trim(),
                          }
                        : {}),
                    }
                  : {}),
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
        let payWarn = "";
        if (
          documentType !== "PROFORMA" &&
          !isCreditNote &&
          paymentStatusChoice === "PARTIALLY_PAID" &&
          partialMinor !== null &&
          partialMinor > BigInt(0)
        ) {
          const payRes = await accountingRequest("/payments", "POST", {
            operationKey: crypto.randomUUID(),
            documentType: "SALE",
            documentId: result.data.id,
            amount: moneyDecimal(partialMinor),
            paymentDate: invoiceDate.slice(0, 10),
            cashAccount: partialPaymentMethod === "CASH" ? "1101" : "1102",
            reference: `دفعة أولى مستلمة عند إصدار الفاتورة #${result.data.id.slice(0, 8)}`,
          });
          if (!payRes.success) {
            payWarn =
              payRes.error ||
              text(
                "تعذر تسجيل الدفعة المبدئية تلقائياً؛ يرجى تسجيلها من زر تسجيل الدفعة.",
                "Could not post initial receipt voucher; please record it via Record Payment.",
              );
          }
        }

        if (onCreated) {
          onCreated(result.data.id);
        } else {
          const waAuto = result.data.whatsAppAutoSend;
          const sp = new URLSearchParams();
          if (waAuto?.attempted) {
            sp.set("waAuto", waAuto.success ? "sent" : "error");
            if (waAuto.phone) sp.set("waPhone", waAuto.phone);
            if (waAuto.error) sp.set("waMsg", waAuto.error);
            if (waAuto.adminPhone && waAuto.adminNotified) {
              sp.set("waAdmin", waAuto.adminPhone);
            }
          }
          if (payWarn) sp.set("payWarn", payWarn);
          const qs = sp.toString();
          router.push(
            `/admin/invoices/${encodeURIComponent(result.data.id)}${qs ? `?${qs}` : ""}`,
          );
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

  return (
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
          <fieldset
            disabled={isSaving || isSourceLoading}
            className="min-w-0 space-y-5 disabled:opacity-75"
          >
            {currentStage === "DOCUMENT_AND_CUSTOMER" && (
              <StageDocumentCustomer
                documentType={documentType}
                taxDocument={taxDocument}
                isTaxMode={isTaxMode}
                sellerMissingTax={sellerMissingTax}
                original={original}
                origSearch={origSearch}
                origOptions={origOptions}
                origSearchError={origSearchError}
                selectedOrigSummary={selectedOrigSummary}
                creditCapError={creditCapError}
                selectedContract={selectedContract}
                isSourceLoading={isSourceLoading}
                sourceError={sourceError}
                customerId={customerId}
                buyer={buyer}
                showBuyerDetails={showBuyerDetails}
                phone={phone}
                booking={booking}
                transport={transport}
                inModal={inModal}
                onClose={onClose}
                onDocChoice={handleDocChoice}
                onSwitchCustomerSubtype={(subtype) => {
                  setCustomerSubtype(subtype);
                  setDocumentType(subtype);
                  setIsReviewed(false);
                }}
                onChangeTaxProfile={(nextProfile) => {
                  manualProfileRef.current = true;
                  setTaxDocument((current) => ({
                    ...current,
                    profile: nextProfile,
                  }));
                  if (nextProfile === "STANDARD") {
                    setShowBuyerDetails(true);
                  }
                  setIsReviewed(false);
                }}
                onUpdateTaxDocument={(updater) => {
                  setTaxDocument(updater);
                  setIsReviewed(false);
                }}
                onOrigSearchChange={setOrigSearch}
                onSelectOriginal={(id) => void selectOriginal(id)}
                onSelectContract={(c) => void selectContract(c)}
                onClearContract={clearContract}
                onSelectCustomer={(nextId, patch) => {
                  setCustomerId(nextId);
                  if (patch) {
                    setBuyer(patch.buyer);
                    if (patch.phone) setPhone(patch.phone);
                    setTaxDocument((v) => ({
                      ...v,
                      profile: patch.profile,
                    }));
                  }
                }}
                onUpdateBuyer={updateBuyer}
                onToggleBuyerDetails={() => setShowBuyerDetails((v) => !v)}
                onChangePhone={(v) => {
                  setPhone(v);
                  setIsReviewed(false);
                }}
                onUpdateBooking={updateBooking}
                onUpdateTransport={updateTransport}
                onNext={goToNextStage}
              />
            )}

            {currentStage === "TRIP_AND_SERVICE" && (
              <StageTripService
                booking={booking}
                transport={transport}
                vehicles={vehicles}
                isLoadingVehicles={isLoadingVehicles}
                vehicleError={vehicleError}
                selectedContract={selectedContract}
                hasTransportError={hasTransportError}
                showSupplementalTrip={showSupplementalTrip}
                onToggleSupplementalTrip={() =>
                  setShowSupplementalTrip((v) => !v)
                }
                onSelectContract={(c) => void selectContract(c)}
                onRetryVehicles={() => {
                  setIsLoadingVehicles(true);
                  setVehicleReload((v) => v + 1);
                }}
                onBookingChange={updateBooking}
                onTransportChange={updateTransport}
                onTransportReplace={(v) => {
                  setTransport(v);
                  setIsReviewed(false);
                }}
                onBack={goToPreviousStage}
                onNext={goToNextStage}
              />
            )}

            {currentStage === "PRICE_AND_TAX" && (
              <StagePriceTax
                documentType={documentType}
                isTaxMode={isTaxMode}
                rows={rows}
                lineEstimates={estimate.lines}
                creditCapError={creditCapError}
                hasBankDetails={hasBankDetails}
                bankDetails={bankDetails}
                onUpdateRow={updateRow}
                onRemoveRow={(id) => {
                  setRows((current) =>
                    current.filter((item) => item.id !== id),
                  );
                  setIsReviewed(false);
                }}
                onAddService={addService}
                onToggleBank={(v) => {
                  setHasBankDetails(v);
                  setIsReviewed(false);
                }}
                onChangeBank={(v) => {
                  setBankDetails(v);
                  setIsReviewed(false);
                }}
                onBack={goToPreviousStage}
                onNext={goToNextStage}
              />
            )}

            {currentStage === "PAYMENT_AND_REVIEW" && (
              <StagePaymentReview
                documentType={documentType}
                isCreditNote={isCreditNote}
                paymentStatusChoice={paymentStatusChoice}
                fullPaymentMethod={fullPaymentMethod}
                partialPaymentAmount={partialPaymentAmount}
                partialPaymentMethod={partialPaymentMethod}
                showAccountantDetails={showAccountantDetails}
                revenueAccountCode={revenueAccountCode}
                settlementAccountCode={settlementAccountCode}
                buyer={buyer}
                contactPhone={contactPhone || ""}
                transport={transport}
                invoiceDate={invoiceDate}
                estimateGross={estimate.gross}
                remainingBalance={remainingBalance}
                rows={rows}
                lineEstimates={estimate.lines}
                autoSendWhatsApp={autoSendWhatsApp}
                whatsAppPhoneOverride={whatsAppPhoneOverride}
                whatsAppMeta={whatsAppMeta}
                isReviewed={isReviewed}
                isSaving={isSaving}
                canSave={canSave}
                onChangePaymentStatusChoice={changePaymentStatusChoice}
                onChangeFullPaymentMethod={changeFullPaymentMethod}
                onChangePartialPaymentAmount={setPartialPaymentAmount}
                onChangePartialPaymentMethod={setPartialPaymentMethod}
                onToggleAccountantDetails={() =>
                  setShowAccountantDetails((v) => !v)
                }
                onChangeRevenueAccount={(nextCode) => {
                  setRevenueAccountCode(nextCode);
                  setIsReviewed(false);
                }}
                onChangeSettlementAccount={(nextCode) => {
                  setSettlementAccountCode(nextCode);
                  setIsReviewed(false);
                }}
                onChangeInvoiceDate={(val) => {
                  setInvoiceDate(val);
                  setIsReviewed(false);
                }}
                onEditPricingStage={() => setCurrentStage("PRICE_AND_TAX")}
                onAutoSendWhatsAppChange={(next) => {
                  autoSendTouchedRef.current = true;
                  setAutoSendWhatsApp(next);
                }}
                onWhatsAppPhoneChange={setWhatsAppPhoneOverride}
                onChangeReviewed={setIsReviewed}
                onBack={goToPreviousStage}
              />
            )}
          </fieldset>

          {/* Calm Sticky Financial Summary Sidebar on Desktop (no duplicate action buttons) */}
          <InvoiceSummarySidebar
            documentType={documentType}
            buyer={buyer}
            rows={rows}
            beforeDiscountNet={beforeDiscount.net}
            discountTotal={discountTotal}
            estimateNet={estimate.net}
            estimateVat={estimate.vat}
            estimateGross={estimate.gross}
            estimateIsValid={estimate.isValid}
            estimateError={estimate.error}
            paymentStatusChoice={paymentStatusChoice}
            remainingBalance={remainingBalance}
            company={settings?.company}
            isSaving={isSaving}
          />
        </form>
      )}

      {/* Mobile Sticky Wizard Summary & Step Controls */}
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
}
