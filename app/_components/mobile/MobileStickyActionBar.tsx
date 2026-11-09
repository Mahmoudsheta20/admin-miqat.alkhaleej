"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MobileStickyActionBarProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

/**
 * Thumb-zone action bar positioned cleanly above `.mobile-bottom-nav` (< 1024px)
 * and safe-area insets. Keeps primary save / next / submit CTAs within easy reach.
 */
export function MobileStickyActionBar({
  children,
  className,
  sticky = true,
}: MobileStickyActionBarProps) {
  return (
    <div
      className={cn(
        "lg:hidden z-30",
        sticky && "sticky bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom,0px)-2px)]",
        className
      )}
    >
      <Card className="theme-card border theme-border border-b-0 rounded-b-none bg-[var(--bg-card)] p-3 shadow-[0_-6px_24px_rgb(0_0_0_/_0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">{children}</div>
      </Card>
    </div>
  );
}
