"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import {
  closeTopLayerDialog,
  supportsClosedByAttribute,
} from "@/lib/top-layer";
import { cn } from "@/lib/utils";

export const DialogCloseContext = createContext<(() => Promise<void>) | null>(
  null,
);

/**
 * Allows controls rendered inside FullscreenDialog (like "Apply" / "Cancel")
 * to play the top-layer exit animation cleanly before parent state closes.
 */
export function useFullscreenDialogClose(): (() => Promise<void>) | null {
  return useContext(DialogCloseContext);
}

export interface FullscreenDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  variant?: "workspace" | "focus";
  closedBy?: "any" | "closerequest" | "none";
  deferOnClose?: boolean;
  isBusy?: boolean;
  closeLabel?: string;
  bodyClassName?: string;
}

function isOutsideDialogRect(
  event: PointerEvent,
  dialog: HTMLDialogElement,
): boolean {
  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

/**
 * Top-layer animated modal `<dialog>` supporting full-screen creation workspaces
 * and focused full-screen input editing without duplicating form DOM nodes.
 */
export default function FullscreenDialog({
  open,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  headerActions,
  footer,
  children,
  variant = "workspace",
  closedBy,
  deferOnClose = false,
  isBusy = false,
  closeLabel,
  bodyClassName,
}: FullscreenDialogProps) {
  const { language, dir } = useLanguage();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingRef = useRef(false);
  const closeTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const [isClosingVisual, setIsClosingVisual] = useState(false);

  const effectiveClosedBy =
    closedBy ?? (variant === "focus" ? "any" : "closerequest");

  const defaultCloseText =
    closeLabel ??
    (language === "ar"
      ? variant === "workspace"
        ? "إغلاق وضع ملء الشاشة"
        : "إغلاق"
      : variant === "workspace"
        ? "Exit full-screen"
        : "Close");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const performAnimatedClose = useCallback(async () => {
    const dialog = dialogRef.current;
    if (!dialog || closingRef.current || isBusy) return;
    const token = ++closeTokenRef.current;
    closingRef.current = true;
    setIsClosingVisual(true);
    if (!deferOnClose) {
      onClose();
    }
    try {
      await closeTopLayerDialog(dialog);
      if (closeTokenRef.current === token) {
        dialog.returnValue = "";
      }
    } finally {
      if (closeTokenRef.current === token) {
        closingRef.current = false;
        if (mountedRef.current) {
          setIsClosingVisual(false);
          if (deferOnClose) {
            onClose();
          }
        }
      }
    }
  }, [deferOnClose, isBusy, onClose]);

  const requestAnimatedClose = useCallback(
    () => performAnimatedClose(),
    [performAnimatedClose],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      closeTokenRef.current += 1;
      closingRef.current = false;
      dialog.removeAttribute("data-closing");
      const frame = requestAnimationFrame(() => {
        if (
          mountedRef.current &&
          dialogRef.current &&
          !dialogRef.current.open
        ) {
          dialogRef.current.showModal();
        }
      });
      return () => cancelAnimationFrame(frame);
    }

    if (dialog.open && !closingRef.current) {
      const token = ++closeTokenRef.current;
      closingRef.current = true;
      void closeTopLayerDialog(dialog).finally(() => {
        if (closeTokenRef.current === token) {
          dialog.returnValue = "";
          closingRef.current = false;
          if (mountedRef.current) {
            setIsClosingVisual(false);
          }
        }
      });
    }
  }, [open]);

  // Fallback light-dismiss for Safari / browsers without HTMLDialogElement.prototype.closedBy
  useEffect(() => {
    const dialog = dialogRef.current;
    if (
      !dialog ||
      !open ||
      effectiveClosedBy !== "any" ||
      supportsClosedByAttribute()
    ) {
      return;
    }

    let pressedOutside = false;
    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = isOutsideDialogRect(event, dialog);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutsideDialogRect(event, dialog) && !isBusy) {
        void performAnimatedClose();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [open, effectiveClosedBy, isBusy, performAnimatedClose]);

  const dialogAttributes: Record<string, string> = {
    closedby: effectiveClosedBy,
  };
  const shouldRenderContent = open || isClosingVisual;

  return (
    <DialogCloseContext.Provider value={requestAnimatedClose}>
      <dialog
        ref={dialogRef}
        dir={dir}
        aria-labelledby={titleId}
        aria-busy={isBusy}
        className={cn(
          "fullscreen-dialog",
          variant === "workspace"
            ? "fullscreen-dialog--workspace"
            : "fullscreen-dialog--focus",
          !open && isClosingVisual && "pointer-events-none",
        )}
        {...dialogAttributes}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!isBusy && effectiveClosedBy !== "none") {
            void performAnimatedClose();
          }
        }}
        onClose={(event) => {
          event.stopPropagation();
          const dialog = dialogRef.current;
          if (dialog) dialog.returnValue = "";
          if (!closingRef.current && mountedRef.current && open) {
            onClose();
          }
        }}
      >
        {shouldRenderContent && (
          <>
            <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b theme-border bg-[var(--bg-card)] px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {icon ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    {icon}
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <Maximize2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={titleId}
                      className="text-lg sm:text-xl font-semibold text-[var(--text-main)] leading-snug"
                    >
                      {title}
                    </h2>
                    {badge}
                  </div>
                  {subtitle && (
                    <p className="mt-0.5 text-sm text-[var(--text-muted)] leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {headerActions}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void performAnimatedClose()}
                  aria-label={defaultCloseText}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-3.5 py-2 text-sm font-semibold text-[var(--text-main)] hover:border-amber-500/40 hover:bg-[var(--bg-card)] transition cursor-pointer disabled:opacity-50"
                >
                  {variant === "workspace" ? (
                    <>
                      <Minimize2
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="hidden sm:inline">
                        {defaultCloseText}
                      </span>
                      <X className="h-4 w-4 sm:hidden" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="hidden sm:inline">
                        {defaultCloseText}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </header>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-scroll px-4 py-5 sm:px-6 sm:py-6 lg:px-8",
                bodyClassName,
              )}
            >
              {children}
            </div>

            {footer && (
              <footer className="shrink-0 border-t theme-border bg-[var(--bg-card)] px-4 py-3.5 sm:px-6">
                {footer}
              </footer>
            )}
          </>
        )}
      </dialog>
    </DialogCloseContext.Provider>
  );
}
