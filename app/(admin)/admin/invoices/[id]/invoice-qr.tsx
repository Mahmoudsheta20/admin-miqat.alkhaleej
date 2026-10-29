"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { backendUrl, getAuthToken } from "@/lib/backend";
interface InvoiceQrProps { invoiceId: string }
export default function InvoiceQr({ invoiceId }: InvoiceQrProps) {
  const [image, setImage] = useState(""), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let url = "";
    const token = getAuthToken();
    void fetch(backendUrl(`/invoices/${encodeURIComponent(invoiceId)}/qr.png`), { cache: "no-store", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); const bytes = await response.blob(); if (controller.signal.aborted) return; url = URL.createObjectURL(bytes); setImage(url); })
      .catch(() => { if (!controller.signal.aborted) setError("تعذر عرض رمز QR"); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [invoiceId]);
  return image ? <Image src={image} alt="رمز رابط الفاتورة" width={180} height={180} unoptimized className="rounded-lg" /> : <p className="text-sm text-slate-500">{error || "جارٍ تحميل الرمز…"}</p>;
}
