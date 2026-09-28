interface PdfSourceOptions {
  sourceUrl: string;
  token?: string | null;
  isAuthenticated: boolean;
  forceBuffer?: boolean;
  signal: AbortSignal;
}

export interface ResolvedPdfSource {
  url?: string;
  blob?: Blob;
}

export function isSignedStorageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    // AWS S3 hostnames
    if (
      host.includes("amazonaws.com") ||
      host.includes(".s3.") ||
      host.startsWith("s3.") ||
      host.endsWith(".s3.amazonaws.com")
    ) {
      return true;
    }
    // Presigned signature query parameters
    if (
      url.searchParams.has("X-Amz-Signature") ||
      url.searchParams.has("Signature") ||
      url.searchParams.has("AWSAccessKeyId")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function readPdf(response: Response): Promise<ResolvedPdfSource> {
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "يرجى تسجيل الدخول مجدداً للتحقق من صلاحية عرض الملف."
        : "تعذر تحميل ملف PDF. يرجى إعادة المحاولة."
    );
  }
  const blob = await response.blob();
  if ((await blob.slice(0, 5).text()) !== "%PDF-") {
    throw new Error("لم يُرجع الخادم ملف PDF صالحاً.");
  }
  return { blob: new Blob([blob], { type: "application/pdf" }) };
}

/** Prefer a short authenticated URL lookup or direct S3 stream over relaying the whole PDF through the API. */
export async function resolvePdfSource({
  sourceUrl,
  token,
  isAuthenticated,
  forceBuffer,
  signal,
}: PdfSourceOptions): Promise<ResolvedPdfSource> {
  // If the source URL itself is already a direct S3 / storage URL and forceBuffer is not requested,
  // stream it directly into the PDF viewer immediately (0ms latency, no relay needed)!
  if (!forceBuffer && isSignedStorageUrl(sourceUrl)) {
    return { url: sourceUrl };
  }

  const init: RequestInit = {
    headers: isAuthenticated && token ? { Authorization: `Bearer ${token}` } : {},
    credentials: isAuthenticated ? "include" : "omit",
    cache: "no-store",
    signal,
  };

  if (isAuthenticated && !forceBuffer) {
    const metadataUrl = new URL(sourceUrl, "http://localhost");
    metadataUrl.searchParams.delete("direct");
    metadataUrl.searchParams.set("json", "1");
    const address = sourceUrl.startsWith("/")
      ? `${metadataUrl.pathname}${metadataUrl.search}`
      : metadataUrl.toString();

    try {
      const response = await fetch(address, init);
      if (response.status === 401 || response.status === 403) {
        return readPdf(response);
      }
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("application/json")
      ) {
        const result: unknown = await response.json();
        let resolvedUrl: string | null = null;
        if (typeof result === "object" && result !== null) {
          const obj = result as Record<string, unknown>;
          if (typeof obj.url === "string") resolvedUrl = obj.url;
          else if (typeof obj.data === "string") resolvedUrl = obj.data;
          else if (obj.data && typeof obj.data === "object" && "url" in obj.data) {
            const d = obj.data as Record<string, unknown>;
            if (typeof d.url === "string") resolvedUrl = d.url;
          }
        }

        if (resolvedUrl && isSignedStorageUrl(resolvedUrl)) {
          // Browser PDF viewers can stream/range-read directly from S3 storage.
          return { url: resolvedUrl };
        }
      } else if (
        response.ok &&
        response.headers.get("content-type")?.includes("application/pdf")
      ) {
        return readPdf(response);
      }
    } catch (e: unknown) {
      if (signal.aborted) throw e;
      // Fallback to direct fetch
    }
  }

  // Local files, older backends, or fallback buffer
  return readPdf(await fetch(sourceUrl, init));
}
