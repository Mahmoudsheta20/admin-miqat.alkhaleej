"use client";
import { useUiText } from "@/lib/ui-text";


interface LoadErrorProps { message: string; onRetry: () => void; isLoading?: boolean }
export default function LoadError({ message, onRetry, isLoading }: LoadErrorProps) {
  const ui = useUiText();

  if (!message) return null;
  return <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="min-w-0 text-sm font-medium text-rose-800 dark:text-rose-200">{ui(message)}</p>
    <button type="button" disabled={isLoading} onClick={onRetry} className="min-h-11 sm:min-h-9 shrink-0 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-3.5 py-1.5 text-xs sm:text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-card-subtle)] transition disabled:opacity-50 cursor-pointer">{ui("إعادة المحاولة")}</button>
  </div>;
}
