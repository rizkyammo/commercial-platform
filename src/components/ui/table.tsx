import { cn } from "@/lib/utils";
import { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}
export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-[#F6F6F7] border-b border-[#E5E5EA]" {...props} />;
}
export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[#E5E5EA] last:border-0 hover:bg-[#F6F6F7]/60 transition",
        className
      )}
      {...props}
    />
  );
}
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left px-4 py-3 text-xs font-medium text-[#6E6E73] uppercase tracking-wide",
        className
      )}
      {...props}
    />
  );
}
export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3", className)} {...props} />;
}