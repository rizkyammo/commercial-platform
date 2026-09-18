"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type {
  Prospect,
  OperationalBase,
  SiteMarker,
  CoverageArea,
} from "@/features/spatial/types";

// ============================ TYPES ============================

export type LayerVisibility = {
  sites: boolean;
  prospects: boolean;
  bases: boolean;
  coverage: boolean;
  market_areas: boolean;
};

export type MapSelection =
  | { type: "site"; data: SiteMarker }
  | { type: "prospect"; data: Prospect }
  | { type: "base"; data: OperationalBase }
  | null;

// ============================ CONSTANTS ============================

const DEFAULT_CENTER: [number, number] = [-1.0, 116.0];
const DEFAULT_ZOOM = 5;

// ============================ MAIN ============================

export function MapView({
  sites,
  prospects,
  bases,
  coverageAreas,
  layers,
  resetSignal = 0,
  onSelect,
}: {
  sites: SiteMarker[];
  prospects: Prospect[];
  bases: OperationalBase[];
  coverageAreas: CoverageArea[];
  layers: LayerVisibility;
  resetSignal?: number;
  onSelect: (s: MapSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const groupsRef = useRef<Record<string, L.LayerGroup>>({});
  const [ready, setReady] = useState(false);

  // ============================================================
  // INIT MAP (client-side only)
  // ============================================================
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      // Dynamic import — Leaflet requires window
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      // Fix Leaflet default icon path issue di Next.js
      // (kita pakai custom divIcon jadi sebenarnya tidak butuh default icon)
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Init map
      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
      });

      // Tile layer — OSM
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Create layer groups
      groupsRef.current = {
        coverage: L.layerGroup().addTo(map),
        market_areas: L.layerGroup().addTo(map),
        bases: L.layerGroup().addTo(map),
        sites: L.layerGroup().addTo(map),
        prospects: L.layerGroup().addTo(map),
      };

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      groupsRef.current = {};
      setReady(false);
    };
  }, []);

  // ============================================================
  // RENDER LAYERS
  // ============================================================
  useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const groups = groupsRef.current;

    // ============================================
    // COVERAGE (drawn first, at the bottom)
    // ============================================
    groups.coverage?.clearLayers();
    if (layers.coverage && coverageAreas.length > 0) {
      coverageAreas.forEach((c) => {
        if (!c.geometry) return;
        try {
          L.geoJSON(c.geometry, {
            style: {
              color: "#0A84FF",
              weight: 1.5,
              fillColor: "#0A84FF",
              fillOpacity: 0.06,
              dashArray: "5, 5",
            },
          }).addTo(groups.coverage);
        } catch (e) {
          console.warn("Failed to render coverage:", e);
        }
      });
    }

    // ============================================
    // SITES
    // ============================================
    groups.sites?.clearLayers();
    if (layers.sites) {
      sites.forEach((s) => {
        if (!s.latitude || !s.longitude) return;

        const marker = L.marker([s.latitude, s.longitude], {
          icon: L.divIcon({
            className: "spatial-marker",
            html: `
              <div style="
                width:16px;height:16px;border-radius:50%;
                background:#34C759;border:2.5px solid white;
                box-shadow:0 2px 6px rgba(0,0,0,.25);
                cursor:pointer;
              "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        });

        marker.on("click", () => {
          onSelect({ type: "site", data: s });
        });

        marker.bindTooltip(
          `<div style="font-size:12px;line-height:1.4;">
            <strong>${s.name}</strong><br/>
            <span style="color:#6E6E73;font-size:10px;">
              Site · ${s.customer_name}
            </span>
          </div>`,
          { direction: "top", offset: [0, -10] }
        );

        marker.addTo(groups.sites);
      });
    }

    // ============================================
    // PROSPECTS
    // ============================================
    groups.prospects?.clearLayers();
    if (layers.prospects) {
      prospects.forEach((p) => {
        if (!p.latitude || !p.longitude) return;

        const color =
          p.status === "QUALIFIED"
            ? "#0A84FF"
            : p.status === "CONTACTED"
              ? "#FF9500"
              : p.status === "CONVERTED"
                ? "#34C759"
                : p.status === "LOST"
                  ? "#FF3B30"
                  : "#8E8E93";

        const marker = L.marker([Number(p.latitude), Number(p.longitude)], {
          icon: L.divIcon({
            className: "spatial-marker",
            html: `
              <div style="
                width:14px;height:14px;border-radius:50%;
                background:${color};border:2.5px solid white;
                box-shadow:0 2px 6px rgba(0,0,0,.25);
                cursor:pointer;
              "></div>
            `,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        });

        marker.on("click", () => {
          onSelect({ type: "prospect", data: p });
        });

        marker.bindTooltip(
          `<div style="font-size:12px;line-height:1.4;">
            <strong>${p.name}</strong><br/>
            <span style="color:#6E6E73;font-size:10px;">
              Prospect · ${p.status} · Score ${Number(p.score).toFixed(0)}
            </span>
          </div>`,
          { direction: "top", offset: [0, -10] }
        );

        marker.addTo(groups.prospects);
      });
    }

    // ============================================
    // BASES (drawn last, above everything)
    // ============================================
    groups.bases?.clearLayers();
    if (layers.bases) {
      bases.forEach((b) => {
        if (!b.latitude || !b.longitude) return;

        const marker = L.marker([Number(b.latitude), Number(b.longitude)], {
          icon: L.divIcon({
            className: "spatial-marker",
            html: `
              <div style="
                width:18px;height:18px;
                background:#5E5CE6;border:2.5px solid white;
                box-shadow:0 2px 6px rgba(0,0,0,.25);
                transform:rotate(45deg);
                border-radius:3px;
                cursor:pointer;
              "></div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        });

        marker.on("click", () => {
          onSelect({ type: "base", data: b });
        });

        marker.bindTooltip(
          `<div style="font-size:12px;line-height:1.4;">
            <strong>${b.name}</strong><br/>
            <span style="color:#6E6E73;font-size:10px;">
              Base · ${b.type ?? "—"}
            </span>
          </div>`,
          { direction: "top", offset: [0, -10] }
        );

        marker.addTo(groups.bases);
      });
    }

    // ============================================
    // FIT BOUNDS TO ALL VISIBLE MARKERS
    // ============================================
    const points: [number, number][] = [];
    if (layers.sites)
      sites.forEach((s) => {
        if (s.latitude && s.longitude) points.push([s.latitude, s.longitude]);
      });
    if (layers.prospects)
      prospects.forEach((p) => {
        if (p.latitude && p.longitude)
          points.push([Number(p.latitude), Number(p.longitude)]);
      });
    if (layers.bases)
      bases.forEach((b) => {
        if (b.latitude && b.longitude)
          points.push([Number(b.latitude), Number(b.longitude)]);
      });

    if (points.length > 0 && mapRef.current) {
      try {
        const bounds = L.latLngBounds(points);
        mapRef.current.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 10,
          animate: true,
          duration: 0.5,
        });
      } catch (e) {
        console.warn("fitBounds failed:", e);
      }
    }
  }, [ready, layers, sites, prospects, bases, coverageAreas, onSelect]);

  // ============================================================
  // RESET VIEW (triggered by parent)
  // ============================================================
  useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current) return;
    if (resetSignal === 0) return;

    const L = leafletRef.current;
    const points: [number, number][] = [];

    sites.forEach((s) => {
      if (s.latitude && s.longitude) points.push([s.latitude, s.longitude]);
    });
    prospects.forEach((p) => {
      if (p.latitude && p.longitude)
        points.push([Number(p.latitude), Number(p.longitude)]);
    });
    bases.forEach((b) => {
      if (b.latitude && b.longitude)
        points.push([Number(b.latitude), Number(b.longitude)]);
    });

    if (points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        mapRef.current.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 10,
          animate: true,
          duration: 0.5,
        });
      } catch (e) {
        console.warn("reset fitBounds failed:", e);
      }
    } else {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative w-full h-full min-h-[600px] rounded-xl overflow-hidden border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F6F6F7] z-10">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-6 h-6 text-[#8E8E93] animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">Loading map...</div>
          </div>
        </div>
      )}
    </div>
  );
}