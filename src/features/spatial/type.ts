export type Prospect = {
  id: string;
  code: string;
  name: string;
  type: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  province: string | null;
  city: string | null;
  est_demand: number;
  est_demand_uom: string;
  score: number;
  status: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OperationalBase = {
  id: string;
  code: string;
  name: string;
  type: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  province: string | null;
  city: string | null;
  capacity: number;
  capacity_uom: string;
  operational_cost: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SiteMarker = {
  id: string;
  code: string;
  name: string;
  customer_id: string;
  customer_name: string;
  business_model: string | null;
  site_status: string;
  latitude: number;
  longitude: number;
  province: string | null;
  city: string | null;
};

export type MarketArea = {
  id: string;
  code: string;
  name: string;
  type: string | null;
  geometry: GeoJSON.MultiPolygon;
  province: string | null;
};

export type CoverageArea = {
  id: string;
  base_id: string;
  radius_km: number;
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
  computed_at: string;
};

export type Scenario = {
  id: string;
  name: string;
  description: string | null;
  base_lat: number;
  base_lng: number;
  radius_km: number;
  status: string;
  created_at: string;
};

export type ScenarioMetrics = {
  prospects_covered: number;
  new_prospects: number;
  sites_covered: number;
  estimated_demand: number;
  score: number;
};

export type MapLens = "portfolio" | "opportunity" | "coverage" | "expansion" | "scenario";

export type MapLayer =
  | "sites"
  | "prospects"
  | "bases"
  | "market_areas"
  | "coverage"
  | "road_network"
  | "province_boundary";