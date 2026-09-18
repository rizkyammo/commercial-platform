import { createClient } from "@/lib/supabase/server";

// ============================================================
// TYPES
// ============================================================
export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  organisation_id: string | null;
  organisation_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  roles: { id: string; name: string; display_name: string }[];
};

// ============================================================
// LIST USERS
// ============================================================
export async function listUsers({
  q,
  roleId,
  status,
  orgId,
}: {
  q?: string;
  roleId?: string;
  status?: string;
  orgId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  if (orgId) query = query.eq("organisation_id", orgId);

  const { data, error } = await query;
  if (error) {
    console.error("[listUsers]", error);
    return [];
  }

  // Enrich: org names
  const orgIds = Array.from(
    new Set((data ?? []).map((p) => p.organisation_id).filter(Boolean))
  );
  const { data: orgs } = orgIds.length
    ? await supabase.from("organisations").select("id, name").in("id", orgIds)
    : { data: [] };
  const omap = new Map((orgs ?? []).map((o) => [o.id, o]));

  // Enrich: user roles
  const userIds = (data ?? []).map((p) => p.id);
  const { data: userRoles } = userIds.length
    ? await supabase
        .from("user_roles")
        .select("user_id, roles(id, name, display_name)")
        .in("user_id", userIds)
    : { data: [] };

  const rolesByUser = new Map<
    string,
    { id: string; name: string; display_name: string }[]
  >();
  for (const ur of userRoles ?? []) {
    const r = ur.roles as { id: string; name: string; display_name: string } | null;
    if (!r) continue;
    const arr = rolesByUser.get(ur.user_id) ?? [];
    arr.push(r);
    rolesByUser.set(ur.user_id, arr);
  }

  const rows: UserRow[] = (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    phone: (p as { phone?: string | null }).phone ?? null,
    job_title: (p as { job_title?: string | null }).job_title ?? null,
    department: (p as { department?: string | null }).department ?? null,
    organisation_id: p.organisation_id,
    organisation_name: p.organisation_id
      ? omap.get(p.organisation_id)?.name ?? null
      : null,
    is_active: p.is_active,
    last_login_at: (p as { last_login_at?: string | null }).last_login_at ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at,
    roles: rolesByUser.get(p.id) ?? [],
  }));

  // Filter by role (client-side karena join)
  let filtered = rows;
  if (roleId) {
    filtered = rows.filter((r) => r.roles.some((x) => x.id === roleId));
  }

  return filtered;
}

// ============================================================
// STATS
// ============================================================
export async function getUserStats() {
  const supabase = await createClient();

  const [
    { count: total },
    { count: active },
    { count: inactive },
    { count: roles },
    { data: depts },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false),
    supabase.from("roles").select("*", { count: "exact", head: true }),
    supabase
      .from("organisations")
      .select("id", { count: "exact", head: true })
      .eq("type", "department")
      .eq("is_active", true),
  ]);

  return {
    total: total ?? 0,
    active: active ?? 0,
    inactive: inactive ?? 0,
    roles: roles ?? 0,
    departments: depts ?? 0,
  };
}

// ============================================================
// REFERENCE DATA
// ============================================================
export async function listRoles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roles")
    .select("id, name, display_name")
    .order("display_name");
  return data ?? [];
}

export async function listPermissions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("permissions")
    .select("id, code, description")
    .order("code");
  return data ?? [];
}

export async function listOrgUnitsSimple() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select("id, code, name, type")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}