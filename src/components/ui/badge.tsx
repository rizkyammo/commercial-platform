import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Tone =
  | "neutral"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "grey"
  | "purple";

const tones: Record<Tone, string> = {
  neutral: "bg-[#F2F2F4] text-[#1D1D1F] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]",
  blue: "bg-[#0A84FF]/10 text-[#0A84FF]",
  green: "bg-[#34C759]/15 text-[#1B8A3B] dark:text-[#34C759]",
  yellow: "bg-[#FFCC00]/25 text-[#8A6D00] dark:text-[#FFCC00]",
  orange: "bg-[#FF9500]/20 text-[#A15C00] dark:text-[#FF9500]",
  red: "bg-[#FF3B30]/12 text-[#B71C1C] dark:text-[#FF3B30]",
  grey: "bg-[#8E8E93]/15 text-[#6E6E73] dark:text-[#8E8E93]",
  purple: "bg-[#5E5CE6]/15 text-[#5E5CE6]",
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