import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateContractHtml } from "@/lib/generateContractHtml";
import {
  mapContractToPdfData,
  generateContractQrCode,
} from "@/lib/contractStorage";
import { DEFAULT_CONTRACT_DATA } from "@/lib/contractConstants";

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
    const contractId = searchParams.get("contractId") || searchParams.get("ref");
    const baseUrl = getBaseUrl(req);

    let htmlContent: string;

    if (contractId) {
      const contract = await prisma.contract.findFirst({
        where: {
          OR: [{ id: contractId }, { referenceNumber: contractId }],
        },
        include: {
          passengers: { orderBy: { sequence: "asc" } },
          captain: true,
          inspection: true,
        },
      });

      if (!contract) {
        return new NextResponse("العقد غير موجود", { status: 404 });
      }

      const pdfData = mapContractToPdfData(contract);
      const { qrCodeDataUri, verificationUrl } = await generateContractQrCode(
        contract.referenceNumber,
        baseUrl
      );
      pdfData.contract.qrCodeDataUri = qrCodeDataUri;
      pdfData.contract.verificationUrl = verificationUrl;

      htmlContent = generateContractHtml(pdfData);
    } else {
      htmlContent = generateContractHtml(DEFAULT_CONTRACT_DATA);
    }

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("HTML contract generation error:", error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
