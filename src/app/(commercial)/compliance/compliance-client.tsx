"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

// ============================ TYPES ============================

type Sk = {
  id: string;
  sk_number: string;
  issuing_authority: string;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  status: string;
};

type Line = {
  id: string;
  allocation_qty: number;
  uom: string;
  realized_qty: number;
  committed_qty: number;
  available_qty: number;
  utilization_pct: number;
  products?: { name: string; code: string; uom: string } | null;
};

type Ledger = {
  id: string;
  transaction_type: string;
  qty: number;
  created_at: string;
  reason: string | null;
  kemhan_quota_lines?: { products?: { name: string } | null } | null;
};

type Alert = { type: string; severity: string; message: string };

type TotalsByUom = {
  uom: string;
  allocation: number;
  realized: number;
  committed: number;
  available: number;
};

type Dashboard = {
  activeSk: Sk | null;
  activeCount: number;
  lines: Line[];
  totalsByUom: TotalsByUom[];
  alerts: Alert[];
  recentLedger: Ledger[];
};

type Tab = "quota" | "ledger" | "alerts";

// ============================ MAIN ============================

export function ComplianceClient({
  dashboard,
  permissions,
}: {
  dashboard: Dashboard;
  permissions: string[];
}) {
  const [tab, setTab] = useState<Tab>("quota");

  const canCreateSk = permissions.includes("SK_CREATE");
  const canActivateSk = permissions.includes("SK_ACTIVATE");

  const { activeSk, totalsByUom, lines, alerts, recentLedger } = dashboard;

  // ---------- Empty state (no active SK) ----------
  if (!activeSk) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-[#6E6E73]">
            Belum ada SK Kemhan aktif
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/compliance/history">
              <Button variant="secondary">History</Button>
            </Link>
            {canCreateSk && (
              <Link href="/compliance/sk/new">
                <Button>+ New Authorization</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white border border-dashed border-[#E5E5EA] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold">
            Belum ada SK Kemhan aktif
          </h2>
          <p className="mt-1 text-sm text-[#6E6E73] max-w-md mx-auto">
            Buat authorization baru untuk mulai mengalokasikan quota material.
            Setelah SK dibuat dan diaktifkan, order dapat di-issue.
          </p>

          {canCreateSk ? (
            <div className="mt-5">
              <Link href="/compliance/sk/new">
                <Button size="lg">+ Buat SK Baru</Button>
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#8E8E93]">
              Anda tidak memiliki izin untuk membuat SK. Hubungi Compliance
              Staff.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---------- Active SK view ----------
  const daysToExpiry = activeSk.expiry_date
    ? Math.ceil(
        (new Date(activeSk.expiry_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-6">
      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-[#6E6E73]">
          SK aktif:{" "}
          <span className="font-medium text-[#1D1D1F]">
            {activeSk.sk_number}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/compliance/history">
            <Button variant="secondary">History</Button>
          </Link>
          {canCreateSk && (
            <Link href="/compliance/sk/new">
              <Button>+ New Authorization</Button>
            </Link>
          )}
        </div>
      </div>

      {/* ACTIVE SK CARD */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-lg font-semibold">
                {activeSk.sk_number}
              </div>
              <Badge tone="green">Active</Badge>
              {daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry >= 0 && (
                <Badge tone="red">Expires in {daysToExpiry}d</Badge>
              )}
              {daysToExpiry !== null && daysToExpiry > 30 && daysToExpiry <= 60 && (
                <Badge tone="orange">Expires in {daysToExpiry}d</Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-[#6E6E73]">
              {activeSk.issuing_authority}
            </div>
            <div className="mt-1 text-xs text-[#8E8E93]">
              Issued {activeSk.issue_date ?? "—"} · Effective{" "}
              {activeSk.effective_date ?? "—"} · Expires{" "}
              {activeSk.expiry_date ?? "—"}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/compliance/sk/${activeSk.id}`}>
              <Button variant="secondary">View Detail</Button>
            </Link>
            {canCreateSk && (
              <Link href="/compliance/sk/new">
                <Button>+ New Authorization</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI ROW — Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Active SK"
          value={String(dashboard.activeCount)}
          hint={activeSk.sk_number}
          tone="green"
        />
        <KpiCard
          label="Materials"
          value={String(lines.length)}
          hint="In current SK"
        />
        <KpiCard
          label="UOM Types"
          value={String(totalsByUom.length)}
          hint="Distinct units"
        />
        <KpiCard
          label="Expiry"
          value={activeSk.expiry_date ?? "—"}
          hint={
            daysToExpiry !== null
              ? daysToExpiry >= 0
                ? `${daysToExpiry} days remaining`
                : `Expired ${Math.abs(daysToExpiry)} days ago`
              : ""
          }
          tone={
            daysToExpiry !== null && daysToExpiry <= 30 ? "red" : "neutral"
          }
        />
      </div>

      {/* TOTALS BY UOM */}
      {totalsByUom.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-3">
            Totals by Unit of Measure
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {totalsByUom.map((t) => (
              <UomCard key={t.uom} data={t} />
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl">
        <div className="px-2 border-b border-[#E5E5EA] flex overflow-x-auto">
          {[
            { key: "quota" as const, label: "Quota by Material" },
            { key: "ledger" as const, label: "Quota Ledger" },
            {
              key: "alerts" as const,
              label: `Alerts${alerts.length ? ` (${alerts.length})` : ""}`,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-11 px-4 text-sm border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key
                  ? "border-[#0A84FF] text-[#0A84FF] font-medium"
                  : "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* QUOTA TAB */}
          {tab === "quota" &&
            (lines.length === 0 ? (
              <div className="text-sm text-[#6E6E73] text-center py-10">
                Belum ada quota line. Buka{" "}
                <Link
                  href={`/compliance/sk/${activeSk.id}`}
                  className="text-[#0A84FF] hover:underline"
                >
                  detail SK
                </Link>{" "}
                untuk menambahkan material.
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Material</TH>
                    <TH>Unit</TH>
                    <TH className="text-right">Allocation</TH>
                    <TH className="text-right">Realized</TH>
                    <TH className="text-right">Committed</TH>
                    <TH className="text-right">Available</TH>
                    <TH>Utilization</TH>
                  </TR>
                </THead>
                <TBody>
                  {lines.map((l) => (
                    <TR key={l.id}>
                      <TD>
                        <div className="font-medium">
                          {l.products?.name ?? "—"}
                        </div>
                        <div className="text-xs text-[#8E8E93] font-mono">
                          {l.products?.code ?? ""}
                        </div>
                      </TD>
                      <TD>
                        <Badge tone="grey">{l.uom}</Badge>
                      </TD>
                      <TD className="text-right font-mono text-xs">
                        {formatNum(l.allocation_qty)}
                      </TD>
                      <TD className="text-right font-mono text-xs text-[#34C759]">
                        {formatNum(l.realized_qty)}
                      </TD>
                      <TD className="text-right font-mono text-xs text-[#0A84FF]">
                        {formatNum(l.committed_qty)}
                      </TD>
                      <TD className="text-right font-mono text-xs">
                        {formatNum(l.available_qty)}
                      </TD>
                      <TD>
                        <UtilBar pct={l.utilization_pct} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ))}

          {/* LEDGER TAB */}
          {tab === "ledger" &&
            (recentLedger.length === 0 ? (
              <div className="text-sm text-[#6E6E73] text-center py-10">
                Belum ada aktivitas.
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Timestamp</TH>
                    <TH>Material</TH>
                    <TH>Type</TH>
                    <TH className="text-right">Qty</TH>
                    <TH>Reason</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentLedger.map((e) => (
                    <TR key={e.id}>
                      <TD className="text-xs text-[#6E6E73] whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("id-ID")}
                      </TD>
                      <TD>
                        {e.kemhan_quota_lines?.products?.name ?? "—"}
                      </TD>
                      <TD>
                        <Badge tone={ledgerTone(e.transaction_type)}>
                          {ledgerLabel(e.transaction_type)}
                        </Badge>
                      </TD>
                      <TD
                        className={`text-right font-mono text-xs ${
                          Number(e.qty) >= 0
                            ? "text-[#34C759]"
                            : "text-[#FF3B30]"
                        }`}
                      >
                        {Number(e.qty) > 0 ? "+" : ""}
                        {formatNum(e.qty)}
                      </TD>
                      <TD className="text-xs text-[#6E6E73]">
                        {e.reason ?? "—"}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ))}

          {/* ALERTS TAB */}
          {tab === "alerts" &&
            (alerts.length === 0 ? (
              <div className="text-sm text-[#6E6E73] text-center py-10">
                Tidak ada alert. Semua aman. ✅
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li
                    key={i}
                    className={`text-sm border rounded-lg px-4 py-3 ${
                      a.severity === "CRITICAL"
                        ? "bg-[#FF3B30]/5 border-[#FF3B30]/30 text-[#B71C1C]"
                        : a.severity === "WARNING"
                          ? "bg-[#FF9500]/10 border-[#FF9500]/30 text-[#A15C00]"
                          : "bg-[#EAF2FB] border-[#0A84FF]/30 text-[#0A84FF]"
                    }`}
                  >
                    <span className="font-medium mr-2">[{a.severity}]</span>
                    {a.message}
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>
    </div>
  );
}

// ============================ SUB-COMPONENTS ============================

function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "green" | "orange" | "blue" | "red";
}) {
  const hintColor =
    tone === "green"
      ? "text-[#34C759]"
      : tone === "orange"
        ? "text-[#FF9500]"
        : tone === "blue"
          ? "text-[#0A84FF]"
          : tone === "red"
            ? "text-[#FF3B30]"
            : "text-[#8E8E93]";
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl p-4">
      <div className="text-xs text-[#6E6E73] uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold truncate">{value}</div>
      {hint && (
        <div className={`mt-1 text-xs truncate ${hintColor}`}>{hint}</div>
      )}
    </div>
  );
}

function UomCard({ data }: { data: TotalsByUom }) {
  const pct =
    data.allocation > 0
      ? Math.min(
          100,
          ((data.realized + data.committed) / data.allocation) * 100
        )
      : 0;

  const realizedPct =
    data.allocation > 0 ? (data.realized / data.allocation) * 100 : 0;
  const committedPct =
    data.allocation > 0 ? (data.committed / data.allocation) * 100 : 0;

  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Total ({data.uom})</div>
        <Badge tone="blue">{data.uom}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat
          label="Allocation"
          value={formatNum(data.allocation)}
        />
        <MiniStat
          label="Realized"
          value={formatNum(data.realized)}
          tone="green"
        />
        <MiniStat
          label="Committed"
          value={formatNum(data.committed)}
          tone="blue"
        />
        <MiniStat
          label="Available"
          value={formatNum(data.available)}
          tone="orange"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#6E6E73]">Utilization</span>
          <span className="font-medium">{pct.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-[#F2F2F4] rounded-full overflow-hidden flex">
          <div
            className="bg-[#34C759] transition-all"
            style={{ width: `${Math.min(100, realizedPct)}%` }}
            title={`Realized ${realizedPct.toFixed(0)}%`}
          />
          <div
            className="bg-[#0A84FF] transition-all"
            style={{ width: `${Math.min(100, committedPct)}%` }}
            title={`Committed ${committedPct.toFixed(0)}%`}
          />
        </div>
        <div className="flex gap-3 mt-2 text-[10px] text-[#6E6E73]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            Realized
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0A84FF]" />
            Committed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E5E5EA]" />
            Available
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "blue" | "orange";
}) {
  const color =
    tone === "green"
      ? "text-[#34C759]"
      : tone === "blue"
        ? "text-[#0A84FF]"
        : tone === "orange"
          ? "text-[#FF9500]"
          : "text-[#1D1D1F]";
  return (
    <div>
      <div className="text-[10px] text-[#6E6E73] uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-sm ${color}`}>{value}</div>
    </div>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const color =
    pct >= 100
      ? "bg-[#FF3B30]"
      : pct >= 90
        ? "bg-[#FF9500]"
        : pct >= 80
          ? "bg-[#FFCC00]"
          : "bg-[#34C759]";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-[#F2F2F4] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-xs font-medium w-10 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ============================ HELPERS ============================

function formatNum(n: number | string) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function ledgerTone(t: string): "green" | "blue" | "orange" | "red" | "grey" {
  if (t === "ALLOCATION") return "green";
  if (t === "PO_COMMITMENT") return "blue";
  if (t === "PO_RELEASE") return "orange";
  if (t === "DISTRIBUTION_REALIZATION") return "blue";
  if (t === "ADJUSTMENT") return "orange";
  if (t === "REVERSAL") return "red";
  return "grey";
}

function ledgerLabel(t: string) {
  const map: Record<string, string> = {
    ALLOCATION: "Allocation",
    PO_COMMITMENT: "PO Commitment",
    PO_RELEASE: "PO Release",
    DISTRIBUTION_REALIZATION: "Realization",
    ADJUSTMENT: "Adjustment",
    REVERSAL: "Reversal",
  };
  return map[t] ?? t;
}