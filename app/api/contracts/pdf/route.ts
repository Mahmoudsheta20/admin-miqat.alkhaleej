import { NextRequest, NextResponse } from "next/server";
import {
  getOrGenerateContractPdf,
  buildContractPdfBuffer,
} from "@/lib/contractStorage";
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
    const contractId = searchParams.get("contractId") || searchParams.get("ref");
    const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
    const forceRegenerate = searchParams.get("regenerate") === "1" || searchParams.get("force") === "1";
    const baseUrl = getBaseUrl(req);

    let pdfBuffer: Buffer;
    let fileName = "Miqat_Contract.pdf";
    let storageUrl = "";

    if (contractId) {
      // First check if PDF already exists on disk; if not, generate it with Puppeteer
      const result = await getOrGenerateContractPdf(contractId, baseUrl, { forceRegenerate });
      pdfBuffer = result.pdfBuffer;
      fileName = result.fileName;
      storageUrl = result.publicUrl;
    } else {
      // Default preview
      pdfBuffer = await buildContractPdfBuffer(DEFAULT_CONTRACT_DATA, baseUrl);
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
        "X-Contract-Storage-Url": storageUrl,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contractId = body.contractId || body.ref;
    const forceRegenerate = Boolean(body.regenerate || body.force);
    const baseUrl = getBaseUrl(req);

    let pdfBuffer: Buffer;
    let fileName = "Miqat_Contract.pdf";
    let storageUrl = "";

    if (contractId) {
      const result = await getOrGenerateContractPdf(contractId, baseUrl, { forceRegenerate });
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
