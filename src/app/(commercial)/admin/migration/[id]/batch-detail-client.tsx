"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import {
  validateBatch,
  commitBatch,
  deleteBatch,
  updateBatchMapping,
} from "@/features/migration/actions";
import {
  ENTITY_FIELDS,
  type EntityType,
  type MigrationBatch,
  type StagingRow,
} from "@/features/migration/types";

function rowTone(
  s: string
): "green" | "red" | "orange" | "grey" | "blue" {
  if (s === "VALID" || s === "COMMITTED") return "green";
  if (s === "ERROR") return "red";
  if (s === "WARNING") return "orange";
  if (s === "PENDING") return "blue";
  return "grey";
}

function statusTone(
  s: string
): "green" | "blue" | "red" | "orange" | "grey" {
  if (s === "COMMITTED") return "green";
  if (s === "PARTIAL") return "orange";
  if (s === "VALIDATED") return "blue";
  if (s === "FAILED" || s === "ROLLED_BACK") return "red";
  if (s === "UPLOADED" || s === "MAPPED") return "orange";
  return "grey";
}

export function BatchDetailClient({
  batch,
  rows,
  logs,
}: {
  batch: MigrationBatch;
  rows: StagingRow[];
  logs: { id: string; step: string; message: string | null; created_at: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCommit, setShowCommit] = useState(false);
  const [includeWarnings, setIncludeWarnings] = useState(false);
  const [showMapping, setShowMapping] = useState(false);

  const entityType = batch.entity_type as EntityType;
  const fields = ENTITY_FIELDS[entityType];
  const mapping = batch.column_mapping ?? {};

  const filtered =
    filterStatus === "all"
      ? rows
      : rows.filter((r) => r.status === filterStatus);

  function doValidate() {
    setError(null);
    startTransition(async () => {
      const r = await validateBatch(batch.id);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function doCommit() {
    setError(null);
    startTransition(async () => {
      const r = await commitBatch(batch.id, includeWarnings);
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowCommit(false);
      router.refresh();
    });
  }

  function doDelete() {
    if (!confirm("Hapus batch ini? Tindakan tidak dapat dibatalkan.")) return;
    startTransition(async () => {
      const r = await deleteBatch(batch.id);
      if (r.error) setError(r.error);
      else router.push("/admin/migration");
    });
  }

  function saveMapping(newMapping: Record<string, string>) {
    startTransition(async () => {
      const r = await updateBatchMapping(batch.id, newMapping);
      if (r.error) setError(r.error);
      else setShowMapping(false);
    });
  }

  const canValidate = ["UPLOADED", "MAPPED"].includes(batch.status);
  const canCommit = batch.status === "VALIDATED";
  const canDelete = !["COMMITTED", "PARTIAL"].includes(batch.status);

  const headers = Object.keys(rows[0]?.raw_data ?? {});

  return (
    <div className="space-y-4">
      {/* ============ Summary + Actions ============ */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/migration"
              className="text-sm text-[#0A84FF] hover:underline"
            >
              ← Back
            </Link>
            <Badge tone="blue">{entityType}</Badge>
            <Badge tone={statusTone(batch.status)}>{batch.status}</Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => setShowMapping(true)}>
              Edit Mapping
            </Button>
            {canValidate && (
              <Button onClick={doValidate} disabled={pending}>
                {pending ? "Validating..." : "Validate"}
              </Button>
            )}
            {canCommit && (
              <Button onClick={() => setShowCommit(true)} disabled={pending}>
                Commit to Database
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={doDelete} disabled={pending}>
                Delete Batch
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Total" value={batch.row_count} />
          <Stat label="Valid" value={batch.valid_count} tone="green" />
          <Stat label="Warning" value={batch.warning_count} tone="orange" />
          <Stat label="Error" value={batch.error_count} tone="red" />
          <Stat
            label="Committed"
            value={batch.committed_count}
            tone="blue"
          />
        {/* Info jumlah duplikat */}
{batch.error_count > 0 && (
  <Stat
    label="Duplikat"
    value={
      rows.filter((r) =>
        r.errors?.some((e) => e.toLowerCase().includes("duplikat") || e.toLowerCase().includes("sudah ada"))
      ).length
    }
    tone="red"
  />
)}
        </div>

        {error && (
          <div className="mt-4 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* ============ Filter Tabs ============ */}
      <div className="flex gap-2 flex-wrap">
        {["all", "VALID", "WARNING", "ERROR", "COMMITTED", "PENDING"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`h-8 px-3 rounded-lg text-xs transition ${
                filterStatus === s
                  ? "bg-[#0A84FF] text-white"
                  : "bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]"
              }`}
            >
              {s === "all" ? "All" : s}
              <span className="ml-1.5 opacity-70">
                ({s === "all" ? rows.length : rows.filter((r) => r.status === s).length})
              </span>
            </button>
          )
        )}
      </div>

      {/* ============ Preview Table ============ */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="w-12">#</TH>
                {fields.slice(0, 8).map((f) => (
                  <TH key={f.key}>{f.label}</TH>
                ))}
                <TH>Status</TH>
                <TH>Issues</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <TR>
                  <TD
                    colSpan={fields.slice(0, 8).length + 3}
                    className="text-center text-[#6E6E73] py-8"
                  >
                    Tidak ada baris dengan status ini.
                  </TD>
                </TR>
              ) : (
                filtered.slice(0, 100).map((r) => {
                  const d = (r.mapped_data ?? r.raw_data) as Record<
                    string,
                    unknown
                  >;
                  return (
                    <TR key={r.id}>
                      <TD className="text-xs text-[#8E8E93]">
                        {r.row_index}
                      </TD>
                      {fields.slice(0, 8).map((f) => (
                        <TD
                          key={f.key}
                          className="text-xs whitespace-nowrap max-w-[160px] truncate"
                        >
                          {d[f.key] === undefined ||
                          d[f.key] === null ||
                          d[f.key] === ""
                            ? "—"
                            : String(d[f.key])}
                        </TD>
                      ))}
                      <TD>
                        <Badge tone={rowTone(r.status)}>{r.status}</Badge>
                      </TD>
                      <TD className="text-xs text-[#6E6E73] max-w-[240px]">
                        {r.errors?.length > 0 && (
                          <div className="text-[#FF3B30] truncate">
                            {r.errors.slice(0, 1).join(", ")}
                            {r.errors.length > 1 &&
                              ` +${r.errors.length - 1}`}
                          </div>
                        )}
                        {r.warnings?.length > 0 && (
                          <div className="text-[#FF9500] truncate">
                            {r.warnings.slice(0, 1).join(", ")}
                            {r.warnings.length > 1 &&
                              ` +${r.warnings.length - 1}`}
                          </div>
                        )}
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
        {filtered.length > 100 && (
          <div className="px-6 py-3 text-xs text-[#6E6E73] border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            Menampilkan 100 baris pertama dari {filtered.length} baris.
          </div>
        )}
      </div>

      {/* ============ Migration Log ============ */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-5">
        <div className="text-sm font-semibold mb-3">Migration Log</div>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-xs text-[#8E8E93] text-center py-4">
              Belum ada log.
            </div>
          ) : (
            logs.map((l) => (
              <div
                key={l.id}
                className="text-xs flex items-start gap-3 pb-2 border-b border-[#F2F2F4] dark:border-[#2C2C2E] last:border-0"
              >
                <span className="text-[#8E8E93] shrink-0 whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString("id-ID")}
                </span>
                <Badge tone="grey">{l.step}</Badge>
                <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {l.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============ Commit Modal ============ */}
      <Modal
        open={showCommit}
        onClose={() => setShowCommit(false)}
        title="Commit to Database"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCommit(false)}>
              Cancel
            </Button>
            <Button onClick={doCommit} disabled={pending}>
              {pending ? "Committing..." : "Commit Now"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-sm">
            Anda akan commit{" "}
            <strong>
              {includeWarnings
                ? batch.valid_count + batch.warning_count
                : batch.valid_count}
            </strong>{" "}
            baris ke tabel <strong>{entityType}</strong>.
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeWarnings}
              onChange={(e) => setIncludeWarnings(e.target.checked)}
            />
            Sertakan baris dengan warning ({batch.warning_count})
          </label>

          <div className="text-xs text-[#A15C00] bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg px-3 py-2 leading-relaxed">
            Data akan di-insert langsung ke tabel utama. Pastikan Anda sudah
            backup database. Proses ini tidak dapat di-undo lewat UI.
          </div>
        </div>
      </Modal>

      {/* ============ Mapping Modal ============ */}
      <Modal
        open={showMapping}
        onClose={() => setShowMapping(false)}
        title="Column Mapping"
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMapping(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMapping(mapping)}
              disabled={pending}
            >
              {pending ? "Saving..." : "Save Mapping"}
            </Button>
          </>
        }
      >
        <MappingEditor
          headers={headers}
          fields={fields}
          mapping={mapping}
          onChange={saveMapping}
        />
      </Modal>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "green" | "orange" | "red" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-[#34C759]"
      : tone === "orange"
        ? "text-[#FF9500]"
        : tone === "red"
          ? "text-[#FF3B30]"
          : tone === "blue"
            ? "text-[#0A84FF]"
            : "text-[#1D1D1F] dark:text-[#F5F5F7]";
  return (
    <div className="bg-[#F6F6F7] dark:bg-[#2C2C2E] rounded-lg px-3 py-2">
      <div className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>
        {value.toLocaleString("id-ID")}
      </div>
    </div>
  );
}

function MappingEditor({
  headers,
  fields,
  mapping,
  onChange,
}: {
  headers: string[];
  fields: { key: string; label: string; required?: boolean }[];
  mapping: Record<string, string>;
  onChange: (m: Record<string, string>) => void;
}) {
  const [local, setLocal] = useState<Record<string, string>>({ ...mapping });

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
        Cocokkan kolom dari file (kiri) dengan field database (kanan).
        Auto-match sudah dilakukan, Anda dapat menyesuaikan.
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {headers.map((h) => (
          <div
            key={h}
            className="grid grid-cols-2 gap-3 items-center border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg p-3"
          >
            <div className="text-sm font-mono truncate">{h}</div>
            <select
              value={local[h] ?? ""}
              onChange={(e) =>
                setLocal({ ...local, [h]: e.target.value })
              }
              className="h-9 px-3 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-sm"
            >
              <option value="">— Ignore this column —</option>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label} {f.required ? "*" : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
        <Button onClick={() => onChange(local)} className="w-full">
          Save Mapping
        </Button>
      </div>
    </div>
  );
}