import { backendRequest } from "@/lib/backend";
export interface DashboardStats {
  totalCaptains: number; totalVehicles: number; activeVehicles: number;
  totalContracts: number; todayInspections: number;
  recentContracts: {
    id: string; referenceNumber: string; customerName: string; captainName: string;
    vehiclePlate: string; operationType: string; tripDate: string; tripTime: string; passengersCount: number;
  }[];
}
export async function getDashboardStats() {
  const result = await backendRequest<DashboardStats>("/dashboard/stats");
  return { success: result.success, stats: result.data, error: result.error };
}
