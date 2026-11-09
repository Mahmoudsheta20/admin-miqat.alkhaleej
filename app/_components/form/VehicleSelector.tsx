"use client";
import type { Vehicle } from "@/lib/types";
import { useUiText } from "@/lib/ui-text";
import { useLanguage } from "@/lib/languageContext";
import SearchSelect from "./SearchSelect";
export interface VehicleSelectorProps { label?: string; vehicles: Vehicle[]; selectedPlate: string; onSelectVehicle: (vehicle: Vehicle) => void; captainPlate?: string | null; error?: string; required?: boolean; disabled?: boolean; className?: string }
export function VehicleSelector({ label = "المركبة المسندة للرحلة", vehicles, selectedPlate, onSelectVehicle, captainPlate, error, required = true, disabled, className }: VehicleSelectorProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const selected = vehicles.find(vehicle => vehicle.plateNumberAr === selectedPlate || vehicle.plateNumberEn.toLowerCase() === selectedPlate.toLowerCase());
  return <SearchSelect label={ui(label)} value={selected?.id || selectedPlate} error={error} isRequired={required} isDisabled={disabled} className={className} options={vehicles.map(vehicle => ({ id: vehicle.id, label: `${vehicle.plateNumberAr} · ${vehicle.make} ${vehicle.model}`, description: [vehicle.plateNumberEn, `${vehicle.capacity} ${language === "ar" ? "مقعد" : "seats"}`, captainPlate === vehicle.plateNumberAr ? language === "ar" ? "مركبة الكابتن" : "Captain’s vehicle" : ""].filter(Boolean).join(" · ") }))} onChange={id => { const vehicle = vehicles.find(item => item.id === id); if (vehicle) onSelectVehicle(vehicle); }} />;
}
