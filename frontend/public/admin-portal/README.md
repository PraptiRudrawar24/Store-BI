# Store BI — Operations Admin Web Panel

The **Admin Web Panel** is the centralized, multi-tenant platform operations interface for **Store BI**, a retail business management SaaS tailored specifically for small Indian retail merchants (kirana stores, medical pharmacies, stationery and xerox shops, footwear dealers, sweets & farsan marts, and local traders).

---

## Architecture & Design Adherence

- **Design System Compliance**: Adheres strictly to the Store BI `/design/DESIGN.md` guidelines:
  - **Typography**: Inter (with `monospace` for shop IDs, phone numbers, and emails).
  - **Primary Palette**: Deep green (`#0B5D4B`), mint (`#10B981` / `#E6F4EA`), amber warning (`#D97706` / `#FEF3C7`), and failure red (`#DC2626` / `#FEE2E2`).
  - **Card Surfaces**: 1px borders (`#E2E8F0`), 8–12px border radiuses, zero decorative shadows.
  - **Indian Currency & Number System**: Formatted strictly in INR (`₹1,25,000`, `₹14,86,500`) using Indian lakhs and crores notation.
  - **Dark & Light Mode**: Seamless real-time theme toggle via CSS variables.
  - **Zero Third-Party Dependency**: Pure vanilla HTML5, CSS3, and JavaScript with lightweight SVG chart rendering.

---

## 12 Core Operations Modules

| # | Module | Core Functionality |
|---|---|---|
| **1** | **Dashboard** | Platform-level KPIs (Total Shops, MRR, ARR, Churn, Conversion Rate), interactive signups trend, MRR curve, city and category distribution, alert strip for failed payments & trial expirations. |
| **2** | **Tenant Shops** | Complete tenant directory with sorting, multi-attribute filtering (Status, City, Category), search, pagination, bulk trial extensions (+7 days), bulk suspension, and a deep-dive slide-over drawer with full usage history, hardware setup, internal notes, and 1-click merchant impersonation (*View-As*). |
| **3** | **Subscriptions & Revenue** | Plan pricing tier editor (Starter Kirana ₹499, Pro Retailer ₹999, Super Kirana ₹1,999), failed AutoPay payment recovery queue with 1-click retry and WhatsApp UPI links, transaction billing ledger, and GST tax invoice generation. |
| **4** | **POS & Billing Monitoring** | Cross-store live GMV telemetry, retail sales velocity, stuck-onboarding detector (stores registered > 3 days with zero sales recorded), and billing anomaly flags (extreme amounts > ₹50,000, duplicate bill numbers, negative stock). |
| **5** | **Data Upload & AI OCR** | Google Gemini 2.5 Flash invoice extraction telemetry, OCR accuracy audit (94.2%), avg processing latency (1.4s), review queue with raw bill inspection, and failed upload reprocessor. |
| **6** | **Product Analytics & Funnel** | Feature adoption breakdown (POS 88%, Inventory 76%, OCR 64%, Expiry Alerts 52%), multi-step onboarding conversion funnel (Landing → Signup → First Sale → Subscribed), hardware & device distribution. |
| **7** | **AI Insights & Token Cost** | LLM token usage tracking per tenant, API cost attribution, recommendation feedback score (96.8% 👍), and quota caps. |
| **8** | **Support & Feedback** | Support tickets inbox with priority flags, SLA tracking, internal notes, canned replies for thermal printer & barcode scanner configuration, and WhatsApp reply dispatcher. |
| **9** | **Broadcasts** | Multi-channel announcement composer (In-app popup, WhatsApp Business API, SMS) with demographic and behavioral segment targeting. |
| **10** | **Config & Starter Catalogs** | Master retail catalog templates (Kirana 420 SKUs, Medical with batch/expiry 650 SKUs, Footwear with sizes 180 SKUs), GST tax slab defaults (0%, 5%, 12%, 18%). |
| **11** | **System Health & Logs** | Real-time API latency ping, uptime monitor (99.98%), error log viewer, 1-click automated manual S3 database backup, and immutable audit trail. |
| **12** | **Admin Users & DPDP Act** | Role-based access control (Super Admin, Support Agent, Finance, Read-only Analyst) with live role switcher, two-factor authentication management, and India DPDP Act compliance controls (merchant data portability and erasure). |

---

## Data Model Specification

### 1. `Shop` (Tenant)
```typescript
interface Shop {
  id: string;                      // Primary identifier (e.g. "SHP-1001")
  name: string;                    // Store trading name (e.g. "Prapti Kirana & Superstore")
  owner_name: string;              // Primary merchant name
  phone: string;                   // E.164 Indian mobile (e.g. "+91 98765 43210")
  email: string;                   // Registered business email
  category: string;                // "Kirana / Grocery" | "Medical & Pharma" | "Footwear & Leather" | ...
  city: string;                    // Commercial city (e.g. "Pune", "Indore", "Nagpur")
  state: string;                   // "Maharashtra", "Madhya Pradesh", "Gujarat"
  pincode: string;                 // 6-digit postal code
  gstin?: string;                  // 15-character GSTIN or null for composite/unregistered
  plan_id: string;                 // FK to SubscriptionPlan ("plan-starter", "plan-pro", "plan-super")
  status: "trial" | "active" | "expired" | "suspended";
  trial_start_date: string;        // ISO-8601
  trial_end_date: string;          // ISO-8601
  trial_days_left: number;
  onboarding_completed: boolean;
  onboarding_step: number;         // 1 to 4
  hardware_config?: string;        // Connected peripherals (Thermal printer, scanner, weighing scale)
  created_at: string;              // ISO-8601
  last_active_at: string;          // ISO-8601
}
```

### 2. `SubscriptionPlan`
```typescript
interface SubscriptionPlan {
  id: string;                      // "plan-starter", "plan-pro", "plan-super"
  name: string;                    // Display tier name
  price_monthly_paise: number;     // Integer paise (e.g. 49900 = ₹499.00)
  price_annual_paise: number;      // Integer paise (e.g. 499000 = ₹4,990.00)
  trial_days: number;              // Standard trial duration (5, 7, 10 days)
  limits: {
    max_counters: number;          // Concurrent terminals (1, 2, 5)
    max_inventory_items: number;   // Item threshold (500, 2500, unlimited)
    monthly_ocr_scans: number;     // AI bill scan quota
    multi_user: boolean;           // Staff roles enabled
  };
  features: string[];              // Feature slugs
  is_active: boolean;
}
```

### 3. `Payment` (Transaction Ledger)
```typescript
interface Payment {
  id: string;                      // Transaction ref (e.g. "TXN-9080")
  shop_id: string;                 // FK to Shop
  plan_id: string;                 // FK to SubscriptionPlan
  amount_paise: number;            // Amount in paise
  currency: "INR";
  gateway: "razorpay" | "cashfree";
  gateway_payment_id: string;      // e.g. "pay_Rzp9080bM"
  status: "success" | "failed" | "refunded";
  failure_reason?: string;
  gst_invoice_number?: string;     // e.g. "INV-2026-1080"
  created_at: string;
}
```

### 4. `SupportTicket`
```typescript
interface SupportTicket {
  id: string;                      // "TCK-801"
  shop_id: string;                 // FK to Shop
  subject: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved" | "closed";
  assigned_admin_id?: string;
  category: "thermal_printer" | "barcode_scanner" | "inventory" | "pricing_gst";
  sla_deadline: string;
  messages: Array<{
    sender_type: "merchant" | "staff";
    sender_name: string;
    text: string;
    timestamp: string;
  }>;
}
```

### 5. `AuditLog`
```typescript
interface AuditLog {
  id: string;                      // "AUD-401"
  admin_email: string;             // Staff member identity
  admin_role: "Super Admin" | "Support Agent" | "Finance" | "Read-only Analyst";
  action: string;                  // e.g. "Extended Free Trial (+7 days)"
  target_resource: string;         // e.g. "Apex Footwear & Bags (SHP-1005)"
  ip_address: string;
  timestamp: string;
}
```

---

## Recommended RESTful API Endpoints

### 1. Operations Dashboard
- `GET /api/v1/admin/overview?period={today|7d|30d}`  
  *Returns aggregated platform KPIs, signups time-series, MRR growth, and alert strips.*
- `GET /api/v1/admin/overview/summary-export?format={pdf|csv}`  
  *Generates executive brief export.*

### 2. Tenant Shop Directory & Detail
- `GET /api/v1/admin/shops?page=1&limit=25&q={search}&status={status}&city={city}`  
  *Paginated tenant search and multi-attribute filtering.*
- `GET /api/v1/admin/shops/{shop_id}`  
  *Returns detailed merchant profile, usage statistics, hardware setup, and support notes.*
- `POST /api/v1/admin/shops/{shop_id}/extend-trial`  
  *Body: `{"days": 7}`. Adds days to tenant trial and logs audit entry.*
- `POST /api/v1/admin/shops/{shop_id}/suspend`  
  *Toggles merchant account suspension status.*
- `POST /api/v1/admin/shops/{shop_id}/change-plan`  
  *Body: `{"plan_id": "plan-super"}`. Upgrades or modifies tenant tier.*
- `POST /api/v1/admin/shops/{shop_id}/impersonate`  
  *Generates secure short-lived delegated session cookie to view app as tenant.*
- `DELETE /api/v1/admin/shops/{shop_id}`  
  *Double-confirmed deletion of tenant and associated ledgers.*

### 3. Subscriptions & Payments
- `GET /api/v1/admin/subscriptions/plans`  
  *Returns active pricing tiers and subscriber counts.*
- `PUT /api/v1/admin/subscriptions/plans/{plan_id}`  
  *Updates plan price, terminal limits, and included OCR scans.*
- `GET /api/v1/admin/payments/failed`  
  *Returns failed AutoPay mandates.*
- `POST /api/v1/admin/payments/{txn_id}/retry`  
  *Invokes payment gateway API to re-charge mandate.*
- `POST /api/v1/admin/payments/{txn_id}/whatsapp-link`  
  *Dispatches WhatsApp UPI collection link to merchant.*
- `GET /api/v1/admin/payments/{txn_id}/invoice.pdf`  
  *Generates GST compliant tax invoice PDF.*

### 4. POS Telemetry & Anomalies
- `GET /api/v1/admin/pos/telemetry`  
  *Live cross-store GMV, volume leaders, and payment mode ratios.*
- `GET /api/v1/admin/pos/anomalies`  
  *Billing anomaly queue (duplicate slips, extreme values, negative stock).*
- `POST /api/v1/admin/pos/anomalies/{id}/resolve`  
  *Acknowledges and reconciles flagged bill.*

### 5. AI OCR Telemetry
- `GET /api/v1/admin/ocr/queue`  
  *Invoice extraction telemetry and confidence scores.*
- `POST /api/v1/admin/ocr/{id}/retry`  
  *Re-executes Gemini 2.5 Flash Vision extraction with enhanced contrast filter.*

### 6. Support & Staff Communications
- `GET /api/v1/admin/support/tickets`  
  *Filterable tickets list with SLA countdowns.*
- `POST /api/v1/admin/support/tickets/{id}/reply`  
  *Sends canned or custom reply to merchant via WhatsApp and SMS.*
- `POST /api/v1/admin/broadcasts`  
  *Dispatches targeted announcements to specified merchant segment.*

### 7. System Health & Compliance
- `GET /api/v1/admin/health`  
  *FastAPI latency, database connection pool, and error rate telemetry.*
- `POST /api/v1/admin/backup`  
  *Triggers manual compressed S3 Glacier database backup.*
- `GET /api/v1/admin/audit-logs?page=1`  
  *Immutable administrative audit trail.*

---

## How to Run Locally

Because the prototype is built with **zero external framework dependencies**, it can be executed in multiple ways:

### Option A: Static File Opening
Open `admin_portal/index.html` directly in any modern browser (Chrome, Edge, Safari, Firefox).

### Option B: Local Python HTTP Server
Run from the project root:
```powershell
python -m http.server 8080 --directory "admin_portal"
```
Then visit: [http://localhost:8080](http://localhost:8080)

### Option C: Integrated FastAPI Route
The admin portal is also mounted directly inside the Store BI FastAPI backend:
Visit: [http://localhost:8000/admin-portal/](http://localhost:8000/admin-portal/)
