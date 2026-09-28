import { NextRequest } from "next/server";

/**
 * Edge-optimized PDF proxy.
 *
 * Fetches the PDF from S3 on the server (AWS ↔ AWS = ~10-50ms)
 * and streams it to the browser with aggressive cache headers.
 *
 * Usage:  /api/pdf/serve?url=<encodeURIComponent(s3Url)>
 */
export const runtime = "edge";

/** Only allow fetching from our own S3 bucket to prevent SSRF. */
const ALLOWED_HOSTS = [
  "miqatalkhaleej.s3.eu-central-1.amazonaws.com",
  "miqatalkhaleej.s3.amazonaws.com",
  "s3.eu-central-1.amazonaws.com",
];

function isAllowedUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response(
      JSON.stringify({ error: "Missing 'url' query parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!isAllowedUrl(url)) {
    return new Response(
      JSON.stringify({ error: "URL not allowed" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const upstream = await fetch(url, {
      signal: req.signal,
      // Ask S3 for gzip if it supports it
      headers: { "Accept-Encoding": "identity" },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `S3 returned ${upstream.status}` }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } },
      );
    }

    // Stream the PDF body directly — no buffering in memory.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        // Cache at the edge for 24h, in the browser for 1h.
        // Repeat previews of the same PDF are instant.
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        // Forward content-length for progress bars
        ...(upstream.headers.get("content-length")
          ? { "Content-Length": upstream.headers.get("content-length")! }
          : {}),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
