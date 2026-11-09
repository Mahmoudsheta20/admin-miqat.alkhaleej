export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

/** Browser requests stay on the frontend origin so HttpOnly cookies also protect PDFs. */
export function backendUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = cleanPath.startsWith("/api/") ? cleanPath : `/api${cleanPath}`;
  if (typeof window !== "undefined") return `/api/proxy/${apiPath.slice(5)}`;
  const base = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001")
    .trim().replace(/^["']+|["']+$/g, "").replace(/\/+$/, "").replace(/\/api$/, "");
  return `${base}${apiPath}`;
}

/** One-time cleanup of credentials written by versions before cookie-only sessions. */
export function clearLegacyCredentials(): void {
  if (typeof window === "undefined") return;
  try {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem("miqat_token");
      storage.removeItem("miqat_auth_user");
    }
    // Retire the old script-readable frontend cookie before the server sets its replacement.
    // HttpOnly cookies are intentionally unaffected by this assignment.
    document.cookie = "miqat_token=; path=/; max-age=0; SameSite=Lax";
  } catch { /* Storage can be disabled. Session authority always belongs to the backend. */ }
}

export function queryString(values: object = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params.size ? `?${params}` : "";
}

export async function backendRequest<T>(path: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;

    const headers: Record<string, string> = {};
    if (body !== undefined && !isForm) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(backendUrl(path), {
      method,
      credentials: "include",
      cache: "no-store",
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.headers.get("content-type")?.includes("application/json")) {
      return { success: false, status: response.status, error: "تعذر قراءة استجابة الخادم، يرجى إعادة المحاولة" };
    }
    const result: ApiResult<T> = await response.json();

    if (!response.ok || !result.success) {
      return { success: false, status: response.status, error: result.error || "تعذر تنفيذ الطلب" };
    }
    if (method !== "GET" && typeof window !== "undefined" && typeof window.dispatchEvent === "function") window.dispatchEvent(new Event("miqat:mutation"));
    return result;
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error && error.name === "TimeoutError"
      ? "استغرق الطلب وقتاً طويلاً، يرجى إعادة المحاولة"
      : "تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى" };
  }
}

export async function backendFields<T extends object>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<Partial<T> & { success: boolean; error?: string; message?: string }> {
  const result = await backendRequest<T>(path, method, body);
  const fields: Partial<T> = (result.data as Partial<T>) ?? {};
  return {
    ...fields,
    success: result.success,
    error: result.error,
    message: result.message,
  };
}
