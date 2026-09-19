import { NextRequest, NextResponse } from "next/server";
import {
  generateAndSaveContractPdf,
  buildContractPdfBuffer,
} from "@/lib/contractStorage";
import { DEFAULT_CONTRACT_DATA } from "@/lib/contractConstants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const contractId = searchParams.get("contractId");
    const baseUrl = getBaseUrl(req);

    let pdfBuffer: Buffer;
    let fileName = "Miqat_Contract.pdf";
    let storageUrl = "";

    if (contractId) {
      // Generates with UNIQUE QR code, saves to storage, updates DB
      const result = await generateAndSaveContractPdf(contractId, baseUrl);
      pdfBuffer = result.pdfBuffer;
      fileName = result.fileName;
      storageUrl = result.publicUrl;
    } else {
      // Default preview
      pdfBuffer = await buildContractPdfBuffer(DEFAULT_CONTRACT_DATA, baseUrl);
    }

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Contract-Storage-Url": storageUrl,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contractId = body.contractId;
    const baseUrl = getBaseUrl(req);

    let pdfBuffer: Buffer;
    let fileName = "Miqat_Contract.pdf";
    let storageUrl = "";

    if (contractId) {
      const result = await generateAndSaveContractPdf(contractId, baseUrl);
      pdfBuffer = result.pdfBuffer;
      fileName = result.fileName;
      storageUrl = result.publicUrl;
    } else {
      const pdfData = {
        ...DEFAULT_CONTRACT_DATA,
        ...body,
      };
      pdfBuffer = await buildContractPdfBuffer(pdfData, baseUrl);
    }

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Contract-Storage-Url": storageUrl,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
