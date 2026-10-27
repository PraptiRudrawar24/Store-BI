/**
 * Store-BI Central Design Tokens (Light & Dark Theme)
 * 
 * Clean, minimal enterprise design system tokens adhering strictly to:
 * - Brand (#2563eb in light / #3b82f6 in dark)
 * - Surfaces (#f8fafc in light / #0f172a in dark)
 * - Typography (Inter, tabular numerals)
 * - Status colors (Healthy, Warning, Critical, Forecast)
 * - Elevation & Shadows (clean 1px borders, subtle soft shadows)
 */

export const tokens = {
  light: {
    colors: {
      brand: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        primaryActive: '#1e40af',
        primaryContainer: '#1d4ed8',
        primaryLight: '#eff6ff',
        primaryLightAlt: '#dbeafe',
        primaryForeground: '#ffffff',
        secondary: '#475569',
        secondaryHover: '#334155',
        tertiary: '#7c3aed',
        tertiaryContainer: '#6d28d9',
        tertiaryLight: '#faf5ff',
        focusRing: 'rgba(37, 99, 235, 0.2)',
      },
      surfaces: {
        pageBackground: '#f8fafc',
        surfaceLow: '#f1f5f9',
        card: '#ffffff',
        surfaceDefault: '#f8fafc',
        surfaceHigh: '#f1f5f9',
      },
      text: {
        primary: '#0f172a',
        muted: '#475569',
        outline: '#94a3b8',
      },
      borders: {
        divider: '#e2e8f0',
        card: '#e2e8f0',
        hover: '#cbd5e1',
        tableRow: '#f1f5f9',
        strong: '#cbd5e1',
      },
      status: {
        healthy: {
          text: '#065F46',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          solid: '#10B981',
        },
        warning: {
          text: '#92400E',
          bg: '#FFFBEB',
          border: '#FDE68A',
          solid: '#F59E0B',
        },
        critical: {
          text: '#991B1B',
          bg: '#FEF2F2',
          border: '#FECACA',
          solid: '#EF4444',
        },
        forecast: {
          text: '#4338CA',
          bg: '#EEF2FF',
          border: '#C7D2FE',
          solid: '#6366F1',
        },
      },
    },
    shadows: {
      card: '0 1px 2px rgba(15,23,42,0.04)',
      raised: '0 4px 6px -1px rgba(15,23,42,0.08)',
      modal: '0 20px 25px -5px rgba(15,23,42,0.12)',
      backdrop: 'rgba(15,23,42,0.45)',
    },
  },
  dark: {
    colors: {
      brand: {
        primary: '#3b82f6',
        primaryHover: '#60a5fa',
        primaryActive: '#2563eb',
        primaryContainer: '#1d4ed8',
        primaryLight: '#1e3a8a',
        primaryLightAlt: '#2563eb',
        primaryForeground: '#ffffff',
        secondary: '#94a3b8',
        secondaryHover: '#cbd5e1',
        tertiary: '#a78bfa',
        tertiaryContainer: '#6d28d9',
        tertiaryLight: '#2e1065',
        focusRing: 'rgba(59, 130, 246, 0.25)',
      },
      surfaces: {
        pageBackground: '#0f172a',
        surfaceLow: '#1e293b',
        card: '#1e293b',
        surfaceDefault: '#1e293b',
        surfaceHigh: '#334155',
      },
      text: {
        primary: '#f8fafc',
        muted: '#94a3b8',
        outline: '#64748b',
      },
      borders: {
        divider: '#334155',
        card: '#334155',
        hover: '#475569',
        tableRow: '#1e293b',
        strong: '#475569',
      },
      status: {
        healthy: {
          text: '#6ee7b7',
          bg: 'rgba(16,185,129,0.12)',
          border: 'rgba(16,185,129,0.30)',
          solid: '#10b981',
        },
        warning: {
          text: '#fcd34d',
          bg: 'rgba(245,158,11,0.12)',
          border: 'rgba(245,158,11,0.30)',
          solid: '#f59e0b',
        },
        critical: {
          text: '#fca5a5',
          bg: 'rgba(239,68,68,0.12)',
          border: 'rgba(239,68,68,0.30)',
          solid: '#ef4444',
        },
        forecast: {
          text: '#a5b4fc',
          bg: 'rgba(99,102,241,0.15)',
          border: 'rgba(99,102,241,0.35)',
          solid: '#6366f1',
        },
      },
    },
    shadows: {
      card: '0 1px 2px rgba(0,0,0,0.3)',
      raised: '0 4px 6px -1px rgba(0,0,0,0.4)',
      modal: '0 20px 25px -5px rgba(0,0,0,0.5)',
      backdrop: 'rgba(0,0,0,0.6)',
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    tabularFeatures: '"tnum" 1, "cv05" 1, "cv11" 1',
    metricNumber: {
      fontSize: '32px',
      fontWeight: '700',
      lineHeight: '1.2',
    },
    headingXl: {
      fontSize: '24px',
      fontWeight: '600',
      lineHeight: '1.3',
    },
    headingLg: {
      fontSize: '20px',
      fontWeight: '600',
      lineHeight: '1.3',
    },
    body: {
      fontSize: '14px',
      lineHeight: '1.5',
    },
    tableHeader: {
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
  },
  radii: {
    badge: '4px',
    button: '6px',
    input: '6px',
    card: '8px',
  },
} as const;

/**
 * Recharts series colors tailored for light and dark themes
 */
export const chartColors = {
  light: {
    primary: '#2563eb', // Royal Blue (Sales)
    secondary: '#10b981', // Emerald (Gross Profit)
    tertiary: '#7c3aed', // Purple (Net / Insight)
    success: '#10b981',
    warning: '#f59e0b',
    critical: '#f43f5e',
    grid: '#e2e8f0',
    axis: '#64748b',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipText: '#0f172a',
  },
  dark: {
    primary: '#3b82f6', // blue
    secondary: '#34d399', // emerald
    tertiary: '#a78bfa', // purple
    success: '#34d399',
    warning: '#fbbf24',
    critical: '#f87171',
    grid: '#334155',
    axis: '#94a3b8',
    tooltipBg: '#1e293b',
    tooltipBorder: '#334155',
    tooltipText: '#f8fafc',
  },
} as const;

export default tokens;
