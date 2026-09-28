import { backendRequest, backendFields } from "@/lib/backend";
import type { SystemUser } from "@/lib/types";

interface LoginResult { user: SystemUser; mustChangePassword?: boolean; token?: string }
interface PasswordChange { newPassword: string; confirmPassword: string; rememberMe?: boolean; userId?: string }

export function loginAction(email: string, password?: string, rememberMe = true) {
  return backendFields<LoginResult>("/auth/login", "POST", { email, password, rememberMe });
}
export function completePasswordChangeAction(params: PasswordChange) {
  return backendFields<LoginResult>("/auth/complete-password-change", "POST", params);
}
export function logoutAction() { return backendRequest("/auth/logout", "POST"); }
export async function getCurrentSession() {
  const result = await backendRequest<SystemUser>("/auth/session");
  if (!result.success && result.status !== 401 && result.status !== 403) throw new Error(result.error);
  return result.success ? result.data ?? null : null;
}
export async function updateUserProfileAction(_userId: string, data: { name?: string; phone?: string; avatarUrl?: string }) {
  const result = await backendRequest<SystemUser>("/auth/profile", "PUT", data);
  return { success: result.success, user: result.data, error: result.error };
}
export function changeUserPasswordAction(params: PasswordChange & { currentPassword: string }) {
  return backendRequest("/auth/change-password", "POST", params);
}
export function requestPasswordResetAction(email: string) {
  return backendFields<{ message: string }>("/auth/forgot-password", "POST", { email });
}
export async function verifyResetTokenAction(params: { email: string; token: string }) {
  const result = await backendRequest<{ valid: boolean }>("/auth/verify-reset-token", "POST", params);
  return { success: result.success, valid: result.data?.valid ?? false, error: result.error };
}
export function resetPasswordWithTokenAction(params: PasswordChange & { email: string; token: string }) {
  return backendRequest("/auth/reset-password", "POST", params);
}
