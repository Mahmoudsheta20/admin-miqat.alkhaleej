import { UI_PHRASES, UI_TEMPLATES } from "./ui-phrases";
import type { Language } from "./translations";

export const localeFor = (language: Language) => language === "en" ? "en-GB" : "ar-SA";

export function normalizePhrase(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

const templatePatterns = Object.entries(UI_TEMPLATES).map(([source, target]) => {
  const keys: string[] = [];
  const pattern = source.split(/(\{\d+\})/).map(part => {
    if (/^\{\d+\}$/.test(part)) {
      keys.push(part);
      return "([\\s\\S]*?)";
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("");
  return { pattern: new RegExp(`^${pattern}$`), target, keys };
});

function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    "&quot;": '"', "&apos;": "'", "&#39;": "'", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": "\u00a0",
  };
  return value.replace(/&(quot|apos|amp|lt|gt|nbsp);|&#39;/g, entity => entities[entity] || entity);
}

/** Translate interface copy only; keep stored names and document snapshots intact. */
export function localizeText(value: string, language: Language): string {
  if (language === "ar" || !/[\u0600-\u06ff]/.test(value)) return decodeEntities(value);
  const source = normalizePhrase(value);
  const translated = UI_PHRASES[source];
  if (translated !== undefined) return value.replace(value.trim(), translated);
  for (const { pattern, target, keys } of templatePatterns) {
    const match = source.match(pattern);
    if (match) return target.replace(/\{\d+\}/g, key => match[keys.indexOf(key) + 1] || "");
  }
  return value;
}
