"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText = "تأكيد",
  cancelLabel,
  cancelText = "إلغاء",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isVisible = isOpen !== undefined ? isOpen : !!open;
  if (!isVisible) return null;

  const confirmBtnLabel = confirmLabel || confirmText;
  const cancelBtnLabel = cancelLabel || cancelText;

  const variantStyles = {
    danger: {
      icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      btn: "bg-rose-600 hover:bg-rose-700 text-white",
    },
    warning: {
      icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    info: {
      icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div role="dialog" aria-modal="true" aria-label={title} className="mobile-dialog-panel relative w-full max-w-md theme-card rounded-2xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95">
        {/* Close */}
        <button
          onClick={onCancel}
          aria-label="إغلاق"
          className="absolute top-2 left-2 min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + Content */}
        <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${styles.icon}`}>
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 mt-5 sm:mt-6">
          <button
            onClick={onCancel}
            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {cancelBtnLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${styles.btn}`}
          >
            {confirmBtnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
