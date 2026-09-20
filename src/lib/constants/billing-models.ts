// =========================================================
// Billing Models, Order Types, Line Types, Margin Types
// Backward-compatible + extended
// =========================================================

// ---------------------------------------------------------
// BILLING MODELS — cara penagihan
// ---------------------------------------------------------
export const BILLING_MODELS = {
  FULL: {
    value: "FULL",
    label: "Full (Setelah BAST)",
    description: "Invoice diterbitkan sekali setelah BAST complete.",
    defaultFlow: "SPOT_BASIS",
    defaultTrigger: "BAST_COMPLETE",
  },
  PER_SHIPMENT: {
    value: "PER_SHIPMENT",
    label: "Per Shipment",
    description: "Invoice diterbitkan setiap shipment terkonfirmasi.",
    defaultFlow: "SPOT_BASIS",
    defaultTrigger: "SHIPMENT_CONFIRM",
  },
  MONTHLY_USAGE: {
    value: "MONTHLY_USAGE",
    label: "Monthly Usage",
    description: "Invoice diterbitkan per periode berdasarkan usage.",
    defaultFlow: "CONSIGNMENT",
    defaultTrigger: "USAGE_REPORT",
  },
  MILESTONE: {
    value: "MILESTONE",
    label: "Milestone",
    description: "Invoice diterbitkan per milestone yang disepakati.",
    defaultFlow: "SPOT_BASIS",
    defaultTrigger: "MANUAL",
  },
  PROGRESSIVE: {
    value: "PROGRESSIVE",
    label: "Progressive",
    description: "Invoice diterbitkan berdasarkan progress/volume aktual.",
    defaultFlow: "BCM",
    defaultTrigger: "PRODUCTION_VOLUME",
  },
  MANUAL: {
    value: "MANUAL",
    label: "Manual",
    description: "Invoice diterbitkan manual tanpa trigger otomatis.",
    defaultFlow: "SPOT_BASIS",
    defaultTrigger: "MANUAL",
  },
} as const;

export type InvoiceType = keyof typeof BILLING_MODELS;
export type BillingModel = InvoiceType;

// ---------------------------------------------------------
// FLOW CATEGORY
// ---------------------------------------------------------
export const FLOW_CATEGORIES = {
  SPOT_BASIS:  { value: "SPOT_BASIS",  label: "Spot Basis" },
  CONSIGNMENT: { value: "CONSIGNMENT", label: "Consignment" },
  BCM:         { value: "BCM",         label: "BCM (Bank Cubic Meter)" },
  AGENCY:      { value: "AGENCY",      label: "Agency / Fee-based" },
} as const;

export type FlowCategory = keyof typeof FLOW_CATEGORIES;

// ---------------------------------------------------------
// BUSINESS MODELS — daftar final 12
// ---------------------------------------------------------
export const BUSINESS_MODELS = {
  SPOT_SALE:      { value: "Spot Sale",                       label: "Spot Sale",                       defaultBilling: "FULL" as InvoiceType,         defaultFlow: "SPOT_BASIS" as FlowCategory },
  TERM_SUPPLY:    { value: "Term Supply Contract",            label: "Term Supply Contract",            defaultBilling: "PER_SHIPMENT" as InvoiceType, defaultFlow: "SPOT_BASIS" as FlowCategory },
  FRAMEWORK:      { value: "Framework / Blanket Contract",    label: "Framework / Blanket Contract",    defaultBilling: "MILESTONE" as InvoiceType,    defaultFlow: "SPOT_BASIS" as FlowCategory },
  CALL_OFF:       { value: "Call-Off Supply",                 label: "Call-Off Supply",                 defaultBilling: "PER_SHIPMENT" as InvoiceType, defaultFlow: "SPOT_BASIS" as FlowCategory },
  CONSIGNMENT:    { value: "Consignment",                     label: "Consignment",                     defaultBilling: "MONTHLY_USAGE" as InvoiceType, defaultFlow: "CONSIGNMENT" as FlowCategory },
  VMI:            { value: "Managed Inventory / VMI",         label: "Managed Inventory / VMI",         defaultBilling: "MONTHLY_USAGE" as InvoiceType, defaultFlow: "CONSIGNMENT" as FlowCategory },
  BACK_TO_BACK:   { value: "Back-to-Back Supply",             label: "Back-to-Back Supply",             defaultBilling: "PER_SHIPMENT" as InvoiceType, defaultFlow: "SPOT_BASIS" as FlowCategory },
  DEDICATED_SITE: { value: "Dedicated Site Supply",           label: "Dedicated Site Supply",           defaultBilling: "PROGRESSIVE" as InvoiceType,  defaultFlow: "BCM" as FlowCategory },
  DELIVERED:      { value: "Delivered Supply",                label: "Delivered Supply",                defaultBilling: "FULL" as InvoiceType,         defaultFlow: "SPOT_BASIS" as FlowCategory },
  IMPORT_TO_ORDER:{ value: "Import-to-Order",                 label: "Import-to-Order",                 defaultBilling: "FULL" as InvoiceType,         defaultFlow: "SPOT_BASIS" as FlowCategory },
  AGENCY:         { value: "Agency / Brand Distribution",     label: "Agency / Brand Distribution",     defaultBilling: "PER_SHIPMENT" as InvoiceType, defaultFlow: "AGENCY" as FlowCategory },
  INTEGRATED:     { value: "Integrated Supply + Service",     label: "Integrated Supply + Service",     defaultBilling: "MILESTONE" as InvoiceType,    defaultFlow: "AGENCY" as FlowCategory },
} as const;

export type BusinessModel = keyof typeof BUSINESS_MODELS;

// ---------------------------------------------------------
// ORDER TYPES
// ---------------------------------------------------------
export const ORDER_TYPES = {
  MATERIAL:           { value: "MATERIAL",           label: "Material" },
  SERVICE_FEE:        { value: "SERVICE_FEE",        label: "Service Fee" },
  SERVICE_BACKCHARGE: { value: "SERVICE_BACKCHARGE", label: "Service Backcharge" },
} as const;

export type OrderType = keyof typeof ORDER_TYPES;

// ---------------------------------------------------------
// LINE TYPES
// ---------------------------------------------------------
export const LINE_TYPES = {
  MATERIAL:           { value: "MATERIAL",           label: "Material" },
  SERVICE_LICENSE:    { value: "SERVICE_LICENSE",    label: "Service — License" },
  SERVICE_MIXING:     { value: "SERVICE_MIXING",     label: "Service — Mixing" },
  SERVICE_UREA:       { value: "SERVICE_UREA",       label: "Service — Urea" },
  SERVICE_BACKCHARGE: { value: "SERVICE_BACKCHARGE", label: "Service — Backcharge" },
  SERVICE_OTHER:      { value: "SERVICE_OTHER",      label: "Service — Other" },
} as const;

export type LineType = keyof typeof LINE_TYPES;

// ---------------------------------------------------------
// MARGIN TYPES
// ---------------------------------------------------------
export const MARGIN_TYPES = {
  PASS_THROUGH: { value: "PASS_THROUGH", label: "Pass-Through (margin 0)" },
  FEE:          { value: "FEE",          label: "Fee (pure revenue)" },
} as const;

export type MarginType = keyof typeof MARGIN_TYPES;

// ---------------------------------------------------------
// PERIOD TYPES
// ---------------------------------------------------------
export const PERIOD_TYPES = {
  WEEKLY:   { value: "WEEKLY",   label: "Weekly" },
  BIWEEKLY: { value: "BIWEEKLY", label: "Bi-weekly" },
  MONTHLY:  { value: "MONTHLY",  label: "Monthly" },
} as const;

export type PeriodType = keyof typeof PERIOD_TYPES;

// ---------------------------------------------------------
// INVOICE TRIGGERS
// ---------------------------------------------------------
export const INVOICE_TRIGGERS = {
  BAST_COMPLETE:     { value: "BAST_COMPLETE",     label: "BAST Complete" },
  USAGE_REPORT:      { value: "USAGE_REPORT",      label: "Usage Report Approved" },
  PRODUCTION_VOLUME: { value: "PRODUCTION_VOLUME", label: "Production Volume" },
  SHIPMENT_CONFIRM:  { value: "SHIPMENT_CONFIRM",  label: "Shipment Confirmed" },
  MANUAL:            { value: "MANUAL",            label: "Manual" },
} as const;

export type InvoiceTrigger = keyof typeof INVOICE_TRIGGERS;

// ---------------------------------------------------------
// PAYMENT METHODS
// ---------------------------------------------------------
export const PAYMENT_METHODS = {
  CASH:     { value: "CASH",     label: "Cash / On-the-Spot" },
  TRANSFER: { value: "TRANSFER", label: "Bank Transfer" },
  TERM:     { value: "TERM",     label: "Term (NET days)" },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

// ---------------------------------------------------------
// USAGE REPORT TYPES & STATUSES
// ---------------------------------------------------------
export const USAGE_REPORT_TYPES = {
  CONSIGNMENT_USAGE: { value: "CONSIGNMENT_USAGE", label: "Consignment Usage" },
  BCM_VOLUME:        { value: "BCM_VOLUME",        label: "BCM Volume" },
} as const;

export type UsageReportType = keyof typeof USAGE_REPORT_TYPES;

export const USAGE_REPORT_STATUSES = {
  DRAFT:     { value: "DRAFT",     label: "Draft" },
  SUBMITTED: { value: "SUBMITTED", label: "Submitted" },
  APPROVED:  { value: "APPROVED",  label: "Approved" },
  REJECTED:  { value: "REJECTED",  label: "Rejected" },
  INVOICED:  { value: "INVOICED",  label: "Invoiced" },
} as const;

export type UsageReportStatus = keyof typeof USAGE_REPORT_STATUSES;

// ---------------------------------------------------------
// BACKWARD-COMPAT HELPERS
// (dipakai oleh invoice-tab.tsx dan form lama)
// ---------------------------------------------------------

/** Cari business model dari string value, return key atau null */
export function findBusinessModelByValue(value: string | null | undefined) {
  if (!value) return null;
  const entry = Object.entries(BUSINESS_MODELS).find(
    ([, v]) => v.value === value
  );
  return entry ? (entry[0] as BusinessModel) : null;
}

/** Ambil default invoice type untuk business model tertentu */
export function getDefaultInvoiceType(
  businessModel: string | null | undefined
): InvoiceType {
  if (!businessModel) return "FULL";
  const key = findBusinessModelByValue(businessModel);
  if (!key) return "FULL";
  return BUSINESS_MODELS[key].defaultBilling;
}

/** Ambil default flow category untuk business model tertentu */
export function getDefaultFlowCategory(
  businessModel: string | null | undefined
): FlowCategory {
  if (!businessModel) return "SPOT_BASIS";
  const key = findBusinessModelByValue(businessModel);
  if (!key) return "SPOT_BASIS";
  return BUSINESS_MODELS[key].defaultFlow;
}

/** Label helper untuk BILLING_MODELS dan sejenisnya */
export function labelOf<T extends Record<string, { label: string }>>(
  map: T,
  key: string | null | undefined
): string {
  if (!key) return "—";
  const entry = (map as Record<string, { label: string }>)[key];
  return entry?.label ?? key;
}

// ---------------------------------------------------------
// FALLBACK DEFAULTS — bisa di-override di contract_rules
// ---------------------------------------------------------
export const DEFAULT_BUSINESS_MODEL_BY_ORDER_TYPE: Record<OrderType, string> = {
  MATERIAL:           BUSINESS_MODELS.BACK_TO_BACK.value,
  SERVICE_FEE:        BUSINESS_MODELS.AGENCY.value,
  SERVICE_BACKCHARGE: BUSINESS_MODELS.INTEGRATED.value,
};

export const DEFAULT_FLOW_BY_ORDER_TYPE: Record<OrderType, FlowCategory> = {
  MATERIAL:           "SPOT_BASIS",
  SERVICE_FEE:        "AGENCY",
  SERVICE_BACKCHARGE: "AGENCY",
};

export function resolveBusinessModelForOrderType(
  orderType: OrderType,
  contractOverride?: Record<string, string> | null
): string {
  if (contractOverride && contractOverride[orderType]) {
    return contractOverride[orderType];
  }
  return DEFAULT_BUSINESS_MODEL_BY_ORDER_TYPE[orderType];
}