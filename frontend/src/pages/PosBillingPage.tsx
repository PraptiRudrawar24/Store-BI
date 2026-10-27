import * as React from 'react';
import type { ProductCategory, ProductItem, CartItem, CustomerInfo, PaymentMethod, CompletedSale } from '../types/pos';
import { calculateCartTotals } from '../utils/money';
import { BarcodeSearch } from '../components/pos/BarcodeSearch';
import { CategoryFilter } from '../components/pos/CategoryFilter';
import { ProductCatalog } from '../components/pos/ProductCatalog';
import { HotkeyBar } from '../components/pos/HotkeyBar';
import { CartPanel } from '../components/pos/CartPanel';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { api } from '../api/client';
import type { Product } from '../api/client';

// Local storage persistence helper to prevent unexpected terminal resets and isolate per user
const POS_STORAGE_CART = 'storebi_pos_cart';
const POS_STORAGE_CUSTOMER = 'storebi_pos_customer';
const POS_STORAGE_PAYMENT = 'storebi_pos_payment_method';
const POS_STORAGE_DISCOUNT = 'storebi_pos_discount';
const POS_STORAGE_LAST_SALE = 'storebi_pos_last_sale';

const getPosStorageKey = (baseKey: string, userId?: number | null) => {
  return `${baseKey}_u${userId ?? 'guest'}`;
};

export function PosBillingPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { refreshAlerts } = useAlerts();

  // 1. Sync products from backend database
  const [dbProducts, setDbProducts] = React.useState<Product[]>([]);

  const fetchInventory = React.useCallback(() => {
    api.getProducts().then((res) => {
      if (Array.isArray(res)) {
        setDbProducts(res);
      }
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    fetchInventory();
  }, [fetchInventory, user?.id]);

  // Catalog: Show ONLY products currently available in inventory (stock_qty > 0)
  // Excludes out of stock, inactive, or unavailable products. Zero mock/static products.
  const products = React.useMemo<ProductItem[]>(() => {
    const list: ProductItem[] = [];

    dbProducts.forEach((p) => {
      // Exclude products that are out of stock
      if (p.stock_qty <= 0) return;

      let cat: Exclude<ProductCategory, 'All Items'> = 'Personal Care';
      const cLower = (p.category || '').toLowerCase();
      if (cLower.includes('health') || cLower.includes('pharma') || cLower.includes('med')) {
        cat = 'Health & OTC';
      } else if (cLower.includes('snack') || cLower.includes('sweet') || cLower.includes('biscuit')) {
        cat = 'Snacks & Sweets';
      } else if (cLower.includes('dairy') || cLower.includes('staple') || cLower.includes('flour') || cLower.includes('oil') || cLower.includes('kirana') || cLower.includes('grocery')) {
        cat = 'Dairy & Staples';
      } else if (cLower.includes('bev') || cLower.includes('drink') || cLower.includes('tea') || cLower.includes('coffee')) {
        cat = 'Beverages';
      } else if (cLower.includes('house') || cLower.includes('clean') || cLower.includes('wash') || cLower.includes('detergent')) {
        cat = 'Household';
      }

      list.push({
        id: `db-${p.id}`,
        dbId: p.id,
        name: p.name,
        sku: `SKU-${String(p.id).padStart(4, '0')}`,
        barcode: `890${String(p.id).padStart(10, '0')}`,
        category: cat,
        pricePaise: Math.round((p.selling_price || 0) * 100),
        costPaise: Math.round((p.cost_price || 0) * 100),
        stock: p.stock_qty,
        lowStockThreshold: p.reorder_level || 5,
      });
    });

    return list;
  }, [dbProducts]);

  // Terminal state: Current bill starts with NO selected products
  const [cart, setCart] = React.useState<CartItem[]>(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_CART, user?.id);
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory>('All Items');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Customer state: MUST start empty when creating a bill, require user input
  const [customer, setCustomer] = React.useState<CustomerInfo>(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_CUSTOMER, user?.id);
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            name: typeof parsed.name === 'string' ? parsed.name : '',
            phone: typeof parsed.phone === 'string' ? parsed.phone : '',
          };
        }
      }
    } catch {}
    return {
      name: '',
      phone: '',
    };
  });

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_PAYMENT, user?.id);
      const stored = localStorage.getItem(key) as PaymentMethod | null;
      if (stored && ['Cash', 'UPI / QR', 'Card', 'Store Credit'].includes(stored)) {
        return stored;
      }
    } catch {}
    return 'Cash';
  });

  const [discountPaise, setDiscountPaise] = React.useState<number>(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_DISCOUNT, user?.id);
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const val = Number(stored);
        if (!isNaN(val) && val >= 0) return val;
      }
    } catch {}
    return 0;
  });

  const [isRecording, setIsRecording] = React.useState(false);

  // 2. Receipt Modal State with persistence
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [lastCompletedSale, setLastCompletedSale] = React.useState<CompletedSale | null>(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_LAST_SALE, user?.id);
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  // Rehydrate per-user state when user identity changes
  React.useEffect(() => {
    const keyCart = getPosStorageKey(POS_STORAGE_CART, user?.id);
    const keyCust = getPosStorageKey(POS_STORAGE_CUSTOMER, user?.id);
    const keyPay = getPosStorageKey(POS_STORAGE_PAYMENT, user?.id);
    const keyDisc = getPosStorageKey(POS_STORAGE_DISCOUNT, user?.id);
    const keySale = getPosStorageKey(POS_STORAGE_LAST_SALE, user?.id);

    try {
      const storedCart = localStorage.getItem(keyCart);
      if (storedCart !== null) {
        const parsed = JSON.parse(storedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {}

    try {
      const storedCust = localStorage.getItem(keyCust);
      if (storedCust) {
        const parsed = JSON.parse(storedCust);
        if (parsed && typeof parsed === 'object') {
          setCustomer({
            name: typeof parsed.name === 'string' ? parsed.name : '',
            phone: typeof parsed.phone === 'string' ? parsed.phone : '',
          });
        }
      }
    } catch {}

    try {
      const storedPay = localStorage.getItem(keyPay) as PaymentMethod | null;
      if (storedPay && ['Cash', 'UPI / QR', 'Card', 'Store Credit'].includes(storedPay)) {
        setPaymentMethod(storedPay);
      }
    } catch {}

    try {
      const storedDisc = localStorage.getItem(keyDisc);
      if (storedDisc !== null) {
        const val = Number(storedDisc);
        if (!isNaN(val) && val >= 0) setDiscountPaise(val);
      }
    } catch {}

    try {
      const storedSale = localStorage.getItem(keySale);
      if (storedSale) {
        setLastCompletedSale(JSON.parse(storedSale));
      }
    } catch {}
  }, [user?.id]);

  // Automatically save terminal state to scoped localStorage on every change
  React.useEffect(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_CART, user?.id);
      localStorage.setItem(key, JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save POS cart to localStorage:', e);
    }
  }, [cart, user?.id]);

  React.useEffect(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_CUSTOMER, user?.id);
      localStorage.setItem(key, JSON.stringify(customer));
    } catch {}
  }, [customer, user?.id]);

  React.useEffect(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_PAYMENT, user?.id);
      localStorage.setItem(key, paymentMethod);
    } catch {}
  }, [paymentMethod, user?.id]);

  React.useEffect(() => {
    try {
      const key = getPosStorageKey(POS_STORAGE_DISCOUNT, user?.id);
      localStorage.setItem(key, String(discountPaise));
    } catch {}
  }, [discountPaise, user?.id]);

  React.useEffect(() => {
    try {
      if (lastCompletedSale) {
        const key = getPosStorageKey(POS_STORAGE_LAST_SALE, user?.id);
        localStorage.setItem(key, JSON.stringify(lastCompletedSale));
      }
    } catch {}
  }, [lastCompletedSale, user?.id]);

  // Mobile active tab view ('catalog' | 'bill')
  const [mobileTab, setMobileTab] = React.useState<'catalog' | 'bill'>('catalog');

  const barcodeInputRef = React.useRef<HTMLInputElement | null>(null);

  // Calculate live cart totals in integer paise
  const totals = React.useMemo(() => {
    return calculateCartTotals(cart, discountPaise);
  }, [cart, discountPaise]);

  // Categories list
  const categories: ProductCategory[] = [
    'All Items',
    'Personal Care',
    'Health & OTC',
    'Snacks & Sweets',
    'Dairy & Staples',
    'Beverages',
    'Household',
  ];

  // Filtered products by category & search query
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === 'All Items' || p.category === selectedCategory;

      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = React.useCallback((product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`Cannot add more. Max available stock is ${product.stock}.`, 'info');
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, [showToast]);

  const handleUpdateQuantity = React.useCallback((productId: string, newQuantity: number) => {
    setCart((prev) => {
      if (newQuantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  }, []);

  const handleRemoveItem = React.useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const handleClearCart = React.useCallback(() => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear the current transaction cart?')) {
      setCart([]);
      try {
        localStorage.removeItem(getPosStorageKey(POS_STORAGE_CART, user?.id));
      } catch {}
      showToast('Cart cleared', 'info');
    }
  }, [cart.length, user?.id, showToast]);

  // Explicit New Bill reset: Resets customer, cart, and discount for a fresh transaction
  const handleNewBill = React.useCallback(() => {
    if (cart.length > 0 || customer.name || customer.phone) {
      if (!window.confirm('Start a new bill? Current unsaved customer details and cart items will be cleared.')) {
        return;
      }
    }
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setDiscountPaise(0);
    try {
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_CART, user?.id));
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_CUSTOMER, user?.id));
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_DISCOUNT, user?.id));
    } catch {}
    showToast('New bill started. Enter customer details and select products.', 'info');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
  }, [cart.length, customer, user?.id, showToast]);

  // Barcode search / scan submission
  const handleBarcodeSubmit = React.useCallback(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Look for exact match by barcode or SKU first, then by name
    const exactMatch =
      products.find(
        (p) =>
          p.barcode.toLowerCase() === query ||
          p.sku.toLowerCase() === query
      ) ||
      products.find((p) => p.name.toLowerCase().includes(query));

    if (exactMatch) {
      handleAddToCart(exactMatch);
      showToast(`Added: ${exactMatch.name}`, 'success');
      setSearchQuery('');
    } else {
      showToast('No matching product found in available inventory', 'info');
    }
  }, [searchQuery, products, handleAddToCart, showToast]);

  const handleFocusScanner = React.useCallback(() => {
    barcodeInputRef.current?.focus();
    barcodeInputRef.current?.select();
  }, []);

  // Custom Discount handler [F4]
  const handleApplyDiscount = React.useCallback(() => {
    if (discountPaise > 0) {
      setDiscountPaise(0);
      showToast('Custom discount removed', 'info');
    } else {
      // Apply ₹25.00 promotional discount
      setDiscountPaise(2500);
      showToast('Applied ₹25.00 promotional discount', 'success');
    }
  }, [discountPaise, showToast]);

  // Complete Sale & Generate Bill (Persists into backend database for analytics)
  const handleCompleteSale = React.useCallback(async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Select products from inventory before generating bill.', 'info');
      return;
    }
    if (isRecording) return;

    // Frontend validation: Ensure no item exceeds available stock
    for (const item of cart) {
      if (item.quantity > item.product.stock) {
        showToast(
          `Cannot complete bill: Quantity for '${item.product.name}' (${item.quantity}) exceeds available stock (${item.product.stock}).`,
          'error'
        );
        return;
      }
      if (item.quantity <= 0) {
        showToast(`Invalid quantity for '${item.product.name}'. Must be at least 1.`, 'error');
        return;
      }
    }

    setIsRecording(true);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const totalAmountRupees = Number((totals.grandTotalPaise / 100).toFixed(2));

    // Calculate wholesale cost and net profit
    let totalCostRupees = 0;
    cart.forEach((item) => {
      const unitCost = item.product.costPaise
        ? item.product.costPaise / 100
        : (item.product.pricePaise * 0.75) / 100;
      totalCostRupees += unitCost * item.quantity;
    });
    const totalProfitRupees = Math.max(0, Number((totalAmountRupees - totalCostRupees).toFixed(2)));

    const paymentModeMapped =
      paymentMethod === 'UPI / QR'
        ? 'UPI'
        : paymentMethod === 'Store Credit'
        ? 'Credit'
        : paymentMethod;

    const saleLineItems = cart
      .filter((item) => item.product.dbId !== undefined)
      .map((item) => ({
        product_id: item.product.dbId!,
        qty: item.quantity,
        unit_price: Number((item.product.pricePaise / 100).toFixed(2)),
        unit_cost: Number(((item.product.costPaise || item.product.pricePaise * 0.75) / 100).toFixed(2)),
      }));

    if (saleLineItems.length !== cart.length) {
      showToast('Some items in the cart are missing a valid database reference.', 'error');
      setIsRecording(false);
      return;
    }

    let createdSaleId: number | null = null;

    try {
      // Record the sale into backend database with real customer details and line items
      const saleResult = await api.createSale({
        total_amount: totalAmountRupees,
        total_profit: totalProfitRupees,
        payment_mode: paymentModeMapped,
        date_time: now.toISOString(),
        customer_name: customer.name.trim() || undefined,
        customer_phone: customer.phone.trim() || undefined,
        items: saleLineItems,
      });
      createdSaleId = saleResult.id;

      // Refresh inventory stock from backend immediately after sale
      fetchInventory();
      refreshAlerts();
    } catch (err: any) {
      console.error('Backend sale error:', err);
      showToast(err?.message || 'Failed to complete sale due to stock or server error.', 'error');
      setIsRecording(false);
      return;
    } finally {
      setIsRecording(false);
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const billNumber = createdSaleId
      ? `POS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(createdSaleId).padStart(4, '0')}`
      : `POS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${randomSuffix}`;

    const completedSale: CompletedSale = {
      billNumber,
      timestamp: `${dateStr}, ${timeStr}`,
      items: [...cart],
      totals: { ...totals },
      customer: { ...customer },
      paymentMethod,
      storeName: user?.store_name || user?.name || 'Main Counter',
      storeDivision: 'Billing Counter 01',
      storeCode: 'POS-01',
    };

    setLastCompletedSale(completedSale);
    setIsReceiptOpen(true);
    showToast(`Bill ${billNumber} recorded & inventory updated!`, 'success');

    // Reset current transaction-specific form state after successful checkout
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setDiscountPaise(0);
    try {
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_CART, user?.id));
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_CUSTOMER, user?.id));
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_DISCOUNT, user?.id));
    } catch {}
  }, [
    cart,
    totals,
    customer,
    paymentMethod,
    user?.name,
    user?.id,
    isRecording,
    fetchInventory,
    refreshAlerts,
    showToast,
  ]);

  // Prepare terminal for next transaction after completing a bill
  const handleNewSale = React.useCallback(() => {
    setIsReceiptOpen(false);
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setDiscountPaise(0);
    try {
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_CART, user?.id));
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_CUSTOMER, user?.id));
      localStorage.removeItem(getPosStorageKey(POS_STORAGE_DISCOUNT, user?.id));
    } catch {}
    showToast('Ready for next transaction', 'info');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
  }, [user?.id, showToast]);

  // Page-scoped keyboard shortcuts (F2, F4, Ctrl+P, Esc, Enter)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleApplyDiscount();
      } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (isReceiptOpen) {
          window.print();
        } else if (lastCompletedSale) {
          setIsReceiptOpen(true);
        } else {
          showToast('No bill generated yet to print.', 'info');
        }
      } else if (e.key === 'Escape') {
        if (isReceiptOpen) {
          e.preventDefault();
          setIsReceiptOpen(false);
        } else if (document.activeElement instanceof HTMLElement) {
          // Safely blur active input/scanner without resetting or clearing the cart
          e.preventDefault();
          document.activeElement.blur();
        }
      } else if (e.key === 'Enter') {
        if (
          document.activeElement !== barcodeInputRef.current &&
          !isReceiptOpen &&
          cart.length > 0
        ) {
          e.preventDefault();
          handleCompleteSale();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isReceiptOpen,
    cart.length,
    lastCompletedSale,
    handleApplyDiscount,
    handleCompleteSale,
    showToast,
  ]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-canvas">
      {/* Mobile view toggle switcher */}
      <div className="lg:hidden flex border-b border-border bg-surface dark:bg-surface-low select-none">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            mobileTab === 'catalog'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium'
          }`}
        >
          Product Catalog ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('bill')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            mobileTab === 'bill'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium'
          }`}
        >
          Current Bill ({totals.totalQuantity})
        </button>
      </div>

      {/* Main Terminal Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT WORKSPACE: PRODUCT DISCOVERY, BARCODE SCAN & GRID */}
        <section
          className={`flex-1 flex flex-col min-w-0 bg-canvas border-r border-border h-full ${
            mobileTab === 'bill' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top Search & Filter Command Bar */}
          <div className="p-4 bg-surface dark:bg-surface-low border-b border-border flex flex-col gap-3 shrink-0">
            <BarcodeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleBarcodeSubmit}
              inputRef={barcodeInputRef}
              onScanClick={handleFocusScanner}
            />

            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Product Grid (Fast Pick Catalog) */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col">
            <ProductCatalog
              products={filteredProducts}
              cartItems={cart}
              onAddToCart={handleAddToCart}
            />
          </div>

          {/* Terminal Bottom Status Bar */}
          <HotkeyBar hardwareStatus="Thermal Printer Ready" />
        </section>

        {/* RIGHT PANEL: CURRENT BILL / ACTIVE CART */}
        <div
          className={`h-full ${
            mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex w-full'
          }`}
        >
          <CartPanel
            items={cart}
            totals={totals}
            customer={customer}
            paymentMethod={paymentMethod}
            onCustomerChange={setCustomer}
            onPaymentMethodChange={setPaymentMethod}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onNewBill={handleNewBill}
            onCompleteSale={handleCompleteSale}
            onApplyDiscountClick={handleApplyDiscount}
          />
        </div>
      </div>

      {/* 3. Interactive Thermal Receipt Modal */}
      <ReceiptModal
        sale={lastCompletedSale}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onNewSale={handleNewSale}
      />
    </div>
  );
}

export default PosBillingPage;
