import { backendUrl, getAuthToken } from "./backend";

/** Download through the authorized endpoint; never put session tokens in a URL. */
export async function downloadInspectionPdf(inspectionId: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(backendUrl(`/inspections/${encodeURIComponent(inspectionId)}/pdf?download=1`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? "انتهت الجلسة، يرجى تسجيل الدخول مجدداً."
      : "تعذر تنزيل الفحص. يرجى إعادة المحاولة.");
  }
  const blob = await response.blob();
  if (await blob.slice(0, 5).text() !== "%PDF-") {
    throw new Error("تعذر الحصول على ملف PDF صالح للفحص.");
  }
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  const link = document.createElement("a");
  const shortCode = inspectionId.replace(/-/g, "").slice(0, 8).toUpperCase();
  link.href = url;
  link.download = `inspection-${shortCode}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser to begin saving before releasing the object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
