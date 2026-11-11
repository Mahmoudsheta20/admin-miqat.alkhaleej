"use client";
import { useUiText } from "@/lib/ui-text";


import { useEffect } from "react";

interface RouteErrorProps { error: Error & { digest?: string }; retry: () => void }
export default function RouteError({ error, retry }: RouteErrorProps) {
  const ui = useUiText();

  useEffect(() => { console.error("Page failed to render:", error); }, [error]);
  return <div role="alert" className="mx-auto my-8 max-w-lg rounded-2xl theme-card p-5 text-center sm:p-8">
    <h2 className="text-lg font-bold">{ui("تعذر عرض الصفحة")}</h2>
    <p className="mt-2 text-sm text-[var(--text-muted)]">{ui("حدث خطأ أثناء تحميل البيانات. يرجى إعادة المحاولة.")}</p>
    <button type="button" onClick={retry} className="mt-5 min-h-11 rounded-xl gold-gradient-btn px-5 py-2">{ui("إعادة المحاولة")}</button>
  </div>;
}
