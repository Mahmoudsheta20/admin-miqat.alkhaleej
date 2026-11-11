"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MobileRecordCardProps {
  title: ReactNode;
  titleAs?: "div" | "h2" | "h3";
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
  muted?: boolean;
}

/**
 * Standard mobile record card built on shadcn Card primitives.
 * Uses `<article>` semantics internally via wrapper to keep source order clean.
 */
export function MobileRecordCard({
  title,
  titleAs = "div",
  subtitle,
  badge,
  action,
  children,
  footer,
  className,
  contentClassName,
  footerClassName,
  muted = false,
}: MobileRecordCardProps) {
  const TitleTag = titleAs;

  return (
    <Card
      className={cn(
        "theme-card border theme-border shadow-none transition-colors",
        muted && "bg-[var(--bg-card-subtle)] border-dashed",
        className
      )}
    >
      <article className="flex flex-col">
        <CardHeader className="p-4 pb-3 space-y-0 flex-row items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1 space-y-1">
            <TitleTag
              data-slot="card-title"
              className="text-sm font-semibold leading-snug text-[var(--text-main)] flex flex-wrap items-center gap-1.5"
            >
              {title}
            </TitleTag>
            {subtitle && (
              <div
                data-slot="card-description"
                className="text-xs text-[var(--text-muted)] mt-0 leading-relaxed break-words"
              >
                {subtitle}
              </div>
            )}
          </div>
          {(badge || action) && (
            <CardAction className="flex items-center gap-1.5 shrink-0">
              {badge}
              {action}
            </CardAction>
          )}
        </CardHeader>

        {children !== undefined && children !== null && children !== false && (
          <CardContent
            className={cn(
              "px-4 pt-0 space-y-2.5 text-xs",
              footer ? "pb-3" : "pb-4",
              contentClassName
            )}
          >
            {children}
          </CardContent>
        )}

        {footer && (
          <CardFooter
            className={cn(
              "mt-0 px-4 py-3 border-t theme-border flex flex-wrap items-center gap-2",
              footerClassName
            )}
          >
            {footer}
          </CardFooter>
        )}
      </article>
    </Card>
  );
}

export function MobileCardMetaGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-2.5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3",
        columns === 3 ? "grid-cols-3" : "grid-cols-2",
        className
      )}
    >
      {children}
    </dl>
  );
}

export function MobileCardField({
  label,
  value,
  mono = false,
  className,
  alignEnd = false,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  className?: string;
  alignEnd?: boolean;
}) {
  return (
    <div className={cn("min-w-0 space-y-0.5", alignEnd && "text-end", className)}>
      <dt className="text-[11px] font-medium text-[var(--text-muted)] truncate">{label}</dt>
      <dd
        className={cn(
          "text-xs font-semibold text-[var(--text-main)] break-words",
          mono && "font-mono tabular-nums"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
