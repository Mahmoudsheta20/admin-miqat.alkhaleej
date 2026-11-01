"use client";
import { useUiText } from "@/lib/ui-text";

export default function Loading() {
  const ui = useUiText();
 return <p role="status" className="p-8 text-center">{ui("جارٍ تحميل الفاتورة…")}</p>; }
