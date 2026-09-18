"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

// ============================ TYPES ============================

type FlowOrder = {
  id: string;
  order_number: string;
  po_number: string | null;
  status: string;
  business_model: string;
  current_stage: string;
  effective_stage: string;
  selling_value: number;
  currency: string;
  updated_at: string;
  compliance_status: string;
  procurement_status: string;
  shipment_status: string;
  delivery_status: string;
  bast_status: string;
  customers?: { id: string; code: string; name: string } | null;
  sites?: { id: string; code: string; name: string } | null;
};

type Counters = {
  total: number;
  byStage: Record<string, number>;
  byStatus: Record<string, number>;
};

// ============================ CONSTANTS ============================

const STAGES: {
  key: string;
  label: string;
  color: string;
  bg: string;
}[] = [
  { key: "all", label: "All", color: "#1D1D1F", bg: "#F2F2F4" },
  { key: "PO", label: "PO", color: "#6E6E73", bg: "#F2F2F4" },
  {
    key: "PROCUREMENT",
    label: "Procurement",
    color: "#0A84FF",
    bg: "#EAF2FB",
  },
  { key: "SHIPMENT", label: "Shipment", color: "#FF9500", bg: "#FFF4E5" },
  { key: "DELIVERY", label: "Delivery", color: "#5E5CE6", bg: "#EFEEFC" },
  { key: "BAST", label: "BAST", color: "#34C759", bg: "#E8F8EC" },
  {
    key: "COMPLETE",
    label: "Complete",
    color: "#34C759",
    bg: "#E8F8EC",
  },
  {
    key: "CONSIGNMENT",
    label: "Consignment",
    color: "#6E6E73",
    bg: "#F2F2F4",
  },
];

const VIEWS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft / Not Started" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "blocked", label: "Blocked" },
];

// ============================ HELPERS ============================

function stageStatusFor(order: FlowOrder): {
  value: string;
  label: string;
} {
  const stage = order.effective_stage;
  if (stage === "PO") {
    if (order.status === "APPROVED") return { value: "APPROVED", label: "PO" };
    if (order.status === "SUBMITTED") return { value: "SUBMITTED", label: "PO" };
    if (order.status === "UNDER_REVIEW")
      return { value: "UNDER_REVIEW", label: "PO" };
    if (order.status === "RETURNED") return { value: "RETURNED", label: "PO" };
    return { value: "DRAFT", label: "PO" };
  }
  if (stage === "PROCUREMENT")
    return { value: order.procurement_status, label: "Procurement" };
  if (stage === "SHIPMENT")
    return { value: order.shipment_status, label: "Shipment" };
  if (stage === "DELIVERY")
    return { value: order.delivery_status, label: "Delivery" };
  if (stage === "BAST") return { value: order.bast_status, label: "BAST" };
  if (stage === "COMPLETE") return { value: "COMPLETED", label: "Complete" };
  return { value: "NOT_STARTED", label: stage };
}

function nextAction(order: FlowOrder): {
  text: string;
  tone: "blue" | "orange" | "green" | "grey" | "red";
} {
  const stage = order.effective_stage;
  const status = order.status;

  // Belum di-approve
  if (["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED"].includes(status)) {
    return { text: "Review / Approve", tone: "grey" };
  }
  if (status === "APPROVED") {
    return { text: "Issue Order", tone: "blue" };
  }

  if (stage === "PO") return { text: "Open Order", tone: "grey" };
  if (stage === "PROCUREMENT")
    return { text: "Complete Procurement", tone: "blue" };
  if (stage === "SHIPMENT") return { text: "Track Shipment", tone: "orange" };
  if (stage === "DELIVERY") return { text: "Confirm Delivery", tone: "blue" };
  if (stage === "BAST") return { text: "Complete BAST", tone: "green" };
  if (stage === "COMPLETE") return { text: "View Details", tone: "grey" };
  return { text: "Open Order", tone: "grey" };
}

function statusToneFor(
  s: string
): "green" | "blue" | "grey" | "red" | "orange" | "yellow" {
  if (s === "COMPLETED" || s === "VERIFIED" || s === "APPROVED")
    return "green";
  if (s === "SUBMITTED" || s === "UNDER_REVIEW") return "blue";
  if (s === "DRAFT") return "yellow";
  if (s === "RETURNED") return "orange";
  if (s === "NOT_STARTED") return "grey";
  return "grey";
}

function stageBadgeTone(
  stage: string
): "green" | "blue" | "grey" | "red" | "orange" | "yellow" {
  if (stage === "COMPLETE" || stage === "BAST") return "green";
  if (stage === "PROCUREMENT") return "blue";
  if (stage === "SHIPMENT") return "orange";
  if (stage === "DELIVERY") return "blue";
  if (stage === "PO") return "grey";
  return "grey";
}

// ============================ MAIN ============================

export function FlowClient({
  rows,
  total,
  page,
  totalPages,
  q,
  stage,
  view,
  counters,
}: {
  rows: FlowOrder[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
  stage: string;
  view: string;
  counters: Counters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const activeStage = stage || "all";
  const activeView = view || "all";

  function buildHref(p: number) {
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  }

  function selectStage(key: string) {
    const sp = new URLSearchParams(search.toString());
    if (key === "all") sp.delete("stage");
    else sp.set("stage", key);
    sp.delete("page");
    if (key !== activeStage) sp.set("view", "all");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function selectView(key: string) {
    const sp = new URLSearchParams(search.toString());
    if (key === "all") sp.delete("view");
    else sp.set("view", key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams(search.toString());
    const nq = String(fd.get("q") ?? "");
    if (nq) sp.set("q", nq);
    else sp.delete("q");
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function countForStage(key: string) {
    if (key === "all") return counters.total;
    return counters.byStage[key] ?? 0;
  }

  return (
    <div className="space-y-4">
      {/* STAGE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {STAGES.filter((s) => s.key !== "all").map((s) => {
          const isActive = activeStage === s.key;
          const count = countForStage(s.key);
          return (
            <button
              key={s.key}
              onClick={() => selectStage(s.key)}
              className={`text-left bg-white border rounded-xl p-3 transition hover:border-[#0A84FF] ${
                isActive
                  ? "border-[#0A84FF] ring-2 ring-[#0A84FF]/10"
                  : "border-[#E5E5EA]"
              }`}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center mb-2"
                style={{ backgroundColor: s.bg }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
              </div>
              <div className="text-[10px] text-[#6E6E73] uppercase tracking-wide truncate">
                {s.label}
              </div>
              <div className="mt-0.5 text-xl font-semibold">{count}</div>
            </button>
          );
        })}
      </div>

      {/* STATUS SUMMARY */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl p-4">
        <div className="text-xs text-[#6E6E73] uppercase tracking-wide mb-3">
          Order Status Breakdown
        </div>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(counters.byStatus)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 bg-[#F6F6F7] border border-[#E5E5EA] rounded-lg px-3 py-1.5"
              >
                <span className="text-xs text-[#6E6E73]">{status}</span>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white border border-[#E5E5EA] rounded-xl">
        {/* STAGE TABS */}
        <div className="p-4 border-b border-[#E5E5EA] flex flex-col gap-3">
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex gap-1 min-w-max px-1">
              {STAGES.map((s) => {
                const isActive = activeStage === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => selectStage(s.key)}
                    className={`h-9 px-3 rounded-lg text-sm whitespace-nowrap shrink-0 flex items-center gap-2 ${
                      isActive
                        ? "bg-[#EAF2FB] text-[#0A84FF] font-medium"
                        : "text-[#6E6E73] hover:bg-[#F2F2F4]"
                    }`}
                  >
                    <span>{s.label}</span>
                    <span
                      className={`text-xs px-1.5 rounded-full min-w-[24px] text-center ${
                        isActive
                          ? "bg-[#0A84FF]/15 text-[#0A84FF]"
                          : "bg-[#F2F2F4]"
                      }`}
                    >
                      {countForStage(s.key)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUB-VIEWS + SEARCH */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {VIEWS.map((v) => {
                const isActive = activeView === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => selectView(v.key)}
                    className={`h-8 px-3 rounded-md text-xs ${
                      isActive
                        ? "bg-[#1D1D1F] text-white font-medium"
                        : "text-[#6E6E73] hover:bg-[#F2F2F4]"
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={submitSearch} className="flex gap-2">
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search by PO or order number..."
                className="max-w-xs h-8 text-sm"
              />
              <Button type="submit" size="sm" variant="secondary">
                Search
              </Button>
            </form>
          </div>
        </div>

        {/* TABLE */}
        <Table>
          <THead>
            <TR>
              <TH>Order / PO</TH>
              <TH>Customer</TH>
              <TH>Site</TH>
              <TH>Business</TH>
              <TH>Stage</TH>
              <TH>Stage Status</TH>
              <TH className="text-right">Value</TH>
              <TH>Next Action</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={8} className="text-center text-[#6E6E73] py-10">
                  {activeStage === "all" && activeView === "all"
                    ? "Belum ada order."
                    : "Tidak ada order yang cocok dengan filter."}
                </TD>
              </TR>
            ) : (
              rows.map((o) => {
                const stageInfo = stageStatusFor(o);
                const action = nextAction(o);
                return (
                  <TR key={o.id}>
                    <TD>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-medium hover:text-[#0A84FF]"
                      >
                        {o.order_number}
                      </Link>
                      <div className="text-xs text-[#8E8E93]">
                        {o.po_number ?? "No PO"}
                      </div>
                    </TD>
                    <TD className="text-[#6E6E73] text-sm">
                      {o.customers?.name ?? "—"}
                    </TD>
                    <TD className="text-[#6E6E73] text-sm">
                      {o.sites?.name ?? "—"}
                    </TD>
                    <TD>
                      <span className="text-xs">{o.business_model}</span>
                    </TD>
                    <TD>
                      <Badge tone={stageBadgeTone(o.effective_stage)}>
                        {o.effective_stage}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={statusToneFor(stageInfo.value)}>
                        {stageInfo.value.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD className="text-right font-mono text-xs">
                      {o.currency}{" "}
                      {Number(o.selling_value).toLocaleString("id-ID")}
                    </TD>
                    <TD>
                      <Link
                        href={`/orders/${o.id}`}
                        className={`text-xs font-medium hover:underline ${
                          action.tone === "blue"
                            ? "text-[#0A84FF]"
                            : action.tone === "orange"
                              ? "text-[#FF9500]"
                              : action.tone === "green"
                                ? "text-[#34C759]"
                                : action.tone === "red"
                                  ? "text-[#FF3B30]"
                                  : "text-[#6E6E73]"
                        }`}
                      >
                        {action.text} →
                      </Link>
                    </TD>
                  </TR>
                );
              })
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