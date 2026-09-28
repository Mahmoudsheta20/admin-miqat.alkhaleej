export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  token?: string;
  status?: number;
}

const TOKEN_KEY = "miqat_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null, rememberMe = true): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem(TOKEN_KEY);
      storage.setItem(TOKEN_KEY, token);
      document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; ${rememberMe ? `max-age=${30 * 24 * 60 * 60}; ` : ""}SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch {}
}

export function backendUrl(path: string): string {
  const rawBase = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    ""
  )
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\/+$/, "");

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = cleanPath.startsWith("/api/") ? cleanPath : `/api${cleanPath}`;

  // If in browser on HTTPS (e.g. Vercel) and backend is HTTP:
  // Direct HTTP fetch from an HTTPS page is blocked by browsers as Mixed Content.
  // Using the same-origin proxy (/api/proxy/...) routes it safely through Next.js server!
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    (!rawBase || rawBase.startsWith("http://"))
  ) {
    const subPath = apiPath.replace(/^\/api\/?/, "");
    return `/api/proxy/${subPath}`;
  }

  // If rawBase is provided and starts with http/https
  if (rawBase && (rawBase.startsWith("http://") || rawBase.startsWith("https://"))) {
    return `${rawBase.replace(/\/api$/, "")}${apiPath}`;
  }

  // Default fallback for local dev
  return `http://localhost:5001${apiPath}`;
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
    const token = getAuthToken();

    const headers: Record<string, string> = {};
    if (body !== undefined && !isForm) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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

    // Auto-save returned JWT token if present in response
    const returnedToken = responseToken(result);
    if (response.ok && result.success && returnedToken) {
      const rememberMe = typeof body === "object" && body !== null && "rememberMe" in body ? body.rememberMe !== false : true;
      setAuthToken(returnedToken, rememberMe);
    }

    // Auto-clear token on logout
    if (path.includes("/auth/logout")) {
      setAuthToken(null);
    }

    if (!response.ok || !result.success) {
      return { success: false, status: response.status, error: result.error || "تعذر تنفيذ الطلب" };
    }
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
): Promise<Partial<T> & { success: boolean; error?: string; message?: string; token?: string }> {
  const result = await backendRequest<T>(path, method, body);
  const fields: Partial<T> = (result.data as Partial<T>) ?? {};
  const returnedToken = responseToken(result);
  return {
    ...fields,
    token: returnedToken,
    success: result.success,
    error: result.error,
    message: result.message,
  };
}

function responseToken(result: ApiResult<unknown>): string | undefined {
  if (typeof result.data === "object" && result.data !== null && "token" in result.data && typeof result.data.token === "string") return result.data.token;
  return typeof result.token === "string" ? result.token : undefined;
}
