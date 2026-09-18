"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/table";
import type { HomeData } from "@/features/home/queries";

// ============================ HELPERS ============================

function fmtFull(n: number) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function statusTone(
  s: string
):
  | "green"
  | "blue"
  | "grey"
  | "red"
  | "orange"
  | "yellow" {
  if (s === "WAITING_BAST" || s === "READY_TO_SHIP") return "orange";
  if (s === "COMPLIANCE") return "red";
  if (s === "SHIPMENT" || s === "APPROVED") return "blue";
  if (s === "DRAFT") return "grey";
  return "blue";
}

// ============================ MAIN ============================

export function HomeClient({ data }: { data: HomeData }) {
  const {
    profile,
    greeting,
    today,
    kpis,
    todayPanel,
    nextActions,
    orderProgress,
    complianceQuota,
    recentActivity,
  } = data;

  return (
    <div className="space-y-6">
      {/* ============================ GREETING ============================ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}, {profile.full_name}
          </h1>
          <p className="mt-1 text-sm text-[#6E6E73] dark:text-[#8E8E93]">{today}</p>
        </div>
        <div className="text-right text-xs text-[#8E8E93] max-w-xs">
          <div className="italic">"Keep the flow moving."</div>
          <div className="mt-0.5">— AmmoBiz Team</div>
        </div>
      </div>

      {/* ============================ KPI CARDS ============================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          value={kpis.waitingBast}
          label="Waiting BAST"
          hint="+2 from yesterday"
          dotColor="#FFCC00"
        />
        <KpiCard
          value={kpis.draftOrders}
          label="Draft orders"
          hint="Needs review"
          dotColor="#8E8E93"
        />
        <KpiCard
          value={kpis.readyToShip}
          label="Ready to ship"
          hint="On schedule"
          dotColor="#34C759"
        />
        <KpiCard
          value={kpis.complianceBlocked}
          label="Compliance blocked"
          hint="Requires action"
          dotColor="#FF3B30"
        />

        {/* Today panel */}
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">Today</div>
              <div className="text-sm font-medium mt-0.5">{today.split(",")[1]?.trim() ?? today}</div>
            </div>
            <svg
              className="w-5 h-5 text-[#1D1D1F] dark:text-[#F5F5F7]"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4.5" width="14" height="13" rx="2" />
              <path d="M3 8.5h14M7 3v3M13 3v3" />
            </svg>
          </div>
          <div className="space-y-1.5 text-xs">
            <TodayRow label="PO created" value={todayPanel.poCreated} />
            <TodayRow label="Shipment confirmed" value={todayPanel.shipmentConfirmed} />
            <TodayRow label="BAST completed" value={todayPanel.bastCompleted} />
            <TodayRow label="Compliance alert" value={todayPanel.complianceAlert} />
          </div>
        </div>
      </div>

      {/* ============================ ROW 2: Next Actions | Order Progress ============================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next actions */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
          <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex items-center justify-between">
            <div className="font-semibold">Next actions</div>
            <Link
              href="/orders"
              className="text-xs text-[#0A84FF] hover:underline"
            >
              View all →
            </Link>
          </div>

          <Table>
            <THead>
              <TR>
                <TH className="w-8">#</TH>
                <TH>Item</TH>
                <TH>Customer / Site</TH>
                <TH>Status</TH>
                <TH>Due</TH>
                <TH>Action</TH>
              </TR>
            </THead>
            <TBody>
              {nextActions.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-center text-[#6E6E73] dark:text-[#8E8E93] py-10">
                    Tidak ada action saat ini. Semua aman ✅
                  </TD>
                </TR>
              ) : (
                nextActions.map((a, i) => (
                  <TR key={a.id}>
                    <TD className="text-xs text-[#8E8E93]">{i + 1}</TD>
                    <TD>
                      <Link
                        href={a.action_href}
                        className="font-medium hover:text-[#0A84FF]"
                      >
                        PO #{a.order_number.replace(/^SO-\d+-/, "")}
                      </Link>
                      <div className="text-xs text-[#8E8E93]">
                        {a.po_number
                          ? `Customer PO ${a.po_number}`
                          : a.status_label}
                      </div>
                    </TD>
                    <TD className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
                      {a.customer_name} / {a.site_name}
                    </TD>
                    <TD>
                      <Badge tone={statusTone(a.status)}>
                        {a.status_label}
                      </Badge>
                    </TD>
                    <TD className="text-xs">
                      {a.urgency === "overdue" ? (
                        <span className="text-[#FF3B30] font-medium">
                          2 days ago
                        </span>
                      ) : a.urgency === "today" ? (
                        <span className="text-[#FF3B30] font-medium">Today</span>
                      ) : (
                        <span className="text-[#8E8E93]">—</span>
                      )}
                    </TD>
                    <TD>
                      <Link
                        href={a.action_href}
                        className="text-[#0A84FF] text-xs font-medium hover:underline"
                      >
                        {a.action_label} →
                      </Link>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>

        {/* Order progress */}
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Order progress</div>
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1">
              This month
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 7l4.5 4.5L14.5 7z" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            {orderProgress.map((p) => {
              const pct = p.total > 0 ? (p.count / p.total) * 100 : 0;
              return (
                <div key={p.stage} className="flex items-center gap-3 text-xs">
                  <span className="w-24 text-[#6E6E73] dark:text-[#8E8E93] truncate">
                    {p.stage.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 h-2 bg-[#F2F2F4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0A84FF] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {p.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================ ROW 3: Recent Activity | Compliance Quota | Quick Links ============================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
          <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex items-center justify-between">
            <div className="font-semibold">Recent activity</div>
            <Link
              href="/orders"
              className="text-xs text-[#0A84FF] hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[#F2F2F4]">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-xs text-[#6E6E73] dark:text-[#8E8E93] text-center">
                Belum ada aktivitas.
              </div>
            ) : (
              recentActivity.map((a) => (
                <div
                  key={a.id}
                  className="px-5 py-3 flex items-center gap-3 text-xs"
                >
                  <span className="text-[#8E8E93] w-10 shrink-0">
                    {a.time}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      a.tone === "green"
                        ? "bg-[#34C759]"
                        : a.tone === "blue"
                          ? "bg-[#0A84FF]"
                          : a.tone === "orange"
                            ? "bg-[#FF9500]"
                            : "bg-[#8E8E93]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {a.reference} {a.action}
                    </div>
                    <div className="text-[10px] text-[#8E8E93] truncate">
                      by {a.actor}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Compliance quota */}
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Compliance quota</div>
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1">
              {complianceQuota.sk_number ?? "All SK"}
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 7l4.5 4.5L14.5 7z" />
              </svg>
            </div>
          </div>

          {complianceQuota.allocation === 0 ? (
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] text-center py-8">
              Belum ada SK aktif.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">
                    {complianceQuota.utilization.toFixed(0)}%
                  </span>
                  <span className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">Utilized</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {fmtFull(complianceQuota.available)}
                  </div>
                  <div className="text-[10px] text-[#8E8E93]">Available</div>
                </div>
              </div>
              <div className="w-full h-2 bg-[#F2F2F4] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#34C759] transition-all"
                  style={{ width: `${complianceQuota.utilization}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#F2F2F4] text-center">
                <div>
                  <div className="text-sm font-semibold">
                    {fmtFull(complianceQuota.realized)}
                  </div>
                  <div className="text-[10px] text-[#8E8E93] mt-0.5">
                    Realized
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {fmtFull(complianceQuota.committed)}
                  </div>
                  <div className="text-[10px] text-[#8E8E93] mt-0.5">
                    Committed
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {fmtFull(complianceQuota.allocation)}
                  </div>
                  <div className="text-[10px] text-[#8E8E93] mt-0.5">
                    Allocation
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
          <div className="font-semibold mb-4">Quick links</div>
          <div className="grid grid-cols-4 gap-2">
            <QuickLink href="/orders/new" label="New Order" icon="file" />
            <QuickLink href="/compliance" label="Check Quota" icon="shield" />
            <QuickLink href="/spatial" label="View Map" icon="map" />
            <QuickLink
              href="/reports"
              label="Generate Report"
              icon="chart"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================ SUB-COMPONENTS ============================

function KpiCard({
  value,
  label,
  hint,
  dotColor,
}: {
  value: number;
  label: string;
  hint: string;
  dotColor: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
      <div className="text-4xl font-semibold leading-none">{value}</div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{label}</span>
      </div>
      <div className="mt-1 text-[10px] text-[#8E8E93] pl-4">{hint}</div>
    </div>
  );
}

function TodayRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6E6E73] dark:text-[#8E8E93]">{label}</span>
      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "file" | "shield" | "map" | "chart";
}) {
  const icons: Record<string, React.ReactNode> = {
    file: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 3h7l3 3v11H5z" />
        <path d="M12 3v3h3M7 9h6M7 12h6M7 15h4" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 3l6 2v5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V5z" />
      </svg>
    ),
    map: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 5l4-2 6 2 4-2v12l-4 2-6-2-4 2z" />
        <path d="M7 3v12M13 5v12" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 16h12M6 12v4M10 8v8M14 4v12" />
      </svg>
    ),
  };

  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 py-3 rounded-lg hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E] transition"
    >
      <div className="w-6 h-6 text-[#1D1D1F] dark:text-[#F5F5F7]">{icons[icon]}</div>
      <div className="text-[10px] text-center text-[#6E6E73] dark:text-[#8E8E93] leading-tight">
        {label}
      </div>
    </Link>
  );
}