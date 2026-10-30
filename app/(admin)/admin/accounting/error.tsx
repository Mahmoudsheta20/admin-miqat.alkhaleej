"use client";
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <div role="alert" className="theme-card rounded-2xl p-6"><p>تعذر تحميل صفحة المحاسبة.</p><button className="gold-gradient-btn mt-4 rounded-xl px-4 py-3" onClick={reset}>إعادة المحاولة</button></div>;}
