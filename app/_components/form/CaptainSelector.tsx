"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  ChevronDown,
  X,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { SystemUser } from "@/lib/types";

export type CaptainWithMeta = SystemUser & {
  contractCount?: number;
  hasTodayInspection?: boolean;
};

export interface CaptainSelectorProps {
  label?: string;
  captains: CaptainWithMeta[];
  selectedCaptainId: string;
  onSelectCaptain: (captain: CaptainWithMeta) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export function CaptainSelector({
  label = "إسناد الرحلة للكابتن",
  captains,
  selectedCaptainId,
  onSelectCaptain,
  error,
  required = true,
  className = "",
}: CaptainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const safeCaptains = Array.isArray(captains) ? captains : [];
  const selectedCaptain = safeCaptains.find((c) => c.id === selectedCaptainId);

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

  // Filter captains by search
  const filteredCaptains = safeCaptains.filter((cap) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      cap.name.toLowerCase().includes(q) ||
      (cap.phone && cap.phone.includes(q)) ||
      (cap.assignedVehiclePlate && cap.assignedVehiclePlate.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={containerRef} className={`space-y-1.5 w-full relative ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500 font-black">*</span>}
        </label>
        {selectedCaptain && (
          <span className="text-[10px] text-slate-400 font-mono">
            المعرف: {selectedCaptain.id.slice(-6)}
          </span>
        )}
      </div>

      {/* Selected Captain Card Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[72px] p-3 rounded-2xl cursor-pointer transition-all duration-200 border text-right flex items-center justify-between
          ${
            error
              ? "bg-rose-500/5 border-rose-500/50"
              : isOpen
              ? "bg-amber-500/5 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900/90 theme-border hover:border-amber-500/60 shadow-xs"
          }`}
      >
        {selectedCaptain ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Captain Avatar or Monogram */}
              <div className="relative shrink-0 w-10 h-10">
                {selectedCaptain.avatarUrl ? (
                  <Image
                    src={selectedCaptain.avatarUrl}
                    alt={selectedCaptain.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 rounded-xl object-cover border border-amber-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center border border-amber-500/30">
                    {selectedCaptain.name.slice(0, 2)}
                  </div>
                )}
                {selectedCaptain.hasTodayInspection ? (
                  <span
                    title="فحص اليوم مكتمل"
                    className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute -bottom-0.5 -right-0.5"
                  />
                ) : (
                  <span
                    title="بانتظار الفحص اليومي"
                    className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 absolute -bottom-0.5 -right-0.5"
                  />
                )}
              </div>

              {/* Captain Details */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {selectedCaptain.name}
                  </h4>
                  {selectedCaptain.assignedVehiclePlate && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                      {selectedCaptain.assignedVehiclePlate}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  {selectedCaptain.phone && (
                    <span className="flex items-center gap-1 font-mono" dir="ltr">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedCaptain.phone}
                    </span>
                  )}
                  {selectedCaptain.hasTodayInspection ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                      <ShieldCheck className="w-3 h-3" />
                      الفحص مكتمل
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-[10px]">
                      <Clock className="w-3 h-3" />
                      بانتظار الفحص
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Change trigger action */}
            <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="hidden sm:inline">تغيير الكابتن</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 text-slate-400">
              <User className="w-4 h-4" />
              <span className="text-xs">اضغط لاختيار الكابتن المسؤول</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-full sm:w-[450px] rounded-2xl bg-white dark:bg-slate-900 border theme-border shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الجوال أو رقم اللوحة..."
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

          {/* Captains List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredCaptains.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                لم يتم العثور على أي كابتن مطابق للبحث
              </div>
            ) : (
              filteredCaptains.map((cap) => {
                const isSelected = cap.id === selectedCaptainId;
                return (
                  <div
                    key={cap.id}
                    onClick={() => {
                      onSelectCaptain(cap);
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
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {cap.name.slice(0, 2)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {cap.name}
                          </span>
                          {cap.assignedVehiclePlate && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {cap.assignedVehiclePlate}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {cap.phone && <span dir="ltr">{cap.phone}</span>}
                          {cap.contractCount !== undefined && (
                            <span>• {cap.contractCount} عقد</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cap.hasTodayInspection ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          فحص مكتمل
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          بانتظار الفحص
                        </span>
                      )}

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
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
