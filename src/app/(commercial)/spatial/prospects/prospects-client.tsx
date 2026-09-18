"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ProspectModal } from "../_components/prospect-modal";
import { deleteProspect } from "@/features/spatial/actions";
import type { Prospect } from "@/features/spatial/types";

function statusTone(
  s: string
): "blue" | "green" | "orange" | "red" | "grey" {
  if (s === "QUALIFIED") return "blue";
  if (s === "CONTACTED") return "orange";
  if (s === "CONVERTED") return "green";
  if (s === "LOST") return "red";
  return "grey";
}

export function ProspectsClient({
  prospects,
  permissions,
}: {
  prospects: Prospect[];
  permissions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Prospect | null>(null);

  const canEdit = permissions.includes("SPATIAL_EDIT_PROSPECT");

  const filtered = prospects.filter((p) => {
    if (!q) return true;
    const lq = q.toLowerCase();
    return (
      p.name.toLowerCase().includes(lq) ||
      p.code.toLowerCase().includes(lq) ||
      (p.province ?? "").toLowerCase().includes(lq) ||
      (p.city ?? "").toLowerCase().includes(lq)
    );
  });

  function doDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteProspect(confirmDelete.id);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, code, city..."
              className="max-w-xs"
            />
            <Badge tone="grey">{filtered.length} total</Badge>
          </div>
          <div className="flex gap-2">
            <Link href="/spatial">
              <Button variant="secondary">← Back to Map</Button>
            </Link>
            {canEdit && (
              <Button onClick={() => setShowAdd(true)}>
                + New Prospect
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Name</TH>
              <TH>Type</TH>
              <TH>Location</TH>
              <TH>Est. Demand</TH>
              <TH>Score</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <TR>
                <TD
                  colSpan={8}
                  className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-10"
                >
                  {prospects.length === 0
                    ? "Belum ada prospect. Klik + New Prospect."
                    : "Tidak ada prospect yang cocok."}
                </TD>
              </TR>
            ) : (
              filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.code}</TD>
                  <TD className="font-medium">{p.name}</TD>
                  <TD>{p.type ?? "—"}</TD>
                  <TD className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                    {[p.city, p.province].filter(Boolean).join(", ") || "—"}
                  </TD>
                  <TD className="font-mono text-xs">
                    {Number(p.est_demand).toLocaleString("id-ID")}{" "}
                    {p.est_demand_uom}
                  </TD>
                  <TD>
                    <span
                      className={`font-mono text-xs font-medium ${
                        p.score >= 80
                          ? "text-[#34C759]"
                          : p.score >= 60
                            ? "text-[#FF9500]"
                            : "text-[#FF3B30]"
                      }`}
                    >
                      {Number(p.score).toFixed(0)}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {canEdit && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(p)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#FF3B30]"
                            onClick={() => setConfirmDelete(p)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>

      {/* Add Modal */}
      <ProspectModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />

      {/* Edit Modal */}
      {editing && (
        <ProspectModal
          open={!!editing}
          onClose={() => setEditing(null)}
          editing={editing}
        />
      )}

      {/* Delete Confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Prospect"
        width="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={doDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Yakin ingin menghapus{" "}
          <span className="font-semibold">{confirmDelete?.name}</span>?
          Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </>
  );
}