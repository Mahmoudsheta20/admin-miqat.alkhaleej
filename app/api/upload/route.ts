import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "storage", "avatars");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "لم يتم تحديد أي ملف للرفع" },
        { status: 400 }
      );
    }

    // Validate mime type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.",
        },
        { status: 400 }
      );
    }

    // Max size: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: "حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.",
        },
        { status: 400 }
      );
    }

    // Determine extension
    let ext = "jpg";
    if (file.type === "image/png") ext = "png";
    else if (file.type === "image/webp") ext = "webp";
    else if (file.type === "image/jpeg" || file.type === "image/jpg") ext = "jpg";

    const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // On Vercel, the filesystem is read-only. We convert the image to a Base64 Data URI
    // to store it directly in the database, avoiding the need for external storage buckets for now.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = buffer.toString("base64");
    const publicUrl = `data:${file.type};base64,${base64String}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (err) {
    const error = err as Error;
    console.error("Upload avatar error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء رفع الصورة: " + error.message },
      { status: 500 }
    );
  }
}
