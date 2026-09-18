"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  orderStatusTone,
  orderStatusLabel,
  canEditOrder,
  canSubmitOrder,
  canReviewOrder,
  canApproveOrder,
  canAmendOrder,
  canCancelOrder,
} from "@/features/orders/states";
import {
  updateOrderDraft,
  submitOrder,
  startReview,
  returnOrder,
  approveOrder,
  requestAmendment,
  requestCancellation,
  reviewApprovalRequest,
} from "@/features/orders/actions";
import { issueOrder } from "@/features/compliance/actions";
import type { OrderItemInput } from "@/lib/validation/orders";
import {
  BUSINESS_MODELS,
  getBusinessModelInfo,
} from "@/lib/constants/business-models";
import type { ProcurementCoverage } from "@/features/flow/types";

import { ProcurementTab } from "./_flow/procurement-tab";
import { ShipmentTab } from "./_flow/shipment-tab";
import { DeliveryTab } from "./_flow/delivery-tab";
import { BastTab } from "./_flow/bast-tab";
import { InvoiceTab } from "./_flow/invoice-tab";

// ============================ TYPES ============================

type Order = {
  id: string;
  order_number: string;
  po_number: string | null;
  po_date: string | null;
  status: string;
  business_model: string;
  currency: string;
  exchange_rate: number;
  selling_value: number;
  margin: number;
  total_direct_cost?: number;
  tax_rate?: number;
  current_stage: string;
  completion_pct: number;
  remarks: string | null;
  customer_id: string;
  site_id: string;
  contract_id: string;
  sk_id?: string | null;
  issued_at?: string | null;
  issued_by?: string | null;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  amendment_count?: number;
  last_amendment_from_status?: string | null;
  last_amendment_at?: string | null;
  last_amendment_by?: string | null;
  po_status: string;
  compliance_status: string;
  procurement_status: string;
  shipment_status: string;
  delivery_status: string;
  bast_status: string;
  customers?: { id: string; code: string; name: string } | null;
  sites?: { id: string; code: string; name: string } | null;
  contracts?: { id: string; code: string; name: string; currency: string } | null;
  ppn_rate?: number;
  pph23_rate?: number;
  ppn_output?: number;
  ppn_input?: number;
  ppn_payable?: number;
  pph23_amount?: number;
  total_tax?: number;
  margin_before_tax?: number;
  margin_after_tax?: number;
};

type Item = {
  id: string;
  product_id: string;
  description: string | null;
  qty: number;
  uom: string;
  unit_price: number;
  currency: string;
  exchange_rate: number;
  unit_price_idr: number;
  line_value: number;
  products?: { id: string; code: string; name: string; uom: string } | null;
};

type History = {
  id: string;
  from_status: string | null;
  to_status: string;
  action: string;
  reason: string | null;
  created_at: string;
};

type Approval = {
  id: string;
  type: string;
  status: string;
  reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
};

type ProductOption = { id: string; code: string; name: string; uom: string };
type SiteOption = { id: string; code: string; name: string };
type ContractOption = {
  id: string;
  code: string;
  name: string;
  currency: string;
};
type VendorOption = { id: string; code: string; name: string };
type TransporterOption = { id: string; code: string; name: string };

type ProcurementRow = {
  id: string;
  procurement_number: string;
  vendor_id: string | null;
  vendor_po: string | null;
  vendor_invoice: string | null;
  reference_date: string | null;
  currency: string;
  exchange_rate: number;
  material_cost: number;
  status: string;
  remarks: string | null;
  created_at: string;
  vendors?: { name: string } | null;
};

type ShipmentRow = {
  id: string;
  shipment_number: string;
  shipment_date: string | null;
  transporter_id: string | null;
  origin: string | null;
  destination: string | null;
  delivery_ref: string | null;
  transport_cost: number;
  status: string;
  remarks: string | null;
  transporters?: { name: string } | null;
};

type DeliveryRow = {
  id: string;
  delivery_number: string;
  delivery_date: string;
  receiving_party: string | null;
  delivery_note: string | null;
  location: string | null;
  status: string;
  shipment_id?: string;
};

type BastRow = {
  id: string;
  bast_number: string;
  bast_date: string | null;
  receiver_name: string | null;
  signed_by: string | null;
  signed_document_path: string | null;
  remarks: string | null;
  status: string;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_ref: string | null;
  invoice_type: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  amount_with_tax: number;
  paid_amount: number;
  status: string;
};

type InvoiceSummary = {
  selling: number;
  totalInvoiced: number;
  totalWithTax: number;
  totalPaid: number;
  outstanding: number;
  uninvoiced: number;
  overdueCount: number;
  invoiceCount: number;
  currency: string;
};

type ComplianceData = {
  items: {
    product_id: string;
    product_name: string;
    product_code: string;
    uom: string;
    requested: number;
    authorized: boolean;
    available: number;
    sufficient: boolean;
  }[];
  sk: {
    id: string;
    sk_number: string;
    status: string;
    expiry_date: string | null;
    effective_date: string | null;
    issuing_authority?: string;
  } | null;
};

type Tab =
  | "overview"
  | "items"
  | "flow"
  | "compliance"
  | "procurement"
  | "shipment"
  | "delivery"
  | "bast"
  | "invoice"
  | "activity";

type DraftState = {
  customer_id: string;
  site_id: string;
  contract_id: string;
  business_model: string;
  po_number: string;
  po_date: string;
  currency: string;
  exchange_rate: number;
  remarks: string;
};

type DraftItem = OrderItemInput & { _key: string };

// ============================ MAIN COMPONENT ============================

export function OrderDetail({
  order,
  items,
  history,
  approvals,
  sites,
  contracts,
  products,
  procurements,
  shipments,
  deliveries,
  basts,
  invoices,
  invoiceSummary,
  vendors,
  transporters,
  orderItemsRef,
  compliance,
  coverage,
  currentUserId,
  permissions,
}: {
  order: Order;
  items: Item[];
  history: History[];
  approvals: Approval[];
  sites: SiteOption[];
  contracts: ContractOption[];
  products: ProductOption[];
  procurements: ProcurementRow[];
  shipments: ShipmentRow[];
  deliveries: DeliveryRow[];
  basts: BastRow[];
  invoices: InvoiceRow[];
  invoiceSummary: InvoiceSummary;
  vendors: VendorOption[];
  transporters: TransporterOption[];
  orderItemsRef: { product_id: string; qty: number; uom: string }[];
  compliance: ComplianceData | undefined;
  coverage: ProcurementCoverage;
  currentUserId: string;
  permissions: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Permission-gated actions
  const editable =
    canEditOrder(order.status) && permissions.includes("ORDER_UPDATE_DRAFT");
  const canSubmit =
    canSubmitOrder(order.status) && permissions.includes("ORDER_SUBMIT");
  const canReview =
    canReviewOrder(order.status) && permissions.includes("ORDER_REVIEW");
  const canApprove =
    canApproveOrder(order.status) && permissions.includes("ORDER_APPROVE");
  const canAmend =
    canAmendOrder(order.status) && permissions.includes("ORDER_AMEND_REQUEST");
  const canCancel =
    canCancelOrder(order.status) && permissions.includes("ORDER_CANCEL_REQUEST");
  const canIssue =
    order.status === "APPROVED" && permissions.includes("ORDER_APPROVE");
  const canReviewApprovals =
    permissions.includes("ORDER_AMEND_APPROVE") ||
    permissions.includes("ORDER_CANCEL_APPROVE");

  // Sequential stage guards
  const procurementEditable = [
    "ISSUED",
    "IN_PROGRESS",
    "PARTIALLY_FULFILLED",
  ].includes(order.status);

  const shipmentEditable = procurementEditable && coverage.all_verified;

  const hasDelivery = deliveries.length > 0;
  const hasCompletedBast = basts.some((b) => b.status === "COMPLETED");

  const bastEditable =
    hasDelivery &&
    !hasCompletedBast &&
    ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(order.status);

  // Modal states
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showAmendment, setShowAmendment] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    customer_id: order.customer_id,
    site_id: order.site_id,
    contract_id: order.contract_id,
    business_model: order.business_model,
    po_number: order.po_number ?? "",
    po_date: order.po_date ?? "",
    currency: order.currency,
    exchange_rate: Number(order.exchange_rate),
    remarks: order.remarks ?? "",
  });
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    if (!editMode) return;
    setDraftItems(
      items.map((it, idx) => ({
        _key: `it-${it.id}-${idx}`,
        id: it.id,
        product_id: it.product_id,
        description: it.description,
        qty: Number(it.qty),
        uom: it.uom,
        unit_price: Number(it.unit_price),
        currency: it.currency,
        exchange_rate: Number(it.exchange_rate),
      }))
    );
  }, [editMode, items]);

  // ---------------- Draft items helpers ----------------
  function addDraftItem() {
    if (products.length === 0) return;
    const first = products[0];
    setDraftItems((prev) => [
      ...prev,
      {
        _key: `it-new-${Date.now()}`,
        product_id: first.id,
        description: "",
        qty: 0,
        uom: first.uom,
        unit_price: 0,
        currency: draft.currency,
        exchange_rate: draft.exchange_rate,
      },
    ]);
  }

  function updateDraftItem(key: string, patch: Partial<OrderItemInput>) {
    setDraftItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, ...patch } : it))
    );
  }

  function removeDraftItem(key: string) {
    setDraftItems((prev) => prev.filter((it) => it._key !== key));
  }

  // ---------------- Actions ----------------
  function saveDraft() {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderDraft(order.id, {
        ...draft,
        items: draftItems.map(({ _key, ...rest }) => rest),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditMode(false);
      router.refresh();
    });
  }

  function doSubmit() {
    setError(null);
    const payload = {
      ...draft,
      po_number: draft.po_number,
      po_date: draft.po_date,
      items:
        draftItems.length > 0
          ? draftItems.map(({ _key, ...rest }) => rest)
          : items.map((it) => ({
              id: it.id,
              product_id: it.product_id,
              description: it.description,
              qty: Number(it.qty),
              uom: it.uom,
              unit_price: Number(it.unit_price),
              currency: it.currency,
              exchange_rate: Number(it.exchange_rate),
            })),
    };
    startTransition(async () => {
      const result = await submitOrder(order.id, payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function doStartReview() {
    setError(null);
    startTransition(async () => {
      const r = await startReview(order.id);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function doApprove() {
    setError(null);
    startTransition(async () => {
      const r = await approveOrder(order.id);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function doIssue() {
    setError(null);
    startTransition(async () => {
      const r = await issueOrder(order.id);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function doReturn() {
    setError(null);
    startTransition(async () => {
      const r = await returnOrder(order.id, returnReason);
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowReturn(false);
      setReturnReason("");
      router.refresh();
    });
  }

  function doCancel() {
    setError(null);
    startTransition(async () => {
      const r = await requestCancellation(order.id, cancelReason);
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowCancel(false);
      setCancelReason("");
      router.refresh();
    });
  }

  function doAmendment() {
    setError(null);
    startTransition(async () => {
      const r = await requestAmendment(order.id, amendmentReason, {});
      if (r.error) {
        setError(r.error);
        return;
      }
      setShowAmendment(false);
      setAmendmentReason("");
      router.refresh();
    });
  }

  function doApprovalDecision(id: string, decision: "APPROVED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const r = await reviewApprovalRequest(id, decision);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  // ---------------- Derived ----------------
  const marginPct =
    Number(order.selling_value) > 0
      ? (Number(order.margin) / Number(order.selling_value)) * 100
      : 0;
  const pendingApprovals = approvals.filter((a) => a.status === "PENDING");

  const isAmendmentDraft =
    order.status === "DRAFT" &&
    (order.amendment_count ?? 0) > 0 &&
    Boolean(order.last_amendment_from_status);

  const display = getDisplayStatus(order);

  // Margin breakdown totals
  const totalMaterialCost = procurements.reduce(
    (a, p) => a + Number(p.material_cost ?? 0),
    0
  );
  const totalTransportCost = shipments.reduce(
    (a, s) => a + Number(s.transport_cost ?? 0),
    0
  );

  const TABS: { key: Tab; label: string; badge?: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Items" },
    { key: "flow", label: "Flow" },
    { key: "compliance", label: "Compliance" },
    {
      key: "procurement",
      label: "Procurement",
      badge: procurements.length > 0 ? String(procurements.length) : undefined,
    },
    {
      key: "shipment",
      label: "Shipment",
      badge: shipments.length > 0 ? String(shipments.length) : undefined,
    },
    {
      key: "delivery",
      label: "Delivery",
      badge: deliveries.length > 0 ? String(deliveries.length) : undefined,
    },
    {
      key: "bast",
      label: "BAST",
      badge: basts.length > 0 ? String(basts.length) : undefined,
    },
    {
      key: "invoice",
      label: "Invoice",
      badge: invoices.length > 0 ? String(invoices.length) : undefined,
    },
    { key: "activity", label: "Activity" },
  ];

  // ---------------- Render ----------------
  return (
    <>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="text-sm text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              ← Orders
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{order.order_number}</h1>
            <Badge tone={display.tone}>{display.label}</Badge>
            <span className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">
              {order.po_number ?? "No PO"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
            {order.customers?.name} · {order.sites?.name} ·{" "}
            <span className="text-[#0A84FF]">{order.business_model}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {editable && !editMode && (
            <Button variant="secondary" onClick={() => setEditMode(true)}>
              Edit Draft
            </Button>
          )}
          {editMode && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  setError(null);
                }}
              >
                Cancel Edit
              </Button>
              <Button onClick={saveDraft} disabled={pending}>
                {pending ? "Saving..." : "Save Draft"}
              </Button>
            </>
          )}
          {canSubmit && (
            <Button onClick={doSubmit} disabled={pending}>
              {pending ? "Submitting..." : "Submit"}
            </Button>
          )}
          {canReview && (
            <>
              {order.status === "SUBMITTED" && (
                <Button
                  variant="secondary"
                  onClick={doStartReview}
                  disabled={pending}
                >
                  Start Review
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setShowReturn(true)}
                disabled={pending}
              >
                Return
              </Button>
            </>
          )}
          {canApprove && (
            <Button onClick={doApprove} disabled={pending}>
              {pending ? "Approving..." : "Approve"}
            </Button>
          )}
          {canIssue && (
            <Button onClick={doIssue} disabled={pending}>
              {pending ? "Issuing..." : "Issue Order"}
            </Button>
          )}
          {canAmend && (
            <Button
              variant="secondary"
              onClick={() => setShowAmendment(true)}
              disabled={pending}
            >
              Request Amendment
            </Button>
          )}
          {canCancel && (
            <Button
              variant="secondary"
              onClick={() => setShowCancel(true)}
              disabled={pending}
            >
              Request Cancel
            </Button>
          )}
        </div>
      </div>

      {/* BANNERS */}
      {order.status === "RETURNED" && order.return_reason && (
        <div className="mb-6 text-sm bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#A15C00] rounded-lg px-4 py-3">
          <div className="font-medium">Order dikembalikan</div>
          <div className="mt-1">{order.return_reason}</div>
          <div className="mt-1 text-xs opacity-75">
            {order.returned_at
              ? new Date(order.returned_at).toLocaleString("id-ID")
              : ""}
          </div>
        </div>
      )}

      {isAmendmentDraft && (
        <div className="mb-6 text-sm bg-[#EAF2FB] border border-[#0A84FF]/30 text-[#0A84FF] rounded-lg px-4 py-3">
          <div className="font-medium">Amendment Disetujui</div>
          <div className="mt-1">
            Order ini telah melalui amendment #{order.amendment_count}. Silakan
            edit dan submit ulang untuk verifikasi.
          </div>
          <div className="mt-1 text-xs opacity-75">
            Status sebelumnya: {order.last_amendment_from_status} ·{" "}
            {order.last_amendment_at
              ? new Date(order.last_amendment_at).toLocaleString("id-ID")
              : ""}
          </div>
        </div>
      )}

      {order.status === "CANCELLED" && order.cancel_reason && (
        <div className="mb-6 text-sm bg-[#FF3B30]/8 border border-[#FF3B30]/30 text-[#B71C1C] rounded-lg px-4 py-3">
          <div className="font-medium">Order dibatalkan</div>
          <div className="mt-1">{order.cancel_reason}</div>
        </div>
      )}

      {order.status === "ISSUED" && order.sk_id && (
        <div className="mb-6 text-sm bg-[#34C759]/10 border border-[#34C759]/30 text-[#1B8A3B] rounded-lg px-4 py-3">
          <div className="font-medium">Order sudah di-issue</div>
          <div className="mt-1">
            SK aktif terkait: {compliance?.sk?.sk_number ?? order.sk_id}
            {order.issued_at
              ? ` · Issued ${new Date(order.issued_at).toLocaleString("id-ID")}`
              : ""}
          </div>
        </div>
      )}

      {/* PENDING APPROVALS */}
      {pendingApprovals.length > 0 && (
        <div className="mb-6 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-4">
          <div className="font-medium mb-2 text-sm">
            Pending Approval Requests
          </div>
          <ul className="space-y-2">
            {pendingApprovals.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg px-3 py-2 flex-wrap gap-2"
              >
                <div>
                  <span className="font-medium">{a.type}</span>
                  <span className="text-[#6E6E73] dark:text-[#8E8E93]"> · {a.reason}</span>
                  <div className="text-xs text-[#8E8E93] mt-0.5">
                    Diminta {new Date(a.requested_at).toLocaleString("id-ID")}
                  </div>
                </div>
                {canReviewApprovals ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => doApprovalDecision(a.id, "REJECTED")}
                      disabled={pending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => doApprovalDecision(a.id, "APPROVED")}
                      disabled={pending}
                    >
                      Approve
                    </Button>
                  </div>
                ) : (
                  <Badge tone="yellow">Pending</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl">
            <div className="px-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`h-11 px-4 text-sm border-b-2 -mb-px transition whitespace-nowrap flex items-center gap-2 ${
                    tab === t.key
                      ? "border-[#0A84FF] text-[#0A84FF] font-medium"
                      : "border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:text-[#F5F5F7]"
                  }`}
                >
                  <span>{t.label}</span>
                  {t.badge && (
                    <span
                      className={`text-[10px] px-1.5 rounded-full ${
                        tab === t.key
                          ? "bg-[#0A84FF]/15 text-[#0A84FF]"
                          : "bg-[#F2F2F4] text-[#6E6E73] dark:text-[#8E8E93]"
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "overview" && (
                <OverviewTab
                  order={order}
                  editMode={editMode}
                  draft={draft}
                  setDraft={setDraft}
                  sites={sites}
                  contracts={contracts}
                  marginPct={marginPct}
                />
              )}

              {tab === "items" && (
                <ItemsTab
                  items={items}
                  editMode={editMode}
                  draftItems={draftItems}
                  products={products}
                  onAdd={addDraftItem}
                  onUpdate={updateDraftItem}
                  onRemove={removeDraftItem}
                />
              )}

              {tab === "flow" && <FlowTab order={order} />}

              {tab === "compliance" && (
                <ComplianceTab order={order} compliance={compliance} />
              )}

              {tab === "procurement" && (
                <ProcurementTab
                  orderId={order.id}
                  procurements={procurements}
                  vendors={vendors}
                  products={products}
                  orderItems={items.map((it) => ({
                    product_id: it.product_id,
                    product_name: it.products?.name ?? "—",
                    uom: it.uom,
                    qty: Number(it.qty),
                  }))}
                  coverage={coverage}
                  permissions={permissions}
                  canEdit={procurementEditable}
                />
              )}

              {tab === "shipment" && (
                <ShipmentTab
                  orderId={order.id}
                  orderStatus={order.status}
                  shipments={shipments}
                  transporters={transporters}
                  products={products}
                  orderItems={orderItemsRef}
                  coverage={coverage}
                  permissions={permissions}
                  canEdit={shipmentEditable}
                />
              )}

              {tab === "delivery" && (
                <DeliveryTab
                  orderId={order.id}
                  shipments={shipments}
                  deliveries={deliveries}
                  permissions={permissions}
                />
              )}

              {tab === "bast" && (
                <BastTab
                  orderId={order.id}
                  basts={basts}
                  permissions={permissions}
                  canCreate={bastEditable}
                />
              )}

              {tab === "invoice" && (
                <InvoiceTab
                  orderId={order.id}
                  businessModel={order.business_model}
                  orderStatus={order.status}
                  orderCurrency={order.currency}
                  orderItems={items.map((it) => ({
                    product_id: it.product_id,
                    product_name: it.products?.name ?? "—",
                    uom: it.uom,
                    qty: Number(it.qty),
                    unit_price: Number(it.unit_price),
                  }))}
                  invoices={invoices}
                  summary={invoiceSummary}
                  permissions={permissions}
                />
              )}

              {tab === "activity" && <ActivityTab history={history} />}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          {/* BUSINESS MODEL CARD */}
          <BusinessModelCard model={order.business_model} />

          {/* MARGIN BREAKDOWN */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-4">
              Margin Breakdown
            </h2>
<MarginBreakdown
  sellingValue={Number(order.selling_value)}
  materialCost={totalMaterialCost}
  transportCost={totalTransportCost}
  ppnRate={Number(order.ppn_rate ?? 11)}
  pph23Rate={Number(order.pph23_rate ?? 2)}
  currency={order.currency}
/>
          </div>

          {/* INVOICING SUMMARY */}
          {invoiceSummary.invoiceCount > 0 && (
            <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-4">
                Invoicing
              </h2>
              <div className="space-y-3 text-sm">
                <SummaryRow
                  label="Invoiced"
                  value={fmtNum(
                    invoiceSummary.totalInvoiced,
                    invoiceSummary.currency
                  )}
                />
                <SummaryRow
                  label="Paid"
                  value={fmtNum(
                    invoiceSummary.totalPaid,
                    invoiceSummary.currency
                  )}
                />
                <SummaryRow
                  label="Outstanding"
                  value={fmtNum(
                    invoiceSummary.outstanding,
                    invoiceSummary.currency
                  )}
                />
                {invoiceSummary.uninvoiced > 0.01 && (
                  <SummaryRow
                    label="Uninvoiced"
                    value={fmtNum(
                      invoiceSummary.uninvoiced,
                      invoiceSummary.currency
                    )}
                  />
                )}
                {invoiceSummary.overdueCount > 0 && (
                  <div className="pt-2">
                    <Badge tone="red">
                      {invoiceSummary.overdueCount} overdue
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUMMARY */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-4">
              Summary
            </h2>
            <div className="space-y-3 text-sm">
              <SummaryRow
                label="Order Value"
                value={`${order.currency} ${Number(
                  order.selling_value
                ).toLocaleString("id-ID")}`}
              />
              <SummaryRow
                label="Business Model"
                value={order.business_model}
              />
              <SummaryRow label="Stage" value={order.current_stage} />
              <SummaryRow
                label="Completion"
                value={`${order.completion_pct}%`}
              />
              {(order.amendment_count ?? 0) > 0 && (
                <SummaryRow
                  label="Amendments"
                  value={String(order.amendment_count)}
                />
              )}
            </div>
          </div>

          {/* COMPLIANCE */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-4">
              Compliance
            </h2>
            {compliance?.sk ? (
              <div className="space-y-3 text-sm">
                <SummaryRow
                  label="SK Number"
                  value={compliance.sk.sk_number}
                />
                <SummaryRow label="Status" value={compliance.sk.status} />
                <SummaryRow
                  label="Expiry"
                  value={compliance.sk.expiry_date ?? "—"}
                />
                <div className="pt-2">
                  {compliance.items.every((i) => i.sufficient) ? (
                    <Badge tone="green">All materials sufficient</Badge>
                  ) : (
                    <Badge tone="red">Quota issue</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">No active SK</div>
            )}
          </div>

          {/* KEY DATES */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-4">
              Key Dates
            </h2>
            <div className="space-y-3 text-sm">
              <SummaryRow label="PO Date" value={order.po_date ?? "—"} />
              <SummaryRow
                label="Created"
                value={new Date(order.created_at).toLocaleDateString("id-ID")}
              />
              <SummaryRow
                label="Submitted"
                value={
                  order.submitted_at
                    ? new Date(order.submitted_at).toLocaleDateString("id-ID")
                    : "—"
                }
              />
              <SummaryRow
                label="Approved"
                value={
                  order.approved_at
                    ? new Date(order.approved_at).toLocaleDateString("id-ID")
                    : "—"
                }
              />
              <SummaryRow
                label="Issued"
                value={
                  order.issued_at
                    ? new Date(order.issued_at).toLocaleDateString("id-ID")
                    : "—"
                }
              />
            </div>
          </div>

          {/* FLOW COUNTERS */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-4">
              Flow Counters
            </h2>
            <div className="space-y-3 text-sm">
              <SummaryRow
                label="Procurements"
                value={String(procurements.length)}
              />
              <SummaryRow label="Shipments" value={String(shipments.length)} />
              <SummaryRow
                label="Deliveries"
                value={String(deliveries.length)}
              />
              <SummaryRow label="BASTs" value={String(basts.length)} />
              <SummaryRow label="Invoices" value={String(invoices.length)} />
            </div>
          </div>
        </aside>
      </div>

      {/* MODALS */}
      <Modal
        open={showReturn}
        onClose={() => setShowReturn(false)}
        title="Return Order"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReturn(false)}>
              Cancel
            </Button>
            <Button
              onClick={doReturn}
              disabled={pending || returnReason.trim().length < 5}
            >
              {pending ? "Returning..." : "Return"}
            </Button>
          </>
        }
      >
        <FormField label="Alasan pengembalian" required>
          <Textarea
            rows={4}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Minimal 5 karakter..."
          />
        </FormField>
      </Modal>

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Request Cancellation"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancel(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={doCancel}
              disabled={pending || cancelReason.trim().length < 5}
            >
              {pending ? "Sending..." : "Request Cancellation"}
            </Button>
          </>
        }
      >
        <FormField label="Alasan pembatalan" required>
          <Textarea
            rows={4}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Minimal 5 karakter..."
          />
        </FormField>
      </Modal>

      <Modal
        open={showAmendment}
        onClose={() => setShowAmendment(false)}
        title="Request Amendment"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAmendment(false)}>
              Cancel
            </Button>
            <Button
              onClick={doAmendment}
              disabled={pending || amendmentReason.trim().length < 5}
            >
              {pending ? "Sending..." : "Request Amendment"}
            </Button>
          </>
        }
      >
        <FormField label="Alasan amendment" required>
          <Textarea
            rows={4}
            value={amendmentReason}
            onChange={(e) => setAmendmentReason(e.target.value)}
            placeholder="Jelaskan perubahan yang diperlukan (min. 5 karakter)..."
          />
        </FormField>
        <p className="mt-3 text-xs text-[#8E8E73]">
          Setelah disetujui, order akan kembali ke status Draft dan dapat
          diedit.
        </p>
      </Modal>
    </>
  );
}

// ============================ HELPERS ============================

function getDisplayStatus(order: {
  status: string;
  amendment_count?: number;
  last_amendment_from_status?: string | null;
}): { label: string; tone: ReturnType<typeof orderStatusTone> } {
  if (
    order.status === "DRAFT" &&
    order.amendment_count &&
    order.amendment_count > 0 &&
    order.last_amendment_from_status
  ) {
    return { label: "Draft (Amendment)", tone: "yellow" };
  }
  return {
    label: orderStatusLabel(order.status),
    tone: orderStatusTone(order.status),
  };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#6E6E73] dark:text-[#8E8E93] shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-[#6E6E73] dark:text-[#8E8E93] text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1">{value || "—"}</div>
    </div>
  );
}

function fmtNum(n: number, currency: string) {
  return `${currency} ${Number(n).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  })}`;
}

// ============================ BUSINESS MODEL CARD ============================

function BusinessModelCard({ model }: { model: string }) {
  const info = getBusinessModelInfo(model);
  if (!info) {
    return (
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-2">
          Business Model
        </h2>
        <div className="text-sm">{model || "—"}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
      <h2 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wide mb-4">
        Business Model
      </h2>
      <div className="text-base font-semibold text-[#0A84FF]">
        {info.label}
      </div>
      <p className="mt-2 text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
        {info.description}
      </p>
      <div className="mt-3 pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E]">
        <div className="text-[10px] text-[#8E8E93] uppercase tracking-wide">
          Cocok untuk
        </div>
        <div className="mt-0.5 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">{info.fit}</div>
      </div>
    </div>
  );
}

// ============================ MARGIN BREAKDOWN ============================

function MarginBreakdown({
  sellingValue,
  materialCost,
  transportCost,
  ppnRate = 11,
  pph23Rate = 2,
  currency,
}: {
  sellingValue: number;
  materialCost: number;
  transportCost: number;
  ppnRate?: number;
  pph23Rate?: number;
  currency: string;
}) {
  const totalCost = materialCost + transportCost;
  const marginBefore = sellingValue - totalCost;
  const marginPctBefore =
    sellingValue > 0 ? (marginBefore / sellingValue) * 100 : 0;

  // PPN
  const ppnOutput = (sellingValue * ppnRate) / 100;
  const ppnInput = (totalCost * ppnRate) / 100;
  const ppnPayable = ppnOutput - ppnInput;

  // PPh 23
  const pph23 = (transportCost * pph23Rate) / 100;

  // Total tax
  const totalTax = ppnPayable + pph23;
  const marginAfter = marginBefore - totalTax;
  const marginPctAfter =
    sellingValue > 0 ? (marginAfter / sellingValue) * 100 : 0;

  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-2 text-sm">
      {/* ============ BEFORE TAX SECTION ============ */}
      <div className="text-[10px] text-[#8E8E93] uppercase tracking-wide font-semibold">
        Before Tax
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">Selling Value (DPP)</span>
        <span className="font-mono text-xs">{fmt(sellingValue)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">Material Cost</span>
        <span className="font-mono text-xs text-[#FF3B30]">
          − {fmt(materialCost)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">Transport Cost</span>
        <span className="font-mono text-xs text-[#FF3B30]">
          − {fmt(transportCost)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] pt-2">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">Total Direct Cost</span>
        <span className="font-mono text-xs">{fmt(totalCost)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] pt-2">
        <span className="font-medium">Margin Before Tax</span>
        <span
          className={`font-mono text-xs font-medium ${
            marginBefore >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"
          }`}
        >
          {fmt(marginBefore)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">Margin %</span>
        <span
          className={`text-xs font-medium ${
            marginPctBefore >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"
          }`}
        >
          {marginPctBefore.toFixed(2)}%
        </span>
      </div>

      {/* ============ TAX SECTION ============ */}
      <div className="text-[10px] text-[#8E8E93] uppercase tracking-wide font-semibold pt-3 mt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E]">
        Tax
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">
          PPN Output ({ppnRate}%)
        </span>
        <span className="font-mono text-xs">{fmt(ppnOutput)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">
          PPN Input ({ppnRate}%)
        </span>
        <span className="font-mono text-xs text-[#34C759]">
          − {fmt(ppnInput)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-[#FF9500]">
          PPN Payable
        </span>
        <span
          className={`font-mono text-xs font-medium ${
            ppnPayable >= 0 ? "text-[#FF9500]" : "text-[#34C759]"
          }`}
        >
          {fmt(ppnPayable)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">
          PPh 23 ({pph23Rate}% × transport)
        </span>
        <span className="font-mono text-xs text-[#FF9500]">
          {fmt(pph23)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] pt-2">
        <span className="font-medium">Total Tax</span>
        <span className="font-mono text-xs font-medium text-[#FF9500]">
          {fmt(totalTax)}
        </span>
      </div>

      {/* ============ AFTER TAX SECTION ============ */}
      <div className="text-[10px] text-[#8E8E93] uppercase tracking-wide font-semibold pt-3 mt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E]">
        After Tax
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] pt-2">
        <span className="font-medium">Margin After Tax</span>
        <span
          className={`font-mono text-xs font-medium ${
            marginAfter >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"
          }`}
        >
          {fmt(marginAfter)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#6E6E73] dark:text-[#8E8E93]">Margin %</span>
        <span
          className={`text-xs font-medium ${
            marginPctAfter >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"
          }`}
        >
          {marginPctAfter.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

// ============================ TABS ============================

function OverviewTab({
  order,
  editMode,
  draft,
  setDraft,
  sites,
  contracts,
  marginPct,
}: {
  order: Order;
  editMode: boolean;
  draft: DraftState;
  setDraft: (v: DraftState) => void;
  sites: SiteOption[];
  contracts: ContractOption[];
  marginPct: number;
}) {
  const draftModelInfo = getBusinessModelInfo(draft.business_model);

  if (!editMode) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
        <Info label="Customer" value={order.customers?.name} />
        <Info label="Site" value={order.sites?.name} />
        <Info label="Contract" value={order.contracts?.name} />
        <Info label="Business Model" value={order.business_model} />
        <Info label="PO Number" value={order.po_number} />
        <Info label="PO Date" value={order.po_date} />
        <Info label="Currency" value={order.currency} />
        <Info label="Exchange Rate" value={String(order.exchange_rate)} />
        <Info
          label="Order Value"
          value={`${order.currency} ${Number(
            order.selling_value
          ).toLocaleString("id-ID")}`}
        />
        <Info label="Margin" value={`${marginPct.toFixed(2)}%`} />
        {order.remarks && (
          <div className="md:col-span-2">
            <div className="text-[#6E6E73] dark:text-[#8E8E93] text-xs uppercase tracking-wide">
              Remarks
            </div>
            <div className="mt-1">{order.remarks}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Site" required>
        <Select
          value={draft.site_id}
          onChange={(e) => setDraft({ ...draft, site_id: e.target.value })}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Contract" required>
        <Select
          value={draft.contract_id}
          onChange={(e) => setDraft({ ...draft, contract_id: e.target.value })}
        >
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="md:col-span-2">
        <FormField label="Business Model" required>
          <Select
            value={draft.business_model}
            onChange={(e) =>
              setDraft({ ...draft, business_model: e.target.value })
            }
          >
            {BUSINESS_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </FormField>
        {draftModelInfo && (
          <div className="mt-2 text-xs text-[#6E6E73] dark:text-[#8E8E93] bg-[#F6F6F7] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg px-3 py-2 leading-relaxed">
            <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-0.5">
              {draftModelInfo.label}
            </div>
            <div>{draftModelInfo.description}</div>
            <div className="mt-1 text-[10px] text-[#8E8E93]">
              Cocok untuk: {draftModelInfo.fit}
            </div>
          </div>
        )}
      </div>

      <FormField label="PO Number">
        <Input
          value={draft.po_number}
          onChange={(e) => setDraft({ ...draft, po_number: e.target.value })}
        />
      </FormField>
      <FormField label="PO Date">
        <Input
          type="date"
          value={draft.po_date}
          onChange={(e) => setDraft({ ...draft, po_date: e.target.value })}
        />
      </FormField>
      <FormField label="Currency">
        <Select
          value={draft.currency}
          onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
        >
          <option value="IDR">IDR</option>
          <option value="USD">USD</option>
        </Select>
      </FormField>
      <FormField label="Exchange Rate">
        <Input
          type="number"
          step="0.000001"
          value={draft.exchange_rate}
          onChange={(e) =>
            setDraft({ ...draft, exchange_rate: Number(e.target.value) || 1 })
          }
          disabled={draft.currency === "IDR"}
        />
      </FormField>
      <div className="md:col-span-2">
        <FormField label="Remarks">
          <Textarea
            rows={2}
            value={draft.remarks}
            onChange={(e) => setDraft({ ...draft, remarks: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}

function ItemsTab({
  items,
  editMode,
  draftItems,
  products,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: Item[];
  editMode: boolean;
  draftItems: DraftItem[];
  products: ProductOption[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<OrderItemInput>) => void;
  onRemove: (key: string) => void;
}) {
  if (!editMode) {
    if (items.length === 0) {
      return (
        <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] text-center py-10">
          Belum ada item.
        </div>
      );
    }
    return (
      <Table>
        <THead>
          <TR>
            <TH>Product</TH>
            <TH>Qty</TH>
            <TH>UOM</TH>
            <TH>Unit Price</TH>
            <TH className="text-right">Line Value</TH>
          </TR>
        </THead>
        <TBody>
          {items.map((it) => (
            <TR key={it.id}>
              <TD className="font-medium">{it.products?.name ?? "—"}</TD>
              <TD>{Number(it.qty).toLocaleString("id-ID")}</TD>
              <TD>{it.uom}</TD>
              <TD className="font-mono text-xs">
                {it.currency} {Number(it.unit_price).toLocaleString("id-ID")}
              </TD>
              <TD className="text-right font-mono text-xs">
                {Number(it.line_value).toLocaleString("id-ID")}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" variant="secondary" onClick={onAdd}>
          + Add Item
        </Button>
      </div>
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
          {draftItems.map((it) => {
            const priceIdr =
              it.currency === "IDR"
                ? it.unit_price
                : it.unit_price * it.exchange_rate;
            const lineValue = it.qty * priceIdr;
            return (
              <TR key={it._key}>
                <TD>
                  <Select
                    value={it.product_id}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      onUpdate(it._key, {
                        product_id: e.target.value,
                        uom: p?.uom ?? it.uom,
                      });
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </TD>
                <TD>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.qty}
                    onChange={(e) =>
                      onUpdate(it._key, { qty: Number(e.target.value) })
                    }
                    className="w-24"
                  />
                </TD>
                <TD>
                  <Input
                    value={it.uom}
                    onChange={(e) => onUpdate(it._key, { uom: e.target.value })}
                    className="w-20"
                  />
                </TD>
                <TD>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) =>
                      onUpdate(it._key, {
                        unit_price: Number(e.target.value),
                      })
                    }
                    className="w-32"
                  />
                </TD>
                <TD className="text-right font-mono text-xs">
                  {lineValue.toLocaleString("id-ID")}
                </TD>
                <TD className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(it._key)}
                    className="text-[#FF3B30]"
                  >
                    ×
                  </Button>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function FlowTab({ order }: { order: Order }) {
  // Derive compliance from order status kalau belum ter-set (fallback)
  const complianceStatus =
    order.compliance_status === "NOT_STARTED" &&
    [
      "ISSUED",
      "IN_PROGRESS",
      "PARTIALLY_FULFILLED",
      "FULFILLED",
      "CLOSED",
    ].includes(order.status)
      ? "COMPLETED"
      : order.compliance_status;

  const stages: { key: string; label: string; status: string }[] = [
    { key: "PO", label: "PO", status: order.po_status },
    { key: "COMPLIANCE", label: "Compliance", status: complianceStatus },
    {
      key: "PROCUREMENT",
      label: "Procurement",
      status: order.procurement_status,
    },
    { key: "SHIPMENT", label: "Shipment", status: order.shipment_status },
    { key: "DELIVERY", label: "Delivery", status: order.delivery_status },
    { key: "BAST", label: "BAST", status: order.bast_status },
  ];

  function tone(s: string) {
    if (s === "COMPLETED" || s === "VERIFIED") return "bg-[#34C759]";
    if (s === "SUBMITTED") return "bg-[#0A84FF]";
    if (s === "DRAFT") return "bg-[#FFCC00]";
    return "bg-[#E5E5EA]";
  }

  return (
    <ol className="space-y-3">
      {stages.map((s) => (
        <li key={s.key} className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${tone(s.status)}`} />
          <span className="text-sm w-28">{s.label}</span>
          <span className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
            {s.status.replace(/_/g, " ")}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ComplianceTab({
  order,
  compliance,
}: {
  order: Order;
  compliance: ComplianceData | undefined;
}) {
  if (!compliance || !compliance.sk) {
    return (
      <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] text-center py-10">
        Belum ada SK Kemhan aktif. Hubungi Compliance untuk membuat SK terlebih
        dahulu.
      </div>
    );
  }

  const allSufficient = compliance.items.every((i) => i.sufficient);
  const anyUnauthorized = compliance.items.some((i) => !i.authorized);

  return (
    <div className="space-y-4">
      <div className="bg-[#F6F6F7] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-lg font-semibold">{compliance.sk.sk_number}</div>
          <Badge
            tone={compliance.sk.status === "ACTIVE" ? "green" : "orange"}
          >
            {compliance.sk.status}
          </Badge>
          {order.compliance_status === "COMPLETED" && (
            <Badge tone="green">Order Issued</Badge>
          )}
          {order.sk_id && <Badge tone="blue">Linked to this order</Badge>}
        </div>
        {compliance.sk.issuing_authority && (
          <div className="mt-1 text-sm text-[#6E6E73] dark:text-[#8E8E93]">
            {compliance.sk.issuing_authority}
          </div>
        )}
        {compliance.sk.expiry_date && (
          <div className="mt-1 text-xs text-[#8E8E93]">
            Expires {compliance.sk.expiry_date}
          </div>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Material</TH>
            <TH className="text-right">Requested</TH>
            <TH className="text-right">Available</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {compliance.items.map((it) => (
            <TR key={it.product_id}>
              <TD className="font-medium">{it.product_name}</TD>
              <TD className="text-right font-mono text-xs">
                {it.requested.toLocaleString("id-ID")} {it.uom}
              </TD>
              <TD className="text-right font-mono text-xs">
                {it.authorized
                  ? `${it.available.toLocaleString("id-ID")} ${it.uom}`
                  : "—"}
              </TD>
              <TD>
                {!it.authorized && <Badge tone="red">Not authorized</Badge>}
                {it.authorized && it.sufficient && (
                  <Badge tone="green">Sufficient</Badge>
                )}
                {it.authorized && !it.sufficient && (
                  <Badge tone="red">Insufficient</Badge>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {order.status === "APPROVED" && (
        <div
          className={`text-sm rounded-lg px-4 py-3 ${
            allSufficient && !anyUnauthorized
              ? "bg-[#34C759]/10 border border-[#34C759]/30 text-[#1B8A3B]"
              : "bg-[#FF3B30]/5 border border-[#FF3B30]/30 text-[#B71C1C]"
          }`}
        >
          {allSufficient && !anyUnauthorized ? (
            <>
              <div className="font-medium">Semua material sufficient.</div>
              <div className="mt-1">
                Klik <span className="font-medium">Issue Order</span> di header
                untuk mengunci quota dan mengubah status menjadi ISSUED.
              </div>
            </>
          ) : (
            <>
              <div className="font-medium">Compliance check gagal.</div>
              <div className="mt-1">
                {anyUnauthorized
                  ? "Ada material yang tidak tercakup dalam SK aktif."
                  : "Quota tidak mencukupi untuk salah satu material."}{" "}
                Hubungi Compliance sebelum issue order.
              </div>
            </>
          )}
        </div>
      )}

      {order.status === "ISSUED" && (
        <div className="text-sm bg-[#EAF2FB] border border-[#0A84FF]/30 text-[#0A84FF] rounded-lg px-4 py-3">
          <div className="font-medium">
            Quota sudah di-reserve untuk order ini.
          </div>
          <div className="mt-1 text-xs">
            Quota akan otomatis di-realize saat Shipment di-confirm, dan
            di-release saat order di-cancel.
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityTab({ history }: { history: History[] }) {
  if (history.length === 0) {
    return (
      <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93] text-center py-10">
        Belum ada aktivitas.
      </div>
    );
  }
  return (
    <ol className="space-y-4">
      {history.map((h) => (
        <li key={h.id} className="flex items-start gap-3">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-[#0A84FF] shrink-0" />
          <div className="text-sm">
            <div className="font-medium">{h.action.replace(/_/g, " ")}</div>
            <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
              {h.from_status && h.from_status !== h.to_status
                ? `${h.from_status} → `
                : ""}
              {h.to_status}
            </div>
            {h.reason && (
              <div className="mt-1 text-xs text-[#6E6E73] dark:text-[#8E8E93] italic">
                "{h.reason}"
              </div>
            )}
            <div className="text-[11px] text-[#8E8E93] mt-1">
              {new Date(h.created_at).toLocaleString("id-ID")}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}