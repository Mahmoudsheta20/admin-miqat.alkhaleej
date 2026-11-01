"use client";
import { useUiText } from "@/lib/ui-text";


export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const ui = useUiText();

  return (
    <div role="alert" className="theme-card rounded-2xl p-6">
      <p>{ui("تعذر تحميل شجرة الحسابات.")}</p>
      <button className="gold-gradient-btn mt-4 rounded-xl px-4 py-3" onClick={reset}>
        {ui("إعادة المحاولة")}</button>
    </div>
  );
}
