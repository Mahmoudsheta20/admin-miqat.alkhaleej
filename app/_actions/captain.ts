import { backendRequest, backendFields } from "@/lib/backend";
import type { SystemUser } from "@/lib/types";

export interface CaptainFormData {
  name: string; email: string; phone?: string; nationalId?: string;
  licenseNumber?: string; licenseExpiry?: string; assignedVehiclePlate?: string; avatarUrl?: string;
  active?: boolean;
}
interface CaptainSummary extends SystemUser { contractCount: number; hasTodayInspection: boolean }
export async function getCaptains() {
  const result = await backendRequest<CaptainSummary[]>("/captains");
  return { success: result.success, captains: result.data, error: result.error };
}
export function createCaptain(data: CaptainFormData) {
  return backendFields<{ captain: SystemUser; temporaryPassword: string }>("/captains", "POST", data);
}
export function resetCaptainTemporaryPassword(id: string) {
  return backendFields<{ temporaryPassword: string; captainName: string }>(`/captains/${encodeURIComponent(id)}/reset-password`, "POST");
}
export async function updateCaptain(id: string, data: Partial<CaptainFormData> & { active?: boolean }) {
  const result = await backendRequest<SystemUser>(`/captains/${encodeURIComponent(id)}`, "PUT", data);
  return { success: result.success, captain: result.data, error: result.error };
}
export async function toggleCaptainStatus(id: string, active: boolean) {
  return updateCaptain(id, { active });
}
export function deleteCaptain(id: string) { return backendRequest(`/captains/${encodeURIComponent(id)}`, "DELETE"); }
