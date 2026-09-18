"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { TimeRange } from "@/features/analytics/queries";

// ============================ HELPERS ============================

function fmtValue(
  v: string | number,
  format?: "number" | "money" | "percent"
) {
  if (v === null || v === undefined) return "—";
  if (format === "money") {
    const n = Number(v);
    const abs = Math.abs(n);
    if (abs >= 1e12) return `Rp ${(n / 1e12).toFixed(1)} T`;
    if (abs >= 1e9) return `Rp ${(n / 1e9).toFixed(1)} B`;
    if (abs >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} M`;
    if (abs >= 1e3) return `Rp ${(n / 1e3).toFixed(1)} K`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  }
  if (format === "percent") {
    return `${Number(v).toFixed(1)}%`;
  }
  if (format === "number") {
    return Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  }
  return String(v);
}

function rawValue(
  v: string | number,
  format?: "number" | "money" | "percent"
) {
  if (v === null || v === undefined) return "";
  if (format === "percent") return `${Number(v).toFixed(2)}%`;
  if (format === "money" || format === "number") return Number(v);
  return String(v);
}

// ============================ MAIN ============================

export function AnalyticsDetailClient({
  dimension,
  range,
  columns,
  rows,
}: {
  dimension: string;
  range: TimeRange;
  columns: {
    key: string;
    label: string;
    align?: "left" | "right";
    format?: "number" | "money" | "percent";
  }[];
  rows: Record<string, string | number>[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState<"XLSX" | null>(null);

  // Local time filter state
  const [preset, setPreset] = useState<TimeRange["preset"]>(
    range.preset ?? "monthly"
  );
  const [customFrom, setCustomFrom] = useState(range.from ?? "");
  const [customTo, setCustomTo] = useState(range.to ?? "");
  const [showCustom, setShowCustom] = useState(range.preset === "custom");

  function applyRange(next: TimeRange) {
    const sp = new URLSearchParams();
    sp.set("preset", next.preset);
    if (next.preset === "custom") {
      if (customFrom) sp.set("from", customFrom);
      if (customTo) sp.set("to", customTo);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  async function exportXLSX() {
    if (rows.length === 0) return;
    setBusy("XLSX");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(dimension.slice(0, 30));
      ws.columns = columns.map((c) => ({
        header: c.label,
        key: c.key,
        width: 22,
      }));
      ws.getRow(1).font = { bold: true };

      rows.forEach((r) => {
        const row: Record<string, unknown> = {};
        for (const c of columns) {
          row[c.key] = rawValue(r[c.key], c.format);
        }
        ws.addRow(row);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dimension}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export gagal: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/analytics"
          className="text-sm text-[#0A84FF] hover:underline flex items-center gap-1"
        >
          ← Back to Analytics
        </Link>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg p-1">
            {(["daily", "monthly", "yearly", "all"] as const).map((p) => {
              const active = preset === p;
              return (
                <button
                  key={p}
                  onClick={() => {
                    setPreset(p);
                    setShowCustom(false);
                    applyRange({ preset: p });
                  }}
                  className={`h-8 px-3 rounded-md text-xs capitalize ${
                    active
                      ? "bg-[#0A84FF] text-white font-medium"
                      : "text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]"
                  }`}
                >
                  {p === "all" ? "All" : p}
                </button>
              );
            })}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`h-8 px-3 rounded-md text-xs ${
                preset === "custom"
                  ? "bg-[#0A84FF] text-white font-medium"
                  : "text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]"
              }`}
            >
              Custom
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportXLSX}
            disabled={busy !== null || rows.length === 0}
          >
            {busy === "XLSX" ? "Exporting..." : "⬇ Export XLSX"}
          </Button>
        </div>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-3">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="max-w-[160px]"
          />
          <span className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">→</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="max-w-[160px]"
          />
          <Button
            size="sm"
            onClick={() => {
              setPreset("custom");
              applyRange({ preset: "custom" });
            }}
          >
            Apply
          </Button>
        </div>
      )}

      {/* SUMMARY ROW */}
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl px-5 py-3 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
        <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{rows.length}</span> rows ·
        Generated {new Date().toLocaleString("id-ID")}
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">
            Belum ada data untuk periode ini.
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                {columns.map((c) => (
                  <TH
                    key={c.key}
                    className={c.align === "right" ? "text-right" : ""}
                  >
                    {c.label}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {rows.map((r, i) => (
                <TR key={i}>
                  {columns.map((c) => (
                    <TD
                      key={c.key}
                      className={
                        c.align === "right"
                          ? "text-right font-mono text-xs"
                          : "text-xs"
                      }
                    >
                      {fmtValue(r[c.key], c.format)}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}