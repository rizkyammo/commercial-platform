import * as React from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "outline";
type Size = "sm" | "md" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

// Variant class strings — literal, biar ke-detect Tailwind v4
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-[#0A84FF] text-white hover:bg-[#0066CC] active:bg-[#0055AA] disabled:bg-[#0A84FF]/50",
  secondary:
    "bg-[#F2F2F4] text-[#1D1D1F] hover:bg-[#E5E5EA] active:bg-[#D1D1D6] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3A3A3C]",
  ghost:
    "bg-transparent text-[#1D1D1F] hover:bg-[#F2F2F4] dark:text-[#F5F5F7] dark:hover:bg-[#2C2C2E]",
  danger:
    "bg-[#FF3B30] text-white hover:bg-[#D70015] active:bg-[#B00010]",
  success:
    "bg-[#34C759] text-white hover:bg-[#248A3D] active:bg-[#1E7A34]",
  outline:
    "bg-transparent text-[#0A84FF] border border-[#0A84FF] hover:bg-[#0A84FF]/10",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      className = "",
      asChild = false,
      children,
      ...rest
    },
    ref
  ) {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] focus-visible:ring-offset-1 " +
      "disabled:opacity-50 disabled:cursor-not-allowed";

    const cls = `${base} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        className: `${cls} ${child.props.className ?? ""}`.trim(),
        ref,
        ...rest,
      });
    }

    return (
      <button ref={ref} className={cls} {...rest}>
        {children}
      </button>
    );
  }
);