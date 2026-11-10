"use client";
import { useUiText, LocalizedText } from "@/lib/ui-text";

import React, { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

import FormField from "./FormField";
import { FullscreenSelect } from "./FullscreenSelect";

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  options: SelectOption[];
  badge?: string;
  expandable?: boolean;
  onValueChange?: (value: string) => void;
}

export const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>(
  (
    {
      id,
      label,
      error,
      hint,
      icon,
      options,
      badge,
      required,
      className = "",
      disabled,
      expandable = true,
      onValueChange,
      onChange,
      onBlur,
      value,
      defaultValue,
      name,
      ...props
    },
    ref,
  ) => {
    const ui = useUiText();
    const generatedId = useId();
    const fieldId = id || generatedId;

    if (expandable) {
      const currentValue =
        value !== undefined
          ? String(value)
          : defaultValue !== undefined
            ? String(defaultValue)
            : "";

      return (
        <FullscreenSelect
          id={fieldId}
          name={name}
          label={label}
          error={error}
          hint={hint}
          icon={icon}
          badge={badge}
          required={required}
          disabled={disabled}
          className={className}
          value={currentValue}
          onChange={(nextValue) => {
            onValueChange?.(nextValue);
            if (onChange) {
              const target = document.createElement("select");
              target.name = name || "";
              const opt = document.createElement("option");
              opt.value = nextValue;
              opt.selected = true;
              target.add(opt);
              const syntheticEvent = {
                target,
                currentTarget: target,
              } as React.ChangeEvent<HTMLSelectElement>;
              onChange(syntheticEvent);
            }
          }}
          onBlur={
            onBlur
              ? () => {
                  const target = document.createElement("select");
                  target.name = name || "";
                  target.value = currentValue;
                  const syntheticBlur = {
                    target,
                    currentTarget: target,
                  } as React.FocusEvent<HTMLSelectElement>;
                  onBlur(syntheticBlur);
                }
              : undefined
          }
          options={options.map((opt) => ({
            value: opt.value,
            label: ui(opt.label),
            badge: opt.badge,
            disabled: opt.disabled,
          }))}
        />
      );
    }

    return (
      <FormField
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        badge={badge}
      >
        <div className="relative flex items-center">
          {icon && (
            <div
              aria-hidden="true"
              className="absolute start-3 text-[var(--text-muted)] pointer-events-none flex items-center justify-center"
            >
              <LocalizedText value={icon} />
            </div>
          )}

          <select
            ref={ref}
            disabled={disabled}
            name={name}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onBlur={onBlur}
            {...props}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={
              [props["aria-describedby"], (error || hint) && `${fieldId}-description`]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={`min-w-0 w-full min-h-12 py-2.5 text-base rounded-xl transition-all duration-150 outline-hidden font-medium leading-normal appearance-none cursor-pointer
              ${icon ? "ps-10" : "ps-4"}
              pe-10
              ${
                error
                  ? "bg-rose-500/5 border border-rose-500/50 text-rose-950 dark:text-rose-100 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : "bg-white dark:bg-slate-900/80 border theme-border text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}
              ${className}`}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5"
              >
                {ui(opt.label)}
              </option>
            ))}
          </select>

          <div
            aria-hidden="true"
            className="absolute end-3 text-[var(--text-muted)] pointer-events-none flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </FormField>
    );
  },
);

CustomSelect.displayName = "CustomSelect";
