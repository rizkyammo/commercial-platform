"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import {
  createBastDraft,
  updateBast,
  submitBast,
  verifyBast,
  completeBast,
  deleteBast,
  getBastDocumentUrl,
} from "@/features/flow/actions";

type Bast = {
  id: string;
  bast_number: string;
  bast_date: string | null;
  receiver_name: string | null;
  signed_by: string | null;
  signed_document_path: string | null;
  remarks: string | null;
  status: string;
};

type FormState = {
  bast_date: string;
  receiver_name: string;
  signed_by: string;
  signed_document_path: string;
  remarks: string;
};

const empty: FormState = {
  bast_date: "",
  receiver_name: "",
  signed_by: "",
  signed_document_path: "",
  remarks: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

export function BastTab({
  orderId,
  basts,
  permissions,
  canCreate,
}: {
  orderId: string;
  basts: Bast[];
  permissions: string[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const hasCreate = permissions.includes("BAST_CREATE");
  const hasVerify = permissions.includes("BAST_VERIFY");

  function openCreate() {
    setEditingId(null);
    setForm({
      ...empty,
      bast_date: new Date().toISOString().slice(0, 10),
    });
    setUploadedName(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(b: Bast) {
    setEditingId(b.id);
    setForm({
      bast_date: b.bast_date ?? "",
      receiver_name: b.receiver_name ?? "",
      signed_by: b.signed_by ?? "",
      signed_document_path: b.signed_document_path ?? "",
      remarks: b.remarks ?? "",
    });
    setUploadedName(
      b.signed_document_path
        ? b.signed_document_path.split("/").pop() ?? null
        : null
    );
    setError(null);
    setOpen(true);
  }

  async function handleUpload(file: File) {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format file harus PDF, JPG, JPEG, atau PNG.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${orderId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { data, error: upErr } = await supabase.storage
        .from("bast-documents")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (upErr) {
        setError(`Upload gagal: ${upErr.message}`);
        return;
      }

      setForm((prev) => ({ ...prev, signed_document_path: data.path }));
      setUploadedName(file.name);
    } catch (e) {
      setError(`Upload error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
  }

  async function viewDocument(path: string) {
    const r = await getBastDocumentUrl(path);
    if (r.error) {
      alert(`Gagal membuka file: ${r.error}`);
      return;
    }
    if (r.url) window.open(r.url, "_blank");
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.signed_document_path) {
      setError("File scan BAST wajib diupload.");
      return;
    }

    startTransition(async () => {
      const payload = {
        bast_date: form.bast_date,
        receiver_name: form.receiver_name,
        signed_by: form.signed_by,
        signed_document_path: form.signed_document_path,
        remarks: form.remarks,
      };
      const r = editingId
        ? await updateBast(editingId, payload)
        : await createBastDraft(orderId, payload);
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function doAction(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">BAST</h2>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
            Berita Acara Serah Terima — wajib lampirkan scan dokumen.
          </p>
        </div>
        {hasCreate && canCreate && (
          <Button onClick={openCreate}>+ New BAST</Button>
        )}
        {!canCreate && (
          <div className="text-xs text-[#8E8E93] bg-[#F2F2F4] rounded-lg px-3 py-1.5 max-w-md">
            BAST hanya dapat dibuat setelah ada delivery yang tercatat.
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {basts.length === 0 ? (
        <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] text-center py-10 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
          {!canCreate
            ? "BAST hanya dapat dibuat setelah barang dikirim dan diterima."
            : !hasCreate
              ? "Anda tidak memiliki izin untuk membuat BAST."
              : "Belum ada BAST. Klik + New BAST."}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>No. BAST</TH>
                <TH>Date</TH>
                <TH>Penerima</TH>
                <TH>Signed By</TH>
                <TH>Dokumen</TH>
                <TH>Status</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {basts.map((b) => (
                <TR key={b.id}>
                  <TD className="font-mono text-xs">{b.bast_number}</TD>
                  <TD>{b.bast_date ?? "—"}</TD>
                  <TD>{b.receiver_name ?? "—"}</TD>
                  <TD>{b.signed_by ?? "—"}</TD>
                  <TD>
                    {b.signed_document_path ? (
                      <button
                        type="button"
                        onClick={() => viewDocument(b.signed_document_path!)}
                        className="text-[#0A84FF] text-xs hover:underline"
                      >
                        📎 Lihat File
                      </button>
                    ) : (
                      <span className="text-xs text-[#8E8E93]">—</span>
                    )}
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        b.status === "COMPLETED"
                          ? "green"
                          : b.status === "VERIFIED"
                            ? "blue"
                            : b.status === "SUBMITTED"
                              ? "blue"
                              : "grey"
                      }
                    >
                      {b.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {b.status === "DRAFT" && hasCreate && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(b)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => doAction(() => submitBast(b.id))}
                            disabled={pending}
                          >
                            Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#FF3B30]"
                            onClick={() => doAction(() => deleteBast(b.id))}
                            disabled={pending}
                          >
                            Del
                          </Button>
                        </>
                      )}
                      {b.status === "SUBMITTED" && hasVerify && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => doAction(() => verifyBast(b.id))}
                          disabled={pending}
                        >
                          Verify
                        </Button>
                      )}
                      {["SUBMITTED", "VERIFIED"].includes(b.status) &&
                        hasVerify && (
                          <Button
                            size="sm"
                            onClick={() => doAction(() => completeBast(b.id))}
                            disabled={pending}
                          >
                            Complete
                          </Button>
                        )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit BAST" : "New BAST"}
        width="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              form="bast-form"
              type="submit"
              disabled={pending || uploading || !form.signed_document_path}
            >
              {pending ? "Saving..." : editingId ? "Save" : "Save Draft"}
            </Button>
          </>
        }
      >
        <form id="bast-form" onSubmit={submitForm} className="space-y-4">
          <FormField label="Tanggal BAST" required>
            <Input
              type="date"
              value={form.bast_date}
              onChange={(e) => setForm({ ...form, bast_date: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Nama Penerima" required>
            <Input
              value={form.receiver_name}
              onChange={(e) =>
                setForm({ ...form, receiver_name: e.target.value })
              }
              placeholder="Nama lengkap penerima"
              required
            />
          </FormField>

          <FormField label="Ditandatangani Oleh">
            <Input
              value={form.signed_by}
              onChange={(e) => setForm({ ...form, signed_by: e.target.value })}
              placeholder="Jabatan / nama penandatangan"
            />
          </FormField>

          <FormField label="File Scan BAST" required>
            {form.signed_document_path ? (
              <div className="flex items-center justify-between border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg px-3 py-2 bg-[#F6F6F7]">
                <div className="flex items-center gap-2 text-sm truncate">
                  <span>📎</span>
                  <span className="truncate">
                    {uploadedName ?? "File terupload"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => viewDocument(form.signed_document_path)}
                    className="text-xs text-[#0A84FF] hover:underline"
                  >
                    Lihat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, signed_document_path: "" });
                      setUploadedName(null);
                    }}
                    className="text-xs text-[#FF3B30] hover:underline"
                  >
                    Ganti
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg p-4 text-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={onFileChange}
                  className="hidden"
                  id="bast-file"
                />
                <label
                  htmlFor="bast-file"
                  className="cursor-pointer inline-block"
                >
                  <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
                    {uploading
                      ? "Mengunggah..."
                      : "Klik untuk upload file scan BAST"}
                  </div>
                  <div className="mt-1 text-[11px] text-[#8E8E93]">
                    PDF / JPG / PNG · maks 5 MB
                  </div>
                </label>
              </div>
            )}
          </FormField>

          <FormField label="Remarks">
            <Textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </FormField>

          {error && (
            <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}