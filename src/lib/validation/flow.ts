import { z } from "zod";

export const procurementItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  description: z.string().max(500).optional().nullable(),
  qty: z.coerce.number().min(0),
  uom: z.string().min(1).max(20),
  unit_price: z.coerce.number().min(0),
  currency: z.string().default("IDR"),
  exchange_rate: z.coerce.number().min(0.000001).default(1),
});

export const procurementSchema = z.object({
  vendor_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  vendor_po: z.string().max(100).optional().nullable(),
  vendor_invoice: z.string().max(100).optional().nullable(),
  reference_date: z.string().optional().nullable().or(z.literal("")),
  currency: z.string().default("IDR"),
  exchange_rate: z.coerce.number().min(0.000001).default(1),
  remarks: z.string().max(1000).optional().nullable(),
  items: z.array(procurementItemSchema).default([]),
});

export const shipmentItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  description: z.string().max(500).optional().nullable(),
  qty: z.coerce.number().positive("Qty harus > 0"),
  uom: z.string().min(1).max(20),
});

export const shipmentSchema = z.object({
  shipment_date: z.string().min(1, "Tanggal shipment wajib diisi"),
  transporter_id: z.string().uuid("Perusahaan transporter wajib dipilih"),
  origin: z.string().max(200).optional().nullable(),
  destination: z.string().max(200).optional().nullable(),
  delivery_ref: z.string().max(100).optional().nullable(),
  transport_cost: z.coerce.number().min(0).default(0),
  remarks: z.string().max(1000).optional().nullable(),
  items: z.array(shipmentItemSchema).min(1, "Minimal 1 item shipment"),
});

export const deliverySchema = z.object({
  delivery_date: z.string().min(1, "Tanggal delivery wajib diisi"),
  receiving_party: z.string().max(200).optional().nullable(),
  delivery_note: z.string().max(100).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

export const bastSchema = z.object({
  bast_date: z.string().min(1, "Tanggal BAST wajib diisi"),
  receiver_name: z.string().min(1, "Nama penerima wajib diisi").max(200),
  signed_by: z.string().max(200).optional().nullable(),
  signed_document_path: z.string().min(1, "File scan BAST wajib diupload"),
  remarks: z.string().max(1000).optional().nullable(),
});

export type ProcurementInput = z.infer<typeof procurementSchema>;
export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type DeliveryInput = z.infer<typeof deliverySchema>;
export type BastInput = z.infer<typeof bastSchema>;