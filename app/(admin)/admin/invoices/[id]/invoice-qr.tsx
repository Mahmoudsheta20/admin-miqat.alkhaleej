"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { backendUrl, getAuthToken } from "@/lib/backend";
interface InvoiceQrProps { invoiceId: string; isTax?: boolean }
export default function InvoiceQr({ invoiceId, isTax = false }: InvoiceQrProps) {
  const [image, setImage] = useState(""), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let url = "";
    const token = getAuthToken();
    void fetch(backendUrl(`/invoices/${encodeURIComponent(invoiceId)}/${isTax ? "tax-qr.png" : "qr.png"}`), { cache: "no-store", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); const bytes = await response.blob(); if (controller.signal.aborted) return; url = URL.createObjectURL(bytes); setImage(url); })
      .catch(() => { if (!controller.signal.aborted) setError("تعذر عرض رمز QR"); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [invoiceId, isTax]);
  return image ? (
    <figure className="text-center">
      <Image
        src={image}
        alt={isTax ? "رمز الفاتورة الضريبية | Tax Invoice QR" : "رمز رابط الفاتورة"}
        width={180}
        height={180}
        unoptimized
        className="mx-auto rounded-lg"
      />
      {isTax && (
        <figcaption className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          رمز الفاتورة الضريبية | <span dir="ltr">Tax Invoice QR</span>
        </figcaption>
      )}
    </figure>
  ) : (
    <p className="text-sm text-slate-500">{error || "جارٍ تحميل الرمز…"}</p>
  );
}
