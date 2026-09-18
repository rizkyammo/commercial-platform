import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full h-10 px-3 rounded-lg border border-[#E5E5EA] bg-white text-sm",
        "focus:outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/10",
        "disabled:bg-[#F2F2F4] disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";