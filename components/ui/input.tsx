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
          "flex h-10 w-full rounded-xl border border-[var(--control-border)] bg-[var(--input-bg)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:border-[var(--accent-gold)] focus-visible:ring-2 focus-visible:ring-amber-600/20 dark:focus-visible:ring-amber-400/25",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
