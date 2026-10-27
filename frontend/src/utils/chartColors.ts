/**
 * Unified Analytics Chart Color Tokens & Palettes
 *
 * Standardized across all business analytics, reports, and dashboards:
 * - Sales: `#2563EB` (Royal Blue)
 * - Profit: `#10B981` (Emerald)
 * - Costs: `#F43F5E` (Rose)
 * - Expenses: `#F59E0B` (Amber)
 * - Inventory: `#0284C7` (Sky / Cyan)
 * - Secondary / Predictions / Targets: `#7C3AED` (Purple)
 */

export const CHART_COLORS = {
  sales: '#2563EB',       // Royal Blue
  salesLight: 'rgba(37, 99, 235, 0.15)',
  salesHover: '#1D4ED8',

  profit: '#10B981',      // Emerald
  profitLight: 'rgba(16, 185, 129, 0.15)',
  profitHover: '#059669',

  costs: '#F43F5E',       // Rose (COGS)
  costsLight: 'rgba(244, 63, 94, 0.15)',
  costsHover: '#E11D48',

  inventory: '#0284C7',   // Sky / Cyan
  inventoryLight: 'rgba(2, 132, 199, 0.15)',
  inventoryHover: '#0369A1',

  expenses: '#F59E0B',    // Amber
  expensesLight: 'rgba(245, 158, 11, 0.15)',
  expensesHover: '#D97706',

  secondary: '#7C3AED',   // Purple (Forecast/Predictions)
  secondaryLight: 'rgba(124, 58, 237, 0.15)',
  secondaryHover: '#6D28D9',

  // Grid, axis & chrome
  grid: 'rgba(148, 163, 184, 0.25)',
  axisText: '#64748B',
  tooltipBg: '#0F172A',
  tooltipBorder: '#334155',
} as const;

export const CATEGORY_PALETTE = [
  '#2563EB', // Royal Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#0284C7', // Sky
  '#7C3AED', // Purple
  '#F43F5E', // Rose
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#EAB308', // Gold
];

export function getCategoryColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}
