import { backendRequest } from "@/lib/backend";
import type { Vehicle, VehicleStatus } from "@/lib/types";

export interface VehicleFormData {
  plateNumberAr: string; plateNumberEn: string; make: string; model: string; year: number;
  category?: string; capacity?: number; status?: VehicleStatus; registrationExpiry: string;
  insuranceExpiry: string; currentMileage?: number;
}
export async function getVehicles() {
  const result = await backendRequest<Vehicle[]>("/fleet");
  return { success: result.success, vehicles: result.data, error: result.error };
}
export async function createVehicle(data: VehicleFormData) {
  const result = await backendRequest<Vehicle>("/fleet", "POST", data);
  return { success: result.success, vehicle: result.data, error: result.error };
}
export async function updateVehicle(id: string, data: Partial<VehicleFormData>) {
  const result = await backendRequest<Vehicle>(`/fleet/${encodeURIComponent(id)}`, "PUT", data);
  return { success: result.success, vehicle: result.data, error: result.error };
}
export function deleteVehicle(id: string) { return backendRequest(`/fleet/${encodeURIComponent(id)}`, "DELETE"); }
