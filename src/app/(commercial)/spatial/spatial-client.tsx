"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MapLayersPanel } from "./_components/map-layers-panel";
import { DetailPanel } from "./_components/site-detail-panel";
import { ProspectModal } from "./_components/prospect-modal";
import { BaseModal } from "./_components/base-modal";
import { getSiteContextAction } from "@/features/spatial/actions";
import type {
  LayerVisibility,
  MapSelection,
} from "./_components/map-view";
import type {
  Prospect,
  OperationalBase,
  SiteMarker,
  CoverageArea,
} from "@/features/spatial/types";

const MapView = dynamic(
  () => import("./_components/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">
        Loading map...
      </div>
    ),
  }
);

type Lens = "portfolio" | "opportunity" | "coverage" | "expansion" | "scenario";

const LENSES: {
  key: Lens;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "portfolio",
    label: "Portfolio",
    description: "Our sites, customers and coverage",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 18s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z" />
        <circle cx="10" cy="8" r="2.5" />
      </svg>
    ),
  },
  {
    key: "opportunity",
    label: "Opportunity",
    description: "Prospects and market potential",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="9" r="6" />
        <path d="M13.5 13.5l3.5 3.5" />
      </svg>
    ),
  },
  {
    key: "coverage",
    label: "Coverage",
    description: "Reach and accessibility",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 7l3-3 4 2 4-2 3 3-3 3v5l-4 2-4-2v-5z" />
      </svg>
    ),
  },
  {
    key: "expansion",
    label: "Expansion",
    description: "Potential areas for growth",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 15l4-4 3 3 7-8" />
        <path d="M13 6h4v4" />
      </svg>
    ),
  },
  {
    key: "scenario",
    label: "Scenario",
    description: "What-if analysis",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="11" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="11" width="6" height="6" rx="1" />
        <rect x="11" y="11" width="6" height="6" rx="1" />
      </svg>
    ),
  },
];

function defaultLayers(lens: Lens): LayerVisibility {
  return {
    sites: lens === "portfolio" || lens === "coverage",
    prospects: lens === "opportunity" || lens === "expansion",
    bases: true,
    coverage: lens === "coverage" || lens === "portfolio",
    market_areas: lens === "opportunity",
  };
}

export function SpatialClient({
  sites,
  prospects,
  bases,
  coverageAreas,
  summary,
  permissions,
}: {
  sites: SiteMarker[];
  prospects: Prospect[];
  bases: OperationalBase[];
  coverageAreas: CoverageArea[];
  summary: {
    sites: number;
    prospects: number;
    qualified: number;
    bases: number;
    totalDemand: number;
    avgScore: number;
  };
  permissions: string[];
}) {
  const [lens, setLens] = useState<Lens>("portfolio");
  const [layers, setLayers] = useState<LayerVisibility>(
    defaultLayers("portfolio")
  );
  const [selection, setSelection] = useState<MapSelection>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const [showAddProspect, setShowAddProspect] = useState(false);
  const [showAddBase, setShowAddBase] = useState(false);

  // Site context (nearby prospects, base, margin, orders)
const [siteContext, setSiteContext] = useState<{
  nearbyProspects: Prospect[];
  nearestBase: { name: string; distance_km: number } | null;
  margin: number;
  activeOrders: number;
} | null>(null);

useEffect(() => {
  if (selection?.type !== "site") {
    setSiteContext(null);
    return;
  }
  let cancelled = false;
  const site = selection.data;
  getSiteContextAction(site.id, site.latitude, site.longitude).then((ctx) => {
    if (!cancelled) setSiteContext(ctx);
  });
  return () => {
    cancelled = true;
  };
}, [selection]);

  function changeLens(next: Lens) {
    setLens(next);
    setLayers(defaultLayers(next));
    setSelection(null);
  }

  const canEdit = permissions.includes("SPATIAL_EDIT_PROSPECT");

  const avgLat =
    sites.length > 0
      ? sites.reduce((a, s) => a + s.latitude, 0) / sites.length
      : -1.0;
  const avgLng =
    sites.length > 0
      ? sites.reduce((a, s) => a + s.longitude, 0) / sites.length
      : 116.0;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ============================ SIDEBAR ============================ */}
        <aside className="lg:col-span-3 flex flex-col">
          <div className="space-y-4 flex-1">
            {/* Lens selector */}
            <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-2">
              <div className="space-y-1">
                {LENSES.map((l) => {
                  const active = lens === l.key;
                  return (
                    <button
                      key={l.key}
                      onClick={() => changeLens(l.key)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-start gap-3 ${
                        active
                          ? "bg-[#EAF2FB] text-[#0A84FF]"
                          : "hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          active ? "text-[#0A84FF]" : "text-[#6E6E73] dark:text-[#8E8E93]"
                        }`}
                      >
                        {l.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-medium ${
                            active ? "" : "text-[#1D1D1F] dark:text-[#F5F5F7]"
                          }`}
                        >
                          {l.label}
                        </div>
                        <div
                          className={`text-xs mt-0.5 leading-tight ${
                            active ? "text-[#0A84FF]/80" : "text-[#8E8E93]"
                          }`}
                        >
                          {l.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Layers */}
            <MapLayersPanel value={layers} onChange={setLayers} />

            {/* Summary */}
            <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-4">
              <div className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-3">
                Summary
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Sites" value={summary.sites} />
                <Stat label="Prospects" value={summary.prospects} />
                <Stat label="Qualified" value={summary.qualified} />
                <Stat label="Bases" value={summary.bases} />
              </div>
            </div>
          </div>

          {/* Reset View button */}
          <button
            onClick={() => setResetSignal((s) => s + 1)}
            className="mt-4 w-full h-10 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] text-sm flex items-center justify-center gap-2 hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E] transition"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M3 10a7 7 0 1 0 2-5" />
              <path d="M3 4v4h4" />
            </svg>
            Reset view
          </button>
        </aside>

        {/* ============================ MAP ============================ */}
        <div className="lg:col-span-6 space-y-3">
          <div className="relative">
            <input
              placeholder="Search site, customer, or location..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] text-sm focus:outline-none focus:border-[#0A84FF]"
            />
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4 4" />
            </svg>
          </div>

          <div className="h-[calc(100vh-220px)] min-h-[600px]">
            <MapView
              sites={sites}
              prospects={prospects}
              bases={bases}
              coverageAreas={coverageAreas}
              layers={layers}
              resetSignal={resetSignal}
              onSelect={setSelection}
            />
          </div>
        </div>

        {/* ============================ DETAIL PANEL ============================ */}
        <aside className="lg:col-span-3">
          {selection ? (
            <DetailPanel
              selection={selection}
              nearbyProspects={siteContext?.nearbyProspects ?? []}
              nearbyBase={siteContext?.nearestBase ?? null}
              margin={siteContext?.margin ?? 0}
              activeOrders={siteContext?.activeOrders ?? 0}
              onClose={() => setSelection(null)}
              onAddProspect={() => setShowAddProspect(true)}
            />
          ) : (
            <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
              <div className="text-3xl mb-3">🗺️</div>
              <div className="text-sm font-medium mb-1">No Selection</div>
              <div className="text-xs text-[#8E8E93] max-w-xs">
                Click a marker on the map to view details.
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ============================ MODALS ============================ */}
      <ProspectModal
        open={showAddProspect}
        onClose={() => setShowAddProspect(false)}
        defaultCenter={{ lat: avgLat, lng: avgLng }}
      />
      <BaseModal
        open={showAddBase}
        onClose={() => setShowAddBase(false)}
        defaultCenter={{ lat: avgLat, lng: avgLng }}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#F6F6F7] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg p-2.5">
      <div className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}