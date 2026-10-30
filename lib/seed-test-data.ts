import {
  accountingRequest,
  currentSaudiPeriod,
  type Account,
  type PurchaseRow,
  type VatReport,
} from "./accounting";
import { backendRequest } from "./backend";
import type { TransportDetails } from "./invoice-transport";
import { invoiceRequest, type InvoiceSettings } from "./invoices";
import type { Contract, SystemUser, Vehicle, VehicleInspection } from "./types";

export interface SeedResult {
  success: boolean;
  message: string;
}

interface AccountSpec {
  code: string;
  nameAr: string;
  nameEn: string;
  parentCode?: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
  isPosting?: boolean;
}

const STANDARD_CHART_SPECS: AccountSpec[] = [
  { code: "1000", nameAr: "الأصول", nameEn: "Assets", type: "ASSET", normalBalance: "DEBIT", isPosting: false },
  { code: "1100", nameAr: "الأصول المتداولة", nameEn: "Current Assets", parentCode: "1000", type: "ASSET", normalBalance: "DEBIT", isPosting: false },
  { code: "1101", nameAr: "النقدية بالصندوق", nameEn: "Cash on Hand", parentCode: "1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true },
  { code: "1102", nameAr: "البنك الأهلي السعودي - SNB", nameEn: "Bank Account - SNB", parentCode: "1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true },
  { code: "1103", nameAr: "ذمم العملاء المدينون", nameEn: "Accounts Receivable", parentCode: "1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true },
  { code: "1104", nameAr: "عهد السائقين والمناديب", nameEn: "Drivers Cash Advances", parentCode: "1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true },
  { code: "1200", nameAr: "الأصول الثابتة", nameEn: "Fixed Assets", parentCode: "1000", type: "ASSET", normalBalance: "DEBIT", isPosting: false },
  { code: "1201", nameAr: "أسطول السيارات والمركبات والحافلات", nameEn: "Vehicles and Fleet Assets", parentCode: "1200", type: "ASSET", normalBalance: "DEBIT", isPosting: true },
  { code: "2000", nameAr: "الالتزامات", nameEn: "Liabilities", type: "LIABILITY", normalBalance: "CREDIT", isPosting: false },
  { code: "2100", nameAr: "الالتزامات المتداولة", nameEn: "Current Liabilities", parentCode: "2000", type: "LIABILITY", normalBalance: "CREDIT", isPosting: false },
  { code: "2101", nameAr: "ذمم الموردين ومقاولي الباطن", nameEn: "Accounts Payable", parentCode: "2100", type: "LIABILITY", normalBalance: "CREDIT", isPosting: true },
  { code: "2102", nameAr: "حسابات ضريبة القيمة المضافة", nameEn: "VAT Control Accounts", parentCode: "2100", type: "LIABILITY", normalBalance: "CREDIT", isPosting: false },
  { code: "210201", nameAr: "ضريبة القيمة المضافة - المخرجات", nameEn: "VAT Output - Sales", parentCode: "2102", type: "LIABILITY", normalBalance: "CREDIT", isPosting: true },
  { code: "210202", nameAr: "ضريبة القيمة المضافة - المدخلات القابلة للاسترداد", nameEn: "VAT Input - Recoverable Purchases", parentCode: "2102", type: "LIABILITY", normalBalance: "DEBIT", isPosting: true },
  { code: "210203", nameAr: "تسوية إقرار ضريبة القيمة المضافة - هيئة الزكاة", nameEn: "VAT Settlement Account", parentCode: "2102", type: "LIABILITY", normalBalance: "CREDIT", isPosting: true },
  { code: "2103", nameAr: "مستحقات السائقين والرواتب", nameEn: "Accrued Salaries and Driver Commissions", parentCode: "2100", type: "LIABILITY", normalBalance: "CREDIT", isPosting: true },
  { code: "3000", nameAr: "حقوق الملكية", nameEn: "Equity", type: "EQUITY", normalBalance: "CREDIT", isPosting: false },
  { code: "3101", nameAr: "رأس المال", nameEn: "Capital", parentCode: "3000", type: "EQUITY", normalBalance: "CREDIT", isPosting: true },
  { code: "3102", nameAr: "الأرباح المبقاة", nameEn: "Retained Earnings", parentCode: "3000", type: "EQUITY", normalBalance: "CREDIT", isPosting: true },
  { code: "4000", nameAr: "الإيرادات", nameEn: "Revenues", type: "REVENUE", normalBalance: "CREDIT", isPosting: false },
  { code: "4101", nameAr: "إيرادات النقل والتوصيل والمطارات", nameEn: "Transport and Airport Transfer Revenue", parentCode: "4000", type: "REVENUE", normalBalance: "CREDIT", isPosting: true },
  { code: "4102", nameAr: "إيرادات كبار الشخصيات والعمرة والزيارة", nameEn: "VIP and Umrah Transport Revenue", parentCode: "4000", type: "REVENUE", normalBalance: "CREDIT", isPosting: true },
  { code: "4103", nameAr: "إيرادات النقل الصفرية أو المعفاة", nameEn: "Zero-Rated and Exempt Transport Revenue", parentCode: "4000", type: "REVENUE", normalBalance: "CREDIT", isPosting: true },
  { code: "4201", nameAr: "مردودات ومسموحات المبيعات", nameEn: "Sales Returns and Allowances", parentCode: "4000", type: "REVENUE", normalBalance: "DEBIT", isPosting: true },
  { code: "5000", nameAr: "المصروفات والتكاليف التشغيلية", nameEn: "Fleet and Admin Expenses", type: "EXPENSE", normalBalance: "DEBIT", isPosting: false },
  { code: "5100", nameAr: "تكاليف التشغيل المباشرة للأسطول", nameEn: "Direct Fleet Operating Costs", parentCode: "5000", type: "EXPENSE", normalBalance: "DEBIT", isPosting: false },
  { code: "5101", nameAr: "مصروف الوقود والمحروقات", nameEn: "Fuel and Gas Expense", parentCode: "5100", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5102", nameAr: "الصيانة وقطع الغيار والإطارات والزيوت", nameEn: "Maintenance Spare Parts Tires and Oil", parentCode: "5100", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5103", nameAr: "استئجار مركبات ومقاولي باطن للنقل", nameEn: "Subcontracted Vehicles and Transport", parentCode: "5100", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5104", nameAr: "تأمين المركبات والفحص الدوري", nameEn: "Vehicle Insurance and Inspection", parentCode: "5100", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5105", nameAr: "رواتب وعمولات السائقين", nameEn: "Driver Salaries and Trip Bonuses", parentCode: "5100", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5106", nameAr: "الرسوم الحكومية والتراخيص والمخالفات", nameEn: "Government Fees Permits and Fines", parentCode: "5100", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5200", nameAr: "المصروفات العمومية والإدارية والتسويقية", nameEn: "General Admin and Marketing Expenses", parentCode: "5000", type: "EXPENSE", normalBalance: "DEBIT", isPosting: false },
  { code: "5201", nameAr: "الإيجارات والمرافق والاتصالات والإنترنت", nameEn: "Office Rent Utilities and Telecom", parentCode: "5200", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5202", nameAr: "التسويق والإعلانات والاشتراكات التقنية", nameEn: "Marketing Ads and Software", parentCode: "5200", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
  { code: "5203", nameAr: "المصاريف الإدارية والضيافة والقرطاسية", nameEn: "Admin and Office Supplies", parentCode: "5200", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true },
];

export async function ensureStandardChartOfAccounts(allAccounts: Account[]): Promise<void> {
  for (const spec of STANDARD_CHART_SPECS) {
    const existing = allAccounts.find((a) => a.code === spec.code);
    if (existing) {
      if (!existing.isActive) {
        await accountingRequest(`/accounts/${existing.code}`, "PUT", {
          nameAr: existing.nameAr,
          nameEn: existing.nameEn,
          isActive: true,
          profitSection: existing.profitSection || "OPERATING",
        });
        existing.isActive = true;
      }
      continue;
    }
    const parent = spec.parentCode
      ? allAccounts.find((a) => a.code === spec.parentCode && !a.isPosting)
      : null;
    const created = await accountingRequest<Account>("/accounts", "POST", {
      code: spec.code,
      nameAr: spec.nameAr,
      nameEn: spec.nameEn,
      parentId: parent?.id || null,
      type: spec.type,
      normalBalance: spec.normalBalance,
      isPosting: spec.isPosting !== false,
      isActive: true,
      profitSection: "OPERATING",
    });
    if (created.success && created.data) {
      allAccounts.push(created.data);
    }
  }
  const refreshed = await accountingRequest<{ items: Account[] }>("/accounts");
  if (refreshed.data?.items) {
    allAccounts.splice(0, allAccounts.length, ...refreshed.data.items);
  }
}

export async function ensurePostingAccount(
  allAccounts: Account[],
  spec: AccountSpec
): Promise<string> {
  // 1. Check if the exact code exists
  const exact = allAccounts.find((a) => a.code === spec.code);
  if (exact) {
    if (exact.isPosting && exact.isActive) {
      return exact.code;
    }
    if (exact.isPosting && !exact.isActive) {
      const activated = await accountingRequest(`/accounts/${exact.code}`, "PUT", {
        nameAr: exact.nameAr,
        nameEn: exact.nameEn,
        isActive: true,
        profitSection: exact.profitSection || "OPERATING",
      });
      if (activated.success) {
        exact.isActive = true;
        return exact.code;
      }
    }
  }

  // 2. Check if there is already an active posting sub-account of this type matching the name or type
  const existingByType = allAccounts.find(
    (a) => a.isPosting && a.isActive && a.type === spec.type && a.code === spec.code
  );
  if (existingByType) return existingByType.code;

  // 3. Find or create a non-posting parent account of the same type
  let parent =
    (exact && !exact.isPosting ? exact : undefined) ||
    allAccounts.find((a) => !a.isPosting && a.type === spec.type);

  if (!parent) {
    const parentCode =
      spec.type === "ASSET"
        ? "1000"
        : spec.type === "LIABILITY"
          ? "2000"
          : spec.type === "EQUITY"
            ? "3000"
            : spec.type === "REVENUE"
              ? "4000"
              : "5000";
    if (!allAccounts.some((a) => a.code === parentCode)) {
      await accountingRequest("/accounts", "POST", {
        code: parentCode,
        nameAr: spec.nameAr,
        nameEn: spec.nameEn,
        parentId: null,
        type: spec.type,
        normalBalance: spec.normalBalance,
        isPosting: false,
        isActive: true,
        profitSection: "OPERATING",
      });
      const refreshedParent = await accountingRequest<{ items: Account[] }>("/accounts");
      if (refreshedParent.data?.items) {
        allAccounts.splice(0, allAccounts.length, ...refreshedParent.data.items);
        parent = allAccounts.find((a) => !a.isPosting && a.type === spec.type);
      }
    }
  }

  // 4. Determine a free code (if spec.code is already used as a non-posting group account, use spec.code + "01")
  const candidateCode = exact ? `${spec.code}01` : spec.code;
  if (!allAccounts.some((a) => a.code === candidateCode)) {
    const created = await accountingRequest("/accounts", "POST", {
      code: candidateCode,
      nameAr: spec.nameAr,
      nameEn: spec.nameEn,
      parentId: parent?.id || null,
      type: spec.type,
      normalBalance: spec.normalBalance,
      isPosting: true,
      isActive: true,
      profitSection: "OPERATING",
    });

    if (created.success) {
      const refreshed = await accountingRequest<{ items: Account[] }>("/accounts");
      if (refreshed.data?.items) {
        allAccounts.splice(0, allAccounts.length, ...refreshed.data.items);
      }
      const verified = allAccounts.find(
        (a) => a.code === candidateCode && a.isPosting && a.isActive
      );
      if (verified) return verified.code;
    }
  }

  // 5. Fallback: any verified active posting sub-account of the same type, then same normalBalance, then any active posting account
  const sameType = allAccounts.find(
    (a) => a.isPosting && a.isActive && a.type === spec.type
  );
  if (sameType) return sameType.code;

  const sameSide = allAccounts.find(
    (a) => a.isPosting && a.isActive && a.normalBalance === spec.normalBalance
  );
  if (sameSide) return sameSide.code;

  const anyPosting = allAccounts.find((a) => a.isPosting && a.isActive);
  return anyPosting?.code || spec.code;
}

export async function ensureCapitalAndBankAccounts(): Promise<{
  bankCode: string;
  capitalCode: string;
}> {
  const accountsRes = await accountingRequest<{ items: Account[] }>("/accounts");
  const allAccounts = [...(accountsRes.data?.items || [])];
  await ensureStandardChartOfAccounts(allAccounts);

  const bankCode = await ensurePostingAccount(allAccounts, {
    code: "1102",
    nameAr: "البنك الأهلي السعودي - SNB",
    nameEn: "Bank Account - SNB",
    type: "ASSET",
    normalBalance: "DEBIT",
  });

  const capitalCode = await ensurePostingAccount(allAccounts, {
    code: "3101",
    nameAr: "رأس المال",
    nameEn: "Capital",
    type: "EQUITY",
    normalBalance: "CREDIT",
  });

  return { bankCode, capitalCode };
}

export async function seedAllSectionsTestData(): Promise<SeedResult> {
  const period = currentSaudiPeriod();
  const today = period.day;
  const nowIso = new Date().toISOString();
  const suffix = String(Date.now()).slice(-4);

  // 1. Ensure Company & Bank Settings exist for Invoices, ZATCA, and VAT Returns
  const settingsRes = await invoiceRequest<InvoiceSettings>("/settings");
  const existingCompany = settingsRes.data?.company;
  if (!existingCompany?.legalName || !existingCompany?.vatNumber || !existingCompany?.address) {
    await invoiceRequest("/settings", "PUT", {
      legalName: existingCompany?.legalName || "شركة ميقات الخليج للنقل البري",
      vatNumber: existingCompany?.vatNumber || "314917059400003",
      commercialRegistration: existingCompany?.commercialRegistration || "7054842252",
      address: existingCompany?.address || {
        street: "طريق الملك عبدالعزيز",
        building: "1234",
        district: "الشاطئ",
        city: "جدة",
        postalCode: "23411",
        country: "SA",
      },
      presentation: existingCompany?.presentation || {
        englishName: "Miqat Al-Khaleej Land Transport",
        website: "https://miqatalkhaleej.com/",
        showSeal: true,
      },
      bankDetails: existingCompany?.bankDetails || {
        bankName: "البنك الأهلي السعودي - SNB",
        accountHolder: "شركة ميقات الخليج للنقل البري",
        accountNumber: "1234567890001",
        iban: "SA0310000001234567890001",
        swiftCode: "NCBKSAJE",
      },
    });
  }

  // 2. Ensure all required Standard Chart of Accounts (1000-5203) exist & are active
  const accountsRes = await accountingRequest<{ items: Account[] }>("/accounts");
  if (!accountsRes.success || !accountsRes.data) {
    return {
      success: false,
      message: accountsRes.error || "تعذر قراءة شجرة الحسابات من الخادم",
    };
  }

  const allAccounts = [...accountsRes.data.items];
  await ensureStandardChartOfAccounts(allAccounts);

  const cashCode = await ensurePostingAccount(allAccounts, {
    code: "1101",
    nameAr: "النقدية بالصندوق",
    nameEn: "Cash on Hand",
    type: "ASSET",
    normalBalance: "DEBIT",
  });
  const bankCode = await ensurePostingAccount(allAccounts, {
    code: "1102",
    nameAr: "البنك الأهلي السعودي",
    nameEn: "Saudi National Bank",
    type: "ASSET",
    normalBalance: "DEBIT",
  });
  const receivableCode = await ensurePostingAccount(allAccounts, {
    code: "1103",
    nameAr: "ذمم العملاء",
    nameEn: "Accounts Receivable",
    type: "ASSET",
    normalBalance: "DEBIT",
  });
  const payableCode = await ensurePostingAccount(allAccounts, {
    code: "2101",
    nameAr: "ذمم الموردين",
    nameEn: "Accounts Payable",
    type: "LIABILITY",
    normalBalance: "CREDIT",
  });
  const capitalCode = await ensurePostingAccount(allAccounts, {
    code: "3101",
    nameAr: "رأس المال",
    nameEn: "Share Capital",
    type: "EQUITY",
    normalBalance: "CREDIT",
  });
  const revTransportCode = await ensurePostingAccount(allAccounts, {
    code: "4101",
    nameAr: "إيرادات خدمات النقل والمطارات",
    nameEn: "Transport & Airport Revenue",
    type: "REVENUE",
    normalBalance: "CREDIT",
  });
  const revVipCode = await ensurePostingAccount(allAccounts, {
    code: "4102",
    nameAr: "إيرادات كبار الشخصيات والعمرة",
    nameEn: "VIP & Umrah Revenue",
    type: "REVENUE",
    normalBalance: "CREDIT",
  });
  const expFuelCode = await ensurePostingAccount(allAccounts, {
    code: "5101",
    nameAr: "مصروف الوقود",
    nameEn: "Fuel Expense",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expMaintCode = await ensurePostingAccount(allAccounts, {
    code: "5102",
    nameAr: "مصروف الصيانة والإطارات",
    nameEn: "Maintenance & Tires Expense",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expSubcontractCode = await ensurePostingAccount(allAccounts, {
    code: "5103",
    nameAr: "مصروف النقل من الباطن",
    nameEn: "Subcontracted Transport Expense",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expInsuranceCode = await ensurePostingAccount(allAccounts, {
    code: "5104",
    nameAr: "مصروف تأمين المركبات",
    nameEn: "Vehicle Insurance Expense",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expPayrollCode = await ensurePostingAccount(allAccounts, {
    code: "5105",
    nameAr: "رواتب وعمولات السائقين",
    nameEn: "Driver Payroll & Commissions",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expGovFeesCode = await ensurePostingAccount(allAccounts, {
    code: "5106",
    nameAr: "الرسوم الحكومية والتراخيص والمخالفات",
    nameEn: "Government Fees Permits and Fines",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expRentCode = await ensurePostingAccount(allAccounts, {
    code: "5201",
    nameAr: "إيجارات ومرافق واتصالات",
    nameEn: "Rent & Utilities Expense",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expMarketingCode = await ensurePostingAccount(allAccounts, {
    code: "5202",
    nameAr: "التسويق والإعلانات والاشتراكات التقنية",
    nameEn: "Marketing Ads and Software",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });
  const expAdminCode = await ensurePostingAccount(allAccounts, {
    code: "5203",
    nameAr: "المصاريف الإدارية والضيافة والقرطاسية",
    nameEn: "Admin and Office Supplies",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });

  await ensurePostingAccount(allAccounts, {
    code: "5109",
    nameAr: "ضيافة واستقبال المعتمرين والوفود",
    nameEn: "Pilgrim & VIP Hospitality Expenses",
    type: "EXPENSE",
    normalBalance: "DEBIT",
  });

  // 2b. Seed Operational Sections: Fleet Vehicles, Captains, Daily Inspections, and Official Contracts
  const nextYearExpiry = `${period.year + 1}-12-31`;
  const fleetRes = await backendRequest<Vehicle[]>("/fleet");
  const existingVehicles = fleetRes.data || [];
  const fleetSpecs = [
    {
      plateNumberAr: "أ ب ج 1234",
      plateNumberEn: "ABC 1234",
      make: "مرسيدس بنز",
      model: "ترافيجو VIP",
      year: 2025,
      category: "BUS",
      capacity: 45,
      status: "AVAILABLE" as const,
      registrationExpiry: nextYearExpiry,
      insuranceExpiry: nextYearExpiry,
      currentMileage: 12495,
    },
    {
      plateNumberAr: "د هـ و 5678",
      plateNumberEn: "DHW 5678",
      make: "جمس",
      model: "يوكن XL دينالي VIP",
      year: 2025,
      category: "SUV_VIP",
      capacity: 7,
      status: "AVAILABLE" as const,
      registrationExpiry: nextYearExpiry,
      insuranceExpiry: nextYearExpiry,
      currentMileage: 8320,
    },
    {
      plateNumberAr: "س ص ع 9012",
      plateNumberEn: "SSA 9012",
      make: "تويوتا",
      model: "كوستر سياحي مطور",
      year: 2024,
      category: "COASTER",
      capacity: 26,
      status: "AVAILABLE" as const,
      registrationExpiry: nextYearExpiry,
      insuranceExpiry: nextYearExpiry,
      currentMileage: 21400,
    },
  ];
  for (const vSpec of fleetSpecs) {
    if (!existingVehicles.some((v) => v.plateNumberAr === vSpec.plateNumberAr)) {
      await backendRequest<Vehicle>("/fleet", "POST", vSpec);
    }
  }

  const captainsRes = await backendRequest<SystemUser[]>("/captains");
  const existingCaptains = [...(captainsRes.data || [])];
  const captainSpecs = [
    {
      name: "الكابتن فهد العتيبي",
      email: "fahad.otaibi@miqatalkhaleej.com",
      phone: "+966551122334",
      nationalId: "1088776655",
      licenseNumber: "DL-998811",
      licenseExpiry: nextYearExpiry,
      assignedVehiclePlate: "أ ب ج 1234",
      active: true,
    },
    {
      name: "الكابتن سلطان الحربي",
      email: "sultan.harbi@miqatalkhaleej.com",
      phone: "+966559988776",
      nationalId: "1099887766",
      licenseNumber: "DL-998822",
      licenseExpiry: nextYearExpiry,
      assignedVehiclePlate: "د هـ و 5678",
      active: true,
    },
  ];
  for (const cSpec of captainSpecs) {
    if (
      !existingCaptains.some(
        (c) => c.email.toLowerCase() === cSpec.email.toLowerCase() || c.name === cSpec.name
      )
    ) {
      await backendRequest("/captains", "POST", cSpec);
    }
  }
  const refreshedCaptainsRes = await backendRequest<SystemUser[]>("/captains");
  const allCaptains = refreshedCaptainsRes.data || existingCaptains;

  let primaryCaptainId = allCaptains[0]?.id || "";
  let primaryInspectionId: string | undefined;
  for (const cap of allCaptains.slice(0, 2)) {
    const plate = cap.assignedVehiclePlate || "أ ب ج 1234";
    const inspRes = await backendRequest<VehicleInspection>("/inspections/direct-pass", "POST", {
      captainId: cap.id,
      vehiclePlate: plate,
      customNotes: "فحص سلامة يومي معتمد — جميع الأنظمة الميكانيكية وأدوات السلامة مطابقة للمواصفات",
      inspectionDate: today,
    });
    if (!primaryCaptainId) primaryCaptainId = cap.id;
    if (!primaryInspectionId && inspRes.data?.id) {
      primaryInspectionId = inspRes.data.id;
    }
  }

  if (primaryCaptainId) {
    await backendRequest<Contract>("/contracts", "POST", {
      operationType: "HAJJ_UMRAH",
      origin: "مطار الملك عبدالعزيز الدولي - جدة",
      destination: "مكة المكرمة - المنطقة المركزية (فندق دار التوحيد)",
      tripDate: today,
      tripTime: "10:30",
      flightCarrier: "الخطوط الجوية العربية السعودية",
      flightNumber: `SV-${suffix}`,
      customerName: "شركة قوافل العمرة والزيارة",
      customerPhone: "+966501234567",
      notes: "عقد نقل معتمرين ووفود رسمية شامل الاستقبال بالمطار",
      issueDate: today,
      captainId: primaryCaptainId,
      vehiclePlate: "أ ب ج 1234",
      inspectionId: primaryInspectionId,
      passengers: [
        { name: "خالد عبدالله المنصور", nationality: "السعودية", idNumber: "1044556677" },
        { name: "محمد أحمد العلي", nationality: "السعودية", idNumber: "1055667788" },
        { name: "عبدالعزيز فهد الدوسري", nationality: "الكويت", idNumber: "2940101123" },
      ],
    });

    const secondCaptain = allCaptains[1] || allCaptains[0];
    if (secondCaptain) {
      await backendRequest<Contract>("/contracts", "POST", {
        operationType: "VIP_TRANSFER",
        origin: "مكة المكرمة - أبراج البيت",
        destination: "المدينة المنورة - المنطقة المركزية الشمالية",
        tripDate: today,
        tripTime: "16:00",
        customerName: "فندق دار التوحيد إنتركونتيننتال",
        customerPhone: "+966554433221",
        notes: "نقل كبار الشخصيات بسيارة جمس يوكن XL VIP",
        issueDate: today,
        captainId: secondCaptain.id,
        vehiclePlate: secondCaptain.assignedVehiclePlate || "د هـ و 5678",
        passengers: [
          { name: "سلمان عبدالرحمن القحطاني", nationality: "السعودية", idNumber: "1022334455" },
          { name: "فيصل بن تركي السديري", nationality: "السعودية", idNumber: "1033445566" },
        ],
      });
    }
  }

  // 3. Opening Capital Journal Entry (300,000.00 SAR) + Cash Box Replenishment (25,000.00 SAR)
  const capitalJournal = await accountingRequest("/journals", "POST", {
    operationKey: crypto.randomUUID(),
    entryDate: today,
    description: "إثبات رأس المال الافتتاحي للشركة (300,000 ر.س - بيانات تجريبية)",
    lines: [
      {
        accountCode: bankCode,
        debit: "300000.00",
        credit: "0.00",
        description: "إيداع رأس المال في الحساب البنكي",
      },
      {
        accountCode: capitalCode,
        debit: "0.00",
        credit: "300000.00",
        description: "رأس المال الافتتاحي",
      },
    ],
  });

  if (!capitalJournal.success) {
    return {
      success: false,
      message: capitalJournal.error || "تعذر ترحيل قيد رأس المال الافتتاحي (300,000 ر.س)",
    };
  }

  if (cashCode !== bankCode) {
    await accountingRequest("/journals", "POST", {
      operationKey: crypto.randomUUID(),
      entryDate: today,
      description: `تغذية صندوق النقدية من الحساب البنكي #${suffix}`,
      lines: [
        {
          accountCode: cashCode,
          debit: "25000.00",
          credit: "0.00",
          description: "تغذية الصندوق النقدي للمصروفات اليومية",
        },
        {
          accountCode: bankCode,
          debit: "0.00",
          credit: "25000.00",
          description: "تحويل من البنك إلى الصندوق",
        },
      ],
    });
  }

  // 4. Create Invoices covering ALL Sales Categories
  const baseTransport: TransportDetails = {
    serviceType: "HAJJ_UMRAH",
    origin: "مطار الملك عبدالعزيز الدولي - جدة",
    destination: "مكة المكرمة - المنطقة المركزية",
    tripDate: today,
    departureTime: "10:00",
    arrivalDate: today,
    arrivalTime: "12:00",
    driverName: "الكابتن فهد العتيبي",
    driverPhone: "+966551122334",
    vehiclePlate: "أ ب ج 1234",
    vehicleDescription: "حافلة مرسيدس ترافيجو VIP",
    vehicleCapacity: 45,
    contactName: "خالد عبدالله المنصور",
    contactPhone: "+966501234567",
    passengerCount: 15,
    passengers: [
      { name: "خالد عبدالله المنصور", nationality: "السعودية" },
      { name: "محمد أحمد العلي", nationality: "السعودية" },
    ],
    distanceUnit: "KM",
    billedDistance: "95",
    odometerStart: "12400",
    odometerEnd: "12495",
    notes: "نوع الحجز: ذهاب فقط\nرحلة نقل معتمرين ووفود رسمية",
  };

  // 4a. Booking Invoice (Standard 15% -> Box 1, On Credit -> Receivables)
  const bookingInvoice = await invoiceRequest<{ id: string }>("", "POST", {
    documentType: "BOOKING",
    operationKey: crypto.randomUUID(),
    invoiceDate: nowIso,
    buyer: {
      name: "شركة قوافل العمرة والزيارة",
      vatNumber: "300000000000003",
      identification: "4030998877",
      identificationScheme: "CRN",
      address: {
        street: "طريق أم القرى",
        building: "2211",
        district: "العزيزية",
        city: "مكة المكرمة",
        postalCode: "24243",
        country: "SA",
      },
    },
    paymentCode: "30",
    accountingApproved: true,
    accounting: {
      revenueAccountCode: revVipCode,
      settlementAccountCode: receivableCode,
    },
    transport: baseTransport,
    lines: [
      {
        code: "UMRAH-VIP-01",
        description: "برنامج نقل معتمرين VIP بين جدة ومكة المكرمة والمدينة المنورة",
        quantity: "3",
        billingUnit: "TRIP",
        unitPrice: "5000.00",
        discount: "0",
        category: "S",
        rate: "15",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
    ],
  });

  // 4b. ZATCA Standard Tax Invoice (Standard 15% -> Box 1, Paid to Bank)
  const standardTaxInvoice = await invoiceRequest<{ id: string }>("", "POST", {
    documentType: "TAX",
    taxDocument: {
      kind: "INVOICE",
      profile: "STANDARD",
      supplyDate: today,
    },
    operationKey: crypto.randomUUID(),
    invoiceDate: nowIso,
    buyer: {
      name: "فندق دار التوحيد إنتركونتيننتال",
      vatNumber: "300000000000003",
      identification: "4031122334",
      identificationScheme: "CRN",
      address: {
        street: "شارع إبراهيم الخليل",
        building: "4210",
        district: "الحرم",
        city: "مكة المكرمة",
        postalCode: "24231",
        country: "SA",
      },
    },
    paymentCode: "42",
    accountingApproved: true,
    accounting: {
      revenueAccountCode: revTransportCode,
      settlementAccountCode: bankCode,
    },
    transport: {
      ...baseTransport,
      passengerCount: 6,
      vehicleDescription: "جمس يوكن XL كبار الشخصيات",
    },
    lines: [
      {
        code: "VIP-TRANS-02",
        description: "توصيل وفود كبار الشخصيات من مطار جدة إلى الفندق",
        quantity: "2",
        billingUnit: "TRIP",
        unitPrice: "4000.00",
        discount: "0",
        category: "S",
        rate: "15",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
    ],
  });

  // 4c. ZATCA Credit Note & Debit Note against Standard Tax Invoice (Box 1 Adjustment & Debit Notes)
  if (standardTaxInvoice.success && standardTaxInvoice.data?.id) {
    await invoiceRequest<{ id: string }>("", "POST", {
      documentType: "TAX",
      taxDocument: {
        kind: "CREDIT",
        profile: "STANDARD",
        supplyDate: today,
        originalInvoiceId: standardTaxInvoice.data.id,
        adjustmentReason: "تخفيض جزئي على رسوم الانتظار المتفق عليها",
        adjustmentEventDate: today,
      },
      operationKey: crypto.randomUUID(),
      invoiceDate: nowIso,
      buyer: {
        name: "فندق دار التوحيد إنتركونتيننتال",
        vatNumber: "300000000000003",
        identification: "4031122334",
        identificationScheme: "CRN",
        address: {
          street: "شارع إبراهيم الخليل",
          building: "4210",
          district: "الحرم",
          city: "مكة المكرمة",
          postalCode: "24231",
          country: "SA",
        },
      },
      paymentCode: "42",
      accountingApproved: true,
      accounting: {
        revenueAccountCode: revTransportCode,
        settlementAccountCode: bankCode,
      },
      transport: baseTransport,
      lines: [
        {
          code: "VIP-CREDIT-01",
          description: "خصم إشعار دائن على رحلة نقل كبار الشخصيات",
          quantity: "1",
          billingUnit: "TRIP",
          unitPrice: "1000.00",
          discount: "0",
          category: "S",
          rate: "15",
          component: "OWN_SUPPLY",
          taxReviewed: true,
        },
      ],
    });

    await invoiceRequest<{ id: string }>("", "POST", {
      documentType: "TAX",
      taxDocument: {
        kind: "DEBIT",
        profile: "STANDARD",
        supplyDate: today,
        originalInvoiceId: standardTaxInvoice.data.id,
        adjustmentReason: "إضافة جولة ميدانية وتمديد ساعات خدمة المركبة",
        adjustmentEventDate: today,
      },
      operationKey: crypto.randomUUID(),
      invoiceDate: nowIso,
      buyer: {
        name: "فندق دار التوحيد إنتركونتيننتال",
        vatNumber: "300000000000003",
        identification: "4031122334",
        identificationScheme: "CRN",
        address: {
          street: "شارع إبراهيم الخليل",
          building: "4210",
          district: "الحرم",
          city: "مكة المكرمة",
          postalCode: "24231",
          country: "SA",
        },
      },
      paymentCode: "42",
      accountingApproved: true,
      accounting: {
        revenueAccountCode: revTransportCode,
        settlementAccountCode: bankCode,
      },
      transport: baseTransport,
      lines: [
        {
          code: "VIP-DEBIT-01",
          description: "رسوم إضافية لتمديد خدمة النقل والجولات",
          quantity: "1",
          billingUnit: "TRIP",
          unitPrice: "1500.00",
          discount: "0",
          category: "S",
          rate: "15",
          component: "OWN_SUPPLY",
          taxReviewed: true,
        },
      ],
    });
  }

  // 4c-bis. Prior-Quarter Tax Invoice + Current-Quarter Credit Note to populate Box 1 "Adjustment (التعديل)" column
  const priorQuarterStartMonth = (period.quarter - 1) * 3;
  const priorDateObj = new Date(Date.UTC(period.year, priorQuarterStartMonth - 1, 15, 12, 0, 0));
  const priorDay = priorDateObj.toISOString().slice(0, 10);
  const priorIso = priorDateObj.toISOString();
  const priorTaxInvoice = await invoiceRequest<{ id: string }>("", "POST", {
    documentType: "TAX",
    taxDocument: {
      kind: "INVOICE",
      profile: "SIMPLIFIED",
      supplyDate: priorDay,
    },
    operationKey: crypto.randomUUID(),
    invoiceDate: priorIso,
    buyer: {
      name: "مجموعة فنادق مكة المكرمة للضيافة",
    },
    paymentCode: "42",
    accountingApproved: true,
    accounting: {
      revenueAccountCode: revTransportCode,
      settlementAccountCode: bankCode,
    },
    transport: {
      ...baseTransport,
      tripDate: priorDay,
      arrivalDate: priorDay,
    },
    lines: [
      {
        code: "PRIOR-Q-01",
        description: "خدمات نقل تعاقدية للربع السابق",
        quantity: "1",
        billingUnit: "TRIP",
        unitPrice: "6000.00",
        discount: "0",
        category: "S",
        rate: "15",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
    ],
  });

  if (priorTaxInvoice.success && priorTaxInvoice.data?.id) {
    await invoiceRequest<{ id: string }>("", "POST", {
      documentType: "TAX",
      taxDocument: {
        kind: "CREDIT",
        profile: "SIMPLIFIED",
        supplyDate: today,
        originalInvoiceId: priorTaxInvoice.data.id,
        adjustmentReason: "تسوية خصم تجاري لفاتورة الربع السابق (يظهر في عمود التعديلات)",
        adjustmentEventDate: today,
      },
      operationKey: crypto.randomUUID(),
      invoiceDate: nowIso,
      buyer: {
        name: "مجموعة فنادق مكة المكرمة للضيافة",
      },
      paymentCode: "42",
      accountingApproved: true,
      accounting: {
        revenueAccountCode: revTransportCode,
        settlementAccountCode: bankCode,
      },
      transport: baseTransport,
      lines: [
        {
          code: "PRIOR-CN-01",
          description: "إشعار دائن لتعديل فاتورة من فترة ضريبية سابقة",
          quantity: "1",
          billingUnit: "TRIP",
          unitPrice: "1200.00",
          discount: "0",
          category: "S",
          rate: "15",
          component: "OWN_SUPPLY",
          taxReviewed: true,
        },
      ],
    });
  }

  // 4d. Domestic Zero-Rated & Exports Invoice (Box 3 Domestic 0% + Box 4 Exports 0%)
  await invoiceRequest<{ id: string }>("", "POST", {
    documentType: "TAX",
    taxDocument: {
      kind: "INVOICE",
      profile: "SIMPLIFIED",
      supplyDate: today,
    },
    operationKey: crypto.randomUUID(),
    invoiceDate: nowIso,
    buyer: {
      name: "شركة الخليج للنقل الدولي والسياحة العابرة للحدود",
    },
    paymentCode: "42",
    accountingApproved: true,
    accounting: {
      revenueAccountCode: revTransportCode,
      settlementAccountCode: bankCode,
    },
    transport: {
      ...baseTransport,
      serviceType: "INTERCITY",
      origin: "جدة - المملكة العربية السعودية",
      destination: "مطار دبي الدولي / منفذ البطحاء الحدودي",
      vehiclePlate: "د هـ و 5678",
    },
    lines: [
      {
        code: "ZERO-DOM-01",
        description: "توريد خدمات نقل محلي خاضع للنسبة الصفرية 0%",
        quantity: "1",
        billingUnit: "TRIP",
        unitPrice: "4500.00",
        discount: "0",
        category: "Z",
        rate: "0",
        exemptionCode: "VATEX-SA-35",
        exemptionReason: "توريد محلي خاضع للنسبة الصفرية وفق اللائحة التنفيذية",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
      {
        code: "EXP-INTL-02",
        description: "صادرات خدمات نقل دولي عابر للحدود خارج المملكة",
        quantity: "1",
        billingUnit: "TRIP",
        unitPrice: "7500.00",
        discount: "0",
        category: "Z",
        rate: "0",
        exemptionCode: "VATEX-SA-32",
        exemptionReason: "صادرات وتوريد خدمات نقل دولي خارج المملكة (Exports)",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
      {
        code: "EXP-PASS-03",
        description: "نقل دولي للركاب والوفود الخليجية (نسبة صفرية)",
        quantity: "1",
        billingUnit: "TRIP",
        unitPrice: "3800.00",
        discount: "0",
        category: "Z",
        rate: "0",
        exemptionCode: "VATEX-SA-34-1",
        exemptionReason: "النقل الدولي للركاب بموجب المادة 34 من اللائحة",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
    ],
  });

  // 4e. Exempt Sales (Box 5) & Outside Scope Sales (Excluded Outside Scope)
  await invoiceRequest<{ id: string }>("", "POST", {
    documentType: "TAX",
    taxDocument: {
      kind: "INVOICE",
      profile: "SIMPLIFIED",
      supplyDate: today,
    },
    operationKey: crypto.randomUUID(),
    invoiceDate: nowIso,
    buyer: {
      name: "مؤسسة الراجحي للخدمات المعفاة والتمويل",
    },
    paymentCode: "10",
    accountingApproved: true,
    accounting: {
      revenueAccountCode: revTransportCode,
      settlementAccountCode: cashCode,
    },
    transport: {
      ...baseTransport,
      vehiclePlate: "د هـ و 5678",
      passengerCount: 8,
    },
    lines: [
      {
        code: "EXEMPT-SALE-01",
        description: "توريدات وخدمات معفاة من ضريبة القيمة المضافة",
        quantity: "1",
        billingUnit: "TRIP",
        unitPrice: "3200.00",
        discount: "0",
        category: "E",
        rate: "0",
        exemptionCode: "VATEX-SA-29",
        exemptionReason: "توريد معفى من الضريبة بموجب المادة 29 من اللائحة",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
      {
        code: "OOS-SALE-02",
        description: "رسوم حكومية مستردة باسم العميل (خارج نطاق الضريبة)",
        quantity: "1",
        billingUnit: "TRIP",
        unitPrice: "1200.00",
        discount: "0",
        category: "O",
        rate: "0",
        exemptionCode: "VATEX-SA-OOS",
        exemptionReason: "مبالغ محصلة باسم ولحساب الغير خارج نطاق الضريبة",
        component: "SUPPLIER_CHARGE",
        taxReviewed: true,
      },
    ],
  });

  // 4f. Proforma Invoice (Non-posting quotation)
  await invoiceRequest<{ id: string }>("", "POST", {
    documentType: "PROFORMA",
    operationKey: crypto.randomUUID(),
    invoiceDate: nowIso,
    buyer: {
      name: "مؤسسة الوفود للسياحة والسفر",
      vatNumber: "300000000000003",
    },
    paymentCode: "30",
    accountingApproved: true,
    bankDetails: {
      bankName: "البنك الأهلي السعودي",
      accountHolder: "شركة ميقات الخليج للنقل البري",
      accountNumber: "1234567890001",
      iban: "SA0310000001234567890001",
      swiftCode: "NCBKSAJE",
    },
    transport: baseTransport,
    lines: [
      {
        code: "PROF-WEEK-01",
        description: "عرض سعر تشغيل 4 حافلات حديثة لمدة أسبوع شامل السائقين والوقود",
        quantity: "4",
        billingUnit: "DAY",
        unitPrice: "3000.00",
        discount: "0",
        category: "S",
        rate: "15",
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
    ],
  });

  // 5. Purchases & Fleet Expenses covering ALL Purchase VAT Boxes
  const fuelPurchase = await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "شركة الدريس للخدمات البترولية",
      supplierVatNumber: "300000000000003",
      invoiceNumber: `FUEL-${suffix}-01`,
      issueDate: today,
      vatDate: today,
      category: "FUEL",
      taxTreatment: "STANDARD",
      netAmount: "4000.00",
      vatAmount: "600.00",
      recoverablePercent: "100",
      evidenceReference: `REF-FUEL-${suffix}`,
      vehiclePlate: "أ ب ج 1234",
      notes: "وقود تشغيل حافلات الأسطول (خصم ضريبي كامل 100%)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expFuelCode,
      paymentAccountCode: bankCode,
      postImmediately: true,
    },
  });

  const maintPurchase = await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "مركز صيانة الأسطول المتقدم",
      supplierVatNumber: "300000000000003",
      invoiceNumber: `MAINT-${suffix}-02`,
      issueDate: today,
      vatDate: today,
      category: "MAINTENANCE_TIRES",
      taxTreatment: "STANDARD",
      netAmount: "6000.00",
      vatAmount: "900.00",
      recoverablePercent: "100",
      evidenceReference: `REF-MAINT-${suffix}`,
      vehiclePlate: "أ ب ج 1234",
      notes: "صيانة دورية وتغيير إطارات على الحساب الآجل (بيانات تجريبية)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expMaintCode,
      paymentAccountCode: payableCode,
      postImmediately: true,
    },
  });

  await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "شركة المكاتب التجارية العقارية",
      supplierVatNumber: "300000000000003",
      invoiceNumber: `RENT-${suffix}-03`,
      issueDate: today,
      vatDate: today,
      category: "RENT_UTILITIES",
      taxTreatment: "STANDARD",
      netAmount: "15000.00",
      vatAmount: "2250.00",
      recoverablePercent: "60",
      evidenceReference: `REF-RENT-${suffix}`,
      notes: "إيجار ومرافق مشتركة (خصم نسبي 60% وجزء غير قابل للخصم 40%)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expRentCode,
      paymentAccountCode: bankCode,
      postImmediately: true,
    },
  });

  await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "شركة الإمداد والنقل الدولي (نسبة صفرية)",
      supplierVatNumber: "300000000000003",
      invoiceNumber: `ZERO-PUR-${suffix}-04`,
      issueDate: today,
      vatDate: today,
      category: "SUBCONTRACTED_TRANSPORT",
      taxTreatment: "ZERO_RATED",
      netAmount: "5500.00",
      vatAmount: "0.00",
      recoverablePercent: "0",
      vehiclePlate: "أ ب ج 1234",
      notes: "مشتريات خدمات نقل دولي خاضعة للنسبة الصفرية 0% (الخانة 10)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expSubcontractCode,
      paymentAccountCode: bankCode,
      postImmediately: true,
    },
  });

  await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "شركة التأمين والخدمات المالية المعفاة",
      invoiceNumber: `EXEMPT-PUR-${suffix}-05`,
      issueDate: today,
      vatDate: today,
      category: "VEHICLE_INSURANCE",
      taxTreatment: "EXEMPT",
      netAmount: "3400.00",
      vatAmount: "0.00",
      recoverablePercent: "0",
      vehiclePlate: "أ ب ج 1234",
      notes: "وثائق ورسوم خدمات مالية معفاة من الضريبة (الخانة 11)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expInsuranceCode,
      paymentAccountCode: bankCode,
      postImmediately: true,
    },
  });

  await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "مسير رواتب وعمولات الكباتن",
      invoiceNumber: `PAYROLL-${suffix}-06`,
      issueDate: today,
      vatDate: today,
      category: "DRIVER_PAYROLL",
      taxTreatment: "OUT_OF_SCOPE",
      netAmount: "18000.00",
      vatAmount: "0.00",
      recoverablePercent: "0",
      vehiclePlate: "د هـ و 5678",
      notes: "رواتب وعمولات السائقين للشهر الحالي (خارج نطاق الضريبة)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expPayrollCode,
      paymentAccountCode: bankCode,
      postImmediately: true,
    },
  });

  await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "الهيئة العامة للنقل (TGA) - رسوم تراخيص وبطاقات تشغيل",
      invoiceNumber: `TGA-GOV-${suffix}-07`,
      issueDate: today,
      vatDate: today,
      category: "GOVERNMENT_FEES",
      taxTreatment: "OUT_OF_SCOPE",
      netAmount: "2500.00",
      vatAmount: "0.00",
      recoverablePercent: "0",
      vehiclePlate: "أ ب ج 1234",
      notes: "رسوم حكومية وتراخيص نقل بري (0.00 ضريبة - لا تدخل في ضريبة المدخلات)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expGovFeesCode,
      paymentAccountCode: bankCode,
      postImmediately: true,
    },
  });

  await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "شركة الأنظمة السحابية والتسويق الرقمي",
      supplierVatNumber: "300000000000003",
      invoiceNumber: `MKT-SOFT-${suffix}-08`,
      issueDate: today,
      vatDate: today,
      category: "MARKETING_SOFTWARE",
      taxTreatment: "STANDARD",
      netAmount: "2000.00",
      vatAmount: "300.00",
      recoverablePercent: "100",
      evidenceReference: `REF-MKT-${suffix}`,
      notes: "اشتراك أنظمة تتبع الأسطول وحملات تسويق رقمي (خاضع 15%)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expMarketingCode,
      paymentAccountCode: bankCode,
      postImmediately: true,
    },
  });

  await accountingRequest<PurchaseRow>("/purchases", "POST", {
    operationKey: crypto.randomUUID(),
    purchase: {
      supplierName: "مؤسسة الضيافة العربية والمستلزمات المكتبية",
      supplierVatNumber: "300000000000003",
      invoiceNumber: `ADM-SUP-${suffix}-09`,
      issueDate: today,
      vatDate: today,
      category: "ADMIN",
      taxTreatment: "STANDARD",
      netAmount: "1200.00",
      vatAmount: "180.00",
      recoverablePercent: "100",
      evidenceReference: `REF-ADM-${suffix}`,
      notes: "مستلزمات ضيافة واستقبال وفود المعتمرين وقرطاسية المكتب (خاضع 15%)",
      documentType: "PURCHASE_INVOICE",
      accountCode: expAdminCode,
      paymentAccountCode: cashCode,
      postImmediately: true,
    },
  });

  if (fuelPurchase.success && fuelPurchase.data?.id) {
    await accountingRequest<PurchaseRow>("/purchases", "POST", {
      operationKey: crypto.randomUUID(),
      purchase: {
        documentType: "PURCHASE_RETURN",
        originalPurchaseId: fuelPurchase.data.id,
        supplierName: "شركة الدريس للخدمات البترولية",
        supplierVatNumber: "300000000000003",
        invoiceNumber: `RET-FUEL-${suffix}`,
        issueDate: today,
        vatDate: today,
        category: "FUEL",
        taxTreatment: "STANDARD",
        netAmount: "500.00",
        vatAmount: "75.00",
        recoverablePercent: "100",
        evidenceReference: `REF-RET-${suffix}`,
        vehiclePlate: "أ ب ج 1234",
        notes: "إشعار دائن من المورد لتسوية فرق كميات الوقود",
        accountCode: expFuelCode,
        paymentAccountCode: bankCode,
        postImmediately: true,
      },
    });
  }

  // 6. Payment Vouchers (Customer Receipt & Supplier Disbursement)
  if (bookingInvoice.success && bookingInvoice.data?.id) {
    await accountingRequest("/payments", "POST", {
      operationKey: crypto.randomUUID(),
      documentType: "SALE",
      documentId: bookingInvoice.data.id,
      amount: "10000.00",
      paymentDate: today,
      cashAccount: bankCode,
      reference: `RCPT-${suffix} - دفعة أولى من شركة قوافل العمرة`,
    });
  }

  if (maintPurchase.success && maintPurchase.data?.id) {
    await accountingRequest("/payments", "POST", {
      operationKey: crypto.randomUUID(),
      documentType: "PURCHASE",
      documentId: maintPurchase.data.id,
      amount: "3000.00",
      paymentDate: today,
      cashAccount: bankCode,
      reference: `PAY-${suffix} - دفعة سداد جزئي لمركز صيانة الأسطول`,
    });
  }

  // 7. Populate VAT Return Settings for Current Quarter (Box 14 Corrections & Box 15 Carried Credit)
  const vatReport = await accountingRequest<VatReport>(
    `/vat-return?mode=QUARTER&year=${period.year}&quarter=${period.quarter}`
  );
  if (vatReport.success && vatReport.data) {
    await accountingRequest(`/vat-return/${period.year}/${period.quarter}`, "PUT", {
      version: vatReport.data.settings.version,
      previousCorrection: "450.00",
      carriedCredit: "1200.00",
      filedOn: today,
      notes: "تصحيح فترة سابقة (الخانة 14) وترحيل رصيد دائن معتمد (الخانة 15) - بيانات تجريبية",
    });
  }

  return {
    success: true,
    message:
      "تم ملء جميع الأقسام بنجاح: أسطول المركبات، الكباتن، الفحص اليومي، العقود الرسمية، شجرة الحسابات (1000–5203)، رأس المال (300,000 ر.س)، الفواتير والمستندات الضريبية (15%، صفرية، صادرات، معفاة، إشعارات دائنة ومدينة)، جميع فئات المشتريات والمصروفات الـ 9 ومرتجعاتها، والإقرار الضريبي الكامل (خانات 1 إلى 16).",
  };
}
