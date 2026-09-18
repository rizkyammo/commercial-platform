import { z } from "zod";

const codeRule = z.string().min(1).max(50).regex(/^[A-Z0-9\-]+$/, "Gunakan huruf kapital, angka, dan tanda minus.");

export const customerSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  type: z.string().max(100).optional().nullable(),
  tax_no: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  payment_term_days: z.coerce.number().int().min(0).max(365).default(30),
  credit_limit: z.coerce.number().min(0).default(0),
  pic_name: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const siteSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  customer_id: z.string().uuid(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  business_model: z.string().max(50).optional().nullable(),
  site_status: z.string().max(30).default("Active"),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const productSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional().nullable(),
  uom: z.string().min(1).max(20),
  description: z.string().max(500).optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const vendorSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  type: z.string().max(50).optional().nullable(),
  tax_no: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  contact_person: z.string().max(100).optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const transporterSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  vehicle_type: z.string().max(50).optional().nullable(),
  plate_number: z.string().max(30).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const contractSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  customer_id: z.string().uuid(),
  site_id: z.string().uuid().optional().nullable().or(z.literal("")),
  contract_number: z.string().max(100).optional().nullable(),
  start_date: z.string().optional().nullable().or(z.literal("")),
  end_date: z.string().optional().nullable().or(z.literal("")),
  value: z.coerce.number().min(0).default(0),
  currency: z.string().default("IDR"),
  status: z.string().default("Draft"),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.coerce.boolean().default(true),

  fulfillment_model: z.enum(["DIRECT_DELIVERY", "CONSIGNMENT", "CALL_OFF", "STOCK_REPLENISHMENT"]).default("DIRECT_DELIVERY"),
  billing_model: z.enum(["FULL", "PER_SHIPMENT", "MONTHLY_USAGE", "MILESTONE", "PROGRESSIVE", "MANUAL"]).default("FULL"),
  pricing_model: z.enum(["FIXED_IDR", "FIXED_USD", "USD_X_EXCHANGE_RATE", "INDEXED", "TIERED"]).default("FIXED_IDR"),
  payment_model: z.string().max(50).optional().nullable(),
  logistics_model: z.enum(["INCLUDED", "SEPARATE_COST", "CUSTOMER_TRANSPORT", "THIRD_PARTY"]).default("INCLUDED"),
  requires_bast: z.coerce.boolean().default(true),
  requires_compliance: z.coerce.boolean().default(true),
  requires_consumption_report: z.coerce.boolean().default(false),
  requires_customer_approval: z.coerce.boolean().default(false),
  invoice_trigger: z.string().max(50).optional().nullable(),
  revenue_recognition_trigger: z.string().max(50).optional().nullable(),
  payment_term_days: z.coerce.number().int().min(0).max(365).default(30),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type SiteInput = z.infer<typeof siteSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type TransporterInput = z.infer<typeof transporterSchema>;
export type ContractInput = z.infer<typeof contractSchema>;