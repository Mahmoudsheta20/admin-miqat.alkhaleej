"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, FileText, Loader2, Search, X } from "lucide-react";
import { invoiceRequest } from "@/lib/invoices";
import { useLanguage } from "@/lib/languageContext";
import { useUiText } from "@/lib/ui-text";
import { cn } from "@/lib/utils";
import { useFullscreenDialogClose } from "@/app/_components/form/FullscreenDialog";
import ResponsivePickerOverlay, {
  useIsPickerFullscreen,
  usePickerDisclosure,
} from "@/app/_components/form/ResponsivePickerOverlay";

export interface InvoiceContractOption {
  id: string;
  referenceNumber: string;
  customerName: string;
  origin: string;
  destination: string;
  tripDate: string;
}

interface ContractPickerProps {
  selected: InvoiceContractOption | null;
  isLoading: boolean;
  onSelect: (contract: InvoiceContractOption) => void;
  onClear: () => void;
}

interface ContractPickerModalBodyProps {
  selectedId?: string;
  onSelect: (contract: InvoiceContractOption) => void;
}

function ContractPickerModalBody({
  selectedId,
  onSelect,
}: ContractPickerModalBodyProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const isFullscreen = useIsPickerFullscreen();
  const requestDialogClose = useFullscreenDialogClose();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<InvoiceContractOption[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [error, setError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setIsSearching(true);
      void invoiceRequest<{ items: InvoiceContractOption[] }>(
        `/contracts?search=${encodeURIComponent(query)}`,
      ).then((result) => {
        if (!active) return;
        setItems(result.data?.items || []);
        setError(result.error || "");
        setIsSearching(false);
      });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
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

  const choose = (item: InvoiceContractOption) => {
    onSelect(item);
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
              isFullscreen ? "start-4 size-5" : "start-3 size-4",
            )}
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            id={searchInputId}
            type="search"
            autoFocus
            autoComplete="off"
            aria-label={ui("ابحث برقم العقد أو اسم العميل")}
            placeholder={ui("ابحث برقم العقد أو اسم العميل")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSearching(true);
            }}
            className={cn(
              "theme-input w-full border theme-border bg-white dark:bg-slate-900/80 font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500/20 focus:outline-hidden",
              isFullscreen
                ? "min-h-14 rounded-2xl border-2 py-3.5 ps-12 pe-12 text-base sm:text-lg focus:ring-3"
                : "min-h-10 rounded-xl border py-2 ps-9 pe-9 text-sm sm:text-base focus:ring-2",
            )}
          />
          {query && (
            <button
              type="button"
              aria-label={text("مسح البحث", "Clear search")}
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus({ preventScroll: true });
              }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-main)] cursor-pointer transition",
                isFullscreen
                  ? "end-2 min-h-10 min-w-10 rounded-xl"
                  : "end-1.5 min-h-8 min-w-8",
              )}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </search>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
        {isSearching ? (
          <p
            role="status"
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed theme-border text-center text-[var(--text-muted)]",
              isFullscreen ? "min-h-40 p-8 text-base" : "min-h-24 p-5 text-sm",
            )}
          >
            <Loader2
              className="size-6 animate-spin text-amber-500"
              aria-hidden="true"
            />
            <span>{ui("جارٍ البحث…")}</span>
          </p>
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm sm:text-base font-medium text-rose-700 dark:text-rose-300"
          >
            {ui(error)}
          </p>
        ) : !items.length ? (
          <p
            className={cn(
              "flex items-center justify-center rounded-2xl border border-dashed theme-border text-center text-[var(--text-muted)]",
              isFullscreen ? "min-h-36 p-8 text-base" : "min-h-24 p-5 text-sm",
            )}
          >
            {ui("لا توجد عقود مطابقة. يمكنك إنشاء الفاتورة يدويًا.")}
          </p>
        ) : (
          <ul
            role="list"
            className={cn(
              "grid",
              isFullscreen
                ? "gap-3 grid-cols-1 md:grid-cols-2"
                : "gap-1.5 grid-cols-1",
            )}
          >
            {items.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => choose(item)}
                    className={cn(
                      "fullscreen-select-option flex w-full items-start justify-between text-start transition cursor-pointer",
                      isFullscreen
                        ? "min-h-18 gap-4 rounded-2xl border-2 px-5 py-4 text-lg"
                        : "min-h-11 gap-3 rounded-xl border px-3.5 py-2.5 text-sm sm:text-base",
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white shadow-xs"
                        : "border theme-border bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-amber-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/80",
                    )}
                  >
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "font-bold",
                            isFullscreen
                              ? "text-lg sm:text-xl"
                              : "text-sm sm:text-base",
                            isSelected
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-slate-900 dark:text-white",
                          )}
                        >
                          {item.customerName}
                        </span>
                        <span
                          dir="ltr"
                          className="rounded-lg border theme-border bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300"
                        >
                          {item.referenceNumber}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "block text-[var(--text-muted)]",
                          isFullscreen ? "text-base" : "text-xs sm:text-sm",
                        )}
                      >
                        {item.origin} {ui.dir === "rtl" ? "←" : "→"}{" "}
                        {item.destination} · {item.tripDate}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 flex shrink-0 items-center justify-center rounded-full border transition-colors",
                        isFullscreen ? "h-8 w-8" : "h-6 w-6",
                        isSelected
                          ? "border-amber-600 bg-amber-600 text-white"
                          : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-transparent",
                      )}
                    >
                      <Check className={isFullscreen ? "size-4" : "size-3.5"} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isFullscreen && (
        <div className="shrink-0 flex justify-end border-t theme-border pt-4">
          <button
            type="button"
            onClick={() => void requestDialogClose?.()}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-6 py-2.5 text-base font-semibold text-[var(--text-main)] hover:bg-[var(--bg-card)] cursor-pointer transition"
          >
            {text("إغلاق", "Close")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ContractPicker({
  selected,
  isLoading,
  onSelect,
  onClear,
}: ContractPickerProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const controlId = useId();
  const overlayId = `${controlId}-contract-picker`;
  const {
    isMobile,
    open: isOpen,
    sessionKey,
    triggerRef,
    overlayRef,
    toggleFromTrigger,
    closeOverlay,
  } = usePickerDisclosure();

  return (
    <div className="relative">
      <label
        htmlFor={controlId}
        className="mb-2 block text-sm sm:text-[0.9375rem] font-semibold text-[var(--text-main)]"
      >
        {ui("ابدأ من عقد موجود")}{" "}
        <span className="font-normal text-[var(--text-muted)]">
          {ui("(اختياري)")}
        </span>
      </label>

      <div className="flex items-center gap-2">
        <button
          ref={triggerRef}
          id={controlId}
          type="button"
          aria-haspopup={isMobile ? "dialog" : undefined}
          aria-expanded={isOpen}
          aria-controls={!isMobile && isOpen ? overlayId : undefined}
          onClick={toggleFromTrigger}
          className={`theme-input flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-start text-base font-medium cursor-pointer transition ${
            isOpen ? "border-amber-500 ring-2 ring-amber-500/20" : ""
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Search
              className="size-4 shrink-0 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            {selected ? (
              <span className="truncate font-semibold text-slate-900 dark:text-white">
                {selected.referenceNumber} · {selected.customerName}
              </span>
            ) : (
              <span className="truncate text-slate-400 font-normal">
                {ui("ابحث برقم العقد أو اسم العميل")}
              </span>
            )}
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {isLoading && (
              <Loader2
                className="size-4 animate-spin text-amber-500"
                aria-label={ui("جارٍ تحميل العقد")}
              />
            )}
            <ChevronDown
              className={`size-4 text-[var(--text-muted)] transition-transform duration-150 ${
                isOpen ? "rotate-180 text-amber-500" : ""
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        {selected && !isLoading && (
          <button
            type="button"
            aria-label={ui("إلغاء ربط العقد")}
            title={ui("إلغاء ربط العقد")}
            onClick={onClear}
            className="min-h-12 min-w-12 shrink-0 inline-flex items-center justify-center rounded-xl border theme-border bg-white dark:bg-slate-900/80 text-[var(--text-muted)] hover:bg-[var(--table-row-hover)] hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        {ui("اختيار العقد يملأ بيانات العميل والرحلة تلقائيًا.")}
      </p>

      <ResponsivePickerOverlay
        open={isOpen}
        onClose={closeOverlay}
        anchorRef={triggerRef}
        overlayRef={overlayRef}
        overlayId={overlayId}
        title={text("اختيار عقد موجود", "Select an existing contract")}
        subtitle={text(
          "ابحث برقم العقد أو اسم العميل لاستيراد البيانات تلقائيًا",
          "Search by contract reference or customer name to auto-fill details",
        )}
        icon={<FileText className="size-5" aria-hidden="true" />}
        matchTriggerWidth
        minPopoverWidth={360}
        maxPopoverWidth={560}
      >
        <ContractPickerModalBody
          key={sessionKey}
          selectedId={selected?.id}
          onSelect={onSelect}
        />
      </ResponsivePickerOverlay>
    </div>
  );
}
