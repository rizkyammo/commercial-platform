import { createClient } from "@/lib/supabase/server";

// ============================================================
// ORGANISATION UNITS
// ============================================================
export type OrgUnit = {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  manager_id: string | null;
  manager_name?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  user_count?: number;
};

export async function listOrgUnits(): Promise<OrgUnit[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .order("name");

  if (error) {
    console.error("[listOrgUnits]", error);
    return [];
  }

  // Ambil manager names
  const managerIds = Array.from(
    new Set((data ?? []).map((o) => o.manager_id).filter(Boolean))
  );
  const { data: managers } = managerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", managerIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const mmap = new Map((managers ?? []).map((m) => [m.id, m]));

  // Count users per org
  const orgIds = (data ?? []).map((o) => o.id);
  const { data: profiles } = orgIds.length
    ? await supabase
        .from("profiles")
        .select("organisation_id")
        .in("organisation_id", orgIds)
        .eq("is_active", true)
    : { data: [] as { organisation_id: string | null }[] };

  const userCountMap = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (p.organisation_id) {
      userCountMap.set(
        p.organisation_id,
        (userCountMap.get(p.organisation_id) ?? 0) + 1
      );
    }
  }

  return (data ?? []).map((o) => {
    const mgr = o.manager_id ? mmap.get(o.manager_id) : null;
    return {
      id: o.id,
      code: o.code,
      name: o.name,
      type: o.type,
      parent_id: o.parent_id,
      description: o.description,
      is_active: o.is_active,
      manager_id: o.manager_id,
      manager_name: mgr?.full_name ?? mgr?.email ?? null,
      created_at: o.created_at,
      updated_at: o.updated_at,
      created_by: o.created_by,
      updated_by: o.updated_by,
      user_count: userCountMap.get(o.id) ?? 0,
    };
  });
}

export async function getOrgUnit(id: string): Promise<OrgUnit | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  let manager_name: string | null = null;
  if (data.manager_id) {
    const { data: mgr } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.manager_id)
      .maybeSingle();
    manager_name = mgr?.full_name ?? mgr?.email ?? null;
  }

  return { ...data, manager_name } as OrgUnit;
}

export async function getOrgStats() {
  const supabase = await createClient();

  const [
    { count: businessUnits },
    { count: departments },
    { count: locations },
    { count: users },
  ] = await Promise.all([
    supabase
      .from("organisations")
      .select("*", { count: "exact", head: true })
      .eq("type", "unit")
      .eq("is_active", true),
    supabase
      .from("organisations")
      .select("*", { count: "exact", head: true })
      .eq("type", "department")
      .eq("is_active", true),
    supabase
      .from("organisations")
      .select("*", { count: "exact", head: true })
      .eq("type", "location")
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return {
    businessUnits: businessUnits ?? 0,
    departments: departments ?? 0,
    locations: locations ?? 0,
    users: users ?? 0,
  };
}

// ============================================================
// USERS BY ORG
// ============================================================
export async function listUsersByOrg(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, is_active, last_login_at")
    .eq("organisation_id", orgId)
    .order("full_name");
  return data ?? [];
}