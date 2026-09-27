"use server";

import { prisma, withPrismaRetry } from "@/lib/prisma";
import { Vehicle, VehicleStatus } from "@/lib/types";

export interface VehicleFormData {
  plateNumberAr: string;
  plateNumberEn: string;
  make: string;
  model: string;
  year: number;
  category?: string;
  capacity?: number;
  status?: VehicleStatus;
  registrationExpiry: string;
  insuranceExpiry: string;
  currentMileage?: number;
}

export async function getVehicles(): Promise<{
  success: boolean;
  vehicles?: Vehicle[];
  error?: string;
}> {
  try {
    const records = await withPrismaRetry(async () => {
      return prisma.vehicle.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    const vehicles: Vehicle[] = records.map((v) => ({
      id: v.id,
      plateNumberAr: v.plateNumberAr,
      plateNumberEn: v.plateNumberEn,
      make: v.make,
      model: v.model,
      year: v.year,
      category: v.category,
      capacity: v.capacity,
      status: v.status as VehicleStatus,
      registrationExpiry: v.registrationExpiry,
      insuranceExpiry: v.insuranceExpiry,
      currentMileage: v.currentMileage,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return { success: true, vehicles };
  } catch (error) {
    console.error("Get vehicles error:", error);
    return { success: false, error: "تعذر جلب بيانات الأسطول" };
  }
}

export async function createVehicle(
  data: VehicleFormData
): Promise<{ success: boolean; vehicle?: Vehicle; error?: string }> {
  try {
    const existing = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { plateNumberAr: data.plateNumberAr.trim() },
          { plateNumberEn: data.plateNumberEn.trim().toUpperCase() },
        ],
      },
    });

    if (existing) {
      return { success: false, error: "رقم اللوحة مسجل بالفعل لمركبة أخرى" };
    }

    const created = await prisma.vehicle.create({
      data: {
        plateNumberAr: data.plateNumberAr.trim(),
        plateNumberEn: data.plateNumberEn.trim().toUpperCase(),
        make: data.make.trim(),
        model: data.model.trim(),
        year: Number(data.year),
        category: data.category?.trim() || "VIP_VAN",
        capacity: Number(data.capacity) || 7,
        status: data.status || "AVAILABLE",
        registrationExpiry: data.registrationExpiry.trim(),
        insuranceExpiry: data.insuranceExpiry.trim(),
        currentMileage: data.currentMileage ? Number(data.currentMileage) : 0,
      },
    });

    return {
      success: true,
      vehicle: {
        id: created.id,
        plateNumberAr: created.plateNumberAr,
        plateNumberEn: created.plateNumberEn,
        make: created.make,
        model: created.model,
        year: created.year,
        category: created.category,
        capacity: created.capacity,
        status: created.status as VehicleStatus,
        registrationExpiry: created.registrationExpiry,
        insuranceExpiry: created.insuranceExpiry,
        currentMileage: created.currentMileage,
      },
    };
  } catch (error) {
    console.error("Create vehicle error:", error);
    return { success: false, error: "فشل إضافة المركبة الجديدة" };
  }
}

export async function updateVehicle(
  id: string,
  data: Partial<VehicleFormData>
): Promise<{ success: boolean; vehicle?: Vehicle; error?: string }> {
  try {
    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(data.plateNumberAr ? { plateNumberAr: data.plateNumberAr.trim() } : {}),
        ...(data.plateNumberEn ? { plateNumberEn: data.plateNumberEn.trim().toUpperCase() } : {}),
        ...(data.make ? { make: data.make.trim() } : {}),
        ...(data.model ? { model: data.model.trim() } : {}),
        ...(data.year ? { year: Number(data.year) } : {}),
        ...(data.category ? { category: data.category.trim() } : {}),
        ...(data.capacity ? { capacity: Number(data.capacity) } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.registrationExpiry ? { registrationExpiry: data.registrationExpiry.trim() } : {}),
        ...(data.insuranceExpiry ? { insuranceExpiry: data.insuranceExpiry.trim() } : {}),
        ...(data.currentMileage !== undefined ? { currentMileage: Number(data.currentMileage) } : {}),
      },
    });

    return {
      success: true,
      vehicle: {
        id: updated.id,
        plateNumberAr: updated.plateNumberAr,
        plateNumberEn: updated.plateNumberEn,
        make: updated.make,
        model: updated.model,
        year: updated.year,
        category: updated.category,
        capacity: updated.capacity,
        status: updated.status as VehicleStatus,
        registrationExpiry: updated.registrationExpiry,
        insuranceExpiry: updated.insuranceExpiry,
        currentMileage: updated.currentMileage,
      },
    };
  } catch (error) {
    console.error("Update vehicle error:", error);
    return { success: false, error: "فشل تحديث بيانات المركبة" };
  }
}

export async function deleteVehicle(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.vehicle.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return { success: false, error: "فشل حذف المركبة" };
  }
}
