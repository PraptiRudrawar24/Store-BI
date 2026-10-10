# Store BI

Store BI is a high-clarity business analytics and stock management web application tailored specifically for Indian retail merchants (kirana stores, medical shops, stationery stores, footwear merchants, and local retail traders).

Built strictly around utilitarian high-clarity minimalism, Inter typography, Indian number grouping (`formatINR()` / `en-IN`), 48×48px minimum touch targets, 8px border radiuses, zero decorative shadows, and zero gradients.

---

## Features

- **Zero-Start Real-Time Dashboard**:
  - Live top-line metrics: Gross Sales, Net Profit, and Order Count.
  - Safe percentage comparisons (`–` displayed when previous period is 0 to prevent divide-by-zero errors).
  - Out of stock & low-stock critical alerts with one-click reorder workflows.
  - Period toggles for Today, 7 days, and 30 days.

- **Multi-Modal Data Ingestion (`/upload`)**:
  - **Quick Manual Entry**: Fast single-item forms for products, checkout sales (Cash, UPI, Card), and operational expenses.
  - **Spreadsheet Bulk Import**: Downloadable CSV templates for catalog items and historical transaction ledgers.
  - **AI Bill & Invoice OCR**: Upload photos of printed distributor invoices or handwritten counter slips. Powered by Google Gemini Vision to extract item names, wholesale costs, selling prices, and quantities automatically.

- **Deep Retail Analytics Suite (`/analytics`)**:
  - **Sales Analytics**: Daily, weekly, and monthly revenue curves, busiest transaction hours, best & slowest sales days.
  - **Product Analytics**: Top margin drivers, slow-moving items, and category revenue distribution.
  - **Inventory Health**: Total wholesale stock valuation (at cost), inventory turnover ratios, out-of-stock lost revenue projections, and perishable expiry risk groups (Expired, 7-day critical, 30-day clearance, 90-day pipeline).
  - **Profitability Breakdown**: Waterfall breakdown from Gross Revenue → COGS → Gross Margin → Operating Expenses → Net Profit.

- **Retail Intelligence & Recommendations (`/insights`)**:
  - **Stock More**: Alerts on fast-selling, high-margin items nearing depletion.
  - **Bundle Deal**: Frequent market-basket combo recommendations.
  - **Discount to Clear**: Actionable 20%–30% markdown promotions on stock expiring within 30 days.
  - **Dead Stock Warning**: Identifies items with zero sales velocity to liberate working capital.

- **Super Admin Operations Portal (`/admin`)**:
  - Multi-store merchant directory with instant search, city, and status filtering.
  - One-click bulk actions: extend trials (+7 days), activate paid licenses, suspend non-compliant accounts.
  - Modular tier and bundle pricing editor with instant publishing.
  - Promo coupon management engine (fixed amount or percentage discounts).
  - Merchant audit logs and CSV export.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, React Router |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy, Pydantic, Uvicorn |
| **Database** | SQLite (`storebi.db`) with zero-start schema |
| **AI / Vision** | Google Gemini 2.5 Flash (`google-genai`) for multi-modal invoice & handwriting OCR |
| **Styling** | Custom Store BI design system adhering to `/design/DESIGN.md` |

---

## Architecture & Standing Rules

1. **Product Name**: Strictly **Store BI** (never "Vyapar" or "Dukan Book").
2. **Design Adherence**: Fully compliant with `/design/DESIGN.md`. All interactive buttons, inputs, selects, and controls maintain a minimum 48px height and 48×48px physical touch target. Zero decorative gradients, zero shadows, sentence case throughout.
3. **ZERO-START RULE**: Store BI ships with **NO** seed or demo data in production. Every metric, chart, and table starts at ₹0 or empty. Every screen provides an actionable empty state guiding the user to upload data.
4. **Responsive Layouts**: Designed mobile-first for 360px viewports and responsive across tablet (768px) and desktop (1280px sidebar layout).

---

## Environment Variables

Create a `.env` file in the `backend/` directory based on `backend/.env.example`:

```env
# Google Gemini API Key for bill/invoice OCR extraction
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Secret Key (Optional, auto-generated if omitted)
SECRET_KEY=your_custom_jwt_secret_key_here

# Default Platform Administrator Email
ADMIN_EMAIL=admin@storebi.com

# Backend Server Port (Default: 8000)
PORT=8000
```

---

## Setup & Running Locally

### Prerequisites
- Node.js (v18 or higher) & npm
- Python (v3.10 or higher)

### 1. Backend Server (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not already present)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the development server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/](http://localhost:8000/)

### 2. Frontend Development Server (React + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## How to Load Optional Demo Data Manually

Per standing rules, Store BI is 100% clean and empty on initial startup. To manually populate realistic sample Indian retail records (products, sales spanning 25 days, and expenses) for testing and demonstrations:

```bash
# Run from the project root directory:
python scripts/demo_data.py

# Or directly from backend:
cd backend
python seed_demo_data.py
```

> **Note**: Demo seed scripts are strictly manual and are never executed automatically by the application.

---

## Running Automated Tests

### 1. Backend API Tests
Run the comprehensive test suite covering empty database states, dashboard KPIs, alerts, analytics, recommendations, and admin portals:

```bash
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

### 2. Frontend Build Verification
Verify TypeScript compilation and Vite production bundle:

```bash
cd frontend
npm run build
```
