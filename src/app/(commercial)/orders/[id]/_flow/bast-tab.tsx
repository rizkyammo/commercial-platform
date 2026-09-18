"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  createBastDraft,
  updateBast,
  submitBast,
  verifyBast,
  completeBast,
  deleteBast,
} from "@/features/flow/actions";

type Bast = {
  id: string;
  bast_number: string;
  bast_date: string | null;
  receiver_name: string | null;
  signed_by: string | null;
  signed_document_ref: string | null;
  remarks: string | null;
  status: string;
};

const empty = {
  bast_date: "",
  receiver_name: "",
  signed_by: "",
  signed_document_ref: "",
  remarks: "",
};

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
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  const hasCreate = permissions.includes("BAST_CREATE");
  const hasVerify = permissions.includes("BAST_VERIFY");

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }

  function openEdit(b: Bast) {
    setEditingId(b.id);
    setForm({
      bast_date: b.bast_date ?? "",
      receiver_name: b.receiver_name ?? "",
      signed_by: b.signed_by ?? "",
      signed_document_ref: b.signed_document_ref ?? "",
      remarks: b.remarks ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = editingId
        ? await updateBast(editingId, form)
        : await createBastDraft(orderId, form);
      if (r.error) { setError(r.error); return; }
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">BAST</h2>
          <p className="text-sm text-[#6E6E73]">Berita Acara Serah Terima.</p>
        </div>
        {hasCreate && canCreate && (
          <Button onClick={openCreate}>+ New BAST</Button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {basts.length === 0 ? (
        <div className="text-sm text-[#6E6E73] text-center py-10 bg-white border border-[#E5E5EA] rounded-xl">
          Belum ada BAST.
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>No. BAST</TH>
                <TH>Date</TH>
                <TH>Receiver</TH>
                <TH>Signed By</TH>
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
                    <Badge tone={
                      b.status === "COMPLETED" ? "green"
                      : b.status === "VERIFIED" ? "blue"
                      : b.status === "SUBMITTED" ? "blue"
                      : "grey"
                    }>
                      {b.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {b.status === "DRAFT" && hasCreate && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>Edit</Button>
                          <Button size="sm" variant="secondary" onClick={() => doAction(() => submitBast(b.id))} disabled={pending}>Submit</Button>
                          <Button size="sm" variant="ghost" className="text-[#FF3B30]" onClick={() => doAction(() => deleteBast(b.id))} disabled={pending}>Del</Button>
                        </>
                      )}
                      {b.status === "SUBMITTED" && hasVerify && (
                        <Button size="sm" variant="secondary" onClick={() => doAction(() => verifyBast(b.id))} disabled={pending}>Verify</Button>
                      )}
                      {["SUBMITTED", "VERIFIED"].includes(b.status) && hasVerify && (
                        <Button size="sm" onClick={() => doAction(() => completeBast(b.id))} disabled={pending}>Complete</Button>
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
        title={editingId ? "Edit BAST" : "New BAST Draft"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="bast-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : editingId ? "Save" : "Save Draft"}
            </Button>
          </>
        }
      >
        <form id="bast-form" onSubmit={submitForm} className="space-y-4">
          <FormField label="BAST Date">
            <Input type="date" value={form.bast_date} onChange={(e) => setForm({ ...form, bast_date: e.target.value })} />
          </FormField>
          <FormField label="Receiver Name">
            <Input value={form.receiver_name} onChange={(e) => setForm({ ...form, receiver_name: e.target.value })} />
          </FormField>
          <FormField label="Signed By">
            <Input value={form.signed_by} onChange={(e) => setForm({ ...form, signed_by: e.target.value })} />
          </FormField>
          <FormField label="Signed Document Ref">
            <Input value={form.signed_document_ref} onChange={(e) => setForm({ ...form, signed_document_ref: e.target.value })} />
          </FormField>
          <FormField label="Remarks">
            <Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
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