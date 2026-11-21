import type { InvoiceLineInput } from "@/lib/invoices";
import { moneyDecimal, moneyMinor } from "@/lib/money";

export type FormStage =
  | "DOCUMENT_AND_CUSTOMER"
  | "TRIP_AND_SERVICE"
  | "PRICE_AND_TAX"
  | "PAYMENT_AND_REVIEW";

export interface FormLine {
  id: string;
  input: InvoiceLineInput;
}

export interface BuyerForm {
  name: string;
  vatNumber: string;
  street: string;
  building: string;
  district: string;
  city: string;
  postalCode: string;
  commercialRegistration: string;
}

export const EMPTY_BUYER: BuyerForm = {
  name: "",
  vatNumber: "",
  street: "",
  building: "",
  district: "",
  city: "",
  postalCode: "",
  commercialRegistration: "",
};

export const INLINE_INPUT =
  "theme-input min-h-11 sm:min-h-9 w-full min-w-0 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";
export const INPUT = `mt-1.5 ${INLINE_INPUT}`;

export const STAGES: {
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

export function difference(before: string, after: string): string {
  const beforeMinor = moneyMinor(before);
  const afterMinor = moneyMinor(after);
  if (beforeMinor === null || afterMinor === null) return "—";
  const diff = beforeMinor - afterMinor;
  return moneyDecimal(diff < BigInt(0) ? BigInt(0) : diff);
}

export function amount(value: string): string {
  const [whole, decimals] = value.split(".");
  return decimals === undefined
    ? value
    : `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`;
}
