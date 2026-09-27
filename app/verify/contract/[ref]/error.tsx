"use client";
export default function VerificationError({ reset }: { error: Error; reset: () => void }) {
  return <main className="p-8 text-center"><p>تعذر الاتصال بخدمة التوثيق</p><button onClick={reset} className="gold-gradient-btn p-3 rounded-xl mt-4">إعادة المحاولة</button></main>;
}
