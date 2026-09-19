"use client";

import { useState, useRef, useTransition } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { createMigrationBatch } from "@/features/migration/actions";
import type { EntityType } from "@/features/migration/types";

const ENTITIES: { key: EntityType; label: string; description: string }[] = [
  { key: "customers", label: "Customers", description: "Master data customer" },
  { key: "sites", label: "Sites", description: "Site / lokasi customer" },
  { key: "products", label: "Products", description: "Master data produk" },
  { key: "vendors", label: "Vendors", description: "Master data vendor" },
  { key: "transporters", label: "Transporters", description: "Perusahaan transporter" },
  { key: "contracts", label: "Contracts", description: "Kontrak + business rules" },
  { key: "orders", label: "Orders", description: "Header order / PO" },
  { key: "order_items", label: "Order Items", description: "Line item order" },
];

type Step = "setup" | "processing" | "done";

export function UploadWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("setup");
  const [pending, startTransition] = useTransition();
  const [entityType, setEntityType] = useState<EntityType>("customers");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    batchId: string;
    rows: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

async function parseFile(f: File): Promise<Record<string, unknown>[]> {
  const buf = await f.arrayBuffer();

  // ============================================================
  // CSV — PAPA PARSE dengan ARRAY MODE (paling robust)
  // ============================================================
  if (f.name.toLowerCase().endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;

    // Decode UTF-8 + strip BOM
    let text = new TextDecoder("utf-8").decode(buf);
    text = text.replace(/^\uFEFF/, "");

    // ============================================================
    // Parse sebagai ARRAY OF ARRAYS (header: false)
    // PapaParse auto-detect delimiter ( , ; \t | )
    // ============================================================
    const result = Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: "greedy",
      delimiter: "", // biar auto-detect
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      console.warn("[CSV parse warnings]", result.errors);
    }

    const rows = result.data;
    if (!rows || rows.length < 2) {
      console.warn("[CSV] File kosong atau cuma header");
      return [];
    }

    // Baris pertama = header
    const headers = rows[0].map((h) => String(h ?? "").trim());

    // Build plain objects manual
    const objects: Record<string, unknown>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const obj: Record<string, unknown> = {}; // plain object literal
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (!key) continue;
        const val = row[j];
        obj[key] = val === undefined || val === null ? "" : String(val);
      }
      objects.push(obj);
    }

    // Force-remove prototype chain via JSON serialization
    return JSON.parse(JSON.stringify(objects));
  }

  // ============================================================
  // XLSX / XLS — pakai XLSX library
  // ============================================================
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  // Force plain objects
  return JSON.parse(JSON.stringify(raw));
}

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.(xlsx?|csv)$/i, ""));
  }

  function onUpload() {
    if (!file) {
      setError("Pilih file dulu.");
      return;
    }
    setError(null);
    setStep("processing");

    startTransition(async () => {
      try {
        setProgress(10);
        const rows = await parseFile(file);
        setProgress(40);

        if (rows.length === 0) {
          setError("File kosong atau tidak ada baris data.");
          setStep("setup");
          return;
        }

        if (rows.length > 10000) {
          setError("File terlalu besar. Maksimal 10.000 baris per batch.");
          setStep("setup");
          return;
        }

        setProgress(60);
        const r = await createMigrationBatch({
          name: name || file.name,
          entity_type: entityType,
          file_name: file.name,
          file_size: file.size,
          rows,
        });

        if (r.error) {
          setError(r.error);
          setStep("setup");
          return;
        }

        setProgress(100);
        setResult({ batchId: r.data!.id, rows: rows.length });
        setStep("done");

        setTimeout(() => {
          onClose();
          window.location.href = `/admin/migration/${r.data!.id}`;
        }, 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStep("setup");
      }
    });
  }

  return (
    <Modal
      open
      onClose={step === "processing" ? () => {} : onClose}
      title="New Data Import"
      width="max-w-lg"
      footer={
        step === "setup" ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onUpload} disabled={pending || !file}>
              {pending ? "Uploading..." : "Upload & Preview"}
            </Button>
          </>
        ) : undefined
      }
    >
      {step === "setup" && (
        <div className="space-y-4">
          <FormField label="Entity Type" required>
            <Select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
            >
              {ENTITIES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label} — {e.description}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Batch Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Import Customers Q4 2026"
            />
          </FormField>

          <FormField label="File (XLSX, XLS, atau CSV)" required>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg p-6 text-center cursor-pointer hover:border-[#0A84FF] transition"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={onFileChange}
              />
              {file ? (
                <div className="text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-[#8E8E93] mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <svg
                    className="w-8 h-8 mx-auto text-[#8E8E93]"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M10 3v10M5 8l5-5 5 5M4 17h12" />
                  </svg>
                  <div className="text-sm mt-2">Klik untuk pilih file</div>
                  <div className="text-xs text-[#8E8E93] mt-1">
                    XLSX / XLS / CSV · Maks 10 MB · Maks 10.000 baris
                  </div>
                </div>
              )}
            </div>
          </FormField>

          <div className="text-xs text-[#8E8E93] bg-[#F6F6F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg p-3 leading-relaxed">
            File akan diupload ke <strong>staging area</strong>. Anda dapat
            mereview kolom, memperbaiki error, dan melihat preview sebelum
            commit ke database. <strong>Tidak ada data yang masuk ke tabel
            utama sampai Anda klik Commit.</strong>
          </div>

          {error && (
            <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      )}

      {step === "processing" && (
        <div className="py-8 text-center space-y-4">
          <div className="text-sm">Memproses file...</div>
          <div className="w-full h-2 bg-[#F2F2F4] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0A84FF] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-[#8E8E93]">{progress}%</div>
        </div>
      )}

      {step === "done" && result && (
        <div className="py-8 text-center space-y-3">
          <div className="text-4xl">✓</div>
          <div className="text-sm font-medium">
            {result.rows.toLocaleString("id-ID")} baris berhasil diupload
          </div>
          <div className="text-xs text-[#8E8E93]">
            Mengalihkan ke halaman review...
          </div>
        </div>
      )}
    </Modal>
  );
}