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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
        Welcome Back
      </h1>
      <p className="mt-2 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
        Sign in to your AmmoBiz account
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[#1D1D1F] dark:text-[#F5F5F7]">
            Email <span className="text-[#FF3B30]">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.id"
            autoComplete="email"
            className="w-full h-12 px-3 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-base focus:outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/10"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              Password <span className="text-[#FF3B30]">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#0A84FF] hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="w-full h-12 px-3 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-base focus:outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/10"
          />
        </div>

        {error && (
          <div className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg bg-[#0A84FF] text-white text-base font-medium hover:bg-[#0A84FF]/90 disabled:opacity-50 transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-[#6E6E73] dark:text-[#8E8E93]">
        Don&apos;t have an account?{" "}
        <span className="text-[#0A84FF]">Contact your administrator</span>
      </div>
    </div>
  );
}