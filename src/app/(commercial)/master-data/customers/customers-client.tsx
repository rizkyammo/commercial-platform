"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { FormField } from "@/components/ui/form-field";
import { createCustomer, updateCustomer, deleteCustomer } from "@/features/master/customers/actions";
import type { CustomerInput } from "@/lib/validation/master";

type Row = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  payment_term_days: number;
  credit_limit: number;
  is_active: boolean;
  updated_at: string;
};

const empty: CustomerInput = {
  code: "",
  name: "",
  type: "",
  tax_no: "",
  address: "",
  phone: "",
  email: "",
  industry: "",
  payment_term_days: 30,
  credit_limit: 0,
  pic_name: "",
  notes: "",
  is_active: true,
};

export function CustomersClient({
  rows,
  total,
  page,
  totalPages,
  q,
  status,
}: {
  rows: Row[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState<Row | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<CustomerInput>(empty);
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
    const ns = String(fd.get("status") ?? "");
    if (nq) sp.set("q", nq);
    if (ns) sp.set("status", ns);
    router.push(`${pathname}?${sp.toString()}`);
  }

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError(null);
    setOpenForm(true);
  }

  function openEdit(r: Row) {
    setEditing(r);
    setForm({ ...empty, ...r } as CustomerInput);
    setError(null);
    setOpenForm(true);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        payment_term_days: Number(form.payment_term_days),
        credit_limit: Number(form.credit_limit),
        is_active: Boolean(form.is_active),
      };
      const result = editing
        ? await updateCustomer(editing.id, payload)
        : await createCustomer(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpenForm(false);
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteCustomer(confirmDelete.id);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
        <div className="p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2 flex-wrap">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by code, name, or email..."
              className="max-w-sm"
            />
            <Select name="status" defaultValue={status} className="max-w-[160px]">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
          <Button onClick={openCreate}>+ Add Customer</Button>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH>Term</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 && (
              <TR>
                <TD colSpan={7} className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-10">
                  No customers found.
                </TD>
              </TR>
            )}
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">{r.code}</TD>
                <TD>
                  <Link href={`/master-data/customers/${r.id}`} className="font-medium hover:text-[#0A84FF]">
                    {r.name}
                  </Link>
                </TD>
                <TD className="text-[#6E6E73] dark:text-[#8E8E93]">{r.email ?? "—"}</TD>
                <TD className="text-[#6E6E73] dark:text-[#8E8E93]">{r.phone ?? "—"}</TD>
                <TD>{r.payment_term_days}d</TD>
                <TD>
                  <Badge tone={r.is_active ? "green" : "grey"}>
                    {r.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(r)} className="text-[#FF3B30]">
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={10}
          buildHref={buildHref}
        />
      </div>

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editing ? "Edit Customer" : "Add Customer"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button form="customer-form" type="submit" disabled={pending}>
              {pending ? "Saving..." : editing ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Code" required>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="CUST-001"
              required
            />
          </FormField>
          <FormField label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Type">
            <Input value={form.type ?? ""} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </FormField>
          <FormField label="Industry">
            <Input value={form.industry ?? ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Tax No.">
            <Input value={form.tax_no ?? ""} onChange={(e) => setForm({ ...form, tax_no: e.target.value })} />
          </FormField>
          <FormField label="PIC Name">
            <Input value={form.pic_name ?? ""} onChange={(e) => setForm({ ...form, pic_name: e.target.value })} />
          </FormField>
          <FormField label="Payment Term (days)">
            <Input
              type="number"
              value={form.payment_term_days}
              onChange={(e) => setForm({ ...form, payment_term_days: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Credit Limit">
            <Input
              type="number"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Address">
              <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Notes">
              <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>

          {error && (
            <div className="md:col-span-2 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete Customer"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} disabled={pending}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Yakin ingin menghapus <span className="font-semibold">{confirmDelete?.name}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </>
  );
}