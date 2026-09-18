"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setItems((data as Notification[]) ?? []);
        setLoading(false);
      });
  }, [open, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        setUnread((u) => u + 1);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase]);

  function onOpenItem(n: Notification) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  function onMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-lg hover:bg-[#F2F2F4] dark:hover:bg-[#2C2C2E] flex items-center justify-center relative"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[380px] max-h-[560px] bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex items-center justify-between">
            <div className="font-semibold">Notifications</div>
            {unread > 0 && (
              <button onClick={onMarkAll} className="text-xs text-[#0A84FF] hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && <div className="p-6 text-sm text-center text-[#6E6E73] dark:text-[#8E8E93]">Loading...</div>}
            {!loading && items.length === 0 && (
              <div className="p-6 text-sm text-center text-[#6E6E73] dark:text-[#8E8E93]">Tidak ada notifikasi.</div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpenItem(n)}
                className={`w-full text-left px-4 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] dark:border-[#2C2C2E] last:border-0 hover:bg-[#F6F6F7] dark:hover:bg-[#2C2C2E] transition ${!n.is_read ? "bg-[#EAF2FB]/40 dark:bg-[#0A84FF]/10" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      n.severity === "CRITICAL"
                        ? "bg-[#FF3B30]"
                        : n.severity === "WARNING"
                          ? "bg-[#FF9500]"
                          : n.severity === "SUCCESS"
                            ? "bg-[#34C759]"
                            : "bg-[#0A84FF]"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.message && <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{n.message}</div>}
                    <div className="text-[11px] text-[#8E8E93] mt-1">
                      {new Date(n.created_at).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}