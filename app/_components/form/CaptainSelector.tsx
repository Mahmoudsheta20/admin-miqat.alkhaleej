"use client";
import type { SystemUser } from "@/lib/types";
import { useUiText } from "@/lib/ui-text";
import { useLanguage } from "@/lib/languageContext";
import SearchSelect from "./SearchSelect";
export type CaptainWithMeta = SystemUser & { contractCount?: number; hasTodayInspection?: boolean };
export interface CaptainSelectorProps { label?: string; captains: CaptainWithMeta[]; selectedCaptainId: string; onSelectCaptain: (captain: CaptainWithMeta) => void; error?: string; required?: boolean; className?: string }
export function CaptainSelector({ label = "إسناد الرحلة للكابتن", captains, selectedCaptainId, onSelectCaptain, error, required = true, className }: CaptainSelectorProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  return <SearchSelect label={ui(label)} value={selectedCaptainId} error={error} isRequired={required} className={className} options={captains.map(captain => ({ id: captain.id, label: captain.name, description: [captain.phone, captain.assignedVehiclePlate, captain.hasTodayInspection ? language === "ar" ? "تم الفحص اليوم" : "Inspected today" : language === "ar" ? "بانتظار الفحص" : "Inspection pending"].filter(Boolean).join(" · ") }))} onChange={id => { const captain = captains.find(item => item.id === id); if (captain) onSelectCaptain(captain); }} />;
}
