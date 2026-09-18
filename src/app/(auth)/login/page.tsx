"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-[#1D1D1F]">Welcome Back</h1>
      <p className="mt-2 text-[#6E6E73]">Sign in to your Commercial account</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.id"
            className="w-full h-11 px-3 rounded-lg border border-[#E5E5EA] bg-white focus:outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/10"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Password</label>
            <Link href="/forgot-password" className="text-sm text-[#0A84FF] hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full h-11 px-3 rounded-lg border border-[#E5E5EA] bg-white focus:outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/10"
          />
        </div>

        {error && (
          <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-lg bg-[#0A84FF] text-white font-medium hover:bg-[#0A84FF]/90 disabled:opacity-50 transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-[#6E6E73]">
        Don&apos;t have an account?{" "}
        <span className="text-[#0A84FF]">Contact your administrator</span>
      </div>
    </div>
  );
}