"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-2xl" }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className={`relative w-full ${width} bg-white rounded-2xl shadow-xl border border-[#E5E5EA] max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA]">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-[#F2F2F4] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#E5E5EA] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}