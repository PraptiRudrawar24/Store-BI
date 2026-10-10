# Store BI User Flow

This document details the user journeys and core operational flows across the Store BI retail analytics platform for Indian kirana and retail merchants, as well as platform administrators.

---

## 1. High-Level System Architecture Flow

```mermaid
flowchart TD
    subgraph Merchant["Store Merchant (Kirana / Retail Owner)"]
        A["Visit Store BI Web App"] --> B{"Has Account?"}
        B -- "No" --> C["Phone Auth & OTP Verification"]
        B -- "Yes" --> D["Login with Phone + OTP"]
        C --> E["4-Step Onboarding Wizard"]
        E --> F["5-Day Free Trial Initialized (Zero-Start Database)"]
        D --> G["Store BI Dashboard"]
        F --> G
        
        G --> H["Data Upload Hub"]
        G --> I["Analytics Suite"]
        G --> J["AI Recommendations"]
        G --> K["Store Catalog & Sales"]
        
        H --> H1["Manual Entry (Forms & CSV)"]
        H --> H2["Bill / Invoice OCR (Gemini Vision)"]
        
        H1 --> L["SQLite Central Database"]
        H2 --> L
        K --> L
        L --> G
        L --> I
        L --> J
    end

    subgraph AdminPortal["Store BI Operations & Admin"]
        M["Admin Login (/admin)"] --> N["Admin Overview Dashboard"]
        N --> O["Business Directory & Trial Monitoring"]
        N --> P["Plans & Feature Pricing Config"]
        N --> Q["Promo Code Engine"]
        
        O --> R["Bulk Actions (+7d Trial, Activate, Suspend)"]
        O --> S["Merchant Detail View & Audit Logs"]
        P --> L
        Q --> L
        R --> L
        S --> L
    end
```

---

## 2. Merchant Onboarding & Zero-Start Flow

Every new account adheres to the **Zero-Start Rule**: no sample or fake demo data is injected. All metrics start cleanly at ₹0.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Store Owner
    participant Client as Frontend (React + Vite)
    participant Auth as Backend Auth API
    participant DB as SQLite Database

    Merchant->>Client: Enters 10-digit mobile number
    Client->>Auth: POST /api/auth/send-otp
    Auth-->>Client: OTP dispatched (default: 123456)
    Merchant->>Client: Enters 6-digit OTP
    Client->>Auth: POST /api/auth/verify-otp
    Auth->>DB: Check if shop exists
    alt New Merchant
        Auth-->>Client: JWT cookie + redirect to /onboarding
        Merchant->>Client: Step 1: Store name & category
        Merchant->>Client: Step 2: Location (City, State, Pincode)
        Merchant->>Client: Step 3: Business profile (GSTIN, volume, method)
        Merchant->>Client: Step 4: Challenge selection & goals
        Client->>Auth: POST /api/auth/onboarding
        Auth->>DB: Save shop with 5-day trial (is_paid=False)
        Auth-->>Client: onboarding_completed=True
    else Existing Merchant
        Auth-->>Client: JWT cookie + redirect to /dashboard
    end
    Client->>Merchant: Renders clean zero-state dashboard (₹0 sales, empty state CTAs)
```

---

## 3. Daily Merchant Operations Flow

```mermaid
flowchart TD
    Start(["Merchant opens Dashboard"]) --> CheckKPIs["Review Top KPIs (Sales, Profit, Orders)"]
    CheckKPIs --> CheckAlerts{"Stock Alerts Pending?"}
    
    CheckAlerts -- "Out of stock or Low stock" --> ReorderAction["Click Reorder / Note Supplier Restock"]
    CheckAlerts -- "No alerts" --> NormalOps["Select Desired Action"]
    ReorderAction --> NormalOps
    
    NormalOps --> ActionRecord["Quick Record Sale (Cash/UPI/Card)"]
    NormalOps --> ActionUpload["Upload Sales or Stock Data"]
    NormalOps --> ActionAnalytics["Analyze Retail Performance"]
    NormalOps --> ActionInsights["Review Replenishment & Bundles"]
    
    ActionRecord --> SaveSale["Stock automatically decremented; Profit calculated"]
    SaveSale --> RefreshDash["Dashboard KPIs & trends update in real time"]
    
    ActionUpload --> ChooseMode{"Choose Input Mode"}
    ChooseMode -- "Manual Form" --> ManualForm["Add Product / Record Sale / Add Expense"]
    ChooseMode -- "Bulk CSV" --> BulkCSV["Download Template & Upload Spreadsheet"]
    ChooseMode -- "Photo / Scan" --> OCRScan["Upload Bill / Handwritten Ledger Photo"]
    
    OCRScan --> GeminiExtract["Gemini Vision extracts items, prices & quantities"]
    GeminiExtract --> ReviewExtracted["Merchant verifies extracted lines & confirms"]
    ReviewExtracted --> SaveBatch["Products and transactions recorded"]
    
    ManualForm --> RefreshDash
    BulkCSV --> RefreshDash
    SaveBatch --> RefreshDash
```

---

## 4. Analytics & AI Decision Workflow

```mermaid
stateDiagram-v2
    [*] --> ZeroState: Clean Account (0 Products / 0 Sales)
    
    state ZeroState {
        [*] --> EmptyStateUI
        EmptyStateUI --> ActionableCTA: Prompts user with "Upload data"
    }
    
    ZeroState --> DataAccumulation: Merchant uploads products & sales
    
    state DataAccumulation {
        [*] --> SalesAnalytics: Daily/Weekly/Monthly revenue & busiest hour
        [*] --> ProductAnalytics: Top 5 margin drivers & slow movers
        [*] --> InventoryAnalytics: Stock valuation (at cost) & expiry risk groups
        [*] --> ProfitabilityAnalytics: Gross profit, COGS, expenses & net margin
    }
    
    DataAccumulation --> AIDecisionEngine: Meets min. threshold (5 products + sales)
    
    state AIDecisionEngine {
        StockMore: High margin & fast velocity -> Reorder recommendation
        BundleDeal: High co-purchase rate -> Combo discount suggestion
        DiscountToClear: Expiring within 30 days -> 20-30% markdown prompt
        DeadStock: Zero sales in 60 days -> Capital freeze warning
    }
    
    AIDecisionEngine --> ActionTaken: Merchant restocks or applies promotion
    ActionTaken --> DataAccumulation
```

---

## 5. Super Admin Operations Flow

```mermaid
flowchart TD
    AdminStart(["Operations Lead visits /admin"]) --> AuthCheck{"Admin Session Valid?"}
    AuthCheck -- "No" --> AdminLogin["Super Admin Dev Login / OTP"]
    AuthCheck -- "Yes" --> AdminOverview["Platform Overview Dashboard"]
    AdminLogin --> AdminOverview
    
    AdminOverview --> ViewMetrics["Monitor Total GMV, Active Trials & Paid Subscriptions"]
    AdminOverview --> ManageBusinesses["Navigate to Businesses Directory"]
    AdminOverview --> ConfigurePricing["Navigate to Plans & Prices"]
    
    ManageBusinesses --> BizFilters["Filter by Trial, Active, Suspended, City, or Category"]
    BizFilters --> SelectShops["Select Single or Multiple Merchants"]
    
    SelectShops --> BulkActions{"Execute Operation"}
    BulkActions -- "Extend Trial" --> GrantDays["Grant +7 or Custom Days Access"]
    BulkActions -- "Activate" --> UpgradePaid["Upgrade Store to Annual Pro License"]
    BulkActions -- "Suspend" --> HaltAccess["Revoke Counter & App Access"]
    BulkActions -- "Resend Login" --> SendWhatsApp["Dispatch Credentials via WhatsApp"]
    
    GrantDays --> WriteAudit["Record Entry in Immutable Audit Log"]
    UpgradePaid --> WriteAudit
    HaltAccess --> WriteAudit
    SendWhatsApp --> WriteAudit
    
    ConfigurePricing --> ModularPlans["Update Modular Module Rates (Catalog, Inventory, Alerts, AI)"]
    ConfigurePricing --> PromoEngine["Create / Edit / Toggle Promo Codes (e.g., KIRANA100)"]
    ModularPlans --> SavePlans["Publish Pricing Changes to App"]
    PromoEngine --> SavePlans
```
