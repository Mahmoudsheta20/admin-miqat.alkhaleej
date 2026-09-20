"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SystemUser, UserRole } from "@/lib/types";

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  nationalId?: string | null;
  assignedVehiclePlate?: string | null;
  avatarUrl?: string | null;
}

export async function loginAction(
  email: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return { success: false, error: "الحساب غير مسجل في النظام" };
    }

    if (!user.active) {
      return { success: false, error: "هذا الحساب معطل حالياً، يرجى مراجعة الإدارة" };
    }

    const sessionData: AuthSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      phone: user.phone,
      nationalId: user.nationalId,
      assignedVehiclePlate: user.assignedVehiclePlate,
      // avatarUrl removed from cookie to prevent 4KB overflow
    };

    const cookieStore = await cookies();
    cookieStore.set("miqat_session", JSON.stringify(sessionData), {
      httpOnly: false, // Accessible to client auth sync as well
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 1 day
      path: "/",
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        phone: user.phone,
        nationalId: user.nationalId,
        licenseNumber: user.licenseNumber,
        licenseExpiry: user.licenseExpiry,
        assignedVehiclePlate: user.assignedVehiclePlate,
        avatarUrl: user.avatarUrl,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  } catch (error) {
    console.error("Login action error:", error);
    return { success: false, error: "حدث خطأ أثناء تسجيل الدخول" };
  }
}

export async function quickLoginAction(
  role: UserRole,
  rememberMe: boolean = true
): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    const user = await prisma.user.findFirst({
      where: { role, active: true },
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      return { success: false, error: `لا يوجد مستخدم نشط بصلاحية ${role}` };
    }

    return loginAction(user.email, rememberMe);
  } catch (error) {
    console.error("Quick login error:", error);
    return { success: false, error: "فشل تسجيل الدخول السريع" };
  }
}

export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("miqat_session");
    return { success: true };
  } catch (error) {
    console.error("Logout action error:", error);
    return { success: false };
  }
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("miqat_session");
    if (!sessionCookie?.value) return null;
    return JSON.parse(sessionCookie.value) as AuthSession;
  } catch {
    return null;
  }
}

export async function updateUserProfileAction(
  userId: string,
  data: { name?: string; phone?: string; avatarUrl?: string }
): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      },
    });

    // Update cookie session as well
    const cookieStore = await cookies();
    const sessionData: AuthSession = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      phone: updated.phone,
      nationalId: updated.nationalId,
      assignedVehiclePlate: updated.assignedVehiclePlate,
      // avatarUrl removed from cookie to prevent 4KB overflow
    };

    cookieStore.set("miqat_session", JSON.stringify(sessionData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return {
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role as UserRole,
        phone: updated.phone,
        nationalId: updated.nationalId,
        licenseNumber: updated.licenseNumber,
        licenseExpiry: updated.licenseExpiry,
        assignedVehiclePlate: updated.assignedVehiclePlate,
        avatarUrl: updated.avatarUrl,
        active: updated.active,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  } catch (error) {
    console.error("Update user profile error:", error);
    return { success: false, error: "فشل حفظ وتحديث الملف الشخصي" };
  }
}
