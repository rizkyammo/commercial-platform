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
  createShipment,
  updateShipment,
  confirmShipment,
  deleteShipment,
} from "@/features/flow/actions";
import type { ShipmentInput } from "@/lib/validation/flow";
import type { ProcurementCoverage } from "@/features/flow/types";

// ============================ TYPES ============================

type Shipment = {
  id: string;
  shipment_number: string;
  shipment_date: string | null;
  transporter_id: string | null;
  origin: string | null;
  destination: string | null;
  delivery_ref: string | null;
  transport_cost: number;
  status: string;
  remarks: string | null;
  transporters?: { name: string } | null;
};

type TransporterOption = {
  id: string;
  code: string;
  name: string;
};

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
  origin: "",
  destination: "",
  delivery_ref: "",
  transport_cost: 0,
  remarks: "",
  items: [],
};

// ============================ MAIN ============================

export function ShipmentTab({
  orderId,
  orderStatus,
  shipments,
  transporters,
  products,
  orderItems,
  coverage,
  permissions,
  canEdit,
}: {
  orderId: string;
  orderStatus: string;
  shipments: Shipment[];
  transporters: TransporterOption[];
  products: ProductOption[];
  orderItems: { product_id: string; qty: number; uom: string }[];
  coverage: ProcurementCoverage;
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

  // ---------- Derived order states ----------
  const orderIssued = [
    "ISSUED",
    "IN_PROGRESS",
    "PARTIALLY_FULFILLED",
    "FULFILLED",
    "CLOSED",
  ].includes(orderStatus);

  const orderFinished = ["FULFILLED", "CLOSED"].includes(orderStatus);

  const missingItems = coverage.items.filter((i) => !i.fully_verified);

  const readyForShipment = canEdit && coverage.all_verified;

  // Gate hint hanya muncul kalau:
  // - order belum selesai, DAN
  // - belum siap untuk shipment
  const showGateHint = !readyForShipment && !orderFinished;

  // Skenario hint:
  // 1. Order belum di-issue → hint "belum issue"
  // 2. Order sudah issue tapi coverage belum 100% → hint "coverage"
  const hintScenario = !orderIssued
    ? "not-issued"
    : missingItems.length > 0
      ? "coverage-incomplete"
      : "unknown";

  // ---------- Actions ----------
  function openCreate() {
    setEditingId(null);
    setForm({
      ...empty,
      shipment_date: new Date().toISOString().slice(0, 10),
    });
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

  function openEdit(s: Shipment) {
    setEditingId(s.id);
    setForm({
      shipment_date: s.shipment_date ?? "",
      transporter_id: s.transporter_id ?? "",
      origin: s.origin ?? "",
      destination: s.destination ?? "",
      delivery_ref: s.delivery_ref ?? "",
      transport_cost: Number(s.transport_cost ?? 0),
      remarks: s.remarks ?? "",
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
        _key: `si-${Date.now()}-${prev.length}`,
        product_id: f.id,
        description: "",
        qty: 0,
        uom: f.uom,
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
        ? await updateShipment(editingId, payload)
        : await createShipment(orderId, payload);
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

  // ============================ RENDER ============================
  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Shipment</h2>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
            Catat pengiriman ke lokasi customer.
          </p>
        </div>
        {canCreate && readyForShipment && (
          <Button onClick={openCreate}>+ New Shipment</Button>
        )}
      </div>

      {/* GATE HINT */}
      {showGateHint && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#A15C00]">
          {hintScenario === "not-issued" && (
            <>
              <div className="font-medium">Shipment terkunci</div>
              <div className="mt-1">
                Order belum di-issue. Shipment hanya dapat dibuat setelah order
                di-issue (compliance completed).
              </div>
            </>
          )}

          {hintScenario === "coverage-incomplete" && (
            <>
              <div className="font-medium">
                Shipment terkunci — procurement belum lengkap
              </div>
              <div className="mt-1">
                Semua order items harus sudah tercakup oleh procurement yang
                ter-verify sebelum shipment dapat dibuat.
              </div>
              {missingItems.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {missingItems.map((i) => (
                    <li
                      key={i.product_id}
                      className="flex items-center justify-between bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E]/60 rounded px-2 py-1"
                    >
                      <span className="truncate">• {i.product_name}</span>
                      <span className="font-mono">
                        verified {i.procured_verified.toLocaleString("id-ID")} /{" "}
                        {i.ordered.toLocaleString("id-ID")} {i.uom}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 text-xs">
                Lengkapi di tab <span className="font-medium">Procurement</span>{" "}
                lalu minta supervisor untuk memverifikasi.
              </div>
            </>
          )}

          {hintScenario === "unknown" && (
            <>
              <div className="font-medium">Shipment belum dapat dibuat</div>
              <div className="mt-1">
                Shipment belum dapat dibuat pada status order saat ini.
              </div>
            </>
          )}
        </div>
      )}

      {/* INFO — kalau order sudah selesai */}
      {orderFinished && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-[#EAF2FB] border border-[#0A84FF]/30 text-[#0A84FF]">
          <div className="font-medium">
            Order sudah selesai ({orderStatus})
          </div>
          <div className="mt-1 text-xs">
            Shipment tidak dapat ditambahkan lagi karena order sudah
            FULFILLED/CLOSED. Hubungi admin jika perlu koreksi data.
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* LIST */}
      {shipments.length === 0 ? (
        <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] text-center py-10 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
          {orderFinished
            ? "Order sudah selesai. Tidak ada shipment baru yang dapat dibuat."
            : !readyForShipment
              ? hintScenario === "not-issued"
                ? "Shipment hanya dapat dibuat setelah order di-issue."
                : "Shipment hanya dapat dibuat setelah semua order items tercakup oleh procurement yang terverifikasi."
              : !canCreate
                ? "Anda tidak memiliki izin untuk membuat shipment."
                : "Belum ada shipment. Klik + New Shipment."}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>No. Shipment</TH>
                <TH>Date</TH>
                <TH>Perusahaan</TH>
                <TH>Route</TH>
                <TH>Biaya</TH>
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
                  <TD className="font-mono text-xs">
                    {Number(s.transport_cost).toLocaleString("id-ID")}
                  </TD>
                  <TD>
                    <Badge
                      tone={s.status === "CONFIRMED" ? "green" : "grey"}
                    >
                      {s.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {s.status === "DRAFT" && canCreate && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(s)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#FF3B30]"
                            onClick={() =>
                              doAction(() => deleteShipment(s.id))
                            }
                            disabled={pending}
                          >
                            Del
                          </Button>
                        </>
                      )}
                      {s.status === "DRAFT" && canConfirm && (
                        <Button
                          size="sm"
                          onClick={() => doAction(() => confirmShipment(s.id))}
                          disabled={pending}
                        >
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

      {/* FORM MODAL */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit Shipment" : "New Shipment"}
        width="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="ship-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Draft"}
            </Button>
          </>
        }
      >
        <form id="ship-form" onSubmit={submitForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tanggal Shipment" required>
              <Input
                type="date"
                value={form.shipment_date ?? ""}
                onChange={(e) =>
                  setForm({ ...form, shipment_date: e.target.value })
                }
                required
              />
            </FormField>
            <FormField label="Perusahaan Transporter" required>
              <Select
                value={form.transporter_id ?? ""}
                onChange={(e) =>
                  setForm({ ...form, transporter_id: e.target.value })
                }
                required
              >
                <option value="">— Pilih Perusahaan —</option>
                {transporters.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Origin">
              <Input
                value={form.origin ?? ""}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
                placeholder="Asal barang"
              />
            </FormField>
            <FormField label="Destination">
              <Input
                value={form.destination ?? ""}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value })
                }
                placeholder="Tujuan / site customer"
              />
            </FormField>
            <FormField label="Delivery Ref">
              <Input
                value={form.delivery_ref ?? ""}
                onChange={(e) =>
                  setForm({ ...form, delivery_ref: e.target.value })
                }
              />
            </FormField>
            <FormField label="Biaya Transport (IDR)">
              <Input
                type="number"
                step="0.01"
                value={form.transport_cost}
                onChange={(e) =>
                  setForm({
                    ...form,
                    transport_cost: Number(e.target.value) || 0,
                  })
                }
                placeholder="0"
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
              <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] text-center py-6 border border-dashed border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
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
                  ))}
                </TBody>
              </Table>
            )}
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