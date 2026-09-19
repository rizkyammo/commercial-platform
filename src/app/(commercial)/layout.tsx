import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/layout/top-nav";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function CommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { count: unread }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  return (
    <>
      <div className="min-h-screen bg-[#F6F6F7] dark:bg-[#0A0A0A]">
        <TopNav profile={profile} unread={unread ?? 0} />
        <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  );
}