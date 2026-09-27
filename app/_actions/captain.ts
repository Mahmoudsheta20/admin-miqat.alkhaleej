"use server";

import { prisma, withPrismaRetry } from "@/lib/prisma";
import { SystemUser } from "@/lib/types";
import { hashPassword, generateTemporaryPassword } from "@/lib/passwordUtils";

export interface CaptainFormData {
  name: string;
  email: string;
  phone?: string;
  nationalId?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  assignedVehiclePlate?: string;
  avatarUrl?: string;
}

export async function getCaptains(): Promise<{
  success: boolean;
  captains?: (SystemUser & {
    contractCount: number;
    hasTodayInspection: boolean;
  })[];
  error?: string;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await withPrismaRetry(async () => {
      return prisma.user.findMany({
        where: { role: "CAPTAIN" },
        include: {
          _count: {
            select: { contracts: true },
          },
          inspections: {
            where: {
              createdAt: { gte: today },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    const captains = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as "CAPTAIN",
      phone: u.phone,
      nationalId: u.nationalId,
      licenseNumber: u.licenseNumber,
      licenseExpiry: u.licenseExpiry,
      assignedVehiclePlate: u.assignedVehiclePlate,
      avatarUrl: u.avatarUrl,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      contractCount: u._count.contracts,
      hasTodayInspection: u.inspections.length > 0,
    }));

    return { success: true, captains };
  } catch (error) {
    console.error("Get captains error:", error);
    return { success: false, error: "تعذر جلب بيانات الكباتن" };
  }
}

export async function createCaptain(
  data: CaptainFormData
): Promise<{
  success: boolean;
  captain?: SystemUser;
  temporaryPassword?: string;
  error?: string;
}> {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.trim().toLowerCase() },
          ...(data.nationalId ? [{ nationalId: data.nationalId }] : []),
        ],
      },
    });

    if (existing) {
      return {
        success: false,
        error: "البريد الإلكتروني أو رقم الهوية الوطنية مسجل مسبقاً",
      };
    }

    const tempPassword = generateTemporaryPassword("MQ");

    const created = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        passwordHash: hashPassword(tempPassword),
        mustChangePassword: true,
        role: "CAPTAIN",
        phone: data.phone?.trim() || null,
        nationalId: data.nationalId?.trim() || null,
        licenseNumber: data.licenseNumber?.trim() || null,
        licenseExpiry: data.licenseExpiry?.trim() || null,
        assignedVehiclePlate: data.assignedVehiclePlate?.trim() || null,
        avatarUrl: data.avatarUrl?.trim() || null,
        active: true,
      },
    });

    return {
      success: true,
      captain: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role as "CAPTAIN",
        phone: created.phone,
        nationalId: created.nationalId,
        licenseNumber: created.licenseNumber,
        licenseExpiry: created.licenseExpiry,
        assignedVehiclePlate: created.assignedVehiclePlate,
        avatarUrl: created.avatarUrl,
        active: created.active,
        mustChangePassword: true,
      },
      temporaryPassword: tempPassword,
    };
  } catch (error) {
    console.error("Create captain error:", error);
    return { success: false, error: "فشل إضافة الكابتن الجديد" };
  }
}

export async function resetCaptainTemporaryPassword(
  captainId: string
): Promise<{
  success: boolean;
  temporaryPassword?: string;
  captainName?: string;
  error?: string;
}> {
  try {
    const captain = await prisma.user.findUnique({
      where: { id: captainId },
    });

    if (!captain) {
      return { success: false, error: "الكابتن غير مسجل في النظام" };
    }

    const tempPassword = generateTemporaryPassword("MQ");

    await prisma.user.update({
      where: { id: captainId },
      data: {
        passwordHash: hashPassword(tempPassword),
        mustChangePassword: true,
      },
    });

    return {
      success: true,
      temporaryPassword: tempPassword,
      captainName: captain.name,
    };
  } catch (error) {
    console.error("Reset captain temporary password error:", error);
    return { success: false, error: "تعذر توليد كلمة مرور مؤقتة للكابتن" };
  }
}

export async function updateCaptain(
  id: string,
  data: Partial<CaptainFormData> & { active?: boolean }
): Promise<{ success: boolean; captain?: SystemUser; error?: string }> {
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.nationalId !== undefined ? { nationalId: data.nationalId?.trim() || null } : {}),
        ...(data.licenseNumber !== undefined ? { licenseNumber: data.licenseNumber?.trim() || null } : {}),
        ...(data.licenseExpiry !== undefined ? { licenseExpiry: data.licenseExpiry?.trim() || null } : {}),
        ...(data.assignedVehiclePlate !== undefined ? { assignedVehiclePlate: data.assignedVehiclePlate?.trim() || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl?.trim() || null } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    return {
      success: true,
      captain: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role as "CAPTAIN",
        phone: updated.phone,
        nationalId: updated.nationalId,
        licenseNumber: updated.licenseNumber,
        licenseExpiry: updated.licenseExpiry,
        assignedVehiclePlate: updated.assignedVehiclePlate,
        avatarUrl: updated.avatarUrl,
        active: updated.active,
      },
    };
  } catch (error) {
    console.error("Update captain error:", error);
    return { success: false, error: "فشل تحديث بيانات الكابتن" };
  }
}

export async function deleteCaptain(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Soft delete by deactivating or hard delete if no contracts
    const contractsCount = await prisma.contract.count({ where: { captainId: id } });
    if (contractsCount > 0) {
      await prisma.user.update({ where: { id }, data: { active: false } });
    } else {
      await prisma.user.delete({ where: { id } });
    }
    return { success: true };
  } catch (error) {
    console.error("Delete captain error:", error);
    return { success: false, error: "فشل حذف الكابتن" };
  }
}
