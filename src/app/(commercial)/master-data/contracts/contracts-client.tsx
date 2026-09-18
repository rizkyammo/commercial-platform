"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { FormField } from "@/components/ui/form-field";
import { createContract, updateContract, deleteContract } from "@/features/master/contracts/actions";
import { createClient } from "@/lib/supabase/client";
import type { ContractInput } from "@/lib/validation/master";

type ContractRow = {
  id: string;
  code: string;
  name: string;
  customer_id: string;
  site_id: string | null;
  contract_number: string | null;
  start_date: string | null;
  end_date: string | null;
  value: number;
  currency: string;
  status: string;
  is_active: boolean;
  customers?: { name: string } | null;
  sites?: { name: string } | null;
};
type CustomerOption = { id: string; code: string; name: string };
type SiteOption = { id: string; code: string; name: string };

const empty: ContractInput = {
  code: "", name: "", customer_id: "", site_id: "", contract_number: "",
  start_date: "", end_date: "", value: 0, currency: "IDR", status: "Draft",
  notes: "", is_active: true,
  fulfillment_model: "DIRECT_DELIVERY", billing_model: "FULL", pricing_model: "FIXED_IDR",
  payment_model: "", logistics_model: "INCLUDED",
  requires_bast: true, requires_compliance: true, requires_consumption_report: false,
  requires_customer_approval: false, invoice_trigger: "", revenue_recognition_trigger: "",
  payment_term_days: 30,
};

export function ContractsClient({
  rows, customers, total, page, totalPages, q,
}: {
  rows: ContractRow[]; customers: CustomerOption[]; total: number; page: number; totalPages: number; q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ContractRow | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<ContractInput>(empty);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContractRow | null>(null);

  useEffect(() => {
    if (!form.customer_id) { setSites([]); return; }
    const supabase = createClient();
    supabase.from("sites").select("id, code, name").eq("customer_id", form.customer_id).eq("is_active", true).order("name")
      .then(({ data }) => setSites(data ?? []));
  }, [form.customer_id]);

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
  function openCreate() {
    setEditing(null);
    setForm({ ...empty, customer_id: customers[0]?.id ?? "" });
    setError(null); setOpenForm(true);
  }
  function openEdit(r: ContractRow) {
    setEditing(r);
    setForm({
      ...empty, code: r.code, name: r.name, customer_id: r.customer_id, site_id: r.site_id ?? "",
      contract_number: r.contract_number ?? "",
      start_date: r.start_date ?? "", end_date: r.end_date ?? "",
      value: Number(r.value), currency: r.currency, status: r.status, is_active: r.is_active,
    });
    setError(null); setOpenForm(true);
  }
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    startTransition(async () => {
      const result = editing ? await updateContract(editing.id, form) : await createContract(form);
      if (result.error) { setError(result.error); return; }
      setOpenForm(false); router.refresh();
    });
  }
  function onDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteContract(confirmDelete.id);
      setConfirmDelete(null); router.refresh();
    });
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
        <div className="p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2">
            <Input name="q" defaultValue={q} placeholder="Search by code, name, or contract number..." className="max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <Button onClick={openCreate} disabled={customers.length === 0}>+ Add Contract</Button>
        </div>
        <Table>
          <THead>
            <TR><TH>Code</TH><TH>Name</TH><TH>Customer</TH><TH>Site</TH><TH>Period</TH><TH>Status</TH><TH></TH></TR>
          </THead>
          <TBody>
            {rows.length === 0 && <TR><TD colSpan={7} className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-10">No contracts found.</TD></TR>}
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">{r.code}</TD>
                <TD className="font-medium">{r.name}</TD>
                <TD>{r.customers?.name ?? "—"}</TD>
                <TD>{r.sites?.name ?? "—"}</TD>
                <TD className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                  {r.start_date ?? "—"} → {r.end_date ?? "—"}
                </TD>
                <TD><Badge tone="blue">{r.status}</Badge></TD>
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
        title={editing ? "Edit Contract" : "Add Contract"}
        width="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button form="contract-form" type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Save" : "Create"}</Button>
          </>
        }
      >
        <form id="contract-form" onSubmit={onSubmit} className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-3">Contract</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Code" required><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></FormField>
              <FormField label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
              <FormField label="Customer" required>
                <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value, site_id: "" })} required>
                  <option value="">— Select —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Site">
                <Select value={form.site_id ?? ""} onChange={(e) => setForm({ ...form, site_id: e.target.value })}>
                  <option value="">— None —</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Contract Number"><Input value={form.contract_number ?? ""} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} /></FormField>
              <FormField label="Currency">
                <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="IDR">IDR</option>
                  <option value="USD">USD</option>
                </Select>
              </FormField>
              <FormField label="Start Date"><Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></FormField>
              <FormField label="End Date"><Input type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></FormField>
              <FormField label="Value"><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></FormField>
              <FormField label="Status">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Closed">Closed</option>
                </Select>
              </FormField>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-3">Business Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Fulfillment Model">
                <Select value={form.fulfillment_model} onChange={(e) => setForm({ ...form, fulfillment_model: e.target.value as ContractInput["fulfillment_model"] })}>
                  <option value="DIRECT_DELIVERY">Direct Delivery</option>
                  <option value="CONSIGNMENT">Consignment</option>
                  <option value="CALL_OFF">Call-Off</option>
                  <option value="STOCK_REPLENISHMENT">Stock Replenishment</option>
                </Select>
              </FormField>
              <FormField label="Billing Model">
                <Select value={form.billing_model} onChange={(e) => setForm({ ...form, billing_model: e.target.value as ContractInput["billing_model"] })}>
                  <option value="FULL">Full</option>
                  <option value="PER_SHIPMENT">Per Shipment</option>
                  <option value="MONTHLY_USAGE">Monthly Usage</option>
                  <option value="MILESTONE">Milestone</option>
                  <option value="PROGRESSIVE">Progressive</option>
                  <option value="MANUAL">Manual</option>
                </Select>
              </FormField>
              <FormField label="Pricing Model">
                <Select value={form.pricing_model} onChange={(e) => setForm({ ...form, pricing_model: e.target.value as ContractInput["pricing_model"] })}>
                  <option value="FIXED_IDR">Fixed IDR</option>
                  <option value="FIXED_USD">Fixed USD</option>
                  <option value="USD_X_EXCHANGE_RATE">USD × Exchange Rate</option>
                  <option value="INDEXED">Indexed</option>
                  <option value="TIERED">Tiered</option>
                </Select>
              </FormField>
              <FormField label="Logistics Model">
                <Select value={form.logistics_model} onChange={(e) => setForm({ ...form, logistics_model: e.target.value as ContractInput["logistics_model"] })}>
                  <option value="INCLUDED">Included</option>
                  <option value="SEPARATE_COST">Separate Cost</option>
                  <option value="CUSTOMER_TRANSPORT">Customer Transport</option>
                  <option value="THIRD_PARTY">Third Party</option>
                </Select>
              </FormField>
              <FormField label="Payment Term (days)">
                <Input type="number" value={form.payment_term_days} onChange={(e) => setForm({ ...form, payment_term_days: Number(e.target.value) })} />
              </FormField>
              <FormField label="Payment Model">
                <Input value={form.payment_model ?? ""} onChange={(e) => setForm({ ...form, payment_model: e.target.value })} />
              </FormField>
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["requires_bast", "Requires BAST"],
                  ["requires_compliance", "Requires Compliance"],
                  ["requires_consumption_report", "Requires Consumption Report"],
                  ["requires_customer_approval", "Requires Customer Approval"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(form[key as keyof ContractInput])}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="contract-active" type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="contract-active" className="text-sm">Active</label>
          </div>

          {error && <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">{error}</div>}
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}
        title="Delete Contract" width="max-w-md"
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