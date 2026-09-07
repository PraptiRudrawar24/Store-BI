# Lumina Store BI — Supermarket Business Analytics Dashboard

A modern, high-density Business Intelligence web application built for supermarket operations, retail analytics, and store management, powered by **Google Stitch** design systems.

---

## 🚀 Key Features

1. **Integrated Stitch API & Credentials**
   - Configured with Stitch API Key (`AQ.Ab8RN6Iu9gGrHEl5CTu4iMkkMpB7BZkZzbhp5iSNiOkCW959-w`)
   - Linked to Stitch Project: **Supermarket Business Analytics Dashboard** (`8659035975873551379`)
   - Standard MCP config file: `.agents/mcp_config.json` & `.env`

2. **4-in-1 Dynamic Stitch Theme Switcher**
   - **Professional**: Crisp corporate minimalist aesthetic with tonal surface layering and high-contrast tables.
   - **Glassmorphism**: Translucent frosted panels, luminous cyan & emerald dark-mode accents, and subtle ambient glows.
   - **Claymorphism**: Soft 3D neumorphic tactile surfaces with dual ambient shadows and friendly rounded radii.
   - **Berry Glass**: Rich royal plum/amethyst palette with high-contrast glassy overlays.

3. **Core Functional Modules**
   - **Dashboard Overview**: Real-time sales ticker, gross profit, foot traffic, average basket value, and department shares.
   - **Sales & Revenue Analytics**: Hourly sales distribution, tender types breakdown (Cards, Contactless, Cash), department margin ledger.
   - **Inventory & Supply Replenishment**: Real-time stock levels, automated stockout forecast, days-until-stockout, 1-click supplier reordering (+150 units).
   - **Product Portfolio Matrix**: BCG Matrix (Stars, Cash Cows, Question Marks, Review Items) with interactive scatter plot and perishable expiration tracking.
   - **Customer Demographics & Basket Affinity**: Buyer personas, Lumina Rewards membership tiers, and market basket affinity rules (co-purchased items with lift multipliers).
   - **Store Operations & IoT Monitoring**: Live POS checkout lane assignment, queue wait times, and continuous 24/7 cold-chain refrigeration sensor telemetry.
   - **Marketing Performance & ROI**: Campaign budget tracking, revenue multipliers, and coupon redemption velocities.
   - **AI Demand Forecasting**: 15-day revenue prediction with 95% confidence intervals, weather-driven surge alerts, and anomaly radar.
   - **Stitch Studio & Screen Gallery**: Full gallery of all 28 Stitch screen designs with screenshots and screen specs.

4. **Data Exports**
   - Instant CSV export for inventory & stockouts.
   - Full JSON BI dump with all metrics and timestamps.
   - Clean printable Executive PDF format.

---

## 🛠️ Quick Start

### 1. Development Server
```bash
npm run dev
```

### 2. Production Build & Preview
```bash
# Compile and build
npm run build

# Preview production build
npm run preview
```
Visit **`http://localhost:5173`** in your browser.

---

## 📁 Project Architecture

```
Store BI/
├── .agents/
│   └── mcp_config.json          # Stitch MCP configuration
├── .env                         # Stitch API Key & Project ID
├── dist/                        # Production build output
├── public/                      # Static assets & icons
├── src/
│   ├── components/
│   │   ├── common/              # MetricCard, ExportModal, AlertsDrawer
│   │   ├── dashboard/           # Overview, Sales, Inventory, Products, etc.
│   │   └── layout/              # Header, Sidebar with Stitch indicators
│   ├── context/
│   │   ├── ThemeContext.tsx     # 4-in-1 Stitch theme switcher
│   │   └── StoreDataContext.tsx # Store state & simulated transactions
│   ├── data/
│   │   └── mockStoreData.ts     # Supermarket BI datasets & Stitch screens
│   ├── types/
│   │   └── store.ts             # TypeScript interfaces
│   ├── App.tsx                  # Root layout & view router
│   ├── index.css                # Stitch design system CSS variables
│   └── main.tsx                 # React DOM entry point
├── index.html                   # HTML entry point with Stitch fonts
├── package.json
├── tailwind.config.js           # Tailwind theme tokens
├── tsconfig.json
└── vite.config.ts
```
