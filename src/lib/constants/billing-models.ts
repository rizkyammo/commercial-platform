// =========================================================
// Billing Models — Invoice type per business model
// =========================================================

export type InvoiceType =
  | "FULL"
  | "PER_SHIPMENT"
  | "MONTHLY_USAGE"
  | "MILESTONE"
  | "PROGRESSIVE"
  | "MANUAL";

export interface BillingModelInfo {
  value: InvoiceType;
  label: string;
  description: string;
  autoTrigger: string;
}

export const BILLING_MODELS: Record<InvoiceType, BillingModelInfo> = {
  FULL: {
    value: "FULL",
    label: "Full Payment",
    description: "1 invoice untuk seluruh order value",
    autoTrigger: "Setelah BAST completed",
  },
  PER_SHIPMENT: {
    value: "PER_SHIPMENT",
    label: "Per Shipment",
    description: "Invoice per shipment yang di-confirm",
    autoTrigger: "Setiap shipment confirmed",
  },
  MONTHLY_USAGE: {
    value: "MONTHLY_USAGE",
    label: "Monthly Usage",
    description: "Invoice bulanan berdasarkan pemakaian (consignment)",
    autoTrigger: "Bulanan (manual / cron)",
  },
  MILESTONE: {
    value: "MILESTONE",
    label: "Milestone",
    description: "Invoice per milestone yang disepakati",
    autoTrigger: "Manual per milestone",
  },
  PROGRESSIVE: {
    value: "PROGRESSIVE",
    label: "Progressive",
    description: "Invoice bertahap sesuai % order value",
    autoTrigger: "Manual / % tertentu",
  },
  MANUAL: {
    value: "MANUAL",
    label: "Manual",
    description: "User menentukan sendiri isi dan waktu invoice",
    autoTrigger: "Manual",
  },
};

/**
 * Mapping business model → billing model default
 * Digunakan untuk preset saat generate invoice.
 */
export const BUSINESS_MODEL_BILLING_MAP: Record<string, InvoiceType> = {
  "Spot Sale": "FULL",
  "Term Supply Contract": "PER_SHIPMENT",
  "Framework / Blanket Contract": "MILESTONE",
  "Call-Off Supply": "PER_SHIPMENT",
  Consignment: "MONTHLY_USAGE",
  "Managed Inventory / VMI": "MONTHLY_USAGE",
  "Back-to-Back Supply": "PER_SHIPMENT",
  "Dedicated Site Supply": "PROGRESSIVE",
  "Delivered Supply": "FULL",
  "Import-to-Order": "FULL",
  "Agency / Brand Distribution": "PER_SHIPMENT",
  "Integrated Supply + Service": "MILESTONE",
};

export function getDefaultInvoiceType(businessModel: string): InvoiceType {
  return BUSINESS_MODEL_BILLING_MAP[businessModel] ?? "MANUAL";
}

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  FULL: "Full Payment",
  PER_SHIPMENT: "Per Shipment",
  MONTHLY_USAGE: "Monthly Usage",
  MILESTONE: "Milestone",
  PROGRESSIVE: "Progressive",
  MANUAL: "Manual",
};

export const INVOICE_TYPE_OPTIONS: InvoiceType[] = [
  "FULL",
  "PER_SHIPMENT",
  "MONTHLY_USAGE",
  "MILESTONE",
  "PROGRESSIVE",
  "MANUAL",
];