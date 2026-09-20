"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { createNotification, notifyUsersWithRole } from "@/features/notifications/actions";
import {
  procurementSchema,
  shipmentSchema,
  deliverySchema,
  bastSchema,
} from "@/lib/validation/flow";

// ============================================================
// COVERAGE HELPER
// Menghitung coverage order items terhadap seluruh procurement
// ============================================================
async function buildProcurementCoverage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string
) {
  // 1) Order items — hanya yang butuh procurement (exclude SERVICE)
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, qty, uom, products!inner(name, code, uom, category)")
    .eq("order_id", orderId)
    .neq("products.category", "SERVICE");

  // 2) Procurements for order (semua status)
  const { data: procs } = await supabase
    .from("procurements")
    .select("id, procurement_number, status, vendors(name)")
    .eq("order_id", orderId);

  const procMap = new Map(
    (procs ?? []).map((p) => [
      p.id,
      p as {
        id: string;
        procurement_number: string;
        status: string;
        vendors?: { name?: string } | null;
      },
    ])
  );
  const procIds = (procs ?? []).map((p) => p.id);

  // 3) Procurement items
  let procItems: { procurement_id: string; product_id: string; qty: number }[] = [];
  if (procIds.length > 0) {
    const { data } = await supabase
      .from("procurement_items")
      .select("procurement_id, product_id, qty")
      .in("procurement_id", procIds);
    procItems = data ?? [];
  }

  // 4) Build map: product_id -> contributions[]
  const byProduct = new Map<
    string,
    Array<{
      procurement_id: string;
      procurement_number: string;
      vendor_name: string;
      status: string;
      qty: number;
    }>
  >();

  for (const pi of procItems) {
    const proc = procMap.get(pi.procurement_id);
    if (!proc) continue;
    const arr = byProduct.get(pi.product_id) ?? [];
    arr.push({
      procurement_id: proc.id,
      procurement_number: proc.procurement_number,
      vendor_name: proc.vendors?.name ?? "—",
      status: proc.status,
      qty: Number(pi.qty),
    });
    byProduct.set(pi.product_id, arr);
  }

  // 5) Build coverage items
  const items = (orderItems ?? []).map((oi) => {
    const ordered = Number(oi.qty);
    const contributions = byProduct.get(oi.product_id) ?? [];
    const procured_all = contributions.reduce((a, c) => a + c.qty, 0);
    const procured_verified = contributions
      .filter((c) => c.status === "VERIFIED")
      .reduce((a, c) => a + c.qty, 0);
    const prod = oi.products as
      | { name?: string; code?: string; uom?: string }
      | null;

    return {
      product_id: oi.product_id,
      product_name: prod?.name ?? "—",
      product_code: prod?.code ?? "—",
      uom: (oi.uom ?? prod?.uom) ?? "MT",
      ordered,
      procured_all,
      procured_verified,
      fully_procured: procured_all >= ordered,
      fully_verified: procured_verified >= ordered,
      contributions,
    };
  });

  return {
    items,
    all_covered: items.length > 0 && items.every((i) => i.fully_procured),
    all_verified: items.length > 0 && items.every((i) => i.fully_verified),
  };
}

export async function getProcurementCoverage(orderId: string) {
  const supabase = await createClient();
  return buildProcurementCoverage(supabase, orderId);
}

// ============================================================
// QTY CAP GUARD
// Total procurement qty per product TIDAK BOLEH melebihi
// order_items.qty untuk product yang sama.
//
// Param excludeProcurementId: dipakai saat UPDATE agar procurement
// yang sedang diedit tidak dihitung 2x.
// ============================================================
async function checkProcurementQtyCap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  newItems: { product_id: string; qty: number }[],
  excludeProcurementId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 1) Order qty per product (hanya yang butuh procurement)
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, qty, products!inner(name)")
    .eq("order_id", orderId);

  const orderQty = new Map<string, { qty: number; name: string }>();
  for (const oi of orderItems ?? []) {
    orderQty.set(oi.product_id, {
      qty: Number(oi.qty),
      name: (oi.products as { name?: string } | null)?.name ?? "—",
    });
  }

  // 2) Existing procurement qty (exclude procurement yang sedang diupdate)
  const { data: procs } = await supabase
    .from("procurements")
    .select("id")
    .eq("order_id", orderId);

  const procIds = (procs ?? [])
    .map((p) => p.id)
    .filter((id) => id !== excludeProcurementId);

  const existingQty = new Map<string, number>();
  if (procIds.length > 0) {
    const { data: items } = await supabase
      .from("procurement_items")
      .select("product_id, qty")
      .in("procurement_id", procIds);
    for (const it of items ?? []) {
      existingQty.set(
        it.product_id,
        (existingQty.get(it.product_id) ?? 0) + Number(it.qty)
      );
    }
  }

  // 3) Aggregate qty baru (kalau ada duplikat product dalam draft)
  const draftQty = new Map<string, number>();
  for (const it of newItems) {
    draftQty.set(
      it.product_id,
      (draftQty.get(it.product_id) ?? 0) + Number(it.qty)
    );
  }

  // 4) Cek per product
  const errors: string[] = [];
  for (const [productId, newQty] of draftQty) {
    const cap = orderQty.get(productId);
    if (!cap) {
      errors.push(
        `Produk tidak terdaftar di order items (product_id: ${productId}).`
      );
      continue;
    }
    const existing = existingQty.get(productId) ?? 0;
    const total = existing + newQty;
    if (total > cap.qty) {
      errors.push(
        `${cap.name}: total procurement akan menjadi ${total} (existing ${existing} + baru ${newQty}), melebihi qty order ${cap.qty}.`
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join(" ") };
  }
  return { ok: true };
}

// ============================================================
// PROCUREMENT
// ============================================================

// ---------- CREATE ----------
export async function createProcurement(orderId: string, input: unknown) {
  const parsed = procurementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Guard: order harus ISSUED atau lebih
  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order tidak ditemukan." };
  if (
    !["ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED"].includes(order.status)
  ) {
    return {
      error:
        "Procurement hanya dapat dibuat setelah order di-issue (compliance completed).",
    };
  }

  const d = parsed.data;

  // ------------------------------------------------------------
  // QTY CAP GUARD: total procurement tidak boleh melebihi qty PO
  // ------------------------------------------------------------
  const capCheck = await checkProcurementQtyCap(
    supabase,
    orderId,
    d.items.map((it) => ({ product_id: it.product_id, qty: it.qty }))
  );
  if (!capCheck.ok) return { error: capCheck.error };

  const { data: proc, error } = await supabase
    .from("procurements")
    .insert({
      order_id: orderId,
      vendor_id: d.vendor_id || null,
      vendor_po: d.vendor_po ?? null,
      vendor_invoice: d.vendor_invoice ?? null,
      reference_date: d.reference_date || null,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      remarks: d.remarks ?? null,
      status: "DRAFT",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => {
      const lineValue =
        it.qty * it.unit_price * (it.currency === "IDR" ? 1 : it.exchange_rate);
      return {
        procurement_id: proc.id,
        product_id: it.product_id,
        description: it.description ?? null,
        qty: it.qty,
        uom: it.uom,
        unit_price: it.unit_price,
        currency: it.currency,
        exchange_rate: it.exchange_rate,
        line_value: lineValue,
        sort_order: idx,
        created_by: user.id,
        updated_by: user.id,
      };
    });
    const { error: itemsErr } = await supabase
      .from("procurement_items")
      .insert(rows);
    if (itemsErr) {
      // Rollback header
      await supabase.from("procurements").delete().eq("id", proc.id);
      return { error: itemsErr.message };
    }
  }

  await writeAudit({
    action: "CREATE",
    module: "Procurement",
    resourceType: "procurement",
    resourceId: proc.id,
    newValue: {
      procurement_number: proc.procurement_number,
      order_id: orderId,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  return { data: proc };
}

// ---------- UPDATE ----------
export async function updateProcurement(procId: string, input: unknown) {
  const parsed = procurementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("procurements")
    .select("status, order_id")
    .eq("id", procId)
    .single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya procurement DRAFT dapat diedit." };

  const d = parsed.data;

  // ------------------------------------------------------------
  // QTY CAP GUARD — exclude procurement yang sedang diupdate
  // ------------------------------------------------------------
  const capCheck = await checkProcurementQtyCap(
    supabase,
    existing.order_id,
    d.items.map((it) => ({ product_id: it.product_id, qty: it.qty })),
    procId
  );
  if (!capCheck.ok) return { error: capCheck.error };

  const { error: updErr } = await supabase
    .from("procurements")
    .update({
      vendor_id: d.vendor_id || null,
      vendor_po: d.vendor_po ?? null,
      vendor_invoice: d.vendor_invoice ?? null,
      reference_date: d.reference_date || null,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      remarks: d.remarks ?? null,
      updated_by: user.id,
    })
    .eq("id", procId);

  if (updErr) return { error: updErr.message };

  await supabase
    .from("procurement_items")
    .delete()
    .eq("procurement_id", procId);

  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => {
      const lineValue =
        it.qty * it.unit_price * (it.currency === "IDR" ? 1 : it.exchange_rate);
      return {
        procurement_id: procId,
        product_id: it.product_id,
        description: it.description ?? null,
        qty: it.qty,
        uom: it.uom,
        unit_price: it.unit_price,
        currency: it.currency,
        exchange_rate: it.exchange_rate,
        line_value: lineValue,
        sort_order: idx,
        created_by: user.id,
        updated_by: user.id,
      };
    });
    const { error: itemsErr } = await supabase
      .from("procurement_items")
      .insert(rows);
    if (itemsErr) return { error: itemsErr.message };
  }

  await writeAudit({
    action: "UPDATE",
    module: "Procurement",
    resourceType: "procurement",
    resourceId: procId,
  });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ---------- SUBMIT ----------
export async function submitProcurement(procId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("procurements")
    .select("status, order_id, procurement_number")
    .eq("id", procId)
    .single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya draft dapat disubmit." };

  const { error } = await supabase
    .from("procurements")
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      submitted_by: user.id,
      updated_by: user.id,
    })
    .eq("id", procId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "SUBMIT",
    module: "Procurement",
    resourceType: "procurement",
    resourceId: procId,
  });

  await notifyUsersWithRole("commercial_supervisor", {
    type: "PROCUREMENT_SUBMITTED",
    severity: "INFO",
    title: `Procurement ${existing.procurement_number} menunggu verifikasi`,
    link: `/orders/${existing.order_id}`,
  });

  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ---------- VERIFY ----------
export async function verifyProcurement(procId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("procurements")
    .select("status, order_id, procurement_number, created_by")
    .eq("id", procId)
    .single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "SUBMITTED")
    return { error: "Hanya SUBMITTED yang dapat diverifikasi." };

  const { error } = await supabase
    .from("procurements")
    .update({
      status: "VERIFIED",
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      completed_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", procId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "VERIFY",
    module: "Procurement",
    resourceType: "procurement",
    resourceId: procId,
  });

  if (existing.created_by) {
    await createNotification({
      userId: existing.created_by,
      type: "PROCUREMENT_VERIFIED",
      severity: "SUCCESS",
      title: `Procurement ${existing.procurement_number} terverifikasi`,
      link: `/orders/${existing.order_id}`,
    });
  }

  try {
    const coverage = await buildProcurementCoverage(supabase, existing.order_id);
    if (coverage.all_verified) {
      await notifyUsersWithRole("commercial_staff", {
        type: "SHIPMENT_READY",
        severity: "SUCCESS",
        title: "Semua procurement ter-verify — siap shipment",
        message: "Shipment dapat dibuat untuk order ini.",
        link: `/orders/${existing.order_id}`,
      });
    }
  } catch (e) {
    console.error("[verifyProcurement] coverage check failed:", e);
  }

  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ---------- DELETE ----------
export async function deleteProcurement(procId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("procurements")
    .select("status, order_id")
    .eq("id", procId)
    .single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya DRAFT dapat dihapus." };

  await supabase.from("procurements").delete().eq("id", procId);

  await writeAudit({
    action: "DELETE",
    module: "Procurement",
    resourceType: "procurement",
    resourceId: procId,
  });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ============================================================
// SHIPMENT
// ============================================================

// ---------- CREATE (dengan coverage gate) ----------
export async function createShipment(orderId: string, input: unknown) {
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Order tidak ditemukan." };
  if (
    !["ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED"].includes(order.status)
  ) {
    return { error: "Order belum siap untuk shipment." };
  }

  // Coverage gate
  const coverage = await buildProcurementCoverage(supabase, orderId);
  if (!coverage.all_verified) {
    const missing = coverage.items
      .filter((i) => !i.fully_verified)
      .map(
        (i) =>
          `${i.product_name} (verified ${i.procured_verified}/${i.ordered})`
      )
      .join(", ");
    return {
      error: `Shipment belum bisa dibuat. Order items belum sepenuhnya ter-procure & ter-verify: ${missing}.`,
    };
  }

  const d = parsed.data;
  const { data: ship, error } = await supabase
    .from("shipments")
    .insert({
      order_id: orderId,
      shipment_date: d.shipment_date,
      transporter_id: d.transporter_id,
      origin: d.origin ?? null,
      destination: d.destination ?? null,
      delivery_ref: d.delivery_ref ?? null,
      transport_cost: d.transport_cost,
      remarks: d.remarks ?? null,
      status: "DRAFT",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const rows = d.items.map((it, idx) => ({
    shipment_id: ship.id,
    product_id: it.product_id,
    description: it.description ?? null,
    qty: it.qty,
    uom: it.uom,
    sort_order: idx,
    created_by: user.id,
    updated_by: user.id,
  }));
  await supabase.from("shipment_items").insert(rows);

  await writeAudit({
    action: "CREATE",
    module: "Shipment",
    resourceType: "shipment",
    resourceId: ship.id,
    newValue: { shipment_number: ship.shipment_number, order_id: orderId },
  });

  revalidatePath(`/orders/${orderId}`);
  return { data: ship };
}

// ---------- UPDATE ----------
export async function updateShipment(shipId: string, input: unknown) {
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("shipments")
    .select("status, order_id")
    .eq("id", shipId)
    .single();
  if (!existing) return { error: "Shipment tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya shipment DRAFT dapat diedit." };

  const d = parsed.data;
  const { error: updErr } = await supabase
    .from("shipments")
    .update({
      shipment_date: d.shipment_date,
      transporter_id: d.transporter_id,
      origin: d.origin ?? null,
      destination: d.destination ?? null,
      delivery_ref: d.delivery_ref ?? null,
      transport_cost: d.transport_cost,
      remarks: d.remarks ?? null,
      updated_by: user.id,
    })
    .eq("id", shipId);

  if (updErr) return { error: updErr.message };

  await supabase.from("shipment_items").delete().eq("shipment_id", shipId);
  const rows = d.items.map((it, idx) => ({
    shipment_id: shipId,
    product_id: it.product_id,
    description: it.description ?? null,
    qty: it.qty,
    uom: it.uom,
    sort_order: idx,
    created_by: user.id,
    updated_by: user.id,
  }));
  await supabase.from("shipment_items").insert(rows);

  await writeAudit({
    action: "UPDATE",
    module: "Shipment",
    resourceType: "shipment",
    resourceId: shipId,
  });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ---------- CONFIRM ----------
export async function confirmShipment(shipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: ship } = await supabase
    .from("shipments")
    .select("*, order_id")
    .eq("id", shipId)
    .single();
  if (!ship) return { error: "Shipment tidak ditemukan." };
  if (ship.status !== "DRAFT")
    return { error: "Hanya shipment DRAFT dapat dikonfirmasi." };

  const orderId = ship.order_id;

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, qty")
    .eq("order_id", orderId);
  const orderQtyMap = new Map(
    (orderItems ?? []).map((it) => [it.product_id, Number(it.qty)])
  );

  const { data: shipItems } = await supabase
    .from("shipment_items")
    .select("product_id, qty")
    .eq("shipment_id", shipId);

  const { data: confirmedShips } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "CONFIRMED");

  const confirmedIds = (confirmedShips ?? []).map((s) => s.id);
  const shippedMap = new Map<string, number>();
  if (confirmedIds.length > 0) {
    const { data: existingItems } = await supabase
      .from("shipment_items")
      .select("product_id, qty")
      .in("shipment_id", confirmedIds);
    for (const it of existingItems ?? []) {
      shippedMap.set(
        it.product_id,
        (shippedMap.get(it.product_id) ?? 0) + Number(it.qty)
      );
    }
  }

  for (const it of shipItems ?? []) {
    const ordered = orderQtyMap.get(it.product_id) ?? 0;
    const alreadyShipped = shippedMap.get(it.product_id) ?? 0;
    const newTotal = alreadyShipped + Number(it.qty);
    if (newTotal > ordered) {
      return {
        error: `Qty shipment melebihi order (ordered: ${ordered}, akan menjadi: ${newTotal}).`,
      };
    }
  }

  const { error } = await supabase
    .from("shipments")
    .update({
      status: "CONFIRMED",
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
      updated_by: user.id,
    })
    .eq("id", shipId);

  if (error) return { error: error.message };

  const { error: rpcErr } = await supabase.rpc("realize_quota_for_shipment", {
    p_shipment_id: shipId,
    p_actor: user.id,
  });
  if (rpcErr) {
    console.error("[confirmShipment] realize_quota_for_shipment failed:", rpcErr);
  }

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  const { data: allConfirmed } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "CONFIRMED");

  const allConfirmedIds = (allConfirmed ?? []).map((s) => s.id);
  const finalShipped = new Map<string, number>();
  if (allConfirmedIds.length > 0) {
    const { data: allItems } = await supabase
      .from("shipment_items")
      .select("product_id, qty")
      .in("shipment_id", allConfirmedIds);
    for (const it of allItems ?? []) {
      finalShipped.set(
        it.product_id,
        (finalShipped.get(it.product_id) ?? 0) + Number(it.qty)
      );
    }
  }

  let allFulfilled = true;
  let anyShipped = false;
  for (const [productId, qty] of orderQtyMap) {
    const shipped = finalShipped.get(productId) ?? 0;
    if (shipped > 0) anyShipped = true;
    if (shipped < qty) allFulfilled = false;
  }

  let newStatus: string = order?.status ?? "IN_PROGRESS";
  if (allFulfilled && orderQtyMap.size > 0) newStatus = "FULFILLED";
  else if (anyShipped) newStatus = "PARTIALLY_FULFILLED";

  await supabase
    .from("orders")
    .update({ status: newStatus, updated_by: user.id })
    .eq("id", orderId);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: order?.status,
    to_status: newStatus,
    action: "SHIPMENT_CONFIRMED",
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "CONFIRM",
    module: "Shipment",
    resourceType: "shipment",
    resourceId: shipId,
    newValue: { order_status: newStatus },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/compliance");
  return { ok: true };
}

// ---------- DELETE ----------
export async function deleteShipment(shipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("shipments")
    .select("status, order_id")
    .eq("id", shipId)
    .single();
  if (!existing) return { error: "Shipment tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya DRAFT dapat dihapus." };

  await supabase.from("shipments").delete().eq("id", shipId);

  await writeAudit({
    action: "DELETE",
    module: "Shipment",
    resourceType: "shipment",
    resourceId: shipId,
  });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ============================================================
// DELIVERY
// ============================================================
export async function createDelivery(shipId: string, input: unknown) {
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: ship } = await supabase
    .from("shipments")
    .select("order_id, status")
    .eq("id", shipId)
    .single();
  if (!ship) return { error: "Shipment tidak ditemukan." };
  if (ship.status !== "CONFIRMED")
    return { error: "Shipment harus CONFIRMED dulu." };

  const { data: existing } = await supabase
    .from("deliveries")
    .select("id")
    .eq("shipment_id", shipId)
    .maybeSingle();
  if (existing) return { error: "Delivery untuk shipment ini sudah ada." };

  const d = parsed.data;
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .insert({
      order_id: ship.order_id,
      shipment_id: shipId,
      delivery_date: d.delivery_date,
      receiving_party: d.receiving_party ?? null,
      delivery_note: d.delivery_note ?? null,
      location: d.location ?? null,
      remarks: d.remarks ?? null,
      status: "COMPLETED",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "CREATE",
    module: "Delivery",
    resourceType: "delivery",
    resourceId: delivery.id,
    newValue: {
      delivery_number: delivery.delivery_number,
      shipment_id: shipId,
    },
  });

  revalidatePath(`/orders/${ship.order_id}`);
  return { data: delivery };
}

// ============================================================
// BAST
// ============================================================
export async function createBastDraft(orderId: string, input: unknown) {
  const parsed = bastSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { count: deliveryCount } = await supabase
    .from("deliveries")
    .select("*", { count: "exact", head: true })
    .eq("order_id", orderId);

  if ((deliveryCount ?? 0) === 0) {
    return {
      error:
        "BAST hanya dapat dibuat setelah ada minimal 1 delivery yang tercatat.",
    };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Order tidak ditemukan." };
  if (
    !["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED", "CLOSED"].includes(
      order.status
    )
  ) {
    return { error: "Order belum siap untuk BAST." };
  }

  const d = parsed.data;
  const { data: bast, error } = await supabase
    .from("basts")
    .insert({
      order_id: orderId,
      bast_date: d.bast_date,
      receiver_name: d.receiver_name,
      signed_by: d.signed_by ?? null,
      signed_document_path: d.signed_document_path,
      remarks: d.remarks ?? null,
      status: "DRAFT",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "CREATE",
    module: "BAST",
    resourceType: "bast",
    resourceId: bast.id,
    newValue: { bast_number: bast.bast_number, order_id: orderId },
  });

  revalidatePath(`/orders/${orderId}`);
  return { data: bast };
}

export async function updateBast(bastId: string, input: unknown) {
  const parsed = bastSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("basts")
    .select("status, order_id")
    .eq("id", bastId)
    .single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya BAST DRAFT dapat diedit." };

  const d = parsed.data;
  const { error } = await supabase
    .from("basts")
    .update({
      bast_date: d.bast_date,
      receiver_name: d.receiver_name,
      signed_by: d.signed_by ?? null,
      signed_document_path: d.signed_document_path,
      remarks: d.remarks ?? null,
      updated_by: user.id,
    })
    .eq("id", bastId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "UPDATE",
    module: "BAST",
    resourceType: "bast",
    resourceId: bastId,
  });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

export async function submitBast(bastId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("basts")
    .select("status, order_id, bast_number")
    .eq("id", bastId)
    .single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya draft yang dapat disubmit." };

  const { error } = await supabase
    .from("basts")
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      submitted_by: user.id,
      updated_by: user.id,
    })
    .eq("id", bastId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "SUBMIT",
    module: "BAST",
    resourceType: "bast",
    resourceId: bastId,
  });

  await notifyUsersWithRole("commercial_supervisor", {
    type: "BAST_SUBMITTED",
    severity: "INFO",
    title: `BAST ${existing.bast_number} menunggu verifikasi`,
    link: `/orders/${existing.order_id}`,
  });

  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

export async function verifyBast(bastId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("basts")
    .select("status, order_id, bast_number, created_by")
    .eq("id", bastId)
    .single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "SUBMITTED")
    return { error: "Hanya SUBMITTED yang dapat diverifikasi." };

  const { error } = await supabase
    .from("basts")
    .update({
      status: "VERIFIED",
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      updated_by: user.id,
    })
    .eq("id", bastId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "VERIFY",
    module: "BAST",
    resourceType: "bast",
    resourceId: bastId,
  });

  if (existing.created_by) {
    await createNotification({
      userId: existing.created_by,
      type: "BAST_VERIFIED",
      severity: "SUCCESS",
      title: `BAST ${existing.bast_number} terverifikasi`,
      link: `/orders/${existing.order_id}`,
    });
  }

  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

export async function completeBast(bastId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("basts")
    .select("status, order_id, bast_number, created_by")
    .eq("id", bastId)
    .single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (!["SUBMITTED", "VERIFIED"].includes(existing.status)) {
    return { error: "BAST harus SUBMITTED atau VERIFIED." };
  }

  const { error } = await supabase
    .from("basts")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      updated_by: user.id,
    })
    .eq("id", bastId);

  if (error) return { error: error.message };

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", existing.order_id)
    .single();

  if (order && order.status === "FULFILLED") {
    await supabase
      .from("orders")
      .update({ status: "CLOSED", updated_by: user.id })
      .eq("id", existing.order_id);

    await supabase.from("order_status_history").insert({
      order_id: existing.order_id,
      from_status: "FULFILLED",
      to_status: "CLOSED",
      action: "BAST_COMPLETED",
      actor_user_id: user.id,
    });
  }

  await writeAudit({
    action: "COMPLETE",
    module: "BAST",
    resourceType: "bast",
    resourceId: bastId,
  });

  if (existing.created_by) {
    await createNotification({
      userId: existing.created_by,
      type: "BAST_COMPLETED",
      severity: "SUCCESS",
      title: `BAST ${existing.bast_number} selesai`,
      link: `/orders/${existing.order_id}`,
    });
  }

  revalidatePath(`/orders/${existing.order_id}`);
  revalidatePath("/orders");
  return { ok: true };
}

export async function deleteBast(bastId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("basts")
    .select("status, order_id")
    .eq("id", bastId)
    .single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya DRAFT dapat dihapus." };

  await supabase.from("basts").delete().eq("id", bastId);

  await writeAudit({
    action: "DELETE",
    module: "BAST",
    resourceType: "bast",
    resourceId: bastId,
  });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ============================================================
// BAST DOCUMENT SIGNED URL
// ============================================================
export async function getBastDocumentUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("bast-documents")
    .createSignedUrl(path, 3600);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}