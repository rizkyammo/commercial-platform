"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type ReportCategory =
  | "operational"
  | "commercial"
  | "compliance"
  | "management"
  | "custom";

type ReportDef = {
  key: string;
  name: string;
  description: string;
  category: ReportCategory;
  formats: ("PDF" | "XLSX")[];
};

const REPORTS: ReportDef[] = [
  // Operational
  {
    key: "order-register",
    name: "Order Register",
    description: "List of all customer orders with key details.",
    category: "operational",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "order-progress",
    name: "Order Progress Report",
    description: "Order status and flow overview.",
    category: "operational",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "procurement-register",
    name: "Procurement Register",
    description: "Procurement details per order.",
    category: "operational",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "shipment-register",
    name: "Shipment Register",
    description: "Shipment details per order.",
    category: "operational",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "bast-register",
    name: "BAST Register",
    description: "BAST completion details.",
    category: "operational",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "outstanding-bast",
    name: "Outstanding BAST",
    description: "Orders waiting BAST.",
    category: "operational",
    formats: ["PDF", "XLSX"],
  },
  {
  key: "consignment-usage",
  name: "Consignment Usage",
  description: "Consignment and VMI orders with usage details.",
  category: "operational",
  formats: ["PDF", "XLSX"],
},

  // Commercial
  {
    key: "cost-report",
    name: "Cost Report",
    description: "Selling value, direct cost, and margin.",
    category: "commercial",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "margin-report",
    name: "Margin Report",
    description: "Margin by order, customer, site.",
    category: "commercial",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "margin-by-site",
    name: "Margin by Site",
    description: "Site-level margin analysis.",
    category: "commercial",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "margin-by-customer",
    name: "Margin by Customer",
    description: "Customer-level margin analysis.",
    category: "commercial",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "contract-performance",
    name: "Contract Performance",
    description: "Performance by contract.",
    category: "commercial",
    formats: ["PDF", "XLSX"],
  },
  {
  key: "tax-report",
  name: "Tax Report (PPN + PPh 23)",
  description: "PPN 11%, PPh 23 2%, PPN Payable per order.",
  category: "commercial",
  formats: ["PDF", "XLSX"],
},
{
  key: "margin-tax-report",
  name: "Margin Before vs After Tax",
  description: "Margin comparison before and after tax.",
  category: "commercial",
  formats: ["PDF", "XLSX"],
},

  // Compliance
  {
    key: "sk-authorization",
    name: "SK Authorization Report",
    description: "List of SK Kemhan authorizations.",
    category: "compliance",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "quota-allocation",
    name: "Quota Allocation Report",
    description: "Material allocation details.",
    category: "compliance",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "quota-realization",
    name: "Quota Realization Report",
    description: "Distribution realization details.",
    category: "compliance",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "quota-ledger",
    name: "Quota Ledger",
    description: "Full quota ledger movements.",
    category: "compliance",
    formats: ["PDF", "XLSX"],
  },

  // Management
  {
    key: "monthly-commercial",
    name: "Monthly Commercial Review",
    description: "Monthly performance summary.",
    category: "management",
    formats: ["PDF", "XLSX"],
  },
  {
    key: "yearly-commercial",
    name: "Yearly Commercial Review",
    description: "Yearly performance summary.",
    category: "management",
    formats: ["PDF", "XLSX"],
  },

  // Custom
  {
    key: "custom-builder",
    name: "Custom Report Builder",
    description: "Build your own report with custom filters and fields.",
    category: "custom",
    formats: ["PDF", "XLSX"],
  },
];

const CATEGORIES = [
  { key: "all", label: "All Reports" },
  { key: "operational", label: "Operational" },
  { key: "commercial", label: "Commercial" },
  { key: "compliance", label: "Compliance" },
  { key: "management", label: "Management" },
  { key: "custom", label: "Custom Reports" },
];

const CATEGORY_TONES: Record<
  ReportCategory,
  "blue" | "green" | "orange" | "grey" | "red"
> = {
  operational: "blue",
  commercial: "green",
  compliance: "orange",
  management: "grey",
  custom: "red",
};

export function ReportsClient() {
  const [activeCat, setActiveCat] = useState("all");

  const filtered =
    activeCat === "all"
      ? REPORTS
      : REPORTS.filter((r) => r.category === activeCat);

  function countFor(catKey: string) {
    if (catKey === "all") return REPORTS.length;
    return REPORTS.filter((r) => r.category === catKey).length;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* SIDEBAR */}
      <aside className="lg:col-span-1">
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-4 sticky top-24">
          <div className="space-y-1">
            {CATEGORIES.map((c) => {
              const active = activeCat === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(c.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-3 ${
                    active
                      ? "bg-[#EAF2FB] text-[#0A84FF] font-medium"
                      : "text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]"
                  }`}
                >
                  <span>{c.label}</span>
                  <span
                    className={`text-xs px-1.5 rounded-full ${
                      active ? "bg-[#0A84FF]/15" : "bg-[#F2F2F4]"
                    }`}
                  >
                    {countFor(c.key)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
          <div className="px-6 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E]">
            <h2 className="font-semibold">
              {CATEGORIES.find((c) => c.key === activeCat)?.label ?? "Reports"}
            </h2>
          </div>
          <div className="divide-y divide-[#E5E5EA]">
            {filtered.map((r) => (
              <div
                key={r.key}
                className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#F6F6F7]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">{r.name}</div>
                    <Badge tone={CATEGORY_TONES[r.category]}>
                      {r.category}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                    {r.description}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.key === "custom-builder" ? (
                    <Link
                      href="/reports/custom"
                      className="text-[#0A84FF] text-sm hover:underline self-center"
                    >
                      Open Builder →
                    </Link>
                  ) : (
                    <Link
                      href={`/reports/view/${r.key}`}
                      className="text-[#0A84FF] text-sm hover:underline self-center"
                    >
                      Generate →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}