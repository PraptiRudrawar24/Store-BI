/**
 * Unified Analytics Chart Color Tokens & Palettes
 *
 * Standardized across all business analytics, reports, and dashboards:
 * - Sales: `#6366F1` (Indigo)
 * - Profit: `#10B981` (Emerald)
 * - Costs: `#F59E0B` (Amber)
 * - Inventory: `#06B6D4` (Cyan)
 * - Expenses: `#F43F5E` (Rose)
 * - Secondary / Predictions / Targets: `#8B5CF6` (Violet)
 */

export const CHART_COLORS = {
  sales: '#6366F1',       // Indigo
  salesLight: 'rgba(99, 102, 241, 0.15)',
  salesHover: '#4F46E5',

  profit: '#10B981',      // Emerald
  profitLight: 'rgba(16, 185, 129, 0.15)',
  profitHover: '#059669',

  costs: '#F59E0B',       // Amber
  costsLight: 'rgba(245, 158, 11, 0.15)',
  costsHover: '#D97706',

  inventory: '#06B6D4',   // Cyan
  inventoryLight: 'rgba(6, 182, 212, 0.15)',
  inventoryHover: '#0891B2',

  expenses: '#F43F5E',    // Rose
  expensesLight: 'rgba(244, 63, 94, 0.15)',
  expensesHover: '#E11D48',

  secondary: '#8B5CF6',   // Violet (Forecast/Predictions)
  secondaryLight: 'rgba(139, 92, 246, 0.15)',
  secondaryHover: '#7C3AED',

  // Grid, axis & chrome
  grid: 'rgba(148, 163, 184, 0.25)',
  axisText: '#64748B',
  tooltipBg: '#0F172A',
  tooltipBorder: '#334155',
} as const;

export const CATEGORY_PALETTE = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#F43F5E', // Rose
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#EAB308', // Gold
];

export function getCategoryColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}
