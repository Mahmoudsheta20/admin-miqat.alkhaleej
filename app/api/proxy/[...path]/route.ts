import { NextRequest, NextResponse } from "next/server";

function getRemoteBackendBase(): string {
  const raw = (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://63.188.195.14"
  )
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\/+$/, "");

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `http://${raw}`;
}

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const backendBase = getRemoteBackendBase();
    const joinedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
    const search = req.nextUrl.search || "";
    const targetUrl = `${backendBase}/api/${joinedPath}${search}`;

    const headers = new Headers();
    req.headers.forEach((val, key) => {
      // Don't forward host or connection headers
      if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
        headers.set(key, val);
      }
    });

    const method = req.method;
    const body =
      ["GET", "HEAD"].includes(method)
        ? undefined
        : await req.arrayBuffer();

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    const resHeaders = new Headers();
    response.headers.forEach((val, key) => {
      // Don't pass content-encoding since fetch de-compresses automatically
      if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
        resHeaders.set(key, val);
      }
    });

    const resBuffer = await response.arrayBuffer();

    return new NextResponse(resBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    console.error("Proxy error forwarding to backend:", err);
    return NextResponse.json(
      {
        success: false,
        error: "فشل الاتصال بخادم العمليات المركزي، يرجى المحاولة لاحقاً",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
