"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Search,
  User,
  X,
} from "lucide-react";
import type { Customer } from "@/lib/commercial";
import { useLanguage } from "@/lib/languageContext";
import { useUiText } from "@/lib/ui-text";
import { cn } from "@/lib/utils";
import { Badge } from "@/app/_components/ui";
import { useFullscreenDialogClose } from "@/app/_components/form/FullscreenDialog";
import ResponsivePickerOverlay, {
  useIsPickerFullscreen,
  usePickerDisclosure,
} from "@/app/_components/form/ResponsivePickerOverlay";
import { useCommercialData } from "./shared";

export interface CustomerComboboxProps {
  id?: string;
  value: string | null;
  onSelect: (customer: Customer | null) => void;
  disabled?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  className?: string;
}

interface CustomerModalBodyProps {
  value: string | null;
  emptyLabel: string;
  baseCustomers: Customer[];
  onChoose: (customer: Customer | null) => void;
}

function CustomerModalBody({
  value,
  emptyLabel,
  baseCustomers,
  onChoose,
}: CustomerModalBodyProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const isFullscreen = useIsPickerFullscreen();
  const requestDialogClose = useFullscreenDialogClose();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchInputId = React.useId();

  const trimmedSearch = search.trim();
  const searchedCustomers = useCommercialData<{ items: Customer[] }>(
    `/customers?search=${encodeURIComponent(trimmedSearch)}`,
  );

  const activeItems = React.useMemo(() => {
    const remoteItems = searchedCustomers.data?.items;
    if (remoteItems) {
      return remoteItems.filter((item) => item.active);
    }
    if (!trimmedSearch) {
      return baseCustomers.filter((item) => item.active);
    }
    const q = trimmedSearch.toLowerCase();
    return baseCustomers.filter(
      (item) =>
        item.active &&
        (item.name.toLowerCase().includes(q) ||
          (item.phone && item.phone.toLowerCase().includes(q))),
    );
  }, [searchedCustomers.data, baseCustomers, trimmedSearch]);

  React.useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, []);

  const pickCustomer = (customer: Customer | null) => {
    onChoose(customer);
    void requestDialogClose?.();
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isFullscreen ? "h-full gap-5" : "gap-2.5",
      )}
    >
      <search className="shrink-0">
        <div className="relative">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-muted)]",
              isFullscreen ? "start-4 h-5 w-5" : "start-3 h-4 w-4",
            )}
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            id={searchInputId}
            type="search"
            autoFocus
            aria-label={ui("بحث عن عميل")}
            placeholder={ui("بحث عن عميل...")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className={cn(
              "theme-input w-full border border-[var(--control-border)] bg-[var(--input-bg)] font-medium text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-[var(--accent-gold)]/20 focus:outline-hidden",
              isFullscreen
                ? "min-h-14 rounded-2xl border-2 py-3.5 ps-12 pe-12 text-base sm:text-lg focus:ring-3"
                : "min-h-10 rounded-xl border py-2 ps-9 pe-9 text-sm sm:text-base focus:ring-2",
            )}
          />
          {search && (
            <button
              type="button"
              aria-label={ui("مسح البحث")}
              onClick={() => {
                setSearch("");
                searchInputRef.current?.focus({ preventScroll: true });
              }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-main)] cursor-pointer transition",
                isFullscreen
                  ? "end-2 min-h-10 min-w-10 rounded-xl"
                  : "end-1.5 min-h-8 min-w-8",
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </search>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain p-1",
          isFullscreen ? "space-y-3" : "space-y-1.5",
        )}
      >
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => pickCustomer(null)}
          className={cn(
            "fullscreen-select-option flex w-full items-center justify-between gap-3 text-start font-semibold transition cursor-pointer",
            isFullscreen
              ? "min-h-14 rounded-2xl border-2 px-5 py-3.5 text-base"
              : "min-h-10 rounded-xl border px-3.5 py-2 text-sm sm:text-base",
            !value
              ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]"
              : "border theme-border bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/50 hover:bg-[var(--bg-card-subtle)]",
          )}
        >
          <span>{ui(emptyLabel)}</span>
          <span
            aria-hidden="true"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border transition-colors",
              isFullscreen ? "h-7 w-7" : "h-6 w-6",
              !value
                ? "border-[var(--accent-btn-border)] bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)]"
                : "border-[var(--control-border)] text-transparent",
            )}
          >
            <Check className={isFullscreen ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </span>
        </button>

        {searchedCustomers.error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300"
          >
            {ui(searchedCustomers.error)}
          </p>
        )}

        {searchedCustomers.loading && activeItems.length === 0 ? (
          <div
            role="status"
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed theme-border text-center text-[var(--text-muted)]",
              isFullscreen ? "min-h-40 p-8 text-base" : "min-h-24 p-5 text-sm",
            )}
          >
            <Loader2
              className="h-6 w-6 animate-spin text-[var(--accent-gold)]"
              aria-hidden="true"
            />
            <span>{ui("جارٍ التحميل…")}</span>
          </div>
        ) : activeItems.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-2xl border border-dashed theme-border text-center text-[var(--text-muted)]",
              isFullscreen ? "min-h-36 p-8 text-base" : "min-h-24 p-5 text-sm",
            )}
          >
            {ui("لا توجد نتائج")}
          </div>
        ) : (
          <ul
            role="list"
            className={cn(
              "grid",
              isFullscreen ? "gap-3 grid-cols-1 md:grid-cols-2" : "gap-1.5 grid-cols-1",
            )}
          >
            {activeItems.map((customer) => {
              const isSelected = customer.id === value;
              return (
                <li key={customer.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => pickCustomer(customer)}
                    className={cn(
                      "fullscreen-select-option flex w-full items-start justify-between gap-3 text-start transition cursor-pointer",
                      isFullscreen
                        ? "min-h-18 rounded-2xl border-2 px-5 py-4 text-lg"
                        : "min-h-11 rounded-xl border px-3.5 py-2.5 text-sm sm:text-base",
                      isSelected
                        ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--text-main)] shadow-xs"
                        : "border theme-border bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/50 hover:bg-[var(--bg-card-subtle)]",
                    )}
                  >
                    <span className="flex min-w-0 items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex shrink-0 items-center justify-center rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)]",
                          isFullscreen ? "h-9 w-9" : "h-7 w-7 rounded-lg",
                        )}
                      >
                        {customer.type === "COMPANY" ? (
                          <Building2 className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <User className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 space-y-0.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "font-bold",
                              isFullscreen ? "text-lg sm:text-xl" : "text-sm sm:text-base",
                              isSelected
                                ? "text-[var(--accent-gold)]"
                                : "text-[var(--text-main)]",
                            )}
                          >
                            {customer.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs font-medium px-2 py-0.5"
                          >
                            {ui(customer.type === "COMPANY" ? "شركة" : "فرد")}
                          </Badge>
                        </span>
                        {customer.phone && (
                          <bdi
                            dir="ltr"
                            className={cn(
                              "block font-mono text-[var(--text-muted)]",
                              isFullscreen ? "text-base" : "text-xs sm:text-sm",
                            )}
                          >
                            {customer.phone}
                          </bdi>
                        )}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 flex shrink-0 items-center justify-center rounded-full border transition-colors",
                        isFullscreen ? "h-8 w-8" : "h-6 w-6",
                        isSelected
                          ? "border-[var(--accent-btn-border)] bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)]"
                          : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-transparent",
                      )}
                    >
                      <Check className={isFullscreen ? "h-4 w-4" : "h-3.5 w-3.5"} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        className={cn(
          "shrink-0 flex flex-wrap items-center justify-between gap-2 border-t theme-border",
          isFullscreen ? "pt-4" : "pt-2.5",
        )}
      >
        <Link
          href="/admin/customers"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void requestDialogClose?.()}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] font-semibold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition",
            isFullscreen
              ? "min-h-12 px-4 py-2.5 text-sm sm:text-base"
              : "min-h-9 px-3 py-1.5 text-xs sm:text-sm",
          )}
        >
          <span>{ui("إضافة أو تعديل عميل")}</span>
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>

        {isFullscreen && (
          <button
            type="button"
            onClick={() => void requestDialogClose?.()}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-6 py-2.5 text-base font-semibold text-[var(--text-main)] hover:bg-[var(--bg-card)] cursor-pointer transition"
          >
            {text("إغلاق", "Close")}
          </button>
        )}
      </div>
    </div>
  );
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
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const generatedId = React.useId();
  const controlId = id || generatedId;
  const overlayId = `${controlId}-customer-picker`;
  const {
    isMobile,
    open,
    sessionKey,
    triggerRef,
    overlayRef,
    toggleFromTrigger,
    closeOverlay,
  } = usePickerDisclosure({ disabled });
  const [pickedCustomer, setPickedCustomer] = React.useState<Customer | null>(
    null,
  );

  const baseCustomers = useCommercialData<{ items: Customer[] }>(
    "/customers?search=",
  );

  const selectedCustomer = React.useMemo(() => {
    if (!value) return null;
    return (
      baseCustomers.data?.items.find((item) => item.id === value) ??
      (pickedCustomer?.id === value ? pickedCustomer : null)
    );
  }, [value, baseCustomers.data, pickedCustomer]);

  function handleChoose(customer: Customer | null) {
    setPickedCustomer(customer);
    onSelect(customer);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <button
          ref={triggerRef}
          id={controlId}
          type="button"
          disabled={disabled}
          aria-haspopup={isMobile ? "dialog" : undefined}
          aria-expanded={open}
          aria-controls={!isMobile && open ? overlayId : undefined}
          onClick={toggleFromTrigger}
          className={cn(
            "flex min-h-12 w-full items-center justify-between gap-2.5 rounded-xl border border-[var(--control-border)] bg-[var(--input-bg)] px-4 py-2.5 text-start text-base text-[var(--text-main)] transition-colors outline-none hover:border-[var(--accent-gold)] focus-visible:border-[var(--accent-gold)] focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]/20 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer",
            open &&
              "border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/20",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {selectedCustomer ? (
              <>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-surface)] text-[var(--accent-gold)]">
                  {selectedCustomer.type === "COMPANY" ? (
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <User className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="truncate font-semibold">
                  {selectedCustomer.name}
                </span>
                <Badge
                  variant="secondary"
                  className="shrink-0 text-xs font-medium px-2 py-0.5"
                >
                  {ui(selectedCustomer.type === "COMPANY" ? "شركة" : "فرد")}
                </Badge>
                {selectedCustomer.phone && (
                  <bdi
                    dir="ltr"
                    className="hidden sm:inline shrink-0 font-mono text-sm text-[var(--text-muted)]"
                  >
                    {selectedCustomer.phone}
                  </bdi>
                )}
              </>
            ) : value ? (
              <span className="truncate font-semibold">
                {ui("العميل المحدد")}
              </span>
            ) : (
              <span className="truncate text-[var(--text-placeholder)]">
                {ui(placeholder)}
              </span>
            )}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150",
              open && "rotate-180 text-[var(--accent-gold)]",
            )}
            aria-hidden="true"
          />
        </button>

        {value && !disabled && (
          <button
            type="button"
            onClick={() => handleChoose(null)}
            aria-label={ui("مسح التحديد")}
            title={ui("مسح التحديد")}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--control-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <ResponsivePickerOverlay
        open={open}
        onClose={closeOverlay}
        anchorRef={triggerRef}
        overlayRef={overlayRef}
        overlayId={overlayId}
        title={text("اختيار ملف العميل", "Select customer profile")}
        subtitle={text(
          "ابحث باسم العميل أو رقم الجوال واختره بملء الشاشة",
          "Search by customer name or phone number in full-screen view",
        )}
        icon={<User className="h-5 w-5" aria-hidden="true" />}
        matchTriggerWidth
        minPopoverWidth={340}
        maxPopoverWidth={520}
      >
        <CustomerModalBody
          key={sessionKey}
          value={value}
          emptyLabel={emptyLabel}
          baseCustomers={baseCustomers.data?.items || []}
          onChoose={handleChoose}
        />
      </ResponsivePickerOverlay>

      {baseCustomers.error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {ui(baseCustomers.error)}
        </p>
      )}
    </div>
  );
}
