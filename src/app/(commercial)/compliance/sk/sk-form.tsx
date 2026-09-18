"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { createSk } from "@/features/compliance/actions";
import type { SkInput } from "@/lib/validation/compliance";

const empty: SkInput = {
  sk_number: "",
  issuing_authority: "Kementerian Pertahanan RI",
  issue_date: "",
  effective_date: "",
  expiry_date: "",
  scope: "",
  document_ref: "",
  notes: "",
};

export function SkForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<SkInput>(empty);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createSk(form);
      if (r.error) { setError(r.error); return; }
      router.push(`/compliance/sk/${r.data.id}`);
    });
  }

  return (
    <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6 max-w-3xl">
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="SK Number" required>
          <Input value={form.sk_number} onChange={(e) => setForm({ ...form, sk_number: e.target.value })} placeholder="SK/002/2026" required />
        </FormField>
        <FormField label="Issuing Authority" required>
          <Input value={form.issuing_authority} onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })} required />
        </FormField>
        <FormField label="Issue Date">
          <Input type="date" value={form.issue_date ?? ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
        </FormField>
        <FormField label="Effective Date">
          <Input type="date" value={form.effective_date ?? ""} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
        </FormField>
        <FormField label="Expiry Date">
          <Input type="date" value={form.expiry_date ?? ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        </FormField>
        <FormField label="Document Ref">
          <Input value={form.document_ref ?? ""} onChange={(e) => setForm({ ...form, document_ref: e.target.value })} />
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Scope">
            <Input value={form.scope ?? ""} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Bahan Peledak Komersial" />
          </FormField>
        </div>
        <div className="md:col-span-2">
          <FormField label="Notes">
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
        </div>

        {error && (
          <div className="md:col-span-2 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="md:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create Draft"}</Button>
        </div>
      </form>
    </div>
  );
}