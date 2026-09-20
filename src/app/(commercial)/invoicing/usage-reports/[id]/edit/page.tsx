import { notFound, redirect } from "next/navigation";
import { getUsageReport } from "@/features/invoicing/usage-queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { UsageReportEditForm } from "./usage-report-edit-form";

export default async function EditUsageReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getUsageReport(id);
  if (!report) notFound();
  if (!["DRAFT", "REJECTED"].includes(report.status)) {
    redirect(`/invoicing/usage-reports/${id}`);
  }

  const supabase = await createClient();
  const [{ data: products }, { data: sites }] = await Promise.all([
    supabase.from("products").select("id, code, name, uom").order("name"),
    supabase.from("sites").select("id, code, name").order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title={`Edit ${report.report_number}`}
        description="Perubahan akan reset status ke DRAFT."
      />
      <UsageReportEditForm
        report={report as any}
        products={products ?? []}
        sites={sites ?? []}
      />
    </div>
  );
}