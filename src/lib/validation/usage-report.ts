import { z } from "zod";

export const usageReportLineSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  line_type: z.enum([
    "MATERIAL",
    "SERVICE_LICENSE",
    "SERVICE_MIXING",
    "SERVICE_UREA",
    "SERVICE_BACKCHARGE",
    "SERVICE_OTHER",
  ]),
  margin_type: z.enum(["PASS_THROUGH", "FEE"]),
  qty_usage: z.number().nonnegative(),
  uom: z.string().min(1),
  unit_price: z.number().nonnegative(),
  rate: z.number().nonnegative().nullable().optional(),
  unit_cost: z.number().nonnegative().default(0),
  transport_amount: z.number().nonnegative().default(0),
  stock_awal: z.number().nullable().optional(),
  stock_akhir: z.number().nullable().optional(),
});

export const usageReportSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  project_code: z.string().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  order_id: z.string().uuid().nullable().optional(),
  report_type: z.enum(["CONSIGNMENT_USAGE", "BCM_VOLUME"]),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  period_type: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  notes: z.string().nullable().optional(),
  lines: z.array(usageReportLineSchema).min(1, "Minimal 1 baris"),
});

export type UsageReportInput = z.infer<typeof usageReportSchema>;
export type UsageReportLineInput = z.infer<typeof usageReportLineSchema>;

// ---------------------------------------------------------
// Agency Fee Order (AMNT-like case)
// ---------------------------------------------------------
export const agencyFeeLineSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  description: z.string().min(1),
  line_type: z.enum([
    "SERVICE_LICENSE",
    "SERVICE_MIXING",
    "SERVICE_UREA",
    "SERVICE_BACKCHARGE",
    "SERVICE_OTHER",
  ]),
  qty: z.number().nonnegative(),
  uom: z.string().min(1),
  unit_price: z.number().nonnegative(),
  unit_cost: z.number().nonnegative().default(0),
  pph23_rate: z.number().min(0).max(100).default(2),
});

export const agencyFeeOrderSchema = z.object({
  customer_id: z.string().uuid(),
  project_code: z.string().min(1, "Project code wajib"),
  project_name: z.string().nullable().optional(),
  fee_reference: z.string().nullable().optional(),
  currency: z.string().default("IDR"),
  ppn_rate: z.number().min(0).max(100).default(11),
  pph23_rate: z.number().min(0).max(100).default(2),
  order_type: z.enum(["SERVICE_FEE", "SERVICE_BACKCHARGE"]),
  business_model: z.string().min(1),
  notes: z.string().nullable().optional(),
  lines: z.array(agencyFeeLineSchema).min(1),
});

export type AgencyFeeOrderInput = z.infer<typeof agencyFeeOrderSchema>;