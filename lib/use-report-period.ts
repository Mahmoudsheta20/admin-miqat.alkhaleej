"use client";
import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { defaultReportPeriod, type ReportPeriod } from "./accounting";
import { useUrlState } from "./use-url-state";

export function useReportPeriod(): [ReportPeriod, Dispatch<SetStateAction<ReportPeriod>>] {
  const defaults = useMemo(() => defaultReportPeriod(), []);
  const [mode, setMode] = useUrlState<ReportPeriod["mode"]>("period", defaults.mode, ["QUARTER", "YEAR", "CUSTOM"]);
  const [year, setYear] = useUrlState<number>("year", defaults.year);
  const [quarter, setQuarter] = useUrlState<number>("quarter", defaults.quarter, [1, 2, 3, 4]);
  const [startDate, setStartDate] = useUrlState<string>("start", defaults.startDate);
  const [endDate, setEndDate] = useUrlState<string>("end", defaults.endDate);
  const value = useMemo<ReportPeriod>(
    () => ({ mode, year, quarter, startDate, endDate }),
    [mode, year, quarter, startDate, endDate],
  );
  const setPeriod = useCallback<Dispatch<SetStateAction<ReportPeriod>>>(
    (next) => {
      const period = typeof next === "function" ? next(value) : next;
      setMode(period.mode);
      setYear(period.year);
      setQuarter(period.quarter);
      setStartDate(period.startDate);
      setEndDate(period.endDate);
    },
    [value, setMode, setYear, setQuarter, setStartDate, setEndDate],
  );
  return [value, setPeriod];
}
