// Isolated rich Arabic demo backend for Miqat Al-Khaleej video walkthrough (port 5129).
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MIQAT_DEMO_PORT || 5129);
const HOST = "127.0.0.1";

const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const yr = Number(day.slice(0, 4));
const qtr = Math.ceil(Number(day.slice(5, 7)) / 3);
const qStartMonth = String((qtr - 1) * 3 + 1).padStart(2, "0");
const qEndMonth = String(qtr * 3).padStart(2, "0");
const qLastDay = String(new Date(Date.UTC(yr, qtr * 3, 0)).getUTCDate()).padStart(2, "0");
const periodStart = `${yr}-${qStartMonth}-01`;
const periodEnd = `${yr}-${qEndMonth}-${qLastDay}`;

const nowIso = new Date().toISOString();

const IDS = {
  c1: "11111111-1111-4111-8111-111111111111",
  c2: "22222222-2222-4222-8222-222222222222",
  c3: "33333333-3333-4333-8333-333333333333",
  cust1: "44444444-4444-4444-8444-444444444401",
  cust2: "44444444-4444-4444-8444-444444444402",
  cust3: "44444444-4444-4444-8444-444444444403",
  cust4: "44444444-4444-4444-8444-444444444404",
  inv1: "55555555-5555-4555-8555-555555555501",
  inv2: "55555555-5555-4555-8555-555555555502",
  inv3: "55555555-5555-4555-8555-555555555503",
  inv4: "55555555-5555-4555-8555-555555555504",
  inv5: "55555555-5555-4555-8555-555555555505",
  inv6: "55555555-5555-4555-8555-555555555506",
  pur1: "66666666-6666-4666-8666-666666666601",
  pur2: "66666666-6666-4666-8666-666666666602",
  pur3: "66666666-6666-4666-8666-666666666603",
  pur4: "66666666-6666-4666-8666-666666666604",
  pur5: "66666666-6666-4666-8666-666666666605",
  pur6: "66666666-6666-4666-8666-666666666606",
};

const superAdmin = {
  id: "admin-super",
  name: "محمد العتيبي — المدير العام",
  email: "miqatalkhaleej@gmail.com",
  role: "ADMIN",
  active: true,
  mustChangePassword: false,
  isSuperAdmin: true,
  phone: "+966501112233",
  permissions: null,
};

const financeAdmin = {
  id: "admin-finance",
  name: "سارة القحطاني — المدير المالي",
  email: "finance@miqatalkhaleej.com",
  role: "ADMIN",
  active: true,
  mustChangePassword: false,
  isSuperAdmin: false,
  phone: "+966502223344",
  permissions: {
    customers: { view: true },
    invoices: { view: true, write: true, delete: true },
    purchases: { view: true, write: true, delete: true },
    accounting: { view: true, write: true, approve: true },
    accounts: { view: true, write: true },
    vatReturns: { view: true, write: true },
    companySettings: { view: true, write: true },
    zatca: { view: true, write: true, approve: true },
  },
};

const opsAdmin = {
  id: "admin-ops",
  name: "تركي الشهري — مشرف العمليات",
  email: "ops@miqatalkhaleej.com",
  role: "ADMIN",
  active: true,
  mustChangePassword: false,
  isSuperAdmin: false,
  phone: "+966503334455",
  permissions: {
    dashboard: { view: true },
    contracts: { view: true, write: true, delete: true, approve: true },
    inspections: { view: true, write: true, delete: true },
    fleet: { view: true, write: true, delete: true },
    captains: { view: true, write: true, delete: true },
    customers: { view: true, write: true },
    whatsapp: { view: true, write: true },
  },
};

let demoAdmins = [superAdmin, financeAdmin, opsAdmin];

const captains = [
  {
    id: IDS.c1,
    name: "عبدالله الحربي",
    email: "captain@example.test",
    role: "CAPTAIN",
    active: true,
    isArchived: false,
    archivedAt: null,
    mustChangePassword: false,
    phone: "0551112233",
    nationalId: "1048291045",
    licenseNumber: "DL-882410",
    licenseExpiry: "2028-11-15",
    assignedVehiclePlate: "أ ب ج 4821",
    hasTodayInspection: true,
    contractCount: 14,
  },
  {
    id: IDS.c2,
    name: "فهد الغامدي",
    email: "fahad@miqatalkhaleej.com",
    role: "CAPTAIN",
    active: true,
    isArchived: false,
    archivedAt: null,
    mustChangePassword: false,
    phone: "0554445566",
    nationalId: "1072914088",
    licenseNumber: "DL-741022",
    licenseExpiry: "2028-06-30",
    assignedVehiclePlate: "ر س ط 9034",
    hasTodayInspection: true,
    contractCount: 11,
  },
  {
    id: IDS.c3,
    name: "ماجد القحطاني",
    email: "majed@miqatalkhaleej.com",
    role: "CAPTAIN",
    active: true,
    isArchived: false,
    archivedAt: null,
    mustChangePassword: false,
    phone: "0557778899",
    nationalId: "1095512031",
    licenseNumber: "DL-663201",
    licenseExpiry: "2027-09-20",
    assignedVehiclePlate: "م ق ت 7710",
    hasTodayInspection: true,
    contractCount: 9,
  },
];

let vehicles = [
  {
    id: IDS.c1,
    plateNumberAr: "أ ب ج 4821",
    plateNumberEn: "ABJ 4821",
    make: "Toyota",
    model: "Hiace VIP",
    category: "VAN",
    year: 2025,
    capacity: 13,
    status: "ON_TRIP",
    registrationExpiry: "2028-10-15",
    insuranceExpiry: "2027-12-30",
  },
  {
    id: IDS.c2,
    plateNumberAr: "ر س ط 9034",
    plateNumberEn: "RST 9034",
    make: "Hyundai",
    model: "Staria Lounge",
    category: "VIP",
    year: 2025,
    capacity: 9,
    status: "AVAILABLE",
    registrationExpiry: "2028-04-12",
    insuranceExpiry: "2027-08-25",
  },
  {
    id: IDS.c3,
    plateNumberAr: "م ق ت 7710",
    plateNumberEn: "MQT 7710",
    make: "GMC",
    model: "Yukon XL",
    category: "SUV",
    year: 2026,
    capacity: 7,
    status: "AVAILABLE",
    registrationExpiry: "2029-01-10",
    insuranceExpiry: "2028-01-10",
  },
];

const allPassChecks = Object.fromEntries(
  [
    "fuelGauge",
    "tempGauge",
    "oilPressure",
    "checkEngine",
    "absLight",
    "warningLights",
    "tires",
    "headlights",
    "signals",
    "mirrors",
    "noLeaks",
    "fireExtinguisher",
    "warningTriangle",
    "firstAidKit",
    "glassHammer",
    "seatBelts",
  ].map((k) => [k, true]),
);

const inspections = [
  {
    id: IDS.c1,
    captainId: IDS.c1,
    captainName: captains[0].name,
    captainPhone: captains[0].phone,
    vehiclePlate: vehicles[0].plateNumberAr,
    inspectionDate: `${day}T08:15:00+03:00`,
    createdAt: nowIso,
    ...allPassChecks,
    driverDeclared: true,
    notes: "المركبة جاهزة ونظيفة بالكامل لانطلاق رحلة العمرة",
    contractCount: 1,
  },
  {
    id: IDS.c2,
    captainId: IDS.c2,
    captainName: captains[1].name,
    captainPhone: captains[1].phone,
    vehiclePlate: vehicles[1].plateNumberAr,
    inspectionDate: `${day}T09:05:00+03:00`,
    createdAt: nowIso,
    ...allPassChecks,
    driverDeclared: true,
    notes: "تم فحص الإطارات وضغط المحرك والتكييف قبل التحرك",
    contractCount: 1,
  },
  {
    id: IDS.c3,
    captainId: IDS.c3,
    captainName: captains[2].name,
    captainPhone: captains[2].phone,
    vehiclePlate: vehicles[2].plateNumberAr,
    inspectionDate: `${day}T09:40:00+03:00`,
    createdAt: nowIso,
    ...allPassChecks,
    driverDeclared: true,
    notes: "فحص صباحي مكتمل 16/16",
    contractCount: 1,
  },
];

const customers = [
  {
    id: IDS.cust1,
    type: "COMPANY",
    name: "شركة روافد الحج والعمرة",
    phone: "0552001100",
    email: "accounts@rawafed-umrah.sa",
    vatNumber: "310294817200003",
    vatRegistered: true,
    active: true,
    version: 1,
    address: {
      building: "4210",
      street: "طريق الملك عبدالعزيز",
      district: "الشاطئ",
      city: "جدة",
      postalCode: "23413",
      country: "SA",
    },
  },
  {
    id: IDS.cust2,
    type: "COMPANY",
    name: "فندق أجياد مكة المكرمة",
    phone: "0553002211",
    email: "finance@ajyad-makkah.sa",
    vatNumber: "310582910300003",
    vatRegistered: true,
    active: true,
    version: 1,
    address: {
      building: "1105",
      street: "شارع أجياد العام",
      district: "أجياد",
      city: "مكة المكرمة",
      postalCode: "24231",
      country: "SA",
    },
  },
  {
    id: IDS.cust3,
    type: "COMPANY",
    name: "مجموعة الراجحي للسياحة والضيافة",
    phone: "0554003322",
    email: "billing@alrajhi-travel.sa",
    vatNumber: "310772819400003",
    vatRegistered: true,
    active: true,
    version: 1,
  },
  {
    id: IDS.cust4,
    type: "INDIVIDUAL",
    name: "خالد بن سعد العتيبي",
    phone: "0559182736",
    email: "khaled.otaibi@example.sa",
    vatRegistered: false,
    active: true,
    version: 1,
  },
];

let contracts = [
  {
    id: IDS.c1,
    referenceNumber: "MQ-2026-1042",
    customerId: IDS.cust1,
    customerName: customers[0].name,
    customerPhone: customers[0].phone,
    operationType: "AIRPORT_TRANSFER",
    origin: "مطار الملك عبدالعزيز الدولي — جدة",
    destination: "فندق برج الساعة — مكة المكرمة",
    tripDate: day,
    tripTime: "10:30",
    captainId: IDS.c1,
    captain: captains[0],
    vehiclePlate: vehicles[0].plateNumberAr,
    issueDate: day,
    inspectionId: IDS.c1,
    inspection: inspections[0],
    passengers: [
      { id: "p1", name: "عبدالرحمن بن فهد السالم", nationality: "SA", idNumber: "1059281742" },
      { id: "p2", name: "منيرة بنت علي السالم", nationality: "SA", idNumber: "1062819471" },
      { id: "p3", name: "فيصل عبدالرحمن السالم", nationality: "SA", idNumber: "1120491823" },
    ],
    status: "APPROVED",
    createdAt: nowIso,
  },
  {
    id: IDS.c2,
    referenceNumber: "MQ-2026-1041",
    customerId: IDS.cust2,
    customerName: customers[1].name,
    customerPhone: customers[1].phone,
    operationType: "INTERCITY",
    origin: "مكة المكرمة — حي العزيزية",
    destination: "المدينة المنورة — المنطقة المركزية",
    tripDate: day,
    tripTime: "14:00",
    captainId: IDS.c2,
    captain: captains[1],
    vehiclePlate: vehicles[1].plateNumberAr,
    issueDate: day,
    inspectionId: IDS.c2,
    inspection: inspections[1],
    passengers: [
      { id: "p4", name: "طارق محمود الحسيني", nationality: "EG", idNumber: "A29481720" },
      { id: "p5", name: "سمير عادل المنصور", nationality: "JO", idNumber: "K9182731" },
    ],
    status: "ACTIVE",
    createdAt: nowIso,
  },
  {
    id: IDS.c3,
    referenceNumber: "MQ-2026-1040",
    customerId: IDS.cust3,
    customerName: customers[2].name,
    customerPhone: customers[2].phone,
    operationType: "VIP_CHARTER",
    origin: "فندق ريتز كارلتون — جدة",
    destination: "المسجد النبوي الشريف — المدينة",
    tripDate: day,
    tripTime: "17:15",
    captainId: IDS.c3,
    captain: captains[2],
    vehiclePlate: vehicles[2].plateNumberAr,
    issueDate: day,
    inspectionId: IDS.c3,
    inspection: inspections[2],
    passengers: [
      { id: "p6", name: "سلطان بن ناصر الدوسري", nationality: "SA", idNumber: "1039481725" },
    ],
    status: "APPROVED",
    createdAt: nowIso,
  },
];

const company = {
  legalName: "شركة ميقات الخليج للنقل البري",
  vatNumber: "310482910400003",
  commercialRegistration: "4030491820",
  address: {
    street: "طريق الحرمين السريع",
    building: "7420",
    district: "النسيم",
    city: "جدة",
    postalCode: "23233",
    country: "SA",
  },
  bankDetails: {
    bankName: "البنك الأهلي السعودي SNB",
    accountHolder: "شركة ميقات الخليج للنقل البري",
    iban: "SA4410000024800019482701",
    accountNumber: "24800019482701",
  },
  presentation: {
    englishName: "Miqat Al-Khaleej Land Transport Co.",
    website: "https://miqatalkhaleej.com",
    showSeal: true,
  },
};

const makeInvSnapshot = ({
  docType,
  kind,
  profile,
  buyerName,
  desc,
  net,
  vat,
  gross,
  rate = "15",
  cat = "S",
  plate = vehicles[0].plateNumberAr,
  paymentCode = "30",
  settlementAccountCode = "1103",
}) => ({
  issuer: company,
  input: {
    documentType: docType,
    invoiceDate: `${day}T10:00:00+03:00`,
    buyer: { name: buyerName },
    ...(docType === "TAX"
      ? { taxDocument: { kind, profile, supplyDate: day } }
      : {}),
    paymentCode,
    accountingApproved: true,
    accounting: {
      revenueAccountCode: rate === "0" ? "4102" : "4101",
      settlementAccountCode,
    },
    lines: [
      {
        code: "TRP",
        description: desc,
        quantity: "1",
        unitPrice: net,
        discount: "0",
        category: cat,
        rate,
        component: "OWN_SUPPLY",
        taxReviewed: true,
      },
    ],
    transport: {
      serviceType: "AIRPORT_TRANSFER",
      contractReference: "MQ-2026-1042",
      origin: "مطار الملك عبدالعزيز الدولي — جدة",
      destination: "مكة المكرمة",
      tripDate: day,
      departureTime: "10:30",
      contactName: buyerName,
      vehiclePlate: plate,
      distanceUnit: "KM",
    },
  },
  totals: { net, vat, gross },
});

let invoices = [
  {
    id: IDS.inv1,
    invoiceNumber: "TAX-000108",
    customerId: IDS.cust1,
    customerName: customers[0].name,
    netAmount: "15000.00",
    vatAmount: "2250.00",
    totalAmount: "17250.00",
    invoiceDate: `${day}T10:15:00+03:00`,
    createdAt: nowIso,
    status: "SAVED",
    documentType: "TAX",
    taxDocument: { kind: "INVOICE", profile: "STANDARD", supplyDate: day },
    contractId: IDS.c1,
    verificationUrl: `http://127.0.0.1:3429/verify/invoice/${IDS.inv1}`,
    paymentSummary: {
      balance: "0.00",
      netDocumentAmount: "17250.00",
      settledAmount: "17250.00",
      direction: "RECEIPT",
      status: "PAID",
    },
    snapshot: makeInvSnapshot({
      docType: "TAX",
      kind: "INVOICE",
      profile: "STANDARD",
      buyerName: customers[0].name,
      desc: "تأجير 5 حافلات نقل معتمرين جدة — مكة ذهاباً وإياباً",
      net: "15000.00",
      vat: "2250.00",
      gross: "17250.00",
      paymentCode: "42",
      settlementAccountCode: "1102",
    }),
  },
  {
    id: IDS.inv2,
    invoiceNumber: "TAX-000107",
    customerId: IDS.cust2,
    customerName: customers[1].name,
    netAmount: "8000.00",
    vatAmount: "1200.00",
    totalAmount: "9200.00",
    invoiceDate: `${day}T09:45:00+03:00`,
    createdAt: nowIso,
    status: "SAVED",
    documentType: "TAX",
    taxDocument: { kind: "INVOICE", profile: "STANDARD", supplyDate: day },
    contractId: IDS.c2,
    verificationUrl: `http://127.0.0.1:3429/verify/invoice/${IDS.inv2}`,
    paymentSummary: {
      balance: "4200.00",
      netDocumentAmount: "9200.00",
      settledAmount: "5000.00",
      direction: "RECEIPT",
      status: "PARTIAL",
    },
    snapshot: makeInvSnapshot({
      docType: "TAX",
      kind: "INVOICE",
      profile: "STANDARD",
      buyerName: customers[1].name,
      desc: "رحلات VIP من مكة المكرمة إلى المدينة المنورة",
      net: "8000.00",
      vat: "1200.00",
      gross: "9200.00",
      plate: vehicles[1].plateNumberAr,
    }),
  },
  {
    id: IDS.inv3,
    invoiceNumber: "TAX-000106",
    customerId: IDS.cust3,
    customerName: customers[2].name,
    netAmount: "5000.00",
    vatAmount: "750.00",
    totalAmount: "5750.00",
    invoiceDate: `${day}T09:00:00+03:00`,
    createdAt: nowIso,
    status: "SAVED",
    documentType: "TAX",
    taxDocument: { kind: "INVOICE", profile: "STANDARD", supplyDate: day },
    contractId: IDS.c3,
    verificationUrl: `http://127.0.0.1:3429/verify/invoice/${IDS.inv3}`,
    paymentSummary: {
      balance: "5750.00",
      netDocumentAmount: "5750.00",
      settledAmount: "0.00",
      direction: "RECEIPT",
      status: "UNPAID",
    },
    snapshot: makeInvSnapshot({
      docType: "TAX",
      kind: "INVOICE",
      profile: "STANDARD",
      buyerName: customers[2].name,
      desc: "نقل كبار الشخصيات جدة — المدينة المنورة (GMC Yukon XL)",
      net: "5000.00",
      vat: "750.00",
      gross: "5750.00",
      plate: vehicles[2].plateNumberAr,
    }),
  },
  {
    id: IDS.inv4,
    invoiceNumber: "TAX-000105",
    customerId: IDS.cust4,
    customerName: customers[3].name,
    netAmount: "1200.00",
    vatAmount: "180.00",
    totalAmount: "1380.00",
    invoiceDate: `${day}T08:30:00+03:00`,
    createdAt: nowIso,
    status: "SAVED",
    documentType: "TAX",
    taxDocument: { kind: "INVOICE", profile: "SIMPLIFIED", supplyDate: day },
    verificationUrl: `http://127.0.0.1:3429/verify/invoice/${IDS.inv4}`,
    paymentSummary: {
      balance: "0.00",
      netDocumentAmount: "1380.00",
      settledAmount: "1380.00",
      direction: "RECEIPT",
      status: "PAID",
    },
    snapshot: makeInvSnapshot({
      docType: "TAX",
      kind: "INVOICE",
      profile: "SIMPLIFIED",
      buyerName: customers[3].name,
      desc: "توصيل عائلي خاص مطار جدة — الحرم المكي",
      net: "1200.00",
      vat: "180.00",
      gross: "1380.00",
      paymentCode: "10",
      settlementAccountCode: "1101",
    }),
  },
  {
    id: IDS.inv5,
    invoiceNumber: "CN-000103",
    customerId: IDS.cust1,
    customerName: customers[0].name,
    netAmount: "1000.00",
    vatAmount: "150.00",
    totalAmount: "1150.00",
    invoiceDate: `${day}T08:00:00+03:00`,
    createdAt: nowIso,
    status: "SAVED",
    documentType: "TAX",
    taxDocument: {
      kind: "CREDIT",
      profile: "STANDARD",
      supplyDate: day,
      originalInvoiceId: IDS.inv1,
      adjustmentReason: "تخفيض متفق عليه لرحلة ملغاة جزئياً",
    },
    verificationUrl: `http://127.0.0.1:3429/verify/invoice/${IDS.inv5}`,
    paymentSummary: null,
    snapshot: makeInvSnapshot({
      docType: "TAX",
      kind: "CREDIT",
      profile: "STANDARD",
      buyerName: customers[0].name,
      desc: "إشعار دائن — خصم متفق عليه",
      net: "1000.00",
      vat: "150.00",
      gross: "1150.00",
    }),
  },
  {
    id: IDS.inv6,
    invoiceNumber: "SO-000102",
    customerId: IDS.cust3,
    customerName: customers[2].name,
    netAmount: "4500.00",
    vatAmount: "675.00",
    totalAmount: "5175.00",
    invoiceDate: `${day}T07:45:00+03:00`,
    createdAt: nowIso,
    status: "SAVED",
    documentType: "PROFORMA",
    verificationUrl: `http://127.0.0.1:3429/verify/invoice/${IDS.inv6}`,
    paymentSummary: null,
    snapshot: makeInvSnapshot({
      docType: "PROFORMA",
      kind: "INVOICE",
      profile: "STANDARD",
      buyerName: customers[2].name,
      desc: "عرض سعر — موسم العمرة القادم",
      net: "4500.00",
      vat: "675.00",
      gross: "5175.00",
    }),
  },
];

let purchases = [
  {
    id: IDS.pur1,
    voucher: "EXP-00042",
    documentType: "PURCHASE_INVOICE",
    postingStatus: "POSTED",
    supplierName: "شركة الدريس للخدمات البترولية",
    supplierVatNumber: "300049182700003",
    invoiceNumber: "ALD-2026-8812",
    issueDate: day,
    vatDate: day,
    category: "FUEL",
    accountCode: "5101",
    paymentAccountCode: "1102",
    taxTreatment: "STANDARD",
    netAmount: "4000.00",
    vatAmount: "600.00",
    recoverablePercent: "100.00",
    recoverableVat: "600.00",
    totalAmount: "4600.00",
    vehicleId: IDS.c1,
    vehiclePlate: vehicles[0].plateNumberAr,
    evidenceReference: "ALD-SLIP-8812",
    notes: "تعبئة وقود ديزل وبنزين لأسطول حافلات مكة وجدة",
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    voidedAt: null,
    voidReason: null,
    paymentSummary: {
      balance: "0.00",
      netDocumentAmount: "4600.00",
      settledAmount: "4600.00",
      direction: "PAYMENT",
      status: "PAID",
    },
  },
  {
    id: IDS.pur2,
    voucher: "EXP-00041",
    documentType: "PURCHASE_INVOICE",
    postingStatus: "POSTED",
    supplierName: "مركز المجد لصيانة الحافلات والإطارات",
    supplierVatNumber: "300192837400003",
    invoiceNumber: "MJD-4410",
    issueDate: day,
    vatDate: day,
    category: "MAINTENANCE_TIRES",
    accountCode: "5102",
    paymentAccountCode: "2101",
    taxTreatment: "STANDARD",
    netAmount: "3000.00",
    vatAmount: "450.00",
    recoverablePercent: "100.00",
    recoverableVat: "450.00",
    totalAmount: "3450.00",
    vehicleId: IDS.c2,
    vehiclePlate: vehicles[1].plateNumberAr,
    evidenceReference: "MJD-INV-4410",
    notes: "تغيير طقم إطارات وصيانة دورية شاملة (آجل على المورد)",
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    voidedAt: null,
    voidReason: null,
    paymentSummary: {
      balance: "3450.00",
      netDocumentAmount: "3450.00",
      settledAmount: "0.00",
      direction: "PAYMENT",
      status: "UNPAID",
    },
  },
  {
    id: IDS.pur3,
    voucher: "EXP-00040",
    documentType: "PURCHASE_INVOICE",
    postingStatus: "POSTED",
    supplierName: "شركة التعاونية للتأمين التعاوني",
    supplierVatNumber: "300004918200003",
    invoiceNumber: "TAW-77192",
    issueDate: day,
    vatDate: day,
    category: "VEHICLE_INSURANCE",
    accountCode: "5104",
    paymentAccountCode: "2101",
    taxTreatment: "STANDARD",
    netAmount: "6000.00",
    vatAmount: "900.00",
    recoverablePercent: "100.00",
    recoverableVat: "900.00",
    totalAmount: "6900.00",
    vehicleId: IDS.c3,
    vehiclePlate: vehicles[2].plateNumberAr,
    evidenceReference: "TAW-POL-77192",
    notes: "تجديد وثيقة التأمين الشامل السنوي للمركبات",
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    voidedAt: null,
    voidReason: null,
    paymentSummary: {
      balance: "2900.00",
      netDocumentAmount: "6900.00",
      settledAmount: "4000.00",
      direction: "PAYMENT",
      status: "PARTIAL",
    },
  },
  {
    id: IDS.pur4,
    voucher: "EXP-00039",
    documentType: "PURCHASE_INVOICE",
    postingStatus: "POSTED",
    supplierName: "رواتب السائقين والميدان — مسير الشهر",
    invoiceNumber: "PAYROLL-2026-11",
    issueDate: day,
    vatDate: day,
    category: "DRIVER_PAYROLL",
    accountCode: "5105",
    paymentAccountCode: "1102",
    taxTreatment: "OUT_OF_SCOPE",
    netAmount: "14500.00",
    vatAmount: "0.00",
    recoverablePercent: "0.00",
    recoverableVat: "0.00",
    totalAmount: "14500.00",
    notes: "صرف مستحقات ورواتب السائقين الشهرية عبر البنك الأهلي",
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    voidedAt: null,
    voidReason: null,
    paymentSummary: {
      balance: "0.00",
      netDocumentAmount: "14500.00",
      settledAmount: "14500.00",
      direction: "PAYMENT",
      status: "PAID",
    },
  },
  {
    id: IDS.pur5,
    voucher: "EXP-00038",
    documentType: "PURCHASE_INVOICE",
    postingStatus: "POSTED",
    supplierName: "الهيئة العامة للنقل — سداد تراخيص التشغيل",
    invoiceNumber: "TGA-90122",
    issueDate: day,
    vatDate: day,
    category: "GOVERNMENT_FEES",
    accountCode: "5106",
    paymentAccountCode: "1102",
    taxTreatment: "OUT_OF_SCOPE",
    netAmount: "2200.00",
    vatAmount: "0.00",
    recoverablePercent: "0.00",
    recoverableVat: "0.00",
    totalAmount: "2200.00",
    notes: "رسوم تجديد كروت التشغيل السنوية للحافلات",
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    voidedAt: null,
    voidReason: null,
    paymentSummary: {
      balance: "0.00",
      netDocumentAmount: "2200.00",
      settledAmount: "2200.00",
      direction: "PAYMENT",
      status: "PAID",
    },
  },
];

const demoAccounts = [
  { id: "a1000", code: "1000", nameAr: "الأصول", nameEn: "Assets", parentId: null, type: "ASSET", normalBalance: "DEBIT", isPosting: false, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a1100", code: "1100", nameAr: "الأصول المتداولة", nameEn: "Current Assets", parentId: "a1000", type: "ASSET", normalBalance: "DEBIT", isPosting: false, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a1101", code: "1101", nameAr: "الصندوق الرئيسي", nameEn: "Main Cash Box", parentId: "a1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a1102", code: "1102", nameAr: "البنك الأهلي السعودي SNB", nameEn: "SNB Bank Account", parentId: "a1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a1103", code: "1103", nameAr: "ذمم العملاء (المدينون)", nameEn: "Accounts Receivable", parentId: "a1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a1104", code: "1104", nameAr: "ضريبة المدخلات القابلة للخصم", nameEn: "Recoverable Input VAT", parentId: "a1100", type: "ASSET", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a1201", code: "1201", nameAr: "أسطول الحافلات والمركبات", nameEn: "Fleet Vehicles", parentId: "a1000", type: "ASSET", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a2000", code: "2000", nameAr: "الالتزامات", nameEn: "Liabilities", parentId: null, type: "LIABILITY", normalBalance: "CREDIT", isPosting: false, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a2101", code: "2101", nameAr: "ذمم الموردين (الدائنون)", nameEn: "Accounts Payable", parentId: "a2000", type: "LIABILITY", normalBalance: "CREDIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a2102", code: "2102", nameAr: "ضريبة القيمة المضافة", nameEn: "Value Added Tax (VAT)", parentId: "a2000", type: "LIABILITY", normalBalance: "CREDIT", isPosting: false, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a210201", code: "210201", nameAr: "ضريبة المخرجات (المبيعات 15%)", nameEn: "Output VAT (15%)", parentId: "a2102", type: "LIABILITY", normalBalance: "CREDIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a210202", code: "210202", nameAr: "ضريبة المدخلات (المشتريات 15%)", nameEn: "Input VAT (15%)", parentId: "a2102", type: "ASSET", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a3000", code: "3000", nameAr: "حقوق الملكية", nameEn: "Equity", parentId: null, type: "EQUITY", normalBalance: "CREDIT", isPosting: false, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a3101", code: "3101", nameAr: "رأس المال المدفوع", nameEn: "Paid-In Capital", parentId: "a3000", type: "EQUITY", normalBalance: "CREDIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a4000", code: "4000", nameAr: "الإيرادات", nameEn: "Revenues", parentId: null, type: "REVENUE", normalBalance: "CREDIT", isPosting: false, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a4101", code: "4101", nameAr: "إيرادات خدمات النقل (15%)", nameEn: "Transport Services Revenue (15%)", parentId: "a4000", type: "REVENUE", normalBalance: "CREDIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a4102", code: "4102", nameAr: "إيرادات النقل الدولي (0%)", nameEn: "Zero-Rated International Transport", parentId: "a4000", type: "REVENUE", normalBalance: "CREDIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a5000", code: "5000", nameAr: "المصروفات التشغيلية والإدارية", nameEn: "Operating & Admin Expenses", parentId: null, type: "EXPENSE", normalBalance: "DEBIT", isPosting: false, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a5101", code: "5101", nameAr: "وقود ومحروقات الأسطول", nameEn: "Fleet Fuel", parentId: "a5000", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a5102", code: "5102", nameAr: "صيانة الحافلات والإطارات", nameEn: "Vehicle Maintenance & Tyres", parentId: "a5000", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a5104", code: "5104", nameAr: "تأمين المركبات", nameEn: "Vehicle Insurance", parentId: "a5000", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a5105", code: "5105", nameAr: "رواتب وتريبات السائقين", nameEn: "Driver Payroll & Trip Bonuses", parentId: "a5000", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
  { id: "a5106", code: "5106", nameAr: "رسوم وتراخيص حكومية TGA", nameEn: "TGA Fees & Permits", parentId: "a5000", type: "EXPENSE", normalBalance: "DEBIT", isPosting: true, isActive: true, isSystem: true, profitSection: "OPERATING" },
];

const trialRows = [
  { code: "1101", nameAr: "الصندوق الرئيسي", nameEn: "Main Cash Box", type: "ASSET", profitSection: "OPERATING", openingDebit: "12000.00", openingCredit: "0.00", debit: "6500.00", credit: "1200.00", closingDebit: "17300.00", closingCredit: "0.00" },
  { code: "1102", nameAr: "البنك الأهلي السعودي SNB", nameEn: "SNB Bank Account", type: "ASSET", profitSection: "OPERATING", openingDebit: "288000.00", openingCredit: "0.00", debit: "22250.00", credit: "25300.00", closingDebit: "284950.00", closingCredit: "0.00" },
  { code: "1103", nameAr: "ذمم العملاء (المدينون)", nameEn: "Accounts Receivable", type: "ASSET", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "14950.00", credit: "5000.00", closingDebit: "9950.00", closingCredit: "0.00" },
  { code: "2101", nameAr: "ذمم الموردين (الدائنون)", nameEn: "Accounts Payable", type: "LIABILITY", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "4000.00", credit: "10350.00", closingDebit: "0.00", closingCredit: "6350.00" },
  { code: "210201", nameAr: "ضريبة المخرجات (المبيعات 15%)", nameEn: "Output VAT (15%)", type: "LIABILITY", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "150.00", credit: "4380.00", closingDebit: "0.00", closingCredit: "4230.00" },
  { code: "210202", nameAr: "ضريبة المدخلات (المشتريات 15%)", nameEn: "Input VAT (15%)", type: "ASSET", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "1950.00", credit: "0.00", closingDebit: "1950.00", closingCredit: "0.00" },
  { code: "3101", nameAr: "رأس المال المدفوع", nameEn: "Paid-In Capital", type: "EQUITY", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "300000.00", debit: "0.00", credit: "0.00", closingDebit: "0.00", closingCredit: "300000.00" },
  { code: "4101", nameAr: "إيرادات خدمات النقل (15%)", nameEn: "Transport Services Revenue", type: "REVENUE", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "1000.00", credit: "29200.00", closingDebit: "0.00", closingCredit: "28200.00" },
  { code: "5101", nameAr: "وقود ومحروقات الأسطول", nameEn: "Fleet Fuel", type: "EXPENSE", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "4000.00", credit: "0.00", closingDebit: "4000.00", closingCredit: "0.00" },
  { code: "5102", nameAr: "صيانة الحافلات والإطارات", nameEn: "Vehicle Maintenance", type: "EXPENSE", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "3000.00", credit: "0.00", closingDebit: "3000.00", closingCredit: "0.00" },
  { code: "5104", nameAr: "تأمين المركبات", nameEn: "Vehicle Insurance", type: "EXPENSE", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "6000.00", credit: "0.00", closingDebit: "6000.00", closingCredit: "0.00" },
  { code: "5105", nameAr: "رواتب وتريبات السائقين", nameEn: "Driver Payroll", type: "EXPENSE", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "14500.00", credit: "0.00", closingDebit: "14500.00", closingCredit: "0.00" },
  { code: "5106", nameAr: "رسوم وتراخيص حكومية TGA", nameEn: "TGA Permits", type: "EXPENSE", profitSection: "OPERATING", openingDebit: "0.00", openingCredit: "0.00", debit: "2200.00", credit: "0.00", closingDebit: "2200.00", closingCredit: "0.00" },
];

const vehicleProfitRows = [
  { plate: "أ ب ج 4821", revenue: "15200.00", cost: "6400.00", profit: "8800.00" },
  { plate: "ر س ط 9034", revenue: "8000.00", cost: "4800.00", profit: "3200.00" },
  { plate: "م ق ت 7710", revenue: "5000.00", cost: "2100.00", profit: "2900.00" },
];

const demoFinancial = {
  range: { start: periodStart, endInclusive: periodEnd },
  profit: {
    revenue: "28200.00",
    expenses: "29700.00",
    beforeTax: "-1500.00",
    taxExpense: "0.00",
    afterTax: "-1500.00",
  },
  trial: trialRows,
  totals: {
    debit: "80500.00",
    credit: "80500.00",
    closingDebit: "343850.00",
    closingCredit: "338780.00",
  },
  vehicles: vehicleProfitRows,
  unpostedInvoices: [],
  entries: [],
  generatedAt: nowIso,
};

// Fix profit cleanly to reflect strong positive profit for clean presentation:
demoFinancial.profit = {
  revenue: "110000.00",
  expenses: "29700.00",
  beforeTax: "80300.00",
  taxExpense: "0.00",
  afterTax: "80300.00",
};
demoFinancial.vehicles = [
  { plate: "أ ب ج 4821", revenue: "54000.00", cost: "14200.00", profit: "39800.00" },
  { plate: "ر س ط 9034", revenue: "34000.00", cost: "9800.00", profit: "24200.00" },
  { plate: "م ق ت 7710", revenue: "22000.00", cost: "5700.00", profit: "16300.00" },
];

let demoPayments = [
  {
    id: "pay-1",
    direction: "RECEIPT",
    documentType: "SALE",
    documentId: IDS.inv1,
    documentRef: "TAX-000108 · شركة روافد الحج والعمرة",
    cashAccount: "1102",
    reference: "حوالة بنكية SNB — سداد كامل فاتورة TAX-000108",
    amount: "17250.00",
    paymentDate: day,
    journal: { number: 108 },
  },
  {
    id: "pay-2",
    direction: "RECEIPT",
    documentType: "SALE",
    documentId: IDS.inv2,
    documentRef: "TAX-000107 · فندق أجياد مكة المكرمة",
    cashAccount: "1102",
    reference: "دفعة أولى من فندق أجياد مكة — حوالة بنكية",
    amount: "5000.00",
    paymentDate: day,
    journal: { number: 107 },
  },
  {
    id: "pay-3",
    direction: "RECEIPT",
    documentType: "SALE",
    documentId: IDS.inv4,
    documentRef: "TAX-000105 · خالد بن سعد العتيبي",
    cashAccount: "1101",
    reference: "تحصيل نقدي بالصندوق الرئيسي",
    amount: "1380.00",
    paymentDate: day,
    journal: { number: 105 },
  },
  {
    id: "pay-4",
    direction: "PAYMENT",
    documentType: "PURCHASE",
    documentId: IDS.pur3,
    documentRef: "EXP-00040 · شركة التعاونية للتأمين التعاوني",
    cashAccount: "1102",
    reference: "سداد دفعة من بوليصة التأمين الشامل",
    amount: "4000.00",
    paymentDate: day,
    journal: { number: 104 },
  },
];

const demoJournals = [
  {
    id: "j-108",
    number: 108,
    entryDate: day,
    description: "تحصيل فاتورة شركة روافد الحج والعمرة (TAX-000108)",
    sourceType: "PAYMENT",
    reversesId: null,
    reversal: null,
    lines: [
      { id: "jl-1", accountCode: "1102", account: { nameAr: "البنك الأهلي السعودي SNB", nameEn: "SNB Bank" }, debit: "17250.00", credit: "0.00", description: "إيداع حوالة العميل", vehiclePlate: null },
      { id: "jl-2", accountCode: "1103", account: { nameAr: "ذمم العملاء (المدينون)", nameEn: "Accounts Receivable" }, debit: "0.00", credit: "17250.00", description: "إقفال ذمة TAX-000108", vehiclePlate: null },
    ],
  },
  {
    id: "j-107",
    number: 107,
    entryDate: day,
    description: "إثبات إيراد فاتورة فندق أجياد مكة (TAX-000107)",
    sourceType: "SALE",
    reversesId: null,
    reversal: null,
    lines: [
      { id: "jl-3", accountCode: "1103", account: { nameAr: "ذمم العملاء (المدينون)", nameEn: "Accounts Receivable" }, debit: "9200.00", credit: "0.00", description: "استحقاق فندق أجياد مكة", vehiclePlate: vehicles[1].plateNumberAr },
      { id: "jl-4", accountCode: "4101", account: { nameAr: "إيرادات خدمات النقل (15%)", nameEn: "Transport Revenue" }, debit: "0.00", credit: "8000.00", description: "صافي إيراد رحلات VIP", vehiclePlate: vehicles[1].plateNumberAr },
      { id: "jl-5", accountCode: "210201", account: { nameAr: "ضريبة المخرجات (المبيعات 15%)", nameEn: "Output VAT" }, debit: "0.00", credit: "1200.00", description: "ضريبة القيمة المضافة 15%", vehiclePlate: null },
    ],
  },
  {
    id: "j-106",
    number: 106,
    entryDate: day,
    description: "مصروف وقود الأسطول — شركة الدريس للبترول (EXP-00042)",
    sourceType: "PURCHASE",
    reversesId: null,
    reversal: null,
    lines: [
      { id: "jl-6", accountCode: "5101", account: { nameAr: "وقود ومحروقات الأسطول", nameEn: "Fleet Fuel" }, debit: "4000.00", credit: "0.00", description: "فاتورة وقود شهرية", vehiclePlate: vehicles[0].plateNumberAr },
      { id: "jl-7", accountCode: "210202", account: { nameAr: "ضريبة المدخلات (المشتريات 15%)", nameEn: "Input VAT" }, debit: "600.00", credit: "0.00", description: "ضريبة مدخلات قابلة للخصم", vehiclePlate: null },
      { id: "jl-8", accountCode: "1102", account: { nameAr: "البنك الأهلي السعودي SNB", nameEn: "SNB Bank" }, debit: "0.00", credit: "4600.00", description: "سداد بنكي مباشر", vehiclePlate: null },
    ],
  },
];

const vatBoxLabels = [
  "المبيعات الخاضعة للنسبة الأساسية (15%)",
  "المبيعات الخاصة للمواطنين (مساكن/صحة)",
  "المبيعات الخاضعة للنسبة الصفرية",
  "الصادرات",
  "المبيعات المعفاة",
  "إجمالي المبيعات وضريبة المخرجات",
  "المشتريات الخاضعة للنسبة الأساسية المحلية (15%)",
  "الاستيرادات الخاضعة للضريبة عند المنافذ",
  "الاستيرادات الخاضعة للآلية العكسية",
  "المشتريات الخاضعة للنسبة الصفرية",
  "المشتريات المعفاة",
  "إجمالي المشتريات وضريبة المدخلات القابلة للخصم",
  "صافي ضريبة الفترة الحالية (خ6 − خ12)",
  "تصحيحات فترات سابقة (+/-)",
  "الرصيد الدائن المرحل من فترات سابقة",
  "صافي الضريبة المستحقة أو القابلة للاسترداد",
];

const demoVatRows = vatBoxLabels.map((label, idx) => {
  const box = idx + 1;
  const section = box <= 6 ? "SALES" : box <= 12 ? "PURCHASES" : "NET";
  const isTotal = [6, 12, 13, 16].includes(box);
  let amount = "0.00";
  let adjustment = "0.00";
  let vat = "0.00";
  if (box === 1) {
    amount = "29200.00";
    adjustment = "1000.00";
    vat = "4230.00";
  } else if (box === 6) {
    amount = "29200.00";
    adjustment = "1000.00";
    vat = "4230.00";
  } else if (box === 7) {
    amount = "13000.00";
    vat = "1950.00";
  } else if (box === 12) {
    amount = "13000.00";
    vat = "1950.00";
  } else if (box === 13) {
    amount = null;
    adjustment = null;
    vat = "2280.00";
  } else if (box === 14 || box === 15) {
    amount = null;
    adjustment = null;
    vat = "0.00";
  } else if (box === 16) {
    amount = null;
    adjustment = null;
    vat = "2280.00";
  }
  return { box, label, section, amount, adjustment, vat, displayVat: vat, isTotal };
});

const demoVatReport = {
  year: yr,
  quarter: qtr,
  period: { start: periodStart, endExclusive: periodEnd, endInclusive: periodEnd, dueDate: `${yr}-12-31` },
  company: { legalName: company.legalName, vatNumber: company.vatNumber },
  generatedAt: nowIso,
  settings: { version: 1, previousCorrection: "0.00", carriedCredit: "0.00", notes: "", filedOn: null, updatedAt: null },
  rows: demoVatRows,
  sales: invoices
    .filter((i) => i.documentType !== "PROFORMA")
    .map((i) => ({
      id: i.id,
      number: i.invoiceNumber,
      source: "LOCAL",
      kind: i.taxDocument?.kind || "INVOICE",
      date: day,
      net: i.taxDocument?.kind === "CREDIT" ? `-${i.netAmount}` : i.netAmount,
      vat: i.taxDocument?.kind === "CREDIT" ? `-${i.vatAmount}` : i.vatAmount,
      isPriorPeriodAdjustment: false,
      customerName: i.customerName,
      documentType: i.documentType,
    })),
  purchases: purchases
    .filter((p) => p.taxTreatment === "STANDARD")
    .map((p) => ({
      id: p.id,
      supplierName: p.supplierName,
      invoiceNumber: p.invoiceNumber,
      taxTreatment: p.taxTreatment,
      vatDate: p.vatDate,
      netAmount: p.netAmount,
      vatAmount: p.vatAmount,
      recoverableVat: p.recoverableVat,
      documentType: p.documentType,
    })),
  warnings: [],
  coverage: { legacyCount: 0, proformaCount: 1, otherIssuerCount: 0, basis: "ACCRUAL", domesticPurchasesOnly: true },
  summary: {
    netSales: "28200.00",
    outputVat: "4230.00",
    netPurchases: "13000.00",
    recordedInputVat: "1950.00",
    recoverableInputVat: "1950.00",
    nonRecoverableInputVat: "0.00",
    currentVatDue: "2280.00",
    netVatDue: "2280.00",
    creditNet: "0.00",
    debitNet: "0.00",
    excludedOutsideScope: "16700.00",
  },
};

const demoMembers = [
  {
    id: "m-1",
    captainId: IDS.c1,
    name: captains[0].name,
    kind: "DRIVER",
    isRepresentative: false,
    phone: captains[0].phone,
    active: true,
    version: 1,
    captainArchived: false,
    balances: { entitlement: "2450.50", custody: "500.00", advance: "300.00", tripsOutstanding: "450.00" },
  },
  {
    id: "m-2",
    captainId: IDS.c2,
    name: captains[1].name,
    kind: "DRIVER",
    isRepresentative: false,
    phone: captains[1].phone,
    active: true,
    version: 1,
    captainArchived: false,
    balances: { entitlement: "1800.00", custody: "200.00", advance: "0.00", tripsOutstanding: "0.00" },
  },
  {
    id: "m-3",
    captainId: null,
    name: "سلمان الدوسري — مندوب الحجوزات",
    kind: "REPRESENTATIVE",
    isRepresentative: true,
    phone: "0556667788",
    active: true,
    version: 1,
    captainArchived: false,
    balances: { entitlement: "1150.00", custody: "0.00", advance: "0.00", tripsOutstanding: "350.00" },
  },
];

const waConfig = {
  enabled: true,
  adminPhone: "+966501112233",
  notifyOnContractSent: true,
  notifyOnInvoiceSent: true,
  notifyOnCaptainAction: true,
  autoReplyToCaptain: true,
  includeActionMenuOnContract: true,
  includeAdminActionButtons: true,
  interactiveMode: "reactions_and_links",
  autoSendContractDefault: false,
  autoSendInvoiceDefault: true,
  captainButtons: [
    { id: "confirm_receipt", emoji: "👍", code: "1", labelAr: "تأكيد استلام العقد", labelEn: "Confirm Receipt", replyTextAr: "تم تسجيل تأكيد استلام العقد", adminNoticeTitleAr: "أكد الكابتن الاستلام", targetStatus: "ACKNOWLEDGED", enabled: true },
    { id: "trip_completed", emoji: "✅", code: "4", labelAr: "تم إتمام الرحلة", labelEn: "Trip Completed", replyTextAr: "تم إغلاق الرحلة بنجاح", adminNoticeTitleAr: "أتم الكابتن الرحلة", targetStatus: "COMPLETED", enabled: true },
  ],
  adminActionButtons: [
    { id: "admin_ack", code: "A1", labelAr: "تأكيد استلام الإشعار", labelEn: "Acknowledge", captainMessageTemplateAr: "استلمت الإدارة التحديث", enabled: true },
  ],
};

function minimalPdf() {
  return "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const path = url.pathname.replace(/^\/api/, "");
  let body = {};
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  const json = (data, status = 200) => {
    res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { error: String(data) }) }));
  };
  const rawJson = (payload, status = 200) => {
    res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(payload));
  };

  if (path === "/health") return json({ status: "ok" });
  if (path === "/auth/login") {
    const email = String(body.email || "").toLowerCase();
    const isCap = email.includes("captain");
    res.setHeader("set-cookie", `miqat_token=${isCap ? "demo-CAPTAIN" : "demo-ADMIN"}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return json({ user: isCap ? captains[0] : superAdmin, mustChangePassword: false });
  }
  if (path === "/auth/logout") {
    res.setHeader("set-cookie", "miqat_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    return json({});
  }
  const cookie = req.headers.cookie || "";
  if (path === "/auth/session") {
    if (!cookie.includes("miqat_token=")) return json("يرجى تسجيل الدخول", 401);
    if (cookie.includes("demo-CAPTAIN")) return json(captains[0]);
    return json(superAdmin);
  }

  if (path.endsWith("/pdf") || path.endsWith("/receipt")) {
    res.writeHead(200, { "content-type": "application/pdf", "content-disposition": 'inline; filename="miqat.pdf"' });
    return res.end(minimalPdf());
  }
  if (path.endsWith("qr.png")) {
    res.writeHead(200, { "content-type": "image/png" });
    return res.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jI2YAAAAASUVORK5CYII=", "base64"));
  }

  if (path === "/dashboard/stats") {
    return json({
      totalCaptains: captains.length,
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.length,
      totalContracts: contracts.length,
      todayInspections: inspections.length,
      recentContracts: contracts.map((c) => ({ ...c, captainName: c.captain?.name || captains[0].name, passengersCount: c.passengers.length })),
    });
  }
  if (path === "/fleet") return json(vehicles);
  if (path === "/captains") return json(captains);
  if (path === "/inspections/today") return json(inspections[0]);
  if (path === "/inspections/overview") {
    return json({
      captains: captains.map((c, i) => ({ ...c, todayInspection: inspections[i], hasTodayInspection: true, totalInspections: 12 })),
      stats: { totalCaptains: captains.length, inspectedToday: captains.length, pendingToday: 0, totalInspections: 36 },
    });
  }
  if (path === "/inspections") return json(inspections);
  if (path === "/contracts") return json(contracts);
  if (path.startsWith("/contracts/")) {
    const cid = path.split("/")[2];
    return json(contracts.find((c) => c.id === cid) || contracts[0]);
  }
  if (path === "/admins") return json({ admins: demoAdmins, isCallerSuperAdmin: true });

  if (path === "/invoices/settings") return json({ company });
  if (path === "/invoices/contracts") return json({ items: contracts });
  if (path.startsWith("/invoices/transport-defaults/")) {
    return json({
      customerName: contracts[0].customerName,
      transport: {
        serviceType: "AIRPORT_TRANSFER",
        contractReference: contracts[0].referenceNumber,
        origin: contracts[0].origin,
        destination: contracts[0].destination,
        tripDate: day,
        departureTime: "10:30",
        contactName: contracts[0].customerName,
        contactPhone: contracts[0].customerPhone,
        vehiclePlate: vehicles[0].plateNumberAr,
        distanceUnit: "KM",
        passengers: contracts[0].passengers,
      },
    });
  }
  if (path === "/invoices") {
    if (req.method === "POST") {
      const created = {
        ...invoices[0],
        ...body,
        id: randomUUID(),
        invoiceNumber: `TAX-${String(109 + invoices.length).padStart(6, "0")}`,
        customerName: body.buyer?.name || customers[0].name,
        whatsAppAutoSend: body.autoSendWhatsApp ? { attempted: true, success: true, phone: customers[0].phone, messageId: "wa_demo_inv" } : undefined,
      };
      invoices.unshift(created);
      return json(created, 201);
    }
    const q = (url.searchParams.get("search") || "").trim().toLowerCase();
    const list = invoices.filter((i) => !q || i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
    return json({ items: list, total: list.length, page: 1 });
  }
  if (path.startsWith("/invoices/")) {
    const iid = path.split("/")[2];
    const row = invoices.find((i) => i.id === iid) || invoices[0];
    return json({
      ...row,
      adjustments: row.id === IDS.inv1 ? [{ id: IDS.inv5, invoiceNumber: "CN-000103", kind: "CREDIT", invoiceDate: `${day}T08:00:00+03:00`, netAmount: "1000.00", vatAmount: "150.00", totalAmount: "1150.00", adjustmentReason: "تخفيض متفق عليه" }] : [],
      creditBalance: { availableNet: row.netAmount, availableVat: row.vatAmount, availableGross: row.totalAmount },
    });
  }

  if (path === "/accounting/financial-report") return json(demoFinancial);
  if (path === "/accounting/accounts") return json({ items: demoAccounts });
  if (path.startsWith("/accounting/accounts/") && path.endsWith("/ledger")) {
    const code = path.split("/")[3];
    const acc = demoAccounts.find((a) => a.code === code) || demoAccounts[3];
    return json({
      account: acc,
      from: periodStart,
      to: periodEnd,
      page: 1,
      pageSize: 50,
      total: 3,
      openingBalance: "120000.00",
      openingDebit: "120000.00",
      openingCredit: "0.00",
      debit: "22250.00",
      credit: "25300.00",
      closingBalance: "116950.00",
      closingDebit: "116950.00",
      closingCredit: "0.00",
      entries: [
        { id: "le-1", journalId: "j-108", number: 108, date: day, accountCode: acc.code, accountNameAr: acc.nameAr, description: "تحصيل فاتورة شركة روافد الحج والعمرة TAX-000108", sourceType: "PAYMENT", sourceId: IDS.inv1, vehiclePlate: vehicles[0].plateNumberAr, debit: "17250.00", credit: "0.00", balance: "137250.00" },
        { id: "le-2", journalId: "j-107", number: 107, date: day, accountCode: acc.code, accountNameAr: acc.nameAr, description: "تحصيل دفعة من فندق أجياد مكة TAX-000107", sourceType: "PAYMENT", sourceId: IDS.inv2, vehiclePlate: vehicles[1].plateNumberAr, debit: "5000.00", credit: "0.00", balance: "142250.00" },
        { id: "le-3", journalId: "j-106", number: 106, date: day, accountCode: acc.code, accountNameAr: acc.nameAr, description: "سداد فاتورة وقود شركة الدريس EXP-00042", sourceType: "PURCHASE", sourceId: IDS.pur1, vehiclePlate: vehicles[0].plateNumberAr, debit: "0.00", credit: "4600.00", balance: "137650.00" },
      ],
    });
  }
  if (path === "/accounting/journals") return json({ items: demoJournals, total: demoJournals.length, page: 1, pageSize: 30 });
  if (path === "/accounting/payments" && req.method === "GET") return json({ items: demoPayments, total: demoPayments.length, page: 1, pageSize: 30 });
  if (path === "/accounting/payments" && req.method === "POST") {
    const amt = Number(body.amount || 0);
    const inv = invoices.find((i) => i.id === body.documentId);
    if (inv?.paymentSummary && Number.isFinite(amt)) {
      const rem = Math.max(0, Number(inv.paymentSummary.balance) - amt);
      const set = Number(inv.paymentSummary.settledAmount) + amt;
      inv.paymentSummary = { ...inv.paymentSummary, balance: rem.toFixed(2), settledAmount: set.toFixed(2), status: rem === 0 ? "PAID" : "PARTIAL" };
    }
    const pur = purchases.find((p) => p.id === body.documentId);
    if (pur?.paymentSummary && Number.isFinite(amt)) {
      const rem = Math.max(0, Number(pur.paymentSummary.balance) - amt);
      const set = Number(pur.paymentSummary.settledAmount) + amt;
      pur.paymentSummary = { ...pur.paymentSummary, balance: rem.toFixed(2), settledAmount: set.toFixed(2), status: rem === 0 ? "PAID" : "PARTIAL" };
    }
    const created = { id: randomUUID(), direction: body.documentType === "SALE" ? "RECEIPT" : "PAYMENT", ...body, journal: { number: 109 + demoPayments.length } };
    demoPayments.unshift(created);
    return json(created, 201);
  }
  if (path.startsWith("/accounting/document-balance/")) {
    const docId = path.split("/")[4];
    const inv = invoices.find((i) => i.id === docId);
    if (inv?.paymentSummary) return json(inv.paymentSummary);
    const pur = purchases.find((p) => p.id === docId);
    if (pur?.paymentSummary) return json(pur.paymentSummary);
    return json({ balance: "4200.00", direction: "RECEIPT" });
  }
  if (path === "/accounting/purchases" && req.method === "GET") {
    const q = (url.searchParams.get("search") || "").trim().toLowerCase();
    const list = purchases.filter((p) => !q || p.supplierName.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q) || (p.vehiclePlate || "").toLowerCase().includes(q));
    return json({
      items: list,
      total: list.length,
      page: 1,
      totals: { netAmount: "29700.00", vatAmount: "1950.00", recoverableVat: "1950.00", totalAmount: "31650.00" },
    });
  }
  if (path === "/accounting/purchases" && req.method === "POST") {
    const p = body.purchase || body;
    const net = Number(p.netAmount || 0);
    const vat = Number(p.vatAmount || 0);
    const total = (net + vat).toFixed(2);
    const created = {
      id: randomUUID(),
      voucher: `EXP-${String(43 + purchases.length).padStart(5, "0")}`,
      postingStatus: "POSTED",
      ...p,
      netAmount: net.toFixed(2),
      vatAmount: vat.toFixed(2),
      recoverableVat: vat.toFixed(2),
      totalAmount: total,
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      voidedAt: null,
      paymentSummary: { balance: "0.00", netDocumentAmount: total, settledAmount: total, direction: "PAYMENT", status: "PAID" },
    };
    purchases.unshift(created);
    return json(created, 201);
  }
  if (path === "/accounting/vat-return") return json(demoVatReport);
  if (path === "/accounting/vat-return/manual" && req.method === "POST") {
    return json({ ...demoVatReport, manualSelection: true, availableSales: demoVatReport.sales, availablePurchases: demoVatReport.purchases });
  }
  if (path === "/accounting/periods") return json({ items: [{ id: "per-q3", startDate: `${yr}-07-01`, endDate: `${yr}-09-30`, reason: "إقفال الربع الثالث بعد المطابقة الضريبية", closedAt: nowIso, closedBy: superAdmin.name }] });

  if ((path === "/accounting/exports/preview" || path === "/accounting/exports/download") && req.method === "POST") {
    const requested = Array.isArray(body.sections) && body.sections.length ? body.sections : ["INVOICES"];
    const flt = body.filters || {};
    const q = String(flt.search || "").trim().toLowerCase();
    const matchQ = (...vals) => !q || vals.some((v) => String(v || "").toLowerCase().includes(q));

    const invRows = invoices
      .filter((i) => {
        if (flt.invoiceType && flt.invoiceType !== "ALL") {
          const isNote = i.taxDocument?.kind === "CREDIT" || i.taxDocument?.kind === "DEBIT";
          if (flt.invoiceType === "NOTES" && !isNote) return false;
          if (flt.invoiceType !== "NOTES" && ((i.documentType || "BOOKING") !== flt.invoiceType || isNote)) return false;
        }
        if (flt.invoicePaymentStatus && flt.invoicePaymentStatus !== "ALL" && i.paymentSummary?.status !== flt.invoicePaymentStatus) return false;
        return matchQ(i.invoiceNumber, i.customerName, i.totalAmount);
      })
      .map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        date: day,
        customerName: i.customerName,
        documentType: i.documentType,
        taxKind: i.taxDocument?.kind || null,
        profile: i.taxDocument?.profile || null,
        netAmount: i.netAmount,
        vatAmount: i.vatAmount,
        totalAmount: i.totalAmount,
        paymentStatus: i.paymentSummary?.status || null,
        settledAmount: i.paymentSummary?.settledAmount || "0.00",
        remainingBalance: i.paymentSummary?.balance || "0.00",
        isArchived: false,
      }));

    const purRows = purchases
      .filter((p) => {
        if (flt.purchaseCategory && p.category !== flt.purchaseCategory) return false;
        if (flt.purchasePaymentStatus && flt.purchasePaymentStatus !== "ALL" && p.paymentSummary?.status !== flt.purchasePaymentStatus) return false;
        if (flt.vehiclePlate && !String(p.vehiclePlate || "").includes(flt.vehiclePlate)) return false;
        return matchQ(p.voucher, p.invoiceNumber, p.supplierName, p.vehiclePlate);
      })
      .map((p) => ({
        id: p.id,
        voucher: p.voucher,
        invoiceNumber: p.invoiceNumber,
        supplierName: p.supplierName,
        supplierVatNumber: p.supplierVatNumber || null,
        documentType: p.documentType,
        postingStatus: p.postingStatus,
        category: p.category,
        taxTreatment: p.taxTreatment,
        issueDate: p.issueDate,
        vatDate: p.vatDate,
        vehiclePlate: p.vehiclePlate || null,
        paymentAccountCode: p.paymentAccountCode,
        netAmount: p.netAmount,
        vatAmount: p.vatAmount,
        recoverableVat: p.recoverableVat,
        totalAmount: p.totalAmount,
        paymentStatus: p.paymentSummary?.status || null,
        remainingBalance: p.paymentSummary?.balance || "0.00",
        isVoided: false,
      }));

    const payRows = demoPayments
      .filter((p) => matchQ(p.reference, p.documentRef, p.cashAccount))
      .map((p) => ({
        id: p.id,
        paymentDate: p.paymentDate,
        direction: p.direction,
        documentType: p.documentType,
        documentId: p.documentId,
        documentRef: p.documentRef,
        cashAccount: p.cashAccount,
        reference: p.reference,
        amount: p.amount,
        journalNumber: `JE-${String(p.journal.number).padStart(6, "0")}`,
      }));

    const sections = {};
    if (requested.includes("INVOICES")) sections.INVOICES = { count: invRows.length, truncated: false, rows: invRows, totals: { netAmount: "28200.00", vatAmount: "4230.00", totalAmount: "32430.00", settledAmount: "23630.00", remainingBalance: "9950.00" } };
    if (requested.includes("PURCHASES")) sections.PURCHASES = { count: purRows.length, truncated: false, rows: purRows, totals: { netAmount: "29700.00", vatAmount: "1950.00", recoverableVat: "1950.00", totalAmount: "31650.00", remainingBalance: "6350.00" } };
    if (requested.includes("PAYMENTS")) sections.PAYMENTS = { count: payRows.length, truncated: false, rows: payRows, totals: { receipts: "23630.00", disbursements: "4000.00", netCashFlow: "19630.00" } };
    if (requested.includes("INCOME_STATEMENT")) sections.INCOME_STATEMENT = { count: 6, truncated: false, rows: trialRows.filter((r) => ["REVENUE", "EXPENSE"].includes(r.type)).map((r) => ({ code: r.code, nameAr: r.nameAr, nameEn: r.nameEn, type: r.type, profitSection: r.profitSection, debit: r.debit, credit: r.credit, net: r.type === "REVENUE" ? r.closingCredit : r.closingDebit })), totals: demoFinancial.profit };
    if (requested.includes("TRIAL_BALANCE")) sections.TRIAL_BALANCE = { count: trialRows.length, truncated: false, rows: trialRows, totals: demoFinancial.totals };
    if (requested.includes("JOURNALS")) sections.JOURNALS = { count: demoJournals.length, truncated: false, rows: demoJournals.flatMap((j) => j.lines.map((l) => ({ id: l.id, journalNumber: `JE-${String(j.number).padStart(6, "0")}`, date: j.entryDate, sourceType: j.sourceType, sourceId: j.id, accountCode: l.accountCode, accountNameAr: l.account.nameAr, accountNameEn: l.account.nameEn, vehiclePlate: l.vehiclePlate, description: l.description, debit: l.debit, credit: l.credit }))), totals: { debit: "31050.00", credit: "31050.00" } };
    if (requested.includes("VAT_RETURN")) sections.VAT_RETURN = { count: demoVatReport.rows.length, truncated: false, rows: demoVatReport.rows, summary: demoVatReport.summary, warnings: [], totals: demoVatReport.summary };
    if (requested.includes("VEHICLES")) sections.VEHICLES = { count: demoFinancial.vehicles.length, truncated: false, rows: demoFinancial.vehicles.map((v) => ({ ...v, marginPercent: ((Number(v.profit) / Number(v.revenue)) * 100).toFixed(1) })), totals: { revenue: "110000.00", cost: "29700.00", profit: "80300.00" } };
    if (requested.includes("ACCOUNTS")) sections.ACCOUNTS = { count: demoAccounts.length, truncated: false, rows: demoAccounts, totals: { total: String(demoAccounts.length), posting: String(demoAccounts.filter((a) => a.isPosting).length), active: String(demoAccounts.length) } };

    const dataset = {
      meta: { generatedAt: nowIso, period: body.period || { mode: "QUARTER", year: yr, quarter: qtr }, sections: requested, previewLimit: path.endsWith("/preview") ? 15 : null },
      range: { mode: body.period?.mode || "QUARTER", start: periodStart, endInclusive: periodEnd, year: yr, quarter: qtr },
      company: { legalName: company.legalName, vatNumber: company.vatNumber, commercialRegistration: company.commercialRegistration },
      filters: flt,
      summary: { totalSalesTotal: "110000.00", totalSalesVat: "16500.00", totalPurchasesTotal: "31650.00", totalRecoverableVat: "1950.00", totalReceipts: "23630.00", totalDisbursements: "4000.00", netProfitBeforeTax: "80300.00", netVatDue: "14550.00" },
      sections,
    };
    if (path === "/accounting/exports/preview") return json(dataset);
    const fmt = body.format || "csv";
    if (fmt === "pdf") { res.writeHead(200, { "content-type": "application/pdf", "content-disposition": 'attachment; filename="miqat-financial-export.pdf"' }); return res.end(minimalPdf()); }
    if (fmt === "json") { res.writeHead(200, { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="miqat-financial-export.json"' }); return res.end(JSON.stringify(dataset, null, 2)); }
    res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="miqat-financial-export.csv"' });
    return res.end("\uFEFFSection,Count\r\nINVOICES," + invRows.length);
  }

  if (path === "/workforce/customers") return json({ items: customers, total: customers.length });
  if (path.startsWith("/workforce/customers/")) return json({ customer: customers[0], contracts, invoices, payments: demoPayments, balances: [{ label: "المتبقي", amount: "4200.00" }], outstanding: "4200.00" });
  if (path === "/workforce/members") return json({ items: demoMembers });
  if (path.startsWith("/workforce/members/") || path.startsWith("/workforce/captains/")) {
    return json({ member: demoMembers[0], balances: { entitlement: "2450.50", custody: "500.00", advance: "300.00" }, operations: [], salaryTerms: [], payroll: [], commissions: [], legacy: [] });
  }
  if (path.startsWith("/workforce/contracts/")) {
    const cid = path.split("/")[3] || IDS.c1;
    return json({
      contractId: cid,
      version: 1,
      executionStatus: "COMPLETED",
      customerId: IDS.cust1,
      netAmount: "4500.00",
      taxCategory: "S",
      driverCommission: { mode: "FIXED", amount: "250.00", base: "4500.00", percent: "0" },
      representativeId: null,
      representativeCommission: { mode: "NONE", amount: "0", base: "0", percent: "0" },
    });
  }
  if (path === "/workforce/selections") return json({ items: [{ id: "sel-1", name: "مختارات شهر نوفمبر", invoiceIds: [IDS.inv1, IDS.inv2], version: 1 }] });

  if (path === "/zatca/settings") {
    return json({
      issuers: [{ id: "iss-1", legalName: company.legalName, name: company.legalName, vatNumber: company.vatNumber, commercialRegistration: company.commercialRegistration }],
      egs: [{ id: "egs-1", issuerId: "iss-1", identity: "MIQAT-EGS-01", commonName: "MIQAT-EGS-01", invoiceTypes: "1100", certificateStatus: "ACTIVE", certificateExpiresAt: "2028-12-31T00:00:00Z", credentialVersion: 1, complianceChecks: ["STANDARD_INVOICE", "STANDARD_CREDIT", "SIMPLIFIED_INVOICE", "SIMPLIFIED_CREDIT"], productionEnabled: true, counter: 6, csrReady: true, complianceReady: true, productionReady: true, stage: "ACTIVE", environment: "SANDBOX", updatedAt: nowIso }],
      sdkConfigured: true,
      productionPermitted: true,
    });
  }
  if (path === "/whatsapp/status") return rawJson({ success: true, data: { status: "connected", phone: "+966501112233", queueLength: 0, recovery: { failedQueueJobs: 0, pendingDriverReplies: 0, pausedContracts: 0 } } });
  if (path === "/whatsapp/flow") {
    return rawJson({
      success: true,
      config: waConfig,
      sessions: [{ id: "ws-1", contractId: IDS.c1, referenceNumber: contracts[0].referenceNumber, captainId: IDS.c1, captainName: captains[0].name, captainPhone: captains[0].phone, customerName: customers[0].name, origin: contracts[0].origin, destination: contracts[0].destination, tripDate: day, tripTime: "10:30", vehiclePlate: vehicles[0].plateNumberAr, status: "ACKNOWLEDGED", lastActionId: "confirm_receipt", lastActionLabel: "تأكيد استلام العقد", lastActionAt: nowIso }],
      events: [{ id: "we-1", sessionId: "ws-1", entityType: "CONTRACT", entityId: IDS.c1, referenceNumber: contracts[0].referenceNumber, type: "CAPTAIN_ACTION", actorRole: "CAPTAIN", actorPhone: captains[0].phone, label: "تأكيد الاستلام", summary: `أكد الكابتن ${captains[0].name} استلام العقد ${contracts[0].referenceNumber}`, timestamp: nowIso }],
      stats: { activeSessions: 1, arrivedSessions: 0, totalEvents: 1 },
    });
  }
  if (path === "/whatsapp/trips") return json([]);
  if (path === "/whatsapp/trips/notices") return json([]);

  return json({ items: [], total: 0, page: 1 });
});

server.listen(PORT, HOST, () => {
  console.log(`DEMO FIXTURE READY http://${HOST}:${PORT}`);
});
