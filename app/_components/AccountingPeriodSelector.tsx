"use client";

import { currentSaudiPeriod, type ReportPeriod } from "@/lib/accounting";

interface Props {
  value: ReportPeriod;
  onChange: (value: ReportPeriod) => void;
}

const INPUT = "theme-input mt-1 h-11 rounded-xl px-3 text-sm w-full";

export default function AccountingPeriodSelector({ value: v, onChange }: Props) {
  const update = (c: Partial<ReportPeriod>) => onChange({ ...v, ...c });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-bold">
        نوع الفترة
        <select
          className={INPUT}
          value={v.mode}
          onChange={(e) => update({ mode: e.target.value as ReportPeriod["mode"] })}
        >
          <option value="QUARTER">ربع سنوي</option>
          <option value="YEAR">سنة كاملة</option>
          <option value="CUSTOM">فترة مخصصة</option>
        </select>
      </label>

      {v.mode !== "CUSTOM" ? (
        <>
          <label className="text-xs font-bold">
            السنة
            <select
              className={INPUT}
              value={v.year}
              onChange={(e) => update({ year: Number(e.target.value) })}
            >
              {Array.from({ length: currentSaudiPeriod().year - 2017 }, (_, i) => 2020 + i).map(
                (y) => (
                  <option key={y}>{y}</option>
                )
              )}
            </select>
          </label>

          {v.mode === "QUARTER" && (
            <label className="text-xs font-bold">
              الربع
              <select
                className={INPUT}
                value={v.quarter}
                onChange={(e) => update({ quarter: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    Q{q} · الربع {q}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      ) : (
        <>
          <label className="text-xs font-bold">
            من
            <input
              type="date"
              required
              className={INPUT}
              value={v.startDate}
              onChange={(e) => update({ startDate: e.target.value })}
            />
          </label>
          <label className="text-xs font-bold">
            إلى
            <input
              type="date"
              required
              min={v.startDate}
              className={INPUT}
              value={v.endDate}
              onChange={(e) => update({ endDate: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
