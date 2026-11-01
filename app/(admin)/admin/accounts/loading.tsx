"use client";
import { useUiText } from "@/lib/ui-text";

export default function Loading(){
  const ui = useUiText();
return <div role="status" className="theme-card h-80 animate-pulse rounded-2xl"><span className="sr-only">{ui("جارٍ التحميل")}</span></div>;}
