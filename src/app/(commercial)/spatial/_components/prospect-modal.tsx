"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { createProspect, updateProspect } from "@/features/spatial/actions";
import type { ProspectInput } from "@/lib/validation/spatial";
import type { Prospect } from "@/features/spatial/types";

const empty: ProspectInput = {
  code: "",
  name: "",
  type: "Quarry",
  latitude: -1.0,
  longitude: 116.0,
  address: "",
  province: "",
  city: "",
  est_demand: 0,
  est_demand_uom: "MT",
  score: 50,
  status: "NEW",
  notes: "",
  is_active: true,
};

export function ProspectModal({
  open,
  onClose,
  editing,
  defaultCenter,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Prospect | null;
  defaultCenter?: { lat: number; lng: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProspectInput>(() =>
    editing
      ? {
          code: editing.code,
          name: editing.name,
          type: editing.type ?? "Quarry",
          latitude: Number(editing.latitude ?? defaultCenter?.lat ?? -1.0),
          longitude: Number(editing.longitude ?? defaultCenter?.lng ?? 116.0),
          address: editing.address ?? "",
          province: editing.province ?? "",
          city: editing.city ?? "",
          est_demand: Number(editing.est_demand ?? 0),
          est_demand_uom: editing.est_demand_uom ?? "MT",
          score: Number(editing.score ?? 50),
          status: editing.status as ProspectInput["status"],
          notes: editing.notes ?? "",
          is_active: editing.is_active,
        }
      : {
          ...empty,
          latitude: defaultCenter?.lat ?? -1.0,
          longitude: defaultCenter?.lng ?? 116.0,
        }
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateProspect(editing.id, form)
        : await createProspect(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Prospect" : "New Prospect"}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="prospect-form" type="submit" disabled={pending}>
            {pending ? "Saving..." : editing ? "Save Changes" : "Create"}
          </Button>
        </>
      }
    >
      <form
        id="prospect-form"
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <FormField label="Code" required>
          <Input
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            placeholder="PROSP-001"
            required
            disabled={!!editing}
          />
        </FormField>
        <FormField label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Type">
          <Select
            value={form.type ?? ""}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="Quarry">Quarry</option>
            <option value="Coal Mining">Coal Mining</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Other">Other</option>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status: e.target.value as ProspectInput["status"],
              })
            }
          >
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </Select>
        </FormField>
        <FormField label="Latitude" required>
          <Input
            type="number"
            step="0.0000001"
            value={form.latitude}
            onChange={(e) =>
              setForm({ ...form, latitude: Number(e.target.value) })
            }
            required
          />
        </FormField>
        <FormField label="Longitude" required>
          <Input
            type="number"
            step="0.0000001"
            value={form.longitude}
            onChange={(e) =>
              setForm({ ...form, longitude: Number(e.target.value) })
            }
            required
          />
        </FormField>
        <FormField label="Province">
          <Input
            value={form.province ?? ""}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
          />
        </FormField>
        <FormField label="City">
          <Input
            value={form.city ?? ""}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </FormField>
        <FormField label="Est. Demand">
          <Input
            type="number"
            step="0.01"
            value={form.est_demand}
            onChange={(e) =>
              setForm({ ...form, est_demand: Number(e.target.value) })
            }
          />
        </FormField>
        <FormField label="UOM">
          <Input
            value={form.est_demand_uom}
            onChange={(e) =>
              setForm({ ...form, est_demand_uom: e.target.value })
            }
          />
        </FormField>
        <FormField label="Score (0-100)">
          <Input
            type="number"
            min={0}
            max={100}
            value={form.score}
            onChange={(e) =>
              setForm({ ...form, score: Number(e.target.value) })
            }
          />
        </FormField>
        <FormField label="Address">
          <Input
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Notes">
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            id="prospect-active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          <label htmlFor="prospect-active" className="text-sm">
            Active
          </label>
        </div>
        {error && (
          <div className="md:col-span-2 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}