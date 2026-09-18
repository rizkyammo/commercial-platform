import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomer, getCustomerRelated } from "@/features/master/customers/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const { sites, contracts } = await getCustomerRelated(id);

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={`${customer.code} · Customer`}
        actions={
          <Link href="/master-data/customers" className="text-sm text-[#0A84FF] hover:underline">
            ← Back to list
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-4">Basic Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Info label="Code" value={customer.code} />
              <Info label="Name" value={customer.name} />
              <Info label="Type" value={customer.type} />
              <Info label="Industry" value={customer.industry} />
              <Info label="Tax No." value={customer.tax_no} />
              <Info label="PIC" value={customer.pic_name} />
              <Info label="Email" value={customer.email} />
              <Info label="Phone" value={customer.phone} />
              <Info label="Payment Term" value={`${customer.payment_term_days} days`} />
              <Info label="Credit Limit" value={`Rp ${Number(customer.credit_limit).toLocaleString("id-ID")}`} />
              <Info label="Address" value={customer.address} className="sm:col-span-2" />
            </dl>
          </div>

          <div className="bg-white border border-[#E5E5EA] rounded-xl">
            <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <h2 className="font-semibold">Sites</h2>
              <span className="text-sm text-[#6E6E73]">{sites.length} total</span>
            </div>
            {sites.length === 0 ? (
              <div className="p-6 text-sm text-[#6E6E73]">No sites linked yet.</div>
            ) : (
              <ul className="divide-y divide-[#E5E5EA]">
                {sites.map((s) => (
                  <li key={s.id} className="px-6 py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[#6E6E73] font-mono text-xs">{s.code}</div>
                    </div>
                    <Badge tone={s.is_active ? "green" : "grey"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-[#E5E5EA] rounded-xl">
            <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <h2 className="font-semibold">Contracts</h2>
              <span className="text-sm text-[#6E6E73]">{contracts.length} total</span>
            </div>
            {contracts.length === 0 ? (
              <div className="p-6 text-sm text-[#6E6E73]">No contracts linked yet.</div>
            ) : (
              <ul className="divide-y divide-[#E5E5EA]">
                {contracts.map((c) => (
                  <li key={c.id} className="px-6 py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[#6E6E73] font-mono text-xs">{c.code}</div>
                    </div>
                    <Badge tone="blue">{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="bg-white border border-[#E5E5EA] rounded-xl p-6 h-fit">
          <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-4">Status</h2>
          <Badge tone={customer.is_active ? "green" : "grey"}>
            {customer.is_active ? "Active" : "Inactive"}
          </Badge>
          <div className="mt-6 text-xs text-[#8E8E93]">
            Last updated {new Date(customer.updated_at).toLocaleString("id-ID")}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value, className = "" }: { label: string; value: unknown; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[#6E6E73]">{label}</dt>
      <dd className="mt-0.5">{value ? String(value) : "—"}</dd>
    </div>
  );
}