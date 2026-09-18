"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createDelivery } from "@/features/flow/actions";

type Delivery = {
  id: string;
  delivery_number: string;
  delivery_date: string;
  receiving_party: string | null;
  delivery_note: string | null;
  location: string | null;
  status: string;
};

type Shipment = {
  id: string;
  shipment_number: string;
  status: string;
  has_delivery?: boolean;
};

export function DeliveryTab({
  shipments,
  deliveries,
  permissions,
}: {
  orderId: string;
  shipments: Shipment[];
  deliveries: Delivery[];
  permissions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    delivery_date: new Date().toISOString().slice(0, 10),
    receiving_party: "",
    delivery_note: "",
    location: "",
    remarks: "",
  });
  const [error, setError] = useState<string | null>(null);

  const canCreate = permissions.includes("SHIPMENT_CONFIRM");

  const deliveredShipmentIds = new Set(deliveries.map((d) => (d as any).shipment_id));
  const pendingShipments = shipments.filter(
    (s) => s.status === "CONFIRMED" && !deliveredShipmentIds.has(s.id)
  );

  function openCreate(shipId: string) {
    setShipmentId(shipId);
    setForm({
      delivery_date: new Date().toISOString().slice(0, 10),
      receiving_party: "",
      delivery_note: "",
      location: "",
      remarks: "",
    });
    setError(null);
    setOpen(true);
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!shipmentId) return;
    setError(null);
    startTransition(async () => {
      const r = await createDelivery(shipmentId, form);
      if (r.error) { setError(r.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Delivery</h2>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">Konfirmasi barang diterima customer.</p>
        </div>
      </div>

      {pendingShipments.length > 0 && canCreate && (
        <div className="mb-4 bg-[#EAF2FB] border border-[#0A84FF]/30 rounded-xl p-4">
          <div className="text-sm font-medium text-[#0A84FF] mb-2">Shipment menunggu delivery:</div>
          <div className="flex flex-wrap gap-2">
            {pendingShipments.map((s) => (
              <Button key={s.id} size="sm" variant="secondary" onClick={() => openCreate(s.id)}>
                + Delivery untuk {s.shipment_number}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] text-center py-10 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
          Belum ada delivery.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>No. Delivery</TH>
                <TH>Date</TH>
                <TH>Receiving Party</TH>
                <TH>Delivery Note</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {deliveries.map((d) => (
                <TR key={d.id}>
                  <TD className="font-mono text-xs">{d.delivery_number}</TD>
                  <TD>{d.delivery_date}</TD>
                  <TD>{d.receiving_party ?? "—"}</TD>
                  <TD className="text-xs">{d.delivery_note ?? "—"}</TD>
                  <TD><Badge tone="green">{d.status}</Badge></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Delivery"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="deliv-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Confirm Delivery"}
            </Button>
          </>
        }
      >
        <form id="deliv-form" onSubmit={submitForm} className="space-y-4">
          <FormField label="Delivery Date" required>
            <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} required />
          </FormField>
          <FormField label="Receiving Party">
            <Input value={form.receiving_party} onChange={(e) => setForm({ ...form, receiving_party: e.target.value })} placeholder="Nama penerima" />
          </FormField>
          <FormField label="Delivery Note Ref">
            <Input value={form.delivery_note} onChange={(e) => setForm({ ...form, delivery_note: e.target.value })} />
          </FormField>
          <FormField label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Site / gudang tujuan" />
          </FormField>
          <FormField label="Remarks">
            <Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
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