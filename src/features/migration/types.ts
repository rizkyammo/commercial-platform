// ============================================================
// ENTITY TYPE
// ============================================================
export type EntityType =
  | "customers"
  | "sites"
  | "products"
  | "vendors"
  | "transporters"
  | "contracts"
  | "orders"
  | "order_items"
  | "procurements"
  | "procurement_items"
  | "shipments"
  | "deliveries"
  | "basts"
  | "invoices";

export type BatchStatus =
  | "UPLOADED" | "MAPPED" | "VALIDATED" | "COMMITTED"
  | "PARTIAL" | "FAILED" | "ROLLED_BACK";

export type RowStatus =
  | "PENDING" | "VALID" | "WARNING" | "ERROR" | "COMMITTED" | "SKIPPED";

export type MigrationBatch = {
  id: string;
  name: string;
  entity_type: EntityType;
  file_name: string | null;
  file_size: number | null;
  row_count: number;
  valid_count: number;
  warning_count: number;
  error_count: number;
  committed_count: number;
  status: BatchStatus;
  column_mapping: Record<string, string>;
  uploaded_by: string | null;
  uploaded_at: string;
  validated_at: string | null;
  committed_by: string | null;
  committed_at: string | null;
  notes: string | null;
};

export type StagingRow = {
  id: string;
  batch_id: string;
  row_index: number;
  raw_data: Record<string, unknown>;
  mapped_data: Record<string, unknown> | null;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  commit_target_id: string | null;
  commit_target_table: string | null;
  created_at: string;
  updated_at: string;
};

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type: "string" | "number" | "date" | "boolean" | "email";
  aliases?: string[];
};

// ============================================================
// ENTITY FIELDS
// ============================================================
export const ENTITY_FIELDS: Record<EntityType, FieldDef[]> = {
  customers: [
    { key: "code", label: "Customer Code", required: true, type: "string" },
    { key: "name", label: "Customer Name", required: true, type: "string" },
    { key: "type", label: "Type", type: "string" },
    { key: "tax_no", label: "Tax No", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "payment_term_days", label: "Payment Term (days)", type: "number" },
    { key: "credit_limit", label: "Credit Limit", type: "number" },
    { key: "pic_name", label: "PIC Name", type: "string" },
    { key: "notes", label: "Notes", type: "string" },
  ],

  sites: [
    { key: "code", label: "Site Code", required: true, type: "string" },
    { key: "name", label: "Site Name", required: true, type: "string" },
    { key: "customer_code", label: "Customer Code", required: true, type: "string" },
    { key: "latitude", label: "Latitude", type: "number" },
    { key: "longitude", label: "Longitude", type: "number" },
    { key: "address", label: "Address", type: "string" },
    { key: "province", label: "Province", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "business_model", label: "Business Model", type: "string" },
    { key: "site_status", label: "Site Status", type: "string" },
  ],

  products: [
    { key: "code", label: "Product Code", required: true, type: "string" },
    { key: "name", label: "Product Name", required: true, type: "string" },
    { key: "category", label: "Category", type: "string" },
    { key: "uom", label: "UOM", required: true, type: "string" },
    { key: "description", label: "Description", type: "string" },
  ],

  vendors: [
    { key: "code", label: "Vendor Code", required: true, type: "string" },
    { key: "name", label: "Vendor Name", required: true, type: "string" },
    { key: "type", label: "Type", type: "string" },
    { key: "tax_no", label: "Tax No", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "contact_person", label: "Contact Person", type: "string" },
    { key: "address", label: "Address", type: "string" },
  ],

  transporters: [
    { key: "code", label: "Code", required: true, type: "string" },
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "vehicle_type", label: "Vehicle Type", type: "string" },
    { key: "plate_number", label: "Plate Number", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
  ],

  contracts: [
    { key: "code", label: "Contract Code", required: true, type: "string" },
    { key: "name", label: "Contract Name", required: true, type: "string" },
    { key: "customer_code", label: "Customer Code", required: true, type: "string" },
    { key: "site_code", label: "Site Code", type: "string" },
    { key: "contract_number", label: "Contract Number", type: "string" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "end_date", label: "End Date", type: "date" },
    { key: "value", label: "Value", type: "number" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "notes", label: "Notes", type: "string" },
  ],

  orders: [
    { key: "order_number", label: "Order Number", required: true, type: "string" },
    { key: "po_number", label: "PO Number", type: "string" },
    { key: "po_date", label: "PO Date", type: "date" },
    { key: "customer_code", label: "Customer Code", required: true, type: "string" },
    { key: "site_code", label: "Site Code", type: "string" },
    { key: "contract_code", label: "Contract Code", type: "string" },
    { key: "business_model", label: "Business Model", type: "string" },
    { key: "order_type", label: "Order Type", type: "string" },
    { key: "project_code", label: "Project Code", type: "string" },
    { key: "project_name", label: "Project Name", type: "string" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "exchange_rate", label: "Exchange Rate", type: "number" },
    { key: "selling_value", label: "Selling Value", type: "number" },
    { key: "total_direct_cost", label: "Total Direct Cost", type: "number" },
    { key: "margin", label: "Margin", type: "number" },
    { key: "status", label: "Status", type: "string" },
    { key: "po_status", label: "PO Status", type: "string" },
    { key: "current_stage", label: "Current Stage", type: "string" },
    { key: "remarks", label: "Remarks", type: "string" },
  ],

  order_items: [
    { key: "order_number", label: "Order Number", required: true, type: "string" },
    { key: "product_code", label: "Product Code", required: true, type: "string" },
    { key: "qty", label: "Qty", required: true, type: "number" },
    { key: "uom", label: "UOM", type: "string" },
    { key: "unit_price", label: "Unit Price", type: "number" },
    { key: "unit_price_idr", label: "Unit Price IDR", type: "number" },
    { key: "unit_cost", label: "Unit Cost", type: "number" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "exchange_rate", label: "Exchange Rate", type: "number" },
    { key: "line_value", label: "Line Value", type: "number" },
    { key: "line_type", label: "Line Type", type: "string" },
    { key: "margin_type", label: "Margin Type", type: "string" },
    { key: "description", label: "Description", type: "string" },
  ],

  procurements: [
    { key: "procurement_number", label: "Procurement Number", required: true, type: "string" },
    { key: "order_number", label: "Order Number", required: true, type: "string" },
    { key: "vendor_code", label: "Vendor Code", type: "string" },
    { key: "vendor_po", label: "Vendor PO", type: "string" },
    { key: "reference_date", label: "Reference Date", type: "date" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "material_cost", label: "Material Cost", type: "number" },
    { key: "status", label: "Status", type: "string" },
    { key: "remarks", label: "Remarks", type: "string" },
  ],

  procurement_items: [
    { key: "procurement_number", label: "Procurement Number", required: true, type: "string" },
    { key: "product_code", label: "Product Code", required: true, type: "string" },
    { key: "qty", label: "Qty", required: true, type: "number" },
    { key: "uom", label: "UOM", type: "string" },
    { key: "unit_price", label: "Unit Price", type: "number" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "exchange_rate", label: "Exchange Rate", type: "number" },
    { key: "line_value", label: "Line Value", type: "number" },
    { key: "description", label: "Description", type: "string" },
  ],

  shipments: [
    { key: "shipment_number", label: "Shipment Number", required: true, type: "string" },
    { key: "order_number", label: "Order Number", required: true, type: "string" },
    { key: "shipment_date", label: "Shipment Date", type: "date" },
    { key: "transporter_code", label: "Transporter Code", type: "string" },
    { key: "origin", label: "Origin", type: "string" },
    { key: "destination", label: "Destination", type: "string" },
    { key: "transport_cost", label: "Transport Cost", type: "number" },
    { key: "status", label: "Status", type: "string" },
    { key: "remarks", label: "Remarks", type: "string" },
  ],

  basts: [
    { key: "bast_number", label: "BAST Number", required: true, type: "string" },
    { key: "order_number", label: "Order Number", required: true, type: "string" },
    { key: "bast_date", label: "BAST Date", type: "date" },
    { key: "receiver_name", label: "Receiver Name", type: "string" },
    { key: "signed_by", label: "Signed By", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "remarks", label: "Remarks", type: "string" },
  ],
  
    deliveries: [
    { key: "delivery_number", label: "Delivery Number", required: true, type: "string" },
    { key: "order_number", label: "Order Number", required: true, type: "string" },
    { key: "shipment_number", label: "Shipment Number", required: true, type: "string" },
    { key: "delivery_date", label: "Delivery Date", required: true, type: "date" },
    { key: "receiving_party", label: "Receiving Party", type: "string" },
    { key: "delivery_note", label: "Delivery Note", type: "string" },
    { key: "location", label: "Location", type: "string" },
    { key: "remarks", label: "Remarks", type: "string" },
    { key: "status", label: "Status", type: "string" },
  ],

  invoices: [
    { key: "invoice_number", label: "Invoice Number", required: true, type: "string" },
    { key: "invoice_ref", label: "Invoice Ref", type: "string" },
    { key: "order_number", label: "Order Number", required: true, type: "string" },
    { key: "customer_code", label: "Customer Code", required: true, type: "string" },
    { key: "invoice_type", label: "Invoice Type", type: "string" },
    { key: "invoice_date", label: "Invoice Date", required: true, type: "date" },
    { key: "due_date", label: "Due Date", type: "date" },
    { key: "payment_term_days", label: "Payment Term (days)", type: "number" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "exchange_rate", label: "Exchange Rate", type: "number" },
    { key: "amount", label: "Amount (DPP)", type: "number" },
    { key: "tax_rate", label: "Tax Rate (%)", type: "number" },
    { key: "tax_amount", label: "Tax Amount", type: "number" },
    { key: "amount_with_tax", label: "Amount + Tax", type: "number" },
    { key: "amount_idr", label: "Amount IDR", type: "number" },
    { key: "paid_amount", label: "Paid Amount", type: "number" },
    { key: "status", label: "Status", type: "string" },
    { key: "notes", label: "Notes", type: "string" },
  ],
};

// ============================================================
// NORMALIZE / AUTO-MATCH (tidak berubah)
// ============================================================
function normalizeHeader(s: string): string {
  return String(s ?? "")
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_\-\.]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function autoMatchHeaders(
  headers: string[],
  entityType: EntityType
): Record<string, string> {
  const fields = ENTITY_FIELDS[entityType];
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const norm = normalizeHeader(header);
    let matched = false;

    for (const field of fields) {
      if (norm === normalizeHeader(field.key)) { mapping[header] = field.key; matched = true; break; }
      if (norm === normalizeHeader(field.label)) { mapping[header] = field.key; matched = true; break; }
      for (const alias of field.aliases ?? []) {
        if (norm === normalizeHeader(alias)) { mapping[header] = field.key; matched = true; break; }
      }
      if (matched) break;
    }

    if (!matched) {
      for (const field of fields) {
        const candidates = [field.key, field.label, ...(field.aliases ?? [])].map(normalizeHeader);
        if (candidates.some((c) => c.length >= 4 && (norm.includes(c) || c.includes(norm)))) {
          mapping[header] = field.key;
          matched = true;
          break;
        }
      }
    }

    if (!matched) mapping[header] = "";
  }

  return mapping;
}