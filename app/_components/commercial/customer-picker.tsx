"use client";

import * as React from "react";
import type { Customer } from "@/lib/commercial";
import { useUiText } from "@/lib/ui-text";
import { Label } from "@/app/_components/ui";
import { CustomerCombobox } from "./customer-combobox";

export default function CustomerPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (customer: Customer | null) => void;
}) {
  const ui = useUiText();
  const fieldId = React.useId();

  return (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-2">
      <Label htmlFor={fieldId}>{ui("ربط الفاتورة بملف عميل")}</Label>
      <CustomerCombobox
        id={fieldId}
        value={value || null}
        emptyLabel="إدخال يدوي بدون ربط"
        onSelect={onSelect}
      />
    </div>
  );
}
