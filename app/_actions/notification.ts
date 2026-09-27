import { backendRequest, backendFields } from "@/lib/backend";
import type { SystemNotification } from "@/lib/types";

export async function getUserNotificationsAction() {
  const [result, count] = await Promise.all([
    backendRequest<SystemNotification[]>("/notifications?limit=25"),
    getUnreadNotificationsCountAction(),
  ]);
  return { success: result.success, notifications: result.data, unreadCount: count.count, error: result.error };
}
export function getUnreadNotificationsCountAction() { return backendFields<{ count: number }>("/notifications/unread-count"); }
export function markNotificationAsReadAction(id: string) { return backendRequest(`/notifications/${encodeURIComponent(id)}/read`, "PATCH"); }
export function markAllNotificationsAsReadAction() { return backendRequest("/notifications/mark-all-read", "PATCH"); }
