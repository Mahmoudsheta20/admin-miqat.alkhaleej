import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { prisma } from "./prisma";
import { generateInspectionHtml } from "./generateInspectionHtml";
import { getChromeExecutablePath } from "./contractStorage";
import { DEFAULT_CONTRACT_DATA } from "./contractConstants";

export const INSPECTIONS_STORAGE_DIR = path.join(
  process.cwd(),
  "public",
  "storage",
  "inspections"
);

export function ensureInspectionStorageDir(): void {
  try {
    if (!fs.existsSync(INSPECTIONS_STORAGE_DIR)) {
      fs.mkdirSync(INSPECTIONS_STORAGE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("Inspection storage dir creation skipped (read-only filesystem):", err);
  }
}

/**
 * Generate a unique QR code for inspection verification
 */
export async function generateInspectionQrCode(
  inspectionId: string,
  baseUrl?: string
): Promise<{ qrCodeDataUri: string; verificationUrl: string }> {
  const host =
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://admin.miqatalkhaleej.com");

  const cleanHost = host.endsWith("/") ? host.slice(0, -1) : host;
  const verificationUrl = `${cleanHost}/verify/inspection/${inspectionId}`;

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
 * Map Prisma Inspection record to the required structure for generateInspectionHtml
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapInspectionToPdfData(inspectionRecord: any, qrData?: { qrCodeDataUri: string; verificationUrl: string }) {
  const captain = inspectionRecord.captain;
  const inspectionDate = inspectionRecord.inspectionDate
    ? new Date(inspectionRecord.inspectionDate).toLocaleDateString("en-GB")
    : (inspectionRecord.createdAt ? new Date(inspectionRecord.createdAt).toLocaleDateString("en-GB") : "08/09/2026");

  const inspectionTime = inspectionRecord.createdAt
    ? new Date(inspectionRecord.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    : (inspectionRecord.inspectionDate
      ? new Date(inspectionRecord.inspectionDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
      : "10:00 ص");

  const shortCode = inspectionRecord.id
    ? inspectionRecord.id.replace(/-/g, "").slice(0, 8).toUpperCase()
    : "001";

  return {
    company: DEFAULT_CONTRACT_DATA.company,
    captain: {
      name: captain?.name || "علي أحمد غلام أحمد",
      phone: captain?.phone || "0542273515",
      nationalId: captain?.nationalId || "2553660073",
      assignedVehiclePlate: inspectionRecord.vehiclePlate || captain?.assignedVehiclePlate || "ا ص ل 7223",
      avatarUrl: captain?.avatarUrl || "/taxi-driver.png",
    },
    inspection: {
      id: inspectionRecord.id,
      code: `INSP-${shortCode}`,
      date: inspectionDate,
      time: inspectionTime,
      vehiclePlate: inspectionRecord.vehiclePlate || captain?.assignedVehiclePlate || "ا ص ل 7223",
      driverDeclared: Boolean(inspectionRecord.driverDeclared),
      notes: inspectionRecord.notes || null,
      qrCodeDataUri: qrData?.qrCodeDataUri,
      verificationUrl: qrData?.verificationUrl,
      declarationText: DEFAULT_CONTRACT_DATA.inspection.declarationText,
      dashboard: [
        { id: "fuel", nameAr: "مؤشر الوقود", sound: Boolean(inspectionRecord.fuelGauge), notes: "" },
        { id: "temp", nameAr: "مؤشر الحرارة", sound: Boolean(inspectionRecord.tempGauge), notes: "" },
        { id: "oil_pressure", nameAr: "مؤشر ضغط الزيت", sound: Boolean(inspectionRecord.oilPressure), notes: "" },
        { id: "check_engine", nameAr: "لمبة فحص المحرك", sound: Boolean(inspectionRecord.checkEngine), notes: "" },
        { id: "abs", nameAr: "نظام ABS للفرامل", sound: Boolean(inspectionRecord.absLight), notes: "" },
        { id: "warning_light", nameAr: "لمبات التحذير واللوحة", sound: Boolean(inspectionRecord.warningLights), notes: "" },
      ],
      external: [
        { id: "tires", nameAr: "الإطارات وضغط الهواء", sound: Boolean(inspectionRecord.tires), notes: "" },
        { id: "lights", nameAr: "الأنوار الأمامية والخلفية", sound: Boolean(inspectionRecord.headlights), notes: "" },
        { id: "signals", nameAr: "الإشارات التحذيرية والجانبية", sound: Boolean(inspectionRecord.signals), notes: "" },
        { id: "glass", nameAr: "الزجاج والمرايا الجانبية", sound: Boolean(inspectionRecord.mirrors), notes: "" },
        { id: "leaks", nameAr: "عدم وجود تسريبات وقود أو زيوت", sound: Boolean(inspectionRecord.noLeaks), notes: "" },
      ],
      safety: [
        { id: "extinguisher", nameAr: "طفاية حريق صالحة ومثبتة", sound: Boolean(inspectionRecord.fireExtinguisher), notes: "" },
        { id: "triangle", nameAr: "مثلث تحذيري عاكس", sound: Boolean(inspectionRecord.warningTriangle), notes: "" },
        { id: "first_aid", nameAr: "حقيبة إسعافات أولية مكتملة", sound: Boolean(inspectionRecord.firstAidKit), notes: "" },
        { id: "hammer", nameAr: "مطرقة كسر الزجاج للطوارئ", sound: Boolean(inspectionRecord.glassHammer), notes: "" },
        { id: "belts", nameAr: "أحزمة الأمان لجميع المقاعد", sound: Boolean(inspectionRecord.seatBelts), notes: "" },
      ],
    },
    options: {
      showStamp: true,
      accentColor: "#d97706",
    },
  };
}

/**
 * Render A4 PDF buffer using Puppeteer
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildInspectionPdfBuffer(data: any): Promise<Buffer> {
  const html = generateInspectionHtml(data);
  const localExecutable = getChromeExecutablePath();

  let browser;
  if (localExecutable) {
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
      defaultViewport: {
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      },
    });
  } else {
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
      defaultViewport: chromium.defaultViewport || {
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      },
      executablePath,
      headless: chromium.headless,
    });
  }

  try {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    } catch {
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 25000 });
    }

    try {
      await page.evaluate(async () => {
        if (document.fonts) {
          await document.fonts.ready;
        }
      });
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 400));

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
 * Generate and save an inspection PDF
 */
export async function generateAndSaveInspectionPdf(
  inspectionId: string,
  baseUrl?: string
): Promise<{
  pdfBuffer: Buffer;
  fileName: string;
  filePath: string;
  publicUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspection: any;
}> {
  const inspectionRecord = await prisma.vehicleInspection.findUnique({
    where: { id: inspectionId },
    include: {
      captain: true,
    },
  });

  if (!inspectionRecord) {
    throw new Error(`سجل الفحص غير موجود: ${inspectionId}`);
  }

  const qrData = await generateInspectionQrCode(inspectionRecord.id, baseUrl);
  const pdfData = mapInspectionToPdfData(inspectionRecord, qrData);

  const pdfBuffer = await buildInspectionPdfBuffer(pdfData);
  const shortCode = inspectionRecord.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const fileName = `inspection-${shortCode}.pdf`;

  ensureInspectionStorageDir();
  let filePath = path.join(INSPECTIONS_STORAGE_DIR, fileName);
  let publicUrl = `/storage/inspections/${fileName}`;

  try {
    fs.writeFileSync(filePath, pdfBuffer);
  } catch (fsErr) {
    console.warn("Could not save to public/storage/inspections, using tmp fallback:", fsErr);
    try {
      const tmpDir = path.join("/tmp", "inspections");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
    } catch (tmpErr) {
      console.warn("Could not save to /tmp:", tmpErr);
    }
    publicUrl = `/api/inspections/pdf?inspectionId=${encodeURIComponent(inspectionRecord.id)}`;
  }

  return {
    pdfBuffer,
    fileName,
    filePath,
    publicUrl,
    inspection: inspectionRecord,
  };
}
