import type { InvoiceLineInput } from "./invoices";

export interface InvoiceEstimate {
  isValid: boolean;
  error?: string;
  net: string;
  vat: string;
  gross: string;
  lines: { net: string; vat: string; gross: string }[];
}
const SCALE = BigInt(1_000_000);
const CENT_DIVISOR = BigInt(10_000_000_000);
function decimal(value: string): bigint {
  if (!/^\d{1,10}(\.\d{1,6})?$/.test(value)) throw new Error("أدخل الكمية والسعر بأرقام موجبة وبدون فواصل آلاف.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
}
function cents(value: string): bigint {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) throw new Error("أدخل الخصم بمنزلتين عشريتين كحد أقصى.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
function money(value: bigint): string { return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, "0")}`; }
function tax(net: bigint, rate: string): bigint { return (net * BigInt(rate) + BigInt(50)) / BigInt(100); }
export function estimateInvoice(lines: InvoiceLineInput[]): InvoiceEstimate {
  try {
    if (!lines.length) throw new Error("أضف خدمة واحدة على الأقل.");
    const groups = new Map<string, { net: bigint; rate: string }>();
    let totalNet = BigInt(0);
    const calculated = lines.map(line => {
      if (!line.category || !["S", "Z", "E", "O"].includes(line.category)) throw new Error("اختر المعالجة الضريبية لكل خدمة لعرض الإجمالي.");
      if ((line.category === "S" && line.rate !== "15") || (line.category !== "S" && line.rate !== "0")) throw new Error("راجع نسبة الضريبة المحددة للخدمة.");
      const quantity = decimal(line.quantity), price = decimal(line.unitPrice);
      if (quantity === BigInt(0)) throw new Error("الكمية يجب أن تكون أكبر من صفر.");
      const raw = quantity * price - cents(line.discount || "0") * CENT_DIVISOR;
      if (raw < BigInt(0)) throw new Error("خصم الخدمة يتجاوز قيمتها.");
      const net = (raw + CENT_DIVISOR / BigInt(2)) / CENT_DIVISOR;
      const vat = tax(net, line.rate);
      const key = [line.category, line.rate, line.exemptionCode || "", line.exemptionReason || ""].join("|");
      const group = groups.get(key) || { net: BigInt(0), rate: line.rate };
      group.net += net; groups.set(key, group); totalNet += net;
      return { net: money(net), vat: money(vat), gross: money(net + vat) };
    });
    let totalVat = BigInt(0);
    for (const group of groups.values()) totalVat += tax(group.net, group.rate);
    if (totalNet + totalVat > BigInt("999999999999999999")) throw new Error("إجمالي الفاتورة يتجاوز الحد المسموح.");
    return { isValid: true, net: money(totalNet), vat: money(totalVat), gross: money(totalNet + totalVat), lines: calculated };
  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : "راجع قيم الخدمات.", net: "—", vat: "—", gross: "—", lines: [] };
  }
}
export function saudiDateTimeInput(now = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
export function emptyInvoiceLine(index = 1): InvoiceLineInput {
  return { code: `TRP-${String(index).padStart(2, "0")}`, description: "", billingUnit: "TRIP", quantity: "1", unitPrice: "", discount: "0", category: "", rate: "", component: "OWN_SUPPLY", taxReviewed: false };
}
