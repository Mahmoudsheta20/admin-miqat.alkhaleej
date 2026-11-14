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
  driverWorkflow?: { enabled: boolean; managementTarget: string | null };
  recovery?: { canReconnect: boolean; canRelink: boolean };
}

export interface WhatsAppQrResponse {
  success: boolean;
  qr?: string | null;
  qrImage?: string | null;
  message?: string;
}

export interface WhatsAppDispatchResult {
  dispatchKind?: "driver_poll" | "contract_document" | "invoice_document" | "inspection_document";
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

function waText(ar: string, en: string): string {
  return typeof document !== "undefined" && document.documentElement?.lang === "en" ? en : ar;
}

async function parseWhatsAppJson<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null;
}

function resolveWhatsAppError(
  res: Response,
  payload: { error?: string; message?: string } | null,
  fallback: string
): string {
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;
  if (res.status === 502 || res.status === 504) {
    return waText(
      "بوابة الخادم غير متاحة مؤقتاً أو انتهت مهلة الطلب. تحقق قبل إعادة المحاولة.",
      "Gateway unavailable or request timed out. Verify status before retrying."
    );
  }
  return fallback;
}

interface WhatsAppStatusPayload extends Partial<WhatsAppStatus> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: Partial<WhatsAppStatus>;
}

function normalizeWhatsAppStatus(payload: WhatsAppStatusPayload): WhatsAppStatus {
  const nested = payload.data;
  return {
    success: true,
    status: nested?.status ?? payload.status ?? "disconnected",
    qrImage: nested?.qrImage ?? payload.qrImage ?? null,
    queueLength: nested?.queueLength ?? payload.queueLength,
    antiBan: nested?.antiBan ?? payload.antiBan,
    me_id: nested?.me_id ?? payload.me_id,
    me_push_name: nested?.me_push_name ?? payload.me_push_name,
    status_message: nested?.status_message ?? payload.status_message,
    driverWorkflow: nested?.driverWorkflow ?? payload.driverWorkflow,
    recovery: nested?.recovery ?? payload.recovery,
  };
}

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  const res = await fetch(backendUrl("/whatsapp/status"), {
    cache: "no-store",
    credentials: "include",
  });
  const data = await parseWhatsAppJson<WhatsAppStatusPayload>(res);
  if (!res.ok || !data?.success) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر جلب حالة الواتساب", "Unable to fetch WhatsApp status")
      )
    );
  }
  return normalizeWhatsAppStatus(data);
}

export async function fetchWhatsAppQr(): Promise<WhatsAppQrResponse> {
  const res = await fetch(backendUrl("/whatsapp/qr"), {
    cache: "no-store",
    credentials: "include",
  });
  const data = await parseWhatsAppJson<
    WhatsAppQrResponse & { error?: string; message?: string }
  >(res);
  if (!res.ok || !data || data.success === false) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر جلب رمز QR للواتساب", "Unable to fetch WhatsApp QR code")
      )
    );
  }
  return data;
}

async function dispatchWhatsAppTarget(
  endpoint: string,
  payload: Record<string, unknown>,
  fallbackError: string
): Promise<WhatsAppDispatchResult> {
  const res = await fetch(backendUrl(endpoint), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  const data = await parseWhatsAppJson<
    WhatsAppDispatchResult & { error?: string; message?: string }
  >(res);
  if (!res.ok || !data?.success) {
    throw new Error(resolveWhatsAppError(res, data, fallbackError));
  }
  notifyWhatsAppMutation();
  return {
    success: true,
    dispatchKind: data.dispatchKind,
    preview: data.preview,
    messageId: data.messageId,
    phone: data.phone,
    hasPdfAttachment: data.hasPdfAttachment,
  };
}

export async function sendContractWhatsApp(
  contractId: string,
  phone?: string
): Promise<WhatsAppDispatchResult> {
  return dispatchWhatsAppTarget(
    "/whatsapp/send-contract",
    { contractId, phone },
    waText(
      "تعذر تأكيد إرسال العقد. تحقق من الاستلام قبل إعادة المحاولة",
      "Could not confirm contract dispatch. Check delivery before retrying"
    )
  );
}

export async function sendInvoiceWhatsApp(
  invoiceId: string,
  phone?: string
): Promise<WhatsAppDispatchResult> {
  return dispatchWhatsAppTarget(
    "/whatsapp/send-invoice",
    { invoiceId, phone },
    waText(
      "تعذر تأكيد إرسال الفاتورة. تحقق من الاستلام قبل إعادة المحاولة",
      "Could not confirm invoice dispatch. Check delivery before retrying"
    )
  );
}

export async function sendInspectionWhatsApp(
  inspectionId: string,
  phone?: string
): Promise<WhatsAppDispatchResult> {
  return dispatchWhatsAppTarget(
    "/whatsapp/send-inspection",
    { inspectionId, phone },
    waText(
      "تعذر تأكيد إرسال تقرير الفحص. تحقق من الاستلام قبل إعادة المحاولة",
      "Could not confirm inspection report dispatch. Check delivery before retrying"
    )
  );
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
  const data = await parseWhatsAppJson<{
    success?: boolean;
    message?: string;
    error?: string;
    data?: { jobId: string; position: number; status: string };
  }>(res);
  if (!res.ok || !data?.success) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("فشل جدولة رسالة الواتساب", "Failed to schedule WhatsApp message")
      )
    );
  }
  notifyWhatsAppMutation();
  return { success: true, message: data.message, data: data.data };
}

export async function logoutWhatsApp(): Promise<WhatsAppStatus> {
  const res = await fetch(backendUrl("/whatsapp/logout"), {
    method: "POST",
    credentials: "include",
  });
  const data = await parseWhatsAppJson<WhatsAppStatusPayload>(res);
  if (!res.ok || !data?.success) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر تسجيل الخروج من الواتساب", "Unable to log out of WhatsApp")
      )
    );
  }
  notifyWhatsAppMutation();
  return normalizeWhatsAppStatus(data);
}

export interface WhatsAppAutoSendResult {
  attempted: boolean;
  success: boolean;
  phone?: string;
  hasPdfAttachment?: boolean;
  preview?: string;
  messageId?: string;
  flowSessionId?: string;
  interactiveSent?: boolean;
  adminNotified?: boolean;
  adminPhone?: string;
  error?: string;
  guestSend?: {
    attempted: boolean;
    success: boolean;
    phone?: string;
    hasPdfAttachment?: boolean;
    preview?: string;
    messageId?: string;
    error?: string;
  };
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
  notifyOnInspectionSent?: boolean;
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
  const data = await parseWhatsAppJson<
    WhatsAppFlowOverview & { error?: string; message?: string }
  >(res);
  if (!res.ok || !data?.success) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر جلب إعدادات نظام التدفق", "Unable to fetch WhatsApp flow overview")
      )
    );
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
  const data = await parseWhatsAppJson<{
    success?: boolean;
    config?: WhatsAppFlowConfig;
    error?: string;
    message?: string;
  }>(res);
  if (!res.ok || !data?.success || !data.config) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر حفظ إعدادات نظام التدفق", "Unable to save WhatsApp flow configuration")
      )
    );
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
  const data = await parseWhatsAppJson<{
    success?: boolean;
    session?: WhatsAppFlowSession;
    error?: string;
    message?: string;
  }>(res);
  if (!res.ok || !data?.success || !data.session) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر تنفيذ خطوة التدفق", "Unable to trigger WhatsApp flow step")
      )
    );
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
  const data = await parseWhatsAppJson<{
    success?: boolean;
    message?: string;
    error?: string;
    data?: { jobId: string; position: number; adminPhone: string };
  }>(res);
  if (!res.ok || !data?.success) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر إرسال رسالة اختبار التدفق", "Unable to send WhatsApp flow test")
      )
    );
  }
  notifyWhatsAppMutation();
  return { success: true, message: data.message, data: data.data };
}

export async function reconnectWhatsApp(): Promise<WhatsAppStatus> {
  const res = await fetch(backendUrl("/whatsapp/reconnect"), {
    method: "POST",
    credentials: "include",
  });
  const data = await parseWhatsAppJson<WhatsAppStatusPayload>(res);
  if (!res.ok || !data?.success) {
    throw new Error(
      resolveWhatsAppError(
        res,
        data,
        waText("تعذر إعادة الاتصال بالواتساب", "Unable to reconnect WhatsApp")
      )
    );
  }
  notifyWhatsAppMutation();
  return normalizeWhatsAppStatus(data);
}
