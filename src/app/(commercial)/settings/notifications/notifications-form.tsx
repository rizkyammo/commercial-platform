"use client";

import { useState } from "react";

const TYPES = [
  { key: "order_submitted", label: "Order Submitted", hint: "When an order is submitted for review" },
  { key: "order_approved", label: "Order Approved", hint: "When an order is approved" },
  { key: "order_returned", label: "Order Returned", hint: "When an order is returned to you" },
  { key: "amendment_request", label: "Amendment Request", hint: "New amendment requests" },
  { key: "shipment_ready", label: "Shipment Ready", hint: "Shipment ready to confirm" },
  { key: "waiting_bast", label: "Waiting BAST", hint: "Orders waiting for BAST" },
  { key: "bast_completed", label: "BAST Completed", hint: "When BAST completes" },
  { key: "sk_expiring", label: "SK Expiring", hint: "SK Kemhan expiry reminders" },
  { key: "quota_warning", label: "Quota Warning", hint: "Quota near threshold" },
  { key: "security_alert", label: "Security Alert", hint: "Unusual login activity" },
];

export function NotificationsForm() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(TYPES.map((t) => [t.key, true]))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
          Choose what you want to be notified about.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl divide-y divide-[#F2F2F4]">
        {TYPES.map((t) => (
          <div key={t.key} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-[#8E8E93] mt-0.5">{t.hint}</div>
            </div>
            <button
              type="button"
              onClick={() =>
                setEnabled((prev) => ({ ...prev, [t.key]: !prev[t.key] }))
              }
              className={`w-11 h-6 rounded-full transition relative shrink-0 ${
                enabled[t.key] ? "bg-[#34C759]" : "bg-[#E5E5EA]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] shadow transition-all ${
                  enabled[t.key] ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}