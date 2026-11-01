"use client";
import { useUiText } from "@/lib/ui-text";

export default function VerificationError({ reset }: { error: Error; reset: () => void }) {
  const ui = useUiText();

  return <main className="p-8 text-center"><p>{ui("تعذر الاتصال بخدمة التوثيق")}</p><button onClick={reset} className="gold-gradient-btn p-3 rounded-xl mt-4">{ui("إعادة المحاولة")}</button></main>;
}
