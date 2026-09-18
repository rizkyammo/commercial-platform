"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { inviteUser } from "@/features/admin/users/actions";

export function AddUserModal({
  open,
  onClose,
  roles,
  orgs,
}: {
  open: boolean;
  onClose: () => void;
  roles: { id: string; name: string; display_name: string }[];
  orgs: { id: string; code: string; name: string; type: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role_id: roles[0]?.id ?? "",
    organisation_id: orgs[0]?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const r = await inviteUser(form);
      if (r.error) {
        setError(r.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setForm({
          email: "",
          full_name: "",
          role_id: roles[0]?.id ?? "",
          organisation_id: orgs[0]?.id ?? "",
        });
        router.refresh();
      }, 1500);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add User"
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="add-user-form" type="submit" disabled={pending}>
            {pending ? "Sending..." : "Send Invitation"}
          </Button>
        </>
      }
    >
      <form id="add-user-form" onSubmit={onSubmit} className="space-y-4">
        <FormField label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="user@company.com"
            required
          />
        </FormField>
        <FormField label="Full Name" required>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Role" required>
          <Select
            value={form.role_id}
            onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            required
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Organisation">
          <Select
            value={form.organisation_id}
            onChange={(e) =>
              setForm({ ...form, organisation_id: e.target.value })
            }
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.type})
              </option>
            ))}
          </Select>
        </FormField>

        <p className="text-xs text-[#8E8E93]">
          User akan menerima email undangan untuk setup password.
        </p>

        {error && (
          <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-[#34C759] bg-[#34C759]/5 border border-[#34C759]/20 rounded-lg px-3 py-2">
            ✓ User berhasil diundang.
          </div>
        )}
      </form>
    </Modal>
  );
}