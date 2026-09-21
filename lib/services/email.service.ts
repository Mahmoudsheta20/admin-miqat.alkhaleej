import nodemailer, { Transporter } from "nodemailer";
import { renderContractAlertHtml } from "@/lib/email-templates/contractAlert";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

function getEmailTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || "miqatalkhaleej@gmail.com";
  const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "";
  const pass = rawPass.replace(/\s+/g, "").trim();

  if (!pass) {
    console.warn(
      "[EmailService] Gmail App Password (GMAIL_APP_PASSWORD or SMTP_PASS) is not configured in .env. Outbound emails will be simulated safely."
    );
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    return transporter;
  } catch (error) {
    console.error("[EmailService] Failed to initialize nodemailer transporter:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

/**
 * Generic email sending service using Gmail SMTP.
 * Never leaks passwords or raw technical errors to clients.
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const sender = process.env.SMTP_USER || "miqatalkhaleej@gmail.com";
    const fromAddress = `"ميقات الخليج" <${sender}>`;

    const transport = getEmailTransporter();
    if (!transport) {
      console.log(
        `[EmailService] Simulated email to: ${Array.isArray(options.to) ? options.to.join(", ") : options.to} | Subject: ${options.subject}`
      );
      return {
        success: true,
        messageId: "simulated-delivery-no-smtp-key",
      };
    }

    const info = await transport.sendMail({
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text || options.subject,
      html: options.html,
    });

    console.log(`[EmailService] Email dispatched successfully. Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    // Safe error logging - never log credentials
    const safeError = error instanceof Error ? error.message : "Failed to deliver email";
    console.error("[EmailService] Outbound email transmission error:", safeError);
    return {
      success: false,
      error: "تعذر إرسال البريد الإلكتروني عبر الخادم",
    };
  }
}

/**
 * Dispatches the official Contract Creation Alert.
 * STRICT PRIVACY: Only sends general notice with the secure review URL. Zero contract details included.
 */
export async function sendContractAlertEmail(params: {
  to: string | string[];
  reviewUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const subject = "عقد جديد يحتاج إلى مراجعة";
  const text = "تم إنشاء عقد جديد في نظام ميقات الخليج ويحتاج إلى المراجعة.\n\nلمراجعة العقد: " + params.reviewUrl;
  const html = renderContractAlertHtml({ reviewUrl: params.reviewUrl });

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}
