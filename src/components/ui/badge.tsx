import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Tone = "neutral" | "blue" | "green" | "yellow" | "orange" | "red" | "grey";

const tones: Record<Tone, string> = {
  neutral: "bg-[#F2F2F4] text-[#1D1D1F]",
  blue: "bg-[#0A84FF]/10 text-[#0A84FF]",
  green: "bg-[#34C759]/15 text-[#1B8A3B]",
  yellow: "bg-[#FFCC00]/25 text-[#8A6D00]",
  orange: "bg-[#FF9500]/20 text-[#A15C00]",
  red: "bg-[#FF3B30]/12 text-[#B71C1C]",
  grey: "bg-[#8E8E93]/15 text-[#6E6E73]",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 h-6 rounded-full text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}