"use client";
export default function InvoiceError({ reset }: { error: Error; reset: () => void }) { return <main className="p-8 text-center" dir="rtl"><p role="alert">تعذر تحميل الفاتورة.</p><button onClick={reset} className="gold-gradient-btn mt-4 rounded-xl px-5 py-3">إعادة المحاولة</button></main>; }
