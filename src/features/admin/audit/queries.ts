import { createClient } from "@/lib/supabase/server";

// ============================================================
// TYPES
// ============================================================
export type AuditLog = {
  id: string;
  event_id: string;
  timestamp: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  module: string;
  resource_type: string | null;
  resource_id: string | null;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  result: string;
  ip_context: string | null;
  session_id: string | null;
  request_id: string | null;
};

// ============================================================
// LIST
// ============================================================
export async function listAuditLogs({
  q,
  module,
  action,
  result,
  actor,
  from,
  to,
  page = 1,
  pageSize = 20,
}: {
  q?: string;
  module?: string;
  action?: string;
  result?: string;
  actor?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();

  // Fetch all (karena ada enrichment + filter client-side).
  // Untuk production, gunakan server-side pagination di Supabase.
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .limit(500);

  if (q) {
    query = query.or(
      `action.ilike.%${q}%,module.ilike.%${q}%,resource_type.ilike.%${q}%,resource_id.ilike.%${q}%`
    );
  }
  if (module && module !== "all") query = query.eq("module", module);
  if (action && action !== "all") query = query.eq("action", action);
  if (result && result !== "all") query = query.eq("result", result);
  if (actor) query = query.eq("actor_user_id", actor);
  if (from) query = query.gte("timestamp", from);
  if (to) query = query.lte("timestamp", to + "T23:59:59");

  const { data, count, error } = await query;
  if (error) {
    console.error("[listAuditLogs]", error);
    return { data: [], count: 0 };
  }

  // Enrich actor names
  const actorIds = Array.from(
    new Set((data ?? []).map((l) => l.actor_user_id).filter(Boolean))
  );
  const { data: profiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Get roles
  const { data: userRoles } = actorIds.length
    ? await supabase
        .from("user_roles")
        .select("user_id, roles(display_name)")
        .in("user_id", actorIds)
    : { data: [] as { user_id: string; roles?: { display_name?: string } | null }[] };

  const roleMap = new Map<string, string>();
  for (const ur of userRoles ?? []) {
    const name = (ur.roles as { display_name?: string } | null)?.display_name;
    if (name && !roleMap.has(ur.user_id)) {
      roleMap.set(ur.user_id, name);
    }
  }

  const enriched: AuditLog[] = (data ?? []).map((l) => {
    const p = l.actor_user_id ? pmap.get(l.actor_user_id) : null;
    return {
      id: l.id,
      event_id: l.event_id ?? l.id,
      timestamp: l.timestamp,
      actor_user_id: l.actor_user_id,
      actor_name: p?.full_name ?? null,
      actor_email: p?.email ?? null,
      actor_role: l.actor_user_id ? roleMap.get(l.actor_user_id) ?? null : null,
      action: l.action,
      module: l.module,
      resource_type: l.resource_type,
      resource_id: l.resource_id,
      old_value: l.old_value,
      new_value: l.new_value,
      reason: l.reason,
      result: l.result ?? "SUCCESS",
      ip_context: l.ip_context,
      session_id: l.session_id,
      request_id: l.request_id,
    };
  });

  const totalCount = count ?? enriched.length;
  const fromIdx = (page - 1) * pageSize;
  const paginated = enriched.slice(fromIdx, fromIdx + pageSize);

  return { data: paginated, count: totalCount };
}

// ============================================================
// UNIQUE VALUES untuk filter dropdown
// ============================================================
export async function getAuditFilterOptions() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_logs")
    .select("module, action, actor_user_id")
    .limit(5000);

  const modules = new Set<string>();
  const actions = new Set<string>();
  const actors = new Set<string>();

  for (const r of data ?? []) {
    if (r.module) modules.add(r.module);
    if (r.action) actions.add(r.action);
    if (r.actor_user_id) actors.add(r.actor_user_id);
  }

  const actorIds = Array.from(actors);
  const { data: profiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds)
        .order("full_name")
    : { data: [] };

  return {
    modules: Array.from(modules).sort(),
    actions: Array.from(actions).sort(),
    actors:
      (profiles ?? []).map((p) => ({
        id: p.id,
        name: p.full_name ?? p.email,
      })) ?? [],
  };
}

// ============================================================
// STATS
// ============================================================
export async function getAuditStats() {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ count: total }, { count: today }, { count: failed }] =
    await Promise.all([
      supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("timestamp", todayStart.toISOString()),
      supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("result", "FAILED"),
    ]);

  return {
    total: total ?? 0,
    today: today ?? 0,
    failed: failed ?? 0,
  };
}