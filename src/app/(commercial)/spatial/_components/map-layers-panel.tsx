"use client";

import type { LayerVisibility } from "./map-view";

const LAYERS: { key: keyof LayerVisibility; label: string; color: string }[] = [
  { key: "sites", label: "Active Sites", color: "#34C759" },
  { key: "prospects", label: "Prospects", color: "#0A84FF" },
  { key: "market_areas", label: "Mining Areas", color: "#FF9500" },
  { key: "bases", label: "Operational Base", color: "#5E5CE6" },
  { key: "coverage", label: "Customer Coverage", color: "#0A84FF" },
];

export function MapLayersPanel({
  value,
  onChange,
}: {
  value: LayerVisibility;
  onChange: (v: LayerVisibility) => void;
}) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide">
          Map Layers
        </div>
        <svg
          className="w-3 h-3 text-[#8E8E93]"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.5 7l4.5 4.5L14.5 7z" />
        </svg>
      </div>
      <div className="space-y-2.5">
        {LAYERS.map((l) => (
          <label
            key={l.key}
            className="flex items-center gap-2.5 cursor-pointer text-sm py-0.5"
          >
            <input
              type="checkbox"
              checked={value[l.key]}
              onChange={(e) =>
                onChange({ ...value, [l.key]: e.target.checked })
              }
              className="accent-[#0A84FF] w-4 h-4"
            />
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">{l.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}