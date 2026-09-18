export type Permission =
  | "ORDER_CREATE"
  | "ORDER_UPDATE_DRAFT"
  | "ORDER_SUBMIT"
  | "ORDER_REVIEW"
  | "ORDER_APPROVE"
  | "ORDER_AMEND_REQUEST"
  | "ORDER_AMEND_APPROVE"
  | "ORDER_CANCEL_REQUEST"
  | "ORDER_CANCEL_APPROVE"
  | "PROCUREMENT_CREATE"
  | "PROCUREMENT_VERIFY"
  | "SHIPMENT_CREATE"
  | "SHIPMENT_CONFIRM"
  | "BAST_CREATE"
  | "BAST_VERIFY"
  | "COST_CREATE"
  | "MARGIN_VIEW"
  | "SK_VIEW"
  | "SK_CREATE"
  | "SK_SUBMIT"
  | "SK_ACTIVATE"
  | "QUOTA_VIEW"
  | "QUOTA_ADJUST_REQUEST"
  | "QUOTA_ADJUST_APPROVE"
  | "SPATIAL_VIEW"
  | "SPATIAL_EDIT_PROSPECT"
  | "SPATIAL_SCENARIO"
  | "REPORT_VIEW"
  | "REPORT_EXPORT"
  | "USER_MANAGE"
  | "ROLE_MANAGE"
  | "AUDIT_VIEW"
  | "MASTER_DATA_MANAGE"
  | "ORGANISATION_MANAGE";

export type RoleName =
  | "commercial_staff"
  | "commercial_supervisor"
  | "commercial_manager"
  | "compliance_staff"
  | "compliance_approver"
  | "management_viewer"
  | "system_admin";

export function hasPermission(
  userPermissions: string[] | undefined,
  required: Permission
): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(required);
}