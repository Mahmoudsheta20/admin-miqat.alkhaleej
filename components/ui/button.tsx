import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
        destructive:
          "bg-rose-600 text-white shadow-xs hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600",
        outline:
          "border border-[var(--control-border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-main)]",
        secondary:
          "bg-[var(--bg-card-subtle)] text-[var(--text-main)] border border-[var(--border-color)] hover:border-[var(--border-hover)]",
        ghost:
          "hover:bg-[var(--bg-card-subtle)] text-[var(--text-main)]",
        link: "text-[var(--accent-gold)] underline-offset-4 hover:underline",
        gold: "gold-gradient-btn shadow-xs hover:brightness-105",
      },
      size: {
        default: "min-h-11 sm:min-h-9 px-3.5 py-1.5",
        sm: "min-h-10 sm:min-h-8 rounded-lg px-2.5 text-xs",
        lg: "min-h-11 sm:min-h-10 rounded-lg px-5 text-sm",
        icon: "size-11 sm:size-9",
        "icon-sm": "size-10 sm:size-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const mergedClassName = cn(buttonVariants({ variant, size, className }));

    if (
      asChild &&
      React.isValidElement<React.HTMLAttributes<HTMLElement>>(children)
    ) {
      return React.cloneElement(children, {
        ...props,
        ...children.props,
        className: cn(mergedClassName, children.props.className),
      });
    }

    return (
      <button
        ref={ref}
        data-slot="button"
        className={mergedClassName}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

