import { notFound } from "next/navigation";
import { getProjectDetail } from "@/features/invoicing/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import Link from "next/link";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const detail = await getProjectDetail(decodeURIComponent(code));
  if (!detail.summary) notFound();

  const s = detail.summary;
  const fmt = (n: number) =>
    `IDR ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

  return (
    <div>
      <PageHeader
        title={`Project ${s.project_code}`}
        description={s.project_name ?? "Kumpulan order dalam satu project code."}
      />

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Revenue" value={fmt(Number(s.total_revenue))} />
        <KpiCard
          label="Material"
          value={fmt(Number(s.material_revenue))}
          tone="grey"
        />
        <KpiCard
          label="Service Fee"
          value={fmt(Number(s.service_revenue))}
          tone="green"
        />
        <KpiCard
          label="Margin After Tax"
          value={fmt(Number(s.total_margin_after_tax))}
          tone="blue"
        />
      </div>

      {/* ORDERS */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl">
        <div className="px-6 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <h2 className="font-semibold">Orders ({detail.orders.length})</h2>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Order</TH>
              <TH>Customer</TH>
              <TH>Type</TH>
              <TH>Business Model</TH>
              <TH>Status</TH>
              <TH className="text-right">Selling</TH>
              <TH className="text-right">Cost</TH>
              <TH className="text-right">Margin</TH>
            </TR>
          </THead>
          <TBody>
            {detail.orders.map((o: any) => (
              <TR key={o.id}>
                <TD>
                  <Link
                    href={`/orders/${o.id}`}
                    className="font-medium hover:text-[#0A84FF]"
                  >
                    {o.order_number}
                  </Link>
                </TD>
                <TD className="text-sm">{o.customers?.name ?? "—"}</TD>
                <TD>
                  <Badge tone="grey">{o.order_type}</Badge>
                </TD>
                <TD className="text-xs">{o.business_model}</TD>
                <TD>
                  <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                </TD>
                <TD className="text-right font-mono text-xs">
                  {fmt(Number(o.selling_value))}
                </TD>
                <TD className="text-right font-mono text-xs">
                  {fmt(Number(o.total_direct_cost))}
                </TD>
                <TD className="text-right font-mono text-xs">
                  {fmt(Number(o.margin))}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "blue" | "green" | "grey";
}) {
  const color =
    tone === "blue"
      ? "text-[#0A84FF]"
      : tone === "green"
        ? "text-[#34C759]"
        : tone === "grey"
          ? "text-[#6E6E73]"
          : "text-[#1D1D1F] dark:text-[#F5F5F7]";
  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-4">
      <div className="text-xs text-[#6E6E73] uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-2 text-lg font-semibold ${color} truncate`}>
        {value}
      </div>
    </div>
  );
}

function statusTone(
  s: string
): "green" | "blue" | "grey" | "red" | "orange" {
  if (s === "CLOSED" || s === "FULFILLED") return "green";
  if (s === "PARTIALLY_FULFILLED") return "orange";
  if (s === "CANCELLED") return "red";
  return "blue";
}