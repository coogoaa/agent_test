
// Calculates the Net Present Value (NPV) for a series of cash flows at a given discount rate.
const calculateNPV = (rate: number, cashFlows: number[]): number => {
  return cashFlows.reduce((acc, cashFlow, i) => acc + cashFlow / Math.pow(1 + rate, i), 0);
};

// Calculates the Internal Rate of Return (IRR) using the bisection method.
export const calculateIRR = (cashFlows: number[], maxIterations = 100, tolerance = 1e-6): number | null => {
  if (cashFlows.length === 0 || cashFlows[0] >= 0) {
    return null;
  }

  let low = 0.0;
  let high = 1.0;
  let mid = 0.0;

  for (let i = 0; i < maxIterations; i++) {
    mid = (low + high) / 2;
    const npv = calculateNPV(mid, cashFlows);

    if (Math.abs(npv) < tolerance) {
      return mid;
    } else if (calculateNPV(low, cashFlows) * npv < 0) {
        high = mid;
    } else {
        low = mid;
    }
  }

  return null; // Failed to converge
};
