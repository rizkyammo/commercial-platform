"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// ============================================================
// MORE MENU ITEMS (muncul di bottom sheet)
// ============================================================
const MORE_MENU = [
  { label: "Invoicing", href: "/invoicing", icon: "invoice" },
  { label: "Usage Reports", href: "/invoicing/usage-reports", icon: "usage" },
  { label: "Projects", href: "/projects", icon: "folder" },
  { label: "Compliance", href: "/compliance", icon: "shield" },
  { label: "Analytics", href: "/analytics", icon: "chart" },
  { label: "Reports", href: "/reports", icon: "file" },
  { label: "Master Data", href: "/master-data", icon: "database" },
  { label: "Profile & Settings", href: "/settings/profile", icon: "user" },
  { label: "Admin - Organisation", href: "/admin/organisation", icon: "team" },
  { label: "Admin - Users", href: "/admin/users", icon: "users" },
  { label: "Admin - Audit Log", href: "/admin/audit-log", icon: "list" },
  { label: "Admin - Migration", href: "/admin/migration", icon: "upload" },
];

const ICONS: Record<string, React.ReactNode> = {
  shield: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 3l6 2v5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V5z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 16h12M6 12v4M10 8v8M14 4v12" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 3h7l3 3v11H5z" />
      <path d="M12 3v3h3M7 9h6M7 12h6" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <ellipse cx="10" cy="5" rx="6" ry="2" />
      <path d="M4 5v10c0 1 2.7 2 6 2s6-1 6-2V5M4 10c0 1 2.7 2 6 2s6-1 6-2" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3 3-5 6-5s6 2 6 5" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M3 9h14M7 15v-3h6v3" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="13" cy="7" r="2.5" />
      <path d="M3 15c0-2 2-3 4-3s4 1 4 3M9 15c0-2 2-3 4-3s4 1 4 3" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5h12M4 10h12M4 15h12" />
    </svg>
  ),
    invoice: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 3h7l3 3v11H5z" />
      <path d="M12 3v3h3M7 9h6M7 12h3" />
    </svg>
  ),
  usage: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 16h14M5 16V8M10 16V4M15 16v-6" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6a2 2 0 012-2h3l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 14V4M6 8l4-4 4 4M4 16h12" />
    </svg>
  ),
};

// ============================================================
// PRIMARY TABS
// ============================================================
const PRIMARY_TABS = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 9l7-6 7 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 3h7l3 3v11H5z" />
        <path d="M12 3v3h3M7 9h6M7 12h6" />
      </svg>
    ),
  },
  {
    href: "/flow",
    label: "Flow",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 10h4l2-4 2 8 2-4h4" />
      </svg>
    ),
  },
  {
    href: "/spatial",
    label: "Spatial",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 7l4-2 6 2 4-2v12l-4 2-6-2-4 2z" />
      </svg>
    ),
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Apakah user sedang di halaman "more"?
  const isMoreActive = MORE_MENU.some(
    (m) => pathname === m.href || pathname.startsWith(m.href + "/")
  );

  return (
    <>
      {/* ============================================================
          BOTTOM SHEET — MORE MENU
          ============================================================ */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1C1C1E] rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="text-base font-semibold">More</div>
              <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                Additional pages and settings
              </div>
            </div>

            {/* Menu list */}
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {MORE_MENU.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setMoreOpen(false);
                      router.push(item.href);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition ${
                      active
                        ? "bg-[#EAF2FB] dark:bg-[#0A84FF]/10 text-[#0A84FF]"
                        : "text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E]"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 shrink-0 ${
                        active ? "text-[#0A84FF]" : "text-[#6E6E73]"
                      }`}
                    >
                      {ICONS[item.icon]}
                    </span>
                    <span className="text-sm font-medium flex-1">
                      {item.label}
                    </span>
                    <svg
                      className="w-4 h-4 text-[#8E8E93] shrink-0"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path d="M8 5l5 5-5 5" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Close button */}
            <div className="px-5 py-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setMoreOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          BOTTOM NAV BAR
          ============================================================ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur border-t border-[#E5E5EA] dark:border-[#2C2C2E] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {PRIMARY_TABS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 gap-0.5 transition ${
                  active ? "text-[#0A84FF]" : "text-[#8E8E93]"
                }`}
              >
                <span className="w-5 h-5">{item.icon}</span>
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-2 gap-0.5 transition ${
              isMoreActive ? "text-[#0A84FF]" : "text-[#8E8E93]"
            }`}
          >
            <span className="w-5 h-5">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <circle cx="5" cy="10" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="15" cy="10" r="1.5" />
              </svg>
            </span>
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}