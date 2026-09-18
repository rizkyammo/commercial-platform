"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { invoiceSchema, paymentSchema } from "@/lib/validation/invoicing";
import {
  createNotification,
  notifyUsersWithRole,
} from "@/features/notifications/actions";

// ============================================================
// PERMISSION HELPERS
// ============================================================
async function getPermissions(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string[]> {
  const { data } = await supabase.rpc("current_user_permissions");
  return (data ?? []) as string[];
}

function can(
  perms: string[],
  codes: string[],
  opts: { fallback?: string[] } = {}
): boolean {
  if (codes.some((c) => perms.includes(c))) return true;
  if (opts.fallback && opts.fallback.some((c) => perms.includes(c))) return true;
  return false;
}

// ============================================================
// CREATE INVOICE
// ============================================================
export async function createInvoice(orderId: string, input: unknown) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE", "ORDER_UPDATE_DRAFT"],
    })
  ) {
    return { error: "Anda tidak memiliki izin membuat invoice." };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id, status, currency")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order tidak ditemukan." };
  if (
    ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED"].includes(order.status)
  ) {
    return { error: "Invoice hanya dapat dibuat setelah order di-approve." };
  }

  const d = parsed.data;
  const dueDate = new Date(d.invoice_date);
  dueDate.setDate(dueDate.getDate() + d.payment_term_days);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      order_id: orderId,
      customer_id: order.customer_id,
      invoice_ref: d.invoice_ref ?? null,
      invoice_type: d.invoice_type,
      invoice_date: d.invoice_date,
      due_date: dueDate.toISOString().slice(0, 10),
      payment_term_days: d.payment_term_days,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      tax_rate: d.tax_rate,
      notes: d.notes ?? null,
      status: "DRAFT",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => ({
      invoice_id: invoice.id,
      product_id: it.product_id ?? null,
      description: it.description ?? null,
      qty: it.qty,
      uom: it.uom,
      unit_price: it.unit_price,
      line_value: it.qty * it.unit_price,
      sort_order: idx,
    }));
    const { error: itemErr } = await supabase
      .from("invoice_items")
      .insert(rows);
    if (itemErr) return { error: itemErr.message };
  }

  // Recompute totals (trigger juga jalan, tapi explicit untuk safety)
  await supabase.rpc("recompute_invoice_totals", {
    p_invoice_id: invoice.id,
  });

  await writeAudit({
    action: "CREATE",
    module: "Invoice",
    resourceType: "invoice",
    resourceId: invoice.id,
    newValue: {
      invoice_number: invoice.invoice_number,
      order_id: orderId,
      type: d.invoice_type,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/invoicing/${invoice.id}`);
  revalidatePath("/invoicing");
  return { data: invoice };
}

// ============================================================
// UPDATE INVOICE (hanya DRAFT)
// ============================================================
export async function updateInvoice(invoiceId: string, input: unknown) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE", "ORDER_UPDATE_DRAFT"],
    })
  ) {
    return { error: "Anda tidak memiliki izin mengedit invoice." };
  }

  const { data: existing } = await supabase
    .from("invoices")
    .select("status, order_id, paid_amount, amount_with_tax")
    .eq("id", invoiceId)
    .single();
  if (!existing) return { error: "Invoice tidak ditemukan." };

  // Revisi allowed kalau:
  // - DRAFT (belum di-issue), atau
  // - ISSUED/SENT tapi belum ada payment
  const hasPayment = Number(existing.paid_amount) > 0;
  const canEditDraft = existing.status === "DRAFT";
  const canEditUnsigned =
    ["ISSUED", "SENT"].includes(existing.status) && !hasPayment;

  if (!canEditDraft && !canEditUnsigned) {
    if (hasPayment) {
      return {
        error:
          "Invoice sudah ada payment. Tidak dapat direvisi — batalkan payment terlebih dahulu.",
      };
    }
    return { error: "Invoice tidak dapat direvisi pada status ini." };
  }

  const d = parsed.data;
  const dueDate = new Date(d.invoice_date);
  dueDate.setDate(dueDate.getDate() + d.payment_term_days);

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      invoice_ref: d.invoice_ref ?? null,
      invoice_type: d.invoice_type,
      invoice_date: d.invoice_date,
      due_date: dueDate.toISOString().slice(0, 10),
      payment_term_days: d.payment_term_days,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      tax_rate: d.tax_rate,
      notes: d.notes ?? null,
      // Reset ke DRAFT setelah revisi supaya harus di-issue ulang
      status: canEditDraft ? "DRAFT" : "DRAFT",
      updated_by: user.id,
    })
    .eq("id", invoiceId);

  if (updErr) return { error: updErr.message };

  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

  if (d.items.length > 0) {
    const rows = d.items.map((it, idx) => ({
      invoice_id: invoiceId,
      product_id: it.product_id ?? null,
      description: it.description ?? null,
      qty: it.qty,
      uom: it.uom,
      unit_price: it.unit_price,
      line_value: it.qty * it.unit_price,
      sort_order: idx,
    }));
    const { error: itemErr } = await supabase
      .from("invoice_items")
      .insert(rows);
    if (itemErr) return { error: itemErr.message };
  }

  // Recompute totals
  await supabase.rpc("recompute_invoice_totals", {
    p_invoice_id: invoiceId,
  });

  await writeAudit({
    action: "UPDATE",
    module: "Invoice",
    resourceType: "invoice",
    resourceId: invoiceId,
    reason: canEditUnsigned ? "Revisi invoice sebelum signed" : undefined,
  });

  revalidatePath(`/orders/${existing.order_id}`);
  revalidatePath(`/invoicing/${invoiceId}`);
  revalidatePath("/invoicing");
  return { ok: true };
}

// ============================================================
// ISSUE INVOICE (DRAFT → ISSUED)
// ============================================================
export async function issueInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_ISSUE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin issue invoice." };
  }

  const { data: existing } = await supabase
    .from("invoices")
    .select("status, order_id, invoice_number, amount_with_tax")
    .eq("id", invoiceId)
    .single();
  if (!existing) return { error: "Invoice tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya invoice DRAFT dapat di-issue." };
  if (Number(existing.amount_with_tax) <= 0)
    return { error: "Invoice amount harus > 0." };

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "ISSUED",
      issued_at: new Date().toISOString(),
      issued_by: user.id,
      updated_by: user.id,
    })
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "ISSUE",
    module: "Invoice",
    resourceType: "invoice",
    resourceId: invoiceId,
  });

  await notifyUsersWithRole("commercial_manager", {
    type: "INVOICE_ISSUED",
    severity: "INFO",
    title: `Invoice ${existing.invoice_number} di-issue`,
    link: `/invoicing/${invoiceId}`,
  });

  revalidatePath("/invoicing");
  revalidatePath(`/invoicing/${invoiceId}`);
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ============================================================
// SEND INVOICE (ISSUED → SENT)
// ============================================================
export async function sendInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_ISSUE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin mengirim invoice." };
  }

  const { data: existing } = await supabase
    .from("invoices")
    .select("status, order_id")
    .eq("id", invoiceId)
    .single();
  if (!existing) return { error: "Invoice tidak ditemukan." };
  if (existing.status !== "ISSUED")
    return { error: "Hanya invoice ISSUED yang dapat dikirim." };

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "SENT",
      sent_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "SEND",
    module: "Invoice",
    resourceType: "invoice",
    resourceId: invoiceId,
  });

  revalidatePath("/invoicing");
  revalidatePath(`/invoicing/${invoiceId}`);
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ============================================================
// RECORD PAYMENT
// ============================================================
export async function recordPayment(invoiceId: string, input: unknown) {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_PAYMENT", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin mencatat payment." };
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status, order_id, amount_with_tax")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return { error: "Invoice tidak ditemukan." };
  if (invoice.status === "DRAFT")
    return { error: "Invoice belum di-issue." };
  if (invoice.status === "CANCELLED")
    return { error: "Invoice sudah dibatalkan." };

  const d = parsed.data;

  const { error } = await supabase.from("invoice_payments").insert({
    invoice_id: invoiceId,
    payment_date: d.payment_date,
    amount: d.amount,
    currency: d.currency,
    reference: d.reference ?? null,
    notes: d.notes ?? null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  await writeAudit({
    action: "RECORD_PAYMENT",
    module: "Invoice",
    resourceType: "invoice",
    resourceId: invoiceId,
    newValue: { amount: d.amount, payment_date: d.payment_date },
  });

  revalidatePath("/invoicing");
  revalidatePath(`/invoicing/${invoiceId}`);
  revalidatePath(`/orders/${invoice.order_id}`);
  return { ok: true };
}

// ============================================================
// CANCEL INVOICE
// ============================================================
export async function cancelInvoice(invoiceId: string, reason: string) {
  if (!reason || reason.trim().length < 5)
    return { error: "Alasan minimal 5 karakter." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_CANCEL", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin cancel invoice." };
  }

  const { data: existing } = await supabase
    .from("invoices")
    .select("status, order_id, paid_amount")
    .eq("id", invoiceId)
    .single();
  if (!existing) return { error: "Invoice tidak ditemukan." };
  if (existing.status === "PAID")
    return { error: "Invoice sudah PAID, tidak dapat dibatalkan." };
  if (Number(existing.paid_amount) > 0)
    return {
      error:
        "Invoice sudah ada payment. Batalkan payment terlebih dahulu atau hubungi Finance.",
    };

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_by: user.id,
    })
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "CANCEL",
    module: "Invoice",
    resourceType: "invoice",
    resourceId: invoiceId,
    reason,
  });

  revalidatePath("/invoicing");
  revalidatePath(`/invoicing/${invoiceId}`);
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ============================================================
// DELETE INVOICE (hanya DRAFT)
// ============================================================
export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin menghapus invoice." };
  }

  const { data: existing } = await supabase
    .from("invoices")
    .select("status, order_id")
    .eq("id", invoiceId)
    .single();
  if (!existing) return { error: "Invoice tidak ditemukan." };
  if (existing.status !== "DRAFT")
    return { error: "Hanya invoice DRAFT dapat dihapus." };

  await supabase.from("invoices").delete().eq("id", invoiceId);

  await writeAudit({
    action: "DELETE",
    module: "Invoice",
    resourceType: "invoice",
    resourceId: invoiceId,
  });

  revalidatePath("/invoicing");
  revalidatePath(`/orders/${existing.order_id}`);
  return { ok: true };
}

// ============================================================
// DIAGNOSTIC — return current user permission flags
// ============================================================
export async function getMyInvoicePermissions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);

  return {
    permissions: perms,
    flags: {
      can_view: can(perms, ["INVOICE_VIEW", "INVOICE_MANAGE"], {
        fallback: ["ORDER_APPROVE"],
      }),
      can_create: can(perms, ["INVOICE_CREATE", "INVOICE_MANAGE"], {
        fallback: ["ORDER_APPROVE", "ORDER_UPDATE_DRAFT"],
      }),
      can_issue: can(perms, ["INVOICE_ISSUE", "INVOICE_MANAGE"], {
        fallback: ["ORDER_APPROVE"],
      }),
      can_pay: can(perms, ["INVOICE_PAYMENT", "INVOICE_MANAGE"], {
        fallback: ["ORDER_APPROVE"],
      }),
      can_cancel: can(perms, ["INVOICE_CANCEL", "INVOICE_MANAGE"], {
        fallback: ["ORDER_APPROVE"],
      }),
    },
  };
}