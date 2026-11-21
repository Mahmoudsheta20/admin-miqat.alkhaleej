"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/app/_components/ui";
import {
  accountingRequest,
  buildPurchasesQueryPath,
  paymentStatusMeta,
  type DocumentPaymentSummary,
  type PurchaseList,
  type PurchaseRow,
} from "@/lib/accounting";
import {
  buildInvoiceListQueryPath,
  invoiceRequest,
  type InvoiceRow,
} from "@/lib/invoices";

export interface AccountingDocumentOption {
  id: string;
  documentType: "SALE" | "PURCHASE";
  number: string;
  secondaryRef?: string;
  partyName: string;
  totalAmount: string;
  paymentSummary: DocumentPaymentSummary | null;
}

interface AccountingDocumentComboboxProps {
  documentType: "SALE" | "PURCHASE";
  value: string;
  onChange: (option: AccountingDocumentOption | null) => void;
  language?: "ar" | "en";
  disabled?: boolean;
  inputId?: string;
  placeholder?: string;
}

interface FetchState {
  key: string;
  options: AccountingDocumentOption[];
  error: string | null;
}

function normalizeInvoiceOption(row: InvoiceRow): AccountingDocumentOption {
  return {
    id: row.id,
    documentType: "SALE",
    number: row.invoiceNumber,
    partyName: row.customerName,
    totalAmount: row.totalAmount,
    paymentSummary: row.paymentSummary ?? null,
  };
}

function normalizePurchaseOption(row: PurchaseRow): AccountingDocumentOption {
  return {
    id: row.id,
    documentType: "PURCHASE",
    number: row.voucher || row.invoiceNumber,
    secondaryRef:
      row.voucher && row.invoiceNumber && row.voucher !== row.invoiceNumber
        ? row.invoiceNumber
        : undefined,
    partyName: row.supplierName,
    totalAmount: row.totalAmount,
    paymentSummary: row.paymentSummary ?? null,
  };
}

function extractItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.invoices)) return obj.invoices as T[];
    if (Array.isArray(obj.purchases)) return obj.purchases as T[];
  }
  return [];
}

export function AccountingDocumentCombobox(
  props: AccountingDocumentComboboxProps,
) {
  return (
    <AccountingDocumentComboboxInner
      key={props.documentType}
      {...props}
    />
  );
}

function AccountingDocumentComboboxInner({
  documentType,
  value,
  onChange,
  language = "ar",
  disabled = false,
  inputId,
  placeholder,
}: AccountingDocumentComboboxProps) {
  const isEn = language === "en";
  const generatedId = useId();
  const controlId = inputId ?? `doc-combobox-${generatedId}`;
  const listboxId = `${controlId}-listbox`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>({
    key: "",
    options: [],
    error: null,
  });
  const [pickedOption, setPickedOption] =
    useState<AccountingDocumentOption | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchKey =
    open || value ? `${documentType}:${debouncedQuery}` : "";

  useEffect(() => {
    if (!fetchKey) return;
    let cancelled = false;

    async function load() {
      try {
        if (documentType === "SALE") {
          const path = buildInvoiceListQueryPath({
            page: 1,
            archived: false,
            search: debouncedQuery || undefined,
          });
          const res = await invoiceRequest<{ items?: InvoiceRow[] } | InvoiceRow[]>(
            path,
          );
          if (cancelled) return;
          if (!res.success || !res.data) {
            setFetchState({
              key: fetchKey,
              options: [],
              error:
                res.error ||
                (isEn ? "Failed to load invoices" : "تعذر تحميل الفواتير"),
            });
            return;
          }
          const rows = extractItems<InvoiceRow>(res.data);
          setFetchState({
            key: fetchKey,
            options: rows.map(normalizeInvoiceOption),
            error: null,
          });
          setActiveIndex(0);
        } else {
          const path = buildPurchasesQueryPath({
            page: 1,
            includeVoided: false,
            search: debouncedQuery || undefined,
          });
          const res = await accountingRequest<PurchaseList>(path);
          if (cancelled) return;
          if (!res.success || !res.data) {
            setFetchState({
              key: fetchKey,
              options: [],
              error:
                res.error ||
                (isEn
                  ? "Failed to load supplier bills"
                  : "تعذر تحميل فواتير الموردين"),
            });
            return;
          }
          const rows = extractItems<PurchaseRow>(res.data);
          setFetchState({
            key: fetchKey,
            options: rows.map(normalizePurchaseOption),
            error: null,
          });
          setActiveIndex(0);
        }
      } catch (err) {
        if (cancelled) return;
        setFetchState({
          key: fetchKey,
          options: [],
          error:
            err instanceof Error
              ? err.message
              : isEn
                ? "Failed to load documents"
                : "تعذر تحميل المستندات",
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchKey, documentType, debouncedQuery, isEn]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const options = fetchState.options;
  const loading = Boolean(fetchKey) && fetchState.key !== fetchKey;
  const error = fetchState.key === fetchKey ? fetchState.error : null;

  const selectedOption = value
    ? pickedOption?.id === value
      ? pickedOption
      : (options.find((item) => item.id === value) ?? null)
    : null;

  function handleSelect(option: AccountingDocumentOption) {
    setPickedOption(option);
    setQuery("");
    setOpen(false);
    onChange(option);
  }

  function handleClear() {
    setPickedOption(null);
    setQuery("");
    onChange(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        options.length === 0 ? 0 : (prev + 1) % options.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        options.length === 0 ? 0 : (prev - 1 + options.length) % options.length,
      );
    } else if (event.key === "Enter") {
      if (options[activeIndex]) {
        event.preventDefault();
        handleSelect(options[activeIndex]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const defaultPlaceholder =
    placeholder ??
    (documentType === "SALE"
      ? isEn
        ? "Search invoice # or customer name..."
        : "ابحث برقم الفاتورة أو اسم العميل..."
      : isEn
        ? "Search supplier or bill number..."
        : "ابحث باسم المورد أو رقم فاتورة المورد...");

  const selectedMeta = selectedOption?.paymentSummary
    ? paymentStatusMeta(selectedOption.paymentSummary.status, isEn, documentType)
    : null;

  return (
    <div ref={containerRef} className="relative w-full">
      {selectedOption && !open ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-2 text-sm">
          <button
            id={controlId}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setOpen(true);
                window.setTimeout(() => inputRef.current?.focus(), 0);
              }
            }}
            aria-expanded={open}
            aria-controls={listboxId}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-start cursor-pointer"
          >
            <span className="font-mono font-bold text-[var(--text-main)]">
              <bdi dir="ltr">{selectedOption.number}</bdi>
            </span>
            <span className="truncate font-semibold text-[var(--text-main)]">
              {selectedOption.partyName}
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              <bdi dir="ltr">{selectedOption.totalAmount}</bdi>{" "}
              {isEn ? "SAR" : "ر.س"}
            </span>
            {selectedMeta && (
              <Badge variant={selectedMeta.variant} className="text-[11px]">
                {selectedMeta.label}
              </Badge>
            )}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            aria-label={isEn ? "Clear selected document" : "مسح المستند المحدد"}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute start-3 size-4 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={controlId}
            type="text"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && options[activeIndex]
                ? `${listboxId}-opt-${options[activeIndex].id}`
                : undefined
            }
            value={query}
            placeholder={defaultPlaceholder}
            onFocus={() => {
              if (!disabled) setOpen(true);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="min-h-11 w-full rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] ps-9 pe-9 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-gold)] focus:outline-none"
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setOpen((prev) => !prev)}
            aria-label={isEn ? "Toggle document list" : "عرض قائمة المستندات"}
            className="absolute end-1.5 inline-flex size-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      )}

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={
            documentType === "SALE"
              ? isEn
                ? "Invoices list"
                : "قائمة الفواتير"
              : isEn
                ? "Supplier bills list"
                : "قائمة فواتير الموردين"
          }
          className="theme-card absolute z-40 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border theme-border p-1.5 shadow-lg"
        >
          {error ? (
            <div className="px-3 py-4 text-center text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          ) : loading && options.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-3 py-5 text-xs text-[var(--text-muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>{isEn ? "Searching..." : "جارٍ البحث..."}</span>
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-5 text-center text-xs text-[var(--text-muted)]">
              {isEn ? "No matching documents found." : "لا توجد مستندات مطابقة."}
            </div>
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.id === value;
              const isActive = idx === activeIndex;
              const meta = opt.paymentSummary
                ? paymentStatusMeta(opt.paymentSummary.status, isEn, documentType)
                : null;
              return (
                <button
                  key={opt.id}
                  id={`${listboxId}-opt-${opt.id}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(opt)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-xs sm:text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[var(--accent-surface)] text-[var(--text-main)]"
                      : "text-[var(--text-main)] hover:bg-[var(--bg-card-subtle)]"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold">
                        <bdi dir="ltr">{opt.number}</bdi>
                      </span>
                      {opt.secondaryRef && (
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">
                          (<bdi dir="ltr">{opt.secondaryRef}</bdi>)
                        </span>
                      )}
                      <span className="truncate font-semibold">
                        {opt.partyName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="font-mono">
                        {isEn ? "Total:" : "الإجمالي:"}{" "}
                        <bdi dir="ltr">{opt.totalAmount}</bdi>{" "}
                        {isEn ? "SAR" : "ر.س"}
                      </span>
                      {opt.paymentSummary && (
                        <span className="font-mono">
                          · {isEn ? "Due:" : "المتبقي:"}{" "}
                          <bdi dir="ltr">{opt.paymentSummary.balance}</bdi>{" "}
                          {isEn ? "SAR" : "ر.س"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {meta && (
                      <Badge variant={meta.variant} className="text-[11px]">
                        {meta.label}
                      </Badge>
                    )}
                    {isSelected && (
                      <Check
                        className="size-4 text-[var(--accent-gold)]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
