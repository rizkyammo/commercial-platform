import { notFound } from "next/navigation";
import { getUsageReport } from "@/features/invoicing/usage-queries";
import { createClient } from "@/lib/supabase/server";
import { UsageReportDetail } from "./usage-report-detail";

export default async function UsageReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getUsageReport(id);
  if (!report) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");

  return (
    <UsageReportDetail
      report={report as any}
      currentUserId={user?.id ?? ""}
      permissions={(perms ?? []) as string[]}
    />
  );
}