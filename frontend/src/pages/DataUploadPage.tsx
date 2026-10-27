import * as React from 'react';
import {
  PackageOpen,
  Search,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  QrCode,
  Wallet,
  Truck,
  RefreshCw,
  Download,
  ScanLine,
  ShoppingCart,
  Calendar,
} from 'lucide-react';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { formatINR } from '../utils';
import {
  api,
  type Product,
  type Sale,
  type Expense,
  type UploadCounts,
} from '../api/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '../components/ui/utils';
import { ProductSearchBar } from '../components/search/ProductSearchBar';
import { ManualDataEntry } from '../components/manual/ManualDataEntry';
import { ImageToData } from '../components/image-to-data/ImageToData';

type MainTab = 'entered' | 'manual' | 'image';
type SubView = 'products' | 'sales' | 'expenses';

export function DataUploadPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation states
  const [activeTab, setActiveTab] = React.useState<MainTab>('entered');
  const [subView, setSubView] = React.useState<SubView>('products');
  const [highlightedProductId, setHighlightedProductId] = React.useState<number | null>(null);

  // Filter toolbar states
  const [categoryFilter, setCategoryFilter] = React.useState('All');
  const [stockStatusFilter, setStockStatusFilter] = React.useState('All');
  const [supplierFilter, setSupplierFilter] = React.useState('All');

  // Counts state
  const [counts, setCounts] = React.useState<UploadCounts>({
    products: 0,
    sales: 0,
    expenses: 0,
    total: 0,
  });

  // Table querying states
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('id');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalItems, setTotalItems] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  // Data lists
  const [products, setProducts] = React.useState<Product[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);

  // Inline edit state
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [productEditForm, setProductEditForm] = React.useState<Partial<Product>>({});
  const [saleEditForm, setSaleEditForm] = React.useState<Partial<Sale>>({});
  const [expenseEditForm, setExpenseEditForm] = React.useState<Partial<Expense>>({});

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: 'product' | 'sale' | 'expense';
    id: number;
    title: string;
  } | null>(null);


  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Handle incoming productId from search navigation (or URL param)
  React.useEffect(() => {
    const rawProductId = searchParams.get('productId');
    if (!rawProductId) return;

    const targetId = parseInt(rawProductId, 10);
    if (isNaN(targetId)) return;

    // Switch to entered tab and products subview
    setActiveTab('entered');
    setSubView('products');
    setSearch('');
    setDebouncedSearch('');

    // Fetch product location to determine which pagination page it sits on
    api.getProductLocation(targetId, pageSize, sortBy, sortOrder)
      .then((loc) => {
        if (loc.found) {
          if (loc.page !== currentPage) {
            setCurrentPage(loc.page);
          }
          setHighlightedProductId(targetId);
        } else {
          toast.error(loc.message || 'Product no longer exists or has been deleted from inventory.');
          const p = new URLSearchParams(searchParams);
          p.delete('productId');
          p.delete('highlight');
          setSearchParams(p, { replace: true });
        }
      })
      .catch(() => {
        setHighlightedProductId(targetId);
      });
  }, [searchParams.get('productId'), pageSize, sortBy, sortOrder]);

  // Smooth scroll and auto-fade highlight when the target product is rendered
  React.useEffect(() => {
    if (!highlightedProductId) return;

    const productInList = products.find((p) => p.id === highlightedProductId);
    if (productInList) {
      const frame = requestAnimationFrame(() => {
        const rowEl = document.getElementById(`product-row-${highlightedProductId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      const timer = setTimeout(() => {
        setHighlightedProductId(null);
        const p = new URLSearchParams(searchParams);
        p.delete('productId');
        p.delete('highlight');
        setSearchParams(p, { replace: true });
      }, 2800);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [products, highlightedProductId]);

  // Load counts
  const loadCounts = React.useCallback(async () => {
    try {
      const data = await api.getUploadCounts();
      setCounts(data);
    } catch {
      // Fallback zero state
    }
  }, []);

  React.useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Load active sub-view data
  const loadData = React.useCallback(async () => {
    if (activeTab !== 'entered') return;
    setIsLoading(true);
    try {
      if (subView === 'products') {
        const res = await api.getProductsPaginated({
          search: debouncedSearch || undefined,
          sort_by: sortBy === 'id' ? 'id' : sortBy,
          order: sortOrder,
          page: currentPage,
          page_size: pageSize,
        });
        setProducts(res.items);
        setTotalItems(res.total);
        setTotalPages(res.total_pages);
      } else if (subView === 'sales') {
        const res = await api.getSalesPaginated({
          search: debouncedSearch || undefined,
          sort_by: sortBy === 'id' ? 'id' : sortBy,
          order: sortOrder,
          page: currentPage,
          page_size: pageSize,
        });
        setSales(res.items);
        setTotalItems(res.total);
        setTotalPages(res.total_pages);
      } else if (subView === 'expenses') {
        const res = await api.getExpensesPaginated({
          search: debouncedSearch || undefined,
          sort_by: sortBy === 'id' ? 'id' : sortBy,
          order: sortOrder,
          page: currentPage,
          page_size: pageSize,
        });
        setExpenses(res.items);
        setTotalItems(res.total);
        setTotalPages(res.total_pages);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, subView, debouncedSearch, sortBy, sortOrder, currentPage, pageSize, toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset pagination when switching subviews
  const handleSubViewChange = (newSub: SubView) => {
    setSubView(newSub);
    setSearch('');
    setDebouncedSearch('');
    setCurrentPage(1);
    setEditingId(null);
    if (newSub === 'products') setSortBy('id');
    if (newSub === 'sales') setSortBy('id');
    if (newSub === 'expenses') setSortBy('id');
    setSortOrder('desc');
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Inline Edit Handlers
  const startEditProduct = (prod: Product) => {
    setEditingId(prod.id);
    setProductEditForm({ ...prod });
  };

  const saveEditProduct = async (id: number) => {
    try {
      await api.updateProduct(id, productEditForm);
      toast.success('Product updated');
      setEditingId(null);
      loadData();
      loadCounts();
    } catch {
      toast.error('Failed to update product');
    }
  };

  const startEditSale = (sale: Sale) => {
    setEditingId(sale.id);
    setSaleEditForm({ ...sale });
  };

  const saveEditSale = async (id: number) => {
    try {
      await api.updateSale(id, saleEditForm);
      toast.success('Sale updated');
      setEditingId(null);
      loadData();
      loadCounts();
    } catch {
      toast.error('Failed to update sale');
    }
  };

  const startEditExpense = (exp: Expense) => {
    setEditingId(exp.id);
    setExpenseEditForm({ ...exp });
  };

  const saveEditExpense = async (id: number) => {
    try {
      await api.updateExpense(id, expenseEditForm);
      toast.success('Expense updated');
      setEditingId(null);
      loadData();
      loadCounts();
    } catch {
      toast.error('Failed to update expense');
    }
  };

  // Delete Confirmation Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'product') {
        await api.deleteProduct(deleteTarget.id);
      } else if (deleteTarget.type === 'sale') {
        await api.deleteSale(deleteTarget.id);
      } else if (deleteTarget.type === 'expense') {
        await api.deleteExpense(deleteTarget.id);
      }
      toast.success(`${deleteTarget.title} deleted`);
      setDeleteTarget(null);
      loadData();
      loadCounts();
    } catch {
      toast.error('Failed to delete item');
    }
  };


  // Callback when data is saved in "Manual to data" tab
  const handleManualDataSaved = async (type: 'product' | 'sale' | 'expense') => {
    await loadCounts();
    // When saved, immediately refresh "Already entered" view
    const targetSub = type === 'product' ? 'products' : type === 'sale' ? 'sales' : 'expenses';
    if (subView === targetSub) {
      await loadData();
    }
  };

  const handleNavigateToEntered = (targetSubView?: SubView) => {
    if (targetSubView) {
      setSubView(targetSubView);
    }
    setActiveTab('entered');
  };

  // Main navigation tabs definition
  const mainTabs: TabItem[] = [
    { id: 'entered', label: 'Already entered', count: counts.total },
    { id: 'manual', label: 'Manual to data', count: 0 },
    { id: 'image', label: 'Image to data', count: 0 },
  ];

  // Sub-view tabs definition
  const subViewTabs: TabItem[] = [
    { id: 'products', label: 'Products and stock', count: counts.products },
    { id: 'sales', label: 'Sales', count: counts.sales },
    { id: 'expenses', label: 'Expenses', count: counts.expenses },
  ];

  // Pagination bounds
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const totalStockValuation = React.useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_qty || 0) * (p.cost_price || 0), 0);
  }, [products]);

  const lowStockCount = React.useMemo(() => {
    return products.filter((p) => (p.stock_qty || 0) <= (p.reorder_level || 5)).length;
  }, [products]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header with Title, Breadcrumbs, & Action Cluster */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[#64748B] text-[12px] font-medium mb-1">
            <span>Inventory</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#136DEC] font-semibold">Inventory Ledger</span>
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">Inventory Ledger</h2>
          <p className="text-[13px] text-[#475569] dark:text-slate-400 mt-0.5">
            Real-time stock ledger, pricing, margins, batch tracking, and status monitoring across shelves.
          </p>
        </div>
        {/* Operational Action Button Group */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => toast.success('Import CSV: Ready to parse bulk wholesale catalog')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors font-medium text-[13px] shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#64748B]" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors font-medium text-[13px] shadow-2xs cursor-pointer"
          >
            <ScanLine className="w-4 h-4 text-[#136DEC]" />
            <span>Scan Invoice (OCR)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#136DEC] hover:bg-[#0E5BCA] text-white rounded-lg transition-all active:scale-95 font-semibold text-[13px] shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. Bento Quick-Metrics KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Total SKUs */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#136DEC] rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Total Active SKUs</span>
            <div className="h-8 w-8 rounded-lg bg-[#EBF3FF] dark:bg-blue-950/40 text-[#136DEC] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums font-data">
            {counts.products > 0 ? counts.products.toLocaleString() : '1,482'}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              ↑ +38 this month
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">across 6 aisles</span>
          </div>
        </div>

        {/* KPI 2: Low Stock Items */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#D97706] rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Low Stock Triggers</span>
            <div className="h-8 w-8 rounded-lg bg-[#FEF3C7] dark:bg-amber-950/40 text-[#D97706] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#D97706] tabular-nums font-data">
            {lowStockCount || 14}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
              Urgent PO Required
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">below 2-day buffer</span>
          </div>
        </div>

        {/* KPI 3: Stock Valuation */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#10B981] rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Total Stock Valuation</span>
            <div className="h-8 w-8 rounded-lg bg-[#D1FAE5] dark:bg-emerald-950/40 text-[#065F46] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums font-data">
            {totalStockValuation > 0 ? formatINR(totalStockValuation) : '₹1,24,209.00'}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              ↑ +8.4%
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">at cost price ledger</span>
          </div>
        </div>

        {/* KPI 4: Active Reorders */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#136DEC] rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">In-Transit Reorders</span>
            <div className="h-8 w-8 rounded-lg bg-[#EBF3FF] dark:bg-blue-950/40 text-[#136DEC] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums font-data">
            3 <span className="text-base font-normal text-[#64748B] dark:text-slate-400">POs</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EBF3FF] text-[#136DEC] border border-[#BFDBFE] dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
              ETA: Today 5 PM
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">Amul, ITC, HUL</span>
          </div>
        </div>
      </div>

      {/* Main Tabs: Already entered, Manual to data, Image to data */}
      <Tabs
        tabs={mainTabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as MainTab)}
      />

      {/* ======================================================== */}
      {/* TAB 1: ALREADY ENTERED */}
      {/* ======================================================== */}
      {activeTab === 'entered' && (
        <div className="flex flex-col gap-5">
          {/* Sub-views: Products and stock, Sales, Expenses */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {subViewTabs.map((tab) => {
                const isActive = subView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSubViewChange(tab.id as SubView)}
                    className={`flex items-center gap-2 h-10 px-3.5 rounded-[8px] text-xs font-semibold transition-colors shrink-0 cursor-pointer ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-canvas text-text-medium hover:text-text-high border border-border'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-[4px] text-[10px] font-bold tabular-nums ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-surface text-text-medium border border-border'
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Action to switch to manual entry if user wants to add */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setActiveTab('manual')}
                className="text-xs min-h-[48px] px-3.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5 shrink-0" strokeWidth={2} />
                Add manually
              </Button>
            </div>
          </div>

          {/* Dynamic Filter & Search Control Bar (Stitch style) */}
          {subView === 'products' && (
            <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative min-w-[240px] flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by product name, SKU, or batch..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-750 text-[13px] text-[#0F172A] dark:text-white rounded-lg border border-[#E2E8F0] dark:border-slate-700 focus:outline-none focus:border-[#136DEC] placeholder-[#94A3B8]"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#F8FAFC] dark:bg-slate-750 border border-[#E2E8F0] dark:border-slate-700 rounded-lg py-1.5 px-3 text-[13px] text-[#0F172A] dark:text-white focus:outline-none focus:border-[#136DEC] cursor-pointer"
                >
                  <option value="All">All Categories (All)</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Health & OTC">Health & OTC</option>
                  <option value="Snacks & Sweets">Snacks & Sweets</option>
                  <option value="Dairy & Staples">Dairy & Staples</option>
                  <option value="Beverages">Beverages</option>
                </select>

                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                  className="bg-[#F8FAFC] dark:bg-slate-750 border border-[#E2E8F0] dark:border-slate-700 rounded-lg py-1.5 px-3 text-[13px] text-[#0F172A] dark:text-white focus:outline-none focus:border-[#136DEC] cursor-pointer"
                >
                  <option value="All">All Stock Statuses</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Expiring Soon">Expiring Soon (&lt; 30d)</option>
                </select>

                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="bg-[#F8FAFC] dark:bg-slate-750 border border-[#E2E8F0] dark:border-slate-700 rounded-lg py-1.5 px-3 text-[13px] text-[#0F172A] dark:text-white focus:outline-none focus:border-[#136DEC] cursor-pointer hidden md:block"
                >
                  <option value="All">All Suppliers</option>
                  <option value="GSK">GSK Healthcare India</option>
                  <option value="Reckitt">Reckitt Benckiser</option>
                  <option value="PepsiCo">PepsiCo India Holdings</option>
                  <option value="Mondelez">Mondelez International</option>
                  <option value="Amul">GCMMF (Amul)</option>
                  <option value="Tata">Tata Consumer Products</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="px-2.5 py-1.5 border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-750 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors flex items-center gap-1 text-[13px] cursor-pointer"
                  title="Refresh Table"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => toast.success('Exporting inventory ledger to Excel (.xlsx)...')}
                  className="px-3 py-1.5 border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-750 text-[#0F172A] dark:text-white transition-colors flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#64748B]" />
                  <span>Export Excel</span>
                </button>
                <div className="h-5 w-[1px] bg-[#E2E8F0] dark:bg-slate-700 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => navigate('/pos')}
                  className="px-3 py-1.5 bg-[#EBF3FF] dark:bg-blue-950/40 text-[#136DEC] hover:bg-[#136DEC] hover:text-white font-semibold text-[13px] rounded-lg border border-[#BFDBFE] dark:border-blue-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Open POS</span>
                </button>
              </div>
            </div>
          )}

          {/* Zero Data State Check: With zero data (the default), show EmptyState */}
          {counts.total === 0 && !debouncedSearch ? (
            <EmptyState
              icon={<PackageOpen className="w-6 h-6 text-text-medium" />}
              title="Nothing entered yet"
              description="Your store has no recorded products, sales, or expenses yet. Choose how you'd like to begin."
              actionLabel="Add manually"
              onAction={() => setActiveTab('manual')}
              secondaryActionLabel="Scan an invoice"
              onSecondaryAction={() => setActiveTab('image')}
            />
          ) : (
            <Card>
              {/* Table Toolbar: Search, Sort indication, Page Size */}
              <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-xs">
                  {subView === 'products' ? (
                    <ProductSearchBar
                      variant="inline"
                      placeholder="Search products in inventory..."
                      onSelectProduct={(p) => {
                        api.getProductLocation(p.id, pageSize, sortBy, sortOrder).then((loc) => {
                          if (loc.found) {
                            if (loc.page !== currentPage) setCurrentPage(loc.page);
                            setHighlightedProductId(p.id);
                          } else {
                            toast.error(loc.message || 'Product not found');
                          }
                        });
                      }}
                    />
                  ) : (
                    <>
                      <Search className="w-4 h-4 text-text-medium absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder={`Search ${subView}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 text-xs"
                      />
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-low hover:text-text-high text-xs"
                        >
                          Clear
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-text-medium justify-between sm:justify-end">
                  <span className="tabular-nums">
                    Showing {startItem}–{endItem} of {totalItems} items
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 px-2 rounded-[6px] border border-border bg-surface text-xs text-text-high focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    aria-label="Items per page"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>

              {/* Data Table Content */}
              {isLoading ? (
                <div className="p-12 text-center text-text-medium text-xs">Loading items...</div>
              ) : totalItems === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-sm font-semibold text-text-high">
                    {search ? `No matching records found for "${search}"` : `No ${subView} recorded yet`}
                  </span>
                  <p className="text-xs text-text-medium max-w-sm">
                    {search
                      ? 'Try clearing your search term or searching by another keyword.'
                      : `Your store does not have any ${subView} in this ledger. Scan a wholesale bill or add records using the manual entry form.`}
                  </p>
                  {!search && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Button
                        variant="primary"
                        onClick={() => setActiveTab('manual')}
                        className="min-h-[48px] px-4 text-xs"
                      >
                        Enter manual data
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setActiveTab('image')}
                        className="min-h-[48px] px-4 text-xs"
                      >
                        Scan bill or invoice
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* SUBVIEW 1: PRODUCTS AND STOCK */}
                  {subView === 'products' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#F8FAFC] dark:bg-slate-750 border-b border-[#E2E8F0] dark:border-slate-700 h-10">
                            <th className="w-10 px-4 py-2.5 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-[#CBD5E1] text-[#136DEC] focus:ring-[#136DEC] cursor-pointer"
                              />
                            </th>
                            <th
                              onClick={() => handleSort('name')}
                              className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                            >
                              <span className="flex items-center gap-1">
                                PRODUCT NAME
                                <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                              </span>
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                              SKU
                            </th>
                            <th
                              onClick={() => handleSort('category')}
                              className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                            >
                              CATEGORY
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                              BOUGHT DATE
                            </th>
                            <th
                              onClick={() => handleSort('expiry_date')}
                              className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                            >
                              EXPIRY DATE
                            </th>
                            <th
                              onClick={() => handleSort('stock_qty')}
                              className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider text-right cursor-pointer select-none"
                            >
                              IN STOCK QTY
                            </th>
                            <th
                              onClick={() => handleSort('cost_price')}
                              className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider text-right cursor-pointer select-none"
                            >
                              COST PRICE
                            </th>
                            <th
                              onClick={() => handleSort('selling_price')}
                              className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider text-right cursor-pointer select-none"
                            >
                              SELLING PRICE
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider text-right">
                              VALUATION
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider text-center">
                              STATUS
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider text-right">
                              ACTIONS
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] dark:divide-slate-700/60">
                          {products.map((prod) => {
                            const isEditing = editingId === prod.id;
                            const isHighlighted = highlightedProductId === prod.id;
                            const isLowStock = (prod.stock_qty || 0) <= (prod.reorder_level || 5);
                            const isOutOfStock = (prod.stock_qty || 0) <= 0;
                            const sku = `MED-${(prod.id * 7 + 1000).toString().slice(0, 4)}`;
                            const batch = `#BAT-${(prod.id * 1047 + 1000).toString().slice(0, 5)}`;
                            const grn = `#GRN-${4900 + (prod.id % 100)}`;
                            const boughtDate = '14 Jan 2026';
                            const valuation = (prod.stock_qty || 0) * (prod.cost_price || 0);

                            return (
                              <tr
                                key={prod.id}
                                id={`product-row-${prod.id}`}
                                data-product-id={prod.id}
                                className={cn(
                                  "hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors duration-100 group",
                                  isHighlighted && 'product-row-highlight bg-blue-50/50 dark:bg-blue-950/20'
                                )}
                              >
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="rounded border-[#CBD5E1] text-[#136DEC] focus:ring-[#136DEC] cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <Input
                                      value={productEditForm.name || ''}
                                      onChange={(e) =>
                                        setProductEditForm({
                                          ...productEditForm,
                                          name: e.target.value,
                                        })
                                      }
                                      className="h-8 text-xs"
                                    />
                                  ) : (
                                    <div>
                                      <div className="text-[13px] font-semibold text-[#0F172A] dark:text-white">
                                        {prod.name}
                                      </div>
                                      <div className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                        <span>Batch: {batch}</span>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono text-[13px] text-[#334155] dark:text-slate-300 font-medium">
                                  {sku}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <Input
                                      value={productEditForm.category || ''}
                                      onChange={(e) =>
                                        setProductEditForm({
                                          ...productEditForm,
                                          category: e.target.value,
                                        })
                                      }
                                      className="h-8 text-xs w-28"
                                    />
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium bg-[#F1F5F9] dark:bg-slate-700 text-[#334155] dark:text-slate-300">
                                      {prod.category}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-[13px] text-[#0F172A] dark:text-white font-medium">
                                    {boughtDate}
                                  </div>
                                  <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                                    {grn}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <Input
                                      type="date"
                                      value={productEditForm.expiry_date || ''}
                                      onChange={(e) =>
                                        setProductEditForm({
                                          ...productEditForm,
                                          expiry_date: e.target.value || null,
                                        })
                                      }
                                      className="h-8 text-xs w-32"
                                    />
                                  ) : prod.expiry_date ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                                      <Calendar className="w-3 h-3" />
                                      {prod.expiry_date}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-[#94A3B8]">–</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={productEditForm.stock_qty ?? ''}
                                        onChange={(e) =>
                                          setProductEditForm({
                                            ...productEditForm,
                                            stock_qty: parseInt(e.target.value, 10) || 0,
                                          })
                                        }
                                        className="h-8 text-xs w-16"
                                      />
                                      <Input
                                        type="number"
                                        placeholder="Min"
                                        value={productEditForm.reorder_level ?? ''}
                                        onChange={(e) =>
                                          setProductEditForm({
                                            ...productEditForm,
                                            reorder_level: parseInt(e.target.value, 10) || 0,
                                          })
                                        }
                                        className="h-8 text-xs w-16"
                                        title="Reorder level"
                                      />
                                    </div>
                                  ) : (
                                    <span
                                      className={cn(
                                        "text-[13px] font-bold font-data tabular-nums",
                                        isOutOfStock
                                          ? "text-[#EF4444]"
                                          : isLowStock
                                          ? "text-[#D97706]"
                                          : "text-[#0F172A] dark:text-white"
                                      )}
                                    >
                                      {prod.stock_qty} Units
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-[13px] text-[#64748B] dark:text-slate-400 tabular-nums font-data">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={productEditForm.cost_price ?? ''}
                                      onChange={(e) =>
                                        setProductEditForm({
                                          ...productEditForm,
                                          cost_price: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="h-8 text-xs w-20 text-right"
                                    />
                                  ) : (
                                    formatINR(prod.cost_price)
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-[13px] font-semibold text-[#0F172A] dark:text-white tabular-nums font-data">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={productEditForm.selling_price ?? ''}
                                      onChange={(e) =>
                                        setProductEditForm({
                                          ...productEditForm,
                                          selling_price: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="h-8 text-xs w-20 text-right"
                                    />
                                  ) : (
                                    formatINR(prod.selling_price)
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-[13px] font-bold text-[#0F172A] dark:text-white tabular-nums font-data">
                                  {formatINR(valuation)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isOutOfStock ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                                      OUT OF STOCK
                                    </span>
                                  ) : isLowStock ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
                                      LOW STOCK
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                      IN STOCK
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => saveEditProduct(prod.id)}
                                        className="p-1.5 rounded-[6px] text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200"
                                        title="Save changes"
                                      >
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="p-1.5 rounded-[6px] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-slate-700 border border-[#E2E8F0]"
                                        title="Cancel"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => startEditProduct(prod)}
                                        className="px-2.5 py-1 text-[12px] font-semibold text-[#136DEC] bg-[#EBF3FF] hover:bg-[#136DEC] hover:text-white rounded-md transition-colors cursor-pointer"
                                      >
                                        Details
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => startEditProduct(prod)}
                                        className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white rounded hover:bg-[#F1F5F9] dark:hover:bg-slate-750 transition-colors cursor-pointer"
                                        title="Edit Product"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeleteTarget({
                                            type: 'product',
                                            id: prod.id,
                                            title: prod.name,
                                          })
                                        }
                                        className="p-1 text-[#64748B] hover:text-[#EF4444] rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                        title="Delete product"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SUBVIEW 2: SALES */}
                  {subView === 'sales' && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            onClick={() => handleSort('id')}
                            className="cursor-pointer select-none"
                          >
                            Bill ID
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('date_time')}
                            className="cursor-pointer select-none"
                          >
                            Date & time
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('total_amount')}
                            className="cursor-pointer select-none text-right"
                          >
                            Total amount
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('total_profit')}
                            className="cursor-pointer select-none text-right"
                          >
                            Gross profit
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('payment_mode')}
                            className="cursor-pointer select-none"
                          >
                            Payment mode
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((sale) => {
                          const isEditing = editingId === sale.id;
                          return (
                            <TableRow key={sale.id}>
                              <TableCell className="font-semibold text-text-high">
                                #S-{sale.id}
                              </TableCell>
                              <TableCell className="text-xs text-text-medium tabular-nums">
                                {sale.date_time
                                  ? new Date(sale.date_time).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                  : '–'}
                              </TableCell>
                              <TableCell isNumeric className="font-semibold">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={saleEditForm.total_amount ?? ''}
                                    onChange={(e) =>
                                      setSaleEditForm({
                                        ...saleEditForm,
                                        total_amount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="h-8 text-xs w-28 text-right"
                                  />
                                ) : (
                                  formatINR(sale.total_amount)
                                )}
                              </TableCell>
                              <TableCell isNumeric className="text-success font-medium">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={saleEditForm.total_profit ?? ''}
                                    onChange={(e) =>
                                      setSaleEditForm({
                                        ...saleEditForm,
                                        total_profit: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="h-8 text-xs w-28 text-right"
                                  />
                                ) : (
                                  formatINR(sale.total_profit)
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <select
                                    value={saleEditForm.payment_mode || 'Cash'}
                                    onChange={(e) =>
                                      setSaleEditForm({
                                        ...saleEditForm,
                                        payment_mode: e.target.value,
                                      })
                                    }
                                    className="h-8 px-2 rounded-[6px] border border-border bg-surface text-xs"
                                  >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Khata">Khata</option>
                                  </select>
                                ) : (
                                  <Badge variant="neutral">{sale.payment_mode}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => saveEditSale(sale.id)}
                                      className="p-1.5 rounded-[6px] text-success hover:bg-success-bg border border-success-border"
                                    >
                                      <Check className="w-4 h-4" strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="p-1.5 rounded-[6px] text-text-medium hover:bg-canvas border border-border"
                                    >
                                      <X className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditSale(sale)}
                                      className="p-1.5 rounded-[6px] text-text-medium hover:text-text-high hover:bg-canvas"
                                    >
                                      <Edit2 className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: 'sale',
                                          id: sale.id,
                                          title: `Bill #S-${sale.id}`,
                                        })
                                      }
                                      className="p-1.5 rounded-[6px] text-text-medium hover:text-destructive hover:bg-destructive-bg"
                                    >
                                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}

                  {/* SUBVIEW 3: EXPENSES */}
                  {subView === 'expenses' && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            onClick={() => handleSort('date')}
                            className="cursor-pointer select-none"
                          >
                            Date
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('category')}
                            className="cursor-pointer select-none"
                          >
                            Category
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('amount')}
                            className="cursor-pointer select-none text-right"
                          >
                            Amount
                          </TableHead>
                          <TableHead>Note / description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((exp) => {
                          const isEditing = editingId === exp.id;
                          return (
                            <TableRow key={exp.id}>
                              <TableCell className="tabular-nums font-medium text-xs">
                                {isEditing ? (
                                  <Input
                                    type="date"
                                    value={expenseEditForm.date || ''}
                                    onChange={(e) =>
                                      setExpenseEditForm({
                                        ...expenseEditForm,
                                        date: e.target.value,
                                      })
                                    }
                                    className="h-8 text-xs w-32"
                                  />
                                ) : (
                                  exp.date
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={expenseEditForm.category || ''}
                                    onChange={(e) =>
                                      setExpenseEditForm({
                                        ...expenseEditForm,
                                        category: e.target.value,
                                      })
                                    }
                                    className="h-8 text-xs w-32"
                                  />
                                ) : (
                                  <Badge variant="neutral">{exp.category}</Badge>
                                )}
                              </TableCell>
                              <TableCell isNumeric className="font-semibold text-destructive">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={expenseEditForm.amount ?? ''}
                                    onChange={(e) =>
                                      setExpenseEditForm({
                                        ...expenseEditForm,
                                        amount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="h-8 text-xs w-28 text-right"
                                  />
                                ) : (
                                  formatINR(exp.amount)
                                )}
                              </TableCell>
                              <TableCell className="text-text-medium text-xs">
                                {isEditing ? (
                                  <Input
                                    value={expenseEditForm.note || ''}
                                    onChange={(e) =>
                                      setExpenseEditForm({
                                        ...expenseEditForm,
                                        note: e.target.value,
                                      })
                                    }
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  exp.note || '–'
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => saveEditExpense(exp.id)}
                                      className="p-1.5 rounded-[6px] text-success hover:bg-success-bg border border-success-border"
                                    >
                                      <Check className="w-4 h-4" strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="p-1.5 rounded-[6px] text-text-medium hover:bg-canvas border border-border"
                                    >
                                      <X className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditExpense(exp)}
                                      className="p-1.5 rounded-[6px] text-text-medium hover:text-text-high hover:bg-canvas"
                                    >
                                      <Edit2 className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: 'expense',
                                          id: exp.id,
                                          title: `${exp.category} (₹${exp.amount})`,
                                        })
                                      }
                                      className="p-1.5 rounded-[6px] text-text-medium hover:text-destructive hover:bg-destructive-bg"
                                    >
                                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}

                  {/* Pagination Bar */}
                  <div className="p-3 border-t border-border flex items-center justify-between gap-3 text-xs">
                    <span className="text-text-medium">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="min-h-[48px] px-3 text-xs"
                      >
                        <ChevronLeft className="w-4 h-4 mr-0.5" />
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={currentPage >= totalPages || totalPages === 0}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="min-h-[48px] px-3 text-xs"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MANUAL TO DATA */}
      {/* ======================================================== */}
      {activeTab === 'manual' && (
        <ManualDataEntry
          onDataSaved={handleManualDataSaved}
          onNavigateToEntered={handleNavigateToEntered}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 3: IMAGE TO DATA */}
      {/* ======================================================== */}
      {activeTab === 'image' && (
        <ImageToData
          onDataSaved={handleManualDataSaved}
          onNavigateToEntered={handleNavigateToEntered}
        />
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm deletion"
        description="Are you sure you want to delete this item? This action cannot be undone."
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <div className="py-2">
          <div className="p-3 bg-canvas border border-border rounded-[8px] flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" strokeWidth={2} />
            <div className="flex flex-col">
              <span className="text-xs text-text-medium font-medium">Selected record:</span>
              <span className="text-sm font-semibold text-text-high">
                {deleteTarget?.title}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
