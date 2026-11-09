import type { UserRole } from "./types";
export type NavigationGroup = "overview" | "operations" | "people" | "finance" | "settings" | "captain";
export interface NavigationItem {
  href: string; ar: string; en: string; icon: string; group: NavigationGroup;
  roles: UserRole[]; superAdminOnly?: boolean; mobile?: boolean;
  action?: { href: string; ar: string; en: string };
}
export const NAVIGATION_GROUPS: Record<NavigationGroup, { ar: string; en: string }> = {
  overview: { ar: "نظرة عامة", en: "Overview" }, operations: { ar: "العمليات", en: "Operations" },
  people: { ar: "الأشخاص", en: "People" }, finance: { ar: "المالية", en: "Finance" },
  settings: { ar: "الإعدادات", en: "Settings" }, captain: { ar: "مساحة الكابتن", en: "Captain workspace" },
};
export const NAVIGATION: NavigationItem[] = [
  { href: "/admin", ar: "لوحة التحكم", en: "Dashboard", icon: "dashboard", group: "overview", roles: ["ADMIN"], mobile: true },
  { href: "/admin/contracts", ar: "العقود", en: "Contracts", icon: "contracts", group: "operations", roles: ["ADMIN"], mobile: true, action: { href: "/admin/contracts/new", ar: "إنشاء عقد", en: "Create contract" } },
  { href: "/admin/inspections", ar: "فحص المركبات", en: "Inspections", icon: "inspection", group: "operations", roles: ["ADMIN"] },
  { href: "/admin/fleet", ar: "أسطول المركبات", en: "Fleet", icon: "fleet", group: "operations", roles: ["ADMIN"] },
  { href: "/admin/captains", ar: "الكباتن", en: "Captains", icon: "captain", group: "operations", roles: ["ADMIN"] },
  { href: "/admin/customers", ar: "العملاء", en: "Customers", icon: "customers", group: "people", roles: ["ADMIN"] },
  { href: "/admin/staff", ar: "حسابات العاملين", en: "Staff accounts", icon: "staff", group: "people", roles: ["ADMIN"] },
  { href: "/admin/representatives", ar: "المناديب والعمولات", en: "Representatives", icon: "representatives", group: "people", roles: ["ADMIN"] },
  { href: "/admin/invoices", ar: "الفواتير", en: "Invoices", icon: "invoice", group: "finance", roles: ["ADMIN"], mobile: true, action: { href: "/admin/invoices/new", ar: "إنشاء فاتورة", en: "Create invoice" } },
  { href: "/admin/purchases", ar: "المشتريات والمصروفات", en: "Purchases & expenses", icon: "purchase", group: "finance", roles: ["ADMIN"] },
  { href: "/admin/accounting", ar: "المحاسبة", en: "Accounting", icon: "accounting", group: "finance", roles: ["ADMIN"] },
  { href: "/admin/accounts", ar: "دليل الحسابات", en: "Chart of accounts", icon: "accounts", group: "finance", roles: ["ADMIN"] },
  { href: "/admin/vat-returns", ar: "الإقرار الضريبي", en: "VAT returns", icon: "vat", group: "finance", roles: ["ADMIN"] },
  { href: "/admin/invoices/settings", ar: "الشركة والبنك", en: "Company & bank", icon: "company", group: "settings", roles: ["ADMIN"] },
  { href: "/admin/zatca", ar: "إعدادات ZATCA", en: "ZATCA settings", icon: "tax", group: "settings", roles: ["ADMIN"] },
  { href: "/admin/admins", ar: "المسؤولون", en: "Administrators", icon: "shield", group: "settings", roles: ["ADMIN"], superAdminOnly: true },
  { href: "/captain", ar: "الرئيسية", en: "Home", icon: "dashboard", group: "captain", roles: ["CAPTAIN"], mobile: true },
  { href: "/captain/inspection", ar: "الفحص اليومي", en: "Inspection", icon: "inspection", group: "captain", roles: ["CAPTAIN"], mobile: true },
  { href: "/captain/contract", ar: "العقود", en: "Contracts", icon: "contracts", group: "captain", roles: ["CAPTAIN"], mobile: true },
  { href: "/captain/account", ar: "حسابي", en: "Account", icon: "accounting", group: "captain", roles: ["CAPTAIN"], mobile: true },
];
export function navigationFor(role: UserRole, isSuperAdmin = false): NavigationItem[] {
  return NAVIGATION.filter(item => item.roles.includes(role) && (!item.superAdminOnly || isSuperAdmin));
}
export function routeInfo(pathname: string): NavigationItem | undefined {
  return [...NAVIGATION].sort((a, b) => b.href.length - a.href.length)
    .find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
export function routeLabel(pathname: string, language: "ar" | "en"): string {
  const route = routeInfo(pathname);
  if (!route) return language === "ar" ? "ميقات الخليج" : "Miqat Al Khaleej";
  if (pathname.endsWith("/new")) return route.action?.[language] || (language === "ar" ? `إنشاء ${route.ar}` : `Create ${route.en}`);
  if (pathname.endsWith("/edit")) {
    if (route.href === "/admin/contracts") return language === "ar" ? "تعديل العقد" : "Edit contract";
    return language === "ar" ? `تعديل ${route.ar}` : `Edit ${route.en}`;
  }
  if (pathname !== route.href) {
    if (route.href === "/admin/contracts") return language === "ar" ? "تفاصيل العقد" : "Contract details";
    if (route.href === "/admin/captains" && pathname.endsWith("/account")) return language === "ar" ? "الحساب المالي" : "Captain account";
    if (route.href === "/admin/customers") return language === "ar" ? "تفاصيل العميل" : "Customer details";
    if (route.href === "/admin/invoices") return language === "ar" ? "تفاصيل الفاتورة" : "Invoice details";
    if (route.href === "/admin/staff") return language === "ar" ? "ملف الموظف" : "Staff account";
    if (route.href === "/admin/vat-returns" && pathname.endsWith("/selected")) return language === "ar" ? "الفواتير المختارة" : "Selected invoices";
  }
  return route[language];
}
