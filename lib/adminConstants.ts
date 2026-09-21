import { SystemUser } from "./types";

export const SUPER_ADMIN_EMAIL = "miqatalkhaleej@gmail.com";

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export interface AdminUserItem extends SystemUser {
  isSuperAdmin: boolean;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  phone?: string;
}
