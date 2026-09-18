import Link from "next/link";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
} | null;

const NAV = [
  { label: "Home", href: "/home" },
  { label: "Orders", href: "/orders" },
  { label: "Flow", href: "/flow" },
  { label: "Compliance", href: "/compliance" },
  { label: "Spatial", href: "/spatial" },
  { label: "Analytics", href: "/analytics" },
  { label: "Reports", href: "/reports" },
  { label: "Master Data", href: "/master-data" },
];

export function TopNav({
  profile,
  unread = 0,
}: {
  profile: Profile;
  unread?: number;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E5E5EA]">
      <div className="mx-auto max-w-[1440px] px-6 h-16 flex items-center gap-8">
        <Link href="/home" className="font-semibold tracking-tight text-lg">
          COMMERCIAL
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm text-[#6E6E73]">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[#1D1D1F] transition">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <input
            placeholder="Search..."
            className="hidden md:block h-9 w-64 rounded-lg bg-[#F2F2F4] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A84FF]/20"
          />
          <NotificationBell initialUnread={unread} />
          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}