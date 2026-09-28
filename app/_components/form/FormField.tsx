"use client";

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export default function FormField({ id, label, error, hint, required, badge, children }: FormFieldProps) {
  return <div className="w-full min-w-0 space-y-1.5">
    {label && <div className="flex flex-wrap items-center justify-between gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">{label}{required && <span aria-hidden="true" className="text-rose-500">*</span>}</label>
      {badge && <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{badge}</span>}
    </div>}
    {children}
    {(error || hint) && <p id={`${id}-description`} role={error ? "alert" : undefined} className={`flex items-start gap-1 text-xs ${error ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
      {error && <AlertCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />}<span>{error || hint}</span>
    </p>}
  </div>;
}
