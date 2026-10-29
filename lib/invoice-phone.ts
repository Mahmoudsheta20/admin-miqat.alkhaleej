import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
export interface InvoicePhone { country: CountryCode; number: string }
export interface PhoneCountry { country: CountryCode; name: string; callingCode: string }
const names = new Intl.DisplayNames(["ar"], { type: "region" });
const PRIORITY: CountryCode[] = ["SA", "EG", "AE", "KW", "QA", "BH", "OM", "JO"];
export const PHONE_COUNTRIES: PhoneCountry[] = getCountries().map(country => ({ country, name: names.of(country) || country, callingCode: getCountryCallingCode(country) })).sort((a, b) => {
  const left = PRIORITY.indexOf(a.country), right = PRIORITY.indexOf(b.country);
  if (left !== -1 || right !== -1) return (left === -1 ? PRIORITY.length : left) - (right === -1 ? PRIORITY.length : right);
  return a.name.localeCompare(b.name, "ar");
});
function digits(value: string): string {
  return value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0)).trim().replace(/^00/, "+");
}
function parsedPhone(number: string, country: CountryCode) {
  const value = digits(number);
  if (!/^[+\d\s().-]+$/.test(value)) return undefined;
  return parsePhoneNumberFromString(value, { defaultCountry: country, extract: false });
}
export function invoicePhoneFrom(value = "", country: CountryCode = "SA"): InvoicePhone {
  const parsed = parsedPhone(value, country);
  const candidates = parsed?.getPossibleCountries() || [];
  const selected = parsed?.country || (candidates.includes(country) ? country : candidates[0]);
  return parsed && selected ? { country: selected, number: parsed.nationalNumber } : { country, number: digits(value) };
}
export function updateInvoicePhone(phone: InvoicePhone, value: string): InvoicePhone {
  const normalized = digits(value);
  if (normalized.startsWith("+")) return invoicePhoneFrom(normalized, phone.country);
  return { ...phone, number: value };
}
export function invoicePhoneNumber(phone: InvoicePhone): string | undefined {
  const parsed = parsedPhone(phone.number, phone.country);
  if (!parsed?.isPossible() || parsed.ext || parsed.countryCallingCode !== getCountryCallingCode(phone.country)) return undefined;
  return parsed.number;
}
