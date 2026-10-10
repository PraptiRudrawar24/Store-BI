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
import { ManualDataEntry } from '../components/manual/ManualDataEntry';
import { ImageToData } from '../components/image-to-data/ImageToData';

type MainTab = 'entered' | 'manual' | 'image';
type SubView = 'products' | 'sales' | 'expenses';

export function DataUploadPage() {
  const toast = useToast();

  // Navigation states
  const [activeTab, setActiveTab] = React.useState<MainTab>('entered');
  const [subView, setSubView] = React.useState<SubView>('products');

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

  // Status Chip Helpers
  const getStockStatusChip = (stockQty: number, reorderLevel: number) => {
    if (stockQty <= 0) {
      return (
        <Badge variant="destructive" dot>
          Out of stock ({stockQty})
        </Badge>
      );
    }
    if (stockQty <= reorderLevel) {
      return (
        <Badge variant="warning" dot>
          Low stock ({stockQty})
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" dot>
        {stockQty} in stock
      </Badge>
    );
  };

  const getExpiryStatusChip = (expiryDate?: string | null) => {
    if (!expiryDate) return <span className="text-text-low text-xs">–</span>;
    const exp = new Date(expiryDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <Badge variant="destructive" dot>
          Expired ({expiryDate})
        </Badge>
      );
    }
    if (diffDays <= 30) {
      return (
        <Badge variant="warning" dot>
          Near expiry ({expiryDate})
        </Badge>
      );
    }
    return <span className="text-xs text-text-medium tabular-nums">{expiryDate}</span>;
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

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-high">Data upload</h1>
        <p className="text-sm text-text-medium mt-0.5">
          Review entered shop inventory, sales bills, and daily operating expenses.
        </p>
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
                    className={`flex items-center gap-2 h-10 px-3.5 rounded-[8px] text-xs font-semibold transition-colors shrink-0 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-canvas text-text-medium hover:text-text-high border border-border'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-[4px] text-[10px] font-bold tabular-nums ${
                        isActive
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
                className="text-xs min-h-[48px] px-3.5"
              >
                <Plus className="w-4 h-4 mr-1.5 shrink-0" strokeWidth={2} />
                Add manually
              </Button>
            </div>
          </div>

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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            onClick={() => handleSort('name')}
                            className="cursor-pointer select-none"
                          >
                            <span className="flex items-center gap-1">
                              Product name
                              <ArrowUpDown className="w-3 h-3 text-text-low" />
                            </span>
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('category')}
                            className="cursor-pointer select-none"
                          >
                            Category
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('cost_price')}
                            className="cursor-pointer select-none text-right"
                          >
                            Cost price
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('selling_price')}
                            className="cursor-pointer select-none text-right"
                          >
                            Selling price
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('stock_qty')}
                            className="cursor-pointer select-none"
                          >
                            Stock status
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort('expiry_date')}
                            className="cursor-pointer select-none"
                          >
                            Expiry
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((prod) => {
                          const isEditing = editingId === prod.id;
                          return (
                            <TableRow key={prod.id}>
                              {/* Name Cell */}
                              <TableCell className="font-medium">
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
                                  <span>{prod.name}</span>
                                )}
                              </TableCell>

                              {/* Category Cell */}
                              <TableCell>
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
                                  <span className="text-text-medium">{prod.category}</span>
                                )}
                              </TableCell>

                              {/* Cost Price */}
                              <TableCell isNumeric>
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
                                    className="h-8 text-xs w-24 text-right"
                                  />
                                ) : (
                                  formatINR(prod.cost_price)
                                )}
                              </TableCell>

                              {/* Selling Price */}
                              <TableCell isNumeric>
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
                                    className="h-8 text-xs w-24 text-right"
                                  />
                                ) : (
                                  <span className="font-semibold">
                                    {formatINR(prod.selling_price)}
                                  </span>
                                )}
                              </TableCell>

                              {/* Stock Quantity / Status Chip */}
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex items-center gap-1.5">
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
                                      placeholder="Reorder"
                                      value={productEditForm.reorder_level ?? ''}
                                      onChange={(e) =>
                                        setProductEditForm({
                                          ...productEditForm,
                                          reorder_level: parseInt(e.target.value, 10) || 0,
                                        })
                                      }
                                      className="h-8 text-xs w-16"
                                      title="Reorder level threshold"
                                    />
                                  </div>
                                ) : (
                                  getStockStatusChip(prod.stock_qty, prod.reorder_level)
                                )}
                              </TableCell>

                              {/* Expiry Date / Status Chip */}
                              <TableCell>
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
                                ) : (
                                  getExpiryStatusChip(prod.expiry_date)
                                )}
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => saveEditProduct(prod.id)}
                                      className="p-1.5 rounded-[6px] text-success hover:bg-success-bg border border-success-border"
                                      title="Save changes"
                                      aria-label="Save changes"
                                    >
                                      <Check className="w-4 h-4" strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="p-1.5 rounded-[6px] text-text-medium hover:bg-canvas border border-border"
                                      title="Cancel"
                                      aria-label="Cancel editing"
                                    >
                                      <X className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditProduct(prod)}
                                      className="p-1.5 rounded-[6px] text-text-medium hover:text-text-high hover:bg-canvas"
                                      title="Inline edit"
                                      aria-label={`Edit ${prod.name}`}
                                    >
                                      <Edit2 className="w-4 h-4" strokeWidth={2} />
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
                                      className="p-1.5 rounded-[6px] text-text-medium hover:text-destructive hover:bg-destructive-bg"
                                      title="Delete product"
                                      aria-label={`Delete ${prod.name}`}
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
