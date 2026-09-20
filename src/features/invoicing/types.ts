// =========================================================
// Invoicing Types — extended for business model support
// =========================================================

import type {
  BillingModel,
  BusinessModel,
  FlowCategory,
  InvoiceTrigger,
  LineType,
  MarginType,
  OrderType,
  PaymentMethod,
  PeriodType,
  UsageReportStatus,
  UsageReportType,
} from "@/lib/constants/billing-models";

// Re-export biar bisa di-import dari sini juga
export type {
  BillingModel,
  BusinessModel,
  FlowCategory,
  InvoiceTrigger,
  LineType,
  MarginType,
  OrderType,
  PaymentMethod,
  PeriodType,
  UsageReportStatus,
  UsageReportType,
};

// ---------------------------------------------------------
// INVOICE
// ---------------------------------------------------------
export type Invoice = {
  id: string;
  invoice_number: string;
  invoice_ref: string | null;
  invoice_type: BillingModel;
  billing_model: FlowCategory | null;
  invoice_trigger: InvoiceTrigger | null;
  payment_method: PaymentMethod | null;

  order_id: string;
  customer_id: string;

  invoice_date: string;
  due_date: string | null;
  payment_term_days: number;

  period_start: string | null;
  period_end: string | null;
  period_type: PeriodType | null;

  project_id: string | null;
  site_id: string | null;
  usage_report_id: string | null;

  currency: string;
  exchange_rate: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  pph23_rate: number;
  pph23_amount: number;
  amount_with_tax: number;
  amount_idr: number;
  paid_amount: number;

  status: string;
  issued_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string | null;
  line_type: LineType;
  margin_type: MarginType;
  qty: number;
  uom: string;
  unit_price: number;
  unit_cost: number;
  line_value: number;
  stock_awal: number | null;
  stock_akhir: number | null;
  rate: number | null;
  sort_order: number;
};

export type InvoicePayment = {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

// ---------------------------------------------------------
// USAGE REPORT
// ---------------------------------------------------------
export type UsageReport = {
  id: string;
  report_number: string;
  project_id: string | null;
  project_code: string | null;
  site_id: string | null;
  customer_id: string | null;
  order_id: string | null;
  report_type: UsageReportType;
  period_start: string;
  period_end: string;
  period_type: PeriodType;
  status: UsageReportStatus;
  total_qty: number;
  total_amount: number;
  total_transport: number;
  invoice_id: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  reject_reason: string | null;
  invoiced_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageReportLine = {
  id: string;
  usage_report_id: string;
  product_id: string | null;
  description: string | null;
  line_type: LineType;
  margin_type: MarginType;
  qty_usage: number;
  uom: string;
  unit_price: number;
  rate: number | null;
  unit_cost: number;
  amount: number;
  transport_amount: number;
  stock_awal: number | null;
  stock_akhir: number | null;
  sort_order: number;
};

// ---------------------------------------------------------
// STOCK MOVEMENT
// ---------------------------------------------------------
export type StockMovement = {
  id: string;
  project_id: string | null;
  project_code: string | null;
  site_id: string | null;
  product_id: string;
  movement_type: "IN_SHIPMENT" | "OUT_USAGE" | "ADJUSTMENT" | "INITIAL";
  qty: number;
  uom: string;
  reference_type: string | null;
  reference_id: string | null;
  movement_date: string;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

export type StockBalance = {
  project_id: string | null;
  project_code: string | null;
  site_id: string | null;
  product_id: string;
  qty_on_hand: number;
  last_movement: string | null;
};

// ---------------------------------------------------------
// PROJECT SUMMARY
// ---------------------------------------------------------
export type ProjectSummary = {
  project_code: string;
  project_name: string | null;
  order_count: number;
  customer_count: number;
  material_revenue: number;
  service_revenue: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  total_ppn_output: number;
  total_pph23: number;
  total_margin_after_tax: number;
  first_order_at: string;
  last_order_at: string;
};

// ---------------------------------------------------------
// ORDER (extended)
// ---------------------------------------------------------
export type OrderExtraFields = {
  project_code?: string | null;
  project_name?: string | null;
  order_type?: OrderType;
  fee_reference?: string | null;
};

// ---------------------------------------------------------
// Dashboard
// ---------------------------------------------------------
export type UninvoicedOrder = {
  id: string;
  order_number: string;
  status: string;
  business_model: string;
  current_stage: string;
  selling_value: number;
  issued: number;
  uninvoiced: number;
  currency: string;
  customer_name: string;
  customer_code: string;
  site_name: string;
  created_at: string;
  order_type?: OrderType;
  project_code?: string | null;
};

export type InvoicingDashboard = {
  totals: {
    invoices: number;
    issued: number;
    orders: number;
    ordersWithOutstanding: number;
    ordersUninvoiced: number;
    overdue: number;
    orderValue: number;
    issuedTotal: number;
    uninvoiced: number;
    paid: number;
    outstanding: number;
    overdueAmount: number;
  };
  buckets: { bucket: string; count: number; amount: number }[];
  recent: unknown[];
};