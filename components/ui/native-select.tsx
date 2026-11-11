import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type NativeSelectProps =
  React.SelectHTMLAttributes<HTMLSelectElement> & {
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
            "flex h-11 sm:h-9 w-full appearance-none rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] ps-3 pe-8 py-1.5 text-base sm:text-[0.8125rem] text-[var(--text-main)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:border-[var(--accent-gold)] focus-visible:ring-2 focus-visible:ring-amber-500/20",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"
          aria-hidden="true"
        />
      </div>
    );
  },
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
