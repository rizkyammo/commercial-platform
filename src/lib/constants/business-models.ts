export type BusinessModel =
  | "Spot Sale"
  | "Term Supply Contract"
  | "Framework / Blanket Contract"
  | "Call-Off Supply"
  | "Consignment"
  | "Managed Inventory / VMI"
  | "Back-to-Back Supply"
  | "Dedicated Site Supply"
  | "Delivered Supply"
  | "Import-to-Order"
  | "Agency / Brand Distribution"
  | "Integrated Supply + Service";

export interface BusinessModelOption {
  value: BusinessModel;
  label: string;
  description: string;
  fit: string;
}

export const BUSINESS_MODELS: BusinessModelOption[] = [
  {
    value: "Spot Sale",
    label: "Spot Sale",
    description:
      "Customer mengirim PO untuk transaksi satu kali (one-off).",
    fit: "Customer tidak rutin",
  },
  {
    value: "Term Supply Contract",
    label: "Term Supply Contract",
    description:
      "Kontrak 6/12/24 bulan dengan volume dan harga tertentu.",
    fit: "Tambang rutin",
  },
  {
    value: "Framework / Blanket Contract",
    label: "Framework / Blanket Contract",
    description:
      "Ada kontrak induk, lalu customer menerbitkan call-off / release order.",
    fit: "Customer besar",
  },
  {
    value: "Call-Off Supply",
    label: "Call-Off Supply",
    description:
      "Barang dikirim sesuai permintaan bertahap dari kontrak induk.",
    fit: "Konsumsi tidak tetap",
  },
  {
    value: "Consignment",
    label: "Consignment",
    description:
      "Stok ditempatkan di lokasi yang disepakati dan pemakaian direkonsiliasi sesuai kontrak.",
    fit: "Site dengan konsumsi rutin",
  },
  {
    value: "Managed Inventory / VMI",
    label: "Managed Inventory / VMI",
    description:
      "Supplier memonitor level stok dan melakukan replenishment berdasarkan min-max.",
    fit: "Operasi kontinu",
  },
  {
    value: "Back-to-Back Supply",
    label: "Back-to-Back Supply",
    description:
      "Customer PO masuk → supplier melakukan procurement → langsung fulfillment.",
    fit: "Mengurangi inventory risk",
  },
  {
    value: "Dedicated Site Supply",
    label: "Dedicated Site Supply",
    description:
      "Kontrak khusus untuk satu site dengan volume, SLA, jadwal supply.",
    fit: "Tambang besar",
  },
  {
    value: "Delivered Supply",
    label: "Delivered Supply",
    description:
      "Harga penjualan mencakup produk dan komponen delivery yang diperbolehkan/diotorisasi.",
    fit: "Customer ingin landed price",
  },
  {
    value: "Import-to-Order",
    label: "Import-to-Order",
    description:
      "Pengadaan impor dilakukan berdasarkan demand/PO tertentu.",
    fit: "Produk yang tidak tersedia lokal",
  },
  {
    value: "Agency / Brand Distribution",
    label: "Agency / Brand Distribution",
    description:
      "Distributor menjadi channel suatu principal/producer.",
    fit: "Produk tertentu / eksklusif",
  },
  {
    value: "Integrated Supply + Service",
    label: "Integrated Supply + Service",
    description:
      "Supply material digabung dengan jasa teknis/peledakan.",
    fit: "Kontrak integrated service",
  },
];

export const DEFAULT_BUSINESS_MODEL: BusinessModel = "Spot Sale";

export function getBusinessModelInfo(model: string): BusinessModelOption | undefined {
  return BUSINESS_MODELS.find((b) => b.value === model);
}