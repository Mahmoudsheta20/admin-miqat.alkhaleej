"use client";
import { useUiText } from "@/lib/ui-text";

export default function InvoiceError({ reset }: { error: Error; reset: () => void }) {
  const ui = useUiText();
 return <main className="p-8 text-center" dir={ui.dir}><p role="alert">{ui("تعذر تحميل الفاتورة.")}</p><button onClick={reset} className="gold-gradient-btn mt-4 rounded-xl px-5 py-3">{ui("إعادة المحاولة")}</button></main>; }
