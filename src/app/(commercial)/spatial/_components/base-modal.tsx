"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { createBase, updateBase } from "@/features/spatial/actions";
import type { BaseInput } from "@/lib/validation/spatial";
import type { OperationalBase } from "@/features/spatial/types";

const empty: BaseInput = {
  code: "",
  name: "",
  type: "Main Warehouse",
  latitude: -1.0,
  longitude: 116.0,
  address: "",
  province: "",
  city: "",
  capacity: 0,
  capacity_uom: "MT",
  operational_cost: 0,
  notes: "",
  is_active: true,
};

export function BaseModal({
  open,
  onClose,
  editing,
  defaultCenter,
}: {
  open: boolean;
  onClose: () => void;
  editing?: OperationalBase | null;
  defaultCenter?: { lat: number; lng: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<BaseInput>(() =>
    editing
      ? {
          code: editing.code,
          name: editing.name,
          type: editing.type ?? "Main Warehouse",
          latitude: Number(editing.latitude ?? defaultCenter?.lat ?? -1.0),
          longitude: Number(editing.longitude ?? defaultCenter?.lng ?? 116.0),
          address: editing.address ?? "",
          province: editing.province ?? "",
          city: editing.city ?? "",
          capacity: Number(editing.capacity ?? 0),
          capacity_uom: editing.capacity_uom ?? "MT",
          operational_cost: Number(editing.operational_cost ?? 0),
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
        ? await updateBase(editing.id, form)
        : await createBase(form);
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
      title={editing ? "Edit Operational Base" : "New Operational Base"}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="base-form" type="submit" disabled={pending}>
            {pending ? "Saving..." : editing ? "Save Changes" : "Create"}
          </Button>
        </>
      }
    >
      <form
        id="base-form"
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <FormField label="Code" required>
          <Input
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            placeholder="BASE-001"
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
            <option value="Main Warehouse">Main Warehouse</option>
            <option value="Satellite">Satellite</option>
            <option value="Stock Point">Stock Point</option>
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
        <FormField label="Capacity">
          <Input
            type="number"
            step="0.01"
            value={form.capacity}
            onChange={(e) =>
              setForm({ ...form, capacity: Number(e.target.value) })
            }
          />
        </FormField>
        <FormField label="Capacity UOM">
          <Input
            value={form.capacity_uom}
            onChange={(e) =>
              setForm({ ...form, capacity_uom: e.target.value })
            }
          />
        </FormField>
        <FormField label="Operational Cost">
          <Input
            type="number"
            step="0.01"
            value={form.operational_cost}
            onChange={(e) =>
              setForm({
                ...form,
                operational_cost: Number(e.target.value),
              })
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
            id="base-active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          <label htmlFor="base-active" className="text-sm">
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