import { createClient } from "@/lib/supabase/server";
import type {
  Prospect,
  OperationalBase,
  SiteMarker,
  MarketArea,
  CoverageArea,
  Scenario,
  ScenarioMetrics,
} from "./types";

// ============================================================
// SITES (existing data)
// ============================================================
export async function listSitesWithLocation(): Promise<SiteMarker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select(
      "id, code, name, customer_id, business_model, site_status, latitude, longitude, province, city, customers(name)"
    )
    .eq("is_active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    console.error("[listSitesWithLocation]", error);
    return [];
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    customer_id: s.customer_id,
    customer_name: (s.customers as { name?: string } | null)?.name ?? "—",
    business_model: s.business_model,
    site_status: s.site_status,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    province: s.province,
    city: s.city,
  }));
}

// ============================================================
// PROSPECTS
// ============================================================
export async function listProspects(): Promise<Prospect[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("is_active", true)
    .order("score", { ascending: false });

  if (error) {
    console.error("[listProspects]", error);
    return [];
  }
  return (data ?? []) as Prospect[];
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Prospect) ?? null;
}

// ============================================================
// BASES
// ============================================================
export async function listBases(): Promise<OperationalBase[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operational_bases")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[listBases]", error);
    return [];
  }
  return (data ?? []) as OperationalBase[];
}

// ============================================================
// MARKET AREAS
// ============================================================
export async function listMarketAreas(): Promise<MarketArea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_areas")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("[listMarketAreas]", error);
    return [];
  }
  return (data ?? []) as MarketArea[];
}

// ============================================================
// COVERAGE AREAS
// ============================================================
export async function listCoverageAreas(): Promise<CoverageArea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coverage_areas")
    .select("*")
    .order("computed_at", { ascending: false });

  if (error) {
    console.error("[listCoverageAreas]", error);
    return [];
  }
  return (data ?? []) as CoverageArea[];
}

// ============================================================
// SCENARIOS
// ============================================================
export async function listScenarios(): Promise<Scenario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spatial_scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listScenarios]", error);
    return [];
  }
  return (data ?? []) as Scenario[];
}

export async function getScenarioMetrics(
  scenarioId: string
): Promise<ScenarioMetrics | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scenario_results")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    prospects_covered: data.prospects_covered ?? 0,
    new_prospects: data.new_prospects ?? 0,
    sites_covered: data.sites_covered ?? 0,
    estimated_demand: Number(data.estimated_demand ?? 0),
    score: Number(data.score ?? 0),
  };
}

// ============================================================
// DASHBOARD SUMMARY
// ============================================================
export async function getSpatialSummary() {
  const supabase = await createClient();

  const [
    { count: sitesCount },
    { count: prospectsCount },
    { count: basesCount },
    { data: prospects },
  ] = await Promise.all([
    supabase
      .from("sites")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .not("latitude", "is", null),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("operational_bases")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("prospects")
      .select("status, est_demand, score")
      .eq("is_active", true),
  ]);

  const rows = prospects ?? [];
  const qualified = rows.filter((p) => p.status === "QUALIFIED").length;
  const totalDemand = rows.reduce(
    (a, p) => a + Number(p.est_demand ?? 0),
    0
  );
  const avgScore =
    rows.length > 0
      ? rows.reduce((a, p) => a + Number(p.score ?? 0), 0) / rows.length
      : 0;

  return {
    sites: sitesCount ?? 0,
    prospects: prospectsCount ?? 0,
    qualified,
    bases: basesCount ?? 0,
    totalDemand,
    avgScore,
  };
}