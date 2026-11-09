/** Parse exact decimal money without floating point or silent rounding. */
export function moneyMinor(value: string): bigint | null {
  const normalized = value.trim().replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

/** Signed decimal minor parser (`-123.45`, `+123.45`, or `123.45`). Returns 0n if invalid. */
export function signedMoneyMinor(value?: string | null): bigint {
  if (!value) return BigInt(0);
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-") || trimmed.startsWith("−");
  const hasSign = negative || trimmed.startsWith("+");
  const unsigned = hasSign ? trimmed.slice(1) : trimmed;
  const parsed = moneyMinor(unsigned);
  if (parsed === null) return BigInt(0);
  return negative && parsed !== BigInt(0) ? -parsed : parsed;
}

export function moneyDecimal(minor: bigint): string {
  const negative = minor < BigInt(0);
  const abs = negative ? -minor : minor;
  const formatted = `${abs / BigInt(100)}.${String(abs % BigInt(100)).padStart(2, "0")}`;
  return negative ? `-${formatted}` : formatted;
}

export function formatSignedMinor(minor: bigint): string {
  return moneyDecimal(minor);
}
