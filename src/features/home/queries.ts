import { createClient } from "@/lib/supabase/server";

// ============================================================
// HOME DASHBOARD — semua data untuk home page
// ============================================================

export type NextAction = {
  id: string;
  order_number: string;
  po_number: string | null;
  customer_name: string;
  site_name: string;
  status: string;
  status_label: string;
  due_date: string | null;
  action_label: string;
  action_href: string;
  urgency: "overdue" | "today" | "upcoming" | "normal";
};

export type OrderProgressItem = {
  stage: string;
  count: number;
  total: number;
};

export type ActivityItem = {
  id: string;
  time: string;
  actor: string;
  action: string;
  reference: string;
  tone: "green" | "blue" | "orange" | "grey";
};

export type HomeData = Awaited<ReturnType<typeof getHomeDashboard>>;

export async function getHomeDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Kalau tidak ada user, return empty data.
  // Layout sudah redirect ke /login, jadi ini hanya fallback.
  if (!user) {
    return {
      profile: { full_name: "Guest", email: "" },
      greeting: "Good morning",
      today: new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      unread: 0,
      kpis: {
        waitingBast: 0,
        draftOrders: 0,
        readyToShip: 0,
        complianceBlocked: 0,
      },
      todayPanel: {
        poCreated: 0,
        shipmentConfirmed: 0,
        bastCompleted: 0,
        complianceAlert: 0,
      },
      nextActions: [],
      orderProgress: [],
      complianceQuota: {
        sk_number: null as string | null,
        allocation: 0,
        committed: 0,
        realized: 0,
        available: 0,
        utilization: 0,
      },
      recentActivity: [],
    };
  }

  const [{ data: profile }, { count: unread }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single(),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  // ============ KPI Cards ============
  const [
    { count: waitingBast },
    { count: draftOrders },
    { count: readyToShip },
    { count: complianceBlocked },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"])
      .neq("bast_status", "COMPLETED"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "DRAFT"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "ISSUED")
      .eq("procurement_status", "COMPLETED"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "APPROVED")
      .neq("compliance_status", "COMPLETED"),
  ]);

  // ============ Today's Numbers ============
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [
    { count: poCreatedToday },
    { count: shipmentConfirmedToday },
    { count: bastCompletedToday },
    { count: complianceAlertToday },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO),
    supabase
      .from("shipments")
      .select("*", { count: "exact", head: true })
      .gte("confirmed_at", todayISO),
    supabase
      .from("basts")
      .select("*", { count: "exact", head: true })
      .gte("completed_at", todayISO),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("type", "QUOTA_WARNING")
      .gte("created_at", todayISO),
  ]);

  // ============ Next Actions ============
  const { data: rawOrders } = await supabase
    .from("orders")
    .select(
      "id, order_number, po_number, status, business_model, current_stage, bast_status, compliance_status, procurement_status, shipment_status, delivery_status, created_at, updated_at, customers(name), sites(name)"
    )
    .not("status", "in", "(CANCELLED,CLOSED)")
    .order("updated_at", { ascending: false })
    .limit(30);

 const nextActions: NextAction[] = (rawOrders ?? [])
  .map((o): NextAction | null => {
    const customer = (o.customers as { name?: string } | null)?.name ?? "—";
    const site = (o.sites as { name?: string } | null)?.name ?? "—";

    if (["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED"].includes(o.status)) {
      return {
        id: o.id,
        order_number: o.order_number,
        po_number: o.po_number,
        customer_name: customer,
        site_name: site,
        status: o.status,
        status_label: labelFor(o.status),
        due_date: null,
        action_label: o.status === "DRAFT" ? "Continue" : "Review",
        action_href: `/orders/${o.id}`,
        urgency: "normal",
      };
    }
    if (o.status === "APPROVED") {
      return {
        id: o.id,
        order_number: o.order_number,
        po_number: o.po_number,
        customer_name: customer,
        site_name: site,
        status: "APPROVED",
        status_label: "Ready to issue",
        due_date: null,
        action_label: "Issue Order",
        action_href: `/orders/${o.id}`,
        urgency: "today",
      };
    }
    if (o.status === "ISSUED") {
      return {
        id: o.id,
        order_number: o.order_number,
        po_number: o.po_number,
        customer_name: customer,
        site_name: site,
        status: "ISSUED",
        status_label: "Procurement",
        due_date: null,
        action_label: "Complete Procurement",
        action_href: `/orders/${o.id}`,
        urgency: "upcoming",
      };
    }
    if (
      ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(o.status) &&
      o.bast_status !== "COMPLETED"
    ) {
      return {
        id: o.id,
        order_number: o.order_number,
        po_number: o.po_number,
        customer_name: customer,
        site_name: site,
        status: "WAITING_BAST",
        status_label: "Waiting BAST",
        due_date: null,
        action_label: "Add BAST",
        action_href: `/orders/${o.id}`,
        urgency: "overdue",
      };
    }
    return null;
  })
  .filter((x): x is NextAction => x !== null)
  .slice(0, 5);

  // ============ Order Progress ============
  const { data: allOrders } = await supabase
    .from("orders")
    .select("status, current_stage, bast_status, compliance_status")
    .not("status", "in", "(CANCELLED)");

  const stages = ["PO", "COMPLIANCE", "PROCUREMENT", "SHIPMENT", "DELIVERY", "BAST"];
  const progressMap = new Map<string, number>();
  for (const s of stages) progressMap.set(s, 0);

  let total = 0;
  for (const o of allOrders ?? []) {
    total += 1;
    if (["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED"].includes(o.status)) {
      progressMap.set("PO", (progressMap.get("PO") ?? 0) + 1);
    } else if (o.compliance_status !== "COMPLETED") {
      progressMap.set("COMPLIANCE", (progressMap.get("COMPLIANCE") ?? 0) + 1);
    } else if (o.status === "ISSUED") {
      progressMap.set("PROCUREMENT", (progressMap.get("PROCUREMENT") ?? 0) + 1);
    } else if (["IN_PROGRESS"].includes(o.status)) {
      progressMap.set("SHIPMENT", (progressMap.get("SHIPMENT") ?? 0) + 1);
    } else if (o.status === "PARTIALLY_FULFILLED") {
      progressMap.set("DELIVERY", (progressMap.get("DELIVERY") ?? 0) + 1);
    } else if (["FULFILLED", "CLOSED"].includes(o.status)) {
      progressMap.set("BAST", (progressMap.get("BAST") ?? 0) + 1);
    }
  }
  const orderProgress: OrderProgressItem[] = stages.map((s) => ({
    stage: s,
    count: progressMap.get(s) ?? 0,
    total,
  }));

  // ============ Compliance Quota ============
  const { data: activeSk } = await supabase
    .from("kemhan_authorizations")
    .select("id, sk_number")
    .eq("status", "ACTIVE")
    .maybeSingle();

  let complianceQuota = {
    sk_number: null as string | null,
    allocation: 0,
    committed: 0,
    realized: 0,
    available: 0,
    utilization: 0,
  };

  if (activeSk) {
    const { data: lines } = await supabase
      .from("kemhan_quota_lines")
      .select("id, allocation_qty")
      .eq("authorization_id", activeSk.id);

    const lineIds = (lines ?? []).map((l) => l.id);
    const { data: ledger } = lineIds.length
      ? await supabase
          .from("kemhan_quota_ledger")
          .select("quota_line_id, qty, transaction_type")
          .in("quota_line_id", lineIds)
      : { data: [] };

    let allocated = 0;
    let committed = 0;
    let realized = 0;
    for (const l of lines ?? []) allocated += Number(l.allocation_qty ?? 0);
    for (const e of ledger ?? []) {
      const q = Number(e.qty);
      if (e.transaction_type === "PO_COMMITMENT") committed += -q;
      if (e.transaction_type === "PO_RELEASE") committed -= q;
      if (e.transaction_type === "DISTRIBUTION_REALIZATION") realized += -q;
    }
    const available = allocated - committed - realized;
    const utilization =
      allocated > 0 ? ((committed + realized) / allocated) * 100 : 0;

    complianceQuota = {
      sk_number: activeSk.sk_number,
      allocation: allocated,
      committed: Math.max(0, committed),
      realized: Math.max(0, realized),
      available: Math.max(0, available),
      utilization,
    };
  }

  // ============ Recent Activity ============
  const { data: rawActivity } = await supabase
    .from("order_status_history")
    .select(
      "id, action, to_status, created_at, order_id, actor_user_id, orders(order_number)"
    )
    .order("created_at", { ascending: false })
    .limit(6);

  const actorIds = Array.from(
    new Set((rawActivity ?? []).map((a) => a.actor_user_id).filter(Boolean))
  );
  const { data: profiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds)
    : { data: [] };
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const recentActivity: ActivityItem[] = (rawActivity ?? []).map((a) => {
    const actor = a.actor_user_id ? pmap.get(a.actor_user_id) : null;
    const time = new Date(a.created_at);
    const hh = String(time.getHours()).padStart(2, "0");
    const mm = String(time.getMinutes()).padStart(2, "0");

    const tone: ActivityItem["tone"] = a.action.includes("APPROVE")
      ? "green"
      : a.action.includes("SUBMIT") || a.action.includes("CREATE")
        ? "blue"
        : a.action.includes("RETURN") || a.action.includes("CANCEL")
          ? "orange"
          : "grey";

    return {
      id: a.id,
      time: `${hh}:${mm}`,
      actor: actor?.full_name ?? actor?.email ?? "—",
      action: humanizeAction(a.action),
      reference: (a.orders as { order_number?: string } | null)?.order_number ?? "",
      tone,
    };
  });

  // ============ Greeting ============
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return {
    profile: {
      full_name: profile?.full_name ?? "User",
      email: profile?.email ?? "",
    },
    greeting,
    today,
    unread: unread ?? 0,
    kpis: {
      waitingBast: waitingBast ?? 0,
      draftOrders: draftOrders ?? 0,
      readyToShip: readyToShip ?? 0,
      complianceBlocked: complianceBlocked ?? 0,
    },
    todayPanel: {
      poCreated: poCreatedToday ?? 0,
      shipmentConfirmed: shipmentConfirmedToday ?? 0,
      bastCompleted: bastCompletedToday ?? 0,
      complianceAlert: complianceAlertToday ?? 0,
    },
    nextActions,
    orderProgress,
    complianceQuota,
    recentActivity,
  };
}

// ============================================================
// HELPERS
// ============================================================
function labelFor(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under review",
    RETURNED: "Returned",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    CREATE: "Order created",
    UPDATE: "Order updated",
    SUBMIT: "Order submitted",
    START_REVIEW: "Review started",
    RETURN: "Order returned",
    APPROVE: "Order approved",
    ISSUE: "Order issued",
    SHIPMENT_CONFIRMED: "Shipment confirmed",
    BAST_COMPLETED: "BAST completed",
    CANCEL: "Order cancelled",
    AMEND_REQUEST: "Amendment requested",
    AMENDMENT_APPROVED: "Amendment approved",
  };
  return map[action] ?? action.replace(/_/g, " ");
}