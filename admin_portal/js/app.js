/**
 * ==============================================================================
 * STORE BI - ADMIN WEB PANEL APPLICATION CONTROLLER (app.js)
 * ==============================================================================
 * Master application controller powering the 12 administrative modules:
 * 1. Router & Module Switcher
 * 2. Real-Time Time Range Selector (Today / 7 days / 30 days)
 * 3. Reusable Table Engine (Sort, Multi-attribute Filter, Search, Pagination, Bulk Actions)
 * 4. Shop Detail Slide-Over Drawer with Tenant Impersonation & Audit Tracing
 * 5. Subscription Plan Editor & Failed Payments Resolver
 * 6. POS Anomaly Resolver & Stuck-Onboarding WhatsApp Nudge
 * 7. AI OCR Inspector & Reprocessor
 * 8. Support Ticket & Canned Replies Manager
 * 9. Multi-Channel Broadcast Manager
 * 10. System Health & Manual Backup Engine
 * 11. Role-Based Access Control (Super Admin, Support, Finance, Analyst)
 * 12. Global Quick-Search (⌘K) & Toast Alert System
 * ==============================================================================
 */

const StoreBI_App = (() => {
  // App State
  const state = {
    currentModule: "dashboard",
    timeRange: "30d", // 'today', '7d', '30d'
    theme: localStorage.getItem("storebi_admin_theme") || "light",
    currentUser: StoreBI_Data.adminUsers[0], // Super Admin default
    shops: [...StoreBI_Data.shops],
    selectedShopIds: new Set(),
    activeDrawerShop: null,
    table: {
      searchTerm: "",
      filterStatus: "all",
      filterCity: "all",
      filterCategory: "all",
      filterPlan: "all",
      sortColumn: "signupDate",
      sortDirection: "desc",
      currentPage: 1,
      pageSize: 8
    },
    notifications: [
      { id: "NTF-1", type: "critical", text: "4 AutoPay renewal payments failed today across Nagpur & Indore.", time: "10 mins ago" },
      { id: "NTF-2", type: "warning", text: "18 trial accounts expiring in next 48 hours.", time: "1 hour ago" },
      { id: "NTF-3", type: "info", text: "System backup to S3 Glacier completed successfully (92MB).", time: "4 hours ago" }
    ]
  };

  /**
   * Initialize App
   */
  function init() {
    applyTheme(state.theme);
    setupEventListeners();
    setupKeyboardShortcuts();
    renderModule(state.currentModule);
    updateNotificationBadge();
    console.log("Store BI Admin Web Panel initialized successfully.");
  }

  /**
   * Theme Management
   */
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem("storebi_admin_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    const themeIcon = document.getElementById("theme-toggle-icon");
    if (themeIcon) {
      themeIcon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === "dark" ? "light" : "dark");
    showToast("info", "Theme Changed", `Switched to ${state.theme} mode.`);
    // Re-render active charts to adapt to theme colors
    if (state.currentModule === "dashboard" || state.currentModule === "analytics") {
      setTimeout(renderModuleCharts, 50);
    }
  }

  /**
   * Toast Notification System
   */
  function showToast(type, title, message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const iconName = type === "success" ? "check_circle" : type === "error" ? "error" : "info";

    toast.innerHTML = `
      <span class="material-symbols-outlined filled" style="color: ${type === 'success' ? 'var(--mint)' : type === 'error' ? 'var(--red)' : 'var(--primary)'};">${iconName}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 13px;">${title}</div>
        <div style="font-size: 12px; color: var(--text-medium); margin-top: 2px;">${message}</div>
      </div>
      <button class="btn-icon" style="width: 24px; height: 24px; border: none; background: transparent; cursor: pointer;" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
      </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  }

  /**
   * Audit Logger Utility
   */
  function recordAudit(action, target) {
    const newLog = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      admin: `${state.currentUser.email} (${state.currentUser.role})`,
      action: action,
      target: target,
      timestamp: "Just now",
      ip: "103.24.120.5"
    };
    StoreBI_Data.auditLogs.unshift(newLog);
  }

  /**
   * Navigation & Module Switching
   */
  function navigateTo(moduleId) {
    state.currentModule = moduleId;
    document.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-module") === moduleId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    renderModule(moduleId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Set Time Range (Today / 7d / 30d)
   */
  function setTimeRange(range) {
    state.timeRange = range;
    document.querySelectorAll(".segmented-btn").forEach(btn => {
      if (btn.getAttribute("data-range") === range) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    showToast("info", "Period Updated", `Filtered data for ${range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}.`);
    renderModule(state.currentModule);
  }

  /**
   * Master Module Renderer
   */
  function renderModule(moduleId) {
    const mainContainer = document.getElementById("module-viewport");
    if (!mainContainer) return;

    switch (moduleId) {
      case "dashboard":
        mainContainer.innerHTML = renderDashboardView();
        renderModuleCharts();
        break;
      case "shops":
        mainContainer.innerHTML = renderShopsView();
        setupTableEventListeners();
        break;
      case "subscriptions":
        mainContainer.innerHTML = renderSubscriptionsView();
        break;
      case "pos-monitoring":
        mainContainer.innerHTML = renderPosMonitoringView();
        break;
      case "ocr-queue":
        mainContainer.innerHTML = renderOcrQueueView();
        break;
      case "analytics":
        mainContainer.innerHTML = renderAnalyticsView();
        renderAnalyticsCharts();
        break;
      case "ai-insights":
        mainContainer.innerHTML = renderAiInsightsView();
        break;
      case "support":
        mainContainer.innerHTML = renderSupportView();
        break;
      case "communication":
        mainContainer.innerHTML = renderCommunicationView();
        break;
      case "config":
        mainContainer.innerHTML = renderConfigView();
        break;
      case "system-health":
        mainContainer.innerHTML = renderSystemHealthView();
        break;
      case "admin-users":
        mainContainer.innerHTML = renderAdminUsersView();
        break;
      default:
        mainContainer.innerHTML = renderDashboardView();
        renderModuleCharts();
    }
  }

  // ============================================================================
  // MODULE 1: DASHBOARD (PLATFORM OVERVIEW)
  // ============================================================================
  function renderDashboardView() {
    const totalShops = state.shops.length;
    const activePaid = state.shops.filter(s => s.status === "active").length;
    const trials = state.shops.filter(s => s.status === "trial").length;
    const totalMRR = state.shops.reduce((acc, s) => acc + (s.status === "active" ? s.mrr : 0), 0);
    const totalARR = totalMRR * 12;

    const periodMultiplier = state.timeRange === "today" ? 0.05 : state.timeRange === "7d" ? 0.25 : 1;
    const displayMRR = Math.round(totalMRR * periodMultiplier);

    return `
      <div class="page-container">
        <!-- Subheader & Live Indicator -->
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Platform Overview</span>
              <span class="badge active">
                <span class="badge-dot"></span>
                <span>Live sync active</span>
              </span>
            </div>
            <p class="page-subtitle">Real-time health, tenant signups, and recurring revenue across Indian retail shops</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-secondary" onclick="StoreBI_App.exportPlatformSummary()">
              <span class="material-symbols-outlined">download</span>
              <span>Export Executive Brief</span>
            </button>
            <button class="btn-primary" onclick="StoreBI_App.refreshData()">
              <span class="material-symbols-outlined">refresh</span>
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        <!-- Alert Strip -->
        <div class="alert-strip warning">
          <div class="alert-content">
            <span class="material-symbols-outlined filled" style="color: var(--amber);">warning</span>
            <span><strong>Attention Required:</strong> 4 merchant renewal payments failed in the last 24 hours. 18 trials ending in 48 hours.</span>
          </div>
          <button class="btn-secondary btn-sm" onclick="StoreBI_App.navigateTo('subscriptions')">Review Payments</button>
        </div>

        <!-- 7 Core KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Total Registered Shops</span>
              <div class="kpi-icon-box"><span class="material-symbols-outlined">storefront</span></div>
            </div>
            <div class="kpi-value">${(totalShops * 120).toLocaleString('en-IN')}</div>
            <div>
              <span class="kpi-delta-chip positive"><span class="material-symbols-outlined" style="font-size: 14px;">trending_up</span>+14.2%</span>
              <span class="kpi-delta-context">vs previous period</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Active Paid Tenants</span>
              <div class="kpi-icon-box"><span class="material-symbols-outlined">verified</span></div>
            </div>
            <div class="kpi-value">${(activePaid * 105).toLocaleString('en-IN')}</div>
            <div>
              <span class="kpi-delta-chip positive"><span class="material-symbols-outlined" style="font-size: 14px;">arrow_upward</span>+8.5%</span>
              <span class="kpi-delta-context">98.2% retained</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Active Trials</span>
              <div class="kpi-icon-box" style="color: var(--amber);"><span class="material-symbols-outlined">timelapse</span></div>
            </div>
            <div class="kpi-value">${(trials * 42).toLocaleString('en-IN')}</div>
            <div>
              <span class="kpi-delta-chip neutral">74 ending &lt; 48h</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Monthly Recurring (MRR)</span>
              <div class="kpi-icon-box"><span class="material-symbols-outlined">currency_rupee</span></div>
            </div>
            <div class="kpi-value">${StoreBI_Data.formatINR(displayMRR * 92)}</div>
            <div>
              <span class="kpi-delta-chip positive"><span class="material-symbols-outlined" style="font-size: 14px;">trending_up</span>+18.4% MoM</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Annualized Run-Rate (ARR)</span>
              <div class="kpi-icon-box"><span class="material-symbols-outlined">payments</span></div>
            </div>
            <div class="kpi-value">${StoreBI_Data.formatINR(totalARR * 92)}</div>
            <div>
              <span class="kpi-delta-chip positive">+₹22.4L added</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Trial-to-Paid Conversion</span>
              <div class="kpi-icon-box"><span class="material-symbols-outlined">filter_alt</span></div>
            </div>
            <div class="kpi-value">24.6%</div>
            <div>
              <span class="kpi-delta-chip positive">+2.1%</span>
              <span class="kpi-delta-context">onboarding funnel</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Monthly Logo Churn</span>
              <div class="kpi-icon-box"><span class="material-symbols-outlined">trending_down</span></div>
            </div>
            <div class="kpi-value">1.8%</div>
            <div>
              <span class="kpi-delta-chip positive">-0.4%</span>
              <span class="kpi-delta-context">below 2% benchmark</span>
            </div>
          </div>
        </div>

        <!-- Charts Row 1: Signups Trend & MRR Growth -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin-bottom: 24px;">
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span class="material-symbols-outlined" style="color: var(--primary);">person_add</span>
                <span>Tenant Signup Velocity (Daily)</span>
              </div>
              <span class="badge neutral">Last 30 Days</span>
            </div>
            <div id="chart-signups-trend" class="chart-container"></div>
          </div>

          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span class="material-symbols-outlined" style="color: var(--primary);">trending_up</span>
                <span>MRR Growth Curve (₹ INR)</span>
              </div>
              <span class="badge success">+18.4% Growth</span>
            </div>
            <div id="chart-mrr-growth" class="chart-container"></div>
          </div>
        </div>

        <!-- Charts Row 2: Business Types & City Distribution -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin-bottom: 24px;">
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span class="material-symbols-outlined" style="color: var(--primary);">pie_chart</span>
                <span>Shops by Retail Category</span>
              </div>
              <span class="badge neutral">28 Tenant Sample</span>
            </div>
            <div id="chart-category-donut" class="chart-container"></div>
          </div>

          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span class="material-symbols-outlined" style="color: var(--primary);">location_on</span>
                <span>Top Regional Hubs (Maharashtra & MP)</span>
              </div>
              <span class="badge neutral">8 Major Cities</span>
            </div>
            <div id="chart-city-bars" class="chart-container" style="height: auto; min-height: 260px;"></div>
          </div>
        </div>

        <!-- Recent Critical Tenant Activity Feed -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">history</span>
              <span>Recent Tenant Activity & System Events</span>
            </div>
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.navigateTo('system-health')">View Full Audit Log</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${StoreBI_Data.auditLogs.slice(0, 4).map(log => `
              <div style="display: flex; items-center; justify-content: space-between; padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-md); font-size: 13px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="material-symbols-outlined" style="color: var(--primary); font-size: 18px;">admin_panel_settings</span>
                  <div>
                    <strong>${log.admin}</strong>: ${log.action}
                    <div style="color: var(--text-medium); font-size: 12px; margin-top: 2px;">Target: <span class="font-mono">${log.target}</span></div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 14px;">
                  <span class="font-mono" style="font-size: 11px; color: var(--text-muted);">${log.ip}</span>
                  <span style="font-size: 12px; color: var(--text-muted);">${log.timestamp}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderModuleCharts() {
    // 1. Signups Trend Mock
    const signupsTrend = [
      { label: "Oct 1", value: 38 }, { label: "Oct 4", value: 45 }, { label: "Oct 7", value: 52 },
      { label: "Oct 10", value: 68 }, { label: "Oct 13", value: 74 }, { label: "Oct 16", value: 92 },
      { label: "Oct 19", value: 88 }, { label: "Oct 22", value: 112 }, { label: "Oct 25", value: 124 },
      { label: "Oct 28", value: 140 }, { label: "Oct 31", value: 158 }
    ];
    StoreBI_Charts.renderAreaTrendChart("chart-signups-trend", signupsTrend, { isCurrency: false });

    // 2. MRR Growth Curve
    const mrrTrend = [
      { label: "May", value: 480000 }, { label: "Jun", value: 620000 }, { label: "Jul", value: 810000 },
      { label: "Aug", value: 1040000 }, { label: "Sep", value: 1280000 }, { label: "Oct", value: 1486500 }
    ];
    StoreBI_Charts.renderAreaTrendChart("chart-mrr-growth", mrrTrend, { isCurrency: true });

    // 3. Category Donut
    const categoryCounts = [
      { name: "Kirana / Grocery", count: 12 },
      { name: "Medical & Pharma", count: 6 },
      { name: "Footwear & Bags", count: 4 },
      { name: "Stationery & Xerox", count: 3 },
      { name: "Sweets & Farsan", count: 3 }
    ];
    StoreBI_Charts.renderDonutChart("chart-category-donut", categoryCounts);

    // 4. City Horizontal Bars
    const cityCounts = [
      { name: "Pune", count: 8 },
      { name: "Indore", count: 5 },
      { name: "Nagpur", count: 4 },
      { name: "Mumbai & Thane", count: 3 },
      { name: "Nashik", count: 3 },
      { name: "Kolhapur", count: 2 },
      { name: "Solapur", count: 2 },
      { name: "Surat", count: 1 }
    ];
    StoreBI_Charts.renderCityBarChart("chart-city-bars", cityCounts);
  }

  // ============================================================================
  // MODULE 2: SHOPS (TENANT MANAGEMENT)
  // ============================================================================
  function renderShopsView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Tenant Shops Management</span>
              <span class="badge neutral">${state.shops.length} total stores</span>
            </div>
            <p class="page-subtitle">Inspect retail merchants, monitor usage quotas, extend trials, and manage subscriptions</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-secondary" onclick="StoreBI_App.exportShopsCSV()">
              <span class="material-symbols-outlined">file_download</span>
              <span>Export CSV</span>
            </button>
            <button class="btn-primary" onclick="StoreBI_App.openAddShopModal()">
              <span class="material-symbols-outlined">add_business</span>
              <span>Onboard New Tenant</span>
            </button>
          </div>
        </div>

        <!-- Table Toolbar -->
        <div class="table-toolbar">
          <div class="table-search-box">
            <span class="material-symbols-outlined" style="color: var(--text-muted); font-size: 18px;">search</span>
            <input type="text" id="shop-search-input" class="table-search-input" placeholder="Search by name, owner, phone, city..." value="${state.table.searchTerm}">
            ${state.table.searchTerm ? `<button style="background: none; border: none; cursor: pointer;" onclick="StoreBI_App.clearShopSearch()"><span class="material-symbols-outlined" style="font-size: 16px;">close</span></button>` : ''}
          </div>

          <div class="table-filters">
            <!-- Filter by Status -->
            <select id="filter-status-select" class="select-filter">
              <option value="all" ${state.table.filterStatus === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="active" ${state.table.filterStatus === 'active' ? 'selected' : ''}>Active (Paid)</option>
              <option value="trial" ${state.table.filterStatus === 'trial' ? 'selected' : ''}>Active Trial</option>
              <option value="expired" ${state.table.filterStatus === 'expired' ? 'selected' : ''}>Expired</option>
              <option value="suspended" ${state.table.filterStatus === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>

            <!-- Filter by City -->
            <select id="filter-city-select" class="select-filter">
              <option value="all" ${state.table.filterCity === 'all' ? 'selected' : ''}>All Cities</option>
              <option value="Pune" ${state.table.filterCity === 'Pune' ? 'selected' : ''}>Pune</option>
              <option value="Nagpur" ${state.table.filterCity === 'Nagpur' ? 'selected' : ''}>Nagpur</option>
              <option value="Mumbai" ${state.table.filterCity === 'Mumbai' ? 'selected' : ''}>Mumbai</option>
              <option value="Indore" ${state.table.filterCity === 'Indore' ? 'selected' : ''}>Indore</option>
              <option value="Nashik" ${state.table.filterCity === 'Nashik' ? 'selected' : ''}>Nashik</option>
              <option value="Kolhapur" ${state.table.filterCity === 'Kolhapur' ? 'selected' : ''}>Kolhapur</option>
              <option value="Solapur" ${state.table.filterCity === 'Solapur' ? 'selected' : ''}>Solapur</option>
            </select>

            <!-- Filter by Category -->
            <select id="filter-category-select" class="select-filter">
              <option value="all" ${state.table.filterCategory === 'all' ? 'selected' : ''}>All Categories</option>
              <option value="Kirana / Grocery" ${state.table.filterCategory === 'Kirana / Grocery' ? 'selected' : ''}>Kirana / Grocery</option>
              <option value="Medical & Pharma" ${state.table.filterCategory === 'Medical & Pharma' ? 'selected' : ''}>Medical & Pharma</option>
              <option value="Footwear & Leather" ${state.table.filterCategory === 'Footwear & Leather' ? 'selected' : ''}>Footwear & Leather</option>
              <option value="Stationery & Xerox" ${state.table.filterCategory === 'Stationery & Xerox' ? 'selected' : ''}>Stationery & Xerox</option>
              <option value="Sweets & Farsan" ${state.table.filterCategory === 'Sweets & Farsan' ? 'selected' : ''}>Sweets & Farsan</option>
            </select>
          </div>
        </div>

        <!-- Bulk Action Bar (shown when items are selected) -->
        <div id="bulk-action-bar" style="display: ${state.selectedShopIds.size > 0 ? 'flex' : 'none'}; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--primary-light); border: 1px solid var(--primary); border-radius: var(--radius-md); margin-bottom: 16px; font-size: 13.5px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-symbols-outlined" style="color: var(--primary);">checklist</span>
            <span><strong>${state.selectedShopIds.size}</strong> stores selected</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.bulkExtendTrial(7)">Extend Trial (+7 Days)</button>
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.bulkExportSelected()">Export Selected</button>
            <button class="btn-danger btn-sm" onclick="StoreBI_App.bulkSuspendSelected()">Suspend Selected</button>
          </div>
        </div>

        <!-- Table Container -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">
                  <input type="checkbox" id="select-all-shops-checkbox" ${state.selectedShopIds.size === state.shops.length ? 'checked' : ''}>
                </th>
                <th class="sortable" onclick="StoreBI_App.handleSort('name')">Shop Name</th>
                <th>Owner & Phone</th>
                <th>Category</th>
                <th class="sortable" onclick="StoreBI_App.handleSort('city')">City</th>
                <th>Plan & MRR</th>
                <th class="sortable" onclick="StoreBI_App.handleSort('status')">Status</th>
                <th>Activity</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="shops-table-body">
              ${renderShopTableRows()}
            </tbody>
          </table>

          <!-- Pagination Footer -->
          <div class="table-pagination">
            <div>
              Showing <span class="font-mono">${getPaginationStart()}</span> to <span class="font-mono">${getPaginationEnd()}</span> of <span class="font-mono">${getFilteredShops().length}</span> stores
            </div>
            <div class="pagination-controls">
              <button class="btn-secondary btn-sm" onclick="StoreBI_App.changePage(-1)" ${state.table.currentPage <= 1 ? 'disabled' : ''}>
                <span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>
                <span>Prev</span>
              </button>
              <span class="font-mono" style="padding: 0 8px; font-weight: 600;">Page ${state.table.currentPage} of ${getTotalPages()}</span>
              <button class="btn-secondary btn-sm" onclick="StoreBI_App.changePage(1)" ${state.table.currentPage >= getTotalPages() ? 'disabled' : ''}>
                <span>Next</span>
                <span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getFilteredShops() {
    let result = [...state.shops];
    const { searchTerm, filterStatus, filterCity, filterCategory } = state.table;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter(s => s.status === filterStatus);
    }

    if (filterCity !== "all") {
      result = result.filter(s => s.city === filterCity);
    }

    if (filterCategory !== "all") {
      result = result.filter(s => s.category === filterCategory);
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[state.table.sortColumn];
      let valB = b[state.table.sortColumn];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return state.table.sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return state.table.sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }

  function getTotalPages() {
    return Math.max(1, Math.ceil(getFilteredShops().length / state.table.pageSize));
  }

  function getPaginationStart() {
    const list = getFilteredShops();
    if (list.length === 0) return 0;
    return (state.table.currentPage - 1) * state.table.pageSize + 1;
  }

  function getPaginationEnd() {
    const list = getFilteredShops();
    return Math.min(list.length, state.table.currentPage * state.table.pageSize);
  }

  function renderShopTableRows() {
    const filtered = getFilteredShops();
    const startIndex = (state.table.currentPage - 1) * state.table.pageSize;
    const pageShops = filtered.slice(startIndex, startIndex + state.table.pageSize);

    if (pageShops.length === 0) {
      return `
        <tr>
          <td colspan="9">
            <div class="empty-state-strip">
              <span class="material-symbols-outlined">auto_awesome</span>
              <span>No retail stores matched the current filter criteria.</span>
            </div>
          </td>
        </tr>
      `;
    }

    return pageShops.map(shop => {
      const isSelected = state.selectedShopIds.has(shop.id);
      return `
        <tr class="${isSelected ? 'selected-row' : ''}">
          <td style="text-align: center;">
            <input type="checkbox" class="shop-row-checkbox" data-shop-id="${shop.id}" ${isSelected ? 'checked' : ''}>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--primary); cursor: pointer;" onclick="StoreBI_App.openShopDrawer('${shop.id}')">
              ${shop.name}
            </div>
            <div class="font-mono" style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              ${shop.id} • ${shop.gstin || 'Non-GST'}
            </div>
          </td>
          <td>
            <div>${shop.ownerName}</div>
            <div class="font-mono" style="font-size: 11.5px; color: var(--text-medium);">${shop.phone}</div>
          </td>
          <td>
            <span class="badge neutral">${shop.category}</span>
          </td>
          <td>
            <div>${shop.city}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${shop.state}</div>
          </td>
          <td>
            <div style="font-weight: 500;">${shop.plan}</div>
            <div class="font-mono" style="font-size: 11px; color: var(--text-muted);">${shop.mrr > 0 ? StoreBI_Data.formatINR(shop.mrr) + '/mo' : 'Free Trial'}</div>
          </td>
          <td>
            ${renderStatusBadge(shop.status, shop.trialDaysLeft)}
          </td>
          <td>
            <div style="font-size: 12px; color: var(--text-high);">${shop.lastActive}</div>
            <div class="font-mono" style="font-size: 11px; color: var(--text-muted);">${shop.totalBills} bills • ${shop.inventoryCount} items</div>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.openShopDrawer('${shop.id}')" title="Inspect Shop Details">
              <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
            </button>
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.impersonateShop('${shop.id}')" title="View-as Merchant (Logged-in session)">
              <span class="material-symbols-outlined" style="font-size: 16px;">login</span>
            </button>
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.openShopQuickActionMenu(event, '${shop.id}')" title="More Actions">
              <span class="material-symbols-outlined" style="font-size: 16px;">more_vert</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderStatusBadge(status, trialDaysLeft) {
    if (status === "active") {
      return `<span class="badge active"><span class="badge-dot"></span>Active (Paid)</span>`;
    } else if (status === "trial") {
      return `<span class="badge trial"><span class="badge-dot"></span>Trial: ${trialDaysLeft}d left</span>`;
    } else if (status === "expired") {
      return `<span class="badge expired"><span class="badge-dot"></span>Expired</span>`;
    } else if (status === "suspended") {
      return `<span class="badge suspended"><span class="badge-dot"></span>Suspended</span>`;
    }
    return `<span class="badge neutral">${status}</span>`;
  }

  function setupTableEventListeners() {
    const searchInput = document.getElementById("shop-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.table.searchTerm = e.target.value;
        state.table.currentPage = 1;
        updateTableOnly();
      });
    }

    const statusSelect = document.getElementById("filter-status-select");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        state.table.filterStatus = e.target.value;
        state.table.currentPage = 1;
        updateTableOnly();
      });
    }

    const citySelect = document.getElementById("filter-city-select");
    if (citySelect) {
      citySelect.addEventListener("change", (e) => {
        state.table.filterCity = e.target.value;
        state.table.currentPage = 1;
        updateTableOnly();
      });
    }

    const categorySelect = document.getElementById("filter-category-select");
    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        state.table.filterCategory = e.target.value;
        state.table.currentPage = 1;
        updateTableOnly();
      });
    }

    // Checkbox multi-select
    const selectAllCheckbox = document.getElementById("select-all-shops-checkbox");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", (e) => {
        const checked = e.target.checked;
        if (checked) {
          getFilteredShops().forEach(s => state.selectedShopIds.add(s.id));
        } else {
          state.selectedShopIds.clear();
        }
        updateTableOnly();
      });
    }

    document.querySelectorAll(".shop-row-checkbox").forEach(cb => {
      cb.addEventListener("change", (e) => {
        const shopId = e.target.getAttribute("data-shop-id");
        if (e.target.checked) {
          state.selectedShopIds.add(shopId);
        } else {
          state.selectedShopIds.delete(shopId);
        }
        updateTableOnly();
      });
    });
  }

  function updateTableOnly() {
    const tbody = document.getElementById("shops-table-body");
    if (tbody) tbody.innerHTML = renderShopTableRows();

    const bulkBar = document.getElementById("bulk-action-bar");
    if (bulkBar) {
      bulkBar.style.display = state.selectedShopIds.size > 0 ? "flex" : "none";
      const countEl = bulkBar.querySelector("strong");
      if (countEl) countEl.textContent = state.selectedShopIds.size;
    }

    setupTableEventListeners();
  }

  function handleSort(col) {
    if (state.table.sortColumn === col) {
      state.table.sortDirection = state.table.sortDirection === "asc" ? "desc" : "asc";
    } else {
      state.table.sortColumn = col;
      state.table.sortDirection = "asc";
    }
    updateTableOnly();
  }

  function changePage(delta) {
    const newPage = state.table.currentPage + delta;
    if (newPage >= 1 && newPage <= getTotalPages()) {
      state.table.currentPage = newPage;
      updateTableOnly();
    }
  }

  function clearShopSearch() {
    state.table.searchTerm = "";
    state.table.currentPage = 1;
    renderModule("shops");
  }

  // ============================================================================
  // SHOP DETAIL SLIDE-OVER DRAWER
  // ============================================================================
  function openShopDrawer(shopId) {
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop) return;
    state.activeDrawerShop = shop;

    const drawerBackdrop = document.getElementById("shop-drawer-backdrop");
    const drawerTitle = document.getElementById("drawer-shop-title");
    const drawerBody = document.getElementById("drawer-shop-body");

    if (drawerTitle) drawerTitle.textContent = shop.name;
    if (drawerBody) {
      drawerBody.innerHTML = `
        <!-- Top Status Banner -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${renderStatusBadge(shop.status, shop.trialDaysLeft)}
            <span class="font-mono" style="font-size: 12px; color: var(--text-medium);">${shop.id}</span>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--primary);">
            Plan: ${shop.plan} (${shop.mrr > 0 ? StoreBI_Data.formatINR(shop.mrr) + '/mo' : 'Trial'})
          </div>
        </div>

        <!-- Business & Owner Profile -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <span class="card-title"><span class="material-symbols-outlined" style="color: var(--primary);">badge</span> Owner & Business Details</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
            <div>
              <span style="color: var(--text-muted); font-size: 11.5px;">Owner Full Name</span>
              <div style="font-weight: 600;">${shop.ownerName}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11.5px;">Registered Phone</span>
              <div class="font-mono" style="font-weight: 600;">${shop.phone}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11.5px;">Email Address</span>
              <div class="font-mono" style="font-size: 12px;">${shop.email}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11.5px;">GSTIN Registration</span>
              <div class="font-mono" style="font-weight: 600;">${shop.gstin || 'Unregistered Composite'}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11.5px;">City & State</span>
              <div>${shop.city}, ${shop.state} (${shop.pincode})</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 11.5px;">Retail Category</span>
              <div>${shop.category}</div>
            </div>
          </div>
        </div>

        <!-- Usage Quotas & Activity -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <span class="card-title"><span class="material-symbols-outlined" style="color: var(--primary);">analytics</span> Live Usage & Metrics</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
            <div style="padding: 10px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700;">${shop.totalBills}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Total Bills</div>
            </div>
            <div style="padding: 10px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700;">${shop.posTransactions}</div>
              <div style="font-size: 11px; color: var(--text-muted);">POS Swipes</div>
            </div>
            <div style="padding: 10px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700;">${shop.ocrUploads}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Bill OCR Scans</div>
            </div>
            <div style="padding: 10px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700;">${shop.inventoryCount}</div>
              <div style="font-size: 11px; color: var(--text-muted);">SKUs Tracked</div>
            </div>
          </div>
        </div>

        <!-- Hardware & Counter Setup -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <span class="card-title"><span class="material-symbols-outlined" style="color: var(--primary);">print</span> Hardware & POS Setup</span>
          </div>
          <div style="font-size: 13px; color: var(--text-high); line-height: 1.6;">
            <strong>Connected Hardware:</strong> ${shop.hardware}
          </div>
        </div>

        <!-- Internal Support Notes -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <span class="card-title"><span class="material-symbols-outlined" style="color: var(--primary);">sticky_note_2</span> Internal Staff Notes</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            ${(shop.supportNotes || []).length > 0 ? shop.supportNotes.map(n => `
              <div style="padding: 8px 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 12.5px;">
                <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 11px; margin-bottom: 4px;">
                  <span><strong>${n.author}</strong></span>
                  <span>${n.date}</span>
                </div>
                <div>${n.text}</div>
              </div>
            `).join('') : '<div style="color: var(--text-muted); font-size: 12.5px;">No internal notes logged yet for this merchant.</div>'}
          </div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="new-support-note-input" class="table-search-input" style="border: 1px solid var(--border); padding: 6px 10px; border-radius: var(--radius-sm); font-size: 12.5px;" placeholder="Add an internal note...">
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.addShopSupportNote('${shop.id}')">Add Note</button>
          </div>
        </div>

        <!-- Administrative Action Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
          <button class="btn-secondary" onclick="StoreBI_App.extendShopTrial('${shop.id}', 7)">
            <span class="material-symbols-outlined">update</span>
            <span>Extend Trial (+7 Days)</span>
          </button>
          <button class="btn-secondary" onclick="StoreBI_App.openChangePlanModal('${shop.id}')">
            <span class="material-symbols-outlined">sell</span>
            <span>Change Plan</span>
          </button>
          <button class="btn-secondary" onclick="StoreBI_App.resetTenantPassword('${shop.id}')">
            <span class="material-symbols-outlined">lock_reset</span>
            <span>Reset Password</span>
          </button>
          <button class="btn-secondary" onclick="StoreBI_App.impersonateShop('${shop.id}')">
            <span class="material-symbols-outlined">login</span>
            <span>View-As Tenant</span>
          </button>
          <button class="btn-secondary" onclick="StoreBI_App.toggleShopSuspension('${shop.id}')">
            <span class="material-symbols-outlined">${shop.status === 'suspended' ? 'check_circle' : 'block'}</span>
            <span>${shop.status === 'suspended' ? 'Reactivate Store' : 'Suspend Account'}</span>
          </button>
          <button class="btn-danger" onclick="StoreBI_App.confirmDeleteShop('${shop.id}')">
            <span class="material-symbols-outlined">delete_forever</span>
            <span>Delete Store</span>
          </button>
        </div>
      `;
    }

    if (drawerBackdrop) drawerBackdrop.classList.add("active");
  }

  function closeShopDrawer() {
    const drawerBackdrop = document.getElementById("shop-drawer-backdrop");
    if (drawerBackdrop) drawerBackdrop.classList.remove("active");
    state.activeDrawerShop = null;
  }

  function addShopSupportNote(shopId) {
    const input = document.getElementById("new-support-note-input");
    if (!input || !input.value.trim()) return;

    const note = {
      author: state.currentUser.name,
      date: new Date().toISOString().split("T")[0],
      text: input.value.trim()
    };

    const shop = state.shops.find(s => s.id === shopId);
    if (shop) {
      shop.supportNotes = shop.supportNotes || [];
      shop.supportNotes.push(note);
      recordAudit(`Added support note: "${note.text.substring(0, 30)}..."`, `${shop.name} (${shop.id})`);
      showToast("success", "Note Added", "Internal support note saved to tenant file.");
      openShopDrawer(shopId);
    }
  }

  function extendShopTrial(shopId, days) {
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop) return;

    shop.trialDaysLeft = (shop.trialDaysLeft || 0) + days;
    shop.status = "trial";
    recordAudit(`Extended free trial by ${days} days`, `${shop.name} (${shop.id})`);
    showToast("success", "Trial Extended", `${shop.name}'s trial increased by ${days} days.`);
    openShopDrawer(shopId);
    if (state.currentModule === "shops") updateTableOnly();
  }

  function toggleShopSuspension(shopId) {
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop) return;

    if (shop.status === "suspended") {
      shop.status = "active";
      recordAudit("Reactivated suspended tenant", `${shop.name} (${shop.id})`);
      showToast("success", "Store Reactivated", `${shop.name} account is now active.`);
    } else {
      shop.status = "suspended";
      recordAudit("Suspended tenant account", `${shop.name} (${shop.id})`);
      showToast("error", "Store Suspended", `${shop.name} has been suspended.`);
    }
    openShopDrawer(shopId);
    if (state.currentModule === "shops") updateTableOnly();
  }

  function impersonateShop(shopId) {
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop) return;

    recordAudit("Impersonated merchant session (View-As)", `${shop.name} (${shop.id})`);
    showToast("info", "View-As Activated", `Launching Store BI merchant session for ${shop.name}...`);
    // Opens merchant application in new tab with tenant auth context
    setTimeout(() => {
      window.open(`http://localhost:5173/dashboard?impersonate=${shop.id}`, "_blank");
    }, 600);
  }

  function resetTenantPassword(shopId) {
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop) return;

    recordAudit("Dispatched password reset link", `${shop.name} (${shop.email})`);
    showToast("success", "Instructions Sent", `A password recovery SMS & Email has been dispatched to ${shop.phone}.`);
  }

  function confirmDeleteShop(shopId) {
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop) return;

    openConfirmationModal({
      title: `Delete Store: ${shop.name}?`,
      message: `Are you sure you want to permanently delete <strong>${shop.name} (${shop.id})</strong>? This will erase all ${shop.totalBills} sales bills, ${shop.inventoryCount} products, and tenant billing history. This action cannot be undone.`,
      confirmText: "Permanently Delete",
      isDestructive: true,
      onConfirm: () => {
        state.shops = state.shops.filter(s => s.id !== shopId);
        recordAudit("Permanently deleted tenant shop and data records", `${shop.name} (${shop.id})`);
        closeShopDrawer();
        showToast("error", "Store Deleted", `${shop.name} has been permanently deleted.`);
        renderModule("shops");
      }
    });
  }

  // ============================================================================
  // MODULE 3: SUBSCRIPTIONS & REVENUE
  // ============================================================================
  function renderSubscriptionsView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Subscriptions & Revenue Engine</span>
              <span class="badge active">AutoPay Enabled</span>
            </div>
            <p class="page-subtitle">Manage SaaS pricing tiers, monitor recurring renewals, handle failed payments, and review GST tax invoices</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-secondary" onclick="StoreBI_App.openCouponModal()">
              <span class="material-symbols-outlined">discount</span>
              <span>Manage Coupons</span>
            </button>
            <button class="btn-primary" onclick="StoreBI_App.openPlanEditorModal()">
              <span class="material-symbols-outlined">tune</span>
              <span>Edit Pricing Plans</span>
            </button>
          </div>
        </div>

        <!-- 3 Pricing Tier Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
          ${StoreBI_Data.plans.map(plan => `
            <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div>
                    <h3 style="font-size: 18px; font-weight: 700; color: var(--text-high);">${plan.name}</h3>
                    <span class="badge neutral" style="margin-top: 4px;">${plan.badge}</span>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary);">${plan.formattedMonthly}<span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">/mo</span></div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${plan.formattedAnnual}/yr (2 mos free)</div>
                  </div>
                </div>

                <div style="padding: 12px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 14px;">
                  <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Plan Inclusions:</div>
                  <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
                    ${plan.features.map(f => `
                      <li style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined filled" style="color: var(--mint); font-size: 16px;">check_circle</span>
                        <span>${f}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px;">
                <span class="font-mono" style="font-size: 13px; font-weight: 600;">${plan.subscriberCount} active merchants</span>
                <button class="btn-secondary btn-sm" onclick="StoreBI_App.openPlanEditorModal('${plan.id}')">Configure Tier</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Failed Payments Queue (Critical Action Required) -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--red);">error</span>
              <span>Failed Payments & Payment Recovery Queue</span>
            </div>
            <span class="badge danger">4 Failed Mandates</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Store & Owner</th>
                  <th>Plan Amount</th>
                  <th>Gateway Ref</th>
                  <th>Failure Reason</th>
                  <th>Failed Date</th>
                  <th style="text-align: right;">Recovery Actions</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.payments.filter(p => p.status === "failed").map(p => `
                  <tr>
                    <td class="font-mono">${p.id}</td>
                    <td>
                      <div style="font-weight: 600;">${p.shopName}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${p.owner}</div>
                    </td>
                    <td class="font-mono" style="font-weight: 600;">${StoreBI_Data.formatINR(p.amount)}</td>
                    <td class="font-mono" style="font-size: 11px;">${p.ref}</td>
                    <td style="color: var(--red); font-size: 12.5px;">${p.reason}</td>
                    <td style="font-size: 12px;">${p.date}</td>
                    <td style="text-align: right;">
                      <button class="btn-primary btn-sm" onclick="StoreBI_App.retryPayment('${p.id}')">Retry Charge</button>
                      <button class="btn-secondary btn-sm" onclick="StoreBI_App.sendWhatsAppPaymentLink('${p.id}')">Send WhatsApp UPI Link</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Completed Transactions Ledger -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">receipt_long</span>
              <span>Merchant Subscription Billing Ledger</span>
            </div>
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.exportPaymentsCSV()">Export Ledger (CSV)</button>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Merchant Store</th>
                  <th>Amount Paid</th>
                  <th>Gateway</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th style="text-align: right;">GST Tax Invoice</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.payments.filter(p => p.status === "success").map(p => `
                  <tr>
                    <td class="font-mono" style="font-weight: 600;">${p.gstInvoice}</td>
                    <td>
                      <div>${p.shopName}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${p.plan}</div>
                    </td>
                    <td class="font-mono" style="font-weight: 700; color: var(--mint-text);">${StoreBI_Data.formatINR(p.amount)}</td>
                    <td style="font-size: 12.5px;">${p.gateway}</td>
                    <td style="font-size: 12px;">${p.date}</td>
                    <td><span class="badge success"><span class="badge-dot"></span>Paid</span></td>
                    <td style="text-align: right;">
                      <button class="btn-secondary btn-sm" onclick="StoreBI_App.viewGstInvoice('${p.gstInvoice}')">
                        <span class="material-symbols-outlined" style="font-size: 15px;">visibility</span>
                        <span>View PDF</span>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function retryPayment(txnId) {
    recordAudit(`Triggered AutoPay mandate re-charge for transaction`, txnId);
    showToast("info", "Charging Mandate", `Invoked Razorpay AutoPay API for ${txnId}. Processing...`);
    setTimeout(() => {
      showToast("success", "Payment Captured", `Payment for ${txnId} was successfully settled.`);
    }, 1200);
  }

  function sendWhatsAppPaymentLink(txnId) {
    const txn = StoreBI_Data.payments.find(p => p.id === txnId);
    if (!txn) return;
    recordAudit(`Dispatched WhatsApp UPI payment link`, `${txn.shopName} (${txn.owner})`);
    showToast("success", "WhatsApp Sent", `Instant UPI payment link dispatched to ${txn.owner}.`);
  }

  function viewGstInvoice(invId) {
    openGstInvoiceModal(invId);
  }

  // ============================================================================
  // MODULE 4: POS & BILLING MONITORING
  // ============================================================================
  function renderPosMonitoringView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>POS & Checkout Billing Stream</span>
              <span class="badge active">Telemetry Active</span>
            </div>
            <p class="page-subtitle">Cross-store retail sales velocity, high-volume counters, stuck onboarding stores, and anomaly alerts</p>
          </div>
          <button class="btn-primary" onclick="StoreBI_App.refreshData()">
            <span class="material-symbols-outlined">refresh</span>
            <span>Refresh Telemetry</span>
          </button>
        </div>

        <!-- Top GMV Metrics -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Today's Total GMV</span><div class="kpi-icon-box"><span class="material-symbols-outlined">currency_rupee</span></div></div>
            <div class="kpi-value">₹24,85,420</div>
            <div><span class="kpi-delta-chip positive">+12.8%</span><span class="kpi-delta-context">across 28 stores</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Today's Transactions</span><div class="kpi-icon-box"><span class="material-symbols-outlined">receipt</span></div></div>
            <div class="kpi-value">4,128</div>
            <div><span class="kpi-delta-chip positive">+340 vs yesterday</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Avg Transaction Size</span><div class="kpi-icon-box"><span class="material-symbols-outlined">calculate</span></div></div>
            <div class="kpi-value">₹602</div>
            <div><span class="kpi-delta-chip neutral">Kirana standard</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">UPI vs Cash Ratio</span><div class="kpi-icon-box"><span class="material-symbols-outlined">qr_code_2</span></div></div>
            <div class="kpi-value">68% / 32%</div>
            <div><span class="kpi-delta-chip positive">UPI dominant</span></div>
          </div>
        </div>

        <!-- Anomaly Detection Table -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--amber);">crisis_alert</span>
              <span>Billing Anomaly Alerts</span>
            </div>
            <span class="badge warning">${StoreBI_Data.posAnomalies.length} Flagged</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Anomaly ID</th>
                  <th>Tenant Store</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Flag Detail</th>
                  <th>Timestamp</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.posAnomalies.map(anm => `
                  <tr>
                    <td class="font-mono" style="font-weight: 600;">${anm.id}</td>
                    <td><strong>${anm.shopName}</strong></td>
                    <td>${anm.type}</td>
                    <td>
                      <span class="badge ${anm.severity === 'critical' ? 'danger' : 'warning'}">
                        ${anm.severity.toUpperCase()}
                      </span>
                    </td>
                    <td style="font-size: 12.5px;">${anm.detail}</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${anm.timestamp}</td>
                    <td style="text-align: right;">
                      <button class="btn-secondary btn-sm" onclick="StoreBI_App.resolveAnomaly('${anm.id}')">Acknowledge</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Stuck Onboarding Shops (Registered > 3 days, 0 sales) -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">help_outline</span>
              <span>Stuck Onboarding Intervention Queue</span>
            </div>
            <span class="badge neutral">${StoreBI_Data.stuckOnboarding.length} Needs Support</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Shop & Owner</th>
                  <th>City</th>
                  <th>Days Since Signup</th>
                  <th>Inventory Added</th>
                  <th>Sales Recorded</th>
                  <th>Stuck Stage</th>
                  <th style="text-align: right;">Intervention</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.stuckOnboarding.map(st => `
                  <tr>
                    <td>
                      <div style="font-weight: 600;">${st.shopName}</div>
                      <div class="font-mono" style="font-size: 11px; color: var(--text-muted);">${st.owner} • ${st.phone}</div>
                    </td>
                    <td>${st.city}</td>
                    <td class="font-mono" style="color: var(--amber-text); font-weight: 600;">${st.daysSinceSignup} days ago</td>
                    <td class="font-mono">${st.inventoryAdded} items</td>
                    <td class="font-mono" style="color: var(--red); font-weight: 700;">0</td>
                    <td><span class="badge neutral">${st.stage}</span></td>
                    <td style="text-align: right;">
                      <button class="btn-primary btn-sm" onclick="StoreBI_App.sendOnboardingNudge('${st.shopId}')">
                        <span class="material-symbols-outlined" style="font-size: 15px;">chat</span>
                        <span>Send WhatsApp Guide</span>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function resolveAnomaly(anmId) {
    recordAudit("Acknowledged and reconciled billing anomaly", anmId);
    showToast("success", "Anomaly Resolved", `Alert ${anmId} marked as reviewed.`);
  }

  function sendOnboardingNudge(shopId) {
    const shop = state.shops.find(s => s.id === shopId);
    if (!shop) return;
    recordAudit("Dispatched automated onboarding assistance video on WhatsApp", `${shop.name} (${shop.phone})`);
    showToast("success", "Assistance Dispatched", `Sent 2-minute POS walkthrough video to ${shop.ownerName}.`);
  }

  // ============================================================================
  // MODULE 5: DATA UPLOAD & AI INVOICE OCR
  // ============================================================================
  function renderOcrQueueView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Data Upload & AI Invoice OCR Telemetry</span>
              <span class="badge active">Gemini 2.5 Flash</span>
            </div>
            <p class="page-subtitle">Distributor bill scanning performance, OCR confidence audit, extraction review queue, and retry actions</p>
          </div>
          <button class="btn-primary" onclick="StoreBI_App.refreshData()">
            <span class="material-symbols-outlined">refresh</span>
            <span>Refresh Telemetry</span>
          </button>
        </div>

        <!-- OCR Telemetry KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Bills Scanned This Month</span><div class="kpi-icon-box"><span class="material-symbols-outlined">document_scanner</span></div></div>
            <div class="kpi-value">1,482</div>
            <div><span class="kpi-delta-chip positive">+28% MoM</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">OCR Success Accuracy</span><div class="kpi-icon-box"><span class="material-symbols-outlined">task_alt</span></div></div>
            <div class="kpi-value">94.2%</div>
            <div><span class="kpi-delta-chip positive">+1.8% vs last model</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Avg Extraction Latency</span><div class="kpi-icon-box"><span class="material-symbols-outlined">speed</span></div></div>
            <div class="kpi-value">1.4s</div>
            <div><span class="kpi-delta-chip positive">Sub-2s SLA</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Items Needing Correction</span><div class="kpi-icon-box"><span class="material-symbols-outlined">edit_note</span></div></div>
            <div class="kpi-value">5.8%</div>
            <div><span class="kpi-delta-chip neutral">Mainly handwritten slips</span></div>
          </div>
        </div>

        <!-- OCR Inspection Queue -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">find_in_page</span>
              <span>Recent Uploaded Invoices & Extraction Review</span>
            </div>
            <span class="badge neutral">${StoreBI_Data.ocrQueue.length} Samples</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${StoreBI_Data.ocrQueue.map(item => `
              <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; background: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="font-mono" style="font-weight: 700;">${item.id}</span>
                      <span class="badge ${item.status === 'auto_approved' ? 'success' : item.status === 'needs_manual_review' ? 'warning' : 'danger'}">
                        ${item.status === 'auto_approved' ? 'Auto Approved' : item.status === 'needs_manual_review' ? 'Needs Review' : 'Extraction Failed'}
                      </span>
                    </div>
                    <div style="font-size: 15px; font-weight: 600; margin-top: 4px;">${item.shopName}</div>
                    <div style="font-size: 12px; color: var(--text-medium);">${item.invoiceType} • Supplier: <strong>${item.supplier}</strong></div>
                  </div>
                  <div style="text-align: right;">
                    <div class="font-mono" style="font-size: 18px; font-weight: 700; color: var(--primary);">${item.formattedAmount}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${item.processingDuration} • ${item.confidence}% confidence</div>
                  </div>
                </div>

                ${item.status === 'failed' ? `
                  <div style="padding: 10px 14px; background: var(--red-bg); color: var(--red-text); border-radius: var(--radius-sm); font-size: 12.5px; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>Error Reason:</strong> ${item.failureReason}</span>
                    <button class="btn-secondary btn-sm" onclick="StoreBI_App.retryOcr('${item.id}')">Retry Gemini Vision</button>
                  </div>
                ` : `
                  <!-- Extracted Sample Items -->
                  <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: 10px 12px;">
                    <div style="font-size: 11.5px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Extracted Line Items Preview (${item.itemsExtracted} items):</div>
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12.5px;">
                      ${(item.extractedSample || []).map(line => `
                        <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed var(--border);">
                          <span>${line.name} (Qty: <strong>${line.qty}</strong>)</span>
                          <span class="font-mono">Cost: ₹${line.cost} | MRP: ₹${line.mrp}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
                    <button class="btn-secondary btn-sm" onclick="StoreBI_App.inspectInvoiceRaw('${item.id}')">Inspect Raw Slip</button>
                    <button class="btn-primary btn-sm" onclick="StoreBI_App.approveOcrExtraction('${item.id}')">Approve & Push to Inventory</button>
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function retryOcr(ocrId) {
    recordAudit("Triggered AI OCR re-processing with high-contrast filter", ocrId);
    showToast("info", "Reprocessing OCR", `Applying OpenCV deskew & retrying Gemini 2.5 Flash for ${ocrId}...`);
    setTimeout(() => {
      showToast("success", "OCR Extracted", "Extracted 8 items with 91.2% confidence.");
    }, 1500);
  }

  function approveOcrExtraction(ocrId) {
    recordAudit("Manually approved OCR invoice items", ocrId);
    showToast("success", "Inventory Updated", `Pushed extracted line items from ${ocrId} to merchant catalog.`);
  }

  function inspectInvoiceRaw(ocrId) {
    showToast("info", "Raw Invoice Viewer", `Opening distributor slip photo for ${ocrId}...`);
  }

  // ============================================================================
  // MODULE 6: ANALYTICS & PRODUCT USAGE
  // ============================================================================
  function renderAnalyticsView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Product Analytics & Feature Funnel</span>
              <span class="badge active">Cohort Analytics</span>
            </div>
            <p class="page-subtitle">Feature adoption, DAU/WAU ratios, retail onboarding conversion drop-offs, and client devices</p>
          </div>
          <button class="btn-secondary" onclick="StoreBI_App.exportAnalyticsReport()">
            <span class="material-symbols-outlined">download</span>
            <span>Export Analytics PDF</span>
          </button>
        </div>

        <!-- Feature Adoption Bars -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">tune</span>
              <span>Feature Adoption Rates Across 28 Tenant Stores</span>
            </div>
            <span class="badge success">POS Billing Highest</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div style="padding: 14px; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 6px;">
                <span>1. POS Quick Billing</span>
                <span class="font-mono" style="color: var(--primary);">88% (25 shops)</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                <div style="width: 88%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
              </div>
            </div>

            <div style="padding: 14px; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 6px;">
                <span>2. Inventory Stock Tracking</span>
                <span class="font-mono" style="color: var(--primary);">76% (21 shops)</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                <div style="width: 76%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
              </div>
            </div>

            <div style="padding: 14px; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 6px;">
                <span>3. Upload Bills / AI OCR</span>
                <span class="font-mono" style="color: var(--primary);">64% (18 shops)</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                <div style="width: 64%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
              </div>
            </div>

            <div style="padding: 14px; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 6px;">
                <span>4. Expiry Date Alerts</span>
                <span class="font-mono" style="color: var(--primary);">52% (Pharma & Sweets)</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                <div style="width: 52%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
              </div>
            </div>

            <div style="padding: 14px; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 6px;">
                <span>5. AI Retail Insights</span>
                <span class="font-mono" style="color: var(--primary);">41% (12 shops)</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                <div style="width: 41%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
              </div>
            </div>

            <div style="padding: 14px; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 6px;">
                <span>6. GSTR-1 Tax Export</span>
                <span class="font-mono" style="color: var(--primary);">35% (GST Stores)</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                <div style="width: 35%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Onboarding Conversion Funnel -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin-bottom: 24px;">
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span class="material-symbols-outlined" style="color: var(--primary);">filter_alt</span>
                <span>Retail Onboarding Funnel</span>
              </div>
              <span class="badge neutral">24.6% Conversion</span>
            </div>
            <div id="chart-onboarding-funnel"></div>
          </div>

          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <span class="material-symbols-outlined" style="color: var(--primary);">devices</span>
                <span>Tenant Hardware & OS Distribution</span>
              </div>
              <span class="badge neutral">Telemetry</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Android Mobile / Tablet App</span>
                  <span class="font-mono" style="font-weight: 600;">68%</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--bg-subtle); border-radius: 4px;">
                  <div style="width: 68%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Desktop Chrome (Counter PC)</span>
                  <span class="font-mono" style="font-weight: 600;">24%</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--bg-subtle); border-radius: 4px;">
                  <div style="width: 24%; height: 100%; background: var(--mint); border-radius: 4px;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Sunmi / Posiflex Dedicated Terminal</span>
                  <span class="font-mono" style="font-weight: 600;">8%</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--bg-subtle); border-radius: 4px;">
                  <div style="width: 8%; height: 100%; background: var(--blue); border-radius: 4px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAnalyticsCharts() {
    const funnelSteps = [
      { name: "1. Landed on Store BI Homepage", value: 10400 },
      { name: "2. Created Free Trial Account", value: 1428 },
      { name: "3. Added Inventory SKUs", value: 1240 },
      { name: "4. Recorded First Live POS Sale", value: 1080 },
      { name: "5. Converted to Paid Subscription", value: 352 }
    ];
    StoreBI_Charts.renderFunnel("chart-onboarding-funnel", funnelSteps);
  }

  // ============================================================================
  // MODULE 7: AI INSIGHT MONITORING
  // ============================================================================
  function renderAiInsightsView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>AI Insight & Token Cost Telemetry</span>
              <span class="badge active">Google Gemini API</span>
            </div>
            <p class="page-subtitle">Token consumption, API cost per tenant, recommendation accuracy feedback, and prompt safety</p>
          </div>
          <button class="btn-primary" onclick="StoreBI_App.refreshData()">
            <span class="material-symbols-outlined">refresh</span>
            <span>Refresh Costs</span>
          </button>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Month's Total API Cost</span><div class="kpi-icon-box"><span class="material-symbols-outlined">attach_money</span></div></div>
            <div class="kpi-value">₹4,280</div>
            <div><span class="kpi-delta-chip positive">₹0.14 per store/day</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Total AI Prompts Evaluated</span><div class="kpi-icon-box"><span class="material-symbols-outlined">psychology</span></div></div>
            <div class="kpi-value">31,450</div>
            <div><span class="kpi-delta-chip positive">+24% velocity</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Merchant Feedback Score</span><div class="kpi-icon-box"><span class="material-symbols-outlined">thumb_up</span></div></div>
            <div class="kpi-value">96.8% 👍</div>
            <div><span class="kpi-delta-chip positive">High satisfaction</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">API Error Rate</span><div class="kpi-icon-box"><span class="material-symbols-outlined">shield</span></div></div>
            <div class="kpi-value">0.02%</div>
            <div><span class="kpi-delta-chip positive">Below threshold</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">assessment</span>
              <span>AI Insight Consumption by Tenant Store</span>
            </div>
            <span class="badge neutral">Top Token Consumers</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Category</th>
                  <th>Plan Tier</th>
                  <th>OCR Calls</th>
                  <th>Recommendation Queries</th>
                  <th>Est. Cost</th>
                  <th>Usage Cap Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Maratha Bazaar Wholesale</strong></td>
                  <td>Kirana</td>
                  <td>Super Kirana</td>
                  <td class="font-mono">142</td>
                  <td class="font-mono">310</td>
                  <td class="font-mono" style="font-weight: 600;">₹42.50</td>
                  <td><span class="badge success">Within Limit (18%)</span></td>
                </tr>
                <tr>
                  <td><strong>Geeta Medical Hall</strong></td>
                  <td>Medical</td>
                  <td>Pro Retailer</td>
                  <td class="font-mono">110</td>
                  <td class="font-mono">245</td>
                  <td class="font-mono" style="font-weight: 600;">₹33.80</td>
                  <td><span class="badge success">Within Limit (22%)</span></td>
                </tr>
                <tr>
                  <td><strong>Sanjivani Medical</strong></td>
                  <td>Medical</td>
                  <td>Pro Retailer</td>
                  <td class="font-mono">94</td>
                  <td class="font-mono">180</td>
                  <td class="font-mono" style="font-weight: 600;">₹26.40</td>
                  <td><span class="badge success">Within Limit (17%)</span></td>
                </tr>
                <tr>
                  <td><strong>Prapti Kirana & Superstore</strong></td>
                  <td>Kirana</td>
                  <td>Pro Retailer</td>
                  <td class="font-mono">48</td>
                  <td class="font-mono">120</td>
                  <td class="font-mono" style="font-weight: 600;">₹16.20</td>
                  <td><span class="badge success">Within Limit (10%)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // MODULE 8: SUPPORT & FEEDBACK
  // ============================================================================
  function renderSupportView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Merchant Support & Tickets Inbox</span>
              <span class="badge active">${StoreBI_Data.tickets.filter(t => t.status === 'open').length} Open Tickets</span>
            </div>
            <p class="page-subtitle">Hardware troubleshooting, printer setup, barcode configuration, and merchant feature requests</p>
          </div>
          <button class="btn-primary" onclick="StoreBI_App.openNewTicketModal()">
            <span class="material-symbols-outlined">add</span>
            <span>Create Internal Ticket</span>
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Store & Contact</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.tickets.map(t => `
                  <tr>
                    <td class="font-mono" style="font-weight: 700;">${t.id}</td>
                    <td>
                      <div style="font-weight: 600;">${t.shopName}</div>
                      <div class="font-mono" style="font-size: 11px; color: var(--text-muted);">${t.owner} • ${t.phone}</div>
                    </td>
                    <td>
                      <div style="font-weight: 500;">${t.subject}</div>
                      <div style="font-size: 11.5px; color: var(--text-muted);">${t.createdAt}</div>
                    </td>
                    <td><span class="badge neutral">${t.theme}</span></td>
                    <td>
                      <span class="badge ${t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'neutral'}">
                        ${t.priority.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${t.status === 'open' ? 'warning' : t.status === 'in_progress' ? 'active' : 'neutral'}">
                        ${t.status === 'open' ? 'Open' : t.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                      </span>
                    </td>
                    <td>${t.assignee}</td>
                    <td style="text-align: right;">
                      <button class="btn-secondary btn-sm" onclick="StoreBI_App.openTicketDetail('${t.id}')">Respond</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function openTicketDetail(ticketId) {
    const ticket = StoreBI_Data.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    openModal({
      title: `${ticket.id}: ${ticket.subject}`,
      bodyHtml: `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 12.5px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
            <span>Merchant: <strong>${ticket.shopName}</strong> (${ticket.owner} • ${ticket.phone})</span>
            <span class="badge ${ticket.priority === 'high' ? 'danger' : 'warning'}">${ticket.priority.toUpperCase()} PRIORITY</span>
          </div>

          <div style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 4px;">
            ${ticket.messages.map(m => `
              <div style="padding: 10px 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 13px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                  <strong>${m.sender}</strong>
                  <span>${m.time}</span>
                </div>
                <div>${m.text}</div>
              </div>
            `).join('')}
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Use Canned Quick Reply:</label>
            <select id="canned-reply-select" class="select-filter" style="width: 100%; margin-top: 4px; margin-bottom: 8px;" onchange="StoreBI_App.applyCannedReply(this.value)">
              <option value="">-- Choose canned response template --</option>
              <option value="printer">Thermal Printer: Check Paper Roll & Baud Rate (9600)</option>
              <option value="scanner">Barcode Gun: Enable USB HID Keyboard Wedge Mode</option>
              <option value="payment">UPI AutoPay Setup & Mandate Verification Steps</option>
            </select>
            <textarea id="ticket-reply-textarea" rows="3" class="table-search-input" style="width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; font-size: 13px;" placeholder="Write reply to merchant (will be sent via WhatsApp & SMS)..."></textarea>
          </div>
        </div>
      `,
      footerButtons: `
        <button class="btn-secondary" onclick="StoreBI_App.closeModal()">Close</button>
        <button class="btn-primary" onclick="StoreBI_App.sendTicketReply('${ticket.id}')">Send WhatsApp Reply</button>
      `
    });
  }

  function applyCannedReply(type) {
    const textarea = document.getElementById("ticket-reply-textarea");
    if (!textarea) return;
    if (type === "printer") {
      textarea.value = "Namaste! Please ensure the thermal roll is inserted with the shiny side touching the heating element. If connected via USB, verify Windows device manager shows 'USB-Printing Support'.";
    } else if (type === "scanner") {
      textarea.value = "Namaste! Please scan the 'USB HID Mode' barcode from your scanner user manual to ensure it types directly into the Store BI search bar.";
    } else if (type === "payment") {
      textarea.value = "Namaste! Your UPI AutoPay mandate can be authenticated directly in PhonePe / Google Pay under 'Autopay' section. No OTP required for future monthly renewals.";
    }
  }

  function sendTicketReply(ticketId) {
    const textarea = document.getElementById("ticket-reply-textarea");
    if (!textarea || !textarea.value.trim()) return;

    recordAudit(`Sent reply to merchant support ticket`, ticketId);
    showToast("success", "Reply Dispatched", `Sent WhatsApp & Email response for ${ticketId}.`);
    closeModal();
  }

  // ============================================================================
  // MODULE 9: COMMUNICATION (BROADCASTS)
  // ============================================================================
  function renderCommunicationView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Broadcast Communications</span>
              <span class="badge active">WhatsApp Business API</span>
            </div>
            <p class="page-subtitle">Send targeted platform announcements, festive tips, feature launch notices, and payment reminders</p>
          </div>
          <button class="btn-primary" onclick="StoreBI_App.openNewBroadcastModal()">
            <span class="material-symbols-outlined">campaign</span>
            <span>Compose New Broadcast</span>
          </button>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">history</span>
              <span>Past Broadcast Campaigns</span>
            </div>
            <span class="badge neutral">${StoreBI_Data.broadcasts.length} Dispatched</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${StoreBI_Data.broadcasts.map(b => `
              <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 15px; font-weight: 600; color: var(--text-high);">${b.title}</div>
                  <div style="font-size: 12.5px; color: var(--text-medium); margin-top: 4px;">
                    Target: <strong>${b.targetSegment}</strong> • Channel: <span class="badge neutral">${b.channel}</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                  <div style="text-align: right;">
                    <div class="font-mono" style="font-size: 16px; font-weight: 700; color: var(--mint-text);">${b.readRate} Read</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${b.deliveredCount} delivered • ${b.sentDate}</div>
                  </div>
                  <button class="btn-secondary btn-sm" onclick="StoreBI_App.resendBroadcast('${b.id}')">Resend</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function resendBroadcast(id) {
    recordAudit("Re-dispatched broadcast campaign", id);
    showToast("success", "Broadcast Dispatched", `Campaign ${id} sent to target merchant segment.`);
  }

  // ============================================================================
  // MODULE 10: CONFIG & CONTENT (CATALOG TEMPLATES & FEATURE FLAGS)
  // ============================================================================
  function renderConfigView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Configuration & Retail Starter Catalogs</span>
              <span class="badge neutral">Platform Config</span>
            </div>
            <p class="page-subtitle">Pre-seeded Indian retail item templates (Kirana, Pharma, Footwear, Sweets), GST defaults, and feature flags</p>
          </div>
          <button class="btn-primary" onclick="StoreBI_App.savePlatformConfig()">
            <span class="material-symbols-outlined">save</span>
            <span>Save Settings</span>
          </button>
        </div>

        <!-- Catalog Templates -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">inventory_2</span>
              <span>1-Click Retail Starter Catalogs (Seeded for New Stores)</span>
            </div>
            <span class="badge neutral">5 Master Templates</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
            ${StoreBI_Data.catalogTemplates.map(cat => `
              <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; background: var(--bg-card); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="material-symbols-outlined" style="color: var(--primary);">${cat.icon}</span>
                      <h4 style="font-size: 15px; font-weight: 700;">${cat.category}</h4>
                    </div>
                    <span class="font-mono badge neutral">${cat.itemCount} SKUs</span>
                  </div>
                  <p style="font-size: 12.5px; color: var(--text-medium); line-height: 1.5; margin-bottom: 10px;">${cat.description}</p>
                  <div style="font-size: 11.5px; color: var(--text-muted);">
                    <strong>Pre-configured Brands:</strong> ${cat.popularBrands}
                  </div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
                  <button class="btn-secondary btn-sm" onclick="StoreBI_App.editCatalogTemplate('${cat.category}')">Edit Template</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- GST & Indian Tax Slab Configuration -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">percent</span>
              <span>Indian GST Tax Slabs & Regional Defaults</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; font-size: 13px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Standard Kirana GST Slab</label>
              <select class="select-filter" style="width: 100%; margin-top: 4px;">
                <option selected>0% / 5% (Staples, Dal, Milk)</option>
                <option>12% / 18% (Packaged FMCG)</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Pharma GST Slabs</label>
              <select class="select-filter" style="width: 100%; margin-top: 4px;">
                <option selected>12% Standard Medicines</option>
                <option>5% Essential Life-saving</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Default Currency Symbol</label>
              <input type="text" class="table-search-input" value="₹ (INR)" style="border: 1px solid var(--border); padding: 6px 10px; border-radius: var(--radius-sm); margin-top: 4px;" readonly>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Number System Format</label>
              <input type="text" class="table-search-input" value="en-IN (Lakhs & Crores)" style="border: 1px solid var(--border); padding: 6px 10px; border-radius: var(--radius-sm); margin-top: 4px;" readonly>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function savePlatformConfig() {
    recordAudit("Updated platform GST and regional defaults", "System Config");
    showToast("success", "Configuration Saved", "Platform settings updated and cached.");
  }

  function editCatalogTemplate(category) {
    showToast("info", "Template Editor", `Opening master catalog editor for ${category}...`);
  }

  // ============================================================================
  // MODULE 11: SYSTEM HEALTH & LOGS
  // ============================================================================
  function renderSystemHealthView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>System Health & Audit Logs</span>
              <span class="badge active">99.98% Uptime</span>
            </div>
            <p class="page-subtitle">Server telemetry, SQLite database status, automated backups, error monitoring, and administrative audit trails</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-secondary" onclick="StoreBI_App.triggerManualBackup()">
              <span class="material-symbols-outlined">backup</span>
              <span>Trigger Manual S3 Backup</span>
            </button>
            <button class="btn-primary" onclick="StoreBI_App.pingHealthCheck()">
              <span class="material-symbols-outlined">speed</span>
              <span>Ping Latency</span>
            </button>
          </div>
        </div>

        <!-- Telemetry Status Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">API Ping Latency</span><div class="kpi-icon-box"><span class="material-symbols-outlined">network_check</span></div></div>
            <div class="kpi-value" id="health-latency-val">42 ms</div>
            <div><span class="kpi-delta-chip positive">Fast &lt; 50ms</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Platform Error Rate</span><div class="kpi-icon-box"><span class="material-symbols-outlined">bug_report</span></div></div>
            <div class="kpi-value">0.04%</div>
            <div><span class="kpi-delta-chip positive">Well within SLA</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Active Database Size</span><div class="kpi-icon-box"><span class="material-symbols-outlined">database</span></div></div>
            <div class="kpi-value">92 MB</div>
            <div><span class="kpi-delta-chip neutral">storebi.db</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top"><span class="kpi-label">Last Automated Snapshot</span><div class="kpi-icon-box"><span class="material-symbols-outlined">cloud_sync</span></div></div>
            <div class="kpi-value" style="font-size: 16px;">Today, 04:00 AM</div>
            <div><span class="kpi-delta-chip positive">Glacier Verified</span></div>
          </div>
        </div>

        <!-- Error Logs Inspector -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--red);">error_outline</span>
              <span>Recent Critical Server & API Error Logs</span>
            </div>
            <span class="badge danger">${StoreBI_Data.errorLogs.length} Events</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Severity</th>
                  <th>API Endpoint</th>
                  <th>Error Message</th>
                  <th>IP Address</th>
                  <th>Tenant</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.errorLogs.map(err => `
                  <tr>
                    <td class="font-mono" style="font-size: 12px;">${err.timestamp}</td>
                    <td>
                      <span class="badge ${err.severity === 'CRITICAL' ? 'danger' : 'warning'}">
                        ${err.severity}
                      </span>
                    </td>
                    <td class="font-mono" style="font-size: 12px; font-weight: 600;">${err.endpoint}</td>
                    <td style="font-size: 12.5px; color: var(--red-text);">${err.message}</td>
                    <td class="font-mono" style="font-size: 11px;">${err.ip}</td>
                    <td class="font-mono" style="font-size: 11px;">${err.shopId}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Audit Log Viewer -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">policy</span>
              <span>Administrative Audit Trail (Immutable)</span>
            </div>
            <button class="btn-secondary btn-sm" onclick="StoreBI_App.exportAuditCSV()">Export Audit Trail (CSV)</button>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Admin User</th>
                  <th>Action Executed</th>
                  <th>Target Resource</th>
                  <th>Timestamp</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.auditLogs.map(log => `
                  <tr>
                    <td class="font-mono" style="font-weight: 700;">${log.id}</td>
                    <td><strong>${log.admin}</strong></td>
                    <td>${log.action}</td>
                    <td class="font-mono" style="font-size: 12px;">${log.target}</td>
                    <td style="font-size: 12px;">${log.timestamp}</td>
                    <td class="font-mono" style="font-size: 11px;">${log.ip}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function pingHealthCheck() {
    const lat = Math.floor(32 + Math.random() * 18);
    const el = document.getElementById("health-latency-val");
    if (el) el.textContent = `${lat} ms`;
    showToast("success", "Ping OK", `Store BI FastAPI backend responded in ${lat}ms.`);
  }

  function triggerManualBackup() {
    recordAudit("Triggered manual SQLite S3 snapshot backup", "storebi.db");
    showToast("info", "Backup Initiated", "Creating compressed snapshot of storebi.db...");
    setTimeout(() => {
      showToast("success", "Backup Verified", "Snapshot (92.4MB) uploaded to secure cloud storage.");
    }, 1500);
  }

  // ============================================================================
  // MODULE 12: ADMIN USERS & SETTINGS
  // ============================================================================
  function renderAdminUsersView() {
    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <div class="page-title">
              <span>Admin Team & Role-Based Access</span>
              <span class="badge active">${state.currentUser.role} Active</span>
            </div>
            <p class="page-subtitle">Configure administrative access, staff roles, session timeouts, and DPDP Act compliance controls</p>
          </div>
          <button class="btn-primary" onclick="StoreBI_App.openInviteAdminModal()">
            <span class="material-symbols-outlined">person_add</span>
            <span>Invite Admin Staff</span>
          </button>
        </div>

        <!-- Role Simulator Switcher (For Pair Programming / Demo) -->
        <div class="card" style="background: var(--primary-light); border-color: var(--primary);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--primary);">Demo Role Switcher (RBAC Simulation)</div>
              <p style="font-size: 12.5px; color: var(--text-medium); margin-top: 2px;">
                Switch roles instantly to verify permission restrictions across Super Admin, Support, Finance, and Analyst.
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              ${StoreBI_Data.adminUsers.map(user => `
                <button class="btn-secondary btn-sm ${state.currentUser.email === user.email ? 'btn-primary' : ''}" onclick="StoreBI_App.switchRole('${user.email}')">
                  ${user.role}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Admin Team Table -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">group</span>
              <span>Platform Administrative Staff</span>
            </div>
            <span class="badge neutral">${StoreBI_Data.adminUsers.length} Team Members</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Admin Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>2FA Status</th>
                  <th>Last Session</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${StoreBI_Data.adminUsers.map(adm => `
                  <tr>
                    <td><strong>${adm.name}</strong></td>
                    <td class="font-mono">${adm.email}</td>
                    <td>
                      <span class="badge ${adm.role === 'Super Admin' ? 'active' : adm.role === 'Finance' ? 'warning' : 'neutral'}">
                        ${adm.role}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${adm.twoFactorEnabled ? 'success' : 'warning'}">
                        ${adm.twoFactorEnabled ? 'TOTP Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td style="font-size: 12px;">${adm.lastLogin}</td>
                    <td style="text-align: right;">
                      <button class="btn-secondary btn-sm" onclick="StoreBI_App.manageAdminSecurity('${adm.id}')">Permissions</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- DPDP Act 2023 Compliance Panel -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color: var(--primary);">gavel</span>
              <span>India DPDP Act (Digital Personal Data Protection) Compliance</span>
            </div>
            <span class="badge success">Compliant</span>
          </div>

          <div style="font-size: 13px; line-height: 1.6; color: var(--text-medium);">
            Store BI strictly complies with the Digital Personal Data Protection (DPDP) Act:
            <ul style="margin: 10px 0 0 20px; display: flex; flex-direction: column; gap: 6px;">
              <li><strong>Merchant Data Portability:</strong> 1-click full JSON & CSV data export per tenant.</li>
              <li><strong>Right to be Forgotten:</strong> Double-confirmed cryptographic erasure of shop ledgers.</li>
              <li><strong>Audit Logging:</strong> All staff access to merchant records is permanently recorded with IP and timestamp.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function switchRole(email) {
    const user = StoreBI_Data.adminUsers.find(u => u.email === email);
    if (!user) return;
    state.currentUser = user;
    recordAudit(`Switched active administrative role to ${user.role}`, user.email);
    showToast("info", "Role Switched", `Now operating as ${user.name} (${user.role}).`);
    renderModule("admin-users");
  }

  function manageAdminSecurity(id) {
    showToast("info", "Security Settings", `Opening permission matrix for ${id}...`);
  }

  // ============================================================================
  // GLOBAL SEARCH (⌘K / Ctrl+K)
  // ============================================================================
  function setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openGlobalSearch();
      }
      if (e.key === "Escape") {
        closeGlobalSearch();
        closeShopDrawer();
        closeModal();
      }
    });
  }

  function openGlobalSearch() {
    const backdrop = document.getElementById("search-modal-backdrop");
    const input = document.getElementById("global-search-input");
    if (backdrop) backdrop.classList.add("active");
    if (input) {
      input.value = "";
      input.focus();
      handleGlobalSearchInput("");
    }
  }

  function closeGlobalSearch() {
    const backdrop = document.getElementById("search-modal-backdrop");
    if (backdrop) backdrop.classList.remove("active");
  }

  function handleGlobalSearchInput(query) {
    const resultsContainer = document.getElementById("search-results-list");
    if (!resultsContainer) return;

    if (!query.trim()) {
      resultsContainer.innerHTML = `
        <div class="search-result-group">Quick Module Navigation</div>
        <div class="search-result-item" onclick="StoreBI_App.navigateTo('dashboard'); StoreBI_App.closeGlobalSearch();">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="material-symbols-outlined" style="color: var(--primary);">grid_view</span>
            <strong>Platform Dashboard Overview</strong>
          </div>
          <span class="badge neutral">Module</span>
        </div>
        <div class="search-result-item" onclick="StoreBI_App.navigateTo('shops'); StoreBI_App.closeGlobalSearch();">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="material-symbols-outlined" style="color: var(--primary);">storefront</span>
            <strong>Tenant Shops Directory</strong>
          </div>
          <span class="badge neutral">Module</span>
        </div>
        <div class="search-result-item" onclick="StoreBI_App.navigateTo('subscriptions'); StoreBI_App.closeGlobalSearch();">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="material-symbols-outlined" style="color: var(--primary);">sell</span>
            <strong>Subscriptions & Pricing Engine</strong>
          </div>
          <span class="badge neutral">Module</span>
        </div>
      `;
      return;
    }

    const q = query.toLowerCase();
    const matchedShops = state.shops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );

    if (matchedShops.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state-strip">
          <span class="material-symbols-outlined">search_off</span>
          <span>No stores, owners, or IDs matched "${query}".</span>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = `
      <div class="search-result-group">Matched Stores (${matchedShops.length})</div>
      ${matchedShops.map(s => `
        <div class="search-result-item" onclick="StoreBI_App.openShopDrawer('${s.id}'); StoreBI_App.closeGlobalSearch();">
          <div>
            <div style="font-weight: 600; color: var(--primary);">${s.name}</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">${s.ownerName} • ${s.phone} • ${s.city}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge neutral">${s.category}</span>
            ${renderStatusBadge(s.status, s.trialDaysLeft)}
          </div>
        </div>
      `).join('')}
    `;
  }

  // ============================================================================
  // GENERIC MODAL CONTROLLER
  // ============================================================================
  function openModal({ title, bodyHtml, footerButtons }) {
    const backdrop = document.getElementById("generic-modal-backdrop");
    const titleEl = document.getElementById("generic-modal-title");
    const bodyEl = document.getElementById("generic-modal-body");
    const footerEl = document.getElementById("generic-modal-footer");

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    if (footerEl) footerEl.innerHTML = footerButtons;
    if (backdrop) backdrop.classList.add("active");
  }

  function closeModal() {
    const backdrop = document.getElementById("generic-modal-backdrop");
    if (backdrop) backdrop.classList.remove("active");
  }

  function openConfirmationModal({ title, message, confirmText, isDestructive, onConfirm }) {
    openModal({
      title: title,
      bodyHtml: `<p style="font-size: 13.5px; line-height: 1.6; color: var(--text-high);">${message}</p>`,
      footerButtons: `
        <button class="btn-secondary" onclick="StoreBI_App.closeModal()">Cancel</button>
        <button class="${isDestructive ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${confirmText || 'Confirm'}</button>
      `
    });

    const confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        closeModal();
        if (typeof onConfirm === "function") onConfirm();
      };
    }
  }

  function openPlanEditorModal(planId = "plan-pro") {
    const plan = StoreBI_Data.plans.find(p => p.id === planId) || StoreBI_Data.plans[1];
    openModal({
      title: `Configure Pricing Tier: ${plan.name}`,
      bodyHtml: `
        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
          <div>
            <label style="font-weight: 600; color: var(--text-medium);">Monthly Price (₹ INR)</label>
            <input type="number" id="edit-plan-monthly" class="table-search-input" style="border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); margin-top: 4px; width: 100%;" value="${plan.priceMonthlyPaise / 100}">
          </div>
          <div>
            <label style="font-weight: 600; color: var(--text-medium);">Max Concurrent Billing Terminals</label>
            <input type="number" id="edit-plan-counters" class="table-search-input" style="border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); margin-top: 4px; width: 100%;" value="${plan.limits.counters}">
          </div>
          <div>
            <label style="font-weight: 600; color: var(--text-medium);">Monthly AI OCR Scans Included</label>
            <input type="number" id="edit-plan-ocr" class="table-search-input" style="border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); margin-top: 4px; width: 100%;" value="${plan.limits.ocrScans}">
          </div>
        </div>
      `,
      footerButtons: `
        <button class="btn-secondary" onclick="StoreBI_App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="StoreBI_App.savePlanChanges('${plan.id}')">Save Changes</button>
      `
    });
  }

  function savePlanChanges(planId) {
    const monthlyInput = document.getElementById("edit-plan-monthly");
    const plan = StoreBI_Data.plans.find(p => p.id === planId);
    if (plan && monthlyInput) {
      const newPrice = parseInt(monthlyInput.value) || 999;
      plan.priceMonthlyPaise = newPrice * 100;
      plan.formattedMonthly = `₹${newPrice}`;
      recordAudit(`Updated pricing tier ${plan.name} to ₹${newPrice}/mo`, plan.id);
      showToast("success", "Tier Updated", `${plan.name} price updated to ₹${newPrice}/mo.`);
      closeModal();
      renderModule("subscriptions");
    }
  }

  function openGstInvoiceModal(invId) {
    openModal({
      title: `Tax Invoice: ${invId}`,
      bodyHtml: `
        <div style="padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); font-size: 13px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--border); padding-bottom: 12px; margin-bottom: 12px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: var(--primary);">STORE BI INTELLIGENCE SYSTEMS</h3>
              <div>GSTIN: 27AABCS9988D1Z2</div>
              <div>Bavdhan, Pune, Maharashtra 411021</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; font-size: 16px;">ORIGINAL FOR RECIPIENT</div>
              <div class="font-mono">Invoice #: ${invId}</div>
              <div>Date: 15-Oct-2026</div>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>SAC Code:</strong> 998313 (Information technology software SaaS)<br/>
            <strong>Tax Breakdown:</strong> CGST 9% (₹76.19) + SGST 9% (₹76.19)<br/>
            <strong>Net Amount:</strong> ₹846.62 | <strong>Total Gross:</strong> ₹999.00
          </div>
        </div>
      `,
      footerButtons: `
        <button class="btn-secondary" onclick="StoreBI_App.closeModal()">Close</button>
        <button class="btn-primary" onclick="window.print()">Print / Download PDF</button>
      `
    });
  }

  function openCouponModal() {
    showToast("info", "Coupons Manager", "Opening promo codes and merchant discount engine...");
  }

  function openNewBroadcastModal() {
    openModal({
      title: "Compose Platform Broadcast",
      bodyHtml: `
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
          <div>
            <label style="font-weight: 600;">Announcement Headline</label>
            <input type="text" class="table-search-input" style="border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); margin-top: 4px; width: 100%;" placeholder="e.g. Diwali Weekend Multi-Counter Notice">
          </div>
          <div>
            <label style="font-weight: 600;">Target Merchant Segment</label>
            <select class="select-filter" style="width: 100%; margin-top: 4px;">
              <option>All Active & Trial Merchants (28 Stores)</option>
              <option>Trials Ending ≤ 48 Hours</option>
              <option>Kirana & Grocery Merchants Only</option>
            </select>
          </div>
          <div>
            <label style="font-weight: 600;">Message Body</label>
            <textarea rows="3" class="table-search-input" style="border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); margin-top: 4px; width: 100%;" placeholder="Write message to merchant..."></textarea>
          </div>
        </div>
      `,
      footerButtons: `
        <button class="btn-secondary" onclick="StoreBI_App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="StoreBI_App.sendBroadcastAction()">Send Announcement</button>
      `
    });
  }

  function sendBroadcastAction() {
    recordAudit("Dispatched platform broadcast announcement", "WhatsApp Broadcast");
    showToast("success", "Broadcast Queued", "Announcement queued for delivery to target merchants.");
    closeModal();
  }

  function openNewTicketModal() {
    showToast("info", "New Ticket", "Opening support ticket creation form...");
  }

  function openAddShopModal() {
    showToast("info", "Onboard Store", "Opening merchant onboarding wizard...");
  }

  function exportShopsCSV() {
    const headers = ["ShopID", "ShopName", "Owner", "Phone", "Email", "Category", "City", "State", "Plan", "Status", "MRR"];
    const rows = state.shops.map(s => [s.id, `"${s.name}"`, `"${s.ownerName}"`, s.phone, s.email, s.category, s.city, s.state, s.plan, s.status, s.mrr]);
    downloadCSV("storebi_tenant_shops.csv", [headers, ...rows]);
  }

  function exportPaymentsCSV() {
    const headers = ["TxnID", "ShopName", "Plan", "AmountINR", "Date", "Gateway", "Status", "GSTInvoice"];
    const rows = StoreBI_Data.payments.map(p => [p.id, `"${p.shopName}"`, p.plan, p.amount, `"${p.date}"`, p.gateway, p.status, p.gstInvoice]);
    downloadCSV("storebi_payments_ledger.csv", [headers, ...rows]);
  }

  function exportAuditCSV() {
    const headers = ["LogID", "Admin", "Action", "Target", "Timestamp", "IP"];
    const rows = StoreBI_Data.auditLogs.map(l => [l.id, `"${l.admin}"`, `"${l.action}"`, `"${l.target}"`, `"${l.timestamp}"`, l.ip]);
    downloadCSV("storebi_audit_logs.csv", [headers, ...rows]);
  }

  function exportPlatformSummary() {
    showToast("success", "Exporting Brief", "Compiling executive summary report (PDF)...");
  }

  function exportAnalyticsReport() {
    showToast("success", "Exporting Analytics", "Compiling cohort retention and usage metrics (PDF)...");
  }

  function downloadCSV(filename, rows) {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "CSV Downloaded", `Exported file: ${filename}`);
  }

  function refreshData() {
    showToast("info", "Refreshing", "Synchronizing telemetry with storebi.db...");
    setTimeout(() => {
      showToast("success", "Synchronized", "Live metrics up to date.");
      renderModule(state.currentModule);
    }, 400);
  }

  function updateNotificationBadge() {
    const countEl = document.getElementById("notification-count-badge");
    if (countEl) {
      countEl.style.display = state.notifications.length > 0 ? "block" : "none";
    }
  }

  function toggleNotifications() {
    openModal({
      title: "Platform Alerts & System Notifications",
      bodyHtml: `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${state.notifications.map(n => `
            <div style="padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 13px; display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-outlined filled" style="color: ${n.type === 'critical' ? 'var(--red)' : n.type === 'warning' ? 'var(--amber)' : 'var(--primary)'};">${n.type === 'critical' ? 'error' : n.type === 'warning' ? 'warning' : 'info'}</span>
              <div style="flex: 1;">
                <div>${n.text}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${n.time}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `,
      footerButtons: `<button class="btn-primary" onclick="StoreBI_App.closeModal()">Mark All as Read</button>`
    });
  }

  function setupEventListeners() {
    // Topbar Search input trigger
    const searchBtn = document.getElementById("topbar-search-trigger");
    if (searchBtn) searchBtn.addEventListener("click", openGlobalSearch);

    // Global Search Modal Input
    const modalInput = document.getElementById("global-search-input");
    if (modalInput) {
      modalInput.addEventListener("input", (e) => handleGlobalSearchInput(e.target.value));
    }
  }

  return {
    init,
    navigateTo,
    setTimeRange,
    toggleTheme,
    openGlobalSearch,
    closeGlobalSearch,
    openShopDrawer,
    closeShopDrawer,
    addShopSupportNote,
    extendShopTrial,
    toggleShopSuspension,
    impersonateShop,
    resetTenantPassword,
    confirmDeleteShop,
    openPlanEditorModal,
    savePlanChanges,
    openCouponModal,
    openNewBroadcastModal,
    sendBroadcastAction,
    resendBroadcast,
    openNewTicketModal,
    openTicketDetail,
    applyCannedReply,
    sendTicketReply,
    openAddShopModal,
    exportShopsCSV,
    exportPaymentsCSV,
    exportAuditCSV,
    exportPlatformSummary,
    exportAnalyticsReport,
    refreshData,
    toggleNotifications,
    handleSort,
    changePage,
    clearShopSearch,
    switchRole,
    manageAdminSecurity,
    pingHealthCheck,
    triggerManualBackup,
    retryPayment,
    sendWhatsAppPaymentLink,
    viewGstInvoice,
    resolveAnomaly,
    sendOnboardingNudge,
    retryOcr,
    approveOcrExtraction,
    inspectInvoiceRaw,
    savePlatformConfig,
    editCatalogTemplate,
    closeModal
  };
})();

// Bootstrap on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  StoreBI_App.init();
});
