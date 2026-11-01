"use client";

import { useCallback, type ReactNode } from "react";
import { useLanguage } from "./languageContext";
import { localizeText, localeFor } from "./localization";

export function useUiText() {
  const { language, dir } = useLanguage();
  const translate = useCallback(<T,>(value: T): T =>
    typeof value === "string" ? localizeText(value, language) as T : value,
  [language]);
  return Object.assign(translate, { language, dir, locale: localeFor(language) });
}

export function LocalizedText({ value }: { value: ReactNode }) {
  const ui = useUiText();
  return <>{ui(value)}</>;
}

export function LocalizedDate({ value }: { value: string }) {
  const ui = useUiText();
  return <time dateTime={value}>{new Date(value).toLocaleDateString(ui.locale, {
    timeZone: "Asia/Riyadh", calendar: "gregory",
  })}</time>;
}
