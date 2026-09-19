"use client";

import React, { useState, useEffect } from "react";
import { X, User, Phone, Mail, Shield, CheckCircle2, AlertTriangle, Car, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { updateUserProfileAction } from "@/app/_actions/auth";
import ImageUpload from "./ImageUpload";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.avatarUrl || "");
      setError(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("الاسم مطلوب");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const res = await updateUserProfileAction(user.id, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.user) {
      updateUser(res.user);
      setSuccessMsg("تم تحديث وحفظ بيانات الملف الشخصي بنجاح!");
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } else {
      setError(res.error || "فشل حفظ التعديلات");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="relative w-full max-w-lg theme-card rounded-3xl shadow-2xl overflow-hidden border theme-border">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border theme-card-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                الملف الشخصي
              </h3>
              <p className="text-xs text-slate-400">
                تحديث الصورة الشخصية والبيانات الأساسية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Profile Picture Upload */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border">
            <ImageUpload
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url)}
              onRemove={() => setAvatarUrl("")}
              label="الصورة الشخصية"
              shape="circle"
              size="md"
            />
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الاسم الكامل *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم المستخدم"
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الجوال
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono text-right"
                />
              </div>
            </div>
          </div>

          {/* Read-Only System Info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border theme-border space-y-2 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                البريد الإلكتروني:
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-bold" dir="ltr">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                نوع الحساب:
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {user.role === "ADMIN" ? "المدير العام (Admin)" : "كابتن ميداني (Captain)"}
              </span>
            </div>

            {user.nationalId && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  رقم الهوية:
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {user.nationalId}
                </span>
              </div>
            )}

            {user.assignedVehiclePlate && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  المركبة المسندة:
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {user.assignedVehiclePlate}
                </span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border theme-card hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
