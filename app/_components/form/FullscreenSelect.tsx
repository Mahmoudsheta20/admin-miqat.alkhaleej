"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { useFullscreenDialogClose } from "./FullscreenDialog";
import ResponsivePickerOverlay, {
  useIsPickerFullscreen,
  usePickerDisclosure,
} from "./ResponsivePickerOverlay";

export interface FullscreenSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
  keywords?: string;
}

export interface FullscreenSelectProps {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  subtitle?: string;
  value: string;
  onChange: (value: string, option?: FullscreenSelectOption) => void;
  onBlur?: () => void;
  options: FullscreenSelectOption[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  badge?: string;
  searchable?: boolean | "auto";
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean | "true" | "false";
  ariaDescribedBy?: string;
  className?: string;
  triggerClassName?: string;
  displayValue?: string;
  dir?: "rtl" | "ltr" | "auto";
  icon?: ReactNode;
  clearable?: boolean;
  clearLabel?: string;
  showSelectedDescription?: boolean;
  columns?: 1 | 2;
  footerAction?: ReactNode;
  dataAttributes?: Record<string, string>;
  buttonRef?: (instance: HTMLButtonElement | null) => void;
}

interface SelectModalBodyProps {
  title: string;
  options: FullscreenSelectOption[];
  selectedValue: string;
  searchable: boolean;
  controlledSearch?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder: string;
  isLoading: boolean;
  emptyMessage: string;
  dir?: "rtl" | "ltr" | "auto";
  columns: 1 | 2;
  clearable: boolean;
  clearLabel: string;
  footerAction?: ReactNode;
  onSelect: (value: string, option?: FullscreenSelectOption) => void;
}

function SelectModalBody({
  title,
  options,
  selectedValue,
  searchable,
  controlledSearch,
  onSearchChange,
  searchPlaceholder,
  isLoading,
  emptyMessage,
  dir,
  columns,
  clearable,
  clearLabel,
  footerAction,
  onSelect,
}: SelectModalBodyProps) {
  const { language, dir: appDir } = useLanguage();
  const isFullscreen = useIsPickerFullscreen();
  const requestDialogClose = useFullscreenDialogClose();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const [internalSearch, setInternalSearch] = useState("");
  const isRemoteSearch = typeof onSearchChange === "function";
  const query = isRemoteSearch ? (controlledSearch ?? "") : internalSearch;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputId = useId();

  const selectableOptions = useMemo(
    () =>
      options.filter(
        (opt) => !(opt.value === "" && opt.disabled),
      ),
    [options],
  );

  const filteredOptions = useMemo(() => {
    if (isRemoteSearch || !query.trim()) {
      return selectableOptions;
    }
    const q = query.trim().toLowerCase();
    return selectableOptions.filter((opt) =>
      `${opt.label} ${opt.description || ""} ${opt.badge || ""} ${opt.keywords || ""} ${opt.value}`
        .toLowerCase()
        .includes(q),
    );
  }, [selectableOptions, isRemoteSearch, query]);

  const enabledOptions = useMemo(
    () => filteredOptions.filter((opt) => !opt.disabled),
    [filteredOptions],
  );

  const initialHighlight = Math.max(
    0,
    filteredOptions.findIndex((opt) => opt.value === selectedValue && !opt.disabled),
  );
  const [highlightedIndex, setHighlightedIndex] = useState(initialHighlight);
  const activeHighlight =
    filteredOptions.length === 0
      ? -1
      : Math.min(highlightedIndex, filteredOptions.length - 1);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (searchable) {
          searchInputRef.current?.focus({ preventScroll: true });
        } else {
          const selectedBtn =
            optionRefs.current[initialHighlight] || firstOptionRef.current;
          selectedBtn?.focus({ preventScroll: true });
        }
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
    // Run only when this modal body mounts (keyed by sessionKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoose = (option: FullscreenSelectOption) => {
    if (option.disabled) return;
    onSelect(option.value, option);
    void requestDialogClose?.();
  };

  const handleClear = () => {
    onSelect("", undefined);
    void requestDialogClose?.();
  };

  const handleSearchUpdate = (nextQuery: string) => {
    if (isRemoteSearch) {
      onSearchChange?.(nextQuery);
    } else {
      setInternalSearch(nextQuery);
    }
    setHighlightedIndex(0);
  };

  const moveEnabledFocus = (fromIndex: number, direction: 1 | -1 | "start" | "end") => {
    if (filteredOptions.length === 0) return;
    let candidate = fromIndex;
    if (direction === "start") {
      candidate = filteredOptions.findIndex((opt) => !opt.disabled);
    } else if (direction === "end") {
      for (let i = filteredOptions.length - 1; i >= 0; i -= 1) {
        if (!filteredOptions[i].disabled) {
          candidate = i;
          break;
        }
      }
    } else {
      let next = fromIndex + direction;
      while (next >= 0 && next < filteredOptions.length && filteredOptions[next]?.disabled) {
        next += direction;
      }
      candidate = next;
    }
    if (candidate >= 0 && candidate < filteredOptions.length && !filteredOptions[candidate]?.disabled) {
      setHighlightedIndex(candidate);
      optionRefs.current[candidate]?.focus({ preventScroll: true });
      optionRefs.current[candidate]?.scrollIntoView({ block: "nearest" });
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "ArrowDown" && filteredOptions.length > 0) {
      event.preventDefault();
      const base = activeHighlight < 0 ? 0 : activeHighlight;
      const next = Math.min(filteredOptions.length - 1, base + 1);
      setHighlightedIndex(next);
      optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "ArrowUp" && filteredOptions.length > 0) {
      event.preventDefault();
      const base = activeHighlight < 0 ? 0 : activeHighlight;
      const prev = Math.max(0, base - 1);
      setHighlightedIndex(prev);
      optionRefs.current[prev]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && enabledOptions.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      const candidate = activeHighlight >= 0 ? filteredOptions[activeHighlight] : undefined;
      const target =
        candidate && !candidate.disabled ? candidate : enabledOptions[0];
      if (target) {
        handleChoose(target);
      }
    }
  };

  const resolvedDir = dir ?? appDir;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isFullscreen ? "h-full gap-5" : "gap-2.5",
      )}
    >
      {searchable && (
        <search className="shrink-0">
          <div className="relative">
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-muted)]",
                isFullscreen ? "start-3.5 h-4 w-4" : "start-2.5 h-3.5 w-3.5",
              )}
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              id={searchInputId}
              type="search"
              dir={resolvedDir}
              autoFocus
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={query}
              onChange={(event) => handleSearchUpdate(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label={`${text("بحث في:", "Search:")} ${title}`}
              placeholder={searchPlaceholder}
              className={cn(
                "theme-input w-full border border-[var(--control-border)] bg-[var(--input-bg)] font-medium text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-[var(--accent-gold)]/20 focus:outline-hidden",
                isFullscreen
                  ? "min-h-11 rounded-xl border-2 py-2.5 ps-11 pe-11 text-base focus:ring-2"
                  : "min-h-9 rounded-lg border py-1.5 ps-8 pe-8 text-xs sm:text-[0.8125rem] focus:ring-2",
              )}
            />
            {query && (
              <button
                type="button"
                aria-label={text("مسح البحث", "Clear search")}
                onClick={() => {
                  handleSearchUpdate("");
                  searchInputRef.current?.focus({ preventScroll: true });
                }}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-main)] cursor-pointer transition",
                  isFullscreen
                    ? "end-1 min-h-9 min-w-9 rounded-lg"
                    : "end-1 min-h-7 min-w-7",
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </search>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
        {isLoading && filteredOptions.length === 0 ? (
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
            <span>{text("جارٍ التحميل…", "Loading options…")}</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed theme-border text-center",
              isFullscreen ? "min-h-40 p-8" : "min-h-24 p-5",
            )}
          >
            <p
              className={cn(
                "font-semibold text-[var(--text-main)]",
                isFullscreen ? "text-base sm:text-lg" : "text-sm sm:text-base",
              )}
            >
              {emptyMessage}
            </p>
            {query && (
              <button
                type="button"
                onClick={() => handleSearchUpdate("")}
                className="mt-1 inline-flex min-h-10 items-center rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3.5 py-1.5 text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] cursor-pointer transition"
              >
                {text("إظهار جميع الخيارات", "Show all options")}
              </button>
            )}
          </div>
        ) : (
          <ul
            role="list"
            className={cn(
              "grid",
              isFullscreen
                ? cn(
                    "gap-3",
                    columns === 2 || filteredOptions.length > 6
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1",
                  )
                : "grid-cols-1 gap-1.5",
            )}
          >
            {filteredOptions.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isHighlighted = index === activeHighlight;
              return (
                <li key={`${option.value}-${index}`} className="min-w-0">
                  <button
                    ref={(el) => {
                      optionRefs.current[index] = el;
                      if (index === 0) firstOptionRef.current = el;
                    }}
                    type="button"
                    disabled={option.disabled}
                    aria-pressed={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        moveEnabledFocus(index, 1);
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        moveEnabledFocus(index, -1);
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        moveEnabledFocus(index, "start");
                      } else if (event.key === "End") {
                        event.preventDefault();
                        moveEnabledFocus(index, "end");
                      }
                    }}
                    onClick={() => handleChoose(option)}
                    className={cn(
                      "fullscreen-select-option flex w-full items-start justify-between text-start transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                      isFullscreen
                        ? "min-h-12 gap-3 rounded-xl border px-3.5 py-2.5 text-base"
                        : "min-h-9 gap-2 rounded-lg border px-2.5 py-1.5 text-xs sm:text-[0.8125rem]",
                      isSelected
                        ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--text-main)] shadow-xs"
                        : isHighlighted
                          ? "border-[var(--accent-gold)]/55 bg-[var(--bg-card-subtle)] text-[var(--text-main)]"
                          : "border theme-border bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent-gold)]/50 hover:bg-[var(--bg-card-subtle)]",
                    )}
                  >
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "leading-snug",
                            isFullscreen
                              ? "text-base font-bold"
                              : "text-xs sm:text-[0.8125rem] font-bold",
                            isSelected
                              ? "text-[var(--accent-gold)]"
                              : "text-[var(--text-main)]",
                          )}
                        >
                          {option.label}
                        </span>
                        {option.badge && (
                          <span className="rounded-md border theme-border bg-[var(--bg-card-subtle)] px-1.5 py-0.5 text-[11px] font-mono font-bold text-[var(--text-main)]">
                            {option.badge}
                          </span>
                        )}
                      </span>
                      {option.description && (
                        <span
                          className={cn(
                            "block text-[var(--text-muted)] leading-snug",
                            isFullscreen ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs",
                          )}
                        >
                          {option.description}
                        </span>
                      )}
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 flex shrink-0 items-center justify-center rounded-full border transition-colors",
                        isFullscreen ? "h-6 w-6" : "h-5 w-5",
                        isSelected
                          ? "border-[var(--accent-btn-border)] bg-[var(--accent-btn-bg)] text-[var(--accent-btn-fg)]"
                          : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-transparent",
                      )}
                    >
                      <Check className={isFullscreen ? "h-3.5 w-3.5" : "h-3 w-3"} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(footerAction || (clearable && selectedValue !== "")) && (
        <div
          className={cn(
            "shrink-0 flex flex-wrap items-center justify-between gap-2 border-t theme-border",
            isFullscreen ? "pt-4" : "pt-2.5",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {footerAction}
            {clearable && selectedValue !== "" && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] cursor-pointer transition",
                  isFullscreen
                    ? "min-h-11 px-3.5 py-2 text-sm"
                    : "min-h-8 px-2.5 py-1 text-xs",
                )}
              >
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{clearLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Accessible select control that automatically opens its option list inside an
 * animated full-screen top-layer `<dialog>` for spacious, high-readability selection.
 */
export function FullscreenSelect({
  id,
  name,
  label,
  placeholder,
  subtitle,
  value,
  onChange,
  onBlur,
  options,
  required = false,
  disabled = false,
  error,
  hint,
  badge,
  searchable = "auto",
  searchValue,
  onSearchChange,
  searchPlaceholder,
  isLoading = false,
  emptyMessage,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  className = "",
  triggerClassName = "",
  displayValue,
  dir,
  icon,
  clearable = false,
  clearLabel,
  showSelectedDescription = false,
  columns = 1,
  footerAction,
  dataAttributes,
  buttonRef,
}: FullscreenSelectProps) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const generatedId = useId();
  const fieldId = id || generatedId;
  const overlayId = `${fieldId}-picker`;
  const {
    isMobile,
    open,
    sessionKey,
    triggerRef,
    overlayRef,
    openOverlay,
    toggleFromTrigger,
    closeOverlay,
  } = usePickerDisclosure({ disabled, onClose: onBlur });

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      buttonRef?.(node);
    },
    [triggerRef, buttonRef],
  );

  const selectableCount = useMemo(
    () => options.filter((opt) => !(opt.value === "" && opt.disabled)).length,
    [options],
  );
  const enableSearch =
    searchable === true || (searchable === "auto" && selectableCount > 6);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const emptyPlaceholderOption = useMemo(
    () => options.find((opt) => opt.value === ""),
    [options],
  );

  const resolvedPlaceholder =
    placeholder ||
    emptyPlaceholderOption?.label ||
    text("اختر من القائمة", "Choose an option");

  const resolvedTitle =
    (label ? label.replace(/\s*\*$/, "") : undefined) ||
    ariaLabel ||
    resolvedPlaceholder;

  const resolvedSubtitle =
    subtitle ||
    (enableSearch
      ? text(
          "ابحث أو اختر من القائمة بملء الشاشة لسهولة القراءة والاختيار",
          "Search or choose from a spacious full-screen list",
        )
      : text(
          "اختر الخيار المطلوب من القائمة بملء الشاشة",
          "Choose the required option from the full-screen list",
        ));

  const visibleTriggerText =
    displayValue ?? selectedOption?.label ?? (value || resolvedPlaceholder);
  const isShowingPlaceholder = !selectedOption && !value && !displayValue;

  const computedDescribedBy =
    [
      ariaDescribedBy,
      (error || hint) && label ? `${fieldId}-description` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const triggerButton = (
    <div dir={dir} className="relative flex min-w-0 items-center gap-1.5">
      <button
        ref={setTriggerRef}
        id={fieldId}
        name={name}
        value={value}
        data-value={value}
        data-required={required ? "true" : undefined}
        data-invalid={
          error || ariaInvalid === true || ariaInvalid === "true"
            ? "true"
            : undefined
        }
        type="button"
        disabled={disabled}
        aria-label={!label ? ariaLabel || resolvedPlaceholder : undefined}
        aria-haspopup={isMobile ? "dialog" : undefined}
        aria-expanded={open}
        aria-controls={!isMobile && open ? overlayId : undefined}
        aria-describedby={computedDescribedBy}
        onClick={toggleFromTrigger}
        onKeyDown={(event) => {
          if (
            !disabled &&
            (event.key === "ArrowDown" ||
              event.key === "ArrowUp" ||
              event.key === "F2")
          ) {
            event.preventDefault();
            openOverlay();
          }
        }}
        {...dataAttributes}
        className={cn(
          "min-w-0 w-full min-h-11 sm:min-h-9 px-3 py-1.5 text-base sm:text-[0.8125rem] rounded-lg transition-all duration-150 outline-hidden font-medium leading-normal flex items-center justify-between gap-2 text-start cursor-pointer",
          error || ariaInvalid === true || ariaInvalid === "true"
            ? "bg-rose-500/5 border border-rose-500/60 text-rose-950 dark:text-rose-100 focus-visible:border-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500/20"
            : "bg-[var(--input-bg)] border border-[var(--control-border)] text-[var(--text-main)] focus-visible:border-[var(--accent-gold)] focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]/20",
          disabled && "opacity-55 cursor-not-allowed bg-[var(--bg-card-subtle)]",
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {icon && (
            <span
              aria-hidden="true"
              className="shrink-0 text-[var(--text-muted)] flex items-center justify-center"
            >
              {icon}
            </span>
          )}
          <span
            className={cn(
              "min-w-0 truncate",
              isShowingPlaceholder && "text-[var(--text-placeholder)] font-normal",
            )}
          >
            {visibleTriggerText}
          </span>
          {selectedOption?.badge && !displayValue && (
            <span className="hidden sm:inline-flex shrink-0 rounded-md border theme-border bg-[var(--bg-card-subtle)] px-1.5 py-0.5 text-[11px] font-mono font-bold text-[var(--text-main)]">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150",
            open && "rotate-180 text-[var(--accent-gold)]",
          )}
        />
      </button>

      {clearable && value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("", undefined)}
          aria-label={clearLabel || text("مسح التحديد", "Clear selection")}
          title={clearLabel || text("مسح التحديد", "Clear selection")}
          className="inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)] hover:text-[var(--text-main)] cursor-pointer transition"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );

  const modal = (
    <ResponsivePickerOverlay
      open={open}
      onClose={closeOverlay}
      anchorRef={triggerRef}
      overlayRef={overlayRef}
      overlayId={overlayId}
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      icon={icon || <Search className="h-4 w-4" aria-hidden="true" />}
      matchTriggerWidth
      minPopoverWidth={columns === 2 ? 360 : 320}
      maxPopoverWidth={columns === 2 ? 520 : 600}
      preferredMaxHeight={440}
      dir={dir}
    >
      <SelectModalBody
        key={sessionKey}
        title={resolvedTitle}
        options={options}
        selectedValue={value}
        searchable={enableSearch}
        controlledSearch={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={
          searchPlaceholder ||
          resolvedTitle ||
          text("ابحث بالاسم أو الكود أو التفاصيل…", "Search by name, code, or details…")
        }
        isLoading={isLoading}
        emptyMessage={
          emptyMessage || text("لا توجد نتائج مطابقة", "No matching results")
        }
        dir={dir}
        columns={columns}
        clearable={clearable}
        clearLabel={clearLabel || text("مسح التحديد", "Clear selection")}
        footerAction={footerAction}
        onSelect={onChange}
      />
    </ResponsivePickerOverlay>
  );

  if (!label) {
    return (
      <div className={cn("min-w-0", className)}>
        {triggerButton}
        {showSelectedDescription && selectedOption?.description && (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {selectedOption.description}
          </p>
        )}
        {modal}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <FormField
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        badge={badge}
      >
        {triggerButton}
        {showSelectedDescription && selectedOption?.description && (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {selectedOption.description}
          </p>
        )}
        {modal}
      </FormField>
    </div>
  );
}
