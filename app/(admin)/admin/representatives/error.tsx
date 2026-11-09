"use client";
import { useUiText } from "@/lib/ui-text";
export default function ErrorPage({reset}:{reset:()=>void}){const ui=useUiText();return <div role="alert"><p>{ui("تعذر تحميل الصفحة")}</p><button className="theme-input rounded-lg border p-3" onClick={reset}>{ui("إعادة المحاولة")}</button></div>;}
