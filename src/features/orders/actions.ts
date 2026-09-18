"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { orderDraftSchema, orderSubmitSchema } from "@/lib/validation/orders";
import { createNotification, notifyUsersWithRole } from "@/features/notifications/actions";

function computeLineValue(qty: number, unitPrice: number, exchangeRate: number, currency: string) {
  const priceIdr = currency === "IDR" ? unitPrice : unitPrice * exchangeRate;
  return { unitPriceIdr: priceIdr, lineValue: qty * priceIdr };
}

function computeCompletion(data: {
  customer_id?: string | null;
  site_id?: string | null;
  contract_id?: string | null;
  po_number?: string | null;
  po_date?: string | null;
  items?: unknown[];
}) {
  let score = 0;
  if (data.customer_id) score += 20;
  if (data.site_id) score += 15;
  if (data.contract_id) score += 15;
  if (data.po_number) score += 20;
  if (data.po_date) score += 15;
  if (data.items && (data.items as unknown[]).length > 0) score += 15;
  return score;
}

// ============ CREATE DRAFT ============
export async function createOrderDraft(input: unknown) {
  const parsed = orderDraftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const d = parsed.data;

  if (!d.customer_id || !d.site_id || !d.contract_id) {
    return { error: "Customer, Site, dan Contract wajib dipilih terlebih dahulu." };
  }

  const completion = computeCompletion(d);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      customer_id: d.customer_id,
      site_id: d.site_id,
      contract_id: d.contract_id,
      business_model: d.business_model ?? "Direct Sale",
      po_number: d.po_number ?? null,
      po_date: d.po_date || null,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      remarks: d.remarks ?? null,
      status: "DRAFT",
      po_status: "DRAFT",
      current_stage: "PO",
      completion_pct: completion,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // items
  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => {
      const { unitPriceIdr, lineValue } = computeLineValue(it.qty, it.unit_price, it.exchange_rate, it.currency);
      return {
        order_id: order.id,
        product_id: it.product_id,
        description: it.description ?? null,
        qty: it.qty,
        uom: it.uom,
        unit_price: it.unit_price,
        currency: it.currency,
        exchange_rate: it.exchange_rate,
        unit_price_idr: unitPriceIdr,
        line_value: lineValue,
        sort_order: idx,
        created_by: user.id,
        updated_by: user.id,
      };
    });
    await supabase.from("order_items").insert(rows);
  }

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    to_status: "DRAFT",
    action: "CREATE",
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "CREATE",
    module: "Order",
    resourceType: "order",
    resourceId: order.id,
    newValue: { order_number: order.order_number },
  });

  revalidatePath("/orders");
  return { data: order };
}

// ============ UPDATE DRAFT ============
export async function updateOrderDraft(orderId: string, input: unknown) {
  const parsed = orderDraftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("orders").select("status").eq("id", orderId).single();
  if (!existing) return { error: "Order tidak ditemukan." };
  if (!["DRAFT", "RETURNED"].includes(existing.status)) {
    return { error: "Order tidak dapat diedit pada status ini." };
  }

  const d = parsed.data;
  const completion = computeCompletion(d);

  const { error } = await supabase
    .from("orders")
    .update({
      customer_id: d.customer_id,
      site_id: d.site_id,
      contract_id: d.contract_id,
      business_model: d.business_model ?? "Direct Sale",
      po_number: d.po_number ?? null,
      po_date: d.po_date || null,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      remarks: d.remarks ?? null,
      completion_pct: completion,
      updated_by: user.id,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  // Replace items: delete all, insert new
  await supabase.from("order_items").delete().eq("order_id", orderId);

  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => {
      const { unitPriceIdr, lineValue } = computeLineValue(it.qty, it.unit_price, it.exchange_rate, it.currency);
      return {
        order_id: orderId,
        product_id: it.product_id,
        description: it.description ?? null,
        qty: it.qty,
        uom: it.uom,
        unit_price: it.unit_price,
        currency: it.currency,
        exchange_rate: it.exchange_rate,
        unit_price_idr: unitPriceIdr,
        line_value: lineValue,
        sort_order: idx,
        created_by: user.id,
        updated_by: user.id,
      };
    });
    await supabase.from("order_items").insert(rows);
  }

  await writeAudit({
    action: "UPDATE",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}

// ============ SUBMIT ============
export async function submitOrder(orderId: string, input: unknown) {
  const parsed = orderSubmitSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("orders").select("status, order_number").eq("id", orderId).single();
  if (!existing) return { error: "Order tidak ditemukan." };
  if (!["DRAFT", "RETURNED"].includes(existing.status)) {
    return { error: `Order tidak dapat disubmit dari status ${existing.status}.` };
  }

  // Save latest data first (re-use update logic, but skip status check since we already checked)
  const d = parsed.data;
  const completion = 100;

  const { error: updErr } = await supabase
    .from("orders")
    .update({
      customer_id: d.customer_id,
      site_id: d.site_id,
      contract_id: d.contract_id,
      po_number: d.po_number,
      po_date: d.po_date,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      remarks: d.remarks ?? null,
      completion_pct: completion,
      status: "SUBMITTED",
      po_status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      submitted_by: user.id,
      updated_by: user.id,
    })
    .eq("id", orderId);

  if (updErr) return { error: updErr.message };

  await supabase.from("order_items").delete().eq("order_id", orderId);
  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => {
      const { unitPriceIdr, lineValue } = computeLineValue(it.qty, it.unit_price, it.exchange_rate, it.currency);
      return {
        order_id: orderId,
        product_id: it.product_id,
        description: it.description ?? null,
        qty: it.qty,
        uom: it.uom,
        unit_price: it.unit_price,
        currency: it.currency,
        exchange_rate: it.exchange_rate,
        unit_price_idr: unitPriceIdr,
        line_value: lineValue,
        sort_order: idx,
        created_by: user.id,
        updated_by: user.id,
      };
    });
    await supabase.from("order_items").insert(rows);
  }

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: existing.status,
    to_status: "SUBMITTED",
    action: "SUBMIT",
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "SUBMIT",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
    newValue: { order_number: existing.order_number, status: "SUBMITTED" },
  });

  await notifyUsersWithRole("commercial_supervisor", {
    type: "ORDER_SUBMITTED",
    severity: "INFO",
    title: `Order ${existing.order_number} menunggu review`,
    message: `Order baru disubmit dan perlu diverifikasi.`,
    link: `/orders/${orderId}`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}

// ============ REVIEW / START REVIEW ============
export async function startReview(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("orders").select("status, order_number").eq("id", orderId).single();
  if (!existing) return { error: "Order tidak ditemukan." };
  if (existing.status !== "SUBMITTED") return { error: "Order harus berstatus SUBMITTED." };

  await supabase.from("orders").update({
    status: "UNDER_REVIEW",
    updated_by: user.id,
  }).eq("id", orderId);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: "SUBMITTED",
    to_status: "UNDER_REVIEW",
    action: "START_REVIEW",
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "START_REVIEW",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// ============ RETURN ============
export async function returnOrder(orderId: string, reason: string) {
  if (!reason || reason.trim().length < 5) return { error: "Alasan minimal 5 karakter." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("orders").select("status, order_number, created_by").eq("id", orderId).single();
  if (!existing) return { error: "Order tidak ditemukan." };
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(existing.status)) {
    return { error: "Order tidak dalam status yang dapat dikembalikan." };
  }

  await supabase.from("orders").update({
    status: "RETURNED",
    returned_at: new Date().toISOString(),
    returned_by: user.id,
    return_reason: reason,
    updated_by: user.id,
  }).eq("id", orderId);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: existing.status,
    to_status: "RETURNED",
    action: "RETURN",
    reason,
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "RETURN",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
    reason,
  });

  if (existing.created_by) {
    await createNotification({
      userId: existing.created_by,
      type: "ORDER_RETURNED",
      severity: "WARNING",
      title: `Order ${existing.order_number} dikembalikan`,
      message: reason,
      link: `/orders/${orderId}`,
    });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}

// ============ APPROVE ============
export async function approveOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("orders").select("status, order_number, created_by").eq("id", orderId).single();
  if (!existing) return { error: "Order tidak ditemukan." };
  if (existing.status !== "UNDER_REVIEW") return { error: "Order harus dalam status UNDER_REVIEW." };

  await supabase.from("orders").update({
    status: "APPROVED",
    approved_at: new Date().toISOString(),
    approved_by: user.id,
    updated_by: user.id,
  }).eq("id", orderId);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: "UNDER_REVIEW",
    to_status: "APPROVED",
    action: "APPROVE",
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "APPROVE",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
  });

  if (existing.created_by) {
    await createNotification({
      userId: existing.created_by,
      type: "ORDER_APPROVED",
      severity: "SUCCESS",
      title: `Order ${existing.order_number} telah disetujui`,
      link: `/orders/${orderId}`,
    });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}

// ============ AMENDMENT REQUEST ============
export async function requestAmendment(orderId: string, reason: string, payload: Record<string, unknown>) {
  if (!reason || reason.trim().length < 5) return { error: "Alasan minimal 5 karakter." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("orders").select("status, order_number").eq("id", orderId).single();
  if (!existing) return { error: "Order tidak ditemukan." };
  if (!["APPROVED", "ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(existing.status)) {
    return { error: "Order tidak dapat dimintakan amendment pada status ini." };
  }

  const { error } = await supabase.from("approval_requests").insert({
    order_id: orderId,
    type: "AMENDMENT",
    status: "PENDING",
    requested_by: user.id,
    payload,
    reason,
  });

  if (error) return { error: error.message };

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: existing.status,
    to_status: existing.status,
    action: "AMEND_REQUEST",
    reason,
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "AMEND_REQUEST",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
    reason,
    newValue: payload,
  });

  await notifyUsersWithRole("commercial_manager", {
    type: "AMENDMENT_REQUEST",
    severity: "WARNING",
    title: `Permintaan amendment ${existing.order_number}`,
    message: reason,
    link: `/orders/${orderId}`,
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// ============ CANCEL REQUEST ============
export async function requestCancellation(orderId: string, reason: string) {
  if (!reason || reason.trim().length < 5) return { error: "Alasan minimal 5 karakter." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("orders").select("status, order_number").eq("id", orderId).single();
  if (!existing) return { error: "Order tidak ditemukan." };
  if (existing.status === "CANCELLED" || existing.status === "CLOSED") {
    return { error: "Order sudah tidak aktif." };
  }

  const { error } = await supabase.from("approval_requests").insert({
    order_id: orderId,
    type: "CANCELLATION",
    status: "PENDING",
    requested_by: user.id,
    reason,
  });

  if (error) return { error: error.message };

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: existing.status,
    to_status: existing.status,
    action: "CANCEL_REQUEST",
    reason,
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "CANCEL_REQUEST",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
    reason,
  });

  await notifyUsersWithRole("commercial_manager", {
    type: "CANCELLATION_REQUEST",
    severity: "WARNING",
    title: `Permintaan pembatalan ${existing.order_number}`,
    message: reason,
    link: `/orders/${orderId}`,
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// ============ APPROVE / REJECT APPROVAL REQUEST ============
export async function reviewApprovalRequest(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: req } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Request tidak ditemukan." };
  if (req.status !== "PENDING") return { error: "Request sudah diproses." };

  // Update approval request status
  const { error: updErr } = await supabase
    .from("approval_requests")
    .update({
      status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq("id", requestId);

  if (updErr) return { error: updErr.message };

  const { data: order } = await supabase
    .from("orders")
    .select("status, order_number, created_by")
    .eq("id", req.order_id)
    .single();

  if (!order) return { error: "Order tidak ditemukan." };

  // ========== CANCELLATION APPROVED ==========
  if (decision === "APPROVED" && req.type === "CANCELLATION") {
    await supabase.from("orders").update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancel_reason: req.reason,
      updated_by: user.id,
    }).eq("id", req.order_id);

    await supabase.from("order_status_history").insert({
      order_id: req.order_id,
      from_status: order.status,
      to_status: "CANCELLED",
      action: "CANCEL",
      reason: req.reason,
      actor_user_id: user.id,
    });
  }

  // ========== AMENDMENT APPROVED ==========
  if (decision === "APPROVED" && req.type === "AMENDMENT") {
    // Panggil RPC untuk ubah status ke DRAFT + catat metadata
    const { error: rpcErr } = await supabase.rpc("apply_amendment_approval", {
      p_order_id: req.order_id,
      p_actor: user.id,
    });

    if (rpcErr) {
      console.error("[reviewApprovalRequest] apply_amendment_approval failed:", rpcErr);
      return { error: `Gagal apply amendment: ${rpcErr.message}` };
    }

    await supabase.from("order_status_history").insert({
      order_id: req.order_id,
      from_status: order.status,
      to_status: "DRAFT",
      action: "AMENDMENT_APPROVED",
      reason: req.reason ?? "Amendment disetujui",
      actor_user_id: user.id,
    });

    // Notifikasi ke requester bahwa order siap diedit
    if (req.requested_by) {
      await createNotification({
        userId: req.requested_by,
        type: "AMENDMENT_APPROVED",
        severity: "SUCCESS",
        title: `Amendment ${order.order_number} disetujui`,
        message: "Order sekarang dapat diedit kembali.",
        link: `/orders/${req.order_id}`,
      });
    }
  }

  // ========== AMENDMENT REJECTED ==========
  if (decision === "REJECTED" && req.type === "AMENDMENT") {
    await supabase.from("order_status_history").insert({
      order_id: req.order_id,
      from_status: order.status,
      to_status: order.status,
      action: "AMENDMENT_REJECTED",
      reason: notes ?? req.reason,
      actor_user_id: user.id,
    });
  }

  // ========== CANCELLATION REJECTED ==========
  if (decision === "REJECTED" && req.type === "CANCELLATION") {
    await supabase.from("order_status_history").insert({
      order_id: req.order_id,
      from_status: order.status,
      to_status: order.status,
      action: "CANCEL_REJECTED",
      reason: notes ?? req.reason,
      actor_user_id: user.id,
    });
  }

  await writeAudit({
    action: `APPROVAL_${decision}`,
    module: "Order",
    resourceType: "approval_request",
    resourceId: requestId,
    newValue: { type: req.type, decision },
    reason: notes,
  });

  // Notifikasi umum ke requester (untuk cancellation & reject)
  if (req.requested_by && req.type === "CANCELLATION") {
    await createNotification({
      userId: req.requested_by,
      type: decision === "APPROVED" ? "CANCEL_APPROVED" : "CANCEL_REJECTED",
      severity: decision === "APPROVED" ? "SUCCESS" : "WARNING",
      title: `Pembatalan ${order.order_number} ${decision === "APPROVED" ? "disetujui" : "ditolak"}`,
      link: `/orders/${req.order_id}`,
    });
  }

  revalidatePath(`/orders/${req.order_id}`);
  revalidatePath("/orders");
  return { ok: true };
}