"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrgUnit } from "@/features/admin/organisation/queries";

// ============================ TYPES ============================

type TreeNode = OrgUnit & { children: TreeNode[]; depth: number };

// ============================ HELPERS ============================

function buildTree(units: OrgUnit[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const u of units) {
    map.set(u.id, { ...u, children: [], depth: 0 });
  }
  for (const u of units) {
    const node = map.get(u.id)!;
    if (u.parent_id && map.has(u.parent_id)) {
      const parent = map.get(u.parent_id)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Fix depth recursively
  function fixDepth(nodes: TreeNode[], depth: number) {
    for (const n of nodes) {
      n.depth = depth;
      fixDepth(n.children, depth + 1);
    }
  }
  fixDepth(roots, 0);

  // Sort alphabetically
  function sortTree(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortTree(n.children);
  }
  sortTree(roots);

  return roots;
}

function unitTypeTone(
  t: string
): "blue" | "green" | "orange" | "grey" | "purple" {
  if (t === "root") return "blue";
  if (t === "unit") return "blue";
  if (t === "department") return "green";
  if (t === "location") return "orange";
  return "grey";
}

function unitTypeLabel(t: string) {
  const map: Record<string, string> = {
    root: "Root Organisation",
    unit: "Business Unit",
    department: "Department",
    location: "Location",
    cost_center: "Cost Center",
  };
  return map[t] ?? t;
}

// ============================ MAIN ============================

export function OrganisationClient({
  units,
  stats,
  permissions,
}: {
  units: OrgUnit[];
  stats: {
    businessUnits: number;
    departments: number;
    locations: number;
    users: number;
  };
  permissions: string[];
}) {
  const tree = buildTree(units);
  const [selectedId, setSelectedId] = useState<string>(units[0]?.id ?? "");
  const selected = units.find((u) => u.id === selectedId) ?? units[0];
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(units.filter((u) => u.parent_id === null).map((u) => u.id))
  );

  const canEdit = permissions.includes("ORGANISATION_MANAGE");

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon="users"
          label="Business Units"
          value={stats.businessUnits}
          hint="Active"
        />
        <KpiCard
          icon="team"
          label="Departments"
          value={stats.departments}
          hint="Active"
        />
        <KpiCard
          icon="pin"
          label="Locations"
          value={stats.locations}
          hint="Active"
        />
        <KpiCard
          icon="user"
          label="Total Users"
          value={stats.users}
          hint="Across organisation"
        />
      </div>

      {/* ============ MAIN GRID ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Tree */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl">
            <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="font-semibold">Organisation Structure</div>
            </div>
            <div className="p-4">
              <div className="relative">
                <input
                  placeholder="Search organisation unit..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F2F2F4] dark:bg-[#2C2C2E] text-sm focus:outline-none"
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
            </div>
            <div className="pb-4 max-h-[560px] overflow-y-auto">
              {tree.map((node) => (
                <TreeNodeView
                  key={node.id}
                  node={node}
                  selectedId={selectedId}
                  expanded={expanded}
                  onSelect={setSelectedId}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Detail */}
        <div className="lg:col-span-8 space-y-4">
          {selected ? (
            <>
              {/* Header card */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#EAF2FB] dark:bg-[#0A84FF]/10 flex items-center justify-center shrink-0">
                      <svg
                        className="w-7 h-7 text-[#0A84FF]"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <rect x="3" y="7" width="14" height="10" rx="1" />
                        <path d="M6 7V4h8v3M10 11v2" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-semibold">
                          {selected.name}
                        </h2>
                        <Badge tone={selected.is_active ? "green" : "grey"}>
                          {selected.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                        {unitTypeLabel(selected.type)} · {selected.code}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                      <button className="h-9 w-9 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#6E6E73] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]">
                        ⋯
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl overflow-hidden">
                <div className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] px-5 flex gap-1">
                  <button className="h-11 px-3 text-sm border-b-2 border-[#0A84FF] text-[#0A84FF] font-medium">
                    Details
                  </button>
                  <button className="h-11 px-3 text-sm text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]">
                    Sub Units ({selected.user_count ?? 0})
                  </button>
                  <button className="h-11 px-3 text-sm text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]">
                    Users
                  </button>
                  <button className="h-11 px-3 text-sm text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]">
                    Settings
                  </button>
                </div>

                <div className="p-6">
                  <h3 className="font-semibold text-sm mb-4">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <InfoRow label="Name" value={selected.name} />
                    <InfoRow label="Code" value={selected.code} mono />
                    <InfoRow label="Type" value={unitTypeLabel(selected.type)} />
                    <InfoRow
                      label="Manager"
                      value={selected.manager_name ?? "—"}
                    />
                    <InfoRow
                      label="Description"
                      value={selected.description ?? "—"}
                      className="md:col-span-2"
                    />
                    <InfoRow
                      label="Status"
                      value={selected.is_active ? "Active" : "Inactive"}
                    />
                    <InfoRow
                      label="Created At"
                      value={new Date(selected.created_at).toLocaleString(
                        "id-ID"
                      )}
                    />
                    <InfoRow
                      label="Last Updated"
                      value={new Date(selected.updated_at).toLocaleString(
                        "id-ID"
                      )}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-12 text-center text-[#6E6E73]">
              Select an organisation unit on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================ SUB-COMPONENTS ============================

function TreeNodeView({
  node,
  selectedId,
  expanded,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  selectedId: string;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isSelected = selectedId === node.id;
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  const iconColor =
    node.type === "unit"
      ? "text-[#0A84FF]"
      : node.type === "department"
        ? "text-[#34C759]"
        : node.type === "location"
          ? "text-[#FF9500]"
          : "text-[#6E6E73]";

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 pr-4 cursor-pointer transition ${
          isSelected
            ? "bg-[#EAF2FB] dark:bg-[#0A84FF]/10"
            : "hover:bg-[#F6F6F7] dark:hover:bg-[#2C2C2E]"
        }`}
        style={{ paddingLeft: 16 + node.depth * 16 }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="w-4 h-4 flex items-center justify-center shrink-0"
          >
            <svg
              className={`w-3 h-3 text-[#6E6E73] transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7 5l6 5-6 5z" />
            </svg>
          </button>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}

        <svg
          className={`w-4 h-4 shrink-0 ${iconColor}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          {node.type === "unit" || node.type === "root" ? (
            <>
              <rect x="3" y="7" width="14" height="10" rx="1" />
              <path d="M6 7V4h8v3" />
            </>
          ) : node.type === "department" ? (
            <>
              <circle cx="7" cy="7" r="2.5" />
              <circle cx="13" cy="7" r="2.5" />
              <path d="M3 15c0-2 2-3 4-3s4 1 4 3M9 15c0-2 2-3 4-3s4 1 4 3" />
            </>
          ) : (
            <>
              <path d="M10 18s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z" />
              <circle cx="10" cy="8" r="2.5" />
            </>
          )}
        </svg>

        <span
          className={`text-sm flex-1 truncate ${
            isSelected
              ? "font-medium text-[#0A84FF]"
              : "text-[#1D1D1F] dark:text-[#F5F5F7]"
          }`}
        >
          {node.name}
        </span>

        {node.user_count !== undefined && node.user_count > 0 && (
          <span className="text-[10px] text-[#8E8E93] font-mono shrink-0">
            {node.user_count}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[#8E8E93] text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-1 ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {value}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: "users" | "team" | "pin" | "user";
  label: string;
  value: number;
  hint: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    users: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="7" cy="7" r="2.5" />
        <circle cx="13" cy="7" r="2.5" />
        <path d="M3 15c0-2 2-3 4-3s4 1 4 3M9 15c0-2 2-3 4-3s4 1 4 3" />
      </svg>
    ),
    team: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
        <path d="M3 9h14M7 15v-3h6v3" />
      </svg>
    ),
    pin: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 18s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z" />
        <circle cx="10" cy="8" r="2" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="7" r="3" />
        <path d="M4 17c0-3 3-5 6-5s6 2 6 5" />
      </svg>
    ),
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#EAF2FB] dark:bg-[#0A84FF]/10 flex items-center justify-center shrink-0">
          <span className="w-5 h-5 text-[#0A84FF]">{icons[icon]}</span>
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
            {label}
          </div>
          <div className="mt-0.5 text-2xl font-semibold leading-none">
            {value}
          </div>
          <div className="text-[10px] text-[#8E8E93] mt-0.5">{hint}</div>
        </div>
      </div>
    </div>
  );
}