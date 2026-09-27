import { backendRequest, backendFields, queryString } from "@/lib/backend";
import type { Contract, OperationType, ContractStatus } from "@/lib/types";
import type { InspectionInput } from "./inspection";

export interface PassengerInput { name: string; nationality: string; idNumber: string }
export type InspectionPayload = Partial<Omit<InspectionInput, "inspectionDate" | "notes">> & { inspectionDate?: string; notes?: string | null };
export interface ContractFormPayload {
  operationType: OperationType; origin: string; destination: string; tripDate: string; tripTime: string;
  flightCarrier?: string; flightNumber?: string; customerName: string; customerPhone?: string;
  notes?: string; issueDate?: string; captainId: string; vehiclePlate: string; inspectionId?: string;
  passengers: PassengerInput[]; inspectionData?: InspectionPayload;
}
export async function submitContract(data: ContractFormPayload) {
  const result = await backendRequest<Contract>("/contracts", "POST", data);
  return { success: result.success, contract: result.data, error: result.error };
}
export async function updateContract(id: string, data: ContractFormPayload) {
  const result = await backendRequest<Contract>(`/contracts/${encodeURIComponent(id)}`, "PUT", data);
  return { success: result.success, contract: result.data, error: result.error };
}
export function deleteContract(id: string) { return backendRequest(`/contracts/${encodeURIComponent(id)}`, "DELETE"); }
export async function getContracts(filters?: { captainId?: string; operationType?: OperationType; search?: string }) {
  const result = await backendRequest<Contract[]>(`/contracts${queryString(filters)}`);
  return { success: result.success, contracts: result.data, error: result.error };
}
export async function getContractById(id: string) {
  const result = await backendRequest<Contract>(`/contracts/${encodeURIComponent(id)}`);
  return { success: result.success, contract: result.data, error: result.error };
}
export function syncAllContractsToStorageAction() {
  return backendFields<{ total: number; saved: number; errors: string[] }>("/contracts/sync-storage", "POST");
}
export async function updateContractStatusAction(params: { contractId: string; status: ContractStatus; reviewNotes?: string }) {
  const result = await backendRequest<Contract>(`/contracts/${encodeURIComponent(params.contractId)}/status`, "PATCH", params);
  return { success: result.success, contract: result.data, error: result.error };
}
