"use client";
import DocumentPreview from "./documents/DocumentPreview";
import { backendUrl } from "@/lib/backend";
import { useLanguage } from "@/lib/languageContext";
interface InspectionPdfPreviewModalProps { isOpen: boolean; onClose: () => void; inspectionId?: string | null; captainName?: string; vehiclePlate?: string; pdfUrl?: string | null }
function withDownloadFlag(url: string): string {
  const [base, hash] = url.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}download=1${hash ? `#${hash}` : ""}`;
}
export default function InspectionPdfPreviewModal({ isOpen, onClose, inspectionId, captainName, vehiclePlate, pdfUrl }: InspectionPdfPreviewModalProps) {
  const { language } = useLanguage();
  if (!isOpen) return null;
  const url = inspectionId ? backendUrl(`/inspections/${encodeURIComponent(inspectionId)}/pdf`) : pdfUrl?.trim() || null;
  return <DocumentPreview title={language === "ar" ? "معاينة فحص المركبة" : "Vehicle inspection preview"} reference={[captainName, vehiclePlate].filter(Boolean).join(" · ")} url={url} downloadUrl={url && inspectionId ? withDownloadFlag(url) : url} onClose={onClose} />;
}
