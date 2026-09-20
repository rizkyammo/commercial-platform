"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  submitUsageReport,
  approveUsageReport,
  rejectUsageReport,
  generateInvoiceFromUsageReport,
  deleteUsageReport,
} from "@/features/invoicing/usage-actions";

function hasAny(perms: string[], codes: string[]) {
  return codes.some((c) => perms.includes(c));
}

export function UsageReportDetail({
  report,
  currentUserId,
  permissions,
}: {
  report: any;
  currentUserId: string;
  permissions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canSubmit = hasAny(permissions, [
    "USAGE_REPORT_CREATE",
    "USAGE_REPORT_APPROVE",
    "INVOICE_MANAGE",
  ]);
  const canApprove = hasAny(permissions, [
    "USAGE_REPORT_APPROVE",
    "INVOICE_MANAGE",
    "ORDER_APPROVE",
  ]);
  const canGenerate = hasAny(permissions, [
    "INVOICE_GENERATE",
    "INVOICE_CREATE",
    "INVOICE_MANAGE",
  ]);

  const isDraft = report.status === "DRAFT";
  const isRejected = report.status === "REJECTED";
  const isSubmitted = report.status === "SUBMITTED";
  const isApproved = report.status === "APPROVED";
  const isInvoiced = report.status === "INVOICED";

  function doAction(fn: () => Promise<any>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  function submitReject() {
    setError(null);
    startTransition(async () => {
      const r = await rejectUsageReport(report.id, rejectReason);
      if (r?.error) {
        setError(r.error);
        return;
      }
      setShowReject(false);
      setRejectReason("");
      router.refresh();
    });
  }

  const fmt = (n: number) =>
    `IDR ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <Link
            href="/invoicing/usage-reports"
            className="text-sm text-[#6E6E73] hover:text-[#1D1D1F]"
          >
            ← Usage Reports
          </Link>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{report.report_number}</h1>
            <Badge tone={statusTone(report.status)}>{report.status}</Badge>
            <Badge tone="grey">
              {report.report_type === "BCM_VOLUME" ? "BCM" : "Consignment"}
            </Badge>
            {report.project_code && (
              <span className="text-sm text-[#6E6E73]">
                Project: {report.project_code}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#6E6E73]">
            {report.customers?.name ?? "—"}
            {report.sites && <> · {report.sites.name}</>}
            {" · "}
            {report.period_start} → {report.period_end}
            {" · "}
            <span className="uppercase text-xs">
              {report.period_type}
            </span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(isDraft || isRejected) && canSubmit && (
            <Button
              variant="primary"
              onClick={() => doAction(() => submitUsageReport(report.id))}
              disabled={pending}
            >
              {pending ? "Submitting..." : "Submit for Approval"}
            </Button>
          )}

          {isSubmitted && canApprove && (
            <>
              <Button
                variant="success"
                onClick={() => doAction(() => approveUsageReport(report.id))}
                disabled={pending}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowReject(true)}
                disabled={pending}
              >
                Reject
              </Button>
            </>
          )}

          {isApproved && canGenerate && (
            <Button
              variant="primary"
              onClick={() =>
                doAction(async () => {
                  const r = await generateInvoiceFromUsageReport(report.id);
                  if (r?.data) {
                    router.push(`/invoicing/${r.data.id}`);
                  }
                  return r;
                })
              }
              disabled={pending}
            >
              {pending ? "Generating..." : "Generate Invoice"}
            </Button>
          )}

          {isInvoiced && report.invoice && (
            <Link href={`/invoicing/${report.invoice.id}`}>
              <Button variant="secondary">
                View Invoice {report.invoice.invoice_number}
              </Button>
            </Link>
          )}

          {isDraft && canSubmit && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!confirm("Hapus usage report ini?")) return;
                doAction(async () => {
                  const r = await deleteUsageReport(report.id);
                  if (!r?.error) router.push("/invoicing/usage-reports");
                  return r;
                });
              }}
              disabled={pending}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {report.reject_reason && isRejected && (
        <div className="mb-6 text-sm bg-[#FF3B30]/8 border border-[#FF3B30]/30 text-[#B71C1C] rounded-lg px-4 py-3">
          <div className="font-medium">Ditolak</div>
          <div className="mt-1">{report.reject_reason}</div>
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-[#FF3B30] bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* LINES */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl">
        <div className="px-6 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <h2 className="font-semibold">Usage Lines</h2>
        </div>
        {report.lines.length === 0 ? (
          <div className="p-6 text-sm text-[#6E6E73] text-center">
            Belum ada line.
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>Type</TH>
                <TH>Margin</TH>
                <TH className="text-right">Qty</TH>
                <TH>UOM</TH>
                <TH className="text-right">Price</TH>
                <TH className="text-right">Transport</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {report.lines.map((ln: any) => (
                <TR key={ln.id}>
                  <TD>
                    <div className="font-medium">
                      {ln.products?.name ?? ln.description ?? "—"}
                    </div>
                    {ln.description && ln.products?.name && (
                      <div className="text-xs text-[#8E8E93]">
                        {ln.description}
                      </div>
                    )}
                  </TD>
                  <TD>
                    <Badge tone="grey">{ln.line_type}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={ln.margin_type === "FEE" ? "green" : "grey"}>
                      {ln.margin_type}
                    </Badge>
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {Number(ln.qty_usage).toLocaleString("id-ID")}
                  </TD>
                  <TD>{ln.uom}</TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(ln.unit_price))}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(ln.transport_amount))}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(ln.amount))}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <div className="px-6 py-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6E6E73]">Total Qty:</span>
              <span className="font-mono">
                {Number(report.total_qty).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E6E73]">Subtotal:</span>
              <span className="font-mono">{fmt(Number(report.total_amount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E6E73]">Transport:</span>
              <span className="font-mono">
                {fmt(Number(report.total_transport))}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#E5E5EA] dark:border-[#2C2C2E] pt-2">
              <span className="font-medium">Grand Total:</span>
              <span className="font-mono font-medium">
                {fmt(
                  Number(report.total_amount) + Number(report.total_transport)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {report.notes && (
        <div className="mt-6 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-2">
            Notes
          </h2>
          <div className="text-sm">{report.notes}</div>
        </div>
      )}

      {/* REJECT MODAL */}
      <Modal
        open={showReject}
        onClose={() => setShowReject(false)}
        title="Reject Usage Report"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={submitReject}
              disabled={pending || rejectReason.trim().length < 5}
            >
              {pending ? "Rejecting..." : "Reject"}
            </Button>
          </>
        }
      >
        <FormField label="Alasan reject" required>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Minimal 5 karakter..."
          />
        </FormField>
      </Modal>
    </>
  );
}

function statusTone(
  s: string
): "green" | "blue" | "grey" | "red" | "orange" {
  if (s === "APPROVED" || s === "INVOICED") return "green";
  if (s === "SUBMITTED") return "blue";
  if (s === "REJECTED") return "red";
  if (s === "DRAFT") return "grey";
  return "orange";
}