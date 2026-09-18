"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import {
  prospectSchema,
  operationalBaseSchema,
  scenarioSchema,
} from "@/lib/validation/spatial";

// ============================================================
// PROSPECTS
// ============================================================
export async function createProspect(input: unknown) {
  const parsed = prospectSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("prospects")
    .insert({ ...parsed.data, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "CREATE",
    module: "Spatial",
    resourceType: "prospect",
    resourceId: data.id,
    newValue: { code: data.code, name: data.name },
  });

  revalidatePath("/spatial");
  return { data };
}

export async function updateProspect(id: string, input: unknown) {
  const parsed = prospectSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: old } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("prospects")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "UPDATE",
    module: "Spatial",
    resourceType: "prospect",
    resourceId: id,
    oldValue: old,
    newValue: data,
  });

  revalidatePath("/spatial");
  return { data };
}

export async function deleteProspect(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) return { error: error.message };

  await writeAudit({
    action: "DELETE",
    module: "Spatial",
    resourceType: "prospect",
    resourceId: id,
  });

  revalidatePath("/spatial");
  return { ok: true };
}

// ============================================================
// BASES
// ============================================================
export async function createBase(input: unknown) {
  const parsed = operationalBaseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("operational_bases")
    .insert({ ...parsed.data, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "CREATE",
    module: "Spatial",
    resourceType: "base",
    resourceId: data.id,
    newValue: { code: data.code, name: data.name },
  });

  revalidatePath("/spatial");
  return { data };
}

export async function updateBase(id: string, input: unknown) {
  const parsed = operationalBaseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("operational_bases")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/spatial");
  return { data };
}

export async function deleteBase(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("operational_bases")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/spatial");
  return { ok: true };
}

// ============================================================
// COMPUTE COVERAGE
// ============================================================
export async function computeCoverage(baseId: string, radiusKm: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.rpc("recompute_coverage", {
    p_base_id: baseId,
    p_radius_km: radiusKm,
  });

  if (error) return { error: error.message };
  revalidatePath("/spatial");
  return { ok: true };
}

// ============================================================
// SCENARIOS
// ============================================================
export async function createScenario(input: unknown) {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: scenario, error } = await supabase
    .from("spatial_scenarios")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  // Compute metrics
  const metrics = await computeScenarioMetrics(
    parsed.data.base_lat,
    parsed.data.base_lng,
    parsed.data.radius_km
  );

  await supabase.from("scenario_results").insert({
    scenario_id: scenario.id,
    prospects_covered: metrics.prospects_covered,
    new_prospects: metrics.new_prospects,
    sites_covered: metrics.sites_covered,
    estimated_demand: metrics.estimated_demand,
    score: metrics.score,
  });

  revalidatePath("/spatial");
  return { data: { ...scenario, metrics } };
}

async function computeScenarioMetrics(
  lat: number,
  lng: number,
  radiusKm: number
) {
  const supabase = await createClient();

  // Prospects in radius
  const { data: rpcResult } = await supabase.rpc("prospects_within_radius", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
  });
  const prospectIds = (rpcResult ?? []).map(
    (p: { prospect_id: string }) => p.prospect_id
  );

  let prospectsCovered = 0;
  let estimatedDemand = 0;
  if (prospectIds.length > 0) {
    const { data: pdata } = await supabase
      .from("prospects")
      .select("id, est_demand, status")
      .in("id", prospectIds);
    prospectsCovered = pdata?.length ?? 0;
    estimatedDemand = (pdata ?? []).reduce(
      (a, p) => a + Number(p.est_demand ?? 0),
      0
    );
  }

  // Compute new prospects = prospects covered that aren't already covered by existing bases
  const { data: existingBases } = await supabase
    .from("operational_bases")
    .select("latitude, longitude")
    .eq("is_active", true);

  const coveredByExisting = new Set<string>();
  for (const p of prospectIds) {
    // Find prospect location
    const { data: prospect } = await supabase
      .from("prospects")
      .select("latitude, longitude")
      .eq("id", p)
      .single();

    if (!prospect?.latitude || !prospect?.longitude) continue;

    for (const b of existingBases ?? []) {
      if (!b.latitude || !b.longitude) continue;
      const d = haversine(
        Number(b.latitude),
        Number(b.longitude),
        Number(prospect.latitude),
        Number(prospect.longitude)
      );
      if (d <= 50) {
        // existing coverage radius assumption 50km
        coveredByExisting.add(p);
        break;
      }
    }
  }

  const newProspects = prospectIds.filter(
    (p) => !coveredByExisting.has(p)
  ).length;

  // Sites in radius (JS-side filter)
  const { data: sites } = await supabase
    .from("sites")
    .select("latitude, longitude")
    .eq("is_active", true)
    .not("latitude", "is", null);

  const sitesCovered = (sites ?? []).filter((s) => {
    if (!s.latitude || !s.longitude) return false;
    return (
      haversine(lat, lng, Number(s.latitude), Number(s.longitude)) <= radiusKm
    );
  }).length;

  // Simple scoring
  const score = Math.min(
    100,
    prospectsCovered * 5 + newProspects * 10 + sitesCovered * 3
  );

  return {
    prospects_covered: prospectsCovered,
    new_prospects: newProspects,
    sites_covered: sitesCovered,
    estimated_demand: estimatedDemand,
    score,
  };
}

function haversine(
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

export async function deleteScenario(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("spatial_scenarios")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/spatial");
  return { ok: true };
}

// ============================================================
// SITE CONTEXT (Server Action — callable from client)
// ============================================================
export async function getSiteContextAction(
  siteId: string,
  siteLat: number,
  siteLng: number
) {
  const supabase = await createClient();

  // ---------- Nearby prospects (within 100km) ----------
  const { data: rawProspects } = await supabase
    .from("prospects")
    .select("*")
    .eq("is_active", true);

  const nearbyProspects = (rawProspects ?? [])
    .filter((p) => {
      if (!p.latitude || !p.longitude) return false;
      const d = haversineKm(
        siteLat,
        siteLng,
        Number(p.latitude),
        Number(p.longitude)
      );
      return d <= 100;
    })
    .sort((a, b) => {
      const da = haversineKm(
        siteLat,
        siteLng,
        Number(a.latitude),
        Number(a.longitude)
      );
      const db = haversineKm(
        siteLat,
        siteLng,
        Number(b.latitude),
        Number(b.longitude)
      );
      return da - db;
    });

  // ---------- Nearest base ----------
  const { data: rawBases } = await supabase
    .from("operational_bases")
    .select("name, latitude, longitude")
    .eq("is_active", true);

  let nearestBase: { name: string; distance_km: number } | null = null;
  let minDist = Infinity;
  for (const b of rawBases ?? []) {
    if (!b.latitude || !b.longitude) continue;
    const d = haversineKm(
      siteLat,
      siteLng,
      Number(b.latitude),
      Number(b.longitude)
    );
    if (d < minDist) {
      minDist = d;
      nearestBase = { name: b.name, distance_km: d };
    }
  }

  // ---------- Margin + active orders ----------
  const { data: orders } = await supabase
    .from("orders")
    .select("selling_value, total_direct_cost, status")
    .eq("site_id", siteId)
    .not("status", "in", "(DRAFT,CANCELLED)");

  const all = orders ?? [];
  const totalSelling = all.reduce(
    (a, o) => a + Number(o.selling_value ?? 0),
    0
  );
  const totalCost = all.reduce(
    (a, o) => a + Number(o.total_direct_cost ?? 0),
    0
  );
  const margin =
    totalSelling > 0 ? ((totalSelling - totalCost) / totalSelling) * 100 : 0;

  const activeOrders = all.filter((o) =>
    ["ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED"].includes(o.status)
  ).length;

  return {
    nearbyProspects,
    nearestBase,
    margin,
    activeOrders,
  };
}

// Helper: haversine distance
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