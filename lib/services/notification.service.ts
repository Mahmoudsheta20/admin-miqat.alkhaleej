import { prisma } from "@/lib/prisma";
import { sendContractAlertEmail } from "@/lib/services/email.service";

export type NotificationType =
  | "CONTRACT_PENDING_REVIEW"
  | "CONTRACT_APPROVED"
  | "CONTRACT_REJECTED"
  | "CONTRACT_EXPIRING"
  | "CONTRACT_EXPIRED"
  | "SYSTEM_ANNOUNCEMENT";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  contractId?: string | null;
}

export class NotificationService {
  /**
   * Determine responsible reviewers for new contracts.
   * Finds all active ADMIN users in the system.
   */
  static async getContractReviewers(): Promise<Array<{ id: string; email: string; name: string }>> {
    const reviewers = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return reviewers;
  }

  /**
   * Dispatches contract creation notifications:
   * 1. Creates internal in-app notifications for authorized reviewers.
   * 2. Sends general email alert via Gmail SMTP (Zero contract details).
   * 3. Non-blocking: Contract creation transaction is protected if email/notification encounters an error.
   */
  static async notifyContractCreated(contractId: string): Promise<void> {
    try {
      // 1. Identify reviewers
      const reviewers = await this.getContractReviewers();
      if (!reviewers || reviewers.length === 0) {
        console.warn(`[NotificationService] No active ADMIN reviewers found for contract: ${contractId}`);
        return;
      }

      const title = "عقد جديد يحتاج إلى مراجعة";
      const message = "تم إنشاء عقد جديد ويحتاج إلى المراجعة.";

      // 2. Create internal notification records in database
      await prisma.notification.createMany({
        data: reviewers.map((reviewer) => ({
          userId: reviewer.id,
          type: "CONTRACT_PENDING_REVIEW",
          title,
          message,
          contractId,
          isRead: false,
        })),
      });

      // 3. Prepare general review URL
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://admin.miqatalkhaleej.com");
      const reviewUrl = `${siteUrl}/admin/contracts/${contractId}`;

      // 4. Send email alert to reviewers
      const recipientEmails = reviewers.map((r) => r.email).filter(Boolean);
      const systemEmail = process.env.SMTP_USER || "miqatalkhaleej@gmail.com";
      if (!recipientEmails.includes(systemEmail)) {
        recipientEmails.push(systemEmail);
      }

      // Safe non-blocking email trigger
      sendContractAlertEmail({
        to: recipientEmails,
        reviewUrl,
      }).catch((emailErr) => {
        console.error("[NotificationService] Background email dispatch failed safely:", emailErr);
      });
    } catch (err) {
      // Never crash or disrupt the caller
      console.error("[NotificationService] Failed to notify contract creation:", err);
    }
  }

  /**
   * Extensible status change notifier for future events (Approved / Rejected)
   */
  static async notifyContractStatusChanged(params: {
    contractId: string;
    newStatus: "APPROVED" | "REJECTED";
    targetUserId?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const isApproved = params.newStatus === "APPROVED";
      const title = isApproved ? "تم اعتماد العقد" : "تم رفض العقد";
      const message = isApproved
        ? "تمت مراجعة العقد واعتماده رسمياً في النظام."
        : "تمت مراجعة العقد ولم يتم اعتماده." + (params.notes ? ` الملاحظات: ${params.notes}` : "");

      // If captain/creator target exists, notify them
      if (params.targetUserId) {
        await prisma.notification.create({
          data: {
            userId: params.targetUserId,
            type: isApproved ? "CONTRACT_APPROVED" : "CONTRACT_REJECTED",
            title,
            message,
            contractId: params.contractId,
            isRead: false,
          },
        });
      }
    } catch (err) {
      console.error("[NotificationService] Status change notification error:", err);
    }
  }

  /**
   * Fetch in-app notifications for a specific user
   */
  static async getUserNotifications(userId: string, limit: number = 20) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        contract: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Count unread notifications
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true, readAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }
}
