import type { CartItem, CartTotals } from '../types/pos';

/**
 * Formats amount in paise into Indian Rupee format (e.g., 22500 -> "₹225.00").
 * Uses en-IN locale with exactly 2 decimal places.
 */
export function formatPaiseToRupee(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Calculates cart totals entirely in integer paise to eliminate floating-point inaccuracies.
 * - GST standard rate: 5% (CGST 2.5% + SGST 2.5%)
 * - Calculates round-off difference to nearest whole rupee.
 */
export function calculateCartTotals(items: CartItem[], discountPaise: number = 0): CartTotals {
  let subtotalPaise = 0;
  let totalQuantity = 0;

  for (const item of items) {
    subtotalPaise += item.product.pricePaise * item.quantity;
    totalQuantity += item.quantity;
  }

  const taxablePaise = Math.max(0, subtotalPaise - discountPaise);

  // 2.5% CGST and 2.5% SGST calculated with half-up rounding
  const cgstPaise = Math.round(taxablePaise * 0.025);
  const sgstPaise = Math.round(taxablePaise * 0.025);
  const gstPaise = cgstPaise + sgstPaise;

  const rawTotalPaise = taxablePaise + gstPaise;

  // Round-off to the nearest rupee (nearest 100 paise)
  const grandTotalPaise = Math.round(rawTotalPaise / 100) * 100;
  const roundOffPaise = grandTotalPaise - rawTotalPaise;

  return {
    itemCount: items.length,
    totalQuantity,
    subtotalPaise,
    discountPaise,
    taxablePaise,
    cgstPaise,
    sgstPaise,
    gstPaise,
    rawTotalPaise,
    roundOffPaise,
    grandTotalPaise,
  };
}
