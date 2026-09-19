import { describe, it, expect } from "vitest";

function computeMargin(selling: number, material: number, transport: number) {
  const cost = material + transport;
  const marginBefore = selling - cost;
  const marginPctBefore = selling > 0 ? (marginBefore / selling) * 100 : 0;
  return { marginBefore, marginPctBefore };
}

function computeTax(
  selling: number,
  cost: number,
  transport: number,
  ppnRate = 11,
  pphRate = 2
) {
  const ppnOutput = (selling * ppnRate) / 100;
  const ppnInput = (cost * ppnRate) / 100;
  const ppnPayable = ppnOutput - ppnInput;
  const pph23 = (transport * pphRate) / 100;
  return { ppnOutput, ppnInput, ppnPayable, pph23, totalTax: ppnPayable + pph23 };
}

describe("Margin Calculation", () => {
  it("computes margin before tax", () => {
    const { marginBefore, marginPctBefore } = computeMargin(
      100_000_000,
      60_000_000,
      5_000_000
    );
    expect(marginBefore).toBe(35_000_000);
    expect(marginPctBefore).toBeCloseTo(35, 1);
  });
});

describe("Tax Calculation (PPN + PPh 23)", () => {
  it("computes PPN payable = output − input", () => {
    const { ppnOutput, ppnInput, ppnPayable } = computeTax(
      100_000_000,
      65_000_000,
      5_000_000
    );
    expect(ppnOutput).toBe(11_000_000);
    expect(ppnInput).toBe(7_150_000);
    expect(ppnPayable).toBe(3_850_000);
  });

  it("computes PPh 23 = 2% × transport", () => {
    const { pph23 } = computeTax(100_000_000, 65_000_000, 5_000_000);
    expect(pph23).toBe(100_000);
  });

  it("computes total tax", () => {
    const { totalTax } = computeTax(100_000_000, 65_000_000, 5_000_000);
    expect(totalTax).toBe(3_950_000);
  });
});