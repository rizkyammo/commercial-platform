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

// =========================================================
// PROCUREMENT
// =========================================================
export async function createProcurement(orderId: string, input: unknown) {
  const parsed = procurementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const d = parsed.data;
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
      const lineValue = it.qty * it.unit_price * (it.currency === "IDR" ? 1 : it.exchange_rate);
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
    await supabase.from("procurement_items").insert(rows);
  }

  await writeAudit({
    action: "CREATE",
    module: "Procurement",
    resourceType: "procurement",
    resourceId: proc.id,
    newValue: { procurement_number: proc.procurement_number, order_id: orderId },
  });

  revalidatePath(`/orders/${orderId}`);
  return { data: proc };
}

export async function updateProcurement(procId: string, input: unknown) {
  const parsed = procurementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("procurements").select("status, order_id").eq("id", procId).single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya procurement DRAFT dapat diedit." };

  const d = parsed.data;
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

  await supabase.from("procurement_items").delete().eq("procurement_id", procId);
  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => {
      const lineValue = it.qty * it.unit_price * (it.currency === "IDR" ? 1 : it.exchange_rate);
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
    await supabase.from("procurement_items").insert(rows);
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

export async function submitProcurement(procId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("procurements").select("status, order_id, procurement_number").eq("id", procId).single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya draft dapat disubmit." };

  const { error } = await supabase.from("procurements").update({
    status: "SUBMITTED",
    submitted_at: new Date().toISOString(),
    submitted_by: user.id,
    updated_by: user.id,
  }).eq("id", procId);

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

export async function verifyProcurement(procId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("procurements").select("status, order_id, procurement_number, created_by").eq("id", procId).single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "SUBMITTED") return { error: "Hanya SUBMITTED yang dapat diverifikasi." };

  const { error } = await supabase.from("procurements").update({
    status: "VERIFIED",
    verified_at: new Date().toISOString(),
    verified_by: user.id,
    completed_at: new Date().toISOString(),
    updated_by: user.id,
  }).eq("id", procId);

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

  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// =========================================================
// SHIPMENT
// =========================================================
export async function createShipment(orderId: string, input: unknown) {
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const d = parsed.data;
  const { data: ship, error } = await supabase
    .from("shipments")
    .insert({
      order_id: orderId,
      shipment_date: d.shipment_date || null,
      transporter_id: d.transporter_id || null,
      vehicle_ref: d.vehicle_ref ?? null,
      origin: d.origin ?? null,
      destination: d.destination ?? null,
      delivery_ref: d.delivery_ref ?? null,
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

export async function updateShipment(shipId: string, input: unknown) {
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("shipments").select("status, order_id").eq("id", shipId).single();
  if (!existing) return { error: "Shipment tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya shipment DRAFT dapat diedit." };

  const d = parsed.data;
  const { error: updErr } = await supabase.from("shipments").update({
    shipment_date: d.shipment_date || null,
    transporter_id: d.transporter_id || null,
    vehicle_ref: d.vehicle_ref ?? null,
    origin: d.origin ?? null,
    destination: d.destination ?? null,
    delivery_ref: d.delivery_ref ?? null,
    remarks: d.remarks ?? null,
    updated_by: user.id,
  }).eq("id", shipId);

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

export async function confirmShipment(shipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: ship } = await supabase.from("shipments").select("*, order_id").eq("id", shipId).single();
  if (!ship) return { error: "Shipment tidak ditemukan." };
  if (ship.status !== "DRAFT") return { error: "Hanya shipment DRAFT dapat dikonfirmasi." };

  const orderId = ship.order_id;

  // Get order items for reference
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, qty")
    .eq("order_id", orderId);
  const orderQtyMap = new Map((orderItems ?? []).map((it) => [it.product_id, Number(it.qty)]));

  // Get shipment items
  const { data: shipItems } = await supabase
    .from("shipment_items")
    .select("product_id, qty")
    .eq("shipment_id", shipId);

  // Get already confirmed shipments (exclude this one)
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
      shippedMap.set(it.product_id, (shippedMap.get(it.product_id) ?? 0) + Number(it.qty));
    }
  }

  // Validate qty: (already shipped + this shipment) <= order qty
  for (const it of shipItems ?? []) {
    const ordered = orderQtyMap.get(it.product_id) ?? 0;
    const alreadyShipped = shippedMap.get(it.product_id) ?? 0;
    const newTotal = alreadyShipped + Number(it.qty);
    if (newTotal > ordered) {
      return {
        error: `Qty shipment melebihi order untuk salah satu produk (ordered: ${ordered}, akan menjadi: ${newTotal}).`,
      };
    }
  }

  const { error } = await supabase.from("shipments").update({
    status: "CONFIRMED",
    confirmed_at: new Date().toISOString(),
    confirmed_by: user.id,
    updated_by: user.id,
  }).eq("id", shipId);

  if (error) return { error: error.message };

  // Update order status: ISSUED → IN_PROGRESS / PARTIALLY_FULFILLED / FULFILLED
  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single();
  let newStatus: string = order?.status ?? "IN_PROGRESS";

  // Compute shipped totals vs ordered
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
      finalShipped.set(it.product_id, (finalShipped.get(it.product_id) ?? 0) + Number(it.qty));
    }
  }

  let allFulfilled = true;
  let anyShipped = false;
  for (const [productId, qty] of orderQtyMap) {
    const shipped = finalShipped.get(productId) ?? 0;
    if (shipped > 0) anyShipped = true;
    if (shipped < qty) allFulfilled = false;
  }

  if (allFulfilled && orderQtyMap.size > 0) newStatus = "FULFILLED";
  else if (anyShipped) newStatus = "PARTIALLY_FULFILLED";

  await supabase.from("orders").update({
    status: newStatus,
    updated_by: user.id,
  }).eq("id", orderId);

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
  return { ok: true };
}

// =========================================================
// DELIVERY
// =========================================================
export async function createDelivery(shipId: string, input: unknown) {
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: ship } = await supabase.from("shipments").select("order_id, status").eq("id", shipId).single();
  if (!ship) return { error: "Shipment tidak ditemukan." };
  if (ship.status !== "CONFIRMED") return { error: "Shipment harus CONFIRMED dulu." };

  const { data: existing } = await supabase.from("deliveries").select("id").eq("shipment_id", shipId).maybeSingle();
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
    newValue: { delivery_number: delivery.delivery_number, shipment_id: shipId },
  });

  revalidatePath(`/orders/${ship.order_id}`);
  return { data: delivery };
}

// =========================================================
// BAST
// =========================================================
export async function createBastDraft(orderId: string, input: unknown) {
  const parsed = bastSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const d = parsed.data;
  const { data: bast, error } = await supabase
    .from("basts")
    .insert({
      order_id: orderId,
      bast_date: d.bast_date || null,
      receiver_name: d.receiver_name ?? null,
      signed_by: d.signed_by ?? null,
      signed_document_ref: d.signed_document_ref ?? null,
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

  const { data: existing } = await supabase.from("basts").select("status, order_id").eq("id", bastId).single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya BAST DRAFT dapat diedit." };

  const d = parsed.data;
  const { error } = await supabase.from("basts").update({
    bast_date: d.bast_date || null,
    receiver_name: d.receiver_name ?? null,
    signed_by: d.signed_by ?? null,
    signed_document_ref: d.signed_document_ref ?? null,
    remarks: d.remarks ?? null,
    updated_by: user.id,
  }).eq("id", bastId);

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

  const { data: existing } = await supabase.from("basts").select("status, order_id, bast_number").eq("id", bastId).single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya draft yang dapat disubmit." };

  const { error } = await supabase.from("basts").update({
    status: "SUBMITTED",
    submitted_at: new Date().toISOString(),
    submitted_by: user.id,
    updated_by: user.id,
  }).eq("id", bastId);

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

  const { data: existing } = await supabase.from("basts").select("status, order_id, bast_number, created_by").eq("id", bastId).single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "SUBMITTED") return { error: "Hanya SUBMITTED yang dapat diverifikasi." };

  const { error } = await supabase.from("basts").update({
    status: "VERIFIED",
    verified_at: new Date().toISOString(),
    verified_by: user.id,
    updated_by: user.id,
  }).eq("id", bastId);

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

  const { data: existing } = await supabase.from("basts").select("status, order_id, bast_number, created_by").eq("id", bastId).single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (!["SUBMITTED", "VERIFIED"].includes(existing.status)) {
    return { error: "BAST harus SUBMITTED atau VERIFIED." };
  }

  const { error } = await supabase.from("basts").update({
    status: "COMPLETED",
    completed_at: new Date().toISOString(),
    completed_by: user.id,
    updated_by: user.id,
  }).eq("id", bastId);

  if (error) return { error: error.message };

  // Update order status to CLOSED if fully fulfilled
  const { data: order } = await supabase.from("orders").select("status").eq("id", existing.order_id).single();
  if (order && order.status === "FULFILLED") {
    await supabase.from("orders").update({
      status: "CLOSED",
      updated_by: user.id,
    }).eq("id", existing.order_id);

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

// =========================================================
// DELETE
// =========================================================
export async function deleteProcurement(procId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("procurements").select("status, order_id").eq("id", procId).single();
  if (!existing) return { error: "Procurement tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya DRAFT dapat dihapus." };

  await supabase.from("procurements").delete().eq("id", procId);
  await writeAudit({ action: "DELETE", module: "Procurement", resourceType: "procurement", resourceId: procId });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

export async function deleteShipment(shipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("shipments").select("status, order_id").eq("id", shipId).single();
  if (!existing) return { error: "Shipment tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya DRAFT dapat dihapus." };

  await supabase.from("shipments").delete().eq("id", shipId);
  await writeAudit({ action: "DELETE", module: "Shipment", resourceType: "shipment", resourceId: shipId });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

export async function deleteBast(bastId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase.from("basts").select("status, order_id").eq("id", bastId).single();
  if (!existing) return { error: "BAST tidak ditemukan." };
  if (existing.status !== "DRAFT") return { error: "Hanya DRAFT dapat dihapus." };

  await supabase.from("basts").delete().eq("id", bastId);
  await writeAudit({ action: "DELETE", module: "BAST", resourceType: "bast", resourceId: bastId });
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}