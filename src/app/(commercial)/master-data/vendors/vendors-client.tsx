"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { FormField } from "@/components/ui/form-field";
import { createVendor, updateVendor, deleteVendor } from "@/features/master/vendors/actions";
import type { VendorInput } from "@/lib/validation/master";

type Row = { id: string; code: string; name: string; type: string | null; email: string | null; phone: string | null; contact_person: string | null; is_active: boolean };
const empty: VendorInput = { code: "", name: "", type: "", tax_no: "", address: "", phone: "", email: "", contact_person: "", is_active: true };

export function VendorsClient({ rows, total, page, totalPages, q }: { rows: Row[]; total: number; page: number; totalPages: number; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Row | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<VendorInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);

  function buildHref(p: number) {
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  }
  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams();
    const nq = String(fd.get("q") ?? "");
    if (nq) sp.set("q", nq);
    router.push(`${pathname}?${sp.toString()}`);
  }
  function openCreate() { setEditing(null); setForm(empty); setError(null); setOpenForm(true); }
  function openEdit(r: Row) {
    setEditing(r);
    setForm({ code: r.code, name: r.name, type: r.type ?? "", tax_no: "", address: "", phone: r.phone ?? "", email: r.email ?? "", contact_person: r.contact_person ?? "", is_active: r.is_active });
    setError(null); setOpenForm(true);
  }
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    startTransition(async () => {
      const result = editing ? await updateVendor(editing.id, form) : await createVendor(form);
      if (result.error) { setError(result.error); return; }
      setOpenForm(false); router.refresh();
    });
  }
  function onDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteVendor(confirmDelete.id);
      setConfirmDelete(null); router.refresh();
    });
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
        <div className="p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2">
            <Input name="q" defaultValue={q} placeholder="Search by code, name, or email..." className="max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <Button onClick={openCreate}>+ Add Vendor</Button>
        </div>
        <Table>
          <THead>
            <TR><TH>Code</TH><TH>Name</TH><TH>Type</TH><TH>Contact</TH><TH>Email</TH><TH>Status</TH><TH></TH></TR>
          </THead>
          <TBody>
            {rows.length === 0 && <TR><TD colSpan={7} className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-10">No vendors found.</TD></TR>}
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">{r.code}</TD>
                <TD className="font-medium">{r.name}</TD>
                <TD>{r.type ?? "—"}</TD>
                <TD>{r.contact_person ?? "—"}</TD>
                <TD className="text-[#6E6E73] dark:text-[#8E8E93]">{r.email ?? "—"}</TD>
                <TD><Badge tone={r.is_active ? "green" : "grey"}>{r.is_active ? "Active" : "Inactive"}</Badge></TD>
                <TD className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(r)} className="text-[#FF3B30]">Delete</Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <Pagination currentPage={page} totalPages={totalPages} total={total} pageSize={10} buildHref={buildHref} />
      </div>

      <Modal
        open={openForm} onClose={() => setOpenForm(false)}
        title={editing ? "Edit Vendor" : "Add Vendor"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button form="vendor-form" type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Save" : "Create"}</Button>
          </>
        }
      >
        <form id="vendor-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Code" required><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></FormField>
          <FormField label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Type"><Input value={form.type ?? ""} onChange={(e) => setForm({ ...form, type: e.target.value })} /></FormField>
          <FormField label="Tax No."><Input value={form.tax_no ?? ""} onChange={(e) => setForm({ ...form, tax_no: e.target.value })} /></FormField>
          <FormField label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Contact Person"><Input value={form.contact_person ?? ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></FormField>
          <div className="md:col-span-2"><FormField label="Address"><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></FormField></div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input id="vend-active" type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="vend-active" className="text-sm">Active</label>
          </div>
          {error && <div className="md:col-span-2 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">{error}</div>}
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}
        title="Delete Vendor" width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} disabled={pending}>Delete</Button>
          </>
        }
      >
        <p className="text-sm">Yakin ingin menghapus <span className="font-semibold">{confirmDelete?.name}</span>?</p>
      </Modal>
    </>
  );
}