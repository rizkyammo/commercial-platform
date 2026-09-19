"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { ENTITY_FIELDS, autoMatchHeaders, type EntityType } from "./types";

// ============================================================
// HELPER: Check admin
// ============================================================
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", user: null };

  const { data: perms } = await supabase.rpc("current_user_permissions");
  if (!((perms ?? []) as string[]).includes("USER_MANAGE")) {
    return { error: "Hanya admin yang dapat mengakses migration.", user: null };
  }
  return { user, error: null };
}

// ============================================================
// CREATE BATCH dari upload
// ============================================================
export async function createMigrationBatch(input: {
  name: string;
  entity_type: EntityType;
  file_name: string;
  file_size: number;
  rows: Record<string, unknown>[];
}) {
  const { user, error } = await requireAdmin();
  if (error || !user) return { error };

  const supabase = await createClient();

  const headers = Object.keys(input.rows[0] ?? {});
  const column_mapping = autoMatchHeaders(headers, input.entity_type);

  const { data: batch, error: batchErr } = await supabase
    .from("migration_batches")
    .insert({
      name: input.name,
      entity_type: input.entity_type,
      file_name: input.file_name,
      file_size: input.file_size,
      row_count: input.rows.length,
      status: "UPLOADED",
      column_mapping,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (batchErr) return { error: batchErr.message };

  // Insert staging rows in chunks
  const chunkSize = 500;
  for (let i = 0; i < input.rows.length; i += chunkSize) {
    const chunk = input.rows.slice(i, i + chunkSize).map((r, idx) => ({
      batch_id: batch.id,
      row_index: i + idx + 1,
      raw_data: r,
      status: "PENDING",
    }));
    const { error: insErr } = await supabase
      .from("migration_staging")
      .insert(chunk);
    if (insErr) {
      await supabase.from("migration_batches").delete().eq("id", batch.id);
      return { error: `Gagal insert staging: ${insErr.message}` };
    }
  }

  await supabase.from("migration_log").insert({
    batch_id: batch.id,
    step: "UPLOAD",
    message: `Uploaded ${input.rows.length} rows`,
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "MIGRATION_UPLOAD",
    module: "Migration",
    resourceType: "migration_batch",
    resourceId: batch.id,
    newValue: { entity_type: input.entity_type, rows: input.rows.length },
  });

  revalidatePath("/admin/migration");
  return { data: batch };
}

// ============================================================
// UPDATE MAPPING
// ============================================================
export async function updateBatchMapping(
  batchId: string,
  mapping: Record<string, string>
) {
  const { user, error } = await requireAdmin();
  if (error || !user) return { error };

  const supabase = await createClient();
  const { error: updErr } = await supabase
    .from("migration_batches")
    .update({ column_mapping: mapping, status: "MAPPED" })
    .eq("id", batchId);

  if (updErr) return { error: updErr.message };

  revalidatePath(`/admin/migration/${batchId}`);
  return { ok: true };
}

// ============================================================
// VALIDATE
// ============================================================
export async function validateBatch(batchId: string) {
  const { user, error } = await requireAdmin();
  if (error || !user) return { error };

  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("migration_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (!batch) return { error: "Batch tidak ditemukan." };

  const entityType = batch.entity_type as EntityType;
  const mapping = (batch.column_mapping ?? {}) as Record<string, string>;
  const fields = ENTITY_FIELDS[entityType];

  // Fetch all staging rows
  const { data: rows } = await supabase
    .from("migration_staging")
    .select("*")
    .eq("batch_id", batchId)
    .order("row_index");

  if (!rows || rows.length === 0) {
    return { error: "Tidak ada data." };
  }

  // Preload reference data
  const [customers, sites, products, contracts, orders] = await Promise.all([
    supabase.from("customers").select("id, code"),
    supabase.from("sites").select("id, code, customer_id"),
    supabase.from("products").select("id, code"),
    supabase.from("contracts").select("id, code, customer_id"),
    supabase.from("orders").select("id, po_number"),
  ]);

  const customerMap = new Map(
    (customers.data ?? []).map((c) => [c.code.toLowerCase(), c.id])
  );
  const siteMap = new Map(
    (sites.data ?? []).map((s) => [s.code.toLowerCase(), s.id])
  );
  const productMap = new Map(
    (products.data ?? []).map((p) => [p.code.toLowerCase(), p.id])
  );
  const contractMap = new Map(
    (contracts.data ?? []).map((c) => [c.code.toLowerCase(), c.id])
  );
  const orderMap = new Map(
    (orders.data ?? []).map((o) => [o.po_number?.toLowerCase() ?? "", o.id])
  );

  // Existing codes (untuk duplicate detection)
// ============================================================
// DUPLICATE DETECTION SETUP
// ============================================================
const existingCodes = new Set<string>();
const existingNames = new Set<string>();    // opsional: cek by name
const existingPOs = new Set<string>();      // untuk entity yang pakai po_number

if (
  ["customers", "products", "vendors", "transporters", "contracts"].includes(
    entityType
  )
) {
  const { data: existing } = await supabase
    .from(entityType)
    .select("code, name");
  for (const e of existing ?? []) {
    const code = (e as { code: string }).code;
    const name = (e as { name?: string }).name;
    if (code) existingCodes.add(code.toLowerCase());
    if (name) existingNames.add(name.toLowerCase().trim());
  }
}

// Order / order_items pakai po_number sebagai identifier
if (["orders", "order_items"].includes(entityType)) {
  const { data: existing } = await supabase
    .from("orders")
    .select("po_number");
  for (const e of existing ?? []) {
    const po = (e as { po_number: string | null }).po_number;
    if (po) existingPOs.add(po.toLowerCase());
  }
}

// Track untuk duplikat dalam batch ini juga
const seenCodesInBatch = new Map<string, number>(); // code → row_index pertama
const seenPOsInBatch = new Map<string, number>();

  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  const updates: {
    id: string;
    mapped_data: Record<string, unknown>;
    status: string;
    errors: string[];
    warnings: string[];
  }[] = [];

  for (const row of rows) {
    const raw = row.raw_data as Record<string, unknown>;
    const mapped: Record<string, unknown> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    // Apply mapping
    for (const [sourceHeader, targetField] of Object.entries(mapping)) {
      if (!targetField) continue;
      mapped[targetField] = raw[sourceHeader];
    }

    // Required check
    for (const field of fields) {
      if (
        field.required &&
        (mapped[field.key] === undefined ||
          mapped[field.key] === null ||
          mapped[field.key] === "")
      ) {
        errors.push(`${field.label} wajib diisi`);
      }
    }

    // Type validation & normalization
    for (const field of fields) {
      const v = mapped[field.key];
      if (v === undefined || v === null || v === "") continue;

      if (field.type === "number") {
        const num = Number(v);
        if (isNaN(num)) errors.push(`${field.label} harus angka`);
        else mapped[field.key] = num;
      } else if (field.type === "date") {
        const d = new Date(String(v));
        if (isNaN(d.getTime())) errors.push(`${field.label} bukan tanggal valid`);
        else mapped[field.key] = d.toISOString().slice(0, 10);
      } else if (field.type === "email") {
        const email = String(v);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          warnings.push(`${field.label} tidak valid`);
        }
      } else if (field.type === "boolean") {
        mapped[field.key] = ["true", "1", "yes", "ya", "y"].includes(
          String(v).toLowerCase()
        );
      } else {
        mapped[field.key] = String(v).trim();
      }
    }

    // Foreign key lookups
    if (mapped.customer_code) {
      const code = String(mapped.customer_code).toLowerCase();
      if (!customerMap.has(code)) {
        errors.push(`Customer "${mapped.customer_code}" tidak ditemukan`);
      } else {
        mapped.customer_id = customerMap.get(code);
      }
    }
    if (mapped.site_code) {
      const code = String(mapped.site_code).toLowerCase();
      if (!siteMap.has(code)) {
        warnings.push(`Site "${mapped.site_code}" tidak ditemukan`);
      } else {
        mapped.site_id = siteMap.get(code);
      }
    }
    if (mapped.product_code) {
      const code = String(mapped.product_code).toLowerCase();
      if (!productMap.has(code)) {
        errors.push(`Product "${mapped.product_code}" tidak ditemukan`);
      } else {
        mapped.product_id = productMap.get(code);
      }
    }
    if (mapped.contract_code) {
      const code = String(mapped.contract_code).toLowerCase();
      if (!contractMap.has(code)) {
        warnings.push(`Contract "${mapped.contract_code}" tidak ditemukan`);
      } else {
        mapped.contract_id = contractMap.get(code);
      }
    }
    if (mapped.po_number && entityType === "order_items") {
      const po = String(mapped.po_number).toLowerCase();
      if (!orderMap.has(po)) {
        errors.push(`Order dengan PO "${mapped.po_number}" tidak ditemukan`);
      } else {
        mapped.order_id = orderMap.get(po);
      }
    }

    // Duplicate check
// ============================================================
// DUPLICATE CHECK #1 — vs Database Existing
// ============================================================
if (mapped.code) {
  const codeNorm = String(mapped.code).toLowerCase().trim();
  if (existingCodes.has(codeNorm)) {
    errors.push(`Code "${mapped.code}" sudah ada di database`);
  }
}

// ============================================================
// DUPLICATE CHECK #2 — vs baris lain dalam batch ini
// ============================================================
if (mapped.code) {
  const codeNorm = String(mapped.code).toLowerCase().trim();
  const firstOccurrence = seenCodesInBatch.get(codeNorm);

  if (firstOccurrence !== undefined) {
    errors.push(
      `Code "${mapped.code}" duplikat dengan baris #${firstOccurrence} dalam file ini`
    );
  } else {
    // Tandai code ini sudah muncul di batch
    seenCodesInBatch.set(codeNorm, row.row_index);
  }
}

// ============================================================
// DUPLICATE CHECK #3 — untuk orders/order_items (via PO number)
// ============================================================
if (mapped.po_number) {
  const poNorm = String(mapped.po_number).toLowerCase().trim();

  // Cek vs database existing (untuk entity "orders")
  if (entityType === "orders" && existingPOs.has(poNorm)) {
    errors.push(`PO Number "${mapped.po_number}" sudah ada di database`);
  }

  // Cek vs baris lain dalam batch
  const firstOccurrence = seenPOsInBatch.get(poNorm);
  if (entityType === "orders") {
    if (firstOccurrence !== undefined) {
      errors.push(
        `PO Number "${mapped.po_number}" duplikat dengan baris #${firstOccurrence} dalam file ini`
      );
    } else {
      seenPOsInBatch.set(poNorm, row.row_index);
    }
  }
}

    let status: string;
    if (errors.length > 0) {
      status = "ERROR";
      errorCount++;
    } else if (warnings.length > 0) {
      status = "WARNING";
      warningCount++;
    } else {
      status = "VALID";
      validCount++;
    }

    updates.push({
      id: row.id,
      mapped_data: mapped,
      status,
      errors,
      warnings,
    });
  }

  // Batch update staging rows
  const chunkSize = 200;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((u) =>
        supabase
          .from("migration_staging")
          .update({
            mapped_data: u.mapped_data,
            status: u.status,
            errors: u.errors,
            warnings: u.warnings,
          })
          .eq("id", u.id)
      )
    );
  }

  // Update batch summary
  await supabase
    .from("migration_batches")
    .update({
      status: "VALIDATED",
      valid_count: validCount,
      warning_count: warningCount,
      error_count: errorCount,
      validated_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  await supabase.from("migration_log").insert({
    batch_id: batchId,
    step: "VALIDATE",
    message: `Validated: ${validCount} valid, ${warningCount} warning, ${errorCount} error`,
    details: { validCount, warningCount, errorCount },
    actor_user_id: user.id,
  });

  revalidatePath(`/admin/migration/${batchId}`);
  return { ok: true, validCount, warningCount, errorCount };
}

// ============================================================
// COMMIT
// ============================================================
export async function commitBatch(batchId: string, includeWarnings = false) {
  const { user, error } = await requireAdmin();
  if (error || !user) return { error };

  const admin = createAdminClient();

  const { data: batch } = await admin
    .from("migration_batches")
    .select("*")
    .eq("id", batchId)
    .single();
  if (!batch) return { error: "Batch tidak ditemukan." };
  if (batch.status !== "VALIDATED") {
    return { error: "Batch harus divalidasi dulu." };
  }

  const entityType = batch.entity_type as EntityType;
  const allowedStatuses = includeWarnings ? ["VALID", "WARNING"] : ["VALID"];

  const { data: rows } = await admin
    .from("migration_staging")
    .select("*")
    .eq("batch_id", batchId)
    .in("status", allowedStatuses)
    .order("row_index");

  if (!rows || rows.length === 0) {
    return { error: "Tidak ada baris yang bisa di-commit." };
  }

  const insertable: Record<string, unknown>[] = [];
  const rowIds: string[] = [];

  for (const row of rows) {
    const d = row.mapped_data as Record<string, unknown>;
    const clean: Record<string, unknown> = {};

    for (const f of ENTITY_FIELDS[entityType]) {
      if (d[f.key] !== undefined) clean[f.key] = d[f.key];
    }

    if (d.customer_id) clean.customer_id = d.customer_id;
    if (d.site_id) clean.site_id = d.site_id;
    if (d.product_id) clean.product_id = d.product_id;
    if (d.contract_id) clean.contract_id = d.contract_id;
    if (d.order_id) clean.order_id = d.order_id;

    clean.created_by = user.id;
    clean.updated_by = user.id;

    insertable.push(clean);
    rowIds.push(row.id);
  }

  const chunkSize = 100;
  let committed = 0;
  let failed = 0;

  for (let i = 0; i < insertable.length; i += chunkSize) {
    const chunk = insertable.slice(i, i + chunkSize);
// Track duplicate codes untuk upsert
const codesToUpsert = chunk
  .map((c) => (c as { code?: string }).code)
  .filter(Boolean) as string[];

// Kalau includeWarnings = true → mode upsert (update existing)
let result;
if (includeWarnings && codesToUpsert.length > 0 && entityType !== "orders") {
  // Upsert by code
  result = await admin
    .from(entityType)
    .upsert(chunk, { onConflict: "code" })
    .select("id");
} else {
  // Insert only
  result = await admin
    .from(entityType)
    .insert(chunk)
    .select("id");
}
const { data: inserted, error: insErr } = result;

    if (insErr) {
      await admin.from("migration_log").insert({
        batch_id: batchId,
        step: "COMMIT",
        message: `Chunk ${i / chunkSize + 1} gagal: ${insErr.message}`,
        actor_user_id: user.id,
      });
      failed += chunk.length;
      continue;
    }

    const ids = rowIds.slice(i, i + chunkSize);
    const targetIds = (inserted ?? []).map((x: { id: string }) => x.id);

    for (let j = 0; j < ids.length; j++) {
      await admin
        .from("migration_staging")
        .update({
          status: "COMMITTED",
          commit_target_id: targetIds[j] ?? null,
          commit_target_table: entityType,
        })
        .eq("id", ids[j]);
    }

    committed += chunk.length;
  }

  // Update batch
  const finalStatus = failed > 0 ? "PARTIAL" : "COMMITTED";
  await admin
    .from("migration_batches")
    .update({
      status: finalStatus,
      committed_count: committed,
      committed_at: new Date().toISOString(),
      committed_by: user.id,
    })
    .eq("id", batchId);

  await admin.from("migration_log").insert({
    batch_id: batchId,
    step: "COMMIT",
    message: `Committed ${committed} rows to ${entityType}${failed > 0 ? ` (${failed} failed)` : ""}`,
    details: { committed, failed },
    actor_user_id: user.id,
  });

  await writeAudit({
    action: "MIGRATION_COMMIT",
    module: "Migration",
    resourceType: "migration_batch",
    resourceId: batchId,
    newValue: { entity_type: entityType, committed, failed },
  });

  revalidatePath("/admin/migration");
  revalidatePath(`/admin/migration/${batchId}`);
  return { ok: true, committed, failed };
}

// ============================================================
// DELETE BATCH
// ============================================================
export async function deleteBatch(batchId: string) {
  const { user, error } = await requireAdmin();
  if (error || !user) return { error };

  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("migration_batches")
    .select("status")
    .eq("id", batchId)
    .single();

  if (!batch) return { error: "Batch tidak ditemukan." };
  if (batch.status === "COMMITTED" || batch.status === "PARTIAL") {
    return { error: "Batch sudah di-commit, tidak bisa dihapus." };
  }

  await supabase.from("migration_batches").delete().eq("id", batchId);

  await writeAudit({
    action: "MIGRATION_DELETE",
    module: "Migration",
    resourceType: "migration_batch",
    resourceId: batchId,
  });

  revalidatePath("/admin/migration");
  return { ok: true };
}