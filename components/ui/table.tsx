import * as React from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
  regionLabel?: string;
  regionLabelledBy?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    { className, wrapperClassName, regionLabel, regionLabelledBy, ...props },
    ref,
  ) => (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={regionLabelledBy}
      aria-label={regionLabelledBy ? undefined : regionLabel || "جدول البيانات"}
      className={cn(
        "relative w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] shadow-xs focus-visible:outline-2 focus-visible:outline-amber-500/70 focus-visible:-outline-offset-2",
        "relative w-full overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs focus-visible:outline-2 focus-visible:outline-[var(--focus-color)] focus-visible:-outline-offset-2",
        wrapperClassName,
      )}
    >
      <table
        ref={ref}
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-sm text-start border-collapse",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    data-slot="table-header"
    className={cn(
      "bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide",
      "bg-[var(--table-header-bg)] border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] font-semibold tracking-wide",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    data-slot="table-body"
    className={cn(
      "divide-y divide-slate-100 dark:divide-slate-800/80 [&_tr:last-child]:border-0",
      className,
    )}
    className={cn(
      "divide-y divide-[var(--border-color)] [&_tr:last-child]:border-0",
      className,
    )}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    data-slot="table-footer"
    className={cn(
      "border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-medium [&>tr]:last:border-b-0",
      "border-t border-[var(--border-color)] bg-[var(--table-header-bg)] font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    data-slot="table-row"
    className={cn(
      "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 data-[state=selected]:bg-amber-500/10",
      "transition-colors hover:bg-[var(--table-row-hover)] data-[state=selected]:bg-[var(--brand-green-surface)]",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, scope = "col", ...props }, ref) => (
  <th
    ref={ref}
    scope={scope}
    data-slot="table-head"
    className={cn(
      "h-11 px-4 text-start align-middle font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 [&:has([role=checkbox])]:pe-0",
      "h-11 px-4 text-start align-middle font-bold text-xs uppercase tracking-wider text-[var(--text-main)] [&:has([role=checkbox])]:pe-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    data-slot="table-cell"
    className={cn(
      "p-4 align-middle text-slate-800 dark:text-slate-200 [&:has([role=checkbox])]:pe-0",
      "p-4 align-middle text-[var(--text-main)] [&:has([role=checkbox])]:pe-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    data-slot="table-caption"
    className={cn("mt-4 text-xs text-slate-500 dark:text-slate-400", className)}
    className={cn("mt-4 text-xs text-[var(--text-muted)]", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
