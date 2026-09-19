import { createClient } from "@/lib/supabase/server";
import type { MigrationBatch, StagingRow } from "./types";

// ============================================================
// LIST BATCHES
// ============================================================
export async function listMigrationBatches(): Promise<MigrationBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("migration_batches")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[listMigrationBatches]", error);
    return [];
  }
  return (data ?? []) as MigrationBatch[];
}

// ============================================================
// GET BATCH
// ============================================================
export async function getMigrationBatch(id: string): Promise<MigrationBatch | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("migration_batches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as MigrationBatch) ?? null;
}

// ============================================================
// LIST STAGING ROWS
// ============================================================
export async function listStagingRows(
  batchId: string,
  limit = 500
): Promise<StagingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("migration_staging")
    .select("*")
    .eq("batch_id", batchId)
    .order("row_index")
    .limit(limit);

  if (error) {
    console.error("[listStagingRows]", error);
    return [];
  }
  return (data ?? []) as StagingRow[];
}

// ============================================================
// LIST BATCH LOGS
// ============================================================
export async function listBatchLogs(batchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("migration_log")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });
  return data ?? [];
}