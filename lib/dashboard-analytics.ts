import type { Contract, OperationType, Vehicle, VehicleStatus } from "./types";
import type { DashboardStats } from "@/app/_actions/dashboard";
import type { FinancialReport } from "./accounting";
import { formatSignedMinor, signedMoneyMinor } from "./money";

export { formatSignedMinor, signedMoneyMinor };

export interface DailyContractPoint {
  date: string;
  label: string;
  contracts: number;
  passengers: number;
}

export interface OperationBreakdownItem {
  type: OperationType;
  count: number;
  percentage: number;
}

export interface VehicleExpiryAlert {
  vehicleId: string;
  plateNumberAr: string;
  plateNumberEn: string;
  document: "registration" | "insurance";
  expiryDate: string;
  daysRemaining: number;
}

export interface FleetAnalytics {
  total: number;
  available: number;
  onTrip: number;
  maintenance: number;
  totalSeats: number;
  alerts: VehicleExpiryAlert[];
  byStatus: Record<VehicleStatus, number>;
}

export interface ProfitBreakdown {
  revenueMinor: bigint;
  expensesMinor: bigint;
  taxMinor: bigint;
  beforeTaxMinor: bigint;
  afterTaxMinor: bigint;
  marginPercent: number;
}

/** Normalize YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, or ISO timestamps to YYYY-MM-DD. */
export function normalizeIsoDay(value?: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(5, 7)}-${raw.slice(8, 10)}`;
  }
  const dmyMatch = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Signed day difference (`targetIso - baseIso`), using UTC midnight calendar days. */
export function diffCalendarDays(targetIso: string, baseIso: string): number | null {
  const target = normalizeIsoDay(targetIso);
  const base = normalizeIsoDay(baseIso);
  if (!target || !base) return null;
  const targetMs = Date.parse(`${target}T00:00:00Z`);
  const baseMs = Date.parse(`${base}T00:00:00Z`);
  if (!Number.isFinite(targetMs) || !Number.isFinite(baseMs)) return null;
  return Math.round((targetMs - baseMs) / 86_400_000);
}

/** Shift a YYYY-MM-DD date string by `offsetDays` cleanly in UTC calendar days. */
export function shiftIsoDay(baseIso: string, offsetDays: number): string {
  const normalized = normalizeIsoDay(baseIso);
  const baseMs = normalized ? Date.parse(`${normalized}T00:00:00Z`) : Date.now();
  const shifted = new Date(baseMs + offsetDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

/** Merge full `/contracts` list or fallback `recentContracts` into a passenger-count aware array. */
export function contractPassengerCount(
  contract: Pick<Contract, "passengers"> & { passengersCount?: number }
): number {
  if (typeof contract.passengersCount === "number" && Number.isFinite(contract.passengersCount)) {
    return contract.passengersCount;
  }
  if (Array.isArray(contract.passengers)) {
    return contract.passengers.length;
  }
  return 0;
}

export function buildContractTrend(
  contracts: ReadonlyArray<
    Pick<Contract, "tripDate" | "createdAt" | "passengers"> & { passengersCount?: number }
  >,
  todayIso: string,
  days = 7,
  locale = "en"
): DailyContractPoint[] {
  const map = new Map<string, { contracts: number; passengers: number }>();
  for (let i = -(days - 1); i <= 0; i++) {
    map.set(shiftIsoDay(todayIso, i), { contracts: 0, passengers: 0 });
  }
  for (const contract of contracts) {
    const day = normalizeIsoDay(contract.tripDate) ?? normalizeIsoDay(contract.createdAt);
    if (!day) continue;
    const bucket = map.get(day);
    if (!bucket) continue;
    bucket.contracts += 1;
    bucket.passengers += contractPassengerCount(contract);
  }
  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    calendar: "gregory",
  });
  return Array.from(map.entries()).map(([date, stats]) => {
    const dt = new Date(`${date}T00:00:00Z`);
    return {
      date,
      label: Number.isNaN(dt.getTime()) ? date.slice(5) : formatter.format(dt),
      contracts: stats.contracts,
      passengers: stats.passengers,
    };
  });
}

const OPERATION_TYPES: readonly OperationType[] = [
  "AIRPORT_TRANSFER",
  "CITY_TOUR",
  "INTERCITY",
  "HAJJ_UMRAH",
];

export function buildOperationBreakdown(
  contracts: ReadonlyArray<{ operationType: string }>
): OperationBreakdownItem[] {
  const counts = new Map<OperationType, number>(OPERATION_TYPES.map((t) => [t, 0]));
  for (const contract of contracts) {
    const op = contract.operationType as OperationType;
    if (counts.has(op)) {
      counts.set(op, (counts.get(op) ?? 0) + 1);
    }
  }
  const recognizedTotal = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  if (recognizedTotal === 0) {
    return OPERATION_TYPES.map((type) => ({ type, count: 0, percentage: 0 }));
  }

  // Largest-remainder rounding keeps percentage pills summing cleanly to 100%.
  const exactRows = OPERATION_TYPES.map((type, index) => {
    const count = counts.get(type) ?? 0;
    const raw = (count / recognizedTotal) * 100;
    const floored = Math.floor(raw);
    return { index, type, count, floored, remainder: raw - floored };
  });
  const remaining = 100 - exactRows.reduce((sum, row) => sum + row.floored, 0);
  const byRemainder = [...exactRows].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining && i < byRemainder.length; i++) {
    byRemainder[i].floored += 1;
  }
  return exactRows.map((row) => ({ type: row.type, count: row.count, percentage: row.floored }));
}

export function buildFleetAnalytics(
  vehicles: ReadonlyArray<Vehicle>,
  todayIso: string,
  warningWindowDays = 30
): FleetAnalytics {
  const byStatus: Record<VehicleStatus, number> = {
    AVAILABLE: 0,
    ON_TRIP: 0,
    MAINTENANCE: 0,
  };
  let totalSeats = 0;
  const alerts: VehicleExpiryAlert[] = [];

  for (const v of vehicles) {
    if (v.status === "AVAILABLE" || v.status === "ON_TRIP" || v.status === "MAINTENANCE") {
      byStatus[v.status] += 1;
    }
    if (typeof v.capacity === "number" && Number.isFinite(v.capacity)) {
      totalSeats += v.capacity;
    }

    const regDays = diffCalendarDays(v.registrationExpiry, todayIso);
    if (regDays !== null && regDays <= warningWindowDays) {
      alerts.push({
        vehicleId: v.id,
        plateNumberAr: v.plateNumberAr,
        plateNumberEn: v.plateNumberEn,
        document: "registration",
        expiryDate: normalizeIsoDay(v.registrationExpiry) ?? v.registrationExpiry,
        daysRemaining: regDays,
      });
    }

    const insDays = diffCalendarDays(v.insuranceExpiry, todayIso);
    if (insDays !== null && insDays <= warningWindowDays) {
      alerts.push({
        vehicleId: v.id,
        plateNumberAr: v.plateNumberAr,
        plateNumberEn: v.plateNumberEn,
        document: "insurance",
        expiryDate: normalizeIsoDay(v.insuranceExpiry) ?? v.insuranceExpiry,
        daysRemaining: insDays,
      });
    }
  }

  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    total: vehicles.length,
    available: byStatus.AVAILABLE,
    onTrip: byStatus.ON_TRIP,
    maintenance: byStatus.MAINTENANCE,
    totalSeats,
    alerts,
    byStatus,
  };
}

export function summarizeProfit(profit: FinancialReport["profit"]): ProfitBreakdown {
  const revenueMinor = signedMoneyMinor(profit.revenue);
  const expensesMinor = signedMoneyMinor(profit.expenses);
  const taxMinor = signedMoneyMinor(profit.taxExpense);
  const beforeTaxMinor = signedMoneyMinor(profit.beforeTax);
  const afterTaxMinor = signedMoneyMinor(profit.afterTax);

  let marginPercent = 0;
  if (revenueMinor > BigInt(0)) {
    const scaled = Number((afterTaxMinor * BigInt(1000)) / revenueMinor) / 10;
    marginPercent = Number.isFinite(scaled) ? scaled : 0;
  }

  return {
    revenueMinor,
    expensesMinor,
    taxMinor,
    beforeTaxMinor,
    afterTaxMinor,
    marginPercent,
  };
}

export type DashboardContractItem = DashboardStats["recentContracts"][number] & {
  origin?: string;
  destination?: string;
  customerPhone?: string | null;
  status?: Contract["status"];
};

export function toDashboardContracts(
  fullContracts: ReadonlyArray<Contract> | null | undefined,
  recentContracts: ReadonlyArray<DashboardStats["recentContracts"][number]> | undefined
): DashboardContractItem[] {
  if (fullContracts && fullContracts.length > 0) {
    return fullContracts.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      captainName: c.captain?.name || "—",
      vehiclePlate: c.vehiclePlate,
      operationType: c.operationType,
      tripDate: c.tripDate,
      tripTime: c.tripTime,
      passengersCount: contractPassengerCount(c),
      origin: c.origin,
      destination: c.destination,
      status: c.status,
      pdfPath: c.pdfPath,
    }));
  }
  return (recentContracts ?? []).map((c) => ({ ...c }));
}

