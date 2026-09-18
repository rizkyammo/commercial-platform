export type CoverageContribution = {
  procurement_id: string;
  procurement_number: string;
  vendor_name: string;
  status: string;
  qty: number;
};

export type CoverageItem = {
  product_id: string;
  product_name: string;
  product_code: string;
  uom: string;
  ordered: number;
  procured_all: number;
  procured_verified: number;
  fully_procured: boolean;
  fully_verified: boolean;
  contributions: CoverageContribution[];
};

export type ProcurementCoverage = {
  items: CoverageItem[];
  all_covered: boolean;
  all_verified: boolean;
};