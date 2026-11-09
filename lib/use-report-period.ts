"use client";
import type { Dispatch, SetStateAction } from "react";
import { defaultReportPeriod, type ReportPeriod } from "./accounting";
import { useUrlState } from "./use-url-state";
export function useReportPeriod(): [ReportPeriod, Dispatch<SetStateAction<ReportPeriod>>] {
  const defaults = defaultReportPeriod();
  const [mode, setMode] = useUrlState<ReportPeriod["mode"]>("period", defaults.mode, ["QUARTER", "YEAR", "CUSTOM"]);
  const [year, setYear] = useUrlState<number>("year", defaults.year);
  const [quarter, setQuarter] = useUrlState<number>("quarter", defaults.quarter, [1,2,3,4]);
  const [startDate, setStart] = useUrlState<string>("start", defaults.startDate);
  const [endDate, setEnd] = useUrlState<string>("end", defaults.endDate);
  const value = { mode, year, quarter, startDate, endDate };
  return [value, next => { const period = typeof next === "function" ? next(value) : next; setMode(period.mode); setYear(period.year); setQuarter(period.quarter); setStart(period.startDate); setEnd(period.endDate); }];
}
