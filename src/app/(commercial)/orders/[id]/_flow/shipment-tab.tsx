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
import { createShipment, updateShipment, confirmShipment, deleteShipment } from "@/features/flow/actions";
import type { ShipmentInput } from "@/lib/validation/flow";

type Shipment = {
  id: string;
  shipment_number: string;
  shipment_date: string | null;
  transporter_id: string | null;
  vehicle_ref: string | null;
  origin: string | null;
  destination: string | null;
  delivery_ref: string | null;
  status: string;
  remarks: string | null;
  transporters?: { name: string } | null;
};

type TransporterOption = { id: string; code: string; name: string; plate_number: string | null };
type ProductOption = { id: string; code: string; name: string; uom: string };

type DraftItem = {
  _key: string;
  product_id: string;
  description: string;
  qty: number;
  uom: string;
};

const empty: ShipmentInput = {
  shipment_date: "",
  transporter_id: "",
  vehicle_ref: "",
  origin: "",
  destination: "",
  delivery_ref: "",
  remarks: "",
  items: [],
};

export function ShipmentTab({
  orderId,
  shipments,
  transporters,
  products,
  orderItems,
  permissions,
  canEdit,
}: {
  orderId: string;
  shipments: Shipment[];
  transporters: TransporterOption[];
  products: ProductOption[];
  orderItems: { product_id: string; qty: number; uom: string }[];
  permissions: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShipmentInput>(empty);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canCreate = permissions.includes("SHIPMENT_CREATE");
  const canConfirm = permissions.includes("SHIPMENT_CONFIRM");

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setDraftItems(
      orderItems.map((it, idx) => ({
        _key: `si-${Date.now()}-${idx}`,
        product_id: it.product_id,
        description: "",
        qty: it.qty,
        uom: it.uom,
      }))
    );
    setError(null);
    setOpen(true);
  }

  function addItem() {
    if (products.length === 0) return;
    const f = products[0];
    setDraftItems((prev) => [
      ...prev,
      {
        _key: `si-${Date.now()}-${prev.length}`,
        product_id: f.id,
        description: "",
        qty: 0,
        uom: f.uom,
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
        ? await updateShipment(editingId, payload)
        : await createShipment(orderId, payload);
      if (result.error) { setError(result.error); return; }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Shipment</h2>
          <p className="text-sm text-[#6E6E73]">Catat pengiriman ke lokasi customer.</p>
        </div>
        {canCreate && canEdit && (
          <Button onClick={openCreate}>+ New Shipment</Button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="text-sm text-[#6E6E73] text-center py-10 bg-white border border-[#E5E5EA] rounded-xl">
          Belum ada shipment.
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>No. Shipment</TH>
                <TH>Date</TH>
                <TH>Transporter</TH>
                <TH>Route</TH>
                <TH>Status</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {shipments.map((s) => (
                <TR key={s.id}>
                  <TD className="font-mono text-xs">{s.shipment_number}</TD>
                  <TD>{s.shipment_date ?? "—"}</TD>
                  <TD>{s.transporters?.name ?? "—"}</TD>
                  <TD className="text-xs">
                    {s.origin ?? "—"} → {s.destination ?? "—"}
                  </TD>
                  <TD>
                    <Badge tone={s.status === "CONFIRMED" ? "green" : "grey"}>
                      {s.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {s.status === "DRAFT" && canCreate && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(s.id); setForm({
                            shipment_date: s.shipment_date ?? "",
                            transporter_id: s.transporter_id ?? "",
                            vehicle_ref: s.vehicle_ref ?? "",
                            origin: s.origin ?? "",
                            destination: s.destination ?? "",
                            delivery_ref: s.delivery_ref ?? "",
                            remarks: s.remarks ?? "",
                            items: [],
                          }); setDraftItems([]); setOpen(true); }}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-[#FF3B30]" onClick={() => doAction(() => deleteShipment(s.id))} disabled={pending}>Del</Button>
                        </>
                      )}
                      {s.status === "DRAFT" && canConfirm && (
                        <Button size="sm" onClick={() => doAction(() => confirmShipment(s.id))} disabled={pending}>
                          Confirm
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
        title={editingId ? "Edit Shipment" : "New Shipment"}
        width="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="ship-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Draft"}
            </Button>
          </>
        }
      >
        <form id="ship-form" onSubmit={submitForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Shipment Date">
              <Input type="date" value={form.shipment_date ?? ""} onChange={(e) => setForm({ ...form, shipment_date: e.target.value })} />
            </FormField>
            <FormField label="Transporter">
              <Select value={form.transporter_id ?? ""} onChange={(e) => setForm({ ...form, transporter_id: e.target.value })}>
                <option value="">— Select —</option>
                {transporters.map((t) => <option key={t.id} value={t.id}>{t.name}{t.plate_number ? ` (${t.plate_number})` : ""}</option>)}
              </Select>
            </FormField>
            <FormField label="Vehicle Ref">
              <Input value={form.vehicle_ref ?? ""} onChange={(e) => setForm({ ...form, vehicle_ref: e.target.value })} />
            </FormField>
            <FormField label="Delivery Ref">
              <Input value={form.delivery_ref ?? ""} onChange={(e) => setForm({ ...form, delivery_ref: e.target.value })} />
            </FormField>
            <FormField label="Origin">
              <Input value={form.origin ?? ""} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
            </FormField>
            <FormField label="Destination">
              <Input value={form.destination ?? ""} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
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
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {draftItems.map((it) => (
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
                      <TD className="text-right"><Button size="sm" variant="ghost" type="button" onClick={() => removeItem(it._key)} className="text-[#FF3B30]">×</Button></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
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