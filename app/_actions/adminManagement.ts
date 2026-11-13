import { backendFields } from "@/lib/backend";
import type { AdminUserItem, CreateAdminPayload } from "@/lib/adminConstants";
import type { AdminPermissions } from "@/lib/permissions";

export function getAdminsListAction() {
  return backendFields<{ admins: AdminUserItem[]; isCallerSuperAdmin: boolean }>("/admins");
}
export function createAdminUserAction(data: CreateAdminPayload) {
  return backendFields<{ admin: AdminUserItem; temporaryPassword: string }>("/admins", "POST", data);
}
export function updateAdminPermissionsAction(id: string, permissions: AdminPermissions | null) {
  return backendFields<{ admin: AdminUserItem }>(
    `/admins/${encodeURIComponent(id)}/permissions`,
    "PUT",
    { permissions }
  );
}
export function toggleAdminStatusAction(id: string) {
  return backendFields<{ active: boolean }>(`/admins/${encodeURIComponent(id)}/status`, "PATCH");
}
export function deleteAdminUserAction(id: string) { return backendFields(`/admins/${encodeURIComponent(id)}`, "DELETE"); }
export function resetAdminTemporaryPasswordAction(id: string) {
  return backendFields<{ temporaryPassword: string; adminName: string; email: string }>(`/admins/${encodeURIComponent(id)}/reset-password`, "POST");
}
