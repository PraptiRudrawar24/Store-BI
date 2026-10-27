---
name: Retail Intelligence Pulse
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#424754'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#727786'
  outline-variant: '#c2c6d7'
  surface-tint: '#0059c7'
  primary: '#0055c0'
  on-primary: '#ffffff'
  primary-container: '#136dec'
  on-primary-container: '#fbf9ff'
  inverse-primary: '#afc6ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#805000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a16600'
  on-tertiary-container: '#fff9f5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#afc6ff'
  on-primary-fixed: '#001944'
  on-primary-fixed-variant: '#004299'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  kpi-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-code:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

This design system embodies modern enterprise clarity, operational precision, and data empowerment for retail management and analytics platforms. Tailored for store operators, financial controllers, and commercial analysts, the visual mood projects authority, speed, and real-time confidence.

The aesthetic fuses **Corporate Modern** with **Technical Precision Minimalist**:
- High-clarity white card containers anchored over cool, atmospheric blue-tinted slate backdrops.
- Crisp structural separation using low-contrast cool-gray borders rather than noisy dropshadows.
- Purpose-driven functional color coding: vibrant electric blue orchestrates actions and focus, emerald green dictates positive velocity and profit, warm amber marks alerts and operating overhead, while rose red indicates operational drain or deficit.
- High-contrast typography prioritizing fast optical scanning of dense numeric figures, multi-currency values, and data-dense trend charts.

## Colors

The palette balances clean analytical surfaces with unmistakable semantic indicators for rapid decision-making:

- **Primary (`#136dec`)**: Vibrant electric cobalt blue for dominant calls to action, active navigation tabs, interactive chart nodes, and focal brand moments.
- **Secondary (`#10b981`)**: Resilient emerald green reserved strictly for positive metrics, profit gains, healthy stock levels, and completed order tags.
- **Tertiary (`#f59e0b`)**: Focused amber-orange utilized for expense tracking, low inventory thresholds, and warning alerts.
- **Critical / Negative (`#ef4444`)**: Rose red designated for losses, negative margin trends, stockouts, and cancellations.
- **Neutral Core (`#0f172a` to `#f8fafd`)**:
  - `#0f172a` (Slate 900): Primary titles, high-impact KPI metrics, and table heads.
  - `#475569` (Slate 600): Secondary labels, axis titles, and metadata.
  - `#e2e8f0` (Slate 200): Subdued structural borders and table row delimiters.
  - `#ffffff` (Pure White): Surface containers and modal dialogs.
  - `#f8fafd` (Cool Slate Tint): System canvas background ensuring high visual contrast with pure white cards.

## Typography

The typography couples the geometric modernism of **Plus Jakarta Sans** for headlines and high-value KPI metrics with the utilitarian legibility of **Inter** for dense transactional tables, data visualization scales, and micro-labels.

- **KPI Figures & Headings**: Rendered with strict tabular figure settings (`tnum`) and negative letter tracking to preserve compact alignment across varied currency and value denominations.
- **Labels & Micro-data**: Styled with semi-bold weights (`600`) to guarantee contrast against subtle neutral backgrounds and colored indicator badges.
- **Tables & Ledger Listings**: Utilize `body-sm` (13px) to maximize screen real-estate while maintaining line heights that prevent horizontal tracking confusion.

## Layout & Spacing

The architecture operates on an 8pt spatial baseline with a flexible, modular desktop grid:

- **Shell Structure**: A fixed-width left navigation rail (240px wide) pairs with a continuous fluid analytics canvas that scales to full viewport width with a max-constraint of 1600px for ultrawide displays.
- **Dashboard Grid**: A standard 12-column layout. Metric KPI cards span 3 columns on desktop (4 cards per row), 6 columns on tablet, and 12 columns on mobile. Analytical charts span either 6 columns (dual comparison) or 12 columns (full historical timeline).
- **Breakpoint Rules**:
  - *Mobile (< 768px)*: Canvas margins compress to `margin` (1rem); sidebar folds into a drawer; multi-column KPI grids stack into 1 or 2 columns; data tables gain horizontal scrolling with sticky primary columns.
  - *Tablet (768px - 1024px)*: Margins expand to `margin-md` (1.5rem); KPI blocks wrap in a 2x4 grid; charts collapse to full-width individual cards.
  - *Desktop (> 1024px)*: Margins set to `margin-lg` (2rem) with `gutter-lg` (1.5rem) separating analytical containers.

## Elevation & Depth

Visual hierarchy uses crisp boundaries and subtle ambient light rather than pronounced drop shadows:

- **Base Layer**: The page canvas is rendered in `#f8fafd`, providing a cool, glare-free backdrop.
- **Card Containers**: Set to pure `#ffffff` with a fine 1px border (`#e2e8f0`) and an ambient, ultra-soft blue-gray shadow: `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
- **Raised Elements & Flyouts**: Dropdowns, date-range selectors, and filter modals utilize a higher ambient separation: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` with border `#cbd5e1`.
- **Active Navigation & Segment States**: Flat, clean solid blocks (`#136dec`) without drop shadows, using crisp foreground white text to establish unambiguous focal points.

## Shapes

The design system applies a balanced **Rounded** (`level 2`) shape language:

- **Standard Containers & Cards**: Defined at `rounded-lg` (0.75rem / 12px) to soften analytical density without appearing playful or juvenile.
- **Interactive Buttons & Input Fields**: Follow `0.5rem` (8px) for precise, industrial ergonomics.
- **Indicator Chips & Badges**: Utilize `rounded-full` (9999px) pills for quick categorization, status tags, and trend percentages.
- **Icon Vessels**: Metric card icon containers use `0.5rem` (8px) softened squares tinted at 10% opacity matching their parent semantic hue.

## Components

### Buttons
- **Primary**: Solid electric blue (`#136dec`) background with white label, 8px corner radius, height 38px, horizontal padding `space-lg`. Hover: `#0f5bd1`.
- **Secondary / Action**: Light slate container (`#f1f5f9`) with slate-700 label (`#334155`) and light border (`#e2e8f0`).
- **Quick Action Pills (POS / Quick Sale)**: Elevated with primary blue or subtle outline, featuring a leading 16px icon.

### KPI Metric Cards
- White `#ffffff` surface, 1px border `#e2e8f0`, 16px interior padding.
- Top row aligns an icon badge (32x32px, rounded-md, semantic tint), label (`label-md`, `#64748b`), and optional tooltip icon.
- Value displayed in `kpi-display` (`#0f172a`), followed by inline delta indicators (`secondary` green `#10b981` or `critical` red `#ef4444`) with small directional arrows and comparison timeframes in `body-code`.

### Data Tables & Ledgers
- **Header**: Flat `#f8fafd` row, uppercase `label-sm` text (`#64748b`), 12px vertical padding, subtle bottom border `#e2e8f0`.
- **Rows**: Pure white background alternating with hover tint (`#f8fafc`). 12px vertical padding, cell content aligned to `body-sm`.
- **Status Tags**: Rounded pill chips with 4px vertical / 8px horizontal padding, using muted background fills (e.g., `#ecfdf5` for completed) and bold dark semantic text (`#059669`).

### Segmented Filters & Date Controls
- Enclosed segmented button group inside an `#f1f5f9` track with 6px inner padding.
- Active item uses solid `#136dec` with white text and clean transition; inactive items retain `#64748b` typography with transparent backgrounds.

### Form Inputs & Search Fields
- 38px height with `#ffffff` background, enclosed by `#e2e8f0` border, `rounded-md` (8px).
- Placeholder text in `#94a3b8`. Focus state shifts border to `#136dec` with a soft 3px blue glow ring (`rgba(19, 109, 236, 0.15)`).