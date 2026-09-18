"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { UserDetailPanel } from "./user-detail-panel";
import { AddUserModal } from "./add-user-modal";
import type { UserRow } from "@/features/admin/users/queries";

// ============================ HELPERS ============================

function getInitials(name: string | null, email: string) {
  const s = (name ?? email ?? "U")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return s || "U";
}

function roleTone(
  roleName: string
): "blue" | "green" | "orange" | "red" | "grey" | "purple" {
  const r = roleName.toLowerCase();
  if (r.includes("admin")) return "red";
  if (r.includes("manager")) return "blue";
  if (r.includes("supervisor")) return "purple";
  if (r.includes("compliance")) return "orange";
  if (r.includes("viewer")) return "grey";
  return "blue";
}

// ============================ MAIN ============================

export function UsersClient({
  users,
  stats,
  roles,
  orgs,
  permissions,
  query,
}: {
  users: UserRow[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    roles: number;
    departments: number;
  };
  roles: { id: string; name: string; display_name: string }[];
  orgs: { id: string; code: string; name: string; type: string }[];
  permissions: string[];
  query: { q: string; role: string; status: string; org: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [selected, setSelected] = useState<UserRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const canManage = permissions.includes("USER_MANAGE");

  function submitFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams();
    const q = String(fd.get("q") ?? "");
    const role = String(fd.get("role") ?? "");
    const status = String(fd.get("status") ?? "");
    const org = String(fd.get("org") ?? "");
    if (q) sp.set("q", q);
    if (role && role !== "all") sp.set("role", role);
    if (status && status !== "all") sp.set("status", status);
    if (org && org !== "all") sp.set("org", org);
    router.push(`${pathname}?${sp.toString()}`);
  }

  function resetFilters() {
    router.push(pathname);
  }

  return (
    <>
      <div className="space-y-4">
        {/* ============ KPI CARDS ============ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard
            icon="users"
            label="Total Users"
            value={stats.total}
            hint=""
          />
          <KpiCard
            icon="check"
            label="Active"
            value={stats.active}
            hint=""
            tone="green"
          />
          <KpiCard
            icon="x"
            label="Inactive"
            value={stats.inactive}
            hint=""
            tone="red"
          />
          <KpiCard
            icon="shield"
            label="Roles"
            value={stats.roles}
            hint=""
            tone="blue"
          />
          <KpiCard
            icon="team"
            label="Departments"
            value={stats.departments}
            hint=""
            tone="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============ TABLE ============ */}
          <div className={selected ? "lg:col-span-7" : "lg:col-span-12"}>
            <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl">
              {/* Filter bar */}
              <form
                onSubmit={submitFilter}
                className="p-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3"
              >
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[220px]">
                    <input
                      name="q"
                      defaultValue={query.q}
                      placeholder="Search users by name, email, or department..."
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-sm focus:outline-none focus:border-[#0A84FF]"
                    />
                    <svg
                      className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="8.5" cy="8.5" r="5.5" />
                      <path d="M13 13l4 4" />
                    </svg>
                  </div>
                  <Button type="submit" variant="secondary">
                    Filter
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetFilters}>
                    Reset
                  </Button>
                  {canManage && (
                    <Button onClick={() => setShowAdd(true)}>
                      + Add User
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Select
                    name="role"
                    defaultValue={query.role}
                    className="max-w-[200px]"
                  >
                    <option value="all">All Roles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    name="org"
                    defaultValue={query.org}
                    className="max-w-[220px]"
                  >
                    <option value="all">All Departments</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    name="status"
                    defaultValue={query.status}
                    className="max-w-[140px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </form>

              {/* Table */}
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Role(s)</TH>
                    <TH>Department</TH>
                    <TH>Status</TH>
                    <TH>Last Login</TH>
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {users.length === 0 ? (
                    <TR>
                      <TD
                        colSpan={7}
                        className="text-center text-[#6E6E73] py-10"
                      >
                        Tidak ada user.
                      </TD>
                    </TR>
                  ) : (
                    users.map((u) => (
                      <TR
                        key={u.id}
                        className={`cursor-pointer ${
                          selected?.id === u.id
                            ? "bg-[#EAF2FB] dark:bg-[#0A84FF]/10"
                            : ""
                        }`}
                      >
                        <TD onClick={() => setSelected(u)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EAF2FB] dark:bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center text-xs font-semibold shrink-0">
                              {getInitials(u.full_name, u.email)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {u.full_name ?? "—"}
                              </div>
                            </div>
                          </div>
                        </TD>
                        <TD
                          className="text-xs text-[#6E6E73]"
                          onClick={() => setSelected(u)}
                        >
                          {u.email}
                        </TD>
                        <TD onClick={() => setSelected(u)}>
                          <div className="flex gap-1 flex-wrap">
                            {u.roles.length === 0 ? (
                              <span className="text-xs text-[#8E8E93]">—</span>
                            ) : (
                              u.roles.slice(0, 2).map((r) => (
                                <Badge key={r.id} tone={roleTone(r.name)}>
                                  {r.display_name}
                                </Badge>
                              ))
                            )}
                            {u.roles.length > 2 && (
                              <span className="text-xs text-[#8E8E93]">
                                +{u.roles.length - 2}
                              </span>
                            )}
                          </div>
                        </TD>
                        <TD
                          className="text-sm text-[#6E6E73]"
                          onClick={() => setSelected(u)}
                        >
                          {u.organisation_name ?? u.department ?? "—"}
                        </TD>
                        <TD onClick={() => setSelected(u)}>
                          <Badge tone={u.is_active ? "green" : "red"}>
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TD>
                        <TD
                          className="text-xs text-[#8E8E93] whitespace-nowrap"
                          onClick={() => setSelected(u)}
                        >
                          {u.last_login_at
                            ? new Date(u.last_login_at).toLocaleString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </TD>
                        <TD className="text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(u);
                            }}
                            className="text-[#6E6E73] hover:text-[#1D1D1F] px-2"
                          >
                            ⋯
                          </button>
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </div>

          {/* ============ DETAIL PANEL ============ */}
          {selected && (
            <div className="lg:col-span-5">
              <UserDetailPanel
                userId={selected.id}
                fallback={selected}
                roles={roles}
                orgs={orgs}
                permissions={permissions}
                onClose={() => setSelected(null)}
                onUpdated={() => router.refresh()}
              />
            </div>
          )}
        </div>
      </div>

      {/* ============ ADD MODAL ============ */}
      <AddUserModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        roles={roles}
        orgs={orgs}
      />
    </>
  );
}

// ============================ SUB-COMPONENTS ============================

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: "users" | "check" | "x" | "shield" | "team";
  label: string;
  value: number;
  hint: string;
  tone?: "neutral" | "blue" | "green" | "red" | "purple";
}) {
  const colors: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: "bg-[#F2F2F4] dark:bg-[#2C2C2E]", fg: "text-[#6E6E73]" },
    blue: { bg: "bg-[#EAF2FB] dark:bg-[#0A84FF]/10", fg: "text-[#0A84FF]" },
    green: { bg: "bg-[#E8F8EC] dark:bg-[#34C759]/10", fg: "text-[#34C759]" },
    red: { bg: "bg-[#FFEBEE] dark:bg-[#FF3B30]/10", fg: "text-[#FF3B30]" },
    purple: {
      bg: "bg-[#EFEEFC] dark:bg-[#5E5CE6]/10",
      fg: "text-[#5E5CE6]",
    },
  };
  const c = colors[tone];

  const icons: Record<string, React.ReactNode> = {
    users: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="7" cy="7" r="2.5" />
        <circle cx="13" cy="7" r="2.5" />
        <path d="M3 15c0-2 2-3 4-3s4 1 4 3M9 15c0-2 2-3 4-3s4 1 4 3" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="10" cy="10" r="7" />
        <path d="M7 10l2 2 4-4" />
      </svg>
    ),
    x: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="10" cy="10" r="7" />
        <path d="M7 7l6 6M13 7l-6 6" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <path d="M10 3l6 2v5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V5z" />
      </svg>
    ),
    team: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
        <path d="M3 9h14M7 15v-3h6v3" />
      </svg>
    ),
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}
      >
        <span className={c.fg}>{icons[icon]}</span>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
          {label}
        </div>
        <div className="mt-0.5 text-2xl font-semibold leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}