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
  | "order_items";

export type BatchStatus =
  | "UPLOADED"
  | "MAPPED"
  | "VALIDATED"
  | "COMMITTED"
  | "PARTIAL"
  | "FAILED"
  | "ROLLED_BACK";

export type RowStatus =
  | "PENDING"
  | "VALID"
  | "WARNING"
  | "ERROR"
  | "COMMITTED"
  | "SKIPPED";

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

// ============================================================
// FIELD DEFINITIONS PER ENTITY
// ============================================================
export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type: "string" | "number" | "date" | "boolean" | "email";
  aliases?: string[]; // untuk auto-match header
};

export const ENTITY_FIELDS: Record<EntityType, FieldDef[]> = {
  // ============================================================
  // CUSTOMERS
  // ============================================================
  customers: [
    { key: "code", label: "Customer Code", required: true, type: "string", aliases: ["kode", "kode_customer", "customer_code", "cust_code"] },
    { key: "name", label: "Customer Name", required: true, type: "string", aliases: ["nama", "nama_customer", "customer_name", "nama_perusahaan"] },
    { key: "type", label: "Type", type: "string", aliases: ["tipe", "jenis"] },
    { key: "tax_no", label: "Tax No", type: "string", aliases: ["npwp", "tax_id", "nobp"] },
    { key: "address", label: "Address", type: "string", aliases: ["alamat"] },
    { key: "phone", label: "Phone", type: "string", aliases: ["telepon", "telp", "no_telp", "no_hp"] },
    { key: "email", label: "Email", type: "email", aliases: ["email_address", "e-mail", "surel"] },
    { key: "industry", label: "Industry", type: "string", aliases: ["industri", "bidang"] },
    { key: "payment_term_days", label: "Payment Term (days)", type: "number", aliases: ["top", "term", "payment_term", "tempo"] },
    { key: "credit_limit", label: "Credit Limit", type: "number", aliases: ["limit", "credit", "limit_kredit"] },
    { key: "pic_name", label: "PIC Name", type: "string", aliases: ["pic", "contact_person", "contact", "nama_pic"] },
    { key: "notes", label: "Notes", type: "string", aliases: ["keterangan", "catatan"] },
  ],

  // ============================================================
  // SITES
  // ============================================================
  sites: [
    { key: "code", label: "Site Code", required: true, type: "string", aliases: ["kode", "kode_site", "site_code"] },
    { key: "name", label: "Site Name", required: true, type: "string", aliases: ["nama", "nama_site", "site_name"] },
    { key: "customer_code", label: "Customer Code", required: true, type: "string", aliases: ["kode_customer", "customer", "customer_code"] },
    { key: "latitude", label: "Latitude", type: "number", aliases: ["lat"] },
    { key: "longitude", label: "Longitude", type: "number", aliases: ["lng", "long", "lon"] },
    { key: "address", label: "Address", type: "string", aliases: ["alamat"] },
    { key: "province", label: "Province", type: "string", aliases: ["provinsi", "propinsi"] },
    { key: "city", label: "City", type: "string", aliases: ["kota", "kabupaten", "kab"] },
    { key: "business_model", label: "Business Model", type: "string", aliases: ["model_bisnis", "model"] },
    { key: "site_status", label: "Site Status", type: "string", aliases: ["status", "status_site"] },
  ],

  // ============================================================
  // PRODUCTS
  // ============================================================
  products: [
    { key: "code", label: "Product Code", required: true, type: "string", aliases: ["kode", "kode_produk", "product_code", "sku"] },
    { key: "name", label: "Product Name", required: true, type: "string", aliases: ["nama", "nama_produk", "product_name"] },
    { key: "category", label: "Category", type: "string", aliases: ["kategori"] },
    { key: "uom", label: "UOM", required: true, type: "string", aliases: ["satuan", "unit", "sat"] },
    { key: "description", label: "Description", type: "string", aliases: ["deskripsi", "keterangan"] },
  ],

  // ============================================================
  // VENDORS
  // ============================================================
  vendors: [
    { key: "code", label: "Vendor Code", required: true, type: "string", aliases: ["kode", "kode_vendor", "vendor_code"] },
    { key: "name", label: "Vendor Name", required: true, type: "string", aliases: ["nama", "nama_vendor", "vendor_name"] },
    { key: "type", label: "Type", type: "string", aliases: ["tipe"] },
    { key: "tax_no", label: "Tax No", type: "string", aliases: ["npwp"] },
    { key: "email", label: "Email", type: "email", aliases: [] },
    { key: "phone", label: "Phone", type: "string", aliases: ["telepon", "telp"] },
    { key: "contact_person", label: "Contact Person", type: "string", aliases: ["pic", "contact"] },
    { key: "address", label: "Address", type: "string", aliases: ["alamat"] },
  ],

  // ============================================================
  // TRANSPORTERS
  // ============================================================
  transporters: [
    { key: "code", label: "Code", required: true, type: "string", aliases: ["kode", "kode_transporter"] },
    { key: "name", label: "Name", required: true, type: "string", aliases: ["nama", "nama_transporter"] },
    { key: "vehicle_type", label: "Vehicle Type", type: "string", aliases: ["tipe_kendaraan"] },
    { key: "plate_number", label: "Plate Number", type: "string", aliases: ["plat", "plat_nomor", "nopol", "no_polisi"] },
    { key: "phone", label: "Phone", type: "string", aliases: ["telepon", "telp"] },
  ],

  // ============================================================
  // CONTRACTS
  // ============================================================
  contracts: [
    { key: "code", label: "Contract Code", required: true, type: "string", aliases: ["kode", "kode_kontrak", "contract_code"] },
    { key: "name", label: "Contract Name", required: true, type: "string", aliases: ["nama", "nama_kontrak"] },
    { key: "customer_code", label: "Customer Code", required: true, type: "string", aliases: ["kode_customer", "customer"] },
    { key: "site_code", label: "Site Code", type: "string", aliases: ["kode_site", "site"] },
    { key: "contract_number", label: "Contract Number", type: "string", aliases: ["no_kontrak", "nomor", "no"] },
    { key: "start_date", label: "Start Date", type: "date", aliases: ["tanggal_mulai", "tgl_mulai", "start"] },
    { key: "end_date", label: "End Date", type: "date", aliases: ["tanggal_selesai", "tgl_selesai", "end"] },
    { key: "value", label: "Value", type: "number", aliases: ["nilai", "contract_value", "amount"] },
    { key: "currency", label: "Currency", type: "string", aliases: ["mata_uang", "curr"] },
    { key: "status", label: "Status", type: "string", aliases: [] },
    { key: "notes", label: "Notes", type: "string", aliases: ["keterangan", "catatan"] },
  ],

  // ============================================================
  // ORDERS
  // ============================================================
  orders: [
    { key: "po_number", label: "PO Number", required: true, type: "string", aliases: ["no_po", "po_no", "po"] },
    { key: "po_date", label: "PO Date", type: "date", aliases: ["tanggal_po", "tgl_po"] },
    { key: "customer_code", label: "Customer Code", required: true, type: "string", aliases: ["kode_customer"] },
    { key: "site_code", label: "Site Code", required: true, type: "string", aliases: ["kode_site"] },
    { key: "contract_code", label: "Contract Code", type: "string", aliases: ["kode_kontrak"] },
    { key: "business_model", label: "Business Model", type: "string", aliases: ["model_bisnis"] },
    { key: "currency", label: "Currency", type: "string", aliases: ["mata_uang"] },
    { key: "exchange_rate", label: "Exchange Rate", type: "number", aliases: ["kurs"] },
    { key: "remarks", label: "Remarks", type: "string", aliases: ["keterangan", "catatan"] },
  ],

  // ============================================================
  // ORDER ITEMS
  // ============================================================
  order_items: [
    { key: "po_number", label: "PO Number", required: true, type: "string", aliases: ["no_po", "po"] },
    { key: "product_code", label: "Product Code", required: true, type: "string", aliases: ["kode_produk"] },
    { key: "qty", label: "Qty", required: true, type: "number", aliases: ["quantity", "jumlah", "qty_order"] },
    { key: "uom", label: "UOM", type: "string", aliases: ["satuan"] },
    { key: "unit_price", label: "Unit Price", type: "number", aliases: ["harga", "harga_satuan", "price"] },
    { key: "currency", label: "Currency", type: "string", aliases: ["mata_uang"] },
    { key: "description", label: "Description", type: "string", aliases: ["keterangan"] },
  ],
};

// ============================================================
// NORMALIZE HEADER
// ============================================================
function normalizeHeader(s: string): string {
  return String(s ?? "")
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_\-\.]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// ============================================================
// AUTO-MATCH
// ============================================================
export function autoMatchHeaders(
  headers: string[],
  entityType: EntityType
): Record<string, string> {
  const fields = ENTITY_FIELDS[entityType];
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    // FIX: kalau header mengandung koma/semicolon (gabungan), split dulu
    const parts = String(header)
      .split(/[,;|\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Kalau cuma 1 → match biasa
    // Kalau > 1 → match setiap part, tapi tetap simpan key = header asli
    // (untuk fallback — tidak akan terjadi kalau parse benar)

    const norm = normalizeHeader(header);
    let matched = false;

    for (const field of fields) {
      if (norm === normalizeHeader(field.key)) {
        mapping[header] = field.key;
        matched = true;
        break;
      }
      if (norm === normalizeHeader(field.label)) {
        mapping[header] = field.key;
        matched = true;
        break;
      }
      for (const alias of field.aliases ?? []) {
        if (norm === normalizeHeader(alias)) {
          mapping[header] = field.key;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    // Fuzzy match
    if (!matched) {
      for (const field of fields) {
        const candidates = [field.key, field.label, ...(field.aliases ?? [])].map(
          normalizeHeader
        );
        if (
          candidates.some(
            (c) => c.length >= 4 && (norm.includes(c) || c.includes(norm))
          )
        ) {
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