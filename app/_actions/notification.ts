"use server";

import { getCurrentSession } from "@/app/_actions/auth";
import { NotificationService } from "@/lib/services/notification.service";
import { SystemNotification } from "@/lib/types";

export async function getUserNotificationsAction(): Promise<{
  success: boolean;
  notifications?: SystemNotification[];
  unreadCount?: number;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.id) {
      return { success: false, error: "يجب تسجيل الدخول للوصول إلى الإشعارات" };
    }

    const [records, unreadCount] = await Promise.all([
      NotificationService.getUserNotifications(session.id, 25),
      NotificationService.getUnreadCount(session.id),
    ]);

    const notifications: SystemNotification[] = records.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      contractId: n.contractId,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt ? n.readAt.toISOString() : null,
    }));

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (error) {
    console.error("getUserNotificationsAction error:", error);
    return { success: false, error: "تعذر جلب الإشعارات" };
  }
}

export async function getUnreadNotificationsCountAction(): Promise<{
  success: boolean;
  count?: number;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.id) return { success: true, count: 0 };
    const count = await NotificationService.getUnreadCount(session.id);
    return { success: true, count };
  } catch {
    return { success: true, count: 0 };
  }
}

export async function markNotificationAsReadAction(
  notificationId: string
): Promise<{ success: boolean }> {
  try {
    const session = await getCurrentSession();
    if (!session?.id) return { success: false };
    const ok = await NotificationService.markAsRead(notificationId, session.id);
    return { success: ok };
  } catch {
    return { success: false };
  }
}

export async function markAllNotificationsAsReadAction(): Promise<{
  success: boolean;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.id) return { success: false };
    const ok = await NotificationService.markAllAsRead(session.id);
    return { success: ok };
  } catch {
    return { success: false };
  }
}
