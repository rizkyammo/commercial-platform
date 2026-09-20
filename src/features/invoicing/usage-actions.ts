"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import {
  usageReportSchema,
  type UsageReportInput,
} from "@/lib/validation/usage-report";
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
// CREATE USAGE REPORT
// ============================================================
export async function createUsageReport(input: unknown) {
  const parsed = usageReportSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["USAGE_REPORT_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin membuat usage report." };
  }

  const d = parsed.data;

  const { data: report, error } = await supabase
    .from("usage_reports")
    .insert({
      project_id: d.project_id ?? null,
      project_code: d.project_code ?? null,
      site_id: d.site_id ?? null,
      customer_id: d.customer_id ?? null,
      order_id: d.order_id ?? null,
      report_type: d.report_type,
      period_start: d.period_start,
      period_end: d.period_end,
      period_type: d.period_type,
      notes: d.notes ?? null,
      status: "DRAFT",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const rows = d.lines.map((ln, idx) => ({
    usage_report_id: report.id,
    product_id: ln.product_id ?? null,
    description: ln.description ?? null,
    line_type: ln.line_type,
    margin_type: ln.margin_type,
    qty_usage: ln.qty_usage,
    uom: ln.uom,
    unit_price: ln.unit_price,
    rate: ln.rate ?? null,
    unit_cost: ln.unit_cost,
    amount: ln.qty_usage * ln.unit_price,
    transport_amount: ln.transport_amount,
    stock_awal: ln.stock_awal ?? null,
    stock_akhir: ln.stock_akhir ?? null,
    sort_order: idx,
  }));

  const { error: lineErr } = await supabase
    .from("usage_report_lines")
    .insert(rows);

  if (lineErr) return { error: lineErr.message };

  await supabase.rpc("recompute_usage_report_totals", {
    p_report_id: report.id,
  });

  await writeAudit({
    action: "CREATE",
    module: "UsageReport",
    resourceType: "usage_report",
    resourceId: report.id,
    newValue: {
      report_number: report.report_number,
      report_type: d.report_type,
      period: `${d.period_start} → ${d.period_end}`,
    },
  });

  revalidatePath("/invoicing/usage-reports");
  return { data: report };
}

// ============================================================
// UPDATE USAGE REPORT (hanya DRAFT / REJECTED)
// ============================================================
export async function updateUsageReport(reportId: string, input: unknown) {
  const parsed = usageReportSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["USAGE_REPORT_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin mengedit usage report." };
  }

  const { data: existing } = await supabase
    .from("usage_reports")
    .select("status")
    .eq("id", reportId)
    .single();

  if (!existing) return { error: "Usage report tidak ditemukan." };
  if (!["DRAFT", "REJECTED"].includes(existing.status)) {
    return {
      error: "Hanya usage report DRAFT/REJECTED yang dapat diedit.",
    };
  }

  const d = parsed.data;

  const { error: updErr } = await supabase
    .from("usage_reports")
    .update({
      project_id: d.project_id ?? null,
      project_code: d.project_code ?? null,
      site_id: d.site_id ?? null,
      customer_id: d.customer_id ?? null,
      order_id: d.order_id ?? null,
      report_type: d.report_type,
      period_start: d.period_start,
      period_end: d.period_end,
      period_type: d.period_type,
      notes: d.notes ?? null,
      // Reset ke DRAFT setelah edit
      status: "DRAFT",
      updated_by: user.id,
    })
    .eq("id", reportId);

  if (updErr) return { error: updErr.message };

  await supabase
    .from("usage_report_lines")
    .delete()
    .eq("usage_report_id", reportId);

  const rows = d.lines.map((ln, idx) => ({
    usage_report_id: reportId,
    product_id: ln.product_id ?? null,
    description: ln.description ?? null,
    line_type: ln.line_type,
    margin_type: ln.margin_type,
    qty_usage: ln.qty_usage,
    uom: ln.uom,
    unit_price: ln.unit_price,
    rate: ln.rate ?? null,
    unit_cost: ln.unit_cost,
    amount: ln.qty_usage * ln.unit_price,
    transport_amount: ln.transport_amount,
    stock_awal: ln.stock_awal ?? null,
    stock_akhir: ln.stock_akhir ?? null,
    sort_order: idx,
  }));

  const { error: lineErr } = await supabase
    .from("usage_report_lines")
    .insert(rows);

  if (lineErr) return { error: lineErr.message };

  await supabase.rpc("recompute_usage_report_totals", {
    p_report_id: reportId,
  });

  await writeAudit({
    action: "UPDATE",
    module: "UsageReport",
    resourceType: "usage_report",
    resourceId: reportId,
  });

  revalidatePath("/invoicing/usage-reports");
  revalidatePath(`/invoicing/usage-reports/${reportId}`);
  return { ok: true };
}

// ============================================================
// DELETE USAGE REPORT (hanya DRAFT)
// ============================================================
export async function deleteUsageReport(reportId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["USAGE_REPORT_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin menghapus usage report." };
  }

  const { data: existing } = await supabase
    .from("usage_reports")
    .select("status")
    .eq("id", reportId)
    .single();

  if (!existing) return { error: "Usage report tidak ditemukan." };
  if (existing.status !== "DRAFT") {
    return { error: "Hanya usage report DRAFT yang dapat dihapus." };
  }

  await supabase.from("usage_reports").delete().eq("id", reportId);

  await writeAudit({
    action: "DELETE",
    module: "UsageReport",
    resourceType: "usage_report",
    resourceId: reportId,
  });

  revalidatePath("/invoicing/usage-reports");
  return { ok: true };
}

// ============================================================
// SUBMIT USAGE REPORT (DRAFT → SUBMITTED)
// ============================================================
export async function submitUsageReport(reportId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["USAGE_REPORT_CREATE", "USAGE_REPORT_APPROVE", "INVOICE_MANAGE"])
  ) {
    return { error: "Anda tidak memiliki izin submit usage report." };
  }

  const { data: existing } = await supabase
    .from("usage_reports")
    .select("status, report_number, total_qty")
    .eq("id", reportId)
    .single();

  if (!existing) return { error: "Usage report tidak ditemukan." };
  if (!["DRAFT", "REJECTED"].includes(existing.status)) {
    return { error: "Hanya usage report DRAFT/REJECTED yang dapat disubmit." };
  }
  if (Number(existing.total_qty) <= 0) {
    return { error: "Total qty usage harus > 0." };
  }

  const { error } = await supabase
    .from("usage_reports")
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      submitted_by: user.id,
      updated_by: user.id,
      rejected_at: null,
      rejected_by: null,
      reject_reason: null,
    })
    .eq("id", reportId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "SUBMIT",
    module: "UsageReport",
    resourceType: "usage_report",
    resourceId: reportId,
  });

  await notifyUsersWithRole("commercial_supervisor", {
    type: "USAGE_REPORT_SUBMITTED",
    severity: "INFO",
    title: `Usage report ${existing.report_number} menunggu approval`,
    link: `/invoicing/usage-reports/${reportId}`,
  });

  revalidatePath("/invoicing/usage-reports");
  revalidatePath(`/invoicing/usage-reports/${reportId}`);
  return { ok: true };
}

// ============================================================
// APPROVE USAGE REPORT (SUBMITTED → APPROVED)
// Note: trigger DB akan otomatis catat stock_movements OUT
// ============================================================
export async function approveUsageReport(reportId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["USAGE_REPORT_APPROVE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin approve usage report." };
  }

  const { data: existing } = await supabase
    .from("usage_reports")
    .select("status, report_number")
    .eq("id", reportId)
    .single();

  if (!existing) return { error: "Usage report tidak ditemukan." };
  if (existing.status !== "SUBMITTED") {
    return { error: "Hanya usage report SUBMITTED yang dapat di-approve." };
  }

  const { error } = await supabase
    .from("usage_reports")
    .update({
      status: "APPROVED",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      updated_by: user.id,
    })
    .eq("id", reportId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "APPROVE",
    module: "UsageReport",
    resourceType: "usage_report",
    resourceId: reportId,
  });

  revalidatePath("/invoicing/usage-reports");
  revalidatePath(`/invoicing/usage-reports/${reportId}`);
  return { ok: true };
}

// ============================================================
// REJECT USAGE REPORT
// ============================================================
export async function rejectUsageReport(reportId: string, reason: string) {
  if (!reason || reason.trim().length < 5) {
    return { error: "Alasan minimal 5 karakter." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["USAGE_REPORT_APPROVE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin reject usage report." };
  }

  const { data: existing } = await supabase
    .from("usage_reports")
    .select("status")
    .eq("id", reportId)
    .single();

  if (!existing) return { error: "Usage report tidak ditemukan." };
  if (existing.status !== "SUBMITTED") {
    return { error: "Hanya usage report SUBMITTED yang dapat di-reject." };
  }

  const { error } = await supabase
    .from("usage_reports")
    .update({
      status: "REJECTED",
      rejected_at: new Date().toISOString(),
      rejected_by: user.id,
      reject_reason: reason,
      updated_by: user.id,
    })
    .eq("id", reportId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "REJECT",
    module: "UsageReport",
    resourceType: "usage_report",
    resourceId: reportId,
    reason,
  });

  revalidatePath("/invoicing/usage-reports");
  revalidatePath(`/invoicing/usage-reports/${reportId}`);
  return { ok: true };
}

// ============================================================
// GENERATE INVOICE FROM USAGE REPORT (manual)
// Hanya boleh dari status APPROVED
// ============================================================
export async function generateInvoiceFromUsageReport(reportId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["INVOICE_GENERATE", "INVOICE_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin generate invoice." };
  }

  const { data: report } = await supabase
    .from("usage_reports")
    .select("*, orders(id, customer_id, business_model, currency, project_code, order_type)")
    .eq("id", reportId)
    .single();

  if (!report) return { error: "Usage report tidak ditemukan." };
  if (report.status !== "APPROVED") {
    return { error: "Hanya usage report APPROVED yang dapat di-invoice." };
  }
  if (report.invoice_id) {
    return { error: "Usage report sudah pernah di-invoice." };
  }

  const { data: lines } = await supabase
    .from("usage_report_lines")
    .select("*")
    .eq("usage_report_id", reportId)
    .order("sort_order");

  if (!lines || lines.length === 0) {
    return { error: "Usage report tidak memiliki baris." };
  }

  // Tentukan billing model dari order (fallback MANUAL)
  const billingModel =
    report.report_type === "BCM_VOLUME" ? "BCM" : "CONSIGNMENT";
  const order = report.orders as any;

  // Buat invoice header
  const today = new Date().toISOString().slice(0, 10);
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      order_id: report.order_id,
      customer_id: report.customer_id,
      billing_model: billingModel,
      invoice_trigger:
        report.report_type === "BCM_VOLUME"
          ? "PRODUCTION_VOLUME"
          : "USAGE_REPORT",
      payment_method: "TERM",
      invoice_date: today,
      due_date: today, // akan di-update setelah payment term ditentukan user
      payment_term_days: 30,
      period_start: report.period_start,
      period_end: report.period_end,
      period_type: report.period_type,
      project_id: report.project_id,
      site_id: report.site_id,
      usage_report_id: report.id,
      currency: order?.currency ?? "IDR",
      exchange_rate: 1,
      tax_rate: 11,
      status: "DRAFT",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (invErr) return { error: invErr.message };

  // Buat invoice items dari usage report lines
  const itemRows = lines.map((ln, idx) => ({
    invoice_id: invoice.id,
    product_id: ln.product_id,
    description: ln.description,
    line_type: ln.line_type,
    margin_type: ln.margin_type,
    qty: ln.qty_usage,
    uom: ln.uom,
    unit_price: ln.unit_price,
    unit_cost: ln.unit_cost,
    line_value: ln.amount,
    stock_awal: ln.stock_awal,
    stock_akhir: ln.stock_akhir,
    rate: ln.rate,
    sort_order: idx,
  }));

  const { error: itemErr } = await supabase
    .from("invoice_items")
    .insert(itemRows);

  if (itemErr) return { error: itemErr.message };

  // Update usage report status ke INVOICED + link
  await supabase
    .from("usage_reports")
    .update({
      status: "INVOICED",
      invoice_id: invoice.id,
      invoiced_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", reportId);

  // Recompute
  await supabase.rpc("recompute_invoice_totals", {
    p_invoice_id: invoice.id,
  });

  await writeAudit({
    action: "GENERATE_INVOICE",
    module: "UsageReport",
    resourceType: "usage_report",
    resourceId: reportId,
    newValue: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
    },
  });

  revalidatePath("/invoicing/usage-reports");
  revalidatePath(`/invoicing/usage-reports/${reportId}`);
  revalidatePath(`/invoicing/${invoice.id}`);
  revalidatePath("/invoicing");

  return { data: invoice };
}

// ============================================================
// ADJUST STOCK (manual adjustment)
// ============================================================
export async function adjustStock(input: {
  project_code?: string | null;
  project_id?: string | null;
  site_id?: string | null;
  product_id: string;
  qty: number; // positif = tambah, negatif = kurangi
  uom: string;
  unit_cost?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const perms = await getPermissions(supabase);
  if (
    !can(perms, ["USAGE_REPORT_CREATE", "INVOICE_MANAGE"], {
      fallback: ["ORDER_APPROVE"],
    })
  ) {
    return { error: "Anda tidak memiliki izin adjust stock." };
  }

  const { error } = await supabase.from("stock_movements").insert({
    project_code: input.project_code ?? null,
    project_id: input.project_id ?? null,
    site_id: input.site_id ?? null,
    product_id: input.product_id,
    movement_type: "ADJUSTMENT",
    qty: input.qty,
    uom: input.uom,
    reference_type: "ADJUSTMENT",
    unit_cost: input.unit_cost ?? null,
    notes: input.notes ?? null,
    movement_date: new Date().toISOString().slice(0, 10),
    created_by: user.id,
  });

  if (error) return { error: error.message };

  await writeAudit({
    action: "ADJUST_STOCK",
    module: "StockMovement",
    resourceType: "product",
    resourceId: input.product_id,
    newValue: {
      qty: input.qty,
      project_code: input.project_code,
    },
  });

  revalidatePath("/invoicing/usage-reports");
  return { ok: true };
}