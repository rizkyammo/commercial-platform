"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  createInvoice,
  updateInvoice,
  issueInvoice,
  deleteInvoice,
} from "@/features/invoicing/actions";
import {
  getDefaultInvoiceType,
  BILLING_MODELS,
  type InvoiceType,
} from "@/lib/constants/billing-models";

// ============================ TYPES ============================

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_ref: string | null;
  invoice_type: string;
  invoice_date: string;
  due_date: string | null;
  payment_term_days: number;
  currency: string;
  exchange_rate: number;
  tax_rate: number;
  notes: string | null;
  amount: number;
  amount_with_tax: number;
  paid_amount: number;
  status: string;
};

type OrderItemRef = {
  product_id: string;
  product_name: string;
  uom: string;
  qty: number;
  unit_price: number;
};

type InvoiceSummary = {
  selling: number;
  totalInvoiced: number;
  totalWithTax: number;
  totalPaid: number;
  outstanding: number;
  uninvoiced: number;
  overdueCount: number;
  invoiceCount: number;
  currency: string;
};

type DraftLine = {
  _key: string;
  product_id: string;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
};

const ISSUED_STATUSES = ["ISSUED", "SENT", "PARTIAL_PAID", "PAID", "OVERDUE"];

// ============================ HELPERS ============================

function hasAny(perms: string[], codes: string[], fallback: string[] = []) {
  if (codes.some((c) => perms.includes(c))) return true;
  if (fallback.some((c) => perms.includes(c))) return true;
  return false;
}

function statusTone(
  s: string
): "green" | "blue" | "grey" | "red" | "orange" {
  if (s === "PAID") return "green";
  if (s === "PARTIAL_PAID") return "orange";
  if (s === "OVERDUE") return "red";
  if (s === "ISSUED" || s === "SENT") return "blue";
  return "grey";
}

function fmt(n: number, currency: string) {
  return `${currency} ${Number(n).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  })}`;
}

// ============================ MAIN ============================

export function InvoiceTab({
  orderId,
  businessModel,
  orderStatus,
  orderCurrency,
  orderItems,
  invoices,
  summary,
  permissions,
}: {
  orderId: string;
  businessModel: string;
  orderStatus: string;
  orderCurrency: string;
  orderItems: OrderItemRef[];
  invoices: Invoice[];
  summary: InvoiceSummary;
  permissions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    invoice_ref: "",
    invoice_type: getDefaultInvoiceType(businessModel),
    invoice_date: new Date().toISOString().slice(0, 10),
    payment_term_days: 30,
    currency: orderCurrency,
    exchange_rate: 1,
    tax_rate: 11,
    notes: "",
  });
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ============================ PERMISSIONS ============================
  const canCreate = hasAny(
    permissions,
    ["INVOICE_CREATE", "INVOICE_MANAGE"],
    ["ORDER_APPROVE", "ORDER_UPDATE_DRAFT"]
  );
  const canIssue = hasAny(
    permissions,
    ["INVOICE_ISSUE", "INVOICE_MANAGE"],
    ["ORDER_APPROVE"]
  );

  const orderApproved = ![
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
  ].includes(orderStatus);

  const canCreateNow = canCreate && orderApproved;

  const defaultType = getDefaultInvoiceType(businessModel);
  const billingInfo = BILLING_MODELS[defaultType];

  // ============================ METRICS ============================
  // Hanya invoice yang SUDAH TERBIT yang dihitung outstanding & issued
  const issuedInvoices = invoices.filter((i) =>
    ISSUED_STATUSES.includes(i.status)
  );

  const draftInvoices = invoices.filter((i) => i.status === "DRAFT");

  const selling = Number(summary.selling) || 0;
  const totalIssued = issuedInvoices.reduce(
    (a, i) => a + Number(i.amount),
    0
  );
  const totalPaid = issuedInvoices.reduce(
    (a, i) => a + Number(i.paid_amount),
    0
  );

  // Outstanding = Issued − Paid (hanya invoice terbit)
  const outstanding = Math.max(0, totalIssued - totalPaid);

  // Uninvoiced = Order Value − Issued (mencakup yang belum dibuat & masih DRAFT)
  const uninvoiced = Math.max(0, selling - totalIssued);

  const draftAmount = draftInvoices.reduce(
    (a, i) => a + Number(i.amount),
    0
  );

  // Percentages vs order value
  const pctPaid = selling > 0 ? Math.min(100, (totalPaid / selling) * 100) : 0;
  const pctOutstanding =
    selling > 0 ? Math.min(100, (outstanding / selling) * 100) : 0;
  const pctUninvoiced = Math.max(0, 100 - pctPaid - pctOutstanding);

  // Overdue
  const overdueInvoices = issuedInvoices.filter((i) => i.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce(
    (a, i) => a + (Number(i.amount_with_tax) - Number(i.paid_amount)),
    0
  );

  // ============================ ACTIONS ============================
  function prefillFromOrder(): DraftLine[] {
    return orderItems.map((it, idx) => ({
      _key: `ln-${Date.now()}-${idx}`,
      product_id: it.product_id,
      description: it.product_name,
      qty: it.qty,
      uom: it.uom,
      unit_price: it.unit_price,
    }));
  }

  function openCreate() {
    setForm({
      invoice_ref: "",
      invoice_type: defaultType,
      invoice_date: new Date().toISOString().slice(0, 10),
      payment_term_days: 30,
      currency: orderCurrency,
      exchange_rate: 1,
      tax_rate: 11,
      notes: "",
    });
    setDraftLines(prefillFromOrder());
    setEditingId(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditingId(inv.id);
    setForm({
      invoice_ref: inv.invoice_ref ?? "",
      invoice_type: inv.invoice_type,
      invoice_date: inv.invoice_date,
      payment_term_days: inv.payment_term_days,
      currency: inv.currency,
      exchange_rate: Number(inv.exchange_rate),
      tax_rate: Number(inv.tax_rate),
      notes: inv.notes ?? "",
    });
    setDraftLines(prefillFromOrder());
    setError(null);
    setOpen(true);
  }

  function addLine() {
    setDraftLines((prev) => [
      ...prev,
      {
        _key: `ln-${Date.now()}-${prev.length}`,
        product_id: orderItems[0]?.product_id ?? "",
        description: "",
        qty: 0,
        uom: orderItems[0]?.uom ?? "MT",
        unit_price: 0,
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setDraftLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, ...patch } : l))
    );
  }

  function removeLine(key: string) {
    setDraftLines((prev) => prev.filter((l) => l._key !== key));
  }

  function resetLinesFromOrder() {
    setDraftLines(prefillFromOrder());
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        items: draftLines.map(({ _key, ...rest }) => rest),
      };
      const r = editingId
        ? await updateInvoice(editingId, payload)
        : await createInvoice(orderId, payload);
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setEditingId(null);
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

  const draftTotal = draftLines.reduce((a, l) => a + l.qty * l.unit_price, 0);
  const draftTax = (draftTotal * form.tax_rate) / 100;
  const draftTotalWithTax = draftTotal + draftTax;

  // ============================ RENDER ============================
  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Invoicing</h2>
          <p className="text-sm text-[#6E6E73]">
            Outstanding hanya dari invoice yang sudah terbit.
          </p>
        </div>
        {canCreateNow && (
          <Button onClick={openCreate}>+ New Invoice</Button>
        )}
        {!canCreateNow && (
          <div className="text-xs text-[#8E8E93] bg-[#F2F2F4] rounded-lg px-3 py-1.5 max-w-md">
            {!orderApproved
              ? "Invoice hanya dapat dibuat setelah order di-approve."
              : !canCreate
                ? "Anda tidak memiliki izin untuk membuat invoice."
                : "Invoice belum dapat dibuat."}
          </div>
        )}
      </div>

      {/* BUSINESS MODEL BILLING INFO */}
      <div className="mb-4 bg-[#EAF2FB] border border-[#0A84FF]/30 rounded-xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#6E6E73]">Business Model:</span>
          <span className="text-sm font-medium">{businessModel}</span>
          <span className="text-xs text-[#8E8E93] mx-1">→</span>
          <span className="text-xs text-[#6E6E73]">Default Billing:</span>
          <Badge tone="blue">{defaultType}</Badge>
        </div>
        {billingInfo && (
          <div className="mt-2 text-xs text-[#6E6E73]">
            {billingInfo.description} ·{" "}
            <span className="text-[#0A84FF]">
              Auto trigger: {billingInfo.autoTrigger}
            </span>
          </div>
        )}
      </div>

      {/* ============================ PROGRESS ============================ */}
      <div className="mb-4 bg-white border border-[#E5E5EA] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Invoicing Progress</div>
            <div className="text-xs text-[#6E6E73] mt-0.5">
              Outstanding = Issued − Paid · Uninvoiced = Order Value − Issued
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6E6E73] uppercase tracking-wide">
              Outstanding
            </div>
            <div className="text-lg font-semibold text-[#FF3B30]">
              {fmt(outstanding, summary.currency)}
            </div>
          </div>
        </div>

        {/* Stacked progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#6E6E73]">
              Composition vs Order Value ({fmt(selling, summary.currency)})
            </span>
            <span className="font-medium">{pctPaid.toFixed(1)}% paid</span>
          </div>
          <div className="w-full h-3 bg-[#F2F2F4] rounded-full overflow-hidden flex">
            <div
              className="bg-[#34C759] transition-all"
              style={{ width: `${pctPaid}%` }}
              title={`Paid ${pctPaid.toFixed(1)}%`}
            />
            <div
              className="bg-[#FF3B30] transition-all"
              style={{ width: `${pctOutstanding}%` }}
              title={`Outstanding ${pctOutstanding.toFixed(1)}%`}
            />
            <div
              className="bg-[#FF9500] transition-all"
              style={{ width: `${pctUninvoiced}%` }}
              title={`Uninvoiced ${pctUninvoiced.toFixed(1)}%`}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-[#6E6E73] flex-wrap">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#34C759]" />
              Paid ({fmt(totalPaid, summary.currency)})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF3B30]" />
              Outstanding ({fmt(outstanding, summary.currency)})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500]" />
              Uninvoiced ({fmt(uninvoiced, summary.currency)})
            </span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <MiniStat
            label="Order Value"
            value={fmt(selling, summary.currency)}
          />
          <MiniStat
            label="Issued"
            value={fmt(totalIssued, summary.currency)}
            hint={`${issuedInvoices.length} invoice terbit`}
            tone="blue"
          />
          <MiniStat
            label="Paid"
            value={fmt(totalPaid, summary.currency)}
            hint={`${pctPaid.toFixed(0)}% of order`}
            tone="green"
          />
          <MiniStat
            label="Outstanding"
            value={fmt(outstanding, summary.currency)}
            hint={
              overdueInvoices.length > 0
                ? `${overdueInvoices.length} overdue`
                : "dari invoice terbit"
            }
            tone={outstanding > 0 ? "red" : "neutral"}
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            <div className="text-[10px] text-[#B71C1C] uppercase tracking-wide">
              Outstanding (Issued, belum paid)
            </div>
            <div className="text-sm font-mono font-medium text-[#B71C1C] mt-0.5">
              {fmt(outstanding, summary.currency)}
            </div>
          </div>
          <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg px-3 py-2">
            <div className="text-[10px] text-[#A15C00] uppercase tracking-wide">
              Uninvoiced (belum terbit)
            </div>
            <div className="text-sm font-mono font-medium text-[#A15C00] mt-0.5">
              {fmt(uninvoiced, summary.currency)}
            </div>
          </div>
          <div className="bg-[#F6F6F7] border border-[#E5E5EA] rounded-lg px-3 py-2">
            <div className="text-[10px] text-[#6E6E73] uppercase tracking-wide">
              Draft invoices (belum terbit)
            </div>
            <div className="text-sm font-mono font-medium text-[#6E6E73] mt-0.5">
              {fmt(draftAmount, summary.currency)} ·{" "}
              {draftInvoices.length} invoice
            </div>
          </div>
        </div>

        {overdueInvoices.length > 0 && (
          <div className="mt-3 text-xs text-[#B71C1C] bg-[#FF3B30]/8 border border-[#FF3B30]/30 rounded-lg px-3 py-2">
            {overdueInvoices.length} invoice overdue — total{" "}
            <strong>{fmt(overdueAmount, summary.currency)}</strong>
          </div>
        )}

        <div className="mt-4 text-xs text-[#6E6E73] bg-[#F6F6F7] border border-[#E5E5EA] rounded-lg px-3 py-2">
          <strong>Outstanding</strong> mencakup hanya invoice yang sudah
          diterbitkan (ISSUED/SENT/PARTIAL_PAID/OVERDUE). Invoice DRAFT
          dihitung sebagai <strong>uninvoiced</strong> karena belum menagih
          customer.
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* ============================ INVOICE LIST ============================ */}
      {invoices.length === 0 ? (
        <div className="text-sm text-[#6E6E73] text-center py-10 bg-white border border-[#E5E5EA] rounded-xl">
          {!canCreateNow
            ? "Belum ada invoice."
            : "Belum ada invoice. Klik + New Invoice."}
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>Invoice</TH>
                <TH>Type</TH>
                <TH>Date</TH>
                <TH>Due</TH>
                <TH className="text-right">Amount</TH>
                <TH className="text-right">Paid</TH>
                <TH>Status</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {invoices.map((inv) => {
                const hasPayment = Number(inv.paid_amount) > 0;
                const canEdit =
                  canCreate &&
                  (inv.status === "DRAFT" ||
                    (["ISSUED", "SENT"].includes(inv.status) && !hasPayment));

                return (
                  <TR key={inv.id}>
                    <TD>
                      <Link
                        href={`/invoicing/${inv.id}`}
                        className="font-medium hover:text-[#0A84FF]"
                      >
                        {inv.invoice_number}
                      </Link>
                      {inv.invoice_ref && (
                        <div className="text-xs text-[#8E8E93]">
                          {inv.invoice_ref}
                        </div>
                      )}
                    </TD>
                    <TD>
                      <Badge tone="grey">{inv.invoice_type}</Badge>
                    </TD>
                    <TD className="text-xs">{inv.invoice_date}</TD>
                    <TD className="text-xs">{inv.due_date ?? "—"}</TD>
                    <TD className="text-right font-mono text-xs">
                      {fmt(Number(inv.amount_with_tax), inv.currency)}
                    </TD>
                    <TD className="text-right font-mono text-xs text-[#34C759]">
                      {fmt(Number(inv.paid_amount), inv.currency)}
                    </TD>
                    <TD>
                      <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex gap-2 justify-end">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(inv)}
                            disabled={pending}
                          >
                            Edit
                          </Button>
                        )}
                        {inv.status === "DRAFT" && canIssue && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              doAction(() => issueInvoice(inv.id))
                            }
                            disabled={pending}
                          >
                            Issue
                          </Button>
                        )}
                        {inv.status === "DRAFT" && canCreate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#FF3B30]"
                            onClick={() =>
                              doAction(() => deleteInvoice(inv.id))
                            }
                            disabled={pending}
                          >
                            Del
                          </Button>
                        )}
                        <Link
                          href={`/invoicing/${inv.id}`}
                          className="text-[#0A84FF] text-xs hover:underline self-center"
                        >
                          Open
                        </Link>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}

      {/* ============================ FORM MODAL ============================ */}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
        }}
        title={editingId ? "Edit Invoice" : "New Invoice"}
        width="max-w-3xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button form="inv-form" type="submit" disabled={pending}>
              {pending
                ? "Saving..."
                : editingId
                  ? "Save Revision"
                  : "Save Draft"}
            </Button>
          </>
        }
      >
        <form id="inv-form" onSubmit={submitForm} className="space-y-4">
          {editingId && (
            <div className="text-xs text-[#A15C00] bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg px-3 py-2">
              Revisi invoice. Setelah disimpan, status akan kembali ke{" "}
              <strong>DRAFT</strong> dan perlu di-issue ulang.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Invoice Type" required>
              <Select
                value={form.invoice_type}
                onChange={(e) =>
                  setForm({ ...form, invoice_type: e.target.value })
                }
              >
                {Object.values(BILLING_MODELS).map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </Select>
              <div className="mt-1 text-xs text-[#8E8E93]">
                {BILLING_MODELS[form.invoice_type as InvoiceType]?.description}
              </div>
            </FormField>
            <FormField label="Invoice Ref (Finance)">
              <Input
                value={form.invoice_ref}
                onChange={(e) =>
                  setForm({ ...form, invoice_ref: e.target.value })
                }
                placeholder="Nomor invoice resmi"
              />
            </FormField>
            <FormField label="Invoice Date" required>
              <Input
                type="date"
                value={form.invoice_date}
                onChange={(e) =>
                  setForm({ ...form, invoice_date: e.target.value })
                }
                required
              />
            </FormField>
            <FormField label="Payment Term (days)">
              <Input
                type="number"
                value={form.payment_term_days}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_term_days: Number(e.target.value) || 0,
                  })
                }
              />
            </FormField>
            <FormField label="Tax Rate (%)">
              <Input
                type="number"
                step="0.01"
                value={form.tax_rate}
                onChange={(e) =>
                  setForm({ ...form, tax_rate: Number(e.target.value) || 0 })
                }
              />
            </FormField>
            <FormField label="Currency">
              <Select
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value })
                }
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </Select>
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <span className="text-sm font-medium">Items</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={resetLinesFromOrder}
                  title="Isi ulang dari order items"
                >
                  ↻ Reset dari Order
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={addLine}
                >
                  + Add
                </Button>
              </div>
            </div>
            {draftLines.length === 0 ? (
              <div className="text-sm text-[#6E6E73] text-center py-6 border border-dashed border-[#E5E5EA] rounded-lg">
                Belum ada item.
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Product</TH>
                    <TH>Qty</TH>
                    <TH>UOM</TH>
                    <TH>Unit Price</TH>
                    <TH className="text-right">Line</TH>
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {draftLines.map((ln) => (
                    <TR key={ln._key}>
                      <TD>
                        <Select
                          value={ln.product_id}
                          onChange={(e) => {
                            const p = orderItems.find(
                              (x) => x.product_id === e.target.value
                            );
                            updateLine(ln._key, {
                              product_id: e.target.value,
                              uom: p?.uom ?? ln.uom,
                              description: p?.product_name ?? ln.description,
                            });
                          }}
                        >
                          {orderItems.map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.product_name}
                            </option>
                          ))}
                        </Select>
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          step="0.01"
                          value={ln.qty}
                          onChange={(e) =>
                            updateLine(ln._key, {
                              qty: Number(e.target.value),
                            })
                          }
                          className="w-24"
                        />
                      </TD>
                      <TD>
                        <Input
                          value={ln.uom}
                          onChange={(e) =>
                            updateLine(ln._key, { uom: e.target.value })
                          }
                          className="w-16"
                        />
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          step="0.01"
                          value={ln.unit_price}
                          onChange={(e) =>
                            updateLine(ln._key, {
                              unit_price: Number(e.target.value),
                            })
                          }
                          className="w-32"
                        />
                      </TD>
                      <TD className="text-right font-mono text-xs">
                        {(ln.qty * ln.unit_price).toLocaleString("id-ID")}
                      </TD>
                      <TD className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => removeLine(ln._key)}
                          className="text-[#FF3B30]"
                        >
                          ×
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
            <div className="mt-3 flex justify-end">
              <div className="text-sm space-y-1">
                <div className="flex justify-between gap-6">
                  <span className="text-[#6E6E73]">DPP:</span>
                  <span className="font-mono">
                    {form.currency} {draftTotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-[#6E6E73]">
                    Tax ({form.tax_rate}%):
                  </span>
                  <span className="font-mono">
                    {form.currency} {draftTax.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between gap-6 border-t border-[#E5E5EA] pt-1">
                  <span className="font-medium">Total:</span>
                  <span className="font-mono font-medium">
                    {form.currency} {draftTotalWithTax.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <FormField label="Notes">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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

// ============================ SUB-COMPONENTS ============================

function MiniStat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "blue" | "green" | "red";
}) {
  const color =
    tone === "blue"
      ? "text-[#0A84FF]"
      : tone === "green"
        ? "text-[#34C759]"
        : tone === "red"
          ? "text-[#FF3B30]"
          : "text-[#1D1D1F]";
  return (
    <div className="bg-[#F6F6F7] border border-[#E5E5EA] rounded-lg p-3">
      <div className="text-[10px] text-[#6E6E73] uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-1 font-mono text-sm font-medium ${color}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-[#8E8E93] mt-0.5">{hint}</div>}
    </div>
  );
}