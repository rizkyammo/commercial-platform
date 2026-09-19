import { describe, it, expect } from "vitest";
import {
  ERROR_CODES,
  getErrorMessage,
  generateRequestId,
} from "@/lib/errors/codes";

describe("Error Codes", () => {
  it("returns message for known code", () => {
    expect(getErrorMessage(ERROR_CODES.ORDER_NOT_FOUND)).toContain("Order");
  });

  it("returns fallback message for unknown code", () => {
    // @ts-expect-error — test fallback
    expect(getErrorMessage("UNKNOWN")).toContain("Terjadi kesalahan");
  });

  it("generates unique request IDs", () => {
    const ids = Array.from({ length: 100 }, () => generateRequestId());
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });

  it("request ID has correct format", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^REQ-[A-Z0-9]+-[A-Z0-9]+$/);
  });
});