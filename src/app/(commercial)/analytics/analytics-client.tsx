"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TimeRange } from "@/features/analytics/queries";

// ============================ TYPES ============================

type Dashboard = Awaited<
  ReturnType<
    typeof import("@/features/analytics/queries").getAnalyticsDashboard
  >
>;

// ============================ CONSTANTS ============================

const STAGE_COLORS: Record<string, string> = {
  PO: "#C7C7CC",
  COMPLIANCE: "#FF9500",
  PROCUREMENT: "#0A84FF",
  SHIPMENT: "#FF9500",
  DELIVERY: "#5E5CE6",
  BAST: "#FFCC00",
  COMPLETE: "#34C759",
};

// ============================ HELPERS ============================

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)} T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return Number(n).toLocaleString("id-ID");
}

function fmtRp(n: number) {
  return `Rp ${fmt(n)}`;
}

function fmtFull(n: number) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function monthLabel(period: string) {
  const [_, m] = period.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const idx = parseInt(m, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx > 11) return period;
  return monthNames[idx] ?? period;
}

// ============================ MAIN ============================

export function AnalyticsClient({
  range,
  dashboard,
}: {
  range: TimeRange;
  dashboard: Dashboard;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [customFrom, setCustomFrom] = useState(range.from ?? "");
  const [customTo, setCustomTo] = useState(range.to ?? "");
  const [showCustom, setShowCustom] = useState(range.preset === "custom");

  const {
    kpis,
    taxTotals,
    trend,
    ordersByStage,
    ordersByCustomer,
    marginBySite,
    marginByProduct,
    cycleTime,
    compliance,
    topIssues,
    quickInsights,
  } = dashboard;

  const presetQS = `preset=${range.preset}`;

  function setPreset(preset: string) {
    const sp = new URLSearchParams();
    sp.set("preset", preset);
    setShowCustom(preset === "custom");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function applyCustomRange() {
    const sp = new URLSearchParams();
    sp.set("preset", "custom");
    if (customFrom) sp.set("from", customFrom);
    if (customTo) sp.set("to", customTo);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="space-y-5">
      {/* ============================ TIME CONTROL ============================ */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="flex bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg p-1">
          {(["daily", "monthly", "yearly"] as const).map((p) => {
            const active = range.preset === p;
            return (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`h-8 px-3 rounded-md text-xs capitalize transition ${
                  active
                    ? "bg-[#0A84FF] text-white font-medium"
                    : "text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`h-9 px-4 rounded-lg bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] text-sm flex items-center gap-2 transition ${
            range.preset === "custom"
              ? "border-[#0A84FF] text-[#0A84FF]"
              : "text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#0A84FF]"
          }`}
        >
          <span className="font-mono text-xs">
            {dashboard.range.from} → {dashboard.range.to}
          </span>
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.5 7l4.5 4.5L14.5 7z" />
          </svg>
        </button>

        <button className="h-9 px-4 rounded-lg bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#0A84FF]">
          All Customers
        </button>
        <button className="h-9 px-4 rounded-lg bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#0A84FF]">
          All Sites
        </button>
        <button className="h-9 px-4 rounded-lg bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#0A84FF] flex items-center gap-2">
          <svg
            className="w-4 h-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M3 5h14M5 9h10M7 13h6" />
          </svg>
          More filters
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 justify-end flex-wrap bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-3">
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
          <Button size="sm" onClick={applyCustomRange}>
            Apply
          </Button>
        </div>
      )}

      {/* ============================ KPI ROW 1 ============================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Order Value"
          value={fmtRp(kpis.orderValue.value)}
          delta={kpis.orderValue.delta}
          suffix="vs prev."
        />
        <KpiCard
          label="Direct Cost"
          value={fmtRp(kpis.directCost.value)}
          delta={kpis.directCost.delta}
          invertColor
          suffix="vs prev."
        />
        <KpiCard
          label="Margin Before Tax"
          value={fmtRp(kpis.margin.value)}
          extra={`${kpis.margin.pct.toFixed(1)}%`}
          deltaPts={kpis.margin.deltaPts}
          suffix="vs prev."
        />
        <KpiCard
          label="Margin After Tax"
          value={fmtRp(kpis.marginAfterTax.value)}
          extra={`${kpis.marginAfterTax.pct.toFixed(1)}%`}
          delta={kpis.marginAfterTax.delta}
          suffix="vs prev."
          tone="green"
        />
      </div>

      {/* ============================ KPI ROW 2 — TAX ============================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="PPN Payable (11%)"
          value={fmtRp(kpis.ppnPayable.value)}
          hint={`Output ${fmt(taxTotals.ppnOutput)} − Input ${fmt(taxTotals.ppnInput)}`}
          tone="orange"
        />
        <KpiCard
          label="PPh 23 (2%)"
          value={fmtRp(kpis.pph23.value)}
          hint="2% × transport cost"
          tone="orange"
        />
        <KpiCard
          label="Total Tax"
          value={fmtRp(kpis.totalTax.value)}
          hint="PPN Payable + PPh 23"
          tone="red"
        />
        <KpiCard
          label="Active / Completed"
          value={`${kpis.activeOrders.value} / ${kpis.completedOrders.value}`}
          hint={`${kpis.waitingBast.value} waiting BAST`}
          tone="blue"
        />
      </div>

      {/* ============================ ROW 1: Trend | Stage | Customer ============================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="text-sm font-semibold mb-4">
            Order Value & Margin Trend
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <ComposedChart data={trend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F2F2F4"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 11, fill: "#8E8E93" }}
                  axisLine={{ stroke: "#E5E5EA" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmt(v)}
                  tick={{ fontSize: 10, fill: "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                />
<Tooltip
  contentStyle={{
    borderRadius: 8,
    border: "1px solid #E5E5EA",
    fontSize: 12,
  }}
  formatter={((value: unknown, name: unknown) => {
    const v = Number(value);
    const n = String(name);
    return n === "Margin %" ? `${v.toFixed(1)}%` : fmtRp(v);
  }) as never}
/>
                <Bar
                  yAxisId="left"
                  dataKey="orderValue"
                  name="Order Value"
                  fill="#D6E6FB"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="marginPct"
                  name="Margin %"
                  stroke="#0A84FF"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#0A84FF" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-5 mt-2 text-xs text-[#6E6E73] dark:text-[#8E8E93]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#D6E6FB]" />
              Order Value
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#0A84FF]" />
              Margin %
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="text-sm font-semibold mb-4">Orders by Stage</div>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={ordersByStage}
                  dataKey="count"
                  nameKey="stage"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  stroke="white"
                  strokeWidth={2}
                >
                  {ordersByStage.map((s) => (
                    <Cell
                      key={s.stage}
                      fill={STAGE_COLORS[s.stage] ?? "#C7C7CC"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {ordersByStage.map((s) => (
              <div
                key={s.stage}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: STAGE_COLORS[s.stage] ?? "#C7C7CC",
                    }}
                  />
                  <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">{s.stage}</span>
                </span>
                <span className="font-medium text-[#6E6E73] dark:text-[#8E8E93]">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Orders by Customer</div>
            <Link
              href={`/analytics/orders-by-customer?${presetQS}`}
              className="text-xs text-[#0A84FF] hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {ordersByCustomer.length === 0 ? (
              <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] text-center py-6">
                Belum ada data.
              </div>
            ) : (
              ordersByCustomer.map((c) => {
                const max = Math.max(
                  ...ordersByCustomer.map((x) => x.count),
                  1
                );
                const pct = (c.count / max) * 100;
                return (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 text-xs"
                  >
                    <span className="w-16 text-[#6E6E73] dark:text-[#8E8E93] truncate">
                      {c.name}
                    </span>
                    <div className="flex-1 h-2 bg-[#F2F2F4] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6EA8FE]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {c.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================ ROW 2: Site | Product | Cycle Time ============================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Margin by Site</div>
            <Link
              href={`/analytics/margin-by-site?${presetQS}`}
              className="text-xs text-[#0A84FF] hover:underline"
            >
              View all →
            </Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#8E8E93] text-[10px] uppercase tracking-wide">
                <th className="text-left font-normal pb-2">Site</th>
                <th className="text-right font-normal pb-2">Order Value</th>
                <th className="text-right font-normal pb-2">Direct Cost</th>
                <th className="text-right font-normal pb-2">Margin</th>
                <th className="text-right font-normal pb-2">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {marginBySite.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-4"
                  >
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                marginBySite.map((s) => (
                  <tr key={s.site_name} className="border-t border-[#F2F2F4]">
                    <td className="py-2 truncate max-w-[120px]">
                      {s.site_name}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {fmtRp(s.order_value)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {fmtRp(s.direct_cost)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {fmtRp(s.margin)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {s.margin_pct.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Margin by Product</div>
            <Link
              href={`/analytics/margin-by-product?${presetQS}`}
              className="text-xs text-[#0A84FF] hover:underline"
            >
              View all →
            </Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#8E8E93] text-[10px] uppercase tracking-wide">
                <th className="text-left font-normal pb-2">Product</th>
                <th className="text-right font-normal pb-2">Order Value</th>
                <th className="text-right font-normal pb-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {marginByProduct.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-4"
                  >
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                marginByProduct.map((p) => (
                  <tr
                    key={p.product_name}
                    className="border-t border-[#F2F2F4]"
                  >
                    <td className="py-2 truncate max-w-[140px]">
                      {p.product_name}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {fmtRp(p.order_value)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {fmtFull(p.total_qty)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="text-sm font-semibold mb-3">
            Cycle Time (Average)
          </div>
          <div className="space-y-3 text-xs">
            <CycleRow
              label="PO → Procurement"
              days={cycleTime.poToProcurement.days}
              delta={cycleTime.poToProcurement.delta}
            />
            <CycleRow
              label="Procurement → Shipment"
              days={cycleTime.procurementToShipment.days}
              delta={cycleTime.procurementToShipment.delta}
            />
            <CycleRow
              label="Shipment → Delivery"
              days={cycleTime.shipmentToDelivery.days}
              delta={cycleTime.shipmentToDelivery.delta}
            />
            <CycleRow
              label="Delivery → BAST"
              days={cycleTime.deliveryToBast.days}
              delta={cycleTime.deliveryToBast.delta}
            />
          </div>
        </div>
      </div>

      {/* ============================ ROW 3: Compliance | Issues | Insights ============================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Compliance Overview</div>
            <Link
              href="/compliance"
              className="text-xs text-[#0A84FF] hover:underline"
            >
              View details →
            </Link>
          </div>

          <div className="w-full h-2 bg-[#F2F2F4] rounded-full overflow-hidden flex mb-4">
            <div
              className="bg-[#34C759]"
              style={{
                width: `${
                  compliance.allocation > 0
                    ? (compliance.realized / compliance.allocation) * 100
                    : 0
                }%`,
              }}
            />
            <div
              className="bg-[#0A84FF]"
              style={{
                width: `${
                  compliance.allocation > 0
                    ? (compliance.committed / compliance.allocation) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">Utilization</div>
            <div className="text-lg font-semibold">
              {compliance.utilization.toFixed(0)}%
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <div className="font-medium">{fmtFull(compliance.realized)}</div>
              <div className="text-[10px] text-[#8E8E93]">Realized</div>
            </div>
            <div>
              <div className="font-medium">{fmtFull(compliance.committed)}</div>
              <div className="text-[10px] text-[#8E8E93]">Committed</div>
            </div>
            <div>
              <div className="font-medium">{fmtFull(compliance.available)}</div>
              <div className="text-[10px] text-[#8E8E93]">Available</div>
            </div>
            <div>
              <div className="font-medium">
                {fmtFull(compliance.allocation)}
              </div>
              <div className="text-[10px] text-[#8E8E93]">Allocation</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="text-sm font-semibold mb-3">Top Issues</div>
          <div className="space-y-3 text-xs">
            {topIssues.length === 0 ? (
              <div className="text-[#6E6E73] dark:text-[#8E8E93] py-4 text-center">
                Tidak ada issue. Semua aman ✅
              </div>
            ) : (
              topIssues.map((i, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      i.tone === "red"
                        ? "bg-[#FF3B30]"
                        : i.tone === "yellow"
                          ? "bg-[#FF9500]"
                          : "bg-[#8E8E93]"
                    }`}
                  />
                  <span className="flex-1 text-[#1D1D1F] dark:text-[#F5F5F7]">{i.label}</span>
                  <span className="font-medium text-[#6E6E73] dark:text-[#8E8E93]">{i.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-[#0A84FF]"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 1l2.39 4.84L18 6.71l-4 3.9L15 16l-5-2.63L5 16l1-5.39-4-3.9 5.61-.87L10 1z" />
            </svg>
            <div className="text-sm font-semibold">Quick Insights</div>
          </div>
          <div className="space-y-3 text-xs">
            {quickInsights.length === 0 ? (
              <div className="text-[#6E6E73] dark:text-[#8E8E93] py-4 text-center">
                Belum ada insight untuk periode ini.
              </div>
            ) : (
              quickInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <svg
                    className="w-3 h-3 text-[#0A84FF] mt-0.5 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 1l2.39 4.84L18 6.71l-4 3.9L15 16l-5-2.63L5 16l1-5.39-4-3.9 5.61-.87L10 1z" />
                  </svg>
                  <span className="text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
                    {insight}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================ SUB-COMPONENTS ============================

function KpiCard({
  label,
  value,
  extra,
  hint,
  delta,
  deltaPts,
  deltaAbs,
  invertColor,
  suffix,
  tone = "neutral",
}: {
  label: string;
  value: string;
  extra?: string;
  hint?: string;
  delta?: number;
  deltaPts?: number;
  deltaAbs?: number;
  invertColor?: boolean;
  suffix?: string;
  tone?: "neutral" | "blue" | "green" | "orange" | "red";
}) {
  const valueColor =
    tone === "blue"
      ? "text-[#0A84FF]"
      : tone === "green"
        ? "text-[#34C759]"
        : tone === "orange"
          ? "text-[#FF9500]"
          : tone === "red"
            ? "text-[#FF3B30]"
            : "text-[#1D1D1F] dark:text-[#F5F5F7]";

  let arrow: "↑" | "↓" | null = null;
  let colorClass = "";
  let deltaText = "";

  if (typeof delta === "number") {
    arrow = delta >= 0 ? "↑" : "↓";
    const positive = delta >= 0;
    const isGood = invertColor ? !positive : positive;
    colorClass = isGood ? "text-[#34C759]" : "text-[#FF3B30]";
    deltaText = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
  } else if (typeof deltaPts === "number") {
    arrow = deltaPts >= 0 ? "↑" : "↓";
    const isGood = deltaPts >= 0;
    colorClass = isGood ? "text-[#34C759]" : "text-[#FF3B30]";
    deltaText = `${deltaPts >= 0 ? "+" : ""}${deltaPts.toFixed(1)} pts`;
  } else if (typeof deltaAbs === "number") {
    arrow = deltaAbs >= 0 ? "↑" : "↓";
    const isGood = invertColor ? deltaAbs <= 0 : deltaAbs >= 0;
    colorClass = isGood ? "text-[#34C759]" : "text-[#FF3B30]";
    deltaText = `${deltaAbs >= 0 ? "+" : ""}${deltaAbs}`;
  }

  return (
    <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-4">
      <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">{label}</div>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <div className={`text-xl font-semibold ${valueColor}`}>{value}</div>
        {extra && (
          <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] font-medium">{extra}</div>
        )}
      </div>
      {hint && (
        <div className="mt-1 text-[10px] text-[#8E8E93] truncate">{hint}</div>
      )}
      {arrow && (
        <div
          className={`mt-1.5 text-xs flex items-center gap-1 ${colorClass}`}
        >
          <span>{arrow}</span>
          <span className="font-medium">{deltaText}</span>
          {suffix && (
            <span className="text-[#8E8E93] font-normal ml-1">{suffix}</span>
          )}
        </div>
      )}
    </div>
  );
}

function CycleRow({
  label,
  days,
  delta,
}: {
  label: string;
  days: number;
  delta: number;
}) {
  const fmtDays = `${days.toFixed(1)} days`;
  const deltaAbs = Math.abs(delta);
  const isGood = delta <= 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6E6E73] dark:text-[#8E8E93]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{fmtDays}</span>
        {deltaAbs > 0.05 && (
          <span
            className={`flex items-center gap-0.5 text-[10px] ${
              isGood ? "text-[#34C759]" : "text-[#FF3B30]"
            }`}
          >
            {isGood ? "↑" : "↓"} {deltaAbs.toFixed(1)} days
          </span>
        )}
      </div>
    </div>
  );
}