"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  Search,
  User,
  X,
} from "lucide-react";
import type { Customer } from "@/lib/commercial";
import { useUiText } from "@/lib/ui-text";
import { cn } from "@/lib/utils";
import { Badge, Input } from "@/app/_components/ui";
import { useCommercialData } from "./shared";

interface PopoverCapableElement extends HTMLDivElement {
  showPopover(options?: { source?: HTMLElement }): void;
  hidePopover(): void;
}

const emptySubscribe = () => () => {};
const getClientPopoverSupport = () =>
  typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;
const getServerPopoverSupport = () => true;

export interface CustomerComboboxProps {
  id?: string;
  value: string | null;
  onSelect: (customer: Customer | null) => void;
  disabled?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  className?: string;
}

export function CustomerCombobox({
  id,
  value,
  onSelect,
  disabled = false,
  emptyLabel = "بدون ربط عميل",
  placeholder = "اختر عميلاً أو ابحث بالاسم...",
  className,
}: CustomerComboboxProps) {
  const ui = useUiText();
  const panelId = React.useId();
  const searchInputId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const keyboardOpenedRef = React.useRef(false);

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [pickedCustomer, setPickedCustomer] = React.useState<Customer | null>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const hasPopoverApi = React.useSyncExternalStore(
    emptySubscribe,
    getClientPopoverSupport,
    getServerPopoverSupport
  );

  const trimmedSearch = search.trim();
  const baseCustomers = useCommercialData<{ items: Customer[] }>("/customers?search=");
  const searchedCustomers = useCommercialData<{ items: Customer[] }>(
    `/customers?search=${encodeURIComponent(trimmedSearch)}`
  );

  const activeItems = React.useMemo(() => {
    const remoteItems = searchedCustomers.data?.items;
    if (remoteItems) {
      return remoteItems.filter((item) => item.active);
    }
    const baseItems = baseCustomers.data?.items || [];
    if (!trimmedSearch) {
      return baseItems.filter((item) => item.active);
    }
    const q = trimmedSearch.toLowerCase();
    return baseItems.filter(
      (item) =>
        item.active &&
        (item.name.toLowerCase().includes(q) ||
          (item.phone && item.phone.toLowerCase().includes(q)))
    );
  }, [searchedCustomers.data, baseCustomers.data, trimmedSearch]);

  const selectedCustomer = React.useMemo(() => {
    if (!value) return null;
    return (
      searchedCustomers.data?.items.find((item) => item.id === value) ??
      baseCustomers.data?.items.find((item) => item.id === value) ??
      (pickedCustomer?.id === value ? pickedCustomer : null)
    );
  }, [value, searchedCustomers.data, baseCustomers.data, pickedCustomer]);

  const updatePosition = React.useCallback((panelEl: HTMLElement | null) => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const edgePad = 8;
    const width = Math.min(Math.max(rect.width, 280), vw - edgePad * 2);
    const panelHeight = Math.min(panelEl?.offsetHeight || 300, 360);
    const gap = 6;

    const spaceBelow = vh - rect.bottom - edgePad;
    const spaceAbove = rect.top - edgePad;
    const placeAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;
    const rawTop = placeAbove ? rect.top - panelHeight - gap : rect.bottom + gap;
    const top = Math.max(edgePad, Math.min(rawTop, Math.max(edgePad, vh - panelHeight - edgePad)));

    const isRtl = getComputedStyle(trigger).direction === "rtl";
    const rawLeft = isRtl ? rect.right - width : rect.left;
    const left = Math.max(edgePad, Math.min(rawLeft, Math.max(edgePad, vw - width - edgePad)));

    setCoords({ top, left, width });
  }, []);

  const close = React.useCallback(
    (restoreFocus = false) => {
      const panel = panelRef.current as PopoverCapableElement | null;
      if (hasPopoverApi && panel && typeof panel.hidePopover === "function") {
        try {
          if (panel.matches(":popover-open")) {
            panel.hidePopover();
          }
        } catch {
          // Already dismissed natively
        }
      }
      setOpen(false);
      if (restoreFocus || keyboardOpenedRef.current) {
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
      requestAnimationFrame(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      });
    } else {
      setOpen(true);
      requestAnimationFrame(() => {
        updatePosition(panelRef.current);
        searchInputRef.current?.focus({ preventScroll: true });
      });
    }
  }

  function handleChoose(customer: Customer | null, fromKeyboard: boolean) {
    setPickedCustomer(customer);
    onSelect(customer);
    setSearch("");
    close(fromKeyboard);
  }

  const fetchError = searchedCustomers.error || baseCustomers.error;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={handleTriggerClick}
          className={cn(
            "flex min-h-11 sm:min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-3.5 py-2 text-start text-sm text-slate-900 dark:text-slate-100 transition-colors outline-none hover:border-slate-300 dark:hover:border-slate-700 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            open && "border-amber-500 ring-2 ring-amber-500/20"
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedCustomer ? (
              <>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {selectedCustomer.type === "COMPANY" ? (
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="truncate font-semibold">{selectedCustomer.name}</span>
                <Badge variant="secondary" className="shrink-0 text-[11px] font-medium px-2 py-0">
                  {ui(selectedCustomer.type === "COMPANY" ? "شركة" : "فرد")}
                </Badge>
                {selectedCustomer.phone && (
                  <bdi
                    dir="ltr"
                    className="hidden sm:inline shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400"
                  >
                    {selectedCustomer.phone}
                  </bdi>
                )}
              </>
            ) : value ? (
              <span className="truncate font-semibold">{ui("العميل المحدد")}</span>
            ) : (
              <span className="truncate text-slate-600 dark:text-slate-400">
                {ui(placeholder)}
              </span>
            )}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150",
              open && "rotate-180 text-amber-600 dark:text-amber-400"
            )}
            aria-hidden="true"
          />
        </button>

        {value && !disabled && (
          <button
            type="button"
            onClick={() => handleChoose(null, false)}
            aria-label={ui("مسح التحديد")}
            title={ui("مسح التحديد")}
            className="inline-flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Popover panel wrapper keeps layout flex inside inner div */}
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
        style={
          coords
            ? {
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
              }
            : undefined
        }
        className="action-popover fixed inset-auto m-0 z-50 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] shadow-xl text-slate-900 dark:text-slate-100 overflow-hidden"
      >
        <div className="flex flex-col">
          {/* Search Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 p-2.5 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                id={searchInputId}
                type="search"
                aria-label={ui("بحث عن عميل")}
                placeholder={ui("بحث عن عميل...")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="ps-9 pe-8 h-9 text-base sm:text-sm rounded-lg"
              />
              {search && (
                <button
                  type="button"
                  aria-label={ui("مسح البحث")}
                  onClick={() => {
                    setSearch("");
                    searchInputRef.current?.focus({ preventScroll: true });
                  }}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={(event) => handleChoose(null, event.detail === 0)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-start transition-colors min-h-10 cursor-pointer",
                !value
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              )}
            >
              <span>{ui(emptyLabel)}</span>
              {!value && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />}
            </button>

            <hr className="my-1 border-0 border-t border-slate-100 dark:border-slate-800" />

            {searchedCustomers.loading && activeItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                {ui("جارٍ التحميل…")}
              </div>
            ) : activeItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                {ui("لا توجد نتائج")}
              </div>
            ) : (
              activeItems.map((customer) => {
                const isSelected = customer.id === value;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={(event) => handleChoose(customer, event.detail === 0)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs text-start transition-colors min-h-11 sm:min-h-9.5 cursor-pointer",
                      isSelected
                        ? "bg-amber-500/10 text-amber-900 dark:text-amber-200 font-semibold"
                        : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {customer.type === "COMPANY" ? (
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      ) : (
                        <User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      )}
                      <span className="truncate font-semibold">{customer.name}</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      {customer.phone && (
                        <bdi
                          dir="ltr"
                          className="font-mono text-[11px] text-slate-500 dark:text-slate-400"
                        >
                          {customer.phone}
                        </bdi>
                      )}
                      <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                        {ui(customer.type === "COMPANY" ? "شركة" : "فرد")}
                      </Badge>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer link to Customers */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-1.5">
            <Link
              href="/admin/customers"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close(false)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <span>{ui("إضافة أو تعديل عميل")}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {fetchError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {ui(fetchError)}
        </p>
      )}
    </div>
  );
}
