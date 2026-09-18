"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  submitSk,
  activateSk,
  upsertQuotaLine,
  deleteQuotaLine,
  createSkAmendment,
} from "@/features/compliance/actions";

// ============================ TYPES ============================

type Sk = {
  id: string;
  sk_number: string;
  issuing_authority: string;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  status: string;
  scope: string | null;
  document_ref: string | null;
  notes: string | null;
  activated_at: string | null;
  supersedes_id: string | null;
  superseded_by_id: string | null;
  created_at: string;
  updated_at: string;
};

type Line = {
  id: string;
  product_id: string;
  allocation_qty: number;
  uom: string;
  realized_qty: number;
  committed_qty: number;
  available_qty: number;
  utilization_pct: number;
  products?: { id: string; name: string; code: string; uom: string } | null;
};

type ProductOption = { id: string; code: string; name: string; uom: string };

type LineForm = {
  product_id: string;
  allocation_qty: number;
  uom: string;
  notes: string;
};

// ============================ MAIN ============================

export function SkDetail({
  sk,
  lines,
  products,
  supersedesInfo,
  supersededByInfo,
}: {
  sk: Sk;
  lines: Line[];
  products: ProductOption[];
  supersedesInfo?: { id: string; sk_number: string } | null;
  supersededByInfo?: { id: string; sk_number: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Line form
  const [showLineForm, setShowLineForm] = useState(false);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [lineForm, setLineForm] = useState<LineForm>({
    product_id: "",
    allocation_qty: 0,
    uom: "MT",
    notes: "",
  });

  // Amendment form
  const [showAmend, setShowAmend] = useState(false);
  const [newSkNumber, setNewSkNumber] = useState("");

  // ---------- Status gates ----------
  const canEdit = ["DRAFT", "UNDER_REVIEW"].includes(sk.status);
  const canSubmit = sk.status === "DRAFT";
  const canActivate = ["UNDER_REVIEW", "APPROVED"].includes(sk.status);
  const canAmend = ["ACTIVE", "SUPERSEDED", "EXPIRED"].includes(sk.status);

  // ---------- Actions ----------
  function doAction(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function openAdd() {
    if (products.length === 0) {
      setError("Belum ada produk. Tambahkan produk dulu di Master Data.");
      return;
    }
    setEditingLine(null);
    setLineForm({
      product_id: products[0].id,
      allocation_qty: 0,
      uom: products[0].uom ?? "MT",
      notes: "",
    });
    setError(null);
    setShowLineForm(true);
  }

  function openEdit(l: Line) {
    setEditingLine(l);
    setLineForm({
      product_id: l.product_id,
      allocation_qty: Number(l.allocation_qty),
      uom: l.uom,
      notes: "",
    });
    setError(null);
    setShowLineForm(true);
  }

  function submitLine(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await upsertQuotaLine(sk.id, lineForm);
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowLineForm(false);
      router.refresh();
    });
  }

  function submitAmend() {
    setError(null);
    startTransition(async () => {
      const r = await createSkAmendment(sk.id, newSkNumber);
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowAmend(false);
      router.push(`/compliance/sk/${r.data.id}`);
    });
  }

  // ---------- Derived ----------
  const totalAllocation = lines.reduce((a, l) => a + l.allocation_qty, 0);
  const totalRealized = lines.reduce((a, l) => a + l.realized_qty, 0);
  const totalCommitted = lines.reduce((a, l) => a + l.committed_qty, 0);
  const totalAvailable = lines.reduce((a, l) => a + l.available_qty, 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <Link
          href="/compliance"
          className="text-sm text-[#6E6E73] hover:text-[#1D1D1F]"
        >
          ← Compliance
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold">{sk.sk_number}</h1>
              <Badge tone={skTone(sk.status)}>{sk.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-[#6E6E73]">
              {sk.issuing_authority}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canSubmit && (
              <Button
                variant="secondary"
                onClick={() => doAction(() => submitSk(sk.id))}
                disabled={pending}
              >
                Submit for Review
              </Button>
            )}
            {canActivate && (
              <Button
                onClick={() => doAction(() => activateSk(sk.id))}
                disabled={pending}
              >
                {pending ? "Activating..." : "Activate SK"}
              </Button>
            )}
            {canAmend && (
              <Button
                variant="secondary"
                onClick={() => {
                  setNewSkNumber(`${sk.sk_number}-AMD`);
                  setError(null);
                  setShowAmend(true);
                }}
                disabled={pending}
              >
                Amend SK
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SUPERSEDE INFO */}
      {supersedesInfo && (
        <div className="text-sm bg-[#EAF2FB] border border-[#0A84FF]/30 text-[#0A84FF] rounded-lg px-4 py-3">
          SK ini menggantikan{" "}
          <Link
            href={`/compliance/sk/${supersedesInfo.id}`}
            className="font-medium underline"
          >
            {supersedesInfo.sk_number}
          </Link>
        </div>
      )}

      {supersededByInfo && (
        <div className="text-sm bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#A15C00] rounded-lg px-4 py-3">
          SK ini telah digantikan oleh{" "}
          <Link
            href={`/compliance/sk/${supersededByInfo.id}`}
            className="font-medium underline"
          >
            {supersededByInfo.sk_number}
          </Link>
        </div>
      )}

      {error && (
        <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* DETAILS */}
          <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-4">
              Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Info label="Issue Date" value={sk.issue_date} />
              <Info label="Effective Date" value={sk.effective_date} />
              <Info label="Expiry Date" value={sk.expiry_date} />
              <Info label="Document Ref" value={sk.document_ref} />
              <div className="sm:col-span-2">
                <Info label="Scope" value={sk.scope} />
              </div>
              {sk.notes && (
                <div className="sm:col-span-2">
                  <Info label="Notes" value={sk.notes} />
                </div>
              )}
            </dl>
          </div>

          {/* QUOTA BY MATERIAL */}
          <div className="bg-white border border-[#E5E5EA] rounded-xl">
            <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Quota by Material</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  {lines.length} material{lines.length === 1 ? "" : "s"}
                </p>
              </div>
              {canEdit && (
                <Button size="sm" variant="secondary" onClick={openAdd}>
                  + Add Material
                </Button>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="p-6 text-sm text-[#6E6E73] text-center">
                {canEdit
                  ? "Belum ada material dialokasikan. Klik + Add Material."
                  : "Belum ada material yang dialokasikan."}
              </div>
            ) : (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>Material</TH>
                      <TH>UOM</TH>
                      <TH className="text-right">Allocation</TH>
                      <TH className="text-right">Realized</TH>
                      <TH className="text-right">Committed</TH>
                      <TH className="text-right">Available</TH>
                      <TH>Utilization</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {lines.map((l) => (
                      <TR key={l.id}>
                        <TD>
                          <div className="font-medium">
                            {l.products?.name ?? "—"}
                          </div>
                          <div className="text-xs text-[#8E8E93] font-mono">
                            {l.products?.code ?? ""}
                          </div>
                        </TD>
                        <TD>{l.uom}</TD>
                        <TD className="text-right font-mono text-xs">
                          {Number(l.allocation_qty).toLocaleString("id-ID")}
                        </TD>
                        <TD className="text-right font-mono text-xs text-[#34C759]">
                          {Number(l.realized_qty).toLocaleString("id-ID")}
                        </TD>
                        <TD className="text-right font-mono text-xs text-[#0A84FF]">
                          {Number(l.committed_qty).toLocaleString("id-ID")}
                        </TD>
                        <TD className="text-right font-mono text-xs">
                          {Number(l.available_qty).toLocaleString("id-ID")}
                        </TD>
                        <TD>
                          <UtilBar pct={l.utilization_pct} />
                        </TD>
                        <TD className="text-right">
                          {canEdit && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(l)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[#FF3B30]"
                                onClick={() =>
                                  doAction(() => deleteQuotaLine(l.id, sk.id))
                                }
                                disabled={pending}
                              >
                                ×
                              </Button>
                            </div>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>

                {/* Totals footer */}
                <div className="px-6 py-3 border-t border-[#E5E5EA] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <TotalItem
                    label="Total Allocation"
                    value={formatNum(totalAllocation)}
                  />
                  <TotalItem
                    label="Total Realized"
                    value={formatNum(totalRealized)}
                    tone="green"
                  />
                  <TotalItem
                    label="Total Committed"
                    value={formatNum(totalCommitted)}
                    tone="blue"
                  />
                  <TotalItem
                    label="Total Available"
                    value={formatNum(totalAvailable)}
                  />
                </div>
                <div className="px-6 pb-3 text-[11px] text-[#8E8E93] text-right">
                  * Numbers shown per unit; totals include mixed UOM.
                </div>
              </>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <div className="bg-white border border-[#E5E5EA] rounded-xl p-6 h-fit">
            <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-4">
              Metadata
            </h2>
            <dl className="space-y-3 text-sm">
              <Info label="Status" value={sk.status} />
              <Info
                label="Activated"
                value={
                  sk.activated_at
                    ? new Date(sk.activated_at).toLocaleString("id-ID")
                    : "—"
                }
              />
              <Info
                label="Created"
                value={new Date(sk.created_at).toLocaleString("id-ID")}
              />
              <Info
                label="Updated"
                value={new Date(sk.updated_at).toLocaleString("id-ID")}
              />
            </dl>
          </div>
        </aside>
      </div>

      {/* LINE FORM MODAL */}
      <Modal
        open={showLineForm}
        onClose={() => setShowLineForm(false)}
        title={editingLine ? "Edit Quota Line" : "Add Quota Line"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLineForm(false)}>
              Cancel
            </Button>
            <Button form="line-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <form id="line-form" onSubmit={submitLine} className="space-y-4">
          <FormField label="Product" required>
            <Select
              value={lineForm.product_id}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value);
                setLineForm({
                  ...lineForm,
                  product_id: e.target.value,
                  uom: p?.uom ?? lineForm.uom,
                });
              }}
              disabled={!!editingLine}
            >
              <option value="">— Select —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Allocation Qty" required>
            <Input
              type="number"
              step="0.01"
              value={lineForm.allocation_qty}
              onChange={(e) =>
                setLineForm({
                  ...lineForm,
                  allocation_qty: Number(e.target.value) || 0,
                })
              }
              required
            />
          </FormField>
          <FormField label="UOM">
            <Input
              value={lineForm.uom}
              onChange={(e) =>
                setLineForm({ ...lineForm, uom: e.target.value })
              }
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              rows={2}
              value={lineForm.notes}
              onChange={(e) =>
                setLineForm({ ...lineForm, notes: e.target.value })
              }
            />
          </FormField>
          <p className="text-xs text-[#8E8E73]">
            {editingLine
              ? "Perubahan allocation akan dicatat sebagai ADJUSTMENT di ledger."
              : "Penambahan material baru akan otomatis membuat entry ALLOCATION di ledger."}
          </p>
        </form>
      </Modal>

      {/* AMEND MODAL */}
      <Modal
        open={showAmend}
        onClose={() => setShowAmend(false)}
        title="Amend SK"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAmend(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitAmend}
              disabled={pending || newSkNumber.trim().length < 3}
            >
              {pending ? "Creating..." : "Create Amendment"}
            </Button>
          </>
        }
      >
        <FormField label="Nomor SK Baru" required>
          <Input
            value={newSkNumber}
            onChange={(e) => setNewSkNumber(e.target.value.toUpperCase())}
            placeholder={`${sk.sk_number}-AMD`}
            required
          />
        </FormField>
        <div className="mt-3 text-xs text-[#8E8E73] space-y-1">
          <p>
            SK baru akan dibuat dalam status <strong>DRAFT</strong> dengan
            seluruh quota line disalin dari SK ini.
          </p>
          <p>
            Ubah allocation, expiry, atau material, lalu submit & activate.
            SK lama akan otomatis menjadi <strong>SUPERSEDED</strong> saat SK
            baru diaktifkan.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ============================ SUB-COMPONENTS ============================

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[#6E6E73] text-xs uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1">{value || "—"}</dd>
    </div>
  );
}

function TotalItem({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-[#34C759]"
      : tone === "blue"
        ? "text-[#0A84FF]"
        : "text-[#1D1D1F]";
  return (
    <div>
      <div className="text-[#6E6E73] text-[10px] uppercase tracking-wide">
        {label}
      </div>
      <div className={`font-mono text-sm mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const color =
    pct >= 100
      ? "bg-[#FF3B30]"
      : pct >= 90
        ? "bg-[#FF9500]"
        : pct >= 80
          ? "bg-[#FFCC00]"
          : "bg-[#34C759]";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-[#F2F2F4] rounded-full overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-xs font-medium w-9 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function skTone(
  s: string
): "green" | "blue" | "grey" | "red" | "orange" {
  if (s === "ACTIVE") return "green";
  if (s === "UNDER_REVIEW" || s === "APPROVED") return "blue";
  if (s === "EXPIRED" || s === "REVOKED") return "red";
  if (s === "SUPERSEDED" || s === "EXHAUSTED") return "orange";
  return "grey";
}

function formatNum(n: number) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}