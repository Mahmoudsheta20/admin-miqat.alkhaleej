"use client";

import { useLanguage } from "@/lib/languageContext";
import { FullscreenSelect } from "./FullscreenSelect";

export interface SearchSelectOption {
  id: string;
  label: string;
  description?: string;
}

interface SearchSelectProps {
  label: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
}

/**
 * Full-screen searchable selector used for assigning captains and fleet vehicles.
 */
export default function SearchSelect({
  label,
  options,
  value,
  onChange,
  error,
  isRequired,
  isDisabled,
  className = "",
}: SearchSelectProps) {
  const { language } = useLanguage();
  const placeholder = language === "ar" ? "اختر من القائمة" : "Choose an option";

  return (
    <FullscreenSelect
      className={`search-select ${className}`}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(nextId) => onChange(nextId)}
      required={isRequired}
      disabled={isDisabled}
      error={error}
      searchable
      showSelectedDescription
      columns={options.length > 4 ? 2 : 1}
      dataAttributes={{ "data-search-select": "true" }}
      options={options.map((option) => ({
        value: option.id,
        label: option.label,
        description: option.description,
      }))}
    />
  );
}
