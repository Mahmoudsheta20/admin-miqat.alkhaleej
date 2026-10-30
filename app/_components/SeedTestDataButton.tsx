"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { seedAllSectionsTestData } from "@/lib/seed-test-data";

interface SeedTestDataButtonProps {
  onSeeded?: (message: string) => void;
  onError?: (error: string) => void;
}

export default function SeedTestDataButton({
  onSeeded,
  onError,
}: SeedTestDataButtonProps) {
  const [isSeeding, setIsSeeding] = useState(false);

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
      onError?.(e instanceof Error ? e.message : "تعذر إدراج البيانات التجريبية");
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isSeeding}
      onClick={() => void handleSeed()}
      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 transition disabled:opacity-50 cursor-pointer"
    >
      {isSeeding ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4 text-amber-500" />
      )}
      <span>
        {isSeeding
          ? "جارٍ تعبئة جميع الأقسام…"
          : "بيانات تجريبية شاملة (رأس مال 300,000 ر.س)"}
      </span>
    </button>
  );
}

