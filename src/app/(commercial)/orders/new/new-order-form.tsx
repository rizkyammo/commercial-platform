"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { createOrderDraft } from "@/features/orders/actions";
import type { OrderItemInput } from "@/lib/validation/orders";
import { BUSINESS_MODELS, DEFAULT_BUSINESS_MODEL } from "@/lib/constants/business-models";

type CustomerOption = { id: string; code: string; name: string };
type ProductOption = { id: string; code: string; name: string; uom: string };
type SiteOption = { id: string; code: string; name: string };
type ContractOption = { id: string; code: string; name: string; currency: string };

type DraftItem = OrderItemInput & { _key: string };

let counter = 0;
function newKey() {
  counter += 1;
  return `it-${Date.now()}-${counter}`;
}

export function NewOrderForm({
  customers,
  products,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [siteId, setSiteId] = useState("");
  const [contractId, setContractId] = useState("");
  const [businessModel, setBusinessModel] = useState<string>(DEFAULT_BUSINESS_MODEL);
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);

  useEffect(() => {
    if (!customerId) {
      setSites([]); setContracts([]); setSiteId(""); setContractId("");
      return;
    }
    Promise.all([
      supabase.from("sites").select("id, code, name").eq("customer_id", customerId).eq("is_active", true).order("name"),
      supabase.from("contracts").select("id, code, name, currency, status").eq("customer_id", customerId).eq("is_active", true).order("name"),
    ]).then(([s, c]) => {
      setSites(s.data ?? []);
      setContracts(c.data ?? []);
      setSiteId(s.data?.[0]?.id ?? "");
      setContractId(c.data?.[0]?.id ?? "");
      if (c.data?.[0]?.currency) setCurrency(c.data[0].currency);
    });
  }, [customerId, supabase]);

  function addItem() {
    if (products.length === 0) return;
    const first = products[0];
    setItems((prev) => [
      ...prev,
      {
        _key: newKey(),
        product_id: first.id,
        description: "",
        qty: 0,
        uom: first.uom,
        unit_price: 0,
        currency,
        exchange_rate: exchangeRate,
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it._key !== key));
  }

  function onProductChange(key: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateItem(key, { product_id: productId, uom: p?.uom ?? "MT" });
  }

  const totalValue = items.reduce((acc, it) => {
    const priceIdr = it.currency === "IDR" ? it.unit_price : it.unit_price * it.exchange_rate;
    return acc + it.qty * priceIdr;
  }, 0);

  function onSaveDraft() {
    setError(null);
    startTransition(async () => {
      const payload = {
        customer_id: customerId,
        site_id: siteId,
        contract_id: contractId,
        business_model: businessModel,
        po_number: poNumber,
        po_date: poDate,
        currency,
        exchange_rate: exchangeRate,
        remarks,
        items: items.map(({ _key, ...rest }) => rest),
      };
      const result = await createOrderDraft(payload);
      if (result.error) { setError(result.error); return; }
      router.push(`/orders/${result.data.id}`);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-[#E5E5EA] rounded-xl p-6">
          <h2 className="font-semibold mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Customer" required>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Site" required>
              <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">— Select Site —</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Contract" required>
              <Select value={contractId} onChange={(e) => {
                setContractId(e.target.value);
                const c = contracts.find((x) => x.id === e.target.value);
                if (c) setCurrency(c.currency);
              }}>
                <option value="">— Select Contract —</option>
                {contracts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
<FormField label="Business Model">
  <Select value={businessModel} onChange={(e) => setBusinessModel(e.target.value)}>
    {BUSINESS_MODELS.map((m) => (
      <option key={m.value} value={m.value}>{m.label}</option>
    ))}
  </Select>
</FormField>
            <FormField label="PO Number">
              <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="BRWK71" />
            </FormField>
            <FormField label="PO Date">
              <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </FormField>
            <FormField label="Currency">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </Select>
            </FormField>
            <FormField label="Exchange Rate">
              <Input
                type="number"
                step="0.000001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                disabled={currency === "IDR"}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Remarks">
                <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5EA] rounded-xl">
          <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
            <h2 className="font-semibold">Items</h2>
            <Button size="sm" variant="secondary" onClick={addItem} disabled={products.length === 0}>
              + Add Item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6E6E73]">
              Belum ada item. Klik <span className="font-medium">+ Add Item</span>.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-[30%]">Product</TH>
                  <TH>Qty</TH>
                  <TH>UOM</TH>
                  <TH>Unit Price</TH>
                  <TH className="text-right">Line Value</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {items.map((it) => {
                  const priceIdr = it.currency === "IDR" ? it.unit_price : it.unit_price * it.exchange_rate;
                  const lineValue = it.qty * priceIdr;
                  return (
                    <TR key={it._key}>
                      <TD>
                        <Select value={it.product_id} onChange={(e) => onProductChange(it._key, e.target.value)}>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.qty}
                          onChange={(e) => updateItem(it._key, { qty: Number(e.target.value) })}
                          className="w-24"
                        />
                      </TD>
                      <TD><Input value={it.uom} onChange={(e) => updateItem(it._key, { uom: e.target.value })} className="w-20" /></TD>
                      <TD>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => updateItem(it._key, { unit_price: Number(e.target.value) })}
                          className="w-32"
                        />
                      </TD>
                      <TD className="text-right font-mono text-xs">
                        {lineValue.toLocaleString("id-ID")}
                      </TD>
                      <TD className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => removeItem(it._key)} className="text-[#FF3B30]">
                          ×
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      </div>

      <aside className="bg-white border border-[#E5E5EA] rounded-xl p-6 h-fit sticky top-24">
        <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide">Summary</h2>
        <div className="mt-4 space-y-3 text-sm">
          <Row label="Items" value={String(items.length)} />
          <Row label="Currency" value={currency} />
          <Row label="Total Value" value={`${currency} ${totalValue.toLocaleString("id-ID")}`} />
        </div>

        {error && (
          <div className="mt-4 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={onSaveDraft} disabled={pending || !customerId || !siteId || !contractId}>
            {pending ? "Saving..." : "Save as Draft"}
          </Button>
          <Link href="/orders" className="block">
            <Button variant="secondary" className="w-full">Cancel</Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-[#8E8E93]">
          Draft dapat dilengkapi nanti. Submit untuk validasi ketat dilakukan di halaman detail.
        </p>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6E6E73]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}