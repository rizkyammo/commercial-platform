"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  organisation_id: string | null;
  is_active: boolean;
  created_at: string;
};

export function ProfileForm({
  profile,
  userId,
}: {
  profile: Profile;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    email: profile?.email ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initials = (form.full_name || form.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("profile-images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) {
        setError(`Upload gagal: ${upErr.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", userId);

      if (updErr) {
        setError(`Update gagal: ${updErr.message}`);
        return;
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name })
        .eq("id", userId);

      if (updErr) {
        setError(updErr.message);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
          Your personal information and preferences.
        </p>
      </div>

      {/* Personal Info */}
      <form onSubmit={onSave} className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Avatar */}
          <div className="lg:col-span-4 flex flex-col items-center">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#EAF2FB] text-[#0A84FF] flex items-center justify-center text-2xl font-semibold">
                {initials}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-3 text-sm text-[#0A84FF] hover:underline disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Change Photo"}
            </button>
            <div className="text-xs text-[#8E8E93] mt-1">JPG, PNG max 2 MB</div>
          </div>

          {/* Fields */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Email Address">
              <Input value={form.email} disabled />
            </FormField>
            <FormField label="Job Title">
              <Input defaultValue="" placeholder="—" disabled />
            </FormField>
            <FormField label="Department">
              <Input defaultValue="" placeholder="—" disabled />
            </FormField>
            <FormField label="Phone Number">
              <Input defaultValue="" placeholder="—" />
            </FormField>
            <FormField label="Location">
              <Input defaultValue="" placeholder="—" />
            </FormField>
          </div>
        </div>

        {/* Preferences */}
        <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] mt-6 pt-6">
          <h3 className="font-semibold mb-4">Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Language">
              <Select defaultValue="en-US">
                <option value="en-US">English (US)</option>
                <option value="id-ID">Bahasa Indonesia</option>
              </Select>
            </FormField>
            <FormField label="Date Format">
              <Select defaultValue="dd-mm-yyyy">
                <option value="dd-mm-yyyy">18 Sep 2026 (DD MMM YYYY)</option>
                <option value="yyyy-mm-dd">2026-09-18 (YYYY-MM-DD)</option>
                <option value="mm-dd-yyyy">09/18/2026 (MM/DD/YYYY)</option>
              </Select>
            </FormField>
            <FormField label="Time Format">
              <Select defaultValue="24h">
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </Select>
            </FormField>
            <FormField label="Default Landing Page">
              <Select defaultValue="home">
                <option value="home">Home</option>
                <option value="orders">Orders</option>
                <option value="flow">Flow</option>
                <option value="analytics">Analytics</option>
              </Select>
            </FormField>
          </div>
        </div>

        {/* Email Preferences */}
        <div className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] mt-6 pt-6">
          <h3 className="font-semibold mb-4">Email Preferences</h3>
          <div className="space-y-3">
            <CheckboxRow
              label="Order updates and status changes"
              hint="Notifications about your orders and key milestones"
              defaultChecked
            />
            <CheckboxRow
              label="Compliance alerts"
              hint="Updates on SK, quota, and expiration dates"
              defaultChecked
            />
            <CheckboxRow
              label="System announcements"
              hint="Important updates and new features"
              defaultChecked
            />
            <CheckboxRow
              label="Marketing and product news"
              hint="Tips, webinars, and product updates"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {saved && (
          <div className="mt-4 text-sm text-[#34C759] bg-[#34C759]/5 border border-[#34C759]/20 rounded-lg px-3 py-2">
            ✓ Profile berhasil disimpan.
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
          <Button type="submit" disabled={pending || uploading}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Account Info */}
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
        <h3 className="font-semibold mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6E6E73] dark:text-[#8E8E93]">User ID</span>
            <span className="font-mono text-xs">
              {userId.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6E6E73] dark:text-[#8E8E93]">Status</span>
            <Badge tone={profile?.is_active ? "green" : "grey"}>
              {profile?.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6E6E73] dark:text-[#8E8E93]">Member Since</span>
            <span>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  hint,
  defaultChecked = false,
}: {
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 accent-[#0A84FF] w-4 h-4"
      />
      <div>
        <div className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{label}</div>
        <div className="text-xs text-[#8E8E93] mt-0.5">{hint}</div>
      </div>
    </label>
  );
}