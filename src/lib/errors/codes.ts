export const ERROR_CODES = {
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_ALREADY_ISSUED: "ORDER_ALREADY_ISSUED",
  ORDER_INVALID_STATE: "ORDER_INVALID_STATE",
  SK_NOT_FOUND: "SK_NOT_FOUND",
  SK_NOT_ACTIVE: "SK_NOT_ACTIVE",
  SK_EXPIRED: "SK_EXPIRED",
  MATERIAL_NOT_AUTHORIZED: "MATERIAL_NOT_AUTHORIZED",
  QUOTA_INSUFFICIENT: "QUOTA_INSUFFICIENT",
  QUOTA_CONFLICT: "QUOTA_CONFLICT",
  SHIPMENT_EXCEEDS_ORDER: "SHIPMENT_EXCEEDS_ORDER",
  BAST_INCOMPLETE: "BAST_INCOMPLETE",
  FILE_INVALID: "FILE_INVALID",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_UNAUTHORIZED: "Anda belum login.",
  AUTH_FORBIDDEN: "Anda tidak memiliki akses.",
  ORDER_NOT_FOUND: "Order tidak ditemukan.",
  ORDER_ALREADY_ISSUED: "Order sudah di-issue sebelumnya.",
  ORDER_INVALID_STATE: "Status order tidak mengizinkan aksi ini.",
  SK_NOT_FOUND: "SK Kemhan tidak ditemukan.",
  SK_NOT_ACTIVE: "SK Kemhan tidak aktif.",
  SK_EXPIRED: "SK Kemhan sudah expired.",
  MATERIAL_NOT_AUTHORIZED: "Material tidak tercakup dalam SK aktif.",
  QUOTA_INSUFFICIENT: "Quota tidak mencukupi.",
  QUOTA_CONFLICT: "Terjadi konflik quota. Coba lagi.",
  SHIPMENT_EXCEEDS_ORDER: "Qty shipment melebihi order.",
  BAST_INCOMPLETE: "BAST belum lengkap.",
  FILE_INVALID: "File tidak valid.",
  FILE_TOO_LARGE: "File terlalu besar.",
  PERMISSION_DENIED: "Anda tidak memiliki izin.",
  VALIDATION_ERROR: "Data tidak valid.",
  INTERNAL_ERROR: "Terjadi kesalahan internal.",
};

export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? "Terjadi kesalahan.";
}

export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `REQ-${ts}-${rand}`.toUpperCase();
}