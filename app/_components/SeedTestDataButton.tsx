"use client";
import { useUiText } from "@/lib/ui-text";


import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { seedAllSectionsTestData } from "@/lib/seed-test-data";
import { useLanguage } from "@/lib/languageContext";

interface SeedTestDataButtonProps {
  onSeeded?: (message: string) => void;
  onError?: (error: string) => void;
}

export default function SeedTestDataButton({
  onSeeded,
  onError,
}: SeedTestDataButtonProps) {
  const ui = useUiText();

  const [isSeeding, setIsSeeding] = useState(false);
  const { isRTL } = useLanguage();

  // Hide completely in production builds
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  async function handleSeed() {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      const result = await seedAllSectionsTestData();
      if (result.success) {
        onSeeded?.(result.message);
      } else {
        onError?.(result.message);
      }
    } catch (e) {
      onError?.(
        e instanceof Error
          ? e.message
          : isRTL
            ? "تعذر إدراج البيانات التجريبية"
            : "Failed to seed demo data"
      );
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isSeeding}
      onClick={() => void handleSeed()}
      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 transition disabled:opacity-50 cursor-pointer shadow-2xs"
      title={ui(isRTL ? "تعبئة بيانات تجريبية للتطوير" : "Seed test data for development")}
    >
      {isSeeding ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Sparkles className="size-3.5 text-amber-500" />
      )}
      <span>
        {ui(isSeeding
          ? isRTL
            ? "جارٍ التعبئة…"
            : "Seeding…"
          : isRTL
            ? "بيانات تجريبية (تطوير)"
            : "Demo Data (Dev)")}
      </span>
    </button>
  );
}

