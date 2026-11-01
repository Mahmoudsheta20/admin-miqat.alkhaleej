"use client";
import { useUiText } from "@/lib/ui-text";

export default function Loading() {
  const ui = useUiText();
 return <p className="p-8 text-center" role="status">{ui("جارٍ التحقق من العقد…")}</p>; }
