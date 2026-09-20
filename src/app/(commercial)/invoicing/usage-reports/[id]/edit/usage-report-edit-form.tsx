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
import { updateUsageReport } from "@/features/invoicing/usage-actions";
import {
  LINE_TYPES,
  MARGIN_TYPES,
  PERIOD_TYPES,
  USAGE_REPORT_TYPES,
} from "@/lib/constants/billing-models";

type Line = {
  _key: string;
  product_id: string;
  description: string;
  line_type: string;
  margin_type: string;
  qty_usage: number;
  uom: string;
  unit_price: number;
  rate: number | null;
  unit_cost: number;
  transport_amount: number;
  stock_awal: number | null;
  stock_akhir: number | null;
};

export function UsageReportEditForm({
  report,
  products,
  sites,
}: {
  report: any;
  products: { id: string; code: string; name: string; uom: string }[];
  sites: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    project_code: report.project_code ?? "",
    report_type: report.report_type,
    customer_id: report.customer_id ?? "",
    order_id: report.order_id ?? "",
    site_id: report.site_id ?? "",
    period_start: report.period_start,
    period_end: report.period_end,
    period_type: report.period_type,
    notes: report.notes ?? "",
  });

  const [lines, setLines] = useState<Line[]>(
    (report.lines ?? []).map((ln: any, idx: number) => ({
      _key: `ln-${idx}-${ln.id}`,
      product_id: ln.product_id ?? "",
      description: ln.description ?? "",
      line_type: ln.line_type,
      margin_type: ln.margin_type,
      qty_usage: Number(ln.qty_usage),
      uom: ln.uom,
      unit_price: Number(ln.unit_price),
      rate: ln.rate != null ? Number(ln.rate) : null,
      unit_cost: Number(ln.unit_cost),
      transport_amount: Number(ln.transport_amount),
      stock_awal: ln.stock_awal != null ? Number(ln.stock_awal) : null,
      stock_akhir: ln.stock_akhir != null ? Number(ln.stock_akhir) : null,
    }))
  );

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        _key: `ln-${Date.now()}-${prev.length}`,
        product_id: products[0]?.id ?? "",
        description: "",
        line_type: "MATERIAL",
        margin_type: "PASS_THROUGH",
        qty_usage: 0,
        uom: products[0]?.uom ?? "MT",
        unit_price: 0,
        rate: null,
        unit_cost: 0,
        transport_amount: 0,
        stock_awal: null,
        stock_akhir: null,
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, ...patch } : l))
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        site_id: form.site_id || null,
        customer_id: form.customer_id || null,
        order_id: form.order_id || null,
        project_code: form.project_code || null,
        lines: lines.map(({ _key, ...rest }) => rest),
      };
      const r = await updateUsageReport(report.id, payload);
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push(`/invoicing/usage-reports/${report.id}`);
    });
  }

  const total = lines.reduce(
    (a, l) => a + l.qty_usage * l.unit_price + l.transport_amount,
    0
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6 mt-4">
      <div className="text-xs text-[#A15C00] bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg px-3 py-2">
        Setelah disimpan, status usage report akan di-reset ke{" "}
        <strong>DRAFT</strong>.
      </div>

      {/* HEADER */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Report Type" required>
            <Select
              value={form.report_type}
              onChange={(e) =>
                setForm({ ...form, report_type: e.target.value })
              }
            >
              {Object.values(USAGE_REPORT_TYPES).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Period Type" required>
            <Select
              value={form.period_type}
              onChange={(e) =>
                setForm({ ...form, period_type: e.target.value })
              }
            >
              {Object.values(PERIOD_TYPES).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Project Code">
            <Input
              value={form.project_code}
              onChange={(e) =>
                setForm({ ...form, project_code: e.target.value })
              }
            />
          </FormField>
          <FormField label="Site">
            <Select
              value={form.site_id}
              onChange={(e) => setForm({ ...form, site_id: e.target.value })}
            >
              <option value="">— Pilih Site —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Period Start" required>
            <Input
              type="date"
              value={form.period_start}
              onChange={(e) =>
                setForm({ ...form, period_start: e.target.value })
              }
              required
            />
          </FormField>
          <FormField label="Period End" required>
            <Input
              type="date"
              value={form.period_end}
              onChange={(e) =>
                setForm({ ...form, period_end: e.target.value })
              }
              required
            />
          </FormField>
        </div>
      </div>

      {/* LINES */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Usage Lines</div>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={addLine}
          >
            + Add Line
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>Line Type</TH>
                <TH>Margin</TH>
                <TH className="text-right">Qty</TH>
                <TH>UOM</TH>
                <TH className="text-right">Price</TH>
                <TH className="text-right">Transport</TH>
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
                        const p = products.find((x) => x.id === e.target.value);
                        updateLine(ln._key, {
                          product_id: e.target.value,
                          uom: p?.uom ?? ln.uom,
                        });
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </TD>
                  <TD>
                    <Select
                      value={ln.line_type}
                      onChange={(e) =>
                        updateLine(ln._key, { line_type: e.target.value })
                      }
                    >
                      {Object.values(LINE_TYPES).map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </TD>
                  <TD>
                    <Select
                      value={ln.margin_type}
                      onChange={(e) =>
                        updateLine(ln._key, { margin_type: e.target.value })
                      }
                    >
                      {Object.values(MARGIN_TYPES).map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </TD>
                  <TD>
                    <Input
                      type="number"
                      step="0.01"
                      value={ln.qty_usage}
                      onChange={(e) =>
                        updateLine(ln._key, {
                          qty_usage: Number(e.target.value),
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
                      className="w-28"
                    />
                  </TD>
                  <TD>
                    <Input
                      type="number"
                      step="0.01"
                      value={ln.transport_amount}
                      onChange={(e) =>
                        updateLine(ln._key, {
                          transport_amount: Number(e.target.value),
                        })
                      }
                      className="w-28"
                    />
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
        </div>
        <div className="flex justify-end pt-2">
          <div className="text-sm">
            <span className="text-[#6E6E73]">Subtotal: </span>
            <span className="font-mono font-medium">
              IDR {total.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-6">
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
        <Link href={`/invoicing/usage-reports/${report.id}`}>
          <Button variant="secondary" type="button">
            Cancel
          </Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving..." : "Save Revision"}
        </Button>
      </div>
    </form>
  );
}