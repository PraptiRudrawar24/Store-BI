/**
 * Indian Rupee currency formatter with standard Indian grouping (lakhs, crores).
 * Always uses the ₹ symbol and supports options for decimals.
 */
export const formatINR = (
  amount: number | null | undefined,
  includeDecimals: boolean = false
): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
};

/**
 * Calculate percent change safely.
 * ZERO-START RULE: Percent-change values show "–" when the previous period is 0 (no divide-by-zero).
 */
export const formatPercentChange = (
  current: number,
  previous: number
): { text: string; isPositive: boolean; isNeutral: boolean } => {
  if (!previous || previous === 0) {
    return { text: "–", isPositive: false, isNeutral: true };
  }

  const change = ((current - previous) / previous) * 100;
  const formatted = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  return {
    text: formatted,
    isPositive: change > 0,
    isNeutral: change === 0,
  };
};
