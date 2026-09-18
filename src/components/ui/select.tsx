import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full h-10 px-3 rounded-lg border border-[#E5E5EA] bg-white text-sm",
        "focus:outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";