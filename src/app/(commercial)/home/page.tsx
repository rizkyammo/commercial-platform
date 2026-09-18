import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user!.id)
    .single();

  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">
          {greeting}, {profile?.full_name ?? profile?.email}
        </h1>
        <p className="mt-1 text-[#6E6E73]">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Waiting BAST", value: 0, hint: "No items" },
          { label: "Draft Orders", value: 0, hint: "Needs review" },
          { label: "Ready to Ship", value: 0, hint: "On schedule" },
          { label: "Compliance Blocked", value: 0, hint: "All clear" },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl border border-[#E5E5EA] p-5"
          >
            <div className="text-sm text-[#6E6E73]">{m.label}</div>
            <div className="mt-3 text-3xl font-semibold">{m.value}</div>
            <div className="mt-1 text-xs text-[#8E8E93]">{m.hint}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5EA] p-6">
        <h2 className="text-lg font-semibold">Phase 1 — Foundation Ready</h2>
        <p className="mt-2 text-sm text-[#6E6E73]">
          Anda sudah berhasil login. Phase 1 sudah selesai: auth, RBAC, RLS, dan deploy.
          Phase berikutnya: master data.
        </p>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}