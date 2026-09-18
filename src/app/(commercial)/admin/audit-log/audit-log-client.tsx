"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import type { AuditLog } from "@/features/admin/audit/queries";

// ============================ HELPERS ============================

function actionTone(
  a: string
): "blue" | "green" | "orange" | "red" | "grey" {
  const s = a.toLowerCase();
  if (s.includes("delete") || s.includes("cancel")) return "red";
  if (s.includes("create") || s.includes("approve")) return "green";
  if (s.includes("update") || s.includes("edit")) return "blue";
  if (s.includes("login") || s.includes("logout")) return "grey";
  return "grey";
}

function resultTone(r: string): "green" | "red" {
  return r === "SUCCESS" ? "green" : "red";
}

// ============================ MAIN ============================

export function AuditLogClient({
  rows,
  total,
  page,
  totalPages,
  filters,
  stats,
  query,
}: {
  rows: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    modules: string[];
    actions: string[];
    actors: { id: string; name: string }[];
  };
  stats: { total: number; today: number; failed: number };
  query: {
    q: string;
    module: string;
    action: string;
    result: string;
    actor: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [selected, setSelected] = useState<AuditLog | null>(null);

  function buildHref(p: number) {
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  }

  function submitFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams();
    const q = String(fd.get("q") ?? "");
    const mod = String(fd.get("module") ?? "");
    const act = String(fd.get("action") ?? "");
    const res = String(fd.get("result") ?? "");
    const usr = String(fd.get("actor") ?? "");
    const fr = String(fd.get("from") ?? "");
    const to = String(fd.get("to") ?? "");

    if (q) sp.set("q", q);
    if (mod && mod !== "all") sp.set("module", mod);
    if (act && act !== "all") sp.set("action", act);
    if (res && res !== "all") sp.set("result", res);
    if (usr) sp.set("actor", usr);
    if (fr) sp.set("from", fr);
    if (to) sp.set("to", to);

    router.push(`${pathname}?${sp.toString()}`);
  }

  function resetFilters() {
    router.push(pathname);
  }

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Events" value={stats.total} />
        <StatCard label="Today" value={stats.today} tone="blue" />
        <StatCard label="Failed Events" value={stats.failed} tone="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table */}
        <div className={selected ? "lg:col-span-7" : "lg:col-span-12"}>
          <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl">
            {/* Filters */}
            <form
              onSubmit={submitFilter}
              className="p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3"
            >
              <div className="flex gap-2 flex-wrap">
                <Input
                  name="q"
                  defaultValue={query.q}
                  placeholder="Search action, module, resource..."
                  className="flex-1 min-w-[200px]"
                />
                <Button type="submit" variant="secondary">
                  Search
                </Button>
                <Button type="button" variant="ghost" onClick={resetFilters}>
                  Reset
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select
                  name="module"
                  defaultValue={query.module}
                  className="max-w-[180px]"
                >
                  <option value="all">All Modules</option>
                  {filters.modules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>

                <Select
                  name="action"
                  defaultValue={query.action}
                  className="max-w-[180px]"
                >
                  <option value="all">All Actions</option>
                  {filters.actions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>

                <Select
                  name="result"
                  defaultValue={query.result}
                  className="max-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </Select>

                <Select
                  name="actor"
                  defaultValue={query.actor}
                  className="max-w-[200px]"
                >
                  <option value="">All Users</option>
                  {filters.actors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            </form>

            {/* Table */}
            <Table>
              <THead>
                <TR>
                  <TH>Timestamp</TH>
                  <TH>User</TH>
                  <TH>Action</TH>
                  <TH>Module</TH>
                  <TH>Description</TH>
                  <TH>Result</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="text-center text-[#6E6E73] py-10">
                      Belum ada audit log.
                    </TD>
                  </TR>
                ) : (
                  rows.map((l) => (
                    <TR
                      key={l.id}
                      className={`cursor-pointer ${
                        selected?.id === l.id
                          ? "bg-[#EAF2FB] dark:bg-[#0A84FF]/10"
                          : ""
                      }`}
                    >
                      <TD
                        className="text-xs text-[#6E6E73] whitespace-nowrap"
                        onClick={() => setSelected(l)}
                      >
                        {new Date(l.timestamp).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TD>
                      <TD className="text-sm" onClick={() => setSelected(l)}>
                        {l.actor_name ?? l.actor_email ?? "—"}
                      </TD>
                      <TD onClick={() => setSelected(l)}>
                        <Badge tone={actionTone(l.action)}>{l.action}</Badge>
                      </TD>
                      <TD
                        className="text-sm text-[#6E6E73]"
                        onClick={() => setSelected(l)}
                      >
                        {l.module}
                      </TD>
                      <TD
                        className="text-xs text-[#6E6E73] max-w-[300px] truncate"
                        onClick={() => setSelected(l)}
                      >
                        {l.resource_type
                          ? `${l.resource_type} ${l.resource_id?.slice(0, 8) ?? ""}`
                          : l.reason ?? "—"}
                      </TD>
                      <TD onClick={() => setSelected(l)}>
                        <Badge tone={resultTone(l.result)}>{l.result}</Badge>
                      </TD>
                      <TD className="text-right">
                        <button className="text-[#6E6E73] hover:text-[#1D1D1F] px-2">
                          ⋯
                        </button>
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

        {/* Detail Panel */}
        {selected && (
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl overflow-hidden sticky top-24">
              <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
                <div className="font-semibold">Log Details</div>
                <button
                  onClick={() => setSelected(null)}
                  className="h-7 w-7 rounded-lg hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E] flex items-center justify-center text-[#6E6E73]"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EAF2FB] dark:bg-[#0A84FF]/10 flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-[#0A84FF]"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <rect x="3" y="5" width="14" height="10" rx="2" />
                      <path d="M7 15v2h6v-2" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{selected.action}</div>
                    <div className="text-xs text-[#6E6E73] mt-0.5">
                      {new Date(selected.timestamp).toLocaleString("id-ID")}
                    </div>
                    <div className="mt-2">
                      <Badge tone={resultTone(selected.result)}>
                        {selected.result}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                  <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                    User Information
                  </div>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Name" value={selected.actor_name ?? "—"} />
                    <DetailRow
                      label="Email"
                      value={selected.actor_email ?? "—"}
                    />
                    <DetailRow label="Role" value={selected.actor_role ?? "—"} />
                  </div>
                </div>

                {/* Event Info */}
                <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                  <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                    Event Information
                  </div>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Module" value={selected.module} />
                    <DetailRow label="Action" value={selected.action} />
                    <DetailRow
                      label="Resource Type"
                      value={selected.resource_type ?? "—"}
                    />
                    <DetailRow
                      label="Resource ID"
                      value={selected.resource_id?.slice(0, 12) ?? "—"}
                      mono
                    />
                    <DetailRow
                      label="Session ID"
                      value={selected.session_id?.slice(0, 16) ?? "—"}
                      mono
                    />
                    <DetailRow
                      label="Request ID"
                      value={selected.request_id?.slice(0, 16) ?? "—"}
                      mono
                    />
                  </div>
                </div>

                {/* Reason */}
                {selected.reason && (
                  <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                    <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Reason
                    </div>
                    <div className="text-sm">{selected.reason}</div>
                  </div>
                )}

                {/* Changes */}
                {(selected.new_value || selected.old_value) && (
                  <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                    <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Changes
                    </div>
                    <pre className="bg-[#F6F6F7] dark:bg-[#0A0A0A] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg p-3 text-[11px] font-mono overflow-x-auto max-h-[200px]">
                      {JSON.stringify(
                        {
                          before: selected.old_value,
                          after: selected.new_value,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ SUB-COMPONENTS ============================

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "blue" | "red";
}) {
  const color =
    tone === "blue"
      ? "text-[#0A84FF]"
      : tone === "red"
        ? "text-[#FF3B30]"
        : "text-[#1D1D1F] dark:text-[#F5F5F7]";
  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-4">
      <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[#6E6E73] dark:text-[#8E8E93] shrink-0 text-xs">
        {label}
      </span>
      <span
        className={`text-right truncate ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {value}
      </span>
    </div>
  );
}