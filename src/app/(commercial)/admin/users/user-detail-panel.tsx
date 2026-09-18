"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import {
  getUserDetailAction,
  toggleUserActive,
  updateUserRole,
  updateUserProfile,
} from "@/features/admin/users/actions";
import type { UserRow } from "@/features/admin/users/queries";

type Tab = "details" | "roles" | "activity";

export function UserDetailPanel({
  userId,
  fallback,
  roles: allRoles,
  orgs,
  permissions,
  onClose,
  onUpdated,
}: {
  userId: string;
  fallback: UserRow;
  roles: { id: string; name: string; display_name: string }[];
  orgs: { id: string; code: string; name: string; type: string }[];
  permissions: string[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [tab, setTab] = useState<Tab>("details");
  const [pending, startTransition] = useTransition();
const [detail, setDetail] = useState<Awaited<
  ReturnType<typeof getUserDetailAction>
> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const canManage = permissions.includes("USER_MANAGE");

useEffect(() => {
  let cancelled = false;
  setLoading(true);
  getUserDetailAction(userId)
    .then((d) => {
      if (!cancelled) setDetail(d);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, [userId]);

  function doAction(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) {
        setError(r.error);
        return;
      }
const d = await getUserDetailAction(userId);
setDetail(d);
onUpdated();
    });
  }

  const initials = ((fallback.full_name ?? fallback.email) || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl overflow-hidden sticky top-24">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#EAF2FB] dark:bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">
              {fallback.full_name ?? "—"}
            </div>
            <div className="text-xs text-[#8E8E93] truncate">
              {fallback.email}
            </div>
          </div>
          <Badge tone={fallback.is_active ? "green" : "red"}>
            {fallback.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E] flex items-center justify-center text-[#6E6E73] shrink-0 ml-2"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] px-3 flex">
        {(
          [
            { key: "details" as Tab, label: "Details" },
            { key: "roles" as Tab, label: "Roles & Permissions" },
            { key: "activity" as Tab, label: "Activity" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-11 px-3 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.key
                ? "border-[#0A84FF] text-[#0A84FF] font-medium"
                : "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 max-h-[calc(100vh-320px)] overflow-y-auto">
        {loading ? (
          <div className="text-xs text-[#8E8E93] text-center py-8">
            Loading...
          </div>
        ) : !detail ? (
          <div className="text-xs text-[#8E8E93] text-center py-8">
            Gagal load detail.
          </div>
        ) : (
          <>
            {/* ============ DETAILS TAB ============ */}
            {tab === "details" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                    Personal Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <Row
                      label="Full Name"
                      value={detail.profile.full_name ?? "—"}
                    />
                    <Row label="Email" value={detail.profile.email} />
                    <Row
                      label="Phone"
                      value={
                        (detail.profile as { phone?: string | null }).phone ??
                        "—"
                      }
                    />
                    <Row
                      label="Job Title"
                      value={
                        (detail.profile as { job_title?: string | null })
                          .job_title ?? "—"
                      }
                    />
                    <Row
                      label="Department"
                      value={
                        (detail.profile as { department?: string | null })
                          .department ?? "—"
                      }
                    />
                    <Row
                      label="Organisation"
                      value={
                        (detail.profile as { organisation_name?: string })
                          .organisation_name ?? "—"
                      }
                    />
                    <Row
                      label="Timezone"
                      value="(UTC+7) Jakarta"
                    />
                    <Row
                      label="Member Since"
                      value={new Date(
                        detail.profile.created_at
                      ).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    />
                  </div>
                </div>

                <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                  <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                    Account Status
                  </h3>
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={detail.profile.is_active ? "green" : "red"}>
                      {detail.profile.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {canManage && (
                      <Button
                        size="sm"
                        variant={detail.profile.is_active ? "danger" : "primary"}
                        onClick={() =>
                          doAction(() =>
                            toggleUserActive(
                              detail.profile.id,
                              !detail.profile.is_active
                            )
                          )
                        }
                        disabled={pending}
                      >
                        {detail.profile.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                  <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                    Last Login
                  </h3>
                  <div className="text-sm">
                    {detail.profile.last_login_at
                      ? new Date(detail.profile.last_login_at).toLocaleString(
                          "id-ID"
                        )
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* ============ ROLES TAB ============ */}
            {tab === "roles" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                    Assigned Roles
                  </h3>
                  {detail.roles.length === 0 ? (
                    <div className="text-xs text-[#8E8E93]">
                      Tidak ada role.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detail.roles.map((r) => (
                        <div
                          key={r.id}
                          className="border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {r.display_name}
                            </div>
                            <button className="text-xs text-[#FF3B30] hover:underline">
                              Remove
                            </button>
                          </div>
                          {r.description && (
                            <div className="text-xs text-[#8E8E93] mt-0.5">
                              {r.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                    <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                      Add Role
                    </h3>
                    <Select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        doAction(() => updateUserRole(userId, val, "add"));
                        e.target.value = "";
                      }}
                    >
                      <option value="">— Select role —</option>
                      {allRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.display_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-4">
                  <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                    Effective Permissions ({detail.permissions.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                    {detail.permissions.map((p) => (
                      <span
                        key={p.code}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#F2F2F4] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] font-mono"
                      >
                        {p.code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============ ACTIVITY TAB ============ */}
            {tab === "activity" && (
              <div>
                <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">
                  Recent Activity
                </h3>
                {detail.activity.length === 0 ? (
                  <div className="text-xs text-[#8E8E93] text-center py-6">
                    Belum ada aktivitas.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.activity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            a.result === "SUCCESS"
                              ? "bg-[#34C759]"
                              : "bg-[#FF3B30]"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {a.action}
                          </div>
                          <div className="text-xs text-[#8E8E93] mt-0.5">
                            {a.module} ·{" "}
                            {new Date(a.created_at).toLocaleString("id-ID")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions footer */}
            {canManage && tab === "details" && (
              <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] mt-5 pt-4 space-y-2">
                <Button variant="secondary" className="w-full">
                  Reset Password
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setShowConfirmDelete(true)}
                >
                  Delete User
                </Button>
              </div>
            )}

            {error && (
              <div className="mt-4 text-xs text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="Delete User"
        width="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowConfirmDelete(false);
              }}
            >
              Delete (not available)
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#6E6E73]">
          Menghapus user permanen tidak direkomendasikan. Gunakan{" "}
          <strong>Deactivate</strong> untuk menonaktifkan akses tanpa kehilangan
          history.
        </p>
      </Modal>
    </div>
  );
}

function Row({
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
        className={`text-right truncate ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}