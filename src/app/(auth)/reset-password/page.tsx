"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Password tidak sama.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/login?reset=success");
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Reset Password</h1>
      <p className="mt-2 text-[#6E6E73] dark:text-[#8E8E93]">Masukkan password baru Anda.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Password Baru</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] focus:outline-none focus:border-[#0A84FF]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Konfirmasi Password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] focus:outline-none focus:border-[#0A84FF]"
          />
        </div>

        {error && <div className="text-sm text-[#FF3B30]">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-lg bg-[#0A84FF] text-white font-medium disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}