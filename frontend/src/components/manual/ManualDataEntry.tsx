import * as React from 'react';
import {
  PackagePlus,
  ReceiptText,
  Wallet,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Search,
  ArrowRight,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { useToast } from '../ui/Toast';
import { formatINR } from '../../utils';
import {
  api,
  type Product,
} from '../../api/client';
import {
  PRODUCT_CSV_TEMPLATE,
  SALE_CSV_TEMPLATE,
  downloadCsvFile,
  validateProductCsv,
  validateSaleCsv,
} from '../../utils/csv';

export type ManualFormType = 'product' | 'sale' | 'expense';

interface ManualDataEntryProps {
  onDataSaved: (type: 'product' | 'sale' | 'expense') => Promise<void>;
  onNavigateToEntered: (subView?: 'products' | 'sales' | 'expenses') => void;
}

interface SaleLineItem {
  productId: number;
  productName: string;
  category: string;
  unitPrice: number;
  unitCost: number;
  stockQty: number;
  qty: number;
}

const PRODUCT_CATEGORIES = [
  'Grocery',
  'Dairy & Bakery',
  'Snacks & Beverages',
  'Personal Care',
  'Household',
  'Spices & Staples',
  'Confectionery',
  'Pharmacy',
  'Stationery',
  'Other',
];

const EXPENSE_CATEGORIES = [
  'Electricity & Utility',
  'Shop Rent',
  'Staff & Helper Salary',
  'Delivery & Tempo Charges',
  'Packaging & Carry Bags',
  'Shop Maintenance',
  'Chai & Refreshments',
  'Other Expense',
];

const PAYMENT_MODES = [
  { id: 'Cash', label: 'Cash' },
  { id: 'UPI', label: 'UPI (GPay / PhonePe)' },
  { id: 'Card', label: 'Card' },
  { id: 'Credit', label: 'Credit (Udhar)' },
];

export function ManualDataEntry({ onDataSaved, onNavigateToEntered }: ManualDataEntryProps) {
  const toast = useToast();

  // Active form segmented control
  const [activeForm, setActiveForm] = React.useState<ManualFormType>('product');

  // Existing products inventory for lookup & autocomplete
  const [existingProducts, setExistingProducts] = React.useState<Product[]>([]);

  // Load existing products
  const loadExistingProducts = React.useCallback(async () => {
    try {
      const prods = await api.getProducts();
      setExistingProducts(prods);
    } catch {
      // Fallback
    }
  }, []);

  React.useEffect(() => {
    loadExistingProducts();
  }, [loadExistingProducts]);

  // ========================================================
  // FORM 1: ADD OR UPDATE PRODUCT STATE
  // ========================================================
  const [productMode, setProductMode] = React.useState<'single' | 'csv'>('single');
  const [editingProductId, setEditingProductId] = React.useState<number | null>(null);

  const [pName, setPName] = React.useState('');
  const [pCategory, setPCategory] = React.useState('Grocery');
  const [pCostPrice, setPCostPrice] = React.useState('');
  const [pSellingPrice, setPSellingPrice] = React.useState('');
  const [pStockQty, setPStockQty] = React.useState('');
  const [pReorderLevel, setPReorderLevel] = React.useState('10');
  const [pExpiryDate, setPExpiryDate] = React.useState('');

  // Autocomplete state for Product form
  const [showProductAutocomplete, setShowProductAutocomplete] = React.useState(false);
  const [productErrors, setProductErrors] = React.useState<Record<string, string>>({});
  const [isSubmittingProduct, setIsSubmittingProduct] = React.useState(false);

  // Filtered product suggestions
  const productSuggestions = React.useMemo(() => {
    if (!pName.trim()) return [];
    const query = pName.toLowerCase();
    return existingProducts.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 5);
  }, [existingProducts, pName]);

  const handleSelectProductSuggestion = (prod: Product) => {
    setEditingProductId(prod.id);
    setPName(prod.name);
    setPCategory(prod.category || 'Grocery');
    setPCostPrice(String(prod.cost_price));
    setPSellingPrice(String(prod.selling_price));
    setPStockQty(String(prod.stock_qty));
    setPReorderLevel(String(prod.reorder_level || 10));
    setPExpiryDate(prod.expiry_date || '');
    setShowProductAutocomplete(false);
    setProductErrors({});
    toast.info(`Loaded "${prod.name}" for updating`);
  };

  const handleResetProductForm = () => {
    setEditingProductId(null);
    setPName('');
    setPCategory('Grocery');
    setPCostPrice('');
    setPSellingPrice('');
    setPStockQty('');
    setPReorderLevel('10');
    setPExpiryDate('');
    setProductErrors({});
    setShowProductAutocomplete(false);
  };

  const validateProductForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!pName.trim()) {
      errs.name = 'Product name is required';
    }
    if (!pSellingPrice.trim()) {
      errs.sellingPrice = 'Selling price is required';
    } else {
      const sp = parseFloat(pSellingPrice);
      if (isNaN(sp) || sp <= 0) {
        errs.sellingPrice = 'Selling price must be greater than ₹0';
      }
    }
    if (pCostPrice.trim()) {
      const cp = parseFloat(pCostPrice);
      if (isNaN(cp) || cp < 0) {
        errs.costPrice = 'Cost price cannot be negative';
      }
    }
    if (pStockQty.trim()) {
      const sq = parseInt(pStockQty, 10);
      if (isNaN(sq) || sq < 0) {
        errs.stockQty = 'Stock quantity cannot be negative';
      }
    }
    if (pReorderLevel.trim()) {
      const rl = parseInt(pReorderLevel, 10);
      if (isNaN(rl) || rl < 0) {
        errs.reorderLevel = 'Reorder level cannot be negative';
      }
    }

    setProductErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    setIsSubmittingProduct(true);
    try {
      const payload = {
        name: pName.trim(),
        category: pCategory || 'Grocery',
        cost_price: parseFloat(pCostPrice) || 0,
        selling_price: parseFloat(pSellingPrice) || 0,
        stock_qty: parseInt(pStockQty, 10) || 0,
        reorder_level: parseInt(pReorderLevel, 10) || 10,
        expiry_date: pExpiryDate ? pExpiryDate : null,
      };

      if (editingProductId) {
        await api.updateProduct(editingProductId, payload as any);
        toast.success(`Product "${payload.name}" updated successfully`);
      } else {
        await api.createProduct(payload as any);
        toast.success(`Product "${payload.name}" added successfully`);
      }

      handleResetProductForm();
      await loadExistingProducts();
      await onDataSaved('product');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // CSV Bulk Import for Products
  const [productCsvParsed, setProductCsvParsed] = React.useState<ReturnType<typeof validateProductCsv> | null>(null);
  const [isImportingProducts, setIsImportingProducts] = React.useState(false);

  const handleProductCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      const result = validateProductCsv(content);
      setProductCsvParsed(result);
    };
    reader.readAsText(file);
  };

  const handleConfirmProductCsv = async () => {
    if (!productCsvParsed || productCsvParsed.totalValid === 0) {
      toast.error('No valid products to import');
      return;
    }
    setIsImportingProducts(true);
    try {
      const validRows = productCsvParsed.rows
        .filter((r) => r.isValid)
        .map((r) => ({
          name: r.name,
          category: r.category,
          cost_price: r.cost_price,
          selling_price: r.selling_price,
          stock_qty: r.stock_qty,
          reorder_level: r.reorder_level,
          expiry_date: r.expiry_date || null,
        }));

      await api.bulkCreateProducts(validRows as any);
      toast.success(`Successfully imported ${validRows.length} products`);
      setProductCsvParsed(null);
      setProductMode('single');
      await loadExistingProducts();
      await onDataSaved('product');
    } catch (err: any) {
      toast.error(err.message || 'Failed to import products');
    } finally {
      setIsImportingProducts(false);
    }
  };

  // ========================================================
  // FORM 2: RECORD SALE STATE
  // ========================================================
  const [saleMode, setSaleMode] = React.useState<'single' | 'csv'>('single');
  const [saleItems, setSaleItems] = React.useState<SaleLineItem[]>([]);
  const [salePaymentMode, setSalePaymentMode] = React.useState('Cash');
  const [saleDateTime, setSaleDateTime] = React.useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  // Autocomplete search for adding product to sale
  const [saleProductSearch, setSaleProductSearch] = React.useState('');
  const [showSaleAutocomplete, setShowSaleAutocomplete] = React.useState(false);
  const [saleErrors, setSaleErrors] = React.useState<Record<string, string>>({});
  const [isSubmittingSale, setIsSubmittingSale] = React.useState(false);

  // Autocomplete suggestions for picking products in Sale form
  const saleProductSuggestions = React.useMemo(() => {
    if (!saleProductSearch.trim()) return [];
    const query = saleProductSearch.toLowerCase();
    return existingProducts.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6);
  }, [existingProducts, saleProductSearch]);

  const handleAddProductToSale = (prod: Product) => {
    const existingIndex = saleItems.findIndex((item) => item.productId === prod.id);
    if (existingIndex !== -1) {
      const updated = [...saleItems];
      updated[existingIndex].qty += 1;
      setSaleItems(updated);
    } else {
      setSaleItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          category: prod.category,
          unitPrice: prod.selling_price,
          unitCost: prod.cost_price,
          stockQty: prod.stock_qty,
          qty: 1,
        },
      ]);
    }
    setSaleProductSearch('');
    setShowSaleAutocomplete(false);
    setSaleErrors({});
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) newQty = 1;
    const updated = [...saleItems];
    updated[index].qty = newQty;
    setSaleItems(updated);
  };

  const handleRemoveSaleItem = (index: number) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations: Auto Total & Auto Profit
  const saleTotals = React.useMemo(() => {
    let totalAmount = 0;
    let totalProfit = 0;
    let totalQty = 0;
    let hasStockIssue = false;
    const stockErrors: string[] = [];

    saleItems.forEach((item) => {
      const lineTotal = item.qty * item.unitPrice;
      const lineProfit = item.qty * (item.unitPrice - item.unitCost);
      totalAmount += lineTotal;
      totalProfit += lineProfit;
      totalQty += item.qty;

      if (item.qty > item.stockQty) {
        hasStockIssue = true;
        stockErrors.push(
          `Insufficient stock for "${item.productName}". Available: ${item.stockQty}, requested: ${item.qty}`
        );
      }
    });

    const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

    return {
      totalAmount,
      totalProfit,
      totalQty,
      profitMargin,
      hasStockIssue,
      stockErrors,
    };
  }, [saleItems]);

  const handleResetSaleForm = () => {
    setSaleItems([]);
    setSalePaymentMode('Cash');
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setSaleDateTime(new Date(now.getTime() - tzOffset).toISOString().slice(0, 16));
    setSaleProductSearch('');
    setShowSaleAutocomplete(false);
    setSaleErrors({});
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saleItems.length === 0) {
      setSaleErrors({ items: 'Please add at least one product to the sale bill' });
      toast.error('Please add at least one product to the sale');
      return;
    }

    if (saleTotals.hasStockIssue) {
      setSaleErrors({ stock: saleTotals.stockErrors[0] });
      toast.error(saleTotals.stockErrors[0]);
      return;
    }

    setIsSubmittingSale(true);
    try {
      await api.createSale({
        total_amount: saleTotals.totalAmount,
        total_profit: saleTotals.totalProfit,
        payment_mode: salePaymentMode,
        date_time: saleDateTime ? new Date(saleDateTime).toISOString() : new Date().toISOString(),
        items: saleItems.map((item) => ({
          product_id: item.productId,
          qty: item.qty,
          unit_price: item.unitPrice,
          unit_cost: item.unitCost,
        })),
      });

      toast.success(`Sale bill of ${formatINR(saleTotals.totalAmount)} recorded successfully`);
      handleResetSaleForm();
      await loadExistingProducts();
      await onDataSaved('sale');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record sale bill');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // CSV Bulk Import for Sales
  const [saleCsvParsed, setSaleCsvParsed] = React.useState<ReturnType<typeof validateSaleCsv> | null>(null);
  const [isImportingSales, setIsImportingSales] = React.useState(false);

  const handleSaleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      const result = validateSaleCsv(content, existingProducts);
      setSaleCsvParsed(result);
    };
    reader.readAsText(file);
  };

  const handleConfirmSaleCsv = async () => {
    if (!saleCsvParsed || saleCsvParsed.totalValid === 0) {
      toast.error('No valid sales to import');
      return;
    }
    setIsImportingSales(true);
    try {
      const validRows = saleCsvParsed.rows.filter((r) => r.isValid && r.matchedProductId);

      const salesPayload = validRows.map((r) => ({
        total_amount: r.line_total || 0,
        total_profit: r.line_profit || 0,
        payment_mode: r.payment_mode,
        date_time: r.date_time,
        items: [
          {
            product_id: r.matchedProductId!,
            qty: r.qty,
            unit_price: r.unit_price,
            unit_cost: r.unit_cost || 0,
          },
        ],
      }));

      await api.bulkCreateSales(salesPayload);
      toast.success(`Successfully recorded ${validRows.length} sale transactions`);
      setSaleCsvParsed(null);
      setSaleMode('single');
      await loadExistingProducts();
      await onDataSaved('sale');
    } catch (err: any) {
      toast.error(err.message || 'Failed to import sales');
    } finally {
      setIsImportingSales(false);
    }
  };

  // ========================================================
  // FORM 3: ADD EXPENSE STATE
  // ========================================================
  const [expDate, setExpDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = React.useState('Electricity & Utility');
  const [expAmount, setExpAmount] = React.useState('');
  const [expNote, setExpNote] = React.useState('');
  const [expenseErrors, setExpenseErrors] = React.useState<Record<string, string>>({});
  const [isSubmittingExpense, setIsSubmittingExpense] = React.useState(false);

  const validateExpenseForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!expDate.trim()) {
      errs.date = 'Date is required';
    }
    if (!expAmount.trim()) {
      errs.amount = 'Expense amount is required';
    } else {
      const amt = parseFloat(expAmount);
      if (isNaN(amt) || amt <= 0) {
        errs.amount = 'Amount must be greater than ₹0';
      }
    }
    setExpenseErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleResetExpenseForm = () => {
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpCategory('Electricity & Utility');
    setExpAmount('');
    setExpNote('');
    setExpenseErrors({});
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateExpenseForm()) return;

    setIsSubmittingExpense(true);
    try {
      const amt = parseFloat(expAmount);
      await api.createExpense({
        date: expDate,
        category: expCategory,
        amount: amt,
        note: expNote.trim(),
      });

      toast.success(`Expense of ${formatINR(amt)} recorded successfully`);
      handleResetExpenseForm();
      await onDataSaved('expense');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ======================================================== */}
      {/* 3-WAY SEGMENTED CONTROL */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1.5 bg-canvas border border-border rounded-[12px]">
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
          {/* Segment 1: Add or update product */}
          <button
            type="button"
            onClick={() => {
              setActiveForm('product');
              setProductErrors({});
            }}
            className={`flex items-center justify-center gap-2.5 h-12 min-h-[48px] px-5 rounded-[8px] text-xs sm:text-sm font-semibold transition-all ${
              activeForm === 'product'
                ? 'bg-surface text-primary border border-border font-bold'
                : 'text-text-medium hover:text-text-high hover:bg-surface/50'
            }`}
          >
            <PackagePlus className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span>Add or update product</span>
          </button>

          {/* Segment 2: Record sale */}
          <button
            type="button"
            onClick={() => {
              setActiveForm('sale');
              setSaleErrors({});
            }}
            className={`flex items-center justify-center gap-2.5 h-12 min-h-[48px] px-5 rounded-[8px] text-xs sm:text-sm font-semibold transition-all ${
              activeForm === 'sale'
                ? 'bg-surface text-primary border border-border font-bold'
                : 'text-text-medium hover:text-text-high hover:bg-surface/50'
            }`}
          >
            <ReceiptText className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span>Record sale</span>
          </button>

          {/* Segment 3: Add expense */}
          <button
            type="button"
            onClick={() => {
              setActiveForm('expense');
              setExpenseErrors({});
            }}
            className={`flex items-center justify-center gap-2.5 h-12 min-h-[48px] px-5 rounded-[8px] text-xs sm:text-sm font-semibold transition-all ${
              activeForm === 'expense'
                ? 'bg-surface text-primary border border-border font-bold'
                : 'text-text-medium hover:text-text-high hover:bg-surface/50'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span>Add expense</span>
          </button>
        </div>

        {/* Quick Link to Already entered */}
        <div className="flex items-center justify-end px-2">
          <button
            type="button"
            onClick={() => onNavigateToEntered()}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-medium hover:text-primary transition-colors py-1"
          >
            <span>View Already entered</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FORM 1: ADD OR UPDATE PRODUCT */}
      {/* ======================================================== */}
      {activeForm === 'product' && (
        <Card>
          <CardHeader
            title={editingProductId ? 'Update product' : 'Add or update product'}
            subtitle={
              productMode === 'single'
                ? 'Type a product name to auto-suggest existing items to update, or create a brand new item.'
                : 'Upload your distributor or inventory CSV sheet with row-level validation and instant preview.'
            }
            action={
              <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-[8px] border border-border">
                <button
                  type="button"
                  onClick={() => setProductMode('single')}
                  className={`h-8 px-3 rounded-[6px] text-xs font-medium transition-colors ${
                    productMode === 'single'
                      ? 'bg-surface text-text-high border border-border font-semibold'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                >
                  Single entry
                </button>
                <button
                  type="button"
                  onClick={() => setProductMode('csv')}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-xs font-medium transition-colors ${
                    productMode === 'csv'
                      ? 'bg-surface text-text-high border border-border font-semibold'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  CSV bulk import
                </button>
              </div>
            }
          />
          <CardContent className="p-6">
            {productMode === 'single' ? (
              <form onSubmit={handleSaveProduct} className="flex flex-col gap-5 max-w-2xl">
                {/* Editing Notification Banner if updating */}
                {editingProductId && (
                  <div className="flex items-center justify-between p-3 rounded-[8px] bg-primary/[0.06] border border-primary/20 text-xs text-text-high">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        Editing: <strong>{pName}</strong> (ID #{editingProductId}). Modify any field and click Update Product.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetProductForm}
                      className="text-xs text-text-medium hover:text-destructive font-medium underline ml-2"
                    >
                      Clear & add new product
                    </button>
                  </div>
                )}

                {/* Field 1: Product Name with Autocomplete */}
                <div className="relative">
                  <Input
                    label="Product name *"
                    placeholder="e.g. Tata Salt 1kg, Amul Butter 500g"
                    value={pName}
                    onChange={(e) => {
                      setPName(e.target.value);
                      setShowProductAutocomplete(true);
                      if (productErrors.name) {
                        setProductErrors((prev) => ({ ...prev, name: '' }));
                      }
                    }}
                    onFocus={() => setShowProductAutocomplete(true)}
                    error={productErrors.name}
                    helperText="Type product name. Existing products will appear below to update."
                    autoComplete="off"
                  />

                  {/* Autocomplete Dropdown */}
                  {showProductAutocomplete && productSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-[76px] bg-surface rounded-[8px] border border-border overflow-hidden max-h-60 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-canvas border-b border-border text-[11px] font-semibold text-text-medium flex items-center justify-between">
                        <span>Matching products in your store</span>
                        <button
                          type="button"
                          onClick={() => setShowProductAutocomplete(false)}
                          className="hover:text-text-high"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {productSuggestions.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectProductSuggestion(prod)}
                          className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-canvas transition-colors border-b border-border/40 last:border-0"
                        >
                          <div>
                            <div className="text-xs font-semibold text-text-high">{prod.name}</div>
                            <div className="text-[11px] text-text-medium">
                              Category: {prod.category} • In stock: {prod.stock_qty}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-primary tabular-nums">
                              {formatINR(prod.selling_price)}
                            </span>
                            <span className="block text-[10px] text-primary underline">Click to update</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Field 2 & 7: Category & Optional Expiry Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-high">Category *</label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="flex h-12 min-h-[48px] w-full rounded-[8px] border border-border bg-surface px-3.5 py-2 text-sm text-text-high focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Input
                      type="date"
                      label="Expiry date (optional)"
                      value={pExpiryDate}
                      onChange={(e) => setPExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 3 & 4: Cost Price (₹) & Selling Price (₹) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Cost price *"
                    isCurrency={true}
                    placeholder="22"
                    value={pCostPrice}
                    onChange={(e) => {
                      setPCostPrice(e.target.value);
                      if (productErrors.costPrice) {
                        setProductErrors((prev) => ({ ...prev, costPrice: '' }));
                      }
                    }}
                    error={productErrors.costPrice}
                    helperText="Wholesale buying cost per unit"
                  />

                  <Input
                    label="Selling price *"
                    isCurrency={true}
                    placeholder="28"
                    value={pSellingPrice}
                    onChange={(e) => {
                      setPSellingPrice(e.target.value);
                      if (productErrors.sellingPrice) {
                        setProductErrors((prev) => ({ ...prev, sellingPrice: '' }));
                      }
                    }}
                    error={productErrors.sellingPrice}
                    helperText={
                      pCostPrice && pSellingPrice && parseFloat(pSellingPrice) < parseFloat(pCostPrice)
                        ? 'Warning: Selling price is below cost price!'
                        : 'Retail counter sale price'
                    }
                  />
                </div>

                {/* Field 5 & 6: Stock Quantity & Reorder Level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Stock quantity *"
                    placeholder="50"
                    value={pStockQty}
                    onChange={(e) => {
                      setPStockQty(e.target.value);
                      if (productErrors.stockQty) {
                        setProductErrors((prev) => ({ ...prev, stockQty: '' }));
                      }
                    }}
                    error={productErrors.stockQty}
                    helperText="Total units physically available in store"
                  />

                  <Input
                    type="number"
                    label="Reorder level alert"
                    placeholder="10"
                    value={pReorderLevel}
                    onChange={(e) => {
                      setPReorderLevel(e.target.value);
                      if (productErrors.reorderLevel) {
                        setProductErrors((prev) => ({ ...prev, reorderLevel: '' }));
                      }
                    }}
                    error={productErrors.reorderLevel}
                    helperText="Threshold to trigger low-stock warning"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingProduct}
                    className="h-12 min-h-[48px] px-6 text-sm"
                  >
                    {isSubmittingProduct
                      ? 'Saving...'
                      : editingProductId
                      ? 'Update product'
                      : 'Add product'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetProductForm}
                    className="h-12 min-h-[48px] px-4 text-sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Reset form
                  </Button>
                </div>
              </form>
            ) : (
              /* CSV Bulk Import for Products */
              <div className="flex flex-col gap-5 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[8px] bg-canvas border border-border">
                  <div>
                    <h4 className="text-xs font-semibold text-text-high">
                      Download CSV template
                    </h4>
                    <p className="text-xs text-text-medium mt-0.5">
                      Use our pre-formatted spreadsheet with product name, cost price, and stock headers.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => downloadCsvFile('store_bi_products_template.csv', PRODUCT_CSV_TEMPLATE)}
                    className="min-h-[48px] px-4 text-xs shrink-0"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download template (.csv)
                  </Button>
                </div>

                {/* File Dropzone / Upload Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-high">
                    Upload completed CSV file
                  </label>
                  <div className="border-2 border-dashed border-border rounded-[10px] p-6 text-center hover:border-primary/50 transition-colors bg-canvas/40 flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-text-medium mb-2" strokeWidth={1.75} />
                    <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                      <span>Click to choose file</span>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleProductCsvFileChange}
                      />
                    </label>
                    <span className="text-[11px] text-text-medium mt-1">
                      Accepts standard comma-separated .csv files
                    </span>
                  </div>
                </div>

                {/* CSV Preview and Row-level Errors */}
                {productCsvParsed && (
                  <div className="flex flex-col gap-4 border border-border rounded-[8px] p-4 bg-surface">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-high">Import Preview</span>
                        <Badge variant={productCsvParsed.totalErrors === 0 ? 'success' : 'warning'}>
                          {productCsvParsed.totalValid} valid rows
                        </Badge>
                        {productCsvParsed.totalErrors > 0 && (
                          <Badge variant="destructive">
                            {productCsvParsed.totalErrors} errors
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-text-medium">
                        Total {productCsvParsed.rows.length} rows detected
                      </span>
                    </div>

                    {/* Row-level Error Summary Alert */}
                    {productCsvParsed.totalErrors > 0 && (
                      <div className="p-3 rounded-[8px] bg-destructive/10 border border-destructive/20 flex flex-col gap-1 text-xs text-destructive">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Please resolve the following row-level errors:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                          {productCsvParsed.rows
                            .filter((r) => !r.isValid)
                            .map((r) => (
                              <li key={r.rowIndex}>
                                <strong>Row {r.rowIndex}:</strong> {r.errors.join(', ')}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Table Preview */}
                    <div className="overflow-x-auto max-h-64 border border-border rounded-[6px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Cost (₹)</TableHead>
                            <TableHead>Price (₹)</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Errors</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productCsvParsed.rows.map((row) => (
                            <TableRow
                              key={row.rowIndex}
                              className={!row.isValid ? 'bg-destructive/5' : undefined}
                            >
                              <TableCell className="text-xs text-text-medium tabular-nums">
                                {row.rowIndex}
                              </TableCell>
                              <TableCell>
                                {row.isValid ? (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Valid
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Invalid
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-semibold">{row.name || '–'}</TableCell>
                              <TableCell className="text-xs">{row.category}</TableCell>
                              <TableCell className="text-xs tabular-nums">{formatINR(row.cost_price)}</TableCell>
                              <TableCell className="text-xs tabular-nums font-semibold">
                                {formatINR(row.selling_price)}
                              </TableCell>
                              <TableCell className="text-xs tabular-nums">{row.stock_qty}</TableCell>
                              <TableCell className="text-xs text-destructive">
                                {row.errors.length > 0 ? row.errors.join('; ') : '–'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Confirmation Button */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setProductCsvParsed(null);
                        }}
                        className="h-11 min-h-[44px] text-xs"
                      >
                        Clear CSV
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={productCsvParsed.totalValid === 0 || isImportingProducts}
                        onClick={handleConfirmProductCsv}
                        className="h-11 min-h-[44px] px-6 text-xs"
                      >
                        {isImportingProducts
                          ? 'Importing...'
                          : `Confirm & Import ${productCsvParsed.totalValid} valid products`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* FORM 2: RECORD SALE */}
      {/* ======================================================== */}
      {activeForm === 'sale' && (
        <Card>
          <CardHeader
            title="Record counter sale"
            subtitle="Pick items from store stock, automatically calculate total & profit, and decrement inventory."
            action={
              existingProducts.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-[8px] border border-border">
                  <button
                    type="button"
                    onClick={() => setSaleMode('single')}
                    className={`h-8 px-3 rounded-[6px] text-xs font-medium transition-colors ${
                      saleMode === 'single'
                        ? 'bg-surface text-text-high border border-border font-semibold'
                        : 'text-text-medium hover:text-text-high'
                    }`}
                  >
                    Single counter bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleMode('csv')}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-xs font-medium transition-colors ${
                      saleMode === 'csv'
                        ? 'bg-surface text-text-high border border-border font-semibold'
                        : 'text-text-medium hover:text-text-high'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    CSV bulk import
                  </button>
                </div>
              ) : undefined
            }
          />
          <CardContent className="p-6">
            {/* Rule: If there are no products yet, the sale form shows "Add a product first" with a link */}
            {existingProducts.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center bg-canvas/50 border border-dashed border-border rounded-[10px]">
                <div className="w-12 h-12 rounded-full bg-primary/[0.08] flex items-center justify-center text-primary mb-3">
                  <PackagePlus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-text-high">Add a product first</h3>
                <p className="text-xs text-text-medium max-w-sm mt-1 mb-4">
                  You do not have any products in your store inventory yet. Please add your first product before recording a customer sale bill.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveForm('product')}
                  className="h-12 min-h-[48px] px-6 text-sm"
                >
                  <PackagePlus className="w-4 h-4 mr-2" />
                  Add a product first
                </Button>
              </div>
            ) : saleMode === 'single' ? (
              <form onSubmit={handleSaveSale} className="flex flex-col gap-6 max-w-3xl">
                {/* Product Search & Picker with Autocomplete */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-text-high">
                    Pick products to add to bill *
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-text-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      placeholder="Search product by name to add to sale bill..."
                      value={saleProductSearch}
                      onChange={(e) => {
                        setSaleProductSearch(e.target.value);
                        setShowSaleAutocomplete(true);
                      }}
                      onFocus={() => setShowSaleAutocomplete(true)}
                      className="pl-10"
                      autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {showSaleAutocomplete && saleProductSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-[52px] bg-surface rounded-[8px] border border-border overflow-hidden max-h-60 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-canvas border-b border-border text-[11px] font-semibold text-text-medium flex items-center justify-between">
                          <span>Select item to add</span>
                          <button
                            type="button"
                            onClick={() => setShowSaleAutocomplete(false)}
                            className="hover:text-text-high"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {saleProductSuggestions.map((prod) => {
                          const isOutOfStock = prod.stock_qty <= 0;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleAddProductToSale(prod)}
                              className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-canvas transition-colors border-b border-border/40 last:border-0"
                            >
                              <div>
                                <div className="text-xs font-semibold text-text-high">{prod.name}</div>
                                <div className="text-[11px] text-text-medium">
                                  {prod.category} •{' '}
                                  <span className={isOutOfStock ? 'text-destructive font-bold' : 'text-emerald-600'}>
                                    Stock: {prod.stock_qty}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-primary tabular-nums">
                                  {formatINR(prod.selling_price)}
                                </span>
                                <span className="block text-[10px] text-text-medium">
                                  + Click to add
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                {saleItems.length > 0 ? (
                  <div className="border border-border rounded-[8px] overflow-hidden bg-surface">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="w-28">Available</TableHead>
                          <TableHead className="w-32">Qty</TableHead>
                          <TableHead className="w-28 text-right">Unit Price</TableHead>
                          <TableHead className="w-32 text-right">Subtotal</TableHead>
                          <TableHead className="w-28 text-right">Profit</TableHead>
                          <TableHead className="w-12 text-center"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleItems.map((item, idx) => {
                          const isInsufficient = item.qty > item.stockQty;
                          return (
                            <TableRow
                              key={item.productId}
                              className={isInsufficient ? 'bg-destructive/5' : undefined}
                            >
                              <TableCell>
                                <div className="text-xs font-semibold text-text-high">{item.productName}</div>
                                <div className="text-[11px] text-text-medium">{item.category}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.stockQty <= 0 ? 'destructive' : isInsufficient ? 'warning' : 'neutral'}>
                                  {item.stockQty} units
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value, 10))}
                                    className={`h-10 min-h-[40px] text-xs tabular-nums ${
                                      isInsufficient ? 'border-destructive' : ''
                                    }`}
                                  />
                                  {isInsufficient && (
                                    <span className="text-[10px] text-destructive font-medium">
                                      Only {item.stockQty} in stock!
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {formatINR(item.unitPrice)}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums font-bold text-text-high">
                                {formatINR(item.qty * item.unitPrice)}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums text-emerald-600 font-semibold">
                                +{formatINR(item.qty * (item.unitPrice - item.unitCost))}
                              </TableCell>
                              <TableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSaleItem(idx)}
                                  className="text-text-medium hover:text-destructive p-1 rounded transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-4 rounded-[8px] bg-canvas border border-border text-center text-xs text-text-medium">
                    No products added to this bill yet. Search and pick an item above.
                  </div>
                )}

                {/* Error Banner if stock is insufficient */}
                {saleErrors.stock && (
                  <div className="p-3.5 rounded-[8px] bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{saleErrors.stock}</span>
                  </div>
                )}
                {saleErrors.items && (
                  <div className="p-3.5 rounded-[8px] bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{saleErrors.items}</span>
                  </div>
                )}

                {/* Auto Total & Auto Profit Live Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-[10px] bg-canvas border border-border">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-text-medium">Total Bill Amount</span>
                    <span className="text-2xl font-bold text-primary tabular-nums mt-0.5">
                      {formatINR(saleTotals.totalAmount)}
                    </span>
                    <span className="text-[11px] text-text-medium">{saleTotals.totalQty} total units</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-text-medium">Gross Profit</span>
                    <span className="text-2xl font-bold text-emerald-600 tabular-nums mt-0.5">
                      +{formatINR(saleTotals.totalProfit)}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {saleTotals.profitMargin.toFixed(1)}% margin
                    </span>
                  </div>

                  <div className="flex flex-col justify-center">
                    <span className="text-xs font-medium text-text-medium mb-1">Payment Mode</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PAYMENT_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setSalePaymentMode(mode.id)}
                          className={`h-9 min-h-[36px] px-2 rounded-[6px] text-xs font-semibold transition-colors ${
                            salePaymentMode === mode.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-surface border border-border text-text-medium hover:text-text-high'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Date/Time defaults to now */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="datetime-local"
                    label="Transaction date & time"
                    value={saleDateTime}
                    onChange={(e) => setSaleDateTime(e.target.value)}
                    helperText="Defaults to now. Can be backdated for past counter receipts."
                  />
                </div>

                {/* Submit and Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingSale || saleTotals.hasStockIssue || saleItems.length === 0}
                    className="h-12 min-h-[48px] px-6 text-sm"
                  >
                    {isSubmittingSale ? 'Recording...' : `Record sale (${formatINR(saleTotals.totalAmount)})`}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetSaleForm}
                    className="h-12 min-h-[48px] px-4 text-sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Reset bill
                  </Button>
                </div>
              </form>
            ) : (
              /* CSV Bulk Import for Sales */
              <div className="flex flex-col gap-5 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[8px] bg-canvas border border-border">
                  <div>
                    <h4 className="text-xs font-semibold text-text-high">
                      Download sales CSV template
                    </h4>
                    <p className="text-xs text-text-medium mt-0.5">
                      Columns: product_name, qty, unit_price, payment_mode, date_time.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => downloadCsvFile('store_bi_sales_template.csv', SALE_CSV_TEMPLATE)}
                    className="min-h-[48px] px-4 text-xs shrink-0"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download template (.csv)
                  </Button>
                </div>

                {/* File Dropzone / Upload Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-high">
                    Upload completed Sales CSV file
                  </label>
                  <div className="border-2 border-dashed border-border rounded-[10px] p-6 text-center hover:border-primary/50 transition-colors bg-canvas/40 flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-text-medium mb-2" strokeWidth={1.75} />
                    <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                      <span>Click to choose file</span>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleSaleCsvFileChange}
                      />
                    </label>
                    <span className="text-[11px] text-text-medium mt-1">
                      Rows are validated against your live product inventory and stock quantities.
                    </span>
                  </div>
                </div>

                {/* CSV Preview and Row-level Errors */}
                {saleCsvParsed && (
                  <div className="flex flex-col gap-4 border border-border rounded-[8px] p-4 bg-surface">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-high">Sales Import Preview</span>
                        <Badge variant={saleCsvParsed.totalErrors === 0 ? 'success' : 'warning'}>
                          {saleCsvParsed.totalValid} valid sales
                        </Badge>
                        {saleCsvParsed.totalErrors > 0 && (
                          <Badge variant="destructive">
                            {saleCsvParsed.totalErrors} errors
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-text-medium">
                        Total {saleCsvParsed.rows.length} rows detected
                      </span>
                    </div>

                    {/* Row-level Error Summary Alert */}
                    {saleCsvParsed.totalErrors > 0 && (
                      <div className="p-3 rounded-[8px] bg-destructive/10 border border-destructive/20 flex flex-col gap-1 text-xs text-destructive">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Please resolve the following row-level errors:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                          {saleCsvParsed.rows
                            .filter((r) => !r.isValid)
                            .map((r) => (
                              <li key={r.rowIndex}>
                                <strong>Row {r.rowIndex}:</strong> {r.errors.join(', ')}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Table Preview */}
                    <div className="overflow-x-auto max-h-64 border border-border rounded-[6px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Price (₹)</TableHead>
                            <TableHead>Total (₹)</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Errors</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleCsvParsed.rows.map((row) => (
                            <TableRow
                              key={row.rowIndex}
                              className={!row.isValid ? 'bg-destructive/5' : undefined}
                            >
                              <TableCell className="text-xs text-text-medium tabular-nums">
                                {row.rowIndex}
                              </TableCell>
                              <TableCell>
                                {row.isValid ? (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Valid
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Invalid
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-semibold">{row.product_name || '–'}</TableCell>
                              <TableCell className="text-xs tabular-nums">{row.qty}</TableCell>
                              <TableCell className="text-xs tabular-nums">{formatINR(row.unit_price)}</TableCell>
                              <TableCell className="text-xs tabular-nums font-bold">
                                {formatINR(row.line_total)}
                              </TableCell>
                              <TableCell className="text-xs">{row.payment_mode}</TableCell>
                              <TableCell className="text-xs text-destructive">
                                {row.errors.length > 0 ? row.errors.join('; ') : '–'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Confirmation Button */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSaleCsvParsed(null);
                        }}
                        className="h-11 min-h-[44px] text-xs"
                      >
                        Clear CSV
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={saleCsvParsed.totalValid === 0 || isImportingSales}
                        onClick={handleConfirmSaleCsv}
                        className="h-11 min-h-[44px] px-6 text-xs"
                      >
                        {isImportingSales
                          ? 'Recording...'
                          : `Confirm & Import ${saleCsvParsed.totalValid} valid sales`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* FORM 3: ADD EXPENSE */}
      {/* ======================================================== */}
      {activeForm === 'expense' && (
        <Card>
          <CardHeader
            title="Add store operating expense"
            subtitle="Track electricity, shop rent, tempo transport, packaging, and tea expenses in your ledger."
          />
          <CardContent className="p-6">
            <form onSubmit={handleSaveExpense} className="flex flex-col gap-5 max-w-lg">
              {/* Field 1: Date */}
              <Input
                type="date"
                label="Expense date *"
                value={expDate}
                onChange={(e) => {
                  setExpDate(e.target.value);
                  if (expenseErrors.date) {
                    setExpenseErrors((prev) => ({ ...prev, date: '' }));
                  }
                }}
                error={expenseErrors.date}
                helperText="Defaults to today"
              />

              {/* Field 2: Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-high">Expense category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="flex h-12 min-h-[48px] w-full rounded-[8px] border border-border bg-surface px-3.5 py-2 text-sm text-text-high focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Amount with ₹ prefix */}
              <Input
                label="Amount *"
                isCurrency={true}
                placeholder="1200"
                value={expAmount}
                onChange={(e) => {
                  setExpAmount(e.target.value);
                  if (expenseErrors.amount) {
                    setExpenseErrors((prev) => ({ ...prev, amount: '' }));
                  }
                }}
                error={expenseErrors.amount}
                helperText="Amount paid out in Indian Rupees"
              />

              {/* Field 4: Note */}
              <Input
                label="Note / remarks (optional)"
                placeholder="e.g. Paid shop rent for October via cash"
                value={expNote}
                onChange={(e) => setExpNote(e.target.value)}
                helperText="Optional description for your accountant or ledger"
              />

              {/* Submit and Actions */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingExpense}
                  className="h-12 min-h-[48px] px-6 text-sm"
                >
                  {isSubmittingExpense ? 'Saving...' : 'Save expense'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResetExpenseForm}
                  className="h-12 min-h-[48px] px-4 text-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reset form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
