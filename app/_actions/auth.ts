"use server";

import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { SystemUser, UserRole } from "@/lib/types";
import { hashPassword, verifyPassword } from "@/lib/passwordUtils";
import { sendEmail } from "@/lib/services/email.service";

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  nationalId?: string | null;
  assignedVehiclePlate?: string | null;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
}

export async function loginAction(
  email: string,
  password?: string,
  rememberMe: boolean = true
): Promise<{
  success: boolean;
  mustChangePassword?: boolean;
  user?: SystemUser;
  error?: string;
}> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = (password || "").trim();

    if (!cleanEmail) {
      return { success: false, error: "يرجى إدخال البريد الإلكتروني" };
    }

    if (!cleanPass) {
      return { success: false, error: "يرجى إدخال كلمة المرور" };
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return { success: false, error: "بيانات الدخول غير صحيحة أو الحساب غير مسجل" };
    }

    if (!user.active) {
      return { success: false, error: "هذا الحساب معطل حالياً، يرجى مراجعة الإدارة" };
    }

    // Verify Password against stored hash (or fallback)
    let passwordValid = false;
    if (user.passwordHash) {
      passwordValid = verifyPassword(cleanPass, user.passwordHash);
    } else {
      // Legacy fallback if user has no passwordHash yet
      if (cleanPass === "admin123" || cleanPass === "123456") {
        passwordValid = true;
      }
    }

    if (!passwordValid) {
      return { success: false, error: "بيانات الدخول غير صحيحة، يرجى التحقق من كلمة المرور" };
    }

    const mappedUser: SystemUser = {
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
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // If user must change temporary password, don't set full session yet
    if (user.mustChangePassword) {
      return {
        success: true,
        mustChangePassword: true,
        user: mappedUser,
      };
    }

    // Normal login: set session cookie
    const sessionData: AuthSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      phone: user.phone,
      nationalId: user.nationalId,
      assignedVehiclePlate: user.assignedVehiclePlate,
      mustChangePassword: false,
    };

    const cookieStore = await cookies();
    cookieStore.set("miqat_session", JSON.stringify(sessionData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 1 day
      path: "/",
    });

    return {
      success: true,
      mustChangePassword: false,
      user: mappedUser,
    };
  } catch (error) {
    console.error("Login action error:", error);
    return { success: false, error: "حدث خطأ أثناء تسجيل الدخول" };
  }
}

/**
 * Complete mandatory password change after logging in with a temporary password
 */
export async function completePasswordChangeAction(params: {
  userId: string;
  newPassword: string;
  confirmPassword: string;
  rememberMe?: boolean;
}): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    const { userId, newPassword, confirmPassword, rememberMe = true } = params;
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف أو أرقام" };
    }

    if (cleanPass !== cleanConfirm) {
      return { success: false, error: "كلمة المرور الجديدة وتأكيدها غير متطابقين" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "المستخدم غير مسجل في النظام" };
    }

    // Hash new password and remove mandatory change flag
    const newHash = hashPassword(cleanPass);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Set authenticated session cookie
    const sessionData: AuthSession = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      phone: updated.phone,
      nationalId: updated.nationalId,
      assignedVehiclePlate: updated.assignedVehiclePlate,
      mustChangePassword: false,
    };

    const cookieStore = await cookies();
    cookieStore.set("miqat_session", JSON.stringify(sessionData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
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
        mustChangePassword: false,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  } catch (error) {
    console.error("completePasswordChangeAction error:", error);
    return { success: false, error: "تعذر حفظ كلمة المرور الجديدة" };
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
    const rawVal = sessionCookie.value;
    const decoded = rawVal.startsWith("%") ? decodeURIComponent(rawVal) : rawVal;
    return JSON.parse(decoded) as AuthSession;
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

export async function quickLoginAction(
  role: UserRole,
  rememberMe: boolean = true
): Promise<{ success: boolean; mustChangePassword?: boolean; user?: SystemUser; error?: string }> {
  try {
    const user = await prisma.user.findFirst({
      where: { role, active: true },
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      return { success: false, error: `لا يوجد مستخدم نشط بصلاحية ${role}` };
    }

    // Direct session establishment for legacy helper if invoked
    const sessionData: AuthSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      phone: user.phone,
      nationalId: user.nationalId,
      assignedVehiclePlate: user.assignedVehiclePlate,
      mustChangePassword: user.mustChangePassword,
    };

    const cookieStore = await cookies();
    cookieStore.set("miqat_session", JSON.stringify(sessionData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
      path: "/",
    });

    return {
      success: true,
      mustChangePassword: user.mustChangePassword,
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
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  } catch (error) {
    console.error("Quick login error:", error);
    return { success: false, error: "فشل تسجيل الدخول السريع" };
  }
}

/**
 * Synchronize new password to local database after successful Supabase Auth reset
 */
export async function syncPasswordAfterSupabaseResetAction(params: {
  email: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPass = params.newPassword.trim();

    if (!cleanEmail || !cleanPass || cleanPass.length < 6) {
      return { success: false, error: "بيانات كلمة المرور غير صالحة" };
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // User might be only registered in Supabase or email differs
      return { success: true };
    }

    const newHash = hashPassword(cleanPass);
    await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("syncPasswordAfterSupabaseResetAction error:", error);
    return { success: false, error: "فشل تحديث كلمة المرور في قاعدة البيانات" };
  }
}

/**
 * Change password for currently authenticated user
 */
export async function changeUserPasswordAction(params: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentSession();
    const targetUserId = session?.id || params.userId;
    if (!targetUserId) {
      return { success: false, error: "يرجى تسجيل الدخول أولاً" };
    }

    const cleanCurrent = (params.currentPassword || "").trim();
    const cleanNew = (params.newPassword || "").trim();
    const cleanConfirm = (params.confirmPassword || "").trim();

    if (!cleanCurrent) {
      return { success: false, error: "يرجى إدخال كلمة المرور الحالية" };
    }

    if (!cleanNew || cleanNew.length < 6) {
      return { success: false, error: "كلمة المرور الجديدة يجب ألا تقل عن 6 خانات" };
    }

    if (cleanNew !== cleanConfirm) {
      return { success: false, error: "كلمة المرور وتأكيدها غير متطابقين" };
    }

    if (cleanCurrent === cleanNew) {
      return { success: false, error: "كلمة المرور الجديدة يجب أن تختلف عن كلمة المرور الحالية" };
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return { success: false, error: "المستخدم غير مسجل في النظام" };
    }

    let currentValid = false;
    if (user.passwordHash) {
      currentValid = verifyPassword(cleanCurrent, user.passwordHash);
    } else {
      if (cleanCurrent === "admin123" || cleanCurrent === "123456") {
        currentValid = true;
      }
    }

    if (!currentValid) {
      return { success: false, error: "كلمة المرور الحالية غير صحيحة" };
    }

    const newHash = hashPassword(cleanNew);
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("changeUserPasswordAction error:", error);
    return { success: false, error: "تعذر تحديث كلمة المرور" };
  }
}

/**
 * Request password reset link via Gmail SMTP
 */
export async function requestPasswordResetAction(
  email: string,
  clientOrigin?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "يرجى إدخال البريد الإلكتروني" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: "صيغة البريد الإلكتروني غير صحيحة" };
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
      },
    });

    if (!user) {
      return {
        success: false,
        error: "هذا البريد الإلكتروني غير مسجل في النظام. يُرجى التحقق من صحة البريد المدخل.",
      };
    }

    if (!user.active) {
      return {
        success: false,
        error: "هذا الحساب معطل حالياً، يُرجى التواصل مع الإدارة.",
      };
    }

    // Determine accurate site URL (matches localhost:3000 in dev, or production domain)
    let siteUrl = (clientOrigin || "").trim().replace(/\/+$/, "");
    if (!siteUrl) {
      try {
        const headerList = await headers();
        const host = headerList.get("x-forwarded-host") || headerList.get("host");
        const proto =
          headerList.get("x-forwarded-proto") ||
          (host && host.includes("localhost") ? "http" : "https");
        if (host) siteUrl = `${proto}://${host}`;
      } catch {}
    }
    if (!siteUrl) {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://admin.miqatalkhaleej.com";
    }

    // Generate a secure 6-digit verification code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetCode,
        resetTokenExpiry,
      },
    });

    const resetUrl = `${siteUrl}/reset-password?token=${resetCode}&email=${encodeURIComponent(user.email)}`;

    // Dispatch official email via Gmail SMTP
    const emailResult = await sendEmail({
      to: user.email,
      subject: "إعادة تعيين كلمة المرور - نظام ميقات الخليج",
      text: `مرحباً ${user.name}،\nلقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في نظام ميقات الخليج.\nرمز التحقق الخاص بك هو: ${resetCode}\nأو يمكنك زيارة الرابط التالي مباشرة:\n${resetUrl}\nهذا الرمز صالح لمدة 60 دقيقة فقط.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin-bottom: 4px;">شركة ميقات الخليج للنقل البري</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">نظام إدارة الأسطول والرحلات</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #1e293b; font-size: 15px;">مرحباً <strong>${user.name}</strong>،</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.7;">
            لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في نظام ميقات الخليج.
          </p>

          <div style="text-align: center; margin: 25px 0;">
            <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">رمز التحقق الخاص بك (6 أرقام):</p>
            <div style="font-size: 34px; letter-spacing: 10px; font-weight: bold; color: #d97706; font-family: monospace; background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 10px; padding: 14px; display: inline-block; min-width: 220px;">
              ${resetCode}
            </div>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background: #d97706; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              إعادة تعيين كلمة المرور مباشرة
            </a>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 6px 0;">• رمز ورابط إعادة التعيين صالحان للاستخدام لمدة <strong>60 دقيقة</strong> فقط.</p>
            <p style="margin: 0;">• إذا لم تقم بطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة وسيبقى حسابك آمناً.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            نظام ميقات الخليج لإدارة الأسطول - admin.miqatalkhaleej.com
          </p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.error("[requestPasswordResetAction] sendEmail failed:", emailResult.error);
      return {
        success: false,
        error: "تعذر إرسال البريد الإلكتروني، يرجى التحقق من إعدادات خادم البريد والمحاولة مرة أخرى.",
      };
    }

    return {
      success: true,
      message: "تم إرسال رابط ورمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح. يُرجى فحص صندوق الوارد.",
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("requestPasswordResetAction CRITICAL error:", errMsg, error);
    return {
      success: false,
      error: `تعذر إرسال رابط إعادة التعيين: ${errMsg.includes("ECONNREFUSED") || errMsg.includes("ENOTFOUND") ? "تعذر الاتصال بخادم البريد" : errMsg.includes("auth") || errMsg.includes("535") ? "فشل مصادقة خادم البريد - يرجى التحقق من كلمة مرور التطبيق" : errMsg.includes("findFirst") || errMsg.includes("prisma") ? "خطأ في قاعدة البيانات" : "خطأ غير متوقع، يرجى المحاولة لاحقاً"}`,
    };
  }
}

/**
 * Verify validity of a password reset token
 */
export async function verifyResetTokenAction(params: {
  email: string;
  token: string;
}): Promise<{ success: boolean; valid: boolean; error?: string }> {
  try {
    const cleanEmail = (params.email || "").trim().toLowerCase();
    const cleanToken = (params.token || "").trim().replace(/\s+/g, "").replace(/-/g, "");

    if (!cleanEmail || !cleanToken) {
      return { success: true, valid: false, error: "بيانات الرابط أو الرمز غير مكتملة" };
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
      },
    });

    if (!user || !user.resetToken || user.resetToken.trim() !== cleanToken) {
      return { success: true, valid: false, error: "رمز التحقق أو الرابط غير صالح أو تم استخدامه مسبقاً" };
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return { success: true, valid: false, error: "انتهت صلاحية هذا الرمز (صلاحيته 60 دقيقة فقط)" };
    }

    return { success: true, valid: true };
  } catch (error) {
    console.error("verifyResetTokenAction error:", error);
    return { success: false, valid: false, error: "فشل التحقق من الرمز" };
  }
}

/**
 * Reset password using verified token
 */
export async function resetPasswordWithTokenAction(params: {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = (params.email || "").trim().toLowerCase();
    const cleanToken = (params.token || "").trim().replace(/\s+/g, "").replace(/-/g, "");
    const cleanPass = (params.newPassword || "").trim();
    const cleanConfirm = (params.confirmPassword || "").trim();

    if (!cleanEmail || !cleanToken) {
      return { success: false, error: "يرجى إدخال البريد الإلكتروني ورمز التحقق" };
    }

    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: "كلمة المرور يجب ألا تقل عن 6 خانات" };
    }

    if (cleanPass !== cleanConfirm) {
      return { success: false, error: "كلمة المرور وتأكيدها غير متطابقين" };
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
      },
    });

    if (!user || !user.resetToken || user.resetToken.trim() !== cleanToken) {
      return { success: false, error: "رمز التحقق غير صحيح أو تم استخدامه مسبقاً" };
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return { success: false, error: "انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد" };
    }

    const newHash = hashPassword(cleanPass);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
        mustChangePassword: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("resetPasswordWithTokenAction error:", error);
    return { success: false, error: "تعذر حفظ كلمة المرور الجديدة، يرجى المحاولة لاحقاً" };
  }
}

