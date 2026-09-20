"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  PdfReport,
  type ReportColumn,
  type ReportRow,
} from "@/features/reports/templates/pdf-report";
import { buildExcelReport } from "@/features/reports/templates/excel-report";

// ============================ HELPERS ============================

function inferColumnFormat(
  key: string,
  values: (string | number | null | undefined)[]
): ReportColumn["format"] {
  const lower = key.toLowerCase();

  if (
    lower.includes("value") ||
    lower.includes("cost") ||
    lower.includes("margin") ||
    lower.includes("amount") ||
    lower.includes("price") ||
    lower.includes("total")
  ) {
    if (lower.includes("pct") || lower.endsWith("_pct")) return "percent";
    return "money";
  }
  if (lower.includes("pct") || lower.includes("_percent") || lower.endsWith("%"))
    return "percent";
  if (
    lower.includes("date") ||
    lower.endsWith("_at") ||
    lower === "created_at" ||
    lower === "updated_at"
  )
    return "date";
  if (lower.includes("qty") || lower.includes("count")) return "number";

  // Infer from values
  const sample = values.find((v) => v !== null && v !== undefined);
  if (typeof sample === "number") return "number";
  return "text";
}

function humanizeKey(key: string) {
  return key
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// ============================ MAIN ============================

export function ReportViewer({
  reportKey,
  title,
  rows,
  filter,
  period,
  generatedBy,
  customersLabel,
}: {
  reportKey: string;
  title: string;
  rows: Record<string, unknown>[];
  filter: { from?: string; to?: string; customer?: string };
  period?: string;
  generatedBy?: string;
  customersLabel?: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(filter.from ?? "");
  const [to, setTo] = useState(filter.to ?? "");
  const [busy, setBusy] = useState<"PDF" | "XLSX" | null>(null);

  // ============================================================
  // DERIVE COLUMNS
  // ============================================================
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columns: ReportColumn[] = keys.map((k) => {
    const values = rows.map((r) => r[k] as string | number | null | undefined);
    const format = inferColumnFormat(k, values);
    return {
      key: k,
      label: humanizeKey(k),
      align:
        format === "money" || format === "number" || format === "percent"
          ? "right"
          : "left",
      format,
    };
  });

  const reportRows: ReportRow[] = rows as ReportRow[];

  // ============================================================
  // META
  // ============================================================
  const generatedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const metaFilters: { label: string; value: string }[] = [];
  if (from) metaFilters.push({ label: "Dari", value: from });
  if (to) metaFilters.push({ label: "Sampai", value: to });
  if (customersLabel)
    metaFilters.push({ label: "Customer", value: customersLabel });

  const meta = {
    title,
    subtitle: `${rows.length} record ditemukan`,
    period:
      period ?? (from || to ? `${from || "—"} → ${to || "—"}` : "All time"),
    generatedAt,
    generatedBy,
    rowCount: rows.length,
    filters: metaFilters.length > 0 ? metaFilters : undefined,
  };

  // ============================================================
  // ACTIONS
  // ============================================================
  function applyFilter() {
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    router.push(`/reports/view/${reportKey}?${sp.toString()}`);
  }

  function printPDF() {
    setBusy("PDF");
    setTimeout(() => {
      window.print();
      setBusy(null);
    }, 100);
  }

  async function exportXLSX() {
    setBusy("XLSX");
    try {
      const wb = await buildExcelReport({
        title,
        subtitle: `${rows.length} record`,
        period: meta.period,
        generatedAt,
        generatedBy,
        columns,
        rows: reportRows,
      });
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportKey}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export gagal: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* ============================ PRINT STYLES ============================ */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .pdf-report {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }
          .pdf-report table {
            font-size: 9pt !important;
          }
          .pdf-report thead {
            display: table-header-group;
          }
          .pdf-report tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={title}
          description={`${rows.length} rows · Generated ${generatedAt}`}
          actions={
            <Link
              href="/reports"
              className="text-sm text-[#0A84FF] hover:underline"
            >
              ← Back to Reports
            </Link>
          }
        />
      </div>

      {/* ============================ TOOLBAR ============================ */}
      <div className="no-print bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 items-center flex-wrap">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="max-w-[160px]"
          />
          <span className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">→</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="max-w-[160px]"
          />
          <Button size="sm" variant="secondary" onClick={applyFilter}>
            Apply
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={exportXLSX}
            disabled={busy !== null || rows.length === 0}
          >
            {busy === "XLSX" ? "Exporting..." : "⬇ Export Excel"}
          </Button>
          <Button
            size="sm"
            onClick={printPDF}
            disabled={busy !== null || rows.length === 0}
          >
            {busy === "PDF" ? "Preparing..." : "🖨 Print / PDF"}
          </Button>
        </div>
      </div>

      {/* ============================ PDF PREVIEW ============================ */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl overflow-hidden shadow-sm">
        <PdfReport
          meta={meta}
          columns={columns}
          rows={reportRows}
          brandName="AmmoBiz"
          brandSubtitle="Commercial Intelligence & Control Platform"
        />
      </div>
    </>
  );
}