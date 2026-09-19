import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { prisma } from "./prisma";
import { generateContractHtml } from "./generateContractHtml";
import { DEFAULT_CONTRACT_DATA, FullContractData } from "./contractConstants";

/**
 * Storage Directory for Generated Contract PDFs
 * Located under public/storage/contracts for fast static serving and secure persistence.
 */
export const CONTRACTS_STORAGE_DIR = path.join(process.cwd(), "public", "storage", "contracts");

/**
 * Ensure the contracts storage directory exists on disk.
 */
export function ensureStorageDir(): void {
  try {
    if (!fs.existsSync(CONTRACTS_STORAGE_DIR)) {
      fs.mkdirSync(CONTRACTS_STORAGE_DIR, { recursive: true });
    }
  } catch (err) {
    // Vercel serverless functions have a read-only filesystem
    console.warn("Storage dir creation skipped (read-only filesystem):", err);
  }
}

/**
 * Locate Chrome/Chromium executable across macOS and Linux environments.
 * Returns null if no local Chrome installation is detected.
 */
export function getChromeExecutablePath(): string | null {
  if (
    process.env.PUPPETEER_EXECUTABLE_PATH &&
    fs.existsSync(/*turbopackIgnore: true*/ process.env.PUPPETEER_EXECUTABLE_PATH)
  ) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const commonPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];

  for (const p of commonPaths) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) return p;
    } catch {
      // continue search
    }
  }
  return null;
}

/**
 * Generate a unique QR Code as base64 Data URI for a given contract reference number.
 * Enforces scanning to open the official verification page.
 */
export async function generateContractQrCode(
  referenceNumber: string,
  baseUrl?: string
): Promise<{ qrCodeDataUri: string; verificationUrl: string }> {
  const host =
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://miqat-alkhaleej.com");

  // Clean url
  const cleanHost = host.endsWith("/") ? host.slice(0, -1) : host;
  const verificationUrl = `${cleanHost}/verify/contract/${referenceNumber}`;

  const qrCodeDataUri = await QRCode.toDataURL(verificationUrl, {
    width: 320,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });

  return { qrCodeDataUri, verificationUrl };
}

/**
 * Render A4 PDF buffer using Puppeteer.
 * Supports both local development (macOS/Linux Chrome) and remote serverless environments (Vercel with @sparticuz/chromium).
 */
export async function buildContractPdfBuffer(
  data: FullContractData,
  baseUrl?: string
): Promise<Buffer> {
  // Ensure unique QR code is generated for this specific contract
  if (!data.contract.qrCodeDataUri && data.contract.referenceNumber) {
    const { qrCodeDataUri, verificationUrl } = await generateContractQrCode(
      data.contract.referenceNumber,
      baseUrl
    );
    data.contract.qrCodeDataUri = qrCodeDataUri;
    data.contract.verificationUrl = verificationUrl;
  }

  const html = generateContractHtml(data);
  const localExecutable = getChromeExecutablePath();

  let browser;
  if (localExecutable) {
    // Local macOS/Linux machine with Chrome installed
    browser = await puppeteer.launch({
      executablePath: localExecutable,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });
  } else {
    // Remote / Vercel Serverless environment
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 25000 });
    // Ensure Google fonts (Cairo, Outfit) are rendered
    try {
      await page.evaluate(() => (document as any).fonts?.ready);
    } catch {
      // fallback
    }
    await new Promise((r) => setTimeout(r, 600));

    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}

/**
 * Save a contract PDF buffer to disk and record its public URL in Prisma.
 * Resilient against Vercel read-only filesystem restrictions.
 */
export async function saveContractPdf(
  referenceNumber: string,
  pdfBuffer: Buffer
): Promise<{ filePath: string; publicUrl: string }> {
  const fileName = `contract-${referenceNumber}.pdf`;
  let filePath = path.join(CONTRACTS_STORAGE_DIR, fileName);
  let publicUrl = `/storage/contracts/${fileName}`;

  try {
    ensureStorageDir();
    fs.writeFileSync(filePath, pdfBuffer);
  } catch (fsErr) {
    // Vercel serverless has a read-only root filesystem
    console.warn("Could not save to public/storage (Vercel read-only filesystem). Saving to /tmp fallback:", fsErr);
    try {
      const tmpDir = path.join("/tmp", "contracts");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
    } catch (tmpErr) {
      console.warn("Could not save to /tmp:", tmpErr);
    }
    // Dynamic endpoint fallback so the user can always view/download the PDF
    publicUrl = `/api/contracts/pdf?contractId=${encodeURIComponent(referenceNumber)}`;
  }

  // Update contract record in database with the storage path
  try {
    await prisma.contract.updateMany({
      where: { referenceNumber },
      data: { pdfPath: publicUrl },
    });
  } catch (dbErr) {
    console.warn(`Could not update pdfPath in DB for ${referenceNumber}:`, dbErr);
  }

  return { filePath, publicUrl };
}

/**
 * Maps an operation type enum to Arabic display text.
 */
export function mapOperationType(type: string): string {
  switch (type) {
    case "AIRPORT_TRANSFER":
      return "استقبال";
    case "CITY_TOUR":
      return "جولة سياحية";
    case "INTERCITY":
      return "نقل بين المدن";
    case "HAJJ_UMRAH":
      return "حج وعمرة";
    default:
      return type || "استقبال";
  }
}

/**
 * Maps a Prisma Contract entity to FullContractData required by the HTML generator.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapContractToPdfData(contract: any): FullContractData {
  const captain = contract.captain;
  const inspection = contract.inspection;
  const issueDate = contract.createdAt
    ? new Date(contract.createdAt).toLocaleDateString("en-GB")
    : contract.tripDate || "08/09/2026";

  return {
    ...DEFAULT_CONTRACT_DATA,
    contract: {
      referenceNumber: contract.referenceNumber || DEFAULT_CONTRACT_DATA.contract.referenceNumber,
      operationType: mapOperationType(contract.operationType),
      issueDate: issueDate,
      tripNumber: contract.flightNumber || contract.referenceNumber,
      date: contract.tripDate || DEFAULT_CONTRACT_DATA.contract.date,
      time: contract.tripTime || DEFAULT_CONTRACT_DATA.contract.time,
      flightCarrier: contract.flightCarrier || DEFAULT_CONTRACT_DATA.contract.flightCarrier,
      firstParty: DEFAULT_CONTRACT_DATA.contract.firstParty,
      secondParty: contract.customerName || DEFAULT_CONTRACT_DATA.contract.secondParty,
      secondPartyPhone: contract.customerPhone || DEFAULT_CONTRACT_DATA.contract.secondPartyPhone,
      passengerCount: contract.passengers?.length || DEFAULT_CONTRACT_DATA.contract.passengerCount,
      origin: contract.origin || DEFAULT_CONTRACT_DATA.contract.origin,
      destination: contract.destination || DEFAULT_CONTRACT_DATA.contract.destination,
      preamble: DEFAULT_CONTRACT_DATA.contract.preamble,
      agreementClause: DEFAULT_CONTRACT_DATA.contract.agreementClause,
      cancellationPolicy: DEFAULT_CONTRACT_DATA.contract.cancellationPolicy,
      electronicBookingClause: DEFAULT_CONTRACT_DATA.contract.electronicBookingClause,
      warningNotice: DEFAULT_CONTRACT_DATA.contract.warningNotice,
      pdfPath: contract.pdfPath || null,
    },
    driver: {
      name: captain?.name || DEFAULT_CONTRACT_DATA.driver.name,
      role: "السائق الأساسي",
      nationalId: captain?.nationalId || DEFAULT_CONTRACT_DATA.driver.nationalId,
      mobile: captain?.phone || DEFAULT_CONTRACT_DATA.driver.mobile,
      plateNumber: contract.vehiclePlate || captain?.assignedVehiclePlate || DEFAULT_CONTRACT_DATA.driver.plateNumber,
      photoUrl: captain?.avatarUrl || "/taxi-driver.png",
      signatureUrl: "",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passengers: (contract.passengers && contract.passengers.length > 0)
      ? contract.passengers.map((p: any) => ({
          id: p.sequence,
          name: p.name,
          nationality: p.nationality || "سعودي",
          idNumber: p.idNumber || "",
        }))
      : DEFAULT_CONTRACT_DATA.passengers,
    inspection: inspection
      ? {
          date: inspection.inspectionDate
            ? new Date(inspection.inspectionDate).toLocaleDateString("en-GB")
            : contract.tripDate || DEFAULT_CONTRACT_DATA.inspection.date,
          time: inspection.inspectionDate
            ? new Date(inspection.inspectionDate).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit", second: "2-digit" })
            : DEFAULT_CONTRACT_DATA.inspection.time,
          dashboard: [
            { id: "fuel", nameAr: "مؤشر الوقود", sound: inspection.fuelGauge, notes: "" },
            { id: "temp", nameAr: "مؤشر الحرارة", sound: inspection.tempGauge, notes: "" },
            { id: "oil_pressure", nameAr: "مؤشر ضغط الزيت", sound: inspection.oilPressure, notes: "" },
            { id: "check_engine", nameAr: "لمبة فحص المحرك", sound: inspection.checkEngine, notes: "" },
            { id: "abs", nameAr: "ABS", sound: inspection.absLight, notes: "" },
            { id: "warning_light", nameAr: "لمبات التحذير", sound: inspection.warningLights, notes: "" },
          ],
          external: [
            { id: "tires", nameAr: "الإطارات وضغط الهواء", sound: inspection.tires, notes: "" },
            { id: "lights", nameAr: "الأنوار الأمامية و الخلفية", sound: inspection.headlights, notes: "" },
            { id: "signals", nameAr: "الإشارات التحذيرية", sound: inspection.signals, notes: "" },
            { id: "glass", nameAr: "الزجاج والمرايا", sound: inspection.mirrors, notes: "" },
            { id: "leaks", nameAr: "عدم وجود تسريبات", sound: inspection.noLeaks, notes: "" },
          ],
          safety: [
            { id: "extinguisher", nameAr: "طفاية حريق", sound: inspection.fireExtinguisher, notes: "" },
            { id: "triangle", nameAr: "مثلث تحذيري", sound: inspection.warningTriangle, notes: "" },
            { id: "first_aid", nameAr: "حقيبة اسعافات أولية", sound: inspection.firstAidKit, notes: "" },
            { id: "hammer", nameAr: "مطرقة كسر الزجاج", sound: inspection.glassHammer, notes: "" },
            { id: "belts", nameAr: "أحزمة الأمان", sound: inspection.seatBelts, notes: "" },
          ],
          declarationText: DEFAULT_CONTRACT_DATA.inspection.declarationText,
        }
      : DEFAULT_CONTRACT_DATA.inspection,
    options: DEFAULT_CONTRACT_DATA.options,
  };
}

/**
 * Generates the PDF for a contract from database, embeds unique QR code,
 * saves the file to public/storage/contracts/contract-[ref].pdf,
 * and updates the contract's pdfPath in the database.
 */
export async function generateAndSaveContractPdf(
  contractIdOrRef: string,
  baseUrl?: string
): Promise<{
  pdfBuffer: Buffer;
  filePath: string;
  publicUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: any;
  fileName: string;
}> {
  const contract = await prisma.contract.findFirst({
    where: {
      OR: [{ id: contractIdOrRef }, { referenceNumber: contractIdOrRef }],
    },
    include: {
      passengers: { orderBy: { sequence: "asc" } },
      captain: true,
      inspection: true,
    },
  });

  if (!contract) {
    throw new Error(`العقد غير موجود: ${contractIdOrRef}`);
  }

  const pdfData = mapContractToPdfData(contract);

  // Generate unique QR code specifically for this contract reference
  const { qrCodeDataUri, verificationUrl } = await generateContractQrCode(
    contract.referenceNumber,
    baseUrl
  );
  pdfData.contract.qrCodeDataUri = qrCodeDataUri;
  pdfData.contract.verificationUrl = verificationUrl;

  // Build PDF buffer
  const pdfBuffer = await buildContractPdfBuffer(pdfData, baseUrl);

  // Save to storage and update DB
  const { filePath, publicUrl } = await saveContractPdf(contract.referenceNumber, pdfBuffer);

  return {
    pdfBuffer,
    filePath,
    publicUrl,
    contract,
    fileName: `contract-${contract.referenceNumber}.pdf`,
  };
}

/**
 * Synchronize and generate saved PDFs for ALL existing contracts in the database.
 */
export async function syncAllExistingContractsToStorage(
  baseUrl?: string
): Promise<{ total: number; saved: number; errors: string[] }> {
  const contracts = await prisma.contract.findMany({
    select: { id: true, referenceNumber: true },
  });

  let saved = 0;
  const errors: string[] = [];

  for (const c of contracts) {
    try {
      await generateAndSaveContractPdf(c.id, baseUrl);
      saved++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`فشل حفظ العقد ${c.referenceNumber}: ${errorMsg}`);
    }
  }

  return { total: contracts.length, saved, errors };
}
