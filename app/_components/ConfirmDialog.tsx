"use client";
import { useUiText } from "@/lib/ui-text";


import { useRef, useState } from "react";
import Modal from "./Modal";
import { AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";

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
  confirmText,
  cancelLabel,
  cancelText,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ui = useUiText();

  const { t, isRTL } = useLanguage();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const isVisible = isOpen !== undefined ? isOpen : !!open;
  if (!isVisible) return null;

  const confirmBtnLabel = confirmLabel || confirmText || t("common.confirm");
  const cancelBtnLabel = cancelLabel || cancelText || t("common.cancel");

  const variantStyles = {
    danger: {
      icon: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
      btn: "bg-rose-700 hover:bg-rose-800 text-white",
    },
    warning: {
      icon: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      btn: "bg-amber-700 hover:bg-amber-800 text-white",
    },
    info: {
      icon: "bg-emerald-500/12 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300",
      btn: "bg-emerald-800 hover:bg-emerald-700 text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal label={ui(title)} onClose={onCancel} isBusy={isBusy}>
      {/* Dialog */}
      <div className="mobile-dialog-panel relative w-full max-w-md theme-card rounded-2xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95">
        {/* Close */}
        <button
          type="button" disabled={isBusy} onClick={onCancel}
          aria-label={ui(t("common.close"))}
          className="absolute top-2 end-2 min-w-11 min-h-11 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Icon + Content */}
        <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${styles.icon}`}>
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text-main)]">{ui(title)}</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{ui(message)}</p>
        </div>

        {error && <p role="alert" className="mt-3 text-center text-sm text-rose-700 dark:text-rose-300">{ui(error)}</p>}
        {/* Buttons (DOM order matches visual order: Cancel safe action first, Confirm second) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2.5 sm:gap-3 mt-5 sm:mt-6">
          <button
            type="button"
            autoFocus={variant !== "info"}
            disabled={isBusy}
            onClick={onCancel}
            className="w-full min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--border-hover)] transition cursor-pointer"
          >
            {ui(cancelBtnLabel)}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={async () => {
              if (pending.current) return;
              pending.current = true;
              setIsBusy(true);
              setError("");
              try { await onConfirm(); }
              catch (err) {
                const msg = err instanceof Error && err.message.trim() ? err.message : "";
                setError(msg || (isRTL ? "تعذر تنفيذ العملية، يرجى إعادة المحاولة." : "Operation failed, please try again."));
              }
              finally { pending.current = false; setIsBusy(false); }
            }}
            className={`w-full min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${styles.btn}`}
          >
            {ui(isBusy ? (isRTL ? "جاري التنفيذ..." : "Processing...") : confirmBtnLabel)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
