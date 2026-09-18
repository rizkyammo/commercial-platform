import { z } from "zod";

export const orderItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  description: z.string().max(500).optional().nullable(),
  qty: z.coerce.number().min(0),
  uom: z.string().min(1).max(20),
  unit_price: z.coerce.number().min(0),
  currency: z.string().default("IDR"),
  exchange_rate: z.coerce.number().min(0.000001).default(1),
});

export const orderDraftSchema = z.object({
  customer_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  site_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  contract_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  business_model: z.string().max(50).optional().nullable(),
  po_number: z.string().max(100).optional().nullable(),
  po_date: z.string().optional().nullable().or(z.literal("")),
  currency: z.string().default("IDR"),
  exchange_rate: z.coerce.number().min(0.000001).default(1),
  remarks: z.string().max(1000).optional().nullable(),
  items: z.array(orderItemSchema).default([]),
});

export const orderSubmitSchema = z.object({
  customer_id: z.string().uuid({ message: "Customer wajib dipilih" }),
  site_id: z.string().uuid({ message: "Site wajib dipilih" }),
  contract_id: z.string().uuid({ message: "Contract wajib dipilih" }),
  po_number: z.string().min(1, "PO Number wajib diisi").max(100),
  po_date: z.string().min(1, "PO Date wajib diisi"),
  currency: z.string().min(1),
  exchange_rate: z.coerce.number().min(0.000001),
  items: z
    .array(
      orderItemSchema.extend({
        qty: z.coerce.number().positive("Qty harus > 0"),
        unit_price: z.coerce.number().positive("Harga harus > 0"),
      })
    )
    .min(1, "Minimal 1 item"),
  remarks: z.string().max(1000).optional().nullable(),
});

export type OrderDraftInput = z.infer<typeof orderDraftSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderSubmitInput = z.infer<typeof orderSubmitSchema>;