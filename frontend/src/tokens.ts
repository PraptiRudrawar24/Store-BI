/**
 * Store-BI Central Design Tokens (Light & Dark Theme)
 * 
 * Clean, minimal enterprise design system tokens adhering strictly to:
 * - Brand (#005c55 in light / #80d5cb in dark)
 * - Surfaces (#f8f9ff in light / #0b1220 in dark)
 * - Typography (Inter, tabular numerals)
 * - Status colors (Healthy, Warning, Critical, Forecast)
 * - Elevation & Shadows (no gradients, glows, or glassmorphism)
 */

export const tokens = {
  light: {
    colors: {
      brand: {
        primary: '#005c55',
        primaryHover: '#004843',
        primaryActive: '#003631',
        primaryContainer: '#0f766e',
        primaryLight: '#9cf2e8',
        primaryLightAlt: '#80d5cb',
        primaryForeground: '#ffffff',
        secondary: '#565e74',
        secondaryHover: '#454c60',
        tertiary: '#3b3bc9',
        tertiaryContainer: '#5457e2',
        tertiaryLight: '#e1e0ff',
        focusRing: 'rgba(0, 92, 85, 0.15)',
      },
      surfaces: {
        pageBackground: '#f8f9ff',
        surfaceLow: '#eff4ff',
        card: '#ffffff',
        surfaceDefault: '#e5eeff',
        surfaceHigh: '#dce9ff',
      },
      text: {
        primary: '#0b1c30',
        muted: '#3e4947',
        outline: '#6e7977',
      },
      borders: {
        divider: '#bdc9c6',
        card: '#E2E8F0',
        hover: '#CBD5E1',
        tableRow: '#F1F5F9',
        strong: '#CBD5E1',
      },
      status: {
        healthy: {
          text: '#065F46',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          solid: '#059669',
        },
        warning: {
          text: '#92400E',
          bg: '#FFFBEB',
          border: '#FDE68A',
          solid: '#D97706',
        },
        critical: {
          text: '#991B1B',
          bg: '#FEF2F2',
          border: '#FECACA',
          solid: '#DC2626',
        },
        forecast: {
          text: '#4338CA',
          bg: '#EEF2FF',
          border: '#C7D2FE',
          solid: '#6366f1',
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
        primary: '#80d5cb',
        primaryHover: '#9cf2e8',
        primaryActive: '#5fc0b5',
        primaryContainer: '#0f766e',
        primaryLight: '#9cf2e8',
        primaryLightAlt: '#80d5cb',
        primaryForeground: '#00201d', // Text on primary buttons: #00201d
        secondary: '#bec6e0',
        secondaryHover: '#d2d9ee',
        tertiary: '#c0c1ff',
        tertiaryContainer: '#3b3bc9',
        tertiaryLight: '#e1e0ff',
        focusRing: 'rgba(128, 213, 203, 0.25)',
      },
      surfaces: {
        pageBackground: '#0b1220',
        surfaceLow: '#101a2e',
        card: '#131f33',
        surfaceDefault: '#101a2e',
        surfaceHigh: '#1c2b42',
      },
      text: {
        primary: '#e6edf7',
        muted: '#9aa8bd',
        outline: '#64748b',
      },
      borders: {
        divider: '#263650',
        card: '#263650',
        hover: '#334155',
        tableRow: '#1c2b42',
        strong: '#334155',
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
    primary: '#005c55',
    secondary: '#565e74',
    tertiary: '#3b3bc9',
    success: '#059669',
    warning: '#d97706',
    critical: '#dc2626',
    grid: '#e2e8f0',
    axis: '#3e4947',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipText: '#0b1c30',
  },
  dark: {
    primary: '#80d5cb', // teal
    secondary: '#bec6e0',
    tertiary: '#a5b4fc', // indigo
    success: '#6ee7b7',
    warning: '#fcd34d', // amber
    critical: '#fca5a5', // rose
    grid: '#263650',
    axis: '#9aa8bd',
    tooltipBg: '#131f33',
    tooltipBorder: '#263650',
    tooltipText: '#e6edf7',
  },
} as const;

export default tokens;
