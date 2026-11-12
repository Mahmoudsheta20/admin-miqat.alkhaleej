import { backendUrl } from "./backend";

export type WhatsAppConnectionStatus =
  | "connected"
  | "qr_ready"
  | "connecting"
  | "disconnected";

export interface WhatsAppAntiBanStats {
  queueLength: number;
  maxQueueSize: number;
  sentLastMinute: number;
  perMinuteLimit: number;
  sentLast24Hours: number;
  dailyLimit: number;
  minDelayMs: number;
  maxDelayMs: number;
  cooldownEveryMessages: number;
  dedupWindowMs: number;
  haltReason: string | null;
}

export interface WhatsAppStatus {
  success: boolean;
  status: WhatsAppConnectionStatus | string;
  qrImage: string | null;
  queueLength?: number;
  antiBan?: WhatsAppAntiBanStats;
  me_id?: string;
  me_push_name?: string;
  status_message?: string;
}

export interface WhatsAppQrResponse {
  success: boolean;
  qr?: string | null;
  qrImage?: string | null;
  message?: string;
}

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  const res = await fetch(backendUrl("/whatsapp/status"), {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => null)) as
    | (WhatsAppStatus & { error?: string; message?: string })
    | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "تعذر جلب حالة الواتساب");
  }
  return data;
}

export async function fetchWhatsAppQr(): Promise<WhatsAppQrResponse> {
  const res = await fetch(backendUrl("/whatsapp/qr"), {

    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("تعذر جلب رمز QR للواتساب");
  return res.json();
}

export async function sendContractWhatsApp(
  contractId: string,
  phone?: string
): Promise<{ success: boolean; preview?: string; messageId?: string; phone?: string }> {
  const res = await fetch(backendUrl("/whatsapp/send-contract"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
  const res = await fetch(backendUrl("/whatsapp/send-invoice"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoiceId, phone }),
  });
  const data = (await res.json()) as { success?: boolean; message?: string; preview?: string; messageId?: string; phone?: string };
  if (!res.ok || !data.success) {
    throw new Error(data.message || "فشل إرسال الفاتورة عبر الواتساب");
  }
  return { success: true, preview: data.preview, messageId: data.messageId, phone: data.phone };
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; message?: string; data?: { jobId: string; position: number; status: string } }> {
  const res = await fetch(backendUrl("/whatsapp/send"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, message }),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    error?: string;
    data?: { jobId: string; position: number; status: string };
  };
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || "فشل جدولة رسالة الواتساب");
  }
  return { success: true, message: data.message, data: data.data };
}

export async function logoutWhatsApp(): Promise<WhatsAppStatus> {
  const res = await fetch(backendUrl("/whatsapp/logout"), {
    method: "POST",
    credentials: "include",
  });
  const data = (await res.json()) as WhatsAppStatus & { error?: string; message?: string };
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || "تعذر تسجيل الخروج من الواتساب");
  }
  return data;
}

export async function reconnectWhatsApp(): Promise<WhatsAppStatus> {
  const res = await fetch(backendUrl("/whatsapp/reconnect"), {
    method: "POST",
    credentials: "include",
  });
  const data = (await res.json()) as WhatsAppStatus & { error?: string; message?: string };
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || "تعذر إعادة الاتصال بالواتساب");
  }
  return data;
}
