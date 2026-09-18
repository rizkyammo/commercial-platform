"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  issueInvoice,
  sendInvoice,
  recordPayment,
  cancelInvoice,
} from "@/features/invoicing/actions";

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
  amount: number;
  tax_rate: number;
  tax_amount: number;
  amount_with_tax: number;
  amount_idr: number;
  paid_amount: number;
  status: string;
  issued_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  created_at: string;
  customers?: {
    id: string;
    code: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  orders?: {
    id: string;
    order_number: string;
    po_number: string | null;
    business_model: string;
  } | null;
  items: {
    id: string;
    product_id: string | null;
    description: string | null;
    qty: number;
    uom: string;
    unit_price: number;
    line_value: number;
    products?: { id: string; code: string; name: string; uom: string } | null;
  }[];
  payments: {
    id: string;
    payment_date: string;
    amount: number;
    currency: string;
    reference: string | null;
    notes: string | null;
    created_at: string;
  }[];
};

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
    maximumFractionDigits: 2,
  })}`;
}

// ============================ MAIN ============================

export function InvoiceDetail({
  invoice,
  currentUserId,
  permissions,
}: {
  invoice: Invoice;
  currentUserId: string;
  permissions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Permission gates
  const canIssue = hasAny(
    permissions,
    ["INVOICE_ISSUE", "INVOICE_MANAGE"],
    ["ORDER_APPROVE"]
  );
  const canPay = hasAny(
    permissions,
    ["INVOICE_PAYMENT", "INVOICE_MANAGE"],
    ["ORDER_APPROVE"]
  );
  const canCancel = hasAny(
    permissions,
    ["INVOICE_CANCEL", "INVOICE_MANAGE"],
    ["ORDER_APPROVE"]
  );
  const canEdit = hasAny(
    permissions,
    ["INVOICE_CREATE", "INVOICE_MANAGE"],
    ["ORDER_APPROVE", "ORDER_UPDATE_DRAFT"]
  );

  // Modal states
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: 0,
    currency: invoice.currency,
    reference: "",
    notes: "",
  });

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const outstanding =
    Number(invoice.amount_with_tax) - Number(invoice.paid_amount);
  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";
  const isDraft = invoice.status === "DRAFT";

  // Revisi allowed: belum ada payment & status bukan PAID/CANCELLED
  const revisable =
    canEdit &&
    !isPaid &&
    !isCancelled &&
    Number(invoice.paid_amount) === 0;

  // ============================ ACTIONS ============================
  function doAction(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function openPaymentModal() {
    setPaymentForm({
      payment_date: new Date().toISOString().slice(0, 10),
      amount: outstanding,
      currency: invoice.currency,
      reference: "",
      notes: "",
    });
    setError(null);
    setShowPayment(true);
  }

  function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await recordPayment(invoice.id, paymentForm);
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowPayment(false);
      router.refresh();
    });
  }

  function submitCancel() {
    setError(null);
    startTransition(async () => {
      const r = await cancelInvoice(invoice.id, cancelReason);
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowCancel(false);
      setCancelReason("");
      router.refresh();
    });
  }

  // ============================ RENDER ============================
  return (
    <>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/invoicing"
              className="text-sm text-[#6E6E73] hover:text-[#1D1D1F]"
            >
              ← Invoicing
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">
              {invoice.invoice_number}
            </h1>
            <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
            <Badge tone="grey">{invoice.invoice_type}</Badge>
            {invoice.invoice_ref && (
              <span className="text-sm text-[#6E6E73]">
                Ref: {invoice.invoice_ref}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#6E6E73]">
            {invoice.customers?.name}
            {invoice.orders && (
              <>
                {" · "}
                <Link
                  href={`/orders/${invoice.orders.id}`}
                  className="text-[#0A84FF] hover:underline"
                >
                  {invoice.orders.order_number}
                </Link>
                {" · "}
                <span>{invoice.orders.business_model}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* EDIT / REVISI */}
          {revisable && (
            <Link href={`/invoicing/${invoice.id}/edit`}>
              <Button variant="secondary">Edit Invoice</Button>
            </Link>
          )}

          {/* ISSUE (DRAFT → ISSUED) */}
          {isDraft && canIssue && (
            <Button
              onClick={() => doAction(() => issueInvoice(invoice.id))}
              disabled={pending}
            >
              {pending ? "Issuing..." : "Issue Invoice"}
            </Button>
          )}

          {/* SEND (ISSUED → SENT) */}
          {invoice.status === "ISSUED" && canIssue && (
            <Button
              onClick={() => doAction(() => sendInvoice(invoice.id))}
              disabled={pending}
            >
              {pending ? "Sending..." : "Mark as Sent"}
            </Button>
          )}

          {/* RECORD PAYMENT */}
          {!isDraft && !isCancelled && !isPaid && canPay && (
            <Button onClick={openPaymentModal} disabled={pending}>
              + Record Payment
            </Button>
          )}

          {/* CANCEL */}
          {!isPaid && !isCancelled && canCancel && (
            <Button
              variant="secondary"
              onClick={() => setShowCancel(true)}
              disabled={pending}
            >
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {/* REVISABLE INFO BANNER */}
      {revisable && !isDraft && (
        <div className="mb-6 text-sm bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#A15C00] rounded-lg px-4 py-3">
          <div className="font-medium">Invoice dapat direvisi</div>
          <div className="mt-1 text-xs">
            Invoice ini belum memiliki payment. Anda dapat mengedit isi invoice
            — setelah disimpan, status akan kembali ke DRAFT dan perlu di-issue
            ulang.
          </div>
        </div>
      )}

      {/* CANCELLED BANNER */}
      {isCancelled && (
        <div className="mb-6 text-sm bg-[#FF3B30]/8 border border-[#FF3B30]/30 text-[#B71C1C] rounded-lg px-4 py-3">
          <div className="font-medium">Invoice dibatalkan</div>
          {invoice.cancel_reason && (
            <div className="mt-1">{invoice.cancel_reason}</div>
          )}
          {invoice.cancelled_at && (
            <div className="mt-1 text-xs opacity-75">
              {new Date(invoice.cancelled_at).toLocaleString("id-ID")}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* ITEMS */}
          <div className="bg-white border border-[#E5E5EA] rounded-xl">
            <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <h2 className="font-semibold">Invoice Items</h2>
              <span className="text-xs text-[#6E6E73]">
                {invoice.items.length} item
                {invoice.items.length === 1 ? "" : "s"}
              </span>
            </div>
            {invoice.items.length === 0 ? (
              <div className="p-6 text-sm text-[#6E6E73] text-center">
                Belum ada item.
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Product / Description</TH>
                    <TH className="text-right">Qty</TH>
                    <TH>UOM</TH>
                    <TH className="text-right">Unit Price</TH>
                    <TH className="text-right">Line Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {invoice.items.map((it) => (
                    <TR key={it.id}>
                      <TD>
                        <div className="font-medium">
                          {it.products?.name ?? it.description ?? "—"}
                        </div>
                        {it.description &&
                          it.products?.name &&
                          it.description !== it.products.name && (
                            <div className="text-xs text-[#8E8E93]">
                              {it.description}
                            </div>
                          )}
                      </TD>
                      <TD className="text-right font-mono text-xs">
                        {Number(it.qty).toLocaleString("id-ID")}
                      </TD>
                      <TD>{it.uom}</TD>
                      <TD className="text-right font-mono text-xs">
                        {fmt(Number(it.unit_price), invoice.currency)}
                      </TD>
                      <TD className="text-right font-mono text-xs">
                        {fmt(Number(it.line_value), invoice.currency)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}

            {/* Totals footer */}
            <div className="px-6 py-4 border-t border-[#E5E5EA] flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">DPP:</span>
                  <span className="font-mono">
                    {fmt(Number(invoice.amount), invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">
                    Tax ({invoice.tax_rate}%):
                  </span>
                  <span className="font-mono">
                    {fmt(Number(invoice.tax_amount), invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E5E5EA] pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-mono font-medium">
                    {fmt(Number(invoice.amount_with_tax), invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-[#34C759]">
                  <span>Paid:</span>
                  <span className="font-mono">
                    {fmt(Number(invoice.paid_amount), invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E5E5EA] pt-2">
                  <span
                    className={
                      outstanding > 0 ? "text-[#FF3B30] font-medium" : ""
                    }
                  >
                    Outstanding:
                  </span>
                  <span
                    className={`font-mono font-medium ${
                      outstanding > 0 ? "text-[#FF3B30]" : "text-[#34C759]"
                    }`}
                  >
                    {fmt(outstanding, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PAYMENTS */}
          <div className="bg-white border border-[#E5E5EA] rounded-xl">
            <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <h2 className="font-semibold">Payments</h2>
              <span className="text-xs text-[#6E6E73]">
                {invoice.payments.length} payment
                {invoice.payments.length === 1 ? "" : "s"}
              </span>
            </div>
            {invoice.payments.length === 0 ? (
              <div className="p-6 text-sm text-[#6E6E73] text-center">
                Belum ada payment.
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Reference</TH>
                    <TH className="text-right">Amount</TH>
                    <TH>Notes</TH>
                  </TR>
                </THead>
                <TBody>
                  {invoice.payments.map((p) => (
                    <TR key={p.id}>
                      <TD className="text-xs">{p.payment_date}</TD>
                      <TD className="text-xs">{p.reference ?? "—"}</TD>
                      <TD className="text-right font-mono text-xs text-[#34C759]">
                        {fmt(Number(p.amount), p.currency)}
                      </TD>
                      <TD className="text-xs text-[#6E6E73]">
                        {p.notes ?? "—"}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>

          {invoice.notes && (
            <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-2">
                Notes
              </h2>
              <div className="text-sm">{invoice.notes}</div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          {/* CUSTOMER */}
          <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-4">
              Bill To
            </h2>
            <div className="text-sm space-y-1">
              <div className="font-medium">
                {invoice.customers?.name ?? "—"}
              </div>
              {invoice.customers?.code && (
                <div className="text-xs text-[#8E8E93] font-mono">
                  {invoice.customers.code}
                </div>
              )}
              {invoice.customers?.address && (
                <div className="text-xs text-[#6E6E73] mt-2">
                  {invoice.customers.address}
                </div>
              )}
              {invoice.customers?.email && (
                <div className="text-xs text-[#6E6E73]">
                  {invoice.customers.email}
                </div>
              )}
              {invoice.customers?.phone && (
                <div className="text-xs text-[#6E6E73]">
                  {invoice.customers.phone}
                </div>
              )}
            </div>
          </div>

          {/* DATES */}
          <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-4">
              Dates
            </h2>
            <div className="space-y-3 text-sm">
              <Row label="Invoice Date" value={invoice.invoice_date} />
              <Row label="Due Date" value={invoice.due_date ?? "—"} />
              <Row
                label="Payment Term"
                value={`${invoice.payment_term_days} days`}
              />
              <Row
                label="Issued"
                value={
                  invoice.issued_at
                    ? new Date(invoice.issued_at).toLocaleString("id-ID")
                    : "—"
                }
              />
              <Row
                label="Sent"
                value={
                  invoice.sent_at
                    ? new Date(invoice.sent_at).toLocaleString("id-ID")
                    : "—"
                }
              />
              <Row
                label="Paid"
                value={
                  invoice.paid_at
                    ? new Date(invoice.paid_at).toLocaleString("id-ID")
                    : "—"
                }
              />
            </div>
          </div>

          {/* FINANCIAL SUMMARY */}
          <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-4">
              Financial Summary
            </h2>
            <div className="space-y-3 text-sm">
              <Row
                label="Currency"
                value={`${invoice.currency} (× ${invoice.exchange_rate})`}
              />
              <Row
                label="DPP"
                value={fmt(Number(invoice.amount), invoice.currency)}
              />
              <Row
                label={`Tax (${invoice.tax_rate}%)`}
                value={fmt(Number(invoice.tax_amount), invoice.currency)}
              />
              <Row
                label="Total w/ Tax"
                value={fmt(Number(invoice.amount_with_tax), invoice.currency)}
              />
              <Row
                label="In IDR"
                value={`IDR ${Number(invoice.amount_idr).toLocaleString(
                  "id-ID"
                )}`}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* PAYMENT MODAL */}
      <Modal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title="Record Payment"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPayment(false)}>
              Cancel
            </Button>
            <Button
              form="pay-form"
              type="submit"
              disabled={pending || paymentForm.amount <= 0}
            >
              {pending ? "Saving..." : "Record"}
            </Button>
          </>
        }
      >
        <form id="pay-form" onSubmit={submitPayment} className="space-y-4">
          <div className="text-sm bg-[#F6F6F7] border border-[#E5E5EA] rounded-lg p-3">
            <div className="flex justify-between">
              <span className="text-[#6E6E73]">Outstanding:</span>
              <span className="font-mono font-medium">
                {fmt(outstanding, invoice.currency)}
              </span>
            </div>
          </div>

          <FormField label="Payment Date" required>
            <Input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  payment_date: e.target.value,
                })
              }
              required
            />
          </FormField>

          <FormField label="Amount" required>
            <Input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  amount: Number(e.target.value) || 0,
                })
              }
              required
            />
          </FormField>

          <FormField label="Reference">
            <Input
              value={paymentForm.reference}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  reference: e.target.value,
                })
              }
              placeholder="No. transfer / cek / dll"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              rows={2}
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, notes: e.target.value })
              }
            />
          </FormField>

          {error && (
            <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Invoice"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancel(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={submitCancel}
              disabled={pending || cancelReason.trim().length < 5}
            >
              {pending ? "Cancelling..." : "Cancel Invoice"}
            </Button>
          </>
        }
      >
        <FormField label="Alasan pembatalan" required>
          <Textarea
            rows={4}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Minimal 5 karakter..."
          />
        </FormField>
        <p className="mt-3 text-xs text-[#8E8E73]">
          Invoice tidak dapat dibatalkan jika sudah ada payment. Hubungi
          Finance untuk adjustment.
        </p>
      </Modal>
    </>
  );
}

// ============================ SUB-COMPONENTS ============================

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#6E6E73] shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}