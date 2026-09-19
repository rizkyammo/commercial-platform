"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { UploadWizard } from "./upload-wizard";
import type { MigrationBatch } from "@/features/migration/types";

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

function fmtBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function MigrationClient({
  batches,
  permissions,
}: {
  batches: MigrationBatch[];
  permissions: string[];
}) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const canImport = permissions.includes("USER_MANAGE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#6E6E73]">
          {batches.length} batch total
        </div>
        {canImport && (
          <Button onClick={() => setShowWizard(true)}>+ New Import</Button>
        )}
      </div>

      {!canImport && (
        <div className="text-sm text-[#A15C00] bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-xl px-4 py-3">
          Hanya System Admin yang dapat melakukan import data.
        </div>
      )}

      {showWizard && (
        <UploadWizard
          onClose={() => {
            setShowWizard(false);
            router.refresh();
          }}
        />
      )}

      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Batch</TH>
                <TH>Entity</TH>
                <TH>File</TH>
                <TH className="text-right">Rows</TH>
                <TH className="text-right">Valid</TH>
                <TH className="text-right">Warn</TH>
                <TH className="text-right">Error</TH>
                <TH>Status</TH>
                <TH>Uploaded</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {batches.length === 0 ? (
                <TR>
                  <TD
                    colSpan={10}
                    className="text-center text-[#6E6E73] py-10"
                  >
                    Belum ada import. Klik + New Import untuk mulai.
                  </TD>
                </TR>
              ) : (
                batches.map((b) => (
                  <TR key={b.id}>
                    <TD className="font-medium">{b.name}</TD>
                    <TD>
                      <Badge tone="grey">{b.entity_type}</Badge>
                    </TD>
                    <TD className="text-xs text-[#6E6E73]">
                      {b.file_name ?? "—"}
                      <div className="text-[10px] text-[#8E8E93]">
                        {fmtBytes(b.file_size)}
                      </div>
                    </TD>
                    <TD className="text-right font-mono text-xs">
                      {b.row_count.toLocaleString("id-ID")}
                    </TD>
                    <TD className="text-right font-mono text-xs text-[#34C759]">
                      {b.valid_count.toLocaleString("id-ID")}
                    </TD>
                    <TD className="text-right font-mono text-xs text-[#FF9500]">
                      {b.warning_count.toLocaleString("id-ID")}
                    </TD>
                    <TD className="text-right font-mono text-xs text-[#FF3B30]">
                      {b.error_count.toLocaleString("id-ID")}
                    </TD>
                    <TD>
                      <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                    </TD>
                    <TD className="text-xs text-[#6E6E73] whitespace-nowrap">
                      {new Date(b.uploaded_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/admin/migration/${b.id}`}
                        className="text-[#0A84FF] text-sm hover:underline whitespace-nowrap"
                      >
                        Open →
                      </Link>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </div>
    </div>
  );
}