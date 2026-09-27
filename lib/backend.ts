export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  token?: string;
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

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_KEY, token);
      document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch {}
}

export function backendUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/")) {
    return `${cleanBase}${cleanPath}`;
  }
  return `${cleanBase}/api${cleanPath}`;
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

    const result: ApiResult<T> = await response.json();

    // Auto-save returned JWT token if present in response
    const returnedToken = (result.data as any)?.token || (result as any)?.token;
    if (returnedToken && typeof returnedToken === "string") {
      setAuthToken(returnedToken);
    }

    // Auto-clear token on logout
    if (path.includes("/auth/logout")) {
      setAuthToken(null);
    }

    if (!response.ok || !result.success) {
      return { success: false, error: result.error || "تعذر تنفيذ الطلب" };
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err?.message || "تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى" };
  }
}

export async function backendFields<T extends object>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<Partial<T> & { success: boolean; error?: string; message?: string; token?: string }> {
  const result = await backendRequest<T>(path, method, body);
  const fields: Partial<T> = (result.data as Partial<T>) ?? {};
  const returnedToken = (result.data as any)?.token || (result as any)?.token;
  return {
    ...fields,
    token: returnedToken,
    success: result.success,
    error: result.error,
    message: result.message,
  };
}
