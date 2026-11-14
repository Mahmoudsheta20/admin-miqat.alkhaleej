import { SUPER_ADMIN_EMAIL, isSuperAdmin } from "./adminConstants";
import type { SystemUser } from "./types";

export const PERMISSION_ACTIONS = ["view", "write", "delete", "approve"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  "dashboard",
  "contracts",
  "inspections",
  "fleet",
  "captains",
  "customers",
  "staff",
  "invoices",
  "purchases",
  "accounting",
  "accounts",
  "vatReturns",
  "companySettings",
  "zatca",
  "whatsapp",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export interface ModulePermission {
  view?: boolean;
  write?: boolean;
  delete?: boolean;
  approve?: boolean;
}

export type AdminPermissions = Partial<Record<PermissionModule, ModulePermission>>;

export type PermissionPresetKey =
  | "full"
  | "finance_accounts"
  | "operations"
  | "read_only";

export type PermissionGroupKey =
  | "overview"
  | "operations"
  | "people"
  | "finance"
  | "settings";

export interface PermissionModuleDefinition {
  id: PermissionModule;
  group: PermissionGroupKey;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
  actions: readonly PermissionAction[];
}

export const PERMISSION_GROUP_LABELS: Record<
  PermissionGroupKey,
  { ar: string; en: string }
> = {
  overview: { ar: "لوحة المتابعة", en: "Overview" },
  operations: { ar: "العمليات والأسطول", en: "Operations & Fleet" },
  people: { ar: "العملاء والعاملون", en: "People & Payroll" },
  finance: { ar: "الحسابات والفواتير والضرائب", en: "Accounting, Invoices & Tax" },
  settings: { ar: "الإعدادات والربط", en: "Settings & Integrations" },
};

export const PERMISSION_ACTION_LABELS: Record<
  PermissionAction,
  { ar: string; en: string }
> = {
  view: { ar: "عرض", en: "View" },
  write: { ar: "إنشاء وتعديل", en: "Create & Edit" },
  delete: { ar: "حذف / أرشفة", en: "Delete / Archive" },
  approve: { ar: "اعتماد وعكس", en: "Approve & Reverse" },
};

export const PERMISSION_MODULE_CATALOG: readonly PermissionModuleDefinition[] = [
  {
    id: "dashboard",
    group: "overview",
    ar: "لوحة التحكم",
    en: "Dashboard",
    descriptionAr: "الإحصائيات العامة والملخص التنفيذي",
    descriptionEn: "Workspace KPIs and executive overview",
    actions: ["view"],
  },
  {
    id: "contracts",
    group: "operations",
    ar: "العقود",
    en: "Contracts",
    descriptionAr: "إدارة عقود النقل والموافقة عليها وأرشفتها",
    descriptionEn: "Manage, approve, and delete transport contracts",
    actions: ["view", "write", "delete", "approve"],
  },
  {
    id: "inspections",
    group: "operations",
    ar: "فحص المركبات",
    en: "Inspections",
    descriptionAr: "مراجعة واعتماد تقارير الفحص اليومي",
    descriptionEn: "Review and manage daily vehicle inspections",
    actions: ["view", "write", "delete"],
  },
  {
    id: "fleet",
    group: "operations",
    ar: "أسطول المركبات",
    en: "Fleet",
    descriptionAr: "المركبات واللوحات والوثائق",
    descriptionEn: "Vehicles, plates, and expiry tracking",
    actions: ["view", "write", "delete"],
  },
  {
    id: "captains",
    group: "operations",
    ar: "الكباتن",
    en: "Captains",
    descriptionAr: "ملفات السائقين وكلمات المرور والحذف",
    descriptionEn: "Driver profiles, credentials, and removal",
    actions: ["view", "write", "delete"],
  },
  {
    id: "customers",
    group: "people",
    ar: "العملاء",
    en: "Customers",
    descriptionAr: "دليل العملاء وكشوف الأرصدة",
    descriptionEn: "Customer directory and receivables ledger",
    actions: ["view", "write"],
  },
  {
    id: "staff",
    group: "people",
    ar: "حسابات العاملين والمناديب",
    en: "Staff & Representatives",
    descriptionAr: "الرواتب والعهد والسلف والعمولات واعتماد المسيرات",
    descriptionEn: "Staff subledgers, commissions, and payroll approval",
    actions: ["view", "write", "approve"],
  },
  {
    id: "invoices",
    group: "finance",
    ar: "الفواتير",
    en: "Invoices",
    descriptionAr: "الفواتير الضريبية والحجوزات والإشعارات الدائنة والأرشفة",
    descriptionEn: "Tax/booking invoices, PDFs, and archiving",
    actions: ["view", "write", "delete"],
  },
  {
    id: "purchases",
    group: "finance",
    ar: "المشتريات والمصروفات",
    en: "Purchases & Expenses",
    descriptionAr: "فواتير الموردين والمرفقات والإلغاء",
    descriptionEn: "Supplier bills, attachments, and voiding",
    actions: ["view", "write", "delete"],
  },
  {
    id: "accounting",
    group: "finance",
    ar: "المحاسبة والقيود والمدفوعات",
    en: "Accounting & Payments",
    descriptionAr: "التقارير المالية والقيود اليدوية والسداد وإقفال الفترات",
    descriptionEn: "Financial reports, journals, payments, and period close",
    actions: ["view", "write", "approve"],
  },
  {
    id: "accounts",
    group: "finance",
    ar: "دليل الحسابات",
    en: "Chart of Accounts",
    descriptionAr: "عرض وإضافة وتعديل شجرة الحسابات",
    descriptionEn: "View, create, and update GL accounts",
    actions: ["view", "write"],
  },
  {
    id: "vatReturns",
    group: "finance",
    ar: "الإقرار الضريبي",
    en: "VAT Returns",
    descriptionAr: "مراجعة الإقرار الربع سنوي وتعديل التعديلات والاختيارات",
    descriptionEn: "Quarterly VAT boxes, adjustments, and selections",
    actions: ["view", "write"],
  },
  {
    id: "companySettings",
    group: "settings",
    ar: "بيانات الشركة والبنك",
    en: "Company & Bank",
    descriptionAr: "تعديل السجل التجاري والرقم الضريبي والحساب البنكي للفواتير",
    descriptionEn: "Company tax registration and invoice bank defaults",
    actions: ["view", "write"],
  },
  {
    id: "zatca",
    group: "settings",
    ar: "إعدادات الفوترة ZATCA",
    en: "ZATCA E-Invoicing",
    descriptionAr: "أجهزة الفوترة والشهادات وإصدار الفواتير الإلكترونية",
    descriptionEn: "EGS devices, CSIDs, and ZATCA invoice clearance",
    actions: ["view", "write", "approve"],
  },
  {
    id: "whatsapp",
    group: "settings",
    ar: "الواتساب ونظام التدفق",
    en: "WhatsApp & Flow",
    descriptionAr: "ربط الواتساب وإرسال الرسائل وتخصيص خطوات التفاعل",
    descriptionEn: "WhatsApp connection, sending, and flow rules",
    actions: ["view", "write"],
  },
];

export const PERMISSION_PRESETS: ReadonlyArray<{
  key: PermissionPresetKey;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
}> = [
  {
    key: "finance_accounts",
    ar: "الحسابات والفواتير فقط",
    en: "Accounting & Invoices",
    descriptionAr: "الفواتير، المشتريات، المحاسبة، دليل الحسابات، الإقرار الضريبي، ZATCA، وبيانات الشركة",
    descriptionEn: "Invoices, purchases, accounting, chart of accounts, VAT returns, ZATCA, company bank",
  },
  {
    key: "operations",
    ar: "العمليات والأسطول",
    en: "Operations & Fleet",
    descriptionAr: "العقود، الفحوصات، المركبات، الكباتن، العملاء، والواتساب",
    descriptionEn: "Contracts, inspections, fleet, captains, customers, and WhatsApp",
  },
  {
    key: "read_only",
    ar: "عرض فقط",
    en: "Read-Only",
    descriptionAr: "صلاحية الاطلاع على جميع الأقسام بدون إنشاء أو تعديل أو حذف",
    descriptionEn: "View-only access across modules with no write or delete actions",
  },
  {
    key: "full",
    ar: "صلاحيات كاملة",
    en: "Full Admin",
    descriptionAr: "كافة صلاحيات الأقسام (باستثناء إدارة حسابات المسؤولين)",
    descriptionEn: "All module permissions (excluding Super Admin account management)",
  },
];

const MODULE_ACTIONS_LOOKUP: Record<PermissionModule, readonly PermissionAction[]> =
  Object.fromEntries(
    PERMISSION_MODULE_CATALOG.map((item) => [item.id, item.actions])
  ) as Record<PermissionModule, readonly PermissionAction[]>;

export function buildFullPermissions(): AdminPermissions {
  const full: AdminPermissions = {};
  for (const mod of PERMISSION_MODULES) {
    const entry: ModulePermission = {};
    for (const action of MODULE_ACTIONS_LOOKUP[mod]) {
      entry[action] = true;
    }
    full[mod] = entry;
  }
  return full;
}

export function normalizePermissionsInput(raw: unknown): AdminPermissions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const source = raw as Record<string, unknown>;
  const cleaned: AdminPermissions = {};

  for (const mod of PERMISSION_MODULES) {
    const rawEntry = source[mod];
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const record = rawEntry as Record<string, unknown>;
    const supported = MODULE_ACTIONS_LOOKUP[mod];
    const nextEntry: ModulePermission = {};
    let hasElevated = false;

    for (const action of supported) {
      if (record[action] === true) {
        nextEntry[action] = true;
        if (action !== "view") hasElevated = true;
      }
    }

    if (hasElevated) {
      nextEntry.view = true;
    }

    if (Object.keys(nextEntry).length > 0) {
      cleaned[mod] = nextEntry;
    }
  }

  return cleaned;
}

export function getPresetPermissions(preset: PermissionPresetKey): AdminPermissions {
  if (preset === "full") {
    return buildFullPermissions();
  }
  if (preset === "read_only") {
    const result: AdminPermissions = {};
    for (const mod of PERMISSION_MODULES) {
      result[mod] = { view: true };
    }
    return result;
  }
  if (preset === "finance_accounts") {
    return normalizePermissionsInput({
      customers: { view: true },
      invoices: { view: true, write: true, delete: true },
      purchases: { view: true, write: true, delete: true },
      accounting: { view: true, write: true, approve: true },
      accounts: { view: true, write: true },
      vatReturns: { view: true, write: true },
      companySettings: { view: true, write: true },
      zatca: { view: true, write: true, approve: true },
    });
  }
  return normalizePermissionsInput({
    dashboard: { view: true },
    contracts: { view: true, write: true, delete: true, approve: true },
    inspections: { view: true, write: true, delete: true },
    fleet: { view: true, write: true, delete: true },
    captains: { view: true, write: true, delete: true },
    customers: { view: true, write: true },
    whatsapp: { view: true, write: true },
  });
}

export function isFullPermissions(permissions: AdminPermissions | null | undefined): boolean {
  if (permissions === null || permissions === undefined) return true;
  return PERMISSION_MODULES.every((mod) => {
    const entry = permissions[mod];
    if (!entry) return false;
    return MODULE_ACTIONS_LOOKUP[mod].every((action) => entry[action] === true);
  });
}

export function hasClientPermission(
  user: Pick<SystemUser, "role" | "email" | "permissions"> | null | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (!user || user.role !== "ADMIN") return false;
  if (isSuperAdmin(user.email)) return true;
  if (user.permissions === null || user.permissions === undefined) return true;
  const entry = user.permissions[module];
  if (!entry) return false;
  if (entry[action] === true) return true;
  if (
    action === "view" &&
    (entry.write === true || entry.delete === true || entry.approve === true)
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves whether an ADMIN user can open a given `/admin...` pathname.
 * Keep specific nested paths checked before their parent prefixes.
 */
export function canAccessAdminPath(
  user: Pick<SystemUser, "role" | "email" | "permissions"> | null | undefined,
  pathname: string
): boolean {
  if (!user || user.role !== "ADMIN") return false;
  const clean = pathname.split("?")[0] || "/admin";

  if (clean === "/admin/admins" || clean.startsWith("/admin/admins/")) {
    return isSuperAdmin(user.email);
  }
  if (isSuperAdmin(user.email)) return true;
  if (user.permissions === null || user.permissions === undefined) return true;

  if (clean === "/admin" || clean === "/admin/") {
    return hasClientPermission(user, "dashboard", "view");
  }
  if (clean === "/admin/invoices/settings" || clean.startsWith("/admin/invoices/settings/")) {
    return hasClientPermission(user, "companySettings", "view");
  }
  if (clean.startsWith("/admin/invoices")) {
    return hasClientPermission(user, "invoices", "view");
  }
  if (clean.startsWith("/admin/purchases")) {
    return hasClientPermission(user, "purchases", "view");
  }
  if (clean.startsWith("/admin/accounting")) {
    return hasClientPermission(user, "accounting", "view");
  }
  if (clean.startsWith("/admin/accounts")) {
    return hasClientPermission(user, "accounts", "view");
  }
  if (clean.startsWith("/admin/vat-returns")) {
    return hasClientPermission(user, "vatReturns", "view");
  }
  if (clean.startsWith("/admin/zatca")) {
    return hasClientPermission(user, "zatca", "view");
  }
  if (clean.startsWith("/admin/whatsapp")) {
    return hasClientPermission(user, "whatsapp", "view");
  }
  if (clean.startsWith("/admin/contracts")) {
    return hasClientPermission(user, "contracts", "view");
  }
  if (clean.startsWith("/admin/inspections")) {
    return hasClientPermission(user, "inspections", "view");
  }
  if (clean.startsWith("/admin/fleet")) {
    return hasClientPermission(user, "fleet", "view");
  }
  if (/^\/admin\/captains\/[^/]+\/account/.test(clean)) {
    return (
      hasClientPermission(user, "captains", "view") ||
      hasClientPermission(user, "staff", "view") ||
      hasClientPermission(user, "accounting", "view")
    );
  }
  if (clean.startsWith("/admin/captains")) {
    return hasClientPermission(user, "captains", "view");
  }
  if (clean.startsWith("/admin/customers")) {
    return hasClientPermission(user, "customers", "view");
  }
  if (clean.startsWith("/admin/staff") || clean.startsWith("/admin/representatives")) {
    return hasClientPermission(user, "staff", "view");
  }
  return false;
}

const ADMIN_ROUTE_FALLBACK_ORDER: ReadonlyArray<{
  module: PermissionModule;
  href: string;
}> = [
  { module: "dashboard", href: "/admin" },
  { module: "invoices", href: "/admin/invoices" },
  { module: "accounting", href: "/admin/accounting" },
  { module: "purchases", href: "/admin/purchases" },
  { module: "accounts", href: "/admin/accounts" },
  { module: "vatReturns", href: "/admin/vat-returns" },
  { module: "contracts", href: "/admin/contracts" },
  { module: "inspections", href: "/admin/inspections" },
  { module: "fleet", href: "/admin/fleet" },
  { module: "captains", href: "/admin/captains" },
  { module: "customers", href: "/admin/customers" },
  { module: "staff", href: "/admin/staff" },
  { module: "zatca", href: "/admin/zatca" },
  { module: "companySettings", href: "/admin/invoices/settings" },
  { module: "whatsapp", href: "/admin/whatsapp" },
];

export function hasAnyAdminModule(
  user: Pick<SystemUser, "role" | "email" | "permissions"> | null | undefined
): boolean {
  if (!user || user.role !== "ADMIN") return false;
  if (isSuperAdmin(user.email) || user.permissions === null || user.permissions === undefined) {
    return true;
  }
  return ADMIN_ROUTE_FALLBACK_ORDER.some((item) =>
    hasClientPermission(user, item.module, "view")
  );
}

export function defaultAdminRoute(
  user: Pick<SystemUser, "role" | "email" | "permissions"> | null | undefined
): string {
  if (!user || user.role !== "ADMIN") return "/captain";
  if (isSuperAdmin(user.email) || user.permissions === null || user.permissions === undefined) {
    return "/admin";
  }
  const match = ADMIN_ROUTE_FALLBACK_ORDER.find((item) =>
    hasClientPermission(user, item.module, "view")
  );
  return match ? match.href : "/admin";
}

export function summarizeAdminPermissions(
  permissions: AdminPermissions | null | undefined,
  language: "ar" | "en",
  isSuper = false,
  email?: string | null
): string {
  const ar = language === "ar";
  if (isSuper || email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return ar ? "المدير الأساسي (كامل الصلاحيات)" : "Super Admin (Full access)";
  }
  if (permissions === null || permissions === undefined || isFullPermissions(permissions)) {
    return ar ? "كامل الصلاحيات" : "Full permissions";
  }
  const grantedModules = PERMISSION_MODULES.filter((mod) => permissions[mod]?.view === true);
  if (grantedModules.length === 0) {
    return ar ? "بدون صلاحيات" : "No module access";
  }
  const financeOnly = grantedModules.every((mod) =>
    [
      "invoices",
      "purchases",
      "accounting",
      "accounts",
      "vatReturns",
      "companySettings",
      "zatca",
      "customers",
    ].includes(mod)
  );
  if (financeOnly) {
    return ar
      ? `الحسابات والفواتير (${grantedModules.length} أقسام)`
      : `Finance & Invoices (${grantedModules.length} modules)`;
  }
  return ar
    ? `${grantedModules.length} من ${PERMISSION_MODULES.length} قسم`
    : `${grantedModules.length} of ${PERMISSION_MODULES.length} modules`;
}
