"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

// ============================ TYPES ============================

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_ref: string | null;
  invoice_type: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  amount_with_tax: number;
  paid_amount: number;
  status: string;
  customers?: { id: string; code: string; name: string } | null;
  orders?: { id: string; order_number: string } | null;
};

type UninvoicedOrder = {
  id: string;
  order_number: string;
  status: string;
  business_model: string;
  current_stage: string;
  selling_value: number;
  issued: number;
  uninvoiced: number;
  currency: string;
  customer_name: string;
  customer_code: string;
  site_name: string;
  created_at: string;
};

type Dashboard = {
  totals: {
    invoices: number;
    issued: number;
    orders: number;
    ordersWithOutstanding: number;
    ordersUninvoiced: number;
    overdue: number;
    orderValue: number;
    issuedTotal: number;
    uninvoiced: number;
    paid: number;
    outstanding: number;
    overdueAmount: number;
  };
  buckets: { bucket: string; count: number; amount: number }[];
  recent: unknown[];
};

// ============================ CONSTANTS ============================

const TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "ISSUED", label: "Issued" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIAL_PAID", label: "Partial" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "CANCELLED", label: "Cancelled" },
];

// ============================ HELPERS ============================

function reasonForUninvoiced(o: UninvoicedOrder): {
  text: string;
  tone: "info" | "warning" | "danger";
} {
  const bm = o.business_model;
  const status = o.status;

  if (["Consignment", "Managed Inventory / VMI"].includes(bm)) {
    return { text: "Invoice bulanan (Monthly Usage)", tone: "info" };
  }
  if (["APPROVED", "ISSUED"].includes(status)) {
    return {
      text: "Komersial belum terbitkan invoice",
      tone: "info",
    };
  }
  if (status === "IN_PROGRESS") {
    return { text: "Menunggu shipment selesai", tone: "warning" };
  }
  if (status === "PARTIALLY_FULFILLED") {
    return {
      text: "Partial fulfilled — menunggu sisa shipment",
      tone: "info",
    };
  }
  if (status === "FULFILLED") {
    return { text: "Menunggu BAST completed", tone: "warning" };
  }
  if (status === "CLOSED") {
    return {
      text: "⚠️ Order closed tapi belum di-invoice",
      tone: "danger",
    };
  }
  return { text: "—", tone: "info" };
}

// ============================ MAIN ============================

export function InvoicingClient({
  rows,
  total,
  page,
  totalPages,
  q,
  status,
  customerId,
  customers,
  dashboard,
  uninvoicedOrders,
  permissions,
}: {
  rows: InvoiceRow[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
  status: string;
  customerId: string;
  customers: { id: string; name: string; code: string }[];
  dashboard: Dashboard;
  uninvoicedOrders: UninvoicedOrder[];
  permissions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const t = dashboard.totals;

  function buildHref(p: number) {
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  }

  function selectTab(key: string) {
    const sp = new URLSearchParams(search.toString());
    if (key === "all") sp.delete("status");
    else sp.set("status", key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams(search.toString());
    const nq = String(fd.get("q") ?? "");
    const nc = String(fd.get("customer") ?? "");
    if (nq) sp.set("q", nq);
    else sp.delete("q");
    if (nc) sp.set("customer", nc);
    else sp.delete("customer");
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const fmt = (n: number, currency = "IDR") =>
    `${currency} ${Number(n).toLocaleString("id-ID", {
      maximumFractionDigits: 0,
    })}`;

  // Progress vs Order Value
  const pctPaid = t.orderValue > 0 ? (t.paid / t.orderValue) * 100 : 0;
  const pctIssued = t.orderValue > 0 ? (t.issuedTotal / t.orderValue) * 100 : 0;
  const pctOutstandingOfValue =
    t.orderValue > 0 ? (t.outstanding / t.orderValue) * 100 : 0;
  const pctUninvoiced = Math.max(0, 100 - pctIssued);

  return (
    <div className="space-y-6">
      {/* KPI ROW — 6 CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Orders"
          value={String(t.orders)}
          hint={`${t.ordersWithOutstanding} with outstanding`}
        />
        <KpiCard label="Order Value" value={fmt(t.orderValue)} />
        <KpiCard
          label="Issued"
          value={fmt(t.issuedTotal)}
          hint={`${t.issued} invoice${t.issued === 1 ? "" : "s"} terbit`}
          tone="blue"
        />
        <KpiCard
          label="Uninvoiced"
          value={fmt(t.uninvoiced)}
          hint={`${t.ordersUninvoiced} order belum diterbitkan`}
          tone="orange"
        />
        <KpiCard
          label="Paid"
          value={fmt(t.paid)}
          hint={`${pctPaid.toFixed(0)}% of order value`}
          tone="green"
        />
        <KpiCard
          label="Outstanding"
          value={fmt(t.outstanding)}
          hint={
            t.overdue > 0
              ? `${t.overdue} overdue · ${fmt(t.overdueAmount)}`
              : `${pctOutstandingOfValue.toFixed(0)}% of order value`
          }
          tone="red"
        />
      </div>

      {/* PROGRESS VS ORDER VALUE */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold">
              Composition vs Order Value
            </div>
            <div className="text-xs text-[#6E6E73] mt-0.5">
              Outstanding = Issued − Paid (dari invoice yang sudah terbit)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6E6E73] uppercase tracking-wide">
              Outstanding
            </div>
            <div className="text-lg font-semibold text-[#FF3B30]">
              {fmt(t.outstanding)}
            </div>
          </div>
        </div>

        <div className="w-full h-3 bg-[#F2F2F4] rounded-full overflow-hidden flex">
          <div
            className="bg-[#34C759] transition-all"
            style={{ width: `${pctPaid}%` }}
            title={`Paid ${pctPaid.toFixed(1)}%`}
          />
          <div
            className="bg-[#FF3B30] transition-all"
            style={{
              width: `${
                t.orderValue > 0
                  ? (t.outstanding / t.orderValue) * 100
                  : 0
              }%`,
            }}
            title="Outstanding (issued, belum paid)"
          />
          <div
            className="bg-[#FF9500] transition-all"
            style={{ width: `${pctUninvoiced}%` }}
            title={`Uninvoiced ${pctUninvoiced.toFixed(1)}%`}
          />
        </div>

        <div className="flex gap-4 mt-2 text-[10px] text-[#6E6E73] flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#34C759]" />
            Paid ({fmt(t.paid)})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF3B30]" />
            Outstanding ({fmt(t.outstanding)})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500]" />
            Uninvoiced ({fmt(t.uninvoiced)})
          </span>
        </div>
      </div>

      {/* UNINVOICED ORDERS LIST */}
      {uninvoicedOrders.length > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-xl">
          <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold">Uninvoiced Orders</h2>
              <p className="text-xs text-[#6E6E73] mt-0.5">
                Order yang belum diterbitkan invoice-nya
              </p>
            </div>
            <Badge tone="orange">
              {uninvoicedOrders.length} order ·{" "}
              {fmt(
                uninvoicedOrders.reduce((a, o) => a + o.uninvoiced, 0)
              )}
            </Badge>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Customer / Site</TH>
                <TH>Business Model</TH>
                <TH>Status</TH>
                <TH>Reason</TH>
                <TH className="text-right">Uninvoiced</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {uninvoicedOrders.map((o) => {
                const reason = reasonForUninvoiced(o);
                return (
                  <TR key={o.id}>
                    <TD>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-medium hover:text-[#0A84FF]"
                      >
                        {o.order_number}
                      </Link>
                    </TD>
                    <TD>
                      <div className="text-sm">{o.customer_name}</div>
                      <div className="text-xs text-[#8E8E93]">
                        {o.site_name}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone="grey">{o.business_model}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    </TD>
                    <TD>
                      <ReasonBadge text={reason.text} tone={reason.tone} />
                    </TD>
                    <TD className="text-right font-mono text-xs text-[#FF9500]">
                      {fmt(o.uninvoiced, o.currency)}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-[#0A84FF] text-xs hover:underline"
                      >
                        Open →
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}

      {/* AGING */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="text-sm font-semibold">Invoice Aging</div>
          <div className="text-xs text-[#6E6E73]">
            Basis: invoice terbit (ISSUED/SENT/PARTIAL_PAID/OVERDUE)
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {dashboard.buckets.map((b) => (
            <div
              key={b.bucket}
              className="border border-[#E5E5EA] rounded-lg px-4 py-3"
            >
              <div className="text-xs text-[#6E6E73] uppercase tracking-wide">
                {b.bucket === "CURRENT" ? "Not Due" : `${b.bucket} days`}
              </div>
              <div
                className={`mt-1 text-lg font-semibold ${
                  b.bucket === "90+"
                    ? "text-[#FF3B30]"
                    : b.bucket === "61-90"
                      ? "text-[#FF9500]"
                      : "text-[#1D1D1F]"
                }`}
              >
                {b.count}
              </div>
              <div className="mt-0.5 text-xs text-[#6E6E73] font-mono">
                {fmt(b.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INVOICE LIST */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl">
        <div className="p-4 border-b border-[#E5E5EA] flex flex-col gap-4">
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex gap-1 min-w-max px-1">
              {TABS.map((tab) => {
                const active = (status || "all") === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => selectTab(tab.key)}
                    className={`h-9 px-3 rounded-lg text-sm whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-[#EAF2FB] text-[#0A84FF] font-medium"
                        : "text-[#6E6E73] hover:bg-[#F2F2F4]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={submitSearch}
            className="flex flex-1 gap-2 flex-wrap"
          >
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search invoice number..."
              className="max-w-xs"
            />
            <Select
              name="customer"
              defaultValue={customerId}
              className="max-w-[220px]"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Customer</TH>
              <TH>Order</TH>
              <TH>Type</TH>
              <TH>Date</TH>
              <TH>Due</TH>
              <TH className="text-right">Total</TH>
              <TH className="text-right">Paid</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={10} className="text-center text-[#6E6E73] py-10">
                  Belum ada invoice.
                </TD>
              </TR>
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link
                      href={`/invoicing/${r.id}`}
                      className="font-medium hover:text-[#0A84FF]"
                    >
                      {r.invoice_number}
                    </Link>
                    {r.invoice_ref && (
                      <div className="text-xs text-[#8E8E93]">
                        {r.invoice_ref}
                      </div>
                    )}
                  </TD>
                  <TD className="text-sm">{r.customers?.name ?? "—"}</TD>
                  <TD>
                    {r.orders ? (
                      <Link
                        href={`/orders/${r.orders.id}`}
                        className="text-xs text-[#0A84FF] hover:underline"
                      >
                        {r.orders.order_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    <Badge tone="grey">{r.invoice_type}</Badge>
                  </TD>
                  <TD className="text-xs">{r.invoice_date}</TD>
                  <TD className="text-xs">{r.due_date ?? "—"}</TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(r.amount_with_tax), r.currency)}
                  </TD>
                  <TD className="text-right font-mono text-xs text-[#34C759]">
                    {fmt(Number(r.paid_amount), r.currency)}
                  </TD>
                  <TD>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/invoicing/${r.id}`}
                      className="text-[#0A84FF] text-sm hover:underline"
                    >
                      View →
                    </Link>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={20}
          buildHref={buildHref}
        />
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
  tone?: "neutral" | "blue" | "orange" | "red" | "green";
}) {
  const color =
    tone === "blue"
      ? "text-[#0A84FF]"
      : tone === "orange"
        ? "text-[#FF9500]"
        : tone === "red"
          ? "text-[#FF3B30]"
          : tone === "green"
            ? "text-[#34C759]"
            : "text-[#1D1D1F]";
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl p-4">
      <div className="text-xs text-[#6E6E73] uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-2 text-lg font-semibold ${color} truncate`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[10px] text-[#8E8E93] truncate">{hint}</div>
      )}
    </div>
  );
}

function ReasonBadge({
  text,
  tone,
}: {
  text: string;
  tone: "info" | "warning" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "bg-[#FF3B30]/10 text-[#B71C1C] border-[#FF3B30]/30"
      : tone === "warning"
        ? "bg-[#FF9500]/10 text-[#A15C00] border-[#FF9500]/30"
        : "bg-[#EAF2FB] text-[#0A84FF] border-[#0A84FF]/30";
  return (
    <span
      className={`inline-block text-[11px] px-2 py-1 rounded-md border ${cls}`}
    >
      {text}
    </span>
  );
}

function statusTone(
  s: string
): "green" | "blue" | "grey" | "red" | "orange" {
  if (s === "PAID" || s === "CLOSED") return "green";
  if (s === "PARTIAL_PAID" || s === "PARTIALLY_FULFILLED") return "orange";
  if (s === "OVERDUE") return "red";
  if (s === "ISSUED" || s === "SENT" || s === "IN_PROGRESS" || s === "FULFILLED")
    return "blue";
  return "grey";
}