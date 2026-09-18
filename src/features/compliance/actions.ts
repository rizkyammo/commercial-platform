"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { createNotification, notifyUsersWithRole } from "@/features/notifications/actions";
import { skSchema, quotaLineSchema } from "@/lib/validation/compliance";

// ============================================================
// SK LIFECYCLE
// ============================================================
export async function createSk(input: unknown) {
  const parsed = skSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const d = parsed.data;
  const { data, error } = await supabase
    .from("kemhan_authorizations")
    .insert({
      sk_number: d.sk_number,
      issuing_authority: d.issuing_authority,
      issue_date: d.issue_date || null,
      effective_date: d.effective_date || null,
      expiry_date: d.expiry_date || null,
      scope: d.scope ?? null,
      document_ref: d.document_ref ?? null,
      notes: d.notes ?? null,
      status: "DRAFT",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "CREATE",
    module: "SK Kemhan",
    resourceType: "kemhan_authorization",
    resourceId: data.id,
    newValue: { sk_number: data.sk_number },
  });

  revalidatePath("/compliance");
  return { data };
}

export async function updateSk(id: string, input: unknown) {
  const parsed = skSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("kemhan_authorizations")
    .select("status")
    .eq("id", id)
    .single();
  if (!existing) return { error: "SK tidak ditemukan." };
  if (!["DRAFT", "UNDER_REVIEW"].includes(existing.status)) {
    return { error: "SK hanya dapat diedit saat DRAFT atau UNDER_REVIEW." };
  }

  const d = parsed.data;
  const { error } = await supabase
    .from("kemhan_authorizations")
    .update({
      sk_number: d.sk_number,
      issuing_authority: d.issuing_authority,
      issue_date: d.issue_date || null,
      effective_date: d.effective_date || null,
      expiry_date: d.expiry_date || null,
      scope: d.scope ?? null,
      document_ref: d.document_ref ?? null,
      notes: d.notes ?? null,
      updated_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await writeAudit({
    action: "UPDATE",
    module: "SK Kemhan",
    resourceType: "kemhan_authorization",
    resourceId: id,
  });

  revalidatePath(`/compliance/sk/${id}`);
  revalidatePath("/compliance");
  return { ok: true };
}

export async function submitSk(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("kemhan_authorizations")
    .update({ status: "UNDER_REVIEW", updated_by: user.id })
    .eq("id", id)
    .eq("status", "DRAFT");

  if (error) return { error: error.message };

  await writeAudit({
    action: "SUBMIT",
    module: "SK Kemhan",
    resourceType: "kemhan_authorization",
    resourceId: id,
  });

  await notifyUsersWithRole("compliance_approver", {
    type: "SK_SUBMITTED",
    severity: "INFO",
    title: "SK Kemhan menunggu aktivasi",
    link: `/compliance/sk/${id}`,
  });

  revalidatePath("/compliance");
  revalidatePath(`/compliance/sk/${id}`);
  return { ok: true };
}

export async function activateSk(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: sk } = await supabase
    .from("kemhan_authorizations")
    .select("*")
    .eq("id", id)
    .single();
  if (!sk) return { error: "SK tidak ditemukan." };
  if (!["UNDER_REVIEW", "APPROVED"].includes(sk.status)) {
    return { error: "Hanya SK UNDER_REVIEW atau APPROVED yang dapat diaktifkan." };
  }

  // Supersede previous ACTIVE SK (kalau ada)
  const { data: prev } = await supabase
    .from("kemhan_authorizations")
    .select("id, sk_number")
    .eq("status", "ACTIVE")
    .neq("id", id)
    .maybeSingle();

  if (prev) {
    await supabase
      .from("kemhan_authorizations")
      .update({ status: "SUPERSEDED", superseded_by_id: id, updated_by: user.id })
      .eq("id", prev.id);

    await supabase
      .from("kemhan_authorizations")
      .update({ supersedes_id: prev.id })
      .eq("id", id);

    await writeAudit({
      action: "SUPERSEDE",
      module: "SK Kemhan",
      resourceType: "kemhan_authorization",
      resourceId: prev.id,
      newValue: { superseded_by: id, superseded_by_number: sk.sk_number },
    });
  }

  const { error } = await supabase
    .from("kemhan_authorizations")
    .update({
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
      activated_by: user.id,
      updated_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await writeAudit({
    action: "ACTIVATE",
    module: "SK Kemhan",
    resourceType: "kemhan_authorization",
    resourceId: id,
  });

  await notifyUsersWithRole("commercial_manager", {
    type: "SK_ACTIVATED",
    severity: "SUCCESS",
    title: `SK ${sk.sk_number} aktif`,
    link: `/compliance/sk/${id}`,
  });

  revalidatePath("/compliance");
  revalidatePath(`/compliance/sk/${id}`);
  return { ok: true };
}

// ============================================================
// SK AMENDMENT — buat SK baru dari SK aktif
// ============================================================
export async function createSkAmendment(sourceSkId: string, newSkNumber: string) {
  if (!newSkNumber || newSkNumber.trim().length < 3) {
    return { error: "Nomor SK baru minimal 3 karakter." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Cek nomor SK tidak duplikat
  const { data: dup } = await supabase
    .from("kemhan_authorizations")
    .select("id")
    .eq("sk_number", newSkNumber.trim())
    .maybeSingle();
  if (dup) return { error: `SK dengan nomor ${newSkNumber} sudah ada.` };

  const { data: source } = await supabase
    .from("kemhan_authorizations")
    .select("sk_number, status")
    .eq("id", sourceSkId)
    .single();
  if (!source) return { error: "SK sumber tidak ditemukan." };
  if (!["ACTIVE", "SUPERSEDED", "EXPIRED"].includes(source.status)) {
    return {
      error: "Hanya SK ACTIVE, EXPIRED, atau SUPERSEDED yang dapat di-amend.",
    };
  }

  const { data: newId, error } = await supabase.rpc("create_sk_amendment", {
    p_source_sk_id: sourceSkId,
    p_actor: user.id,
    p_new_sk_number: newSkNumber.trim(),
  });

  if (error) return { error: error.message };

  await writeAudit({
    action: "AMEND_SK",
    module: "SK Kemhan",
    resourceType: "kemhan_authorization",
    resourceId: newId as string,
    newValue: { source_sk: source.sk_number, new_sk_number: newSkNumber },
  });

  revalidatePath("/compliance");
  return { data: { id: newId as string } };
}

// ============================================================
// QUOTA LINES
// ============================================================
export async function upsertQuotaLine(skId: string, input: unknown) {
  const parsed = quotaLineSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Validasi SK masih editable
  const { data: sk } = await supabase
    .from("kemhan_authorizations")
    .select("status")
    .eq("id", skId)
    .single();
  if (!sk) return { error: "SK tidak ditemukan." };
  if (!["DRAFT", "UNDER_REVIEW"].includes(sk.status)) {
    return {
      error:
        "SK sudah ACTIVE. Gunakan Amend SK untuk mengubah quota material.",
    };
  }

  const d = parsed.data;

  const { data: existing } = await supabase
    .from("kemhan_quota_lines")
    .select("id, allocation_qty")
    .eq("authorization_id", skId)
    .eq("product_id", d.product_id)
    .maybeSingle();

  if (existing) {
    // Update: emit ADJUSTMENT ledger kalau qty berubah
    const delta = d.allocation_qty - Number(existing.allocation_qty);
    if (delta !== 0) {
      await supabase.from("kemhan_quota_ledger").insert({
        quota_line_id: existing.id,
        transaction_type: "ADJUSTMENT",
        qty: delta,
        actor_user_id: user.id,
        reason: "Manual adjustment from SK editor",
      });
    }
    await supabase
      .from("kemhan_quota_lines")
      .update({
        allocation_qty: d.allocation_qty,
        uom: d.uom,
        notes: d.notes ?? null,
        updated_by: user.id,
      })
      .eq("id", existing.id);
  } else {
    // Create new line + ALLOCATION ledger
    const { data: newLine, error } = await supabase
      .from("kemhan_quota_lines")
      .insert({
        authorization_id: skId,
        product_id: d.product_id,
        allocation_qty: d.allocation_qty,
        uom: d.uom,
        notes: d.notes ?? null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();
    if (error) return { error: error.message };

    await supabase.from("kemhan_quota_ledger").insert({
      quota_line_id: newLine.id,
      transaction_type: "ALLOCATION",
      qty: d.allocation_qty,
      actor_user_id: user.id,
      reason: "Initial allocation",
    });

    // Ensure scope exists
    await supabase
      .from("kemhan_authorization_scopes")
      .upsert(
        { authorization_id: skId, product_id: d.product_id },
        { onConflict: "authorization_id,product_id" }
      );
  }

  await writeAudit({
    action: "UPSERT_QUOTA_LINE",
    module: "SK Kemhan",
    resourceType: "quota_line",
    resourceId: existing?.id ?? "new",
    newValue: {
      product_id: d.product_id,
      allocation_qty: d.allocation_qty,
      uom: d.uom,
    },
  });

  revalidatePath(`/compliance/sk/${skId}`);
  revalidatePath("/compliance");
  return { ok: true };
}

export async function deleteQuotaLine(lineId: string, skId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Validasi SK masih editable
  const { data: sk } = await supabase
    .from("kemhan_authorizations")
    .select("status")
    .eq("id", skId)
    .single();
  if (!sk) return { error: "SK tidak ditemukan." };
  if (!["DRAFT", "UNDER_REVIEW"].includes(sk.status)) {
    return { error: "SK sudah ACTIVE. Tidak dapat hapus quota line." };
  }

  // Cek line belum pernah dipakai (selain ALLOCATION)
  const { data: ledger } = await supabase
    .from("kemhan_quota_ledger")
    .select("id, transaction_type")
    .eq("quota_line_id", lineId);
  const used = (ledger ?? []).filter(
    (e) => e.transaction_type !== "ALLOCATION"
  );
  if (used.length > 0) {
    return {
      error:
        "Tidak bisa hapus: quota line sudah pernah dipakai (ada commitment/realization).",
    };
  }

  // Hapus ledger ALLOCATION + line
  await supabase
    .from("kemhan_quota_ledger")
    .delete()
    .eq("quota_line_id", lineId);

  await supabase.from("kemhan_quota_lines").delete().eq("id", lineId);

  await supabase
    .from("kemhan_authorization_scopes")
    .delete()
    .eq("authorization_id", skId);

  await writeAudit({
    action: "DELETE",
    module: "SK Kemhan",
    resourceType: "quota_line",
    resourceId: lineId,
  });

  revalidatePath(`/compliance/sk/${skId}`);
  revalidatePath("/compliance");
  return { ok: true };
}

// ============================================================
// ISSUE ORDER (integrated with quota reservation)
// ============================================================
export async function issueOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase.rpc("issue_order_with_quota", {
    p_order_id: orderId,
    p_actor: user.id,
  });

  if (error) return { error: error.message };

  const result = data as {
    success: boolean;
    error?: string;
    available?: number;
    requested?: number;
    sk_id?: string;
    product_id?: string;
  };

  if (!result.success) {
    const map: Record<string, string> = {
      ORDER_NOT_FOUND: "Order tidak ditemukan.",
      ORDER_INVALID_STATE:
        "Status order tidak mengizinkan issue. Order harus dalam status APPROVED.",
      SK_NOT_FOUND: "SK Kemhan aktif tidak ditemukan. Hubungi Compliance.",
      SK_NOT_ACTIVE: "SK Kemhan tidak aktif. Hubungi Compliance.",
      SK_EXPIRED: "SK Kemhan sudah expired. Hubungi Compliance untuk perpanjangan.",
      MATERIAL_NOT_AUTHORIZED:
        "Ada material dalam order yang tidak tercakup dalam SK aktif.",
      QUOTA_INSUFFICIENT: `Quota tidak mencukupi (available ${result.available}, requested ${result.requested}).`,
    };
    return {
      error:
        map[result.error ?? ""] ?? `Gagal issue order: ${result.error}`,
    };
  }

  await writeAudit({
    action: "ISSUE",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
    newValue: { sk_id: result.sk_id },
  });

  await notifyUsersWithRole("commercial_staff", {
    type: "ORDER_ISSUED",
    severity: "SUCCESS",
    title: "Order berhasil di-issue",
    message: "Quota telah di-reserve. Order siap untuk procurement & shipment.",
    link: `/orders/${orderId}`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/compliance");
  return { ok: true, sk_id: result.sk_id };
}

// ============================================================
// RELEASE QUOTA (dipanggil saat cancel)
// ============================================================
export async function releaseQuotaForOrder(orderId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase.rpc("release_order_quota", {
    p_order_id: orderId,
    p_actor: user.id,
    p_reason: reason,
  });

  if (error) return { error: error.message };

  await writeAudit({
    action: "RELEASE_QUOTA",
    module: "Order",
    resourceType: "order",
    resourceId: orderId,
    reason,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/compliance");
  return { ok: true, released: (data as { released?: number })?.released };
}

// ============================================================
// REALIZE QUOTA (dipanggil dari flow.confirmShipment)
// ============================================================
export async function realizeQuotaForShipment(shipmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase.rpc("realize_quota_for_shipment", {
    p_shipment_id: shipmentId,
    p_actor: user.id,
  });

  if (error) return { error: error.message };

  await writeAudit({
    action: "REALIZE_QUOTA",
    module: "Shipment",
    resourceType: "shipment",
    resourceId: shipmentId,
  });

  revalidatePath("/compliance");
  return { ok: true, result: data };
}

// ============================================================
// EXPIRY CHECK (dipanggil dari cron / scheduled task)
// ============================================================
export async function runSkExpiryCheck() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_sk_expiry");
  if (error) return { error: error.message };
  revalidatePath("/compliance");
  return { ok: true };
}