"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { FormField } from "@/components/ui/form-field";
import { createSite, updateSite, deleteSite } from "@/features/master/sites/actions";
import type { SiteInput } from "@/lib/validation/master";

type SiteRow = {
  id: string;
  code: string;
  name: string;
  customer_id: string;
  latitude: number | null;
  longitude: number | null;
  province: string | null;
  city: string | null;
  business_model: string | null;
  site_status: string;
  is_active: boolean;
  customers?: { name: string } | null;
};

type CustomerOption = { id: string; code: string; name: string };

const empty: SiteInput = {
  code: "",
  name: "",
  customer_id: "",
  latitude: null,
  longitude: null,
  address: "",
  province: "",
  city: "",
  business_model: "Direct Sale",
  site_status: "Active",
  notes: "",
  is_active: true,
};

export function SitesClient({
  rows, customers, total, page, totalPages, q, customerId,
}: {
  rows: SiteRow[];
  customers: CustomerOption[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
  customerId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState<SiteRow | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<SiteInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SiteRow | null>(null);

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
    const nc = String(fd.get("customer") ?? "");
    if (nq) sp.set("q", nq);
    if (nc) sp.set("customer", nc);
    router.push(`${pathname}?${sp.toString()}`);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, customer_id: customers[0]?.id ?? "" });
    setError(null);
    setOpenForm(true);
  }

  function openEdit(r: SiteRow) {
    setEditing(r);
    setForm({
      code: r.code,
      name: r.name,
      customer_id: r.customer_id,
      latitude: r.latitude,
      longitude: r.longitude,
      address: "",
      province: r.province ?? "",
      city: r.city ?? "",
      business_model: r.business_model ?? "",
      site_status: r.site_status,
      notes: "",
      is_active: r.is_active,
    });
    setError(null);
    setOpenForm(true);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        latitude: form.latitude === null || form.latitude === undefined || (form.latitude as unknown as string) === "" ? null : Number(form.latitude),
        longitude: form.longitude === null || form.longitude === undefined || (form.longitude as unknown as string) === "" ? null : Number(form.longitude),
      };
      const result = editing ? await updateSite(editing.id, payload) : await createSite(payload);
      if (result.error) { setError(result.error); return; }
      setOpenForm(false);
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteSite(confirmDelete.id);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
        <div className="p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2 flex-wrap">
            <Input name="q" defaultValue={q} placeholder="Search by code or name..." className="max-w-sm" />
            <Select name="customer" defaultValue={customerId} className="max-w-[220px]">
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
          <Button onClick={openCreate} disabled={customers.length === 0}>+ Add Site</Button>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Name</TH>
              <TH>Customer</TH>
              <TH>Business Model</TH>
              <TH>Location</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 && (
              <TR><TD colSpan={7} className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-10">No sites found.</TD></TR>
            )}
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">{r.code}</TD>
                <TD className="font-medium">{r.name}</TD>
                <TD className="text-[#6E6E73] dark:text-[#8E8E93]">{r.customers?.name ?? "—"}</TD>
                <TD>{r.business_model ?? "—"}</TD>
                <TD className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                  {r.latitude !== null && r.longitude !== null
                    ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}`
                    : "—"}
                </TD>
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
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editing ? "Edit Site" : "Add Site"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button form="site-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : editing ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <form id="site-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Code" required>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
          </FormField>
          <FormField label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Customer" required>
              <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                <option value="">— Select Customer —</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            </FormField>
          </div>
          <FormField label="Latitude">
            <Input type="number" step="0.0000001" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value === "" ? null : Number(e.target.value) })} />
          </FormField>
          <FormField label="Longitude">
            <Input type="number" step="0.0000001" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value === "" ? null : Number(e.target.value) })} />
          </FormField>
          <FormField label="Province">
            <Input value={form.province ?? ""} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          </FormField>
          <FormField label="City">
            <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </FormField>
          <FormField label="Business Model">
            <Select value={form.business_model ?? ""} onChange={(e) => setForm({ ...form, business_model: e.target.value })}>
              <option value="">—</option>
              <option value="Direct Sale">Direct Sale</option>
              <option value="Consignment">Consignment</option>
              <option value="Call-Off">Call-Off</option>
              <option value="Full Payment">Full Payment</option>
            </Select>
          </FormField>
          <FormField label="Site Status">
            <Select value={form.site_status} onChange={(e) => setForm({ ...form, site_status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Prospect">Prospect</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Address">
              <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </FormField>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} id="site-active" />
            <label htmlFor="site-active" className="text-sm">Active</label>
          </div>
          {error && (
            <div className="md:col-span-2 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">{error}</div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete Site"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} disabled={pending}>{pending ? "Deleting..." : "Delete"}</Button>
          </>
        }
      >
        <p className="text-sm">Yakin ingin menghapus <span className="font-semibold">{confirmDelete?.name}</span>?</p>
      </Modal>
    </>
  );
}