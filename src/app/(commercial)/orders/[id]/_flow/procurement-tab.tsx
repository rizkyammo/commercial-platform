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

export function ProcurementTab({
  orderId,
  procurements,
  vendors,
  products,
  permissions,
  canEdit,
}: {
  orderId: string;
  procurements: Procurement[];
  vendors: VendorOption[];
  products: ProductOption[];
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

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setDraftItems([]);
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
    // Load items async
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
    setDraftItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));
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
    const price = it.currency === "IDR" ? it.unit_price : it.unit_price * it.exchange_rate;
    return acc + it.qty * price;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Procurement</h2>
          <p className="text-sm text-[#6E6E73]">Catat direct cost material.</p>
        </div>
        {canCreate && canEdit && (
          <Button onClick={openCreate}>+ New Procurement</Button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {procurements.length === 0 ? (
        <div className="text-sm text-[#6E6E73] text-center py-10 bg-white border border-[#E5E5EA] rounded-xl">
          Belum ada procurement.
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
                    {p.currency} {Number(p.material_cost).toLocaleString("id-ID")}
                  </TD>
                  <TD>
                    <Badge tone={p.status === "VERIFIED" ? "green" : p.status === "SUBMITTED" ? "blue" : "grey"}>
                      {p.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {p.status === "DRAFT" && canCreate && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                          <Button size="sm" variant="secondary" onClick={() => doAction(() => submitProcurement(p.id))} disabled={pending}>
                            Submit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-[#FF3B30]" onClick={() => doAction(() => deleteProcurement(p.id))} disabled={pending}>
                            Del
                          </Button>
                        </>
                      )}
                      {p.status === "SUBMITTED" && canVerify && (
                        <Button size="sm" onClick={() => doAction(() => verifyProcurement(p.id))} disabled={pending}>
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Procurement" : "New Procurement"}
        width="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="proc-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Draft"}
            </Button>
          </>
        }
      >
        <form id="proc-form" onSubmit={submitForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Vendor">
              <Select value={form.vendor_id ?? ""} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
                <option value="">— Select —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Vendor PO">
              <Input value={form.vendor_po ?? ""} onChange={(e) => setForm({ ...form, vendor_po: e.target.value })} />
            </FormField>
            <FormField label="Vendor Invoice">
              <Input value={form.vendor_invoice ?? ""} onChange={(e) => setForm({ ...form, vendor_invoice: e.target.value })} />
            </FormField>
            <FormField label="Reference Date">
              <Input type="date" value={form.reference_date ?? ""} onChange={(e) => setForm({ ...form, reference_date: e.target.value })} />
            </FormField>
            <FormField label="Currency">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </Select>
            </FormField>
            <FormField label="Exchange Rate">
              <Input type="number" step="0.000001" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: Number(e.target.value) || 1 })} disabled={form.currency === "IDR"} />
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Items</span>
              <Button size="sm" variant="secondary" type="button" onClick={addItem}>+ Add</Button>
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
                    const price = it.currency === "IDR" ? it.unit_price : it.unit_price * it.exchange_rate;
                    return (
                      <TR key={it._key}>
                        <TD>
                          <Select value={it.product_id} onChange={(e) => {
                            const p = products.find((x) => x.id === e.target.value);
                            updateItem(it._key, { product_id: e.target.value, uom: p?.uom ?? it.uom });
                          }}>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </Select>
                        </TD>
                        <TD><Input type="number" step="0.01" value={it.qty} onChange={(e) => updateItem(it._key, { qty: Number(e.target.value) })} className="w-24" /></TD>
                        <TD><Input value={it.uom} onChange={(e) => updateItem(it._key, { uom: e.target.value })} className="w-16" /></TD>
                        <TD><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(it._key, { unit_price: Number(e.target.value) })} className="w-32" /></TD>
                        <TD className="text-right font-mono text-xs">{(it.qty * price).toLocaleString("id-ID")}</TD>
                        <TD className="text-right"><Button size="sm" variant="ghost" type="button" onClick={() => removeItem(it._key)} className="text-[#FF3B30]">×</Button></TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
            <div className="mt-2 text-right text-sm text-[#6E6E73]">
              Total: <span className="font-medium text-[#1D1D1F]">{form.currency} {totalCost.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <FormField label="Remarks">
            <Textarea rows={2} value={form.remarks ?? ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
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