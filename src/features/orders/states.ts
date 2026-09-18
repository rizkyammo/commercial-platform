export const ORDER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "RETURNED",
  "APPROVED",
  "ISSUED",
  "IN_PROGRESS",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "CANCELLED",
  "CLOSED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STAGES = [
  "PO",
  "COMPLIANCE",
  "PROCUREMENT",
  "SHIPMENT",
  "DELIVERY",
  "BAST",
  "COMPLETE",
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

export const STAGE_STATUSES = [
  "NOT_STARTED",
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "COMPLETED",
] as const;

export type StageStatus = (typeof STAGE_STATUSES)[number];

export function orderStatusTone(s: string): "neutral" | "blue" | "green" | "yellow" | "orange" | "red" | "grey" {
  switch (s) {
    case "DRAFT":
      return "grey";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "blue";
    case "RETURNED":
      return "orange";
    case "APPROVED":
    case "ISSUED":
    case "IN_PROGRESS":
    case "PARTIALLY_FULFILLED":
      return "blue";
    case "FULFILLED":
    case "CLOSED":
      return "green";
    case "CANCELLED":
      return "red";
    default:
      return "neutral";
  }
}

export function orderStatusLabel(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function stageLabel(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function canEditOrder(status: string): boolean {
  return status === "DRAFT" || status === "RETURNED";
}

export function canSubmitOrder(status: string): boolean {
  return status === "DRAFT" || status === "RETURNED";
}

export function canReviewOrder(status: string): boolean {
  return status === "SUBMITTED" || status === "UNDER_REVIEW";
}

export function canApproveOrder(status: string): boolean {
  return status === "UNDER_REVIEW";
}

export function canAmendOrder(status: string): boolean {
  return ["APPROVED", "ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(status);
}

export function canCancelOrder(status: string): boolean {
  return !["CANCELLED", "CLOSED"].includes(status);
}

export function getOrderDisplayStatus(order: {
  status: string;
  amendment_count?: number;
  last_amendment_from_status?: string | null;
}): { label: string; tone: ReturnType<typeof orderStatusTone> } {
  // Kalau status DRAFT tapi ada jejak amendment
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