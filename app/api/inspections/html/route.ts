import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInspectionHtml } from "@/lib/generateInspectionHtml";
import { mapInspectionToPdfData, generateInspectionQrCode } from "@/lib/inspectionStorage";

export const dynamic = "force-dynamic";

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
    const baseUrl = getBaseUrl(req);

    let effectiveInspectionId = inspectionId;

    if (!effectiveInspectionId && captainId) {
      const latest = await prisma.vehicleInspection.findFirst({
        where: { captainId },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        effectiveInspectionId = latest.id;
      }
    }

    let htmlContent: string;

    if (effectiveInspectionId) {
      const inspectionRecord = await prisma.vehicleInspection.findUnique({
        where: { id: effectiveInspectionId },
        include: {
          captain: true,
        },
      });

      if (!inspectionRecord) {
        return new NextResponse("سجل الفحص غير موجود", { status: 404 });
      }

      const qrData = await generateInspectionQrCode(inspectionRecord.id, baseUrl);
      const pdfData = mapInspectionToPdfData(inspectionRecord, qrData);
      htmlContent = generateInspectionHtml(pdfData);
    } else {
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
      htmlContent = generateInspectionHtml(pdfData);
    }

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("HTML inspection generation error:", error);
    return new NextResponse(`Error: ${error.message}`, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
