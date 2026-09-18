"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const appUrl = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (error) setError(error.message);
    else setMessage("Link reset telah dikirim ke email Anda.");
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Forgot Password</h1>
      <p className="mt-2 text-[#6E6E73] dark:text-[#8E8E93]">
        Masukkan email Anda, kami akan mengirim link reset.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] focus:outline-none focus:border-[#0A84FF]"
          />
        </div>

        {error && <div className="text-sm text-[#FF3B30]">{error}</div>}
        {message && <div className="text-sm text-[#34C759]">{message}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-lg bg-[#0A84FF] text-white font-medium disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="text-[#0A84FF] hover:underline">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}