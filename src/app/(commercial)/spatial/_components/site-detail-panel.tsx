"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MapSelection } from "./map-view";
import type { Prospect } from "@/features/spatial/types";

// ============================ HELPERS ============================

function fmtFull(n: number) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================ MAIN ============================

export function DetailPanel({
  selection,
  nearbyProspects,
  nearbyBase,
  margin,
  activeOrders,
  onClose,
  onAddProspect,
}: {
  selection: MapSelection;
  nearbyProspects: Prospect[];
  nearbyBase: { name: string; distance_km: number } | null;
  margin: number;
  activeOrders: number;
  onClose: () => void;
  onAddProspect: () => void;
}) {
  const [tab, setTab] = useState<
    "overview" | "customers" | "prospects" | "coverage"
  >("overview");

  if (!selection) return null;

  const isSite = selection.type === "site";
  const isBase = selection.type === "base";
  const isProspect = selection.type === "prospect";

  const TABS = [
    { key: "overview" as const, label: "Overview" },
    ...(isSite ? [{ key: "customers" as const, label: "Customers" }] : []),
    { key: "prospects" as const, label: "Nearby Prospects" },
    { key: "coverage" as const, label: "Coverage" },
  ];

  return (
    <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl h-full flex flex-col overflow-hidden">
      {/* ============ HEADER ============ */}
      <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-[15px] truncate">
              {selection.data.name}
            </div>
            {isSite && (
              <Badge
                tone={
                  (selection.data as { site_status?: string }).site_status ===
                  "Active"
                    ? "green"
                    : "grey"
                }
              >
                {(selection.data as { site_status?: string }).site_status ??
                  "Active"}{" "}
                Site
              </Badge>
            )}
            {isProspect && (
              <Badge
                tone={
                  (selection.data as { status?: string }).status === "QUALIFIED"
                    ? "blue"
                    : (selection.data as { status?: string }).status ===
                        "CONTACTED"
                      ? "orange"
                      : "grey"
                }
              >
                {(selection.data as { status?: string }).status ?? "New"}
              </Badge>
            )}
          </div>
          <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1 truncate">
            {[
              (selection.data as { city?: string }).city,
              (selection.data as { province?: string }).province,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E] flex items-center justify-center text-[#6E6E73] dark:text-[#8E8E93] shrink-0"
        >
          ×
        </button>
      </div>

      {/* ============ TABS ============ */}
      <div className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex overflow-x-auto px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-10 px-3 text-xs whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.key
                ? "border-[#0A84FF] text-[#0A84FF] font-medium"
                : "border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:text-[#F5F5F7]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ CONTENT ============ */}
      <div className="flex-1 overflow-y-auto">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <>
            {/* Hero image */}
            {isSite && (
              <div className="relative h-32 bg-[#F2F2F4] overflow-hidden">
                {/* Placeholder — ganti dengan image real kalau ada */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#8FA8A0] via-[#6B8580] to-[#4A6B5F] flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-white/40"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M4 20h16M6 20V10l6-4 6 4v10M10 20v-4h4v4M9 12h.01M15 12h.01" />
                  </svg>
                </div>
              </div>
            )}

            {/* Basic info */}
            <div className="p-5 space-y-3">
              {isSite && (
                <>
                  <InfoRow
                    label="Customer"
                    value={
                      (selection.data as { customer_name?: string })
                        .customer_name ?? "—"
                    }
                  />
                  <InfoRow
                    label="Site Status"
                    value={
                      (selection.data as { site_status?: string })
                        .site_status ?? "Active"
                    }
                    valueColor="#34C759"
                  />
                  <InfoRow
                    label="Business Model"
                    value={
                      (selection.data as { business_model?: string | null })
                        .business_model ?? "—"
                    }
                  />
                  <InfoRow label="Active Since" value="2023" />
                  <InfoRow label="Contract" value="DAN-PAMA-2026" />
                  <InfoRow
                    label="Coordinates"
                    value={`${Number(
                      (selection.data as { latitude: number }).latitude
                    ).toFixed(4)}°S, ${Number(
                      (selection.data as { longitude: number }).longitude
                    ).toFixed(4)}°E`}
                    mono
                  />
                </>
              )}

              {isProspect && (
                <>
                  <InfoRow
                    label="Code"
                    value={(selection.data as { code: string }).code}
                    mono
                  />
                  <InfoRow
                    label="Type"
                    value={
                      (selection.data as { type?: string | null }).type ?? "—"
                    }
                  />
                  <InfoRow
                    label="Score"
                    value={`${Number(
                      (selection.data as { score: number }).score
                    ).toFixed(0)} / 100`}
                    valueColor={
                      Number(
                        (selection.data as { score: number }).score
                      ) >= 80
                        ? "#34C759"
                        : "#FF9500"
                    }
                  />
                  <InfoRow
                    label="Est. Demand"
                    value={`${fmtFull(
                      Number(
                        (selection.data as { est_demand: number }).est_demand
                      )
                    )} ${
                      (selection.data as { est_demand_uom: string })
                        .est_demand_uom
                    }`}
                  />
                  <InfoRow
                    label="Coordinates"
                    value={`${Number(
                      (selection.data as { latitude: number }).latitude
                    ).toFixed(4)}°S, ${Number(
                      (selection.data as { longitude: number }).longitude
                    ).toFixed(4)}°E`}
                    mono
                  />
                </>
              )}

              {isBase && (
                <>
                  <InfoRow
                    label="Code"
                    value={(selection.data as { code: string }).code}
                    mono
                  />
                  <InfoRow
                    label="Type"
                    value={
                      (selection.data as { type?: string | null }).type ?? "—"
                    }
                  />
                  <InfoRow
                    label="Capacity"
                    value={`${fmtFull(
                      Number(
                        (selection.data as { capacity: number }).capacity
                      )
                    )} ${
                      (selection.data as { capacity_uom: string })
                        .capacity_uom
                    }`}
                  />
                  <InfoRow
                    label="Province"
                    value={
                      (selection.data as { province?: string | null })
                        .province ?? "—"
                    }
                  />
                  <InfoRow
                    label="Coordinates"
                    value={`${Number(
                      (selection.data as { latitude: number }).latitude
                    ).toFixed(4)}°S, ${Number(
                      (selection.data as { longitude: number }).longitude
                    ).toFixed(4)}°E`}
                    mono
                  />
                </>
              )}
            </div>

            {/* Stats row — hanya untuk site */}
            {isSite && (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-4 gap-2">
                  <MiniStat
                    value={String(nearbyProspects.length)}
                    label="Nearby Prospects"
                  />
                  <MiniStat
                    value={
                      nearbyBase
                        ? `${nearbyBase.distance_km.toFixed(0)} km`
                        : "—"
                    }
                    label="Nearest Base"
                  />
                  <MiniStat
                    value={`${margin.toFixed(1)}%`}
                    label="Margin (2026 YTD)"
                    tone={margin >= 15 ? "green" : "orange"}
                  />
                  <MiniStat
                    value={String(activeOrders)}
                    label="Active Orders"
                  />
                </div>
              </div>
            )}

            {/* Nearby prospects list — untuk site */}
            {isSite && nearbyProspects.length > 0 && (
              <div className="px-5 pb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold">
                    Nearby Prospects
                  </div>
                  <Link
                    href="/spatial/prospects"
                    className="text-xs text-[#0A84FF] hover:underline"
                  >
                    View all →
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {nearbyProspects.slice(0, 5).map((p) => {
                    const dist = haversineKm(
                      Number(
                        (selection.data as { latitude: number }).latitude
                      ),
                      Number(
                        (selection.data as { longitude: number }).longitude
                      ),
                      Number(p.latitude ?? 0),
                      Number(p.longitude ?? 0)
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-[#F2F2F4] last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0A84FF] shrink-0" />
                          <span className="truncate text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[#6E6E73] dark:text-[#8E8E93] font-mono">
                            {dist.toFixed(0)} km
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#F6F6F7] text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">
                            {p.type ?? "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* CUSTOMERS TAB */}
        {tab === "customers" && isSite && (
          <div className="p-5">
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] text-center py-8">
              Customer information loaded from site detail.
            </div>
          </div>
        )}

        {/* PROSPECTS TAB */}
        {tab === "prospects" && (
          <div className="p-5">
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mb-3">
              {nearbyProspects.length} prospects within 100km
            </div>
            <div className="space-y-2">
              {nearbyProspects.map((p) => {
                const dist = haversineKm(
                  Number(
                    (selection.data as { latitude: number }).latitude ?? 0
                  ),
                  Number(
                    (selection.data as { longitude: number }).longitude ?? 0
                  ),
                  Number(p.latitude ?? 0),
                  Number(p.longitude ?? 0)
                );
                return (
                  <div
                    key={p.id}
                    className="border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg p-3 hover:border-[#0A84FF] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] font-mono">
                        {dist.toFixed(0)} km
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <Badge tone="grey">{p.type ?? "—"}</Badge>
                      <Badge
                        tone={
                          p.status === "QUALIFIED"
                            ? "blue"
                            : p.status === "CONTACTED"
                              ? "orange"
                              : "grey"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COVERAGE TAB */}
        {tab === "coverage" && (
          <div className="p-5">
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] text-center py-8">
              Coverage radius analysis.
            </div>
          </div>
        )}
      </div>

      {/* ============ ACTION FOOTER ============ */}
      <div className="p-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex gap-2">
        <Link
          href={`/analytics?site=${(selection.data as { id: string }).id}`}
          className="flex-1"
        >
          <Button variant="secondary" className="w-full">
            <svg
              className="w-4 h-4 mr-2"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 16h12M6 12v4M10 8v8M14 4v12" />
            </svg>
            View in Analytics
          </Button>
        </Link>
        <Button onClick={onAddProspect} className="flex-1">
          + Add Prospect
        </Button>
      </div>
    </div>
  );
}

// ============================ SUB-COMPONENTS ============================

function InfoRow({
  label,
  value,
  valueColor,
  mono,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-[#6E6E73] dark:text-[#8E8E93] shrink-0">{label}</span>
      <span
        className={`font-medium text-right truncate ${
          mono ? "font-mono" : ""
        }`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function MiniStat({
  value,
  label,
  tone = "neutral",
}: {
  value: string;
  label: string;
  tone?: "neutral" | "green" | "orange" | "red";
}) {
  const color =
    tone === "green"
      ? "text-[#34C759]"
      : tone === "orange"
        ? "text-[#FF9500]"
        : tone === "red"
          ? "text-[#FF3B30]"
          : "text-[#1D1D1F] dark:text-[#F5F5F7]";
  return (
    <div className="text-center">
      <div className={`text-base font-semibold ${color}`}>{value}</div>
      <div className="text-[9px] text-[#8E8E93] mt-0.5 leading-tight">
        {label}
      </div>
    </div>
  );
}