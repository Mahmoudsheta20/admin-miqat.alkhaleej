import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateAndSaveInspectionPdf,
  mapInspectionToPdfData,
  buildInspectionPdfBuffer,
  generateInspectionQrCode,
} from "@/lib/inspectionStorage";
import { DEFAULT_CONTRACT_DATA } from "@/lib/contractConstants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  if (host) {
    return `${protocol}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "https://miqat-alkhaleej.com";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inspectionId = searchParams.get("inspectionId") || searchParams.get("id");
    const captainId = searchParams.get("captainId");
    const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
    const baseUrl = getBaseUrl(req);

    let effectiveInspectionId = inspectionId;

    // If captainId provided and no inspectionId, find captain's latest inspection
    if (!effectiveInspectionId && captainId) {
      const latest = await prisma.vehicleInspection.findFirst({
        where: { captainId },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        effectiveInspectionId = latest.id;
      }
    }

    let pdfBuffer: Buffer;
    let fileName = "Miqat_Vehicle_Inspection.pdf";

    if (effectiveInspectionId) {
      const result = await generateAndSaveInspectionPdf(effectiveInspectionId, baseUrl);
      pdfBuffer = result.pdfBuffer;
      fileName = result.fileName;
    } else {
      // Default preview dummy record
      const dummyRecord = {
        id: "PREVIEW-001",
        vehiclePlate: "ا ص ل 7223",
        inspectionDate: new Date(),
        createdAt: new Date(),
        fuelGauge: true,
        tempGauge: true,
        oilPressure: true,
        checkEngine: true,
        absLight: true,
        warningLights: true,
        tires: true,
        headlights: true,
        signals: true,
        mirrors: true,
        noLeaks: true,
        fireExtinguisher: true,
        warningTriangle: true,
        firstAidKit: true,
        glassHammer: true,
        seatBelts: true,
        driverDeclared: true,
        notes: "فحص قياسي شامل معتمد من إدارة العمليات",
        captain: {
          name: "علي أحمد غلام أحمد",
          phone: "0542273515",
          nationalId: "2553660073",
          assignedVehiclePlate: "ا ص ل 7223",
          avatarUrl: "/taxi-driver.png",
        },
      };
      const qrData = await generateInspectionQrCode("PREVIEW-001", baseUrl);
      const pdfData = mapInspectionToPdfData(dummyRecord, qrData);
      pdfBuffer = await buildInspectionPdfBuffer(pdfData);
    }

    const dispositionType = isDownload ? "attachment" : "inline";
    const encodedFileName = encodeURIComponent(fileName);

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Inspection PDF generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
