import { ReactNode } from "react";

export function FormField({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-[#FF3B30]">*</span>}
      </label>
      {children}
    </div>
  );
}