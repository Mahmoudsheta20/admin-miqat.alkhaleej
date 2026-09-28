/**
 * Converts a direct S3 URL into a same-origin `/api/pdf/serve?url=...` path.
 *
 * Benefits:
 * - The Edge function fetches the PDF from S3 (~10-50ms AWS ↔ AWS)
 * - The response is cached at Vercel's edge for 24h
 * - The browser loads it from the same origin (no CORS, no cross-region latency)
 */
export function pdfServeUrl(s3Url: string): string {
  return `/api/pdf/serve?url=${encodeURIComponent(s3Url)}`;
}

/** Returns true if the value looks like a full http(s) URL. */
export function isFullUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^https?:\/\//i.test(value.trim()) && value.trim().length > 10;
}
