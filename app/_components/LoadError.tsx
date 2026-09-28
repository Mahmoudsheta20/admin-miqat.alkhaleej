"use client";

interface LoadErrorProps { message: string; onRetry: () => void; isLoading?: boolean }
export default function LoadError({ message, onRetry, isLoading }: LoadErrorProps) {
  if (!message) return null;
  return <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="min-w-0 text-sm text-rose-700 dark:text-rose-300">{message}</p>
    <button type="button" disabled={isLoading} onClick={onRetry} className="min-h-11 shrink-0 rounded-lg border theme-border px-4 text-sm font-bold disabled:opacity-50">إعادة المحاولة</button>
  </div>;
}
