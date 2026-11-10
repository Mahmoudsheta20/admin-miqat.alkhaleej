let supportsDisplayTransition: boolean | undefined;

/**
 * Probes actual discrete `display` transition support rather than relying solely
 * on CSS.supports(), avoiding Firefox 129+ where allow-discrete parses without
 * delaying display: none during exit transitions.
 */
export function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  void getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

export function supportsTopLayerExit(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay());
}

export function supportsClosedByAttribute(): boolean {
  if (typeof HTMLDialogElement === "undefined") return false;
  return "closedBy" in HTMLDialogElement.prototype;
}

export function supportsPopoverApi(): boolean {
  if (typeof HTMLElement === "undefined") return false;
  return Object.hasOwn(HTMLElement.prototype, "popover");
}

export async function closeTopLayerPopover(popover: HTMLElement): Promise<void> {
  const isNativeOpen =
    supportsPopoverApi() &&
    typeof popover.matches === "function" &&
    popover.matches(":popover-open");

  if (!isNativeOpen) {
    return;
  }

  if (!supportsTopLayerExit()) {
    popover.setAttribute("data-closing", "");
    const animations = popover.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished)),
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]);
    }
    if (!popover.hasAttribute("data-closing")) return;
    popover.removeAttribute("data-closing");
    try {
      if (popover.matches(":popover-open")) popover.hidePopover();
    } catch {
      // Ignore if already dismissed natively.
    }
    return;
  }

  try {
    popover.hidePopover();
  } catch {
    return;
  }
  const animations = popover.getAnimations({ subtree: true });
  if (animations.length > 0) {
    await Promise.race([
      Promise.allSettled(animations.map((animation) => animation.finished)),
      new Promise<void>((resolve) => setTimeout(resolve, 350)),
    ]);
  }
}

export async function closeTopLayerDialog(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open) return;

  if (!supportsTopLayerExit()) {
    dialog.setAttribute("data-closing", "");
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished)),
        new Promise<void>((resolve) => setTimeout(resolve, 600)),
      ]);
    }
    if (!dialog.hasAttribute("data-closing")) return;
    dialog.removeAttribute("data-closing");
    if (dialog.open) dialog.close();
    return;
  }

  dialog.close();
  const animations = dialog.getAnimations({ subtree: true });
  if (animations.length > 0) {
    await Promise.race([
      Promise.allSettled(animations.map((animation) => animation.finished)),
      new Promise<void>((resolve) => setTimeout(resolve, 600)),
    ]);
  }
}

/**
 * Updates an unmanaged/RHF or controlled input/textarea element via its native
 * property descriptor and emits bubbling input + change events.
 */
export function triggerNativeValueChange(
  element: HTMLInputElement | HTMLTextAreaElement,
  nextValue: string
): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (valueSetter) {
    valueSetter.call(element, nextValue);
  } else {
    element.value = nextValue;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
