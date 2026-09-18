import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TABS = [
  { key: "profile", label: "Profile", href: "/settings/profile", icon: "user" },
  { key: "account", label: "Account", href: "/settings/account", icon: "lock" },
  {
    key: "notifications",
    label: "Notifications",
    href: "/settings/notifications",
    icon: "bell",
  },
  {
    key: "appearance",
    label: "Appearance",
    href: "/settings/appearance",
    icon: "sun",
  },
  { key: "language", label: "Language", href: "/settings/language", icon: "globe" },
  { key: "security", label: "Security", href: "/settings/security", icon: "shield" },
  {
    key: "connected-apps",
    label: "Connected Apps",
    href: "/settings/connected-apps",
    icon: "link",
  },
];

const ICONS: Record<string, React.ReactNode> = {
  user: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3 3-5 6-5s6 2 6 5" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <rect x="4" y="9" width="12" height="8" rx="2" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path d="M5 9a5 5 0 1110 0v4l1 2H4l1-2z" />
      <path d="M8 15a2 2 0 004 0" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14M10 3c2 2.5 2 11.5 0 14M10 3c-2 2.5-2 11.5 0 14" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path d="M10 3l6 2v5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V5z" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path d="M8 12a4 4 0 005.66 0l3-3a4 4 0 10-5.66-5.66L9.5 5" />
      <path d="M12 8a4 4 0 00-5.66 0l-3 3a4 4 0 105.66 5.66L10.5 15" />
    </svg>
  ),
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="lg:col-span-3">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
            Manage your account and preferences.
          </p>
        </div>

        <nav className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-2">
          {TABS.map((t) => (
<Link
  key={t.key}
  href={t.href}
  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#1D1D1F] dark:text-[#F5F5F7] dark:text-[#F5F5F7] hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] transition"
>
              <span className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93] shrink-0">{ICONS[t.icon]}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="lg:col-span-9">{children}</div>
    </div>
  );
}