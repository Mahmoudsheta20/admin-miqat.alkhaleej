"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Car,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Vehicle } from "@/lib/types";

export interface VehicleSelectorProps {
  label?: string;
  vehicles: Vehicle[];
  selectedPlate: string;
  onSelectVehicle: (vehicle: Vehicle) => void;
  captainPlate?: string | null;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function VehicleSelector({
  label = "المركبة المسندة للرحلة",
  vehicles,
  selectedPlate,
  onSelectVehicle,
  captainPlate,
  error,
  required = true,
  disabled = false,
  className = "",
}: VehicleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Find vehicle matching selectedPlate (either Arabic or English plate match)
  const currentVehicle = vehicles.find(
    (v) =>
      v.plateNumberAr === selectedPlate ||
      v.plateNumberEn.toUpperCase() === selectedPlate?.toUpperCase()
  );

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Filter vehicles by search
  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      v.plateNumberAr.includes(q) ||
      v.plateNumberEn.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
  });

  const isCaptainVehicle =
    Boolean(captainPlate) &&
    (selectedPlate === captainPlate ||
      currentVehicle?.plateNumberAr === captainPlate);

  return (
    <div ref={containerRef} className={`space-y-1.5 w-full relative ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500 font-black">*</span>}
        </label>
        {isCaptainVehicle ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            مركبة الكابتن المعتمدة
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">مركبة من الأسطول</span>
        )}
      </div>

      {/* Trigger Card */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-[72px] p-3 rounded-2xl transition-all duration-200 border text-right flex items-center justify-between
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
          ${
            error
              ? "bg-rose-500/5 border-rose-500/50"
              : isOpen
              ? "bg-amber-500/5 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900/90 theme-border hover:border-amber-500/60 shadow-xs"
          }`}
      >
        {currentVehicle ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon / Vehicle Badge */}
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Car className="w-5 h-5" />
              </div>

              {/* Vehicle Details */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {currentVehicle.make} {currentVehicle.model} ({currentVehicle.year})
                  </h4>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {/* Plate Badge styled like Saudi plate */}
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 tracking-wider">
                    {currentVehicle.plateNumberAr}
                  </span>

                  {currentVehicle.capacity && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {currentVehicle.capacity} ركاب
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!disabled && (
              <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="hidden sm:inline">تغيير المركبة</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Car className="w-4 h-4" />
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                {selectedPlate || "اختر مركبة من الأسطول"}
              </span>
            </div>
            {!disabled && <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        )}
      </div>

      {/* Dropdown Popover */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 right-0 w-full sm:w-[420px] rounded-2xl bg-white dark:bg-slate-900 border theme-border shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باللوحة أو نوع المركبة..."
              className="w-full pr-9 pl-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border theme-border focus:border-amber-500 focus:outline-hidden font-medium"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Vehicles List from Fleet */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                لم يتم العثور على مركبة مطابقة في الأسطول
              </div>
            ) : (
              filteredVehicles.map((v) => {
                const isSelected =
                  v.plateNumberAr === selectedPlate ||
                  v.plateNumberEn.toUpperCase() === selectedPlate?.toUpperCase();
                const isCaptainAssigned =
                  captainPlate &&
                  (v.plateNumberAr === captainPlate ||
                    v.plateNumberEn.toUpperCase() === captainPlate.toUpperCase());

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      onSelectVehicle(v);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 text-right
                      ${
                        isSelected
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-100"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {v.make} {v.model} ({v.year})
                          </span>
                          {isCaptainAssigned && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              مركبة الكابتن
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                            {v.plateNumberAr}
                          </span>
                          <span>•</span>
                          <span>{v.capacity} ركاب</span>
                          <span>•</span>
                          <span>{v.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">
                          اختيار
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
