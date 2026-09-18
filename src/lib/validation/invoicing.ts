import { z } from "zod";

export const invoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  qty: z.coerce.number().min(0),
  uom: z.string().min(1).max(20),
  unit_price: z.coerce.number().min(0),
});

export const invoiceSchema = z.object({
  invoice_ref: z.string().max(100).optional().nullable(),
  invoice_type: z.enum([
    "FULL",
    "PER_SHIPMENT",
    "MONTHLY_USAGE",
    "MILESTONE",
    "PROGRESSIVE",
    "MANUAL",
  ]),
  invoice_date: z.string().min(1),
  payment_term_days: z.coerce.number().int().min(0).max(365).default(30),
  currency: z.string().default("IDR"),
  exchange_rate: z.coerce.number().min(0.000001).default(1),
  tax_rate: z.coerce.number().min(0).max(100).default(11),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "Minimal 1 item invoice"),
});

export const paymentSchema = z.object({
  payment_date: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().default("IDR"),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;