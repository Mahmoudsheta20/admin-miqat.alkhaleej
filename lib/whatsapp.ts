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
  attemptedLastMinute?: number;
  attemptedLast24Hours?: number;
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
  recovery?: { canReconnect: boolean; canRelink: boolean };
}

export interface WhatsAppQrResponse {
  success: boolean;
  qr?: string | null;
  qrImage?: string | null;
  message?: string;
}

export interface WhatsAppDispatchResult {
  success: boolean;
  preview?: string;
  messageId?: string;
  phone?: string;
  hasPdfAttachment?: boolean;
}

function notifyWhatsAppMutation(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("miqat:mutation"));
  }
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
): Promise<WhatsAppDispatchResult> {
  const res = await fetch(backendUrl("/whatsapp/send-contract"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contractId, phone }),
    signal: AbortSignal.timeout(120000),
  });
  const data = (await res.json().catch(() => null)) as (WhatsAppDispatchResult & { error?: string; message?: string }) | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "تعذر تأكيد إرسال العقد. تحقق من الاستلام قبل إعادة المحاولة");
  }
  notifyWhatsAppMutation();
  return { success: true, preview: data.preview, messageId: data.messageId, phone: data.phone, hasPdfAttachment: data.hasPdfAttachment };
}

export async function sendInvoiceWhatsApp(
  invoiceId: string,
  phone?: string
): Promise<WhatsAppDispatchResult> {
  const res = await fetch(backendUrl("/whatsapp/send-invoice"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoiceId, phone }),
    signal: AbortSignal.timeout(120000),
  });
  const data = (await res.json().catch(() => null)) as (WhatsAppDispatchResult & { error?: string; message?: string }) | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "تعذر تأكيد إرسال الفاتورة. تحقق من الاستلام قبل إعادة المحاولة");
  }
  notifyWhatsAppMutation();
  return { success: true, preview: data.preview, messageId: data.messageId, phone: data.phone, hasPdfAttachment: data.hasPdfAttachment };
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
  notifyWhatsAppMutation();
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
  notifyWhatsAppMutation();
  return data;
}

export interface WhatsAppAutoSendResult {
  attempted: boolean;
  success: boolean;
  phone?: string;
  messageId?: string;
  flowSessionId?: string;
  interactiveSent?: boolean;
  adminNotified?: boolean;
  adminPhone?: string;
  error?: string;
}

export type WhatsAppFlowStatus =
  | "SENT"
  | "ACKNOWLEDGED"
  | "ARRIVED"
  | "STARTED"
  | "COMPLETED"
  | "SUPPORT_NEEDED"
  | "CLOSED";

/** How captains answer: emoji reaction on the contract, tap-to-reply wa.me links, or numbered text. */
export type WhatsAppInteractiveMode = "reactions_and_links" | "reactions_only" | "text_only";

export interface WhatsAppFlowButton {
  id: string;
  code: string;
  /** Emoji the captain reacts with on the contract message to trigger this step. */
  emoji: string;
  labelAr: string;
  labelEn: string;
  replyTextAr: string;
  adminNoticeTitleAr: string;
  targetStatus: WhatsAppFlowStatus;
  enabled: boolean;
}

export interface WhatsAppFlowAdminButton {
  id: string;
  code: string;
  labelAr: string;
  labelEn: string;
  captainMessageTemplateAr: string;
  nextStatus?: WhatsAppFlowStatus;
  enabled: boolean;
}

export interface WhatsAppFlowConfig {
  enabled: boolean;
  adminPhone: string;
  notifyOnContractSent: boolean;
  notifyOnInvoiceSent: boolean;
  notifyOnCaptainAction: boolean;
  autoReplyToCaptain: boolean;
  includeActionMenuOnContract: boolean;
  includeAdminActionButtons: boolean;
  interactiveMode: WhatsAppInteractiveMode;
  autoSendContractDefault: boolean;
  autoSendInvoiceDefault: boolean;
  captainButtons: WhatsAppFlowButton[];
  adminActionButtons: WhatsAppFlowAdminButton[];
}

export interface WhatsAppFlowSession {
  id: string;
  contractId: string;
  referenceNumber: string;
  captainId?: string;
  captainName: string;
  captainPhone: string;
  customerName: string;
  origin: string;
  destination: string;
  tripDate: string;
  tripTime: string;
  vehiclePlate: string;
  status: WhatsAppFlowStatus;
  lastActionId?: string;
  lastActionLabel?: string;
  lastActionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppFlowEvent {
  id: string;
  sessionId?: string;
  entityType: "CONTRACT" | "INVOICE" | "SYSTEM";
  entityId?: string;
  referenceNumber?: string;
  type:
    | "CONTRACT_SENT"
    | "INVOICE_SENT"
    | "CAPTAIN_ACTION"
    | "ADMIN_ACTION"
    | "ADMIN_NOTIFIED"
    | "CAPTAIN_NOTIFIED"
    | "TEST_SENT"
    | "ERROR";
  actorRole: "ADMIN" | "CAPTAIN" | "SYSTEM";
  actorPhone?: string;
  actionId?: string;
  label: string;
  summary: string;
  messageId?: string;
  timestamp: string;
}

export interface WhatsAppFlowOverview {
  success: boolean;
  config: WhatsAppFlowConfig;
  sessions: WhatsAppFlowSession[];
  events: WhatsAppFlowEvent[];
  stats: {
    activeSessions: number;
    arrivedSessions: number;
    totalEvents: number;
  };
}

export async function fetchWhatsAppFlowOverview(): Promise<WhatsAppFlowOverview> {
  const res = await fetch(backendUrl("/whatsapp/flow"), {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => null)) as
    | (WhatsAppFlowOverview & { error?: string; message?: string })
    | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "تعذر جلب إعدادات نظام التدفق");
  }
  return data;
}

export async function updateWhatsAppFlowConfig(
  patch: Partial<WhatsAppFlowConfig>
): Promise<WhatsAppFlowConfig> {
  const res = await fetch(backendUrl("/whatsapp/flow/config"), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await res.json().catch(() => null)) as {
    success?: boolean;
    config?: WhatsAppFlowConfig;
    error?: string;
    message?: string;
  } | null;
  if (!res.ok || !data?.success || !data.config) {
    throw new Error(data?.error || data?.message || "تعذر حفظ إعدادات نظام التدفق");
  }
  notifyWhatsAppMutation();
  return data.config;
}

export async function triggerWhatsAppFlowAction(payload: {
  sessionId?: string;
  contractId?: string;
  role: "CAPTAIN" | "ADMIN";
  actionId: string;
}): Promise<{ success: boolean; session: WhatsAppFlowSession; message?: string }> {
  const res = await fetch(backendUrl("/whatsapp/flow/trigger"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as {
    success?: boolean;
    session?: WhatsAppFlowSession;
    error?: string;
    message?: string;
  } | null;
  if (!res.ok || !data?.success || !data.session) {
    throw new Error(data?.error || data?.message || "تعذر تنفيذ خطوة التدفق");
  }
  notifyWhatsAppMutation();
  return { success: true, session: data.session, message: data.message };
}

export async function sendWhatsAppFlowTest(): Promise<{
  success: boolean;
  message?: string;
  data?: { jobId: string; position: number; adminPhone: string };
}> {
  const res = await fetch(backendUrl("/whatsapp/flow/test"), {
    method: "POST",
    credentials: "include",
  });
  const data = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    error?: string;
    data?: { jobId: string; position: number; adminPhone: string };
  } | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "تعذر إرسال رسالة اختبار التدفق");
  }
  notifyWhatsAppMutation();
  return { success: true, message: data.message, data: data.data };
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
  notifyWhatsAppMutation();
  return data;
}
