"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  closeTopLayerPopover,
  supportsPopoverApi,
} from "@/lib/top-layer";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import { cn } from "@/lib/utils";
import FullscreenDialog, { DialogCloseContext } from "./FullscreenDialog";

const PickerFullscreenContext = createContext(false);

/**
 * Returns `true` when the picker overlay is currently presented in mobile
 * full-screen dialog mode (`< 768px`), and `false` in desktop popover mode.
 */
export function useIsPickerFullscreen(): boolean {
  return useContext(PickerFullscreenContext);
}

interface PickerDisclosureOptions {
  disabled?: boolean;
  onClose?: () => void;
}

export function usePickerDisclosure({
  disabled = false,
  onClose,
}: PickerDisclosureOptions = {}) {
  const isMobile = useIsMobileViewport();
  const [open, setOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const suppressTriggerClickRef = useRef(false);

  useEffect(() => {
    if (!open || isMobile) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const trigger = triggerRef.current;
      if (
        trigger &&
        event.target instanceof Node &&
        trigger.contains(event.target)
      ) {
        suppressTriggerClickRef.current = true;
        window.setTimeout(() => {
          suppressTriggerClickRef.current = false;
        }, 300);
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
    };
  }, [open, isMobile]);

  const openOverlay = useCallback(() => {
    if (disabled) return;
    setSessionKey((prev) => prev + 1);
    setOpen(true);
  }, [disabled]);

  const closeOverlay = useCallback(() => {
    setOpen(false);
    onClose?.();
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (
        !active ||
        active === document.body ||
        overlayRef.current?.contains(active)
      ) {
        triggerRef.current?.focus({ preventScroll: true });
      }
    });
  }, [onClose]);

  const toggleFromTrigger = useCallback(() => {
    if (disabled) return;
    if (suppressTriggerClickRef.current) {
      suppressTriggerClickRef.current = false;
      return;
    }
    if (open) {
      closeOverlay();
      return;
    }
    openOverlay();
  }, [disabled, open, closeOverlay, openOverlay]);

  return {
    isMobile,
    open,
    sessionKey,
    triggerRef,
    overlayRef,
    openOverlay,
    toggleFromTrigger,
    closeOverlay,
  };
}

interface PopoverGeometryOptions {
  matchTriggerWidth: boolean;
  minWidth: number;
  maxWidth: number;
  preferredMaxHeight: number;
}

function applyDesktopPopoverGeometry(
  panel: HTMLDivElement,
  anchor: HTMLElement,
  options: PopoverGeometryOptions,
) {
  const rect = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const edgePadding = 12;
  const gap = 6;

  const clampedMaxWidth = Math.max(220, Math.min(options.maxWidth, vw - edgePadding * 2));
  const baseWidth = options.matchTriggerWidth
    ? Math.max(rect.width, options.minWidth)
    : options.minWidth;
  const finalWidth = Math.max(220, Math.min(clampedMaxWidth, baseWidth));

  const isRtl = getComputedStyle(anchor).direction === "rtl";
  let left = isRtl ? rect.right - finalWidth : rect.left;
  left = Math.max(edgePadding, Math.min(left, vw - edgePadding - finalWidth));

  const spaceBelow = vh - rect.bottom - edgePadding - gap;
  const spaceAbove = rect.top - edgePadding - gap;
  const minComfortableHeight = Math.min(options.preferredMaxHeight, 390);
  const openAbove =
    spaceBelow < minComfortableHeight && spaceAbove > spaceBelow;
  const availableHeight = Math.max(
    180,
    Math.min(options.preferredMaxHeight, openAbove ? spaceAbove : spaceBelow),
  );

  panel.style.width = `${Math.round(finalWidth)}px`;
  panel.style.left = `${Math.round(left)}px`;
  panel.style.right = "auto";
  panel.style.maxHeight = `${Math.round(availableHeight)}px`;

  if (openAbove) {
    panel.style.top = "auto";
    panel.style.bottom = `${Math.round(vh - rect.top + gap)}px`;
    panel.dataset.placement = "top";
  } else {
    panel.style.top = `${Math.round(rect.bottom + gap)}px`;
    panel.style.bottom = "auto";
    panel.dataset.placement = "bottom";
  }
}

export interface ResponsivePickerOverlayProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  overlayRef?: RefObject<HTMLDivElement | null>;
  overlayId?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  matchTriggerWidth?: boolean;
  minPopoverWidth?: number;
  maxPopoverWidth?: number;
  preferredMaxHeight?: number;
  popoverClassName?: string;
  dir?: "rtl" | "ltr" | "auto";
  children: ReactNode;
}

/**
 * Responsive picker container:
 * - Mobile (`< 768px`): opens an animated full-screen top-layer `<dialog>`.
 * - Desktop (`>= 768px`): opens an anchored top-layer dropdown popover.
 */
export default function ResponsivePickerOverlay({
  open,
  onClose,
  anchorRef,
  overlayRef: externalOverlayRef,
  overlayId,
  title,
  subtitle,
  icon,
  matchTriggerWidth = true,
  minPopoverWidth = 280,
  maxPopoverWidth = 480,
  preferredMaxHeight = 420,
  popoverClassName,
  dir,
  children,
}: ResponsivePickerOverlayProps) {
  const isMobile = useIsMobileViewport();
  const generatedId = useId();
  const internalRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const closeTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const [isClosingVisual, setIsClosingVisual] = useState(false);

  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (externalOverlayRef) {
        externalOverlayRef.current = node;
      }
      if (!node) {
        closingRef.current = false;
      }
    },
    [externalOverlayRef],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const performPopoverClose = useCallback(async () => {
    const panel = internalRef.current;
    if (!panel || closingRef.current) return;
    const token = ++closeTokenRef.current;
    closingRef.current = true;
    setIsClosingVisual(true);
    onClose();
    try {
      await closeTopLayerPopover(panel);
    } finally {
      if (closeTokenRef.current === token) {
        closingRef.current = false;
        if (mountedRef.current) {
          setIsClosingVisual(false);
        }
      }
    }
  }, [onClose]);

  const supportsPopover = supportsPopoverApi();

  useLayoutEffect(() => {
    if (isMobile) return;
    const panel = internalRef.current;
    const anchor = anchorRef.current;
    if (!panel) return;

    if (open) {
      closeTokenRef.current += 1;
      closingRef.current = false;
      panel.removeAttribute("data-closing");

      if (anchor) {
        applyDesktopPopoverGeometry(panel, anchor, {
          matchTriggerWidth,
          minWidth: minPopoverWidth,
          maxWidth: maxPopoverWidth,
          preferredMaxHeight,
        });
      }

      if (supportsPopover) {
        try {
          if (!panel.matches(":popover-open")) {
            panel.showPopover();
          }
        } catch {
          // Ignore if disconnected before frame settles.
        }
      }
      return;
    }

    if (supportsPopover && panel.matches(":popover-open") && !closingRef.current) {
      const token = ++closeTokenRef.current;
      closingRef.current = true;
      void closeTopLayerPopover(panel).finally(() => {
        if (closeTokenRef.current === token) {
          closingRef.current = false;
          if (mountedRef.current) {
            setIsClosingVisual(false);
          }
        }
      });
    }
  }, [
    isMobile,
    open,
    anchorRef,
    supportsPopover,
    matchTriggerWidth,
    minPopoverWidth,
    maxPopoverWidth,
    preferredMaxHeight,
  ]);

  useEffect(() => {
    if (isMobile || !open) return;
    const panel = internalRef.current;
    if (!panel || !supportsPopover) return;

    let handled = false;
    const handleNativeCloseEvent = (event: Event) => {
      const toggleEvent = event as ToggleEvent;
      if (
        handled ||
        toggleEvent.newState !== "closed" ||
        closingRef.current ||
        !mountedRef.current
      ) {
        return;
      }
      handled = true;
      const token = ++closeTokenRef.current;
      closingRef.current = true;
      setIsClosingVisual(true);
      onClose();
      requestAnimationFrame(() => {
        const animations = panel.getAnimations({ subtree: true });
        const finish = () => {
          if (closeTokenRef.current === token) {
            closingRef.current = false;
            if (mountedRef.current) {
              setIsClosingVisual(false);
            }
          }
        };
        if (animations.length === 0) {
          finish();
        } else {
          void Promise.race([
            Promise.allSettled(animations.map((a) => a.finished)),
            new Promise<void>((resolve) => setTimeout(resolve, 240)),
          ]).finally(finish);
        }
      });
    };

    panel.addEventListener("beforetoggle", handleNativeCloseEvent);
    panel.addEventListener("toggle", handleNativeCloseEvent);
    return () => {
      panel.removeEventListener("beforetoggle", handleNativeCloseEvent);
      panel.removeEventListener("toggle", handleNativeCloseEvent);
    };
  }, [isMobile, open, supportsPopover, onClose]);

  useEffect(() => {
    if (isMobile || !open) return;

    let rafId = 0;
    const reposition = (event?: Event) => {
      const panel = internalRef.current;
      const anchor = anchorRef.current;
      if (!panel || !anchor) return;
      if (
        event?.target instanceof Node &&
        panel.contains(event.target)
      ) {
        return;
      }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!mountedRef.current || !internalRef.current || !anchorRef.current) {
          return;
        }
        applyDesktopPopoverGeometry(internalRef.current, anchorRef.current, {
          matchTriggerWidth,
          minWidth: minPopoverWidth,
          maxWidth: maxPopoverWidth,
          preferredMaxHeight,
        });
      });
    };

    window.addEventListener("scroll", reposition, { capture: true, passive: true });
    window.addEventListener("resize", reposition, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [
    isMobile,
    open,
    anchorRef,
    matchTriggerWidth,
    minPopoverWidth,
    maxPopoverWidth,
    preferredMaxHeight,
  ]);

  // Fallback light-dismiss and Escape handling when native Popover API is unavailable.
  useEffect(() => {
    if (isMobile || !open || supportsPopover) return;

    const handlePointerDown = (event: PointerEvent) => {
      const panel = internalRef.current;
      const anchor = anchorRef.current;
      const target = event.target as Node | null;
      if (
        target &&
        !panel?.contains(target) &&
        !anchor?.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isMobile, open, supportsPopover, anchorRef, onClose]);

  if (isMobile) {
    return (
      <PickerFullscreenContext.Provider value={true}>
        <FullscreenDialog
          open={open}
          onClose={onClose}
          title={title}
          subtitle={subtitle}
          variant="focus"
          closedBy="any"
          icon={icon}
        >
          {children}
        </FullscreenDialog>
      </PickerFullscreenContext.Provider>
    );
  }

  const shouldRenderContent = open || isClosingVisual;

  return (
    <PickerFullscreenContext.Provider value={false}>
      <DialogCloseContext.Provider value={performPopoverClose}>
        <div
          ref={setPanelRef}
          id={overlayId || generatedId}
          dir={dir}
          popover={supportsPopover ? "auto" : undefined}
          data-open={!supportsPopover && open ? "true" : undefined}
          className={cn(
            "picker-popover",
            !supportsPopover && !open && "hidden",
            !open && isClosingVisual && "pointer-events-none",
            popoverClassName,
          )}
        >
          {shouldRenderContent ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              {children}
            </div>
          ) : null}
        </div>
      </DialogCloseContext.Provider>
    </PickerFullscreenContext.Provider>
  );
}
