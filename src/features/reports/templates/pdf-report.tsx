"use client";

import { forwardRef } from "react";

// ============================ TYPES ============================

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: "number" | "money" | "percent" | "date" | "text";
  width?: string;
};

export type ReportRow = Record<string, string | number | null | undefined>;

export type SummaryCard = {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "blue" | "green" | "red" | "orange";
};

export type ReportMeta = {
  title: string;
  subtitle?: string;
  period?: string;
  generatedAt: string;
  generatedBy?: string;
  rowCount: number;
  filters?: { label: string; value: string }[];
};

// ============================ FORMATTERS ============================

function fmtValue(
  v: string | number | null | undefined,
  format?: ReportColumn["format"]
): string {
  if (v === null || v === undefined || v === "") return "—";

  if (format === "money") {
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return `Rp ${n.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (format === "number") {
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  if (format === "percent") {
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return `${n.toFixed(2)}%`;
  }
  if (format === "date") {
    try {
      return new Date(String(v)).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(v);
    }
  }
  return String(v);
}

// ============================ COMPONENT ============================

export const PdfReport = forwardRef<
  HTMLDivElement,
  {
    meta: ReportMeta;
    columns: ReportColumn[];
    rows: ReportRow[];
    summaryCards?: SummaryCard[];
    brandName?: string;
    brandSubtitle?: string;
    showRowNumber?: boolean;
    zebra?: boolean;
  }
>(function PdfReport(
  {
    meta,
    columns,
    rows,
    summaryCards,
    brandName = "AmmoBiz",
brandSubtitle = "Commercial Intelligence & Control Platform",
    showRowNumber = true,
    zebra = true,
  },
  ref
) {
  return (
    <div
      ref={ref}
      className="pdf-report bg-white text-[#1D1D1F]"
      style={{
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ============================ HEADER ============================ */}
      <div
        style={{
          padding: "24px 32px 20px",
          borderBottom: "2px solid #1D1D1F",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1D1D1F",
            }}
          >
            {brandName}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#6E6E73",
              marginTop: 4,
              letterSpacing: "0.02em",
            }}
          >
            {brandSubtitle}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#1D1D1F",
              letterSpacing: "-0.01em",
            }}
          >
            {meta.title.toUpperCase()}
          </div>
          {meta.subtitle && (
            <div style={{ fontSize: 10, color: "#6E6E73", marginTop: 4 }}>
              {meta.subtitle}
            </div>
          )}
        </div>
      </div>

      {/* ============================ META STRIP ============================ */}
      <div
        style={{
          padding: "16px 32px",
          background: "#F6F6F7",
          borderBottom: "1px solid #E5E5EA",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 16,
          fontSize: 10,
        }}
      >
        <div>
          <div
            style={{
              color: "#8E8E93",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            Periode
          </div>
          <div style={{ fontWeight: 600, color: "#1D1D1F" }}>
            {meta.period ?? "—"}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "#8E8E93",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            Total Records
          </div>
          <div style={{ fontWeight: 600, color: "#1D1D1F" }}>
            {meta.rowCount.toLocaleString("id-ID")}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "#8E8E93",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            Digenerate
          </div>
          <div style={{ fontWeight: 600, color: "#1D1D1F" }}>
            {meta.generatedAt}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "#8E8E93",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            Digenerate Oleh
          </div>
          <div style={{ fontWeight: 600, color: "#1D1D1F" }}>
            {meta.generatedBy ?? "—"}
          </div>
        </div>
      </div>

      {/* ============================ FILTERS ============================ */}
      {meta.filters && meta.filters.length > 0 && (
        <div
          style={{
            padding: "12px 32px",
            borderBottom: "1px solid #E5E5EA",
            fontSize: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              color: "#8E8E93",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: 9,
              alignSelf: "center",
            }}
          >
            Filter:
          </div>
          {meta.filters.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 4 }}>
              <span style={{ color: "#6E6E73" }}>{f.label}:</span>
              <span style={{ fontWeight: 600, color: "#1D1D1F" }}>
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ============================ SUMMARY CARDS ============================ */}
      {summaryCards && summaryCards.length > 0 && (
        <div
          style={{
            padding: "20px 32px",
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(summaryCards.length, 4)}, 1fr)`,
            gap: 12,
            borderBottom: "1px solid #E5E5EA",
          }}
        >
          {summaryCards.map((c, i) => {
            const colors: Record<string, { color: string; bg: string }> = {
              neutral: { color: "#1D1D1F", bg: "#F6F6F7" },
              blue: { color: "#0A84FF", bg: "#EAF2FB" },
              green: { color: "#1B8A3B", bg: "#E8F8EC" },
              red: { color: "#B71C1C", bg: "#FFEBEE" },
              orange: { color: "#A15C00", bg: "#FFF4E5" },
            };
            const tone = colors[c.tone ?? "neutral"];
            return (
              <div
                key={i}
                style={{
                  padding: "12px 14px",
                  border: "1px solid #E5E5EA",
                  borderRadius: 8,
                  background: tone.bg,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "#6E6E73",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  {c.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: tone.color,
                    marginTop: 4,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {c.value}
                </div>
                {c.hint && (
                  <div style={{ fontSize: 9, color: "#8E8E93", marginTop: 2 }}>
                    {c.hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================ TABLE ============================ */}
      <div style={{ padding: "20px 32px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 10,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <thead>
            <tr>
              {showRowNumber && (
                <th
                  style={{
                    textAlign: "right",
                    padding: "8px 8px",
                    background: "#1D1D1F",
                    color: "#FFFFFF",
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: 40,
                    borderBottom: "1px solid #1D1D1F",
                  }}
                >
                  #
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{
                    textAlign:
                      c.align === "right"
                        ? "right"
                        : c.align === "center"
                          ? "center"
                          : "left",
                    padding: "8px 10px",
                    background: "#1D1D1F",
                    color: "#FFFFFF",
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid #1D1D1F",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showRowNumber ? 1 : 0)}
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#8E8E93",
                    fontStyle: "italic",
                  }}
                >
                  Tidak ada data untuk periode ini.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    background: zebra && i % 2 === 1 ? "#FAFAFB" : "#FFFFFF",
                    borderBottom: "1px solid #F2F2F4",
                  }}
                >
                  {showRowNumber && (
                    <td
                      style={{
                        padding: "6px 8px",
                        textAlign: "right",
                        color: "#8E8E93",
                        fontSize: 9,
                      }}
                    >
                      {i + 1}
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      style={{
                        padding: "6px 10px",
                        textAlign:
                          c.align === "right"
                            ? "right"
                            : c.align === "center"
                              ? "center"
                              : "left",
                        color: "#1D1D1F",
                      }}
                    >
                      {fmtValue(r[c.key], c.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================ FOOTER ============================ */}
      <div
        style={{
          padding: "16px 32px 24px",
          borderTop: "1px solid #E5E5EA",
          marginTop: 20,
          fontSize: 9,
          color: "#8E8E93",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          Dokumen ini digenerate otomatis oleh {brandName} Platform. Data
          bersifat CONFIDENTIAL.
        </div>
        <div>
          {brandName} · {meta.generatedAt} · {meta.rowCount} records
        </div>
      </div>
    </div>
  );
});