"use client";
import { useUiText } from "@/lib/ui-text";

export default function Loading() {
  const ui = useUiText();
 return <p role="status" className="animate-pulse p-6">{ui("جارٍ تحميل بيانات الشركة…")}</p>; }
