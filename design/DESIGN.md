---
name: Vyapar Core
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#434655'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#824500'
  on-tertiary: '#ffffff'
  tertiary-container: '#a65900'
  on-tertiary-container: '#ffede1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  currency-display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  currency-compact:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system targets Indian micro, small, and medium retail and wholesale enterprise operators (Kirana stores, hardware merchants, traders). The target device context is entry-to-mid-tier Android smartphones operating at 360×800dp viewport under high ambient sunlight, dust, and continuous fast-paced daily transactions.

The visual style is **Utilitarian High-Clarity Minimalism**:
- Honest, grounded, tool-like aesthetic devoid of decorative fluff, artificial AI-generated styling, or complex spatial depth.
- Strictly light-mode surfaces to maximize readability and reduce perceived friction for non-tech-native operators.
- Functional visual hierarchy prioritizing immediate legibility: prices, stock units, and customer balances visible at an arm’s length.
- Sentence case capitalization across all headers, prompts, table columns, and action triggers to promote an approachable, matter-of-fact tone.
- Rigorous respect for regional financial conventions, specifically the Indian numbering system (`₹1,23,456.00`).

## Colors

The palette is strictly restricted to purpose-driven swatches. Gradients, colored blurs, and decorative glows are prohibited.

### Palette Architecture
- **Canvas / Page Background:** `#F7F8FA` provides low-glare separation behind pure white content cards.
- **Surface (Cards, Sheets, Bars):** `#FFFFFF`
- **Border / Divider:** 1px `#E5E7EB` throughout the interface.
- **Primary Accent:** `#2563EB` (Royal Blue) reserved strictly for interactive focal points, primary action triggers, active tabs, and linked entity text.
- **Text & Content Contrast:**
  - High Emphasis (Titles, key figures, table headers): `#111827`
  - Medium Emphasis (Labels, metadata, placeholders): `#4B5563`
  - Low Emphasis (Helper text, disabled state): `#9CA3AF`

### Semantic Status Palette
Colors outside the neutral scale and primary blue are reserved exclusively for business status indicators:
- **Credit / Received / In-Stock (Positive):** `#16A34A` (Green) with light fill `#F0FDF4`.
- **Pending / Due / Low-Stock (Caution):** `#D97706` (Amber) with light fill `#FFFBEB`.
- **Debit / Overdue / Out-of-Stock (Critical):** `#DC2626` (Red) with light fill `#FEF2F2`.

Never tint primary interactive buttons with status green or amber; keep operations blue and state feedback strictly segregated.

## Typography

The type system is powered entirely by **Inter**, configured for immediate data scanning on compact viewports:
- **Case Rule:** Use sentence case globally. Avoid all-caps even for buttons, tabs, and table headers (e.g., "Add new item", not "ADD NEW ITEM").
- **Currency & Numbers:** Currency displays must use the standard Indian Rupee symbol (`₹`) followed by numbers grouped according to the Indian system: lakhs and crores (e.g., `₹12,450`, `₹1,23,456`, `₹12,50,000`). Currency amounts always set in tabular figures (`font-variant-numeric: tabular-nums`) to maintain vertical alignment in ledgers and bills.
- **Hierarchy Guardrails:** Body copy defaults to 14px for general descriptions and data points; 12px is restricted to secondary timestamps and auxiliary notes.

## Layout & Spacing

The layout is built for a 360×800 base viewport utilizing a rigid 8px baseline rhythm:
- **Canvas Bounds:** Fixed outer padding of 16px (`1rem`) on left and right edges.
- **Card Padding:** Internal card padding is consistently 16px (`1rem`). Dense list rows within cards utilize 12px vertical and 16px horizontal spacing.
- **Vertical Spacing:** Gaps between cards and sections are 12px or 16px to prevent sparse vertical scroll distances on short mobile screens.
- **Interactive Bounds:** Every touch point (buttons, inputs, row actions, icons) enforces a strict minimum 48×48px physical hit box, even when the visible label or icon occupies smaller dimensions.

## Elevation & Depth

This system avoids decorative drop shadows, blurred silhouettes, and heavy simulated lighting.

- **Flat Outlined Structure:** Depth is rendered purely through surface contrast and structural boundaries. White cards (`#FFFFFF`) sit on top of the canvas (`#F7F8FA`) separated by a crisp 1px solid border in `#E5E7EB`.
- **Zero-Shadow Default:** Modals, dialogs, bottom sheets, and cards maintain `box-shadow: none` in standard display states.
- **Overlays & Floating Sheets:** Bottom action drawers and modal dialogs rely on a solid 40% neutral backdrop tint (`rgba(17, 24, 39, 0.4)`), anchored with a 1px border at `#E5E7EB` against white surfaces to ensure separation.
- **Interactive Feedback:** Pressed states are indicated using flat surface fills (`#F3F4F6` for neutrals, `#1D4ED8` for active primary buttons), never via elevation jumps or inset drop shadows.

## Shapes

All containers, cards, inputs, and standard buttons adhere strictly to an **8px radius (`roundedness: 2`)**:
- **Cards, Modals, Inputs, Buttons:** `8px` (`0.5rem`).
- **Badges and Status Chips:** `4px` (`0.25rem`) for compact tags, or fully pill-rounded for count pills.
- **Outline Icons:** 2px uniform stroke width, 24×24px bounding box, open outlines without solid heavy fills or gradients.

## Components

### Buttons
- **Height & Touch Target:** Primary and secondary buttons maintain a fixed height of 48px with centered text and icons.
- **Primary Action:** Solid `#2563EB` background, `#FFFFFF` text, `font-weight: 600`, 8px corner radius. No shadow.
- **Secondary Action:** `#FFFFFF` background, 1px solid `#E5E7EB` border, `#111827` text.
- **Destructive Action:** Solid `#DC2626` background, `#FFFFFF` text, or secondary style with `#DC2626` text and border.

### Form Inputs & Selectors
- **Container:** Height 48px, background `#FFFFFF`, 1px solid `#E5E7EB` border, 8px radius.
- **Typography:** 14px or 16px text size to prevent automated iOS/Android zoom on focus.
- **Focus State:** 1px solid `#2563EB` border with a 1px uniform blue outer ring.
- **Numeric & Monetary Fields:** Prefixed with a static non-editable `₹` label in `#4B5563`. Keypads default to `inputmode="decimal"`.

### Cards & Ledger Blocks
- **Construction:** `#FFFFFF` background, 1px solid `#E5E7EB` border, 8px radius.
- **Internal Rhythm:** Clear separation between card header, content body, and bottom summary via 1px `#E5E7EB` dividers.
- **List Dividers:** Inner list rows use 1px horizontal borders (`#F3F4F6`), omitting the border on the terminal item.

### Status Chips & Badges
- **Dimensions:** Minimum height 24px, 4px corner radius, internal padding of 2px 8px.
- **Status Green (Received / Paid):** `#F0FDF4` background, `#16A34A` text, 1px solid `#BBF7D0`.
- **Status Amber (Pending / Low Stock):** `#FFFBEB` background, `#D97706` text, 1px solid `#FDE68A`.
- **Status Red (Overdue / Unpaid):** `#FEF2F2` background, `#DC2626` text, 1px solid `#FECACA`.

### Icons & Imagery
- Pure outline icons (Lucide or Heroicons style) with a consistent 2px stroke, colored `#4B5563` for non-active states, `#2563EB` for active navigation, and `#DC2626`/`#16A34A` for directional balance indicators (money in / money out).