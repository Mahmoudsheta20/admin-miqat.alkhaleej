import { backendRequest, backendFields, queryString } from "@/lib/backend";
import type { VehicleInspection } from "@/lib/types";

export interface InspectionInput {
  captainId: string; vehiclePlate: string; fuelGauge: boolean; tempGauge: boolean; oilPressure: boolean;
  checkEngine: boolean; absLight: boolean; warningLights: boolean; tires: boolean; headlights: boolean;
  signals: boolean; mirrors: boolean; noLeaks: boolean; fireExtinguisher: boolean; warningTriangle: boolean;
  firstAidKit: boolean; glassHammer: boolean; seatBelts: boolean; driverDeclared: boolean;
  notes?: string; inspectionDate?: Date | string;
}
export interface CaptainInspectionItem {
  id: string; name: string; email: string; phone?: string | null; nationalId?: string | null;
  assignedVehiclePlate?: string | null; avatarUrl?: string | null; active: boolean;
  hasTodayInspection: boolean; todayInspection: VehicleInspection | null;
  lastInspectionDate?: string | null; totalInspections: number;
}
export interface InspectionWithMeta extends VehicleInspection { captainPhone?: string | null; captainAvatar?: string | null; contractCount: number }
interface InspectionOverview {
  captains: CaptainInspectionItem[];
  stats: { totalCaptains: number; inspectedToday: number; pendingToday: number; totalInspections: number };
}
export async function getTodayInspection(captainId: string) {
  const result = await backendRequest<VehicleInspection | null>(`/inspections/today${queryString({ captainId })}`);
  return { success: result.success, inspection: result.data, error: result.error };
}
export async function submitInspection(data: InspectionInput) {
  const result = await backendRequest<VehicleInspection>("/inspections", "POST", data);
  return { success: result.success, inspection: result.data, error: result.error };
}
export function getCaptainsInspectionOverview() { return backendFields<InspectionOverview>("/inspections/overview"); }
export async function directPassInspection(captainId: string, vehiclePlate?: string, customNotes?: string, inspectionDate?: string) {
  const result = await backendRequest<VehicleInspection>("/inspections/direct-pass", "POST", { captainId, vehiclePlate, customNotes, inspectionDate });
  return { success: result.success, inspection: result.data, message: result.message, error: result.error };
}
export async function getAllInspectionsList(params?: { search?: string; captainId?: string; limit?: number }) {
  const result = await backendRequest<InspectionWithMeta[]>(`/inspections${queryString(params)}`);
  return { success: result.success, inspections: result.data, error: result.error };
}
export function deleteInspection(id: string) { return backendRequest(`/inspections/${encodeURIComponent(id)}`, "DELETE"); }
export async function getInspectionById(id: string) {
  const result = await backendRequest<VehicleInspection & { contracts?: { id: string; referenceNumber: string }[] }>(`/inspections/${encodeURIComponent(id)}`);
  return { success: result.success, inspection: result.data, error: result.error };
}
export async function updateInspection(id: string, data: Partial<InspectionInput>) {
  const result = await backendRequest<VehicleInspection>(`/inspections/${encodeURIComponent(id)}`, "PUT", data);
  return { success: result.success, inspection: result.data, error: result.error };
}
