import { z } from "zod";

export const skSchema = z.object({
  sk_number: z.string().min(1).max(100),
  issuing_authority: z.string().max(200).default("Kementerian Pertahanan RI"),
  issue_date: z.string().optional().nullable().or(z.literal("")),
  effective_date: z.string().optional().nullable().or(z.literal("")),
  expiry_date: z.string().optional().nullable().or(z.literal("")),
  scope: z.string().max(500).optional().nullable(),
  document_ref: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const quotaLineSchema = z.object({
  product_id: z.string().uuid(),
  allocation_qty: z.coerce.number().min(0),
  uom: z.string().min(1).max(20).default("MT"),
  notes: z.string().max(500).optional().nullable(),
});

export const quotaAdjustmentSchema = z.object({
  quota_line_id: z.string().uuid(),
  new_allocation: z.coerce.number().min(0),
  reason: z.string().min(5).max(500),
});

export type SkInput = z.infer<typeof skSchema>;
export type QuotaLineInput = z.infer<typeof quotaLineSchema>;