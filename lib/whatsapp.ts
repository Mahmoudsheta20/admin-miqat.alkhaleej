import { backendUrl, getAuthToken } from "./backend";

export interface WhatsAppStatus {
  success: boolean;
  status: string; // "WORKING" | "QR" | "STARTING" | "FAILED"
  me_id?: string;
  me_push_name?: string;
  status_message?: string;
}

export interface WhatsAppQrResponse {
  success: boolean;
  qr?: string;
  message?: string;
}

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  const token = getAuthToken();
  const res = await fetch(backendUrl("/whatsapp/status"), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error("تعذر جلب حالة الواتساب");
  return res.json();
}

export async function fetchWhatsAppQr(): Promise<WhatsAppQrResponse> {
  const token = getAuthToken();
  const res = await fetch(backendUrl("/whatsapp/qr"), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error("تعذر جلب رمز QR للواتساب");
  return res.json();
}

export async function sendContractWhatsApp(
  contractId: string,
  phone?: string
): Promise<{ success: boolean; preview?: string; messageId?: string; phone?: string }> {
  const token = getAuthToken();
  const res = await fetch(backendUrl("/whatsapp/send-contract"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ contractId, phone }),
  });
  const data = (await res.json()) as { success?: boolean; message?: string; preview?: string; messageId?: string; phone?: string };
  if (!res.ok || !data.success) {
    throw new Error(data.message || "فشل إرسال العقد عبر الواتساب");
  }
  return { success: true, preview: data.preview, messageId: data.messageId, phone: data.phone };
}

export async function sendInvoiceWhatsApp(
  invoiceId: string,
  phone?: string
): Promise<{ success: boolean; preview?: string; messageId?: string; phone?: string }> {
  const token = getAuthToken();
  const res = await fetch(backendUrl("/whatsapp/send-invoice"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ invoiceId, phone }),
  });
  const data = (await res.json()) as { success?: boolean; message?: string; preview?: string; messageId?: string; phone?: string };
  if (!res.ok || !data.success) {
    throw new Error(data.message || "فشل إرسال الفاتورة عبر الواتساب");
  }
  return { success: true, preview: data.preview, messageId: data.messageId, phone: data.phone };
}

