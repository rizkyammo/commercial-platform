"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  createProcurement,
  updateProcurement,
  submitProcurement,
  verifyProcurement,
  deleteProcurement,
} from "@/features/flow/actions";
import type { ProcurementInput } from "@/lib/validation/flow";
import type { ProcurementCoverage } from "@/features/flow/types";

// ============================ TYPES ============================

type Procurement = {
  id: string;
  procurement_number: string;
  vendor_id: string | null;
  vendor_po: string | null;
  vendor_invoice: string | null;
  reference_date: string | null;
  currency: string;
  exchange_rate: number;
  material_cost: number;
  status: string;
  remarks: string | null;
  created_at: string;
  vendors?: { name: string } | null;
};

type VendorOption = { id: string; code: string; name: string };
type ProductOption = { id: string; code: string; name: string; uom: string };

type OrderItemRef = {
  product_id: string;
  product_name: string;
  uom: string;
  qty: number;
};

type DraftItem = {
  _key: string;
  product_id: string;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
  currency: string;
  exchange_rate: number;
};

const empty: ProcurementInput = {
  vendor_id: "",
  vendor_po: "",
  vendor_invoice: "",
  reference_date: "",
  currency: "IDR",
  exchange_rate: 1,
  remarks: "",
  items: [],
};

// ============================ MAIN ============================

export function ProcurementTab({
  orderId,
  procurements,
  vendors,
  products,
  orderItems,
  coverage,
  permissions,
  canEdit,
}: {
  orderId: string;
  procurements: Procurement[];
  vendors: VendorOption[];
  products: ProductOption[];
  orderItems: OrderItemRef[];
  coverage: ProcurementCoverage;
  permissions: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProcurementInput>(empty);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canCreate = permissions.includes("PROCUREMENT_CREATE");
  const canVerify = permissions.includes("PROCUREMENT_VERIFY");

  // ---------- Coverage metrics (avg percentage) ----------
  const itemMetrics = coverage.items.map((i) => {
    const ordered = i.ordered || 0;
    const pctProcured = ordered > 0 ? Math.min(1, i.procured_all / ordered) : 0;
    const pctVerified =
      ordered > 0 ? Math.min(1, i.procured_verified / ordered) : 0;
    return {
      product_id: i.product_id,
      pctProcured,
      pctVerified,
    };
  });

  const avgProcured =
    itemMetrics.length > 0
      ? itemMetrics.reduce((a, m) => a + m.pctProcured, 0) / itemMetrics.length
      : 0;
  const avgVerified =
    itemMetrics.length > 0
      ? itemMetrics.reduce((a, m) => a + m.pctVerified, 0) / itemMetrics.length
      : 0;

  const pctProcuredDisplay = Math.round(avgProcured * 100);
  const pctVerifiedDisplay = Math.round(avgVerified * 100);
  // "in-flight" = sudah procure tapi belum verified
  const pctInFlightDisplay = Math.max(
    0,
    pctProcuredDisplay - pctVerifiedDisplay
  );

  const totalItems = coverage.items.length;
  const fullyVerifiedCount = coverage.items.filter(
    (i) => i.fully_verified
  ).length;

  // ---------- Actions ----------
  function openCreate() {
    setEditingId(null);
    const prefill: DraftItem[] = orderItems.map((it, idx) => ({
      _key: `pi-${Date.now()}-${idx}`,
      product_id: it.product_id,
      description: "",
      qty: 0,
      uom: it.uom,
      unit_price: 0,
      currency: "IDR",
      exchange_rate: 1,
    }));
    setForm(empty);
    setDraftItems(prefill);
    setError(null);
    setOpen(true);
  }

  function openEdit(p: Procurement) {
    setEditingId(p.id);
    setForm({
      vendor_id: p.vendor_id ?? "",
      vendor_po: p.vendor_po ?? "",
      vendor_invoice: p.vendor_invoice ?? "",
      reference_date: p.reference_date ?? "",
      currency: p.currency,
      exchange_rate: Number(p.exchange_rate),
      remarks: p.remarks ?? "",
      items: [],
    });
    setDraftItems([]);
    setError(null);
    setOpen(true);
  }

  function addItem() {
    if (products.length === 0) return;
    const f = products[0];
    setDraftItems((prev) => [
      ...prev,
      {
        _key: `pi-${Date.now()}-${prev.length}`,
        product_id: f.id,
        description: "",
        qty: 0,
        uom: f.uom,
        unit_price: 0,
        currency: form.currency,
        exchange_rate: form.exchange_rate,
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setDraftItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, ...patch } : it))
    );
  }

  function removeItem(key: string) {
    setDraftItems((prev) => prev.filter((it) => it._key !== key));
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        items: draftItems.map(({ _key, ...rest }) => rest),
      };
      const result = editingId
        ? await updateProcurement(editingId, payload)
        : await createProcurement(orderId, payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function doAction(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  const totalCost = draftItems.reduce((acc, it) => {
    const price =
      it.currency === "IDR" ? it.unit_price : it.unit_price * it.exchange_rate;
    return acc + it.qty * price;
  }, 0);

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Procurement</h2>
          <p className="text-sm text-[#6E6E73]">
            Anda dapat submit per vendor. Shipment terkunci sampai semua item
            ter-verify.
          </p>
        </div>
        {canCreate && canEdit && (
          <Button onClick={openCreate}>+ New Procurement</Button>
        )}
        {!canEdit && (
          <div className="text-xs text-[#8E8E93] bg-[#F2F2F4] rounded-lg px-3 py-1.5 max-w-md">
            Procurement hanya dapat dibuat setelah order di-issue.
          </div>
        )}
      </div>

      {/* COVERAGE BOARD */}
      {totalItems > 0 && (
        <div className="mb-4 bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
          {/* Top summary */}
          <div className="px-5 py-4 border-b border-[#E5E5EA]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <div className="font-medium">Coverage Progress</div>
                <Badge tone="grey">
                  {fullyVerifiedCount} / {totalItems} items verified
                </Badge>
              </div>
              {coverage.all_verified ? (
                <Badge tone="green">
                  ✓ Siap shipment — semua item ter-verify
                </Badge>
              ) : coverage.all_covered ? (
                <Badge tone="blue">Menunggu verifikasi supervisor</Badge>
              ) : (
                <Badge tone="orange">
                  Menunggu vendor lain melengkapi
                </Badge>
              )}
            </div>

            {/* Progress percentages */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <span className="text-[#6E6E73]">Procured:</span>
              <span className="font-medium">{pctProcuredDisplay}%</span>
              <span className="text-[#6E6E73]">·</span>
              <span className="text-[#6E6E73]">Verified:</span>
              <span
                className={`font-medium ${
                  pctVerifiedDisplay === 100
                    ? "text-[#34C759]"
                    : "text-[#0A84FF]"
                }`}
              >
                {pctVerifiedDisplay}%
              </span>
            </div>

            {/* Progress bar — stacked */}
            <div className="mt-2">
              <div className="w-full h-2.5 bg-[#F2F2F4] rounded-full overflow-hidden flex">
                <div
                  className="bg-[#34C759] transition-all duration-300"
                  style={{ width: `${pctVerifiedDisplay}%` }}
                  title={`Verified ${pctVerifiedDisplay}%`}
                />
                <div
                  className="bg-[#0A84FF] transition-all duration-300"
                  style={{ width: `${pctInFlightDisplay}%` }}
                  title={`Procured (menunggu verify) ${pctInFlightDisplay}%`}
                />
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-[#6E6E73]">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                  Verified ({pctVerifiedDisplay}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0A84FF]" />
                  Procured — belum verify ({pctInFlightDisplay}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E5E5EA]" />
                  Belum ({100 - pctProcuredDisplay}%)
                </span>
              </div>
            </div>
          </div>

          {/* Detail per product + vendor breakdown */}
          <div className="divide-y divide-[#E5E5EA]">
            {coverage.items.map((item) => {
              const ordered = item.ordered || 0;
              const pctProcured =
                ordered > 0
                  ? Math.min(100, (item.procured_all / ordered) * 100)
                  : 0;
              const pctVerified =
                ordered > 0
                  ? Math.min(100, (item.procured_verified / ordered) * 100)
                  : 0;
              const pctInFlight = Math.max(0, pctProcured - pctVerified);

              return (
                <div key={item.product_id} className="px-5 py-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.fully_verified
                            ? "bg-[#34C759]"
                            : item.fully_procured
                              ? "bg-[#0A84FF]"
                              : pctProcured > 0
                                ? "bg-[#FF9500]"
                                : "bg-[#E5E5EA]"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.product_name}
                        </div>
                        <div className="text-xs text-[#8E8E93] font-mono">
                          {item.product_code}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right text-xs">
                        <div className="text-[#6E6E73]">Ordered</div>
                        <div className="font-mono font-medium">
                          {item.ordered.toLocaleString("id-ID")} {item.uom}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-[#6E6E73]">Procured</div>
                        <div
                          className={`font-mono font-medium ${
                            item.fully_procured
                              ? "text-[#34C759]"
                              : item.procured_all > 0
                                ? "text-[#0A84FF]"
                                : "text-[#8E8E93]"
                          }`}
                        >
                          {item.procured_all.toLocaleString("id-ID")} {item.uom}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-[#6E6E73]">Verified</div>
                        <div
                          className={`font-mono font-medium ${
                            item.fully_verified
                              ? "text-[#34C759]"
                              : item.procured_verified > 0
                                ? "text-[#0A84FF]"
                                : "text-[#8E8E93]"
                          }`}
                        >
                          {item.procured_verified.toLocaleString("id-ID")}{" "}
                          {item.uom}
                        </div>
                      </div>
                      {item.fully_verified ? (
                        <Badge tone="green">OK</Badge>
                      ) : item.fully_procured ? (
                        <Badge tone="blue">Verifying</Badge>
                      ) : pctProcured > 0 ? (
                        <Badge tone="orange">
                          {Math.round(pctProcured)}%
                        </Badge>
                      ) : (
                        <Badge tone="grey">Pending</Badge>
                      )}
                    </div>
                  </div>

                  {/* Mini progress bar per item */}
                  <div className="mt-3 w-full h-1.5 bg-[#F2F2F4] rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#34C759] transition-all"
                      style={{ width: `${pctVerified}%` }}
                    />
                    <div
                      className="bg-[#0A84FF] transition-all"
                      style={{ width: `${pctInFlight}%` }}
                    />
                  </div>

                  {/* Vendor breakdown */}
                  {item.contributions.length > 0 && (
                    <div className="mt-3 pl-6 space-y-1">
                      {item.contributions.map((c, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-l-2 border-[#E5E5EA] pl-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[#8E8E93]">
                              {c.procurement_number}
                            </span>
                            <span className="truncate">{c.vendor_name}</span>
                            <Badge
                              tone={
                                c.status === "VERIFIED"
                                  ? "green"
                                  : c.status === "SUBMITTED"
                                    ? "blue"
                                    : "grey"
                              }
                            >
                              {c.status}
                            </Badge>
                          </div>
                          <span className="font-mono">
                            {c.qty.toLocaleString("id-ID")} {item.uom}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.contributions.length === 0 && (
                    <div className="mt-2 text-xs text-[#8E8E93] pl-6">
                      Belum ada procurement untuk material ini.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* LIST PROCUREMENTS */}
      {procurements.length === 0 ? (
        <div className="text-sm text-[#6E6E73] text-center py-10 bg-white border border-[#E5E5EA] rounded-xl">
          {!canEdit
            ? "Procurement hanya dapat dibuat setelah order di-issue."
            : !canCreate
              ? "Anda tidak memiliki izin untuk membuat procurement."
              : "Belum ada procurement. Klik + New Procurement."}
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>No. Procurement</TH>
                <TH>Vendor</TH>
                <TH>Vendor PO</TH>
                <TH>Cost</TH>
                <TH>Status</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {procurements.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.procurement_number}</TD>
                  <TD>{p.vendors?.name ?? "—"}</TD>
                  <TD className="text-xs">{p.vendor_po ?? "—"}</TD>
                  <TD className="font-mono text-xs">
                    {p.currency}{" "}
                    {Number(p.material_cost).toLocaleString("id-ID")}
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        p.status === "VERIFIED"
                          ? "green"
                          : p.status === "SUBMITTED"
                            ? "blue"
                            : "grey"
                      }
                    >
                      {p.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {p.status === "DRAFT" && canCreate && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              doAction(() => submitProcurement(p.id))
                            }
                            disabled={pending}
                          >
                            Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#FF3B30]"
                            onClick={() =>
                              doAction(() => deleteProcurement(p.id))
                            }
                            disabled={pending}
                          >
                            Del
                          </Button>
                        </>
                      )}
                      {p.status === "SUBMITTED" && canVerify && (
                        <Button
                          size="sm"
                          onClick={() =>
                            doAction(() => verifyProcurement(p.id))
                          }
                          disabled={pending}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {/* FORM MODAL */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Procurement" : "New Procurement"}
        width="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="proc-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Draft"}
            </Button>
          </>
        }
      >
        <form id="proc-form" onSubmit={submitForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Vendor">
              <Select
                value={form.vendor_id ?? ""}
                onChange={(e) =>
                  setForm({ ...form, vendor_id: e.target.value })
                }
              >
                <option value="">— Select —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Vendor PO">
              <Input
                value={form.vendor_po ?? ""}
                onChange={(e) =>
                  setForm({ ...form, vendor_po: e.target.value })
                }
              />
            </FormField>
            <FormField label="Vendor Invoice">
              <Input
                value={form.vendor_invoice ?? ""}
                onChange={(e) =>
                  setForm({ ...form, vendor_invoice: e.target.value })
                }
              />
            </FormField>
            <FormField label="Reference Date">
              <Input
                type="date"
                value={form.reference_date ?? ""}
                onChange={(e) =>
                  setForm({ ...form, reference_date: e.target.value })
                }
              />
            </FormField>
            <FormField label="Currency">
              <Select
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value })
                }
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </Select>
            </FormField>
            <FormField label="Exchange Rate">
              <Input
                type="number"
                step="0.000001"
                value={form.exchange_rate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    exchange_rate: Number(e.target.value) || 1,
                  })
                }
                disabled={form.currency === "IDR"}
              />
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Items</span>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={addItem}
              >
                + Add
              </Button>
            </div>
            {draftItems.length === 0 ? (
              <div className="text-sm text-[#6E6E73] text-center py-6 border border-dashed border-[#E5E5EA] rounded-lg">
                Belum ada item.
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Product</TH>
                    <TH>Qty</TH>
                    <TH>UOM</TH>
                    <TH>Unit Price</TH>
                    <TH className="text-right">Line</TH>
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {draftItems.map((it) => {
                    const price =
                      it.currency === "IDR"
                        ? it.unit_price
                        : it.unit_price * it.exchange_rate;
                    return (
                      <TR key={it._key}>
                        <TD>
                          <Select
                            value={it.product_id}
                            onChange={(e) => {
                              const p = products.find(
                                (x) => x.id === e.target.value
                              );
                              updateItem(it._key, {
                                product_id: e.target.value,
                                uom: p?.uom ?? it.uom,
                              });
                            }}
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </Select>
                        </TD>
                        <TD>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.qty}
                            onChange={(e) =>
                              updateItem(it._key, {
                                qty: Number(e.target.value),
                              })
                            }
                            className="w-24"
                          />
                        </TD>
                        <TD>
                          <Input
                            value={it.uom}
                            onChange={(e) =>
                              updateItem(it._key, { uom: e.target.value })
                            }
                            className="w-16"
                          />
                        </TD>
                        <TD>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.unit_price}
                            onChange={(e) =>
                              updateItem(it._key, {
                                unit_price: Number(e.target.value),
                              })
                            }
                            className="w-32"
                          />
                        </TD>
                        <TD className="text-right font-mono text-xs">
                          {(it.qty * price).toLocaleString("id-ID")}
                        </TD>
                        <TD className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => removeItem(it._key)}
                            className="text-[#FF3B30]"
                          >
                            ×
                          </Button>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
            <div className="mt-2 text-right text-sm text-[#6E6E73]">
              Total:{" "}
              <span className="font-medium text-[#1D1D1F]">
                {form.currency} {totalCost.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <FormField label="Remarks">
            <Textarea
              rows={2}
              value={form.remarks ?? ""}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </FormField>

          {error && (
            <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}