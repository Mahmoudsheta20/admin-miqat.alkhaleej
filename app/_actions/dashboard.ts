"use server";

import { prisma, withPrismaRetry } from "@/lib/prisma";

export interface DashboardStats {
  totalCaptains: number;
  totalVehicles: number;
  activeVehicles: number;
  totalContracts: number;
  todayInspections: number;
  recentContracts: {
    id: string;
    referenceNumber: string;
    customerName: string;
    captainName: string;
    vehiclePlate: string;
    operationType: string;
    tripDate: string;
    tripTime: string;
    passengersCount: number;
  }[];
}

export async function getDashboardStats(): Promise<{
  success: boolean;
  stats?: DashboardStats;
  error?: string;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCaptains,
      totalVehicles,
      activeVehicles,
      totalContracts,
      todayInspections,
      recentContractsRecords,
    ] = await withPrismaRetry(async () => {
      return Promise.all([
        prisma.user.count({ where: { role: "CAPTAIN", active: true } }),
        prisma.vehicle.count(),
        prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
        prisma.contract.count(),
        prisma.vehicleInspection.count({ where: { createdAt: { gte: today } } }),
        prisma.contract.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            captain: { select: { name: true } },
            _count: { select: { passengers: true } },
          },
        }),
      ]);
    });

    const recentContracts = recentContractsRecords.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      customerName: c.customerName,
      captainName: c.captain?.name || "غير محدد",
      vehiclePlate: c.vehiclePlate,
      operationType: c.operationType,
      tripDate: c.tripDate,
      tripTime: c.tripTime,
      passengersCount: c._count.passengers,
    }));

    return {
      success: true,
      stats: {
        totalCaptains,
        totalVehicles,
        activeVehicles,
        totalContracts,
        todayInspections,
        recentContracts,
      },
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return { success: false, error: "تعذر جلب إحصائيات لوحة التحكم" };
  }
}
