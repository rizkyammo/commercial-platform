"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
} | null;

export function UserMenu({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initials =
    (profile?.full_name ?? profile?.email ?? "U")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-full bg-[#EAF2FB] text-[#0A84FF] text-sm font-semibold flex items-center justify-center"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-64 bg-white border border-[#E5E5EA] rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5EA]">
            <div className="text-sm font-medium">
              {profile?.full_name ?? "User"}
            </div>
            <div className="text-xs text-[#6E6E73]">{profile?.email}</div>
          </div>
          <Link
            href="/settings/profile"
            className="block px-4 py-2 text-sm hover:bg-[#F2F2F4]"
          >
            Profile & Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-[#FF3B30] hover:bg-[#F2F2F4]"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}