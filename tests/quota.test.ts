import { describe, it, expect } from "vitest";

// Simulasi fungsi komputasi quota (mirror dari SQL)
function computeAvailable(
  allocation: number,
  committed: number,
  realized: number
): number {
  return Math.max(0, allocation - committed - realized);
}

function computeUtilization(
  allocation: number,
  committed: number,
  realized: number
): number {
  if (allocation <= 0) return 0;
  return ((committed + realized) / allocation) * 100;
}

describe("Quota Calculation", () => {
  it("computes available correctly", () => {
    expect(computeAvailable(10000, 2500, 6000)).toBe(1500);
  });

  it("returns 0 when over-committed", () => {
    expect(computeAvailable(1000, 500, 800)).toBe(0);
  });

  it("computes utilization percentage", () => {
    expect(computeUtilization(10000, 2500, 6000)).toBeCloseTo(85, 1);
  });

  it("returns 0 utilization when no allocation", () => {
    expect(computeUtilization(0, 0, 0)).toBe(0);
  });
});