import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        <select
          ref={ref}
          data-slot="native-select"
          className={cn(
            "flex h-10 w-full appearance-none rounded-xl border border-[var(--control-border)] bg-[var(--input-bg)] ps-3.5 pe-9 py-2 text-sm text-[var(--text-main)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:border-[var(--accent-gold)] focus-visible:ring-2 focus-visible:ring-amber-600/20 dark:focus-visible:ring-amber-400/25",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"
          aria-hidden="true"
        />
      </div>
    );
  }
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };

