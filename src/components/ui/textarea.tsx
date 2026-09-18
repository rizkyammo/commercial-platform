import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-[#E5E5EA] bg-white text-sm",
        "focus:outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/10",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";