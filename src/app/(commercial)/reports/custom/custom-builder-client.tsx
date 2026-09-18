"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const ALL_FIELDS = [
  "order_number",
  "po_number",
  "po_date",
  "customer",
  "site",
  "contract",
  "business_model",
  "status",
  "current_stage",
  "currency",
  "selling_value",
  "total_direct_cost",
  "margin",
  "margin_pct",
  "created_at",
];

export function CustomBuilderClient({
  filters,
}: {
  filters: {
    customers: { id: string; name: string }[];
    sites: { id: string; name: string }[];
    contracts: { id: string; name: string }[];
    products: { id: string; name: string }[];
  };
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [contractId, setContractId] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "order_number",
    "customer",
    "site",
    "status",
    "selling_value",
    "margin",
  ]);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleField(field: string) {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  }

  async function preview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          customer_id: customerId,
          site_id: siteId,
          contract_id: contractId,
          status,
          fields: selectedFields,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setRows([]);
      } else {
        setRows(data.rows ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function exportXLSX() {
    if (rows.length === 0) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Custom Report");
    ws.columns = selectedFields.map((f) => ({
      header: f.replace(/_/g, " ").toUpperCase(),
      key: f,
      width: 20,
    }));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl p-5">
        <div className="text-sm font-semibold mb-4">Filters</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#6E6E73] mb-1">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[#6E6E73] mb-1">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[#6E6E73] mb-1">Customer</label>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">All Customers</option>
              {filters.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs text-[#6E6E73] mb-1">Site</label>
            <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">All Sites</option>
              {filters.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs text-[#6E6E73] mb-1">Contract</label>
            <Select value={contractId} onChange={(e) => setContractId(e.target.value)}>
              <option value="">All Contracts</option>
              {filters.contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs text-[#6E6E73] mb-1">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="ISSUED">Issued</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
        </div>
      </div>

      {/* FIELDS */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl p-5">
        <div className="text-sm font-semibold mb-4">
          Fields ({selectedFields.length} selected)
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_FIELDS.map((f) => {
            const active = selectedFields.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleField(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  active
                    ? "bg-[#EAF2FB] border-[#0A84FF] text-[#0A84FF]"
                    : "bg-white border-[#E5E5EA] text-[#6E6E73] hover:border-[#0A84FF]"
                }`}
              >
                {f.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <Button onClick={preview} disabled={loading || selectedFields.length === 0}>
            {loading ? "Loading..." : "Preview"}
          </Button>
          <Button
            variant="secondary"
            onClick={exportXLSX}
            disabled={rows.length === 0}
          >
            ⬇ Export XLSX
          </Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={rows.length === 0}>
            🖨 Print / PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* PREVIEW */}
      {rows.length > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-x-auto">
          <div className="px-6 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
            <div className="text-sm font-semibold">
              Preview · {rows.length} rows
            </div>
            <Badge tone="blue">{selectedFields.length} fields</Badge>
          </div>
          <Table>
            <THead>
              <TR>
                {selectedFields.map((f) => (
                  <TH key={f}>{f.replace(/_/g, " ").toUpperCase()}</TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {rows.slice(0, 100).map((r, i) => (
                <TR key={i}>
                  {selectedFields.map((f) => {
                    const v = r[f];
                    const display =
                      typeof v === "number"
                        ? v.toLocaleString("id-ID", { maximumFractionDigits: 2 })
                        : v === null || v === undefined
                          ? "—"
                          : String(v);
                    return (
                      <TD key={f} className="text-xs">
                        {display}
                      </TD>
                    );
                  })}
                </TR>
              ))}
            </TBody>
          </Table>
          {rows.length > 100 && (
            <div className="px-6 py-3 text-xs text-[#6E6E73] border-t border-[#E5E5EA]">
              Showing first 100 rows. Export XLSX untuk data lengkap.
            </div>
          )}
        </div>
      )}
    </div>
  );
}