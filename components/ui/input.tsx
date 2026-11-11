import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          "flex h-11 sm:h-9 w-full rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] px-3 py-1.5 text-base sm:text-[0.8125rem] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:border-[var(--accent-gold)] focus-visible:ring-2 focus-visible:ring-amber-500/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
