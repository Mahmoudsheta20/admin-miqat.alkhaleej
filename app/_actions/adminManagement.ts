"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/app/_actions/auth";
import { hashPassword, generateTemporaryPassword } from "@/lib/passwordUtils";
import { sendEmail } from "@/lib/services/email.service";
import {
  SUPER_ADMIN_EMAIL,
  isSuperAdmin,
  AdminUserItem,
  CreateAdminPayload,
} from "@/lib/adminConstants";

/**
 * Get all administrators in the system.
 */
export async function getAdminsListAction(): Promise<{
  success: boolean;
  admins?: AdminUserItem[];
  isCallerSuperAdmin?: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "غير مصرح لك بالوصول إلى قائمة المسؤولين" };
    }

    const callerIsSuper = isSuperAdmin(session.email);

    const users = await prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });

    const admins: AdminUserItem[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: "ADMIN",
      phone: u.phone,
      nationalId: u.nationalId,
      licenseNumber: u.licenseNumber,
      licenseExpiry: u.licenseExpiry,
      assignedVehiclePlate: u.assignedVehiclePlate,
      avatarUrl: u.avatarUrl,
      active: u.active,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      isSuperAdmin: isSuperAdmin(u.email),
    }));

    return {
      success: true,
      admins,
      isCallerSuperAdmin: callerIsSuper,
    };
  } catch (error) {
    console.error("getAdminsListAction error:", error);
    return { success: false, error: "تعذر جلب قائمة المسؤولين" };
  }
}

/**
 * Special Super Admin privilege: Create a new Administrator.
 * Only miqatalkhaleej@gmail.com can call this action.
 */
export async function createAdminUserAction(
  data: CreateAdminPayload
): Promise<{
  success: boolean;
  admin?: AdminUserItem;
  temporaryPassword?: string;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session || !isSuperAdmin(session.email)) {
      return {
        success: false,
        error: "خاصية إضافة مسؤولين محصورة بالمدير العام الأساسي (miqatalkhaleej@gmail.com)",
      };
    }

    const cleanName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone ? data.phone.trim() : null;

    if (!cleanName) return { success: false, error: "اسم المسؤول مطلوب" };
    if (!cleanEmail) return { success: false, error: "البريد الإلكتروني للمسؤول مطلوب" };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: "صيغة البريد الإلكتروني غير صحيحة" };
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return { success: false, error: "هذا البريد الإلكتروني مسجل مسبقاً في النظام" };
    }

    const tempPassword = generateTemporaryPassword("ADM");
    const passwordHash = hashPassword(tempPassword);

    const created = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: "ADMIN",
        passwordHash,
        mustChangePassword: true,
        active: true,
      },
    });

    // Send welcome onboarding email via Gmail SMTP
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://admin.miqatalkhaleej.com";
    sendEmail({
      to: cleanEmail,
      subject: "تم إنشاء حساب مسؤول جديد في نظام ميقات الخليج",
      text: `مرحباً ${cleanName}،\nتم إنشاء حساب مسؤول إداري لك في نظام ميقات الخليج.\nبيانات الدخول:\nالبريد: ${cleanEmail}\nكلمة المرور المؤقتة: ${tempPassword}\nرابط الدخول: ${siteUrl}/login`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0f172a;">شركة ميقات الخليج للنقل البري</h2>
          <p style="color: #334155; font-size: 15px;">مرحباً <strong>${cleanName}</strong>،</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.7;">
            تم منحك صلاحية مسؤول إداري في نظام ميقات الخليج لإدارة الأسطول والعقود من قبل الإدارة العامة.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>البريد الإلكتروني:</strong> <span style="font-family: monospace;">${cleanEmail}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>كلمة المرور المؤقتة:</strong> <span style="font-family: monospace; font-weight: bold; color: #d97706;">${tempPassword}</span></p>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            يُرجى تسجيل الدخول عبر الرابط أدناه وتعيين كلمة مرور شخصية خاصة بك عند الولوج الأول:
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/login" style="background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              تسجيل الدخول للنظام
            </a>
          </div>
        </div>
      `,
    }).catch((err) => {
      console.warn("Could not dispatch welcome email to new admin:", err);
    });

    return {
      success: true,
      admin: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: "ADMIN",
        phone: created.phone,
        active: created.active,
        mustChangePassword: created.mustChangePassword,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        isSuperAdmin: false,
      },
      temporaryPassword: tempPassword,
    };
  } catch (error) {
    console.error("createAdminUserAction error:", error);
    return { success: false, error: "تعذر إنشاء حساب المسؤول" };
  }
}

/**
 * Toggle Active status for an administrator.
 * Only miqatalkhaleej@gmail.com can do this, and cannot deactivate itself.
 */
export async function toggleAdminStatusAction(
  adminId: string
): Promise<{ success: boolean; active?: boolean; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session || !isSuperAdmin(session.email)) {
      return {
        success: false,
        error: "فقط المدير العام الأساسي مخول بتعديل حالة المسؤولين",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!target) return { success: false, error: "المسؤول غير موجود" };

    if (isSuperAdmin(target.email)) {
      return { success: false, error: "لا يمكن تعطيل حساب المدير العام الأساسي" };
    }

    const updated = await prisma.user.update({
      where: { id: adminId },
      data: { active: !target.active },
    });

    return { success: true, active: updated.active };
  } catch (error) {
    console.error("toggleAdminStatusAction error:", error);
    return { success: false, error: "فشل تعديل حالة المسؤول" };
  }
}

/**
 * Delete an administrator account.
 * Only miqatalkhaleej@gmail.com can do this, and cannot delete itself.
 */
export async function deleteAdminUserAction(
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session || !isSuperAdmin(session.email)) {
      return {
        success: false,
        error: "فقط المدير العام الأساسي مخول بحذف المسؤولين",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!target) return { success: false, error: "المسؤول غير موجود" };

    if (isSuperAdmin(target.email)) {
      return { success: false, error: "لا يمكن حذف حساب المدير العام الأساسي" };
    }

    await prisma.user.delete({
      where: { id: adminId },
    });

    return { success: true };
  } catch (error) {
    console.error("deleteAdminUserAction error:", error);
    return { success: false, error: "فشل حذف حساب المسؤول" };
  }
}

/**
 * Reset an administrator's temporary password.
 * Only miqatalkhaleej@gmail.com can do this.
 */
export async function resetAdminTemporaryPasswordAction(
  adminId: string
): Promise<{
  success: boolean;
  temporaryPassword?: string;
  adminName?: string;
  email?: string;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session || !isSuperAdmin(session.email)) {
      return {
        success: false,
        error: "فقط المدير العام الأساسي مخول بإعادة تعيين كلمات المرور للمسؤولين",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!target) return { success: false, error: "المسؤول غير موجود" };

    if (isSuperAdmin(target.email)) {
      return {
        success: false,
        error: "لا يمكن إعادة تعيين كلمة المرور للمدير العام الأساسي بهذه الطريقة",
      };
    }

    const tempPassword = generateTemporaryPassword("ADM");
    const passwordHash = hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: adminId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://admin.miqatalkhaleej.com";

    // Send email notification with new temporary credentials
    sendEmail({
      to: target.email,
      subject: "تم إعادة تعيين كلمة المرور المؤقتة لحسابك في نظام ميقات الخليج",
      text: `مرحباً ${target.name}،\nتم إصدار كلمة مرور مؤقتة جديدة لحسابك المسؤول في نظام ميقات الخليج.\nكلمة المرور المؤقتة: ${tempPassword}\nرابط الدخول: ${siteUrl}/login`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0f172a;">شركة ميقات الخليج للنقل البري</h2>
          <p style="color: #334155; font-size: 15px;">مرحباً <strong>${target.name}</strong>،</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.7;">
            تمت إعادة تعيين كلمة المرور المؤقتة الخاصة بحسابك الإداري في نظام ميقات الخليج من قبل الإدارة العامة.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>البريد الإلكتروني:</strong> <span style="font-family: monospace;">${target.email}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>كلمة المرور المؤقتة الجديدة:</strong> <span style="font-family: monospace; font-weight: bold; color: #d97706;">${tempPassword}</span></p>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            يُرجى تسجيل الدخول عبر الرابط أدناه وتعيين كلمة مرور شخصية خاصة بك عند الولوج:
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/login" style="background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              تسجيل الدخول للنظام
            </a>
          </div>
        </div>
      `,
    }).catch((err) => {
      console.warn("Could not dispatch temp password reset email:", err);
    });

    return {
      success: true,
      temporaryPassword: tempPassword,
      adminName: target.name,
      email: target.email,
    };
  } catch (error) {
    console.error("resetAdminTemporaryPasswordAction error:", error);
    return { success: false, error: "فشل إعادة تعيين كلمة المرور المؤقتة" };
  }
}
