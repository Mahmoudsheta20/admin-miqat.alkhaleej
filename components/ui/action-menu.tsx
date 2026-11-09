"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionMenuContextValue {
  close: (fromKeyboard?: boolean) => void;
}

const ActionMenuContext = React.createContext<ActionMenuContextValue | null>(null);

interface PopoverCapableElement extends HTMLDivElement {
  showPopover(options?: { source?: HTMLElement }): void;
  hidePopover(): void;
}

export interface ActionMenuProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  align?: "end" | "start";
}

const emptySubscribe = () => () => {};
const getClientPopoverSupport = () =>
  typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;
const getServerPopoverSupport = () => true;

export function ActionMenu({
  label,
  children,
  className,
  triggerClassName,
  align = "end",
}: ActionMenuProps) {
  const panelId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const keyboardOpenedRef = React.useRef(false);

  const [open, setOpen] = React.useState(false);
  const hasPopoverApi = React.useSyncExternalStore(
    emptySubscribe,
    getClientPopoverSupport,
    getServerPopoverSupport
  );
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  const updatePosition = React.useCallback(
    (panelEl: HTMLElement | null) => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelWidth = Math.max(panelEl?.offsetWidth || 0, 208);
      const panelHeight = panelEl?.offsetHeight || 220;
      const gap = 6;
      const edgePad = 8;

      const spaceBelow = vh - rect.bottom - edgePad;
      const spaceAbove = rect.top - edgePad;
      const placeAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;
      const rawTop = placeAbove ? rect.top - panelHeight - gap : rect.bottom + gap;
      const top = Math.max(edgePad, Math.min(rawTop, Math.max(edgePad, vh - panelHeight - edgePad)));

      const isRtl = getComputedStyle(trigger).direction === "rtl";
      const alignToLeft = align === "end" ? isRtl : !isRtl;
      const rawLeft = alignToLeft ? rect.left : rect.right - panelWidth;
      const left = Math.max(edgePad, Math.min(rawLeft, Math.max(edgePad, vw - panelWidth - edgePad)));

      setCoords({ top, left });
    },
    [align]
  );

  const close = React.useCallback(
    (fromKeyboard = false) => {
      const panel = panelRef.current as PopoverCapableElement | null;
      if (hasPopoverApi && panel && typeof panel.hidePopover === "function") {
        try {
          if (panel.matches(":popover-open")) {
            panel.hidePopover();
          }
        } catch {
          // Ignore when popover is already dismissed by browser light-dismiss
        }
      }
      setOpen(false);
      if (fromKeyboard || keyboardOpenedRef.current) {
        triggerRef.current?.focus({ preventScroll: true });
      }
      keyboardOpenedRef.current = false;
    },
    [hasPopoverApi]
  );

  React.useEffect(() => {
    if (!open) return;

    const handleReposition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        close(false);
        return;
      }
      updatePosition(panelRef.current);
    };

    window.addEventListener("resize", handleReposition, { passive: true });
    window.addEventListener("scroll", handleReposition, { passive: true, capture: true });

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, close, updatePosition]);

  // Fallback dismissal for browsers without native Popover API
  React.useEffect(() => {
    if (!open || hasPopoverApi) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, hasPopoverApi, close]);

  function handleTriggerClick(event: React.MouseEvent<HTMLButtonElement>) {
    keyboardOpenedRef.current = event.detail === 0;
    const panel = panelRef.current as PopoverCapableElement | null;

    if (open) {
      close(event.detail === 0);
      return;
    }

    updatePosition(panel);

    if (hasPopoverApi && panel && typeof panel.showPopover === "function") {
      try {
        panel.showPopover({ source: event.currentTarget });
      } catch {
        panel.showPopover();
      }
      updatePosition(panel);
      setOpen(true);
      if (keyboardOpenedRef.current) {
        const firstInteractive = panel.querySelector<HTMLElement>("a, button:not(:disabled)");
        firstInteractive?.focus({ preventScroll: true });
      }
    } else {
      setOpen(true);
      requestAnimationFrame(() => {
        updatePosition(panelRef.current);
        if (keyboardOpenedRef.current) {
          const firstInteractive = panelRef.current?.querySelector<HTMLElement>("a, button:not(:disabled)");
          firstInteractive?.focus({ preventScroll: true });
        }
      });
    }
  }

  const contextValue = React.useMemo(() => ({ close }), [close]);

  return (
    <ActionMenuContext.Provider value={contextValue}>
      <div className="inline-flex items-center">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={label}
          title={label}
          onClick={handleTriggerClick}
          className={cn(
            "inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors h-11 w-11 sm:h-9 sm:w-9 cursor-pointer",
            open && "bg-slate-100 dark:bg-slate-800 border-amber-500/60 text-amber-700 dark:text-amber-300",
            triggerClassName
          )}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Keep layout flex inside inner wrapper so [popover]:not(:popover-open) remains display: none */}
        <div
          ref={panelRef}
          id={panelId}
          popover="auto"
          hidden={!hasPopoverApi && !open ? true : undefined}
          onToggle={(event) => {
            const nextOpen = event.newState === "open";
            setOpen(nextOpen);
            if (nextOpen) {
              updatePosition(panelRef.current);
            } else {
              keyboardOpenedRef.current = false;
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close(true);
            }
          }}
          style={coords ? { top: `${coords.top}px`, left: `${coords.left}px` } : undefined}
          className={cn(
            "action-popover fixed inset-auto m-0 z-50 w-52 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl text-slate-800 dark:text-slate-100",
            className
          )}
        >
          <div className="flex flex-col gap-0.5">{children}</div>
        </div>
      </div>
    </ActionMenuContext.Provider>
  );
}

export interface ActionMenuItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "gold" | "blue" | "emerald" | "danger";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<ActionMenuItemProps["tone"]>, string> = {
  default:
    "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80",
  gold:
    "text-amber-700 dark:text-amber-300 hover:bg-amber-500/10",
  blue:
    "text-blue-700 dark:text-blue-300 hover:bg-blue-500/10",
  emerald:
    "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10",
  danger:
    "text-rose-700 dark:text-rose-400 hover:bg-rose-500/10",
};

export function ActionMenuItem({
  children,
  icon,
  href,
  onClick,
  tone = "default",
  className,
}: ActionMenuItemProps) {
  const ctx = React.useContext(ActionMenuContext);
  const itemClasses = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-start transition-colors min-h-11 sm:min-h-9 cursor-pointer",
    TONE_CLASSES[tone],
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={() => ctx?.close(false)}
        className={itemClasses}
      >
        {icon && <span className="shrink-0 opacity-80">{icon}</span>}
        <span className="truncate">{children}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        ctx?.close(event.detail === 0);
        onClick?.();
      }}
      className={itemClasses}
    >
      {icon && <span className="shrink-0 opacity-80">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function ActionMenuSeparator() {
  return <hr className="my-1 border-0 border-t border-slate-200 dark:border-slate-800" />;
}
