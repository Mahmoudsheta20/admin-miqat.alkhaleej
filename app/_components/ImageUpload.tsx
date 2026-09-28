"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { backendRequest } from "@/lib/backend";
import { Upload, X, Camera, Loader2, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  shape?: "circle" | "rounded";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  label = "صورة الملف الشخصي",
  shape = "rounded",
  size = "md",
  className = "",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }[size];

  const shapeClasses = shape === "circle" ? "rounded-full" : "rounded-2xl";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isUploading) return;

    // Reset errors
    setError(null);

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)");
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const data = await backendRequest<{ url: string }>("/upload", "POST", formData);
      if (data.success && data.data?.url) {
        onChange(data.data.url);
      } else {
        setError(data.error || "فشل رفع الصورة");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("حدث خطأ في الاتصال أثناء رفع الصورة");
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be re-selected if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    } else {
      onChange("");
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Preview / Upload Box */}
        <button
          type="button"
          disabled={isUploading}
          aria-label={`تغيير ${label}`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative group cursor-pointer overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500/80 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center transition shadow-xs ${sizeClasses} ${shapeClasses}`}
          title="اضغط لاختيار صورة جديدة"
        >
          {value ? (
            <>
              <Image
                src={value}
                alt="الصورة"
                fill
                className={`object-cover ${shapeClasses}`}
                unoptimized
              />
              {/* Hover overlay */}
              <div
                className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white ${shapeClasses}`}
              >
                <Camera className="w-5 h-5" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-amber-500 transition p-2 text-center">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              ) : (
                <>
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">رفع صورة</span>
                </>
              )}
            </div>
          )}

          {isUploading && (
            <div
              className={`absolute inset-0 bg-black/60 flex items-center justify-center text-white ${shapeClasses}`}
            >
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          )}
        </button>

        {/* Buttons & Info */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              {value ? "تغيير الصورة" : "اختيار صورة"}
            </button>

            {value && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemove}
                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                title="حذف الصورة"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            الصيغ المدعومة: JPG, PNG, WEBP (حتى 5 ميجابايت)
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
      />

      {error && (
        <div className="text-xs text-rose-500 flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
