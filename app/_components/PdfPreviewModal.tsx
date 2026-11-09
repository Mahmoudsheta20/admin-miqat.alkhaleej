"use client";
import DocumentPreview from "./documents/DocumentPreview";
import { backendUrl } from "@/lib/backend";
import { useLanguage } from "@/lib/languageContext";
interface PdfPreviewModalProps { isOpen: boolean; onClose: () => void; contractId?: string; referenceNumber?: string; pdfUrl?: string | null }
function withDownloadFlag(url: string): string {
  const [base, hash] = url.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}download=1${hash ? `#${hash}` : ""}`;
}
export default function PdfPreviewModal({ isOpen, onClose, contractId, referenceNumber, pdfUrl }: PdfPreviewModalProps) {
  const { language } = useLanguage();
  if (!isOpen) return null;
  const id = contractId || referenceNumber;
  const url = id ? backendUrl(`/contracts/${encodeURIComponent(id)}/pdf`) : pdfUrl?.trim() || null;
  return <DocumentPreview title={language === "ar" ? "معاينة العقد" : "Contract preview"} reference={referenceNumber || id} url={url} downloadUrl={url && id ? withDownloadFlag(url) : url} onClose={onClose} />;
}
