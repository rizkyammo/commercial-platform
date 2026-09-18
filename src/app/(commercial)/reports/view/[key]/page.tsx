import { notFound } from "next/navigation";
import { generateReportData } from "@/features/reports/queries";
import { createClient } from "@/lib/supabase/server";
import { ReportViewer } from "./report-viewer";

const VALID_KEYS = [
  // Operational
  "order-register",
  "order-progress",
  "procurement-register",
  "shipment-register",
  "bast-register",
  "outstanding-bast",
  "consignment-usage",

  // Commercial
  "cost-report",
  "margin-report",
  "margin-by-site",
  "margin-by-customer",
  "contract-performance",
  "tax-report",
  "margin-tax-report",

  // Compliance
  "sk-authorization",
  "quota-allocation",
  "quota-realization",
  "quota-ledger",

  // Management
  "monthly-commercial",
  "yearly-commercial",
];

export default async function ReportViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ from?: string; to?: string; customer?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;

  if (!VALID_KEYS.includes(key)) notFound();

  const { rows, title } = await generateReportData(key, {
    from: sp.from,
    to: sp.to,
    customer_id: sp.customer,
  });

  // Get user name + customer label
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let generatedBy: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    generatedBy = profile?.full_name ?? profile?.email ?? undefined;
  }

  let customersLabel: string | undefined;
  if (sp.customer) {
    const { data: c } = await supabase
      .from("customers")
      .select("name")
      .eq("id", sp.customer)
      .maybeSingle();
    customersLabel = c?.name ?? undefined;
  }

  const period =
    sp.from || sp.to ? `${sp.from ?? "—"} → ${sp.to ?? "—"}` : "All time";

  return (
    <ReportViewer
      reportKey={key}
      title={title}
      rows={rows}
      filter={sp}
      period={period}
      generatedBy={generatedBy}
      customersLabel={customersLabel}
    />
  );
}