"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { updateInvoice } from "@/features/invoicing/actions";
import {
  BILLING_MODELS,
  type InvoiceType,
} from "@/lib/constants/billing-models";

type DraftLine = {
  _key: string;
  product_id: string;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
};

export function InvoiceEditForm({
  invoice,
  orderItems,
  permissions,
}: {
  invoice: any;
  orderItems: {
    product_id: string;
    product_name: string;
    uom: string;
    qty: number;
    unit_price: number;
  }[];
  permissions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    invoice_ref: invoice.invoice_ref ?? "",
    invoice_type: invoice.invoice_type,
    invoice_date: invoice.invoice_date,
    payment_term_days: invoice.payment_term_days,
    currency: invoice.currency,
    exchange_rate: Number(invoice.exchange_rate),
    tax_rate: Number(invoice.tax_rate),
    notes: invoice.notes ?? "",
  });

  const [lines, setLines] = useState<DraftLine[]>(
    (invoice.items ?? []).map((it: any, idx: number) => ({
      _key: `ln-${idx}-${it.id}`,
      product_id: it.product_id ?? "",
      description: it.description ?? it.products?.name ?? "",
      qty: Number(it.qty),
      uom: it.uom,
      unit_price: Number(it.unit_price),
    }))
  );

  function addLine() {
    setLines((prev) => [
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
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, ...patch } : l))
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }

  function resetFromOrder() {
    setLines(
      orderItems.map((it, idx) => ({
        _key: `ln-${Date.now()}-${idx}`,
        product_id: it.product_id,
        description: it.product_name,
        qty: it.qty,
        uom: it.uom,
        unit_price: it.unit_price,
      }))
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        items: lines.map(({ _key, ...rest }) => rest),
      };
      const r = await updateInvoice(invoice.id, payload);
      if (r.error) {
        setError(r.error);
        return;
      }
      router.push(`/invoicing/${invoice.id}`);
    });
  }

  const total = lines.reduce((a, l) => a + l.qty * l.unit_price, 0);
  const tax = (total * form.tax_rate) / 100;
  const totalWithTax = total + tax;

  return (
    <div>
      <Link
        href={`/invoicing/${invoice.id}`}
        className="text-sm text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:text-[#F5F5F7]"
      >
        ← Back to Invoice
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">Edit Invoice</h1>
      <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">{invoice.invoice_number}</p>

      <div className="mt-4 text-xs text-[#A15C00] bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg px-3 py-2">
        Setelah disimpan, invoice akan di-reset ke status <strong>DRAFT</strong>{" "}
        dan perlu di-issue ulang.
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Invoice Type">
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
            </FormField>
            <FormField label="Invoice Ref">
              <Input
                value={form.invoice_ref}
                onChange={(e) =>
                  setForm({ ...form, invoice_ref: e.target.value })
                }
              />
            </FormField>
            <FormField label="Invoice Date">
              <Input
                type="date"
                value={form.invoice_date}
                onChange={(e) =>
                  setForm({ ...form, invoice_date: e.target.value })
                }
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
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-medium">Items</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={resetFromOrder}
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
              {lines.map((ln) => (
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
                        updateLine(ln._key, { qty: Number(e.target.value) })
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

          <div className="flex justify-end">
            <div className="text-sm space-y-1">
              <div className="flex justify-between gap-6">
                <span className="text-[#6E6E73] dark:text-[#8E8E93]">DPP:</span>
                <span className="font-mono">
                  {form.currency} {total.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-[#6E6E73] dark:text-[#8E8E93]">
                  Tax ({form.tax_rate}%):
                </span>
                <span className="font-mono">
                  {form.currency} {tax.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between gap-6 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] pt-1">
                <span className="font-medium">Total:</span>
                <span className="font-mono font-medium">
                  {form.currency} {totalWithTax.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
          <FormField label="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
        </div>

        {error && (
          <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Link href={`/invoicing/${invoice.id}`}>
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Revision"}
          </Button>
        </div>
      </form>
    </div>
  );
}