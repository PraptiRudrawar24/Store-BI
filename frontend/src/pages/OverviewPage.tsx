import * as React from 'react';
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Package,
  Plus,
  Store,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatINR } from '../utils';
import { api } from '../api/client';
import type { Product, Sale, AnalyticsSummary } from '../api/client';
import { useToast } from '../components/ui/Toast';

export function OverviewPage() {
  const toast = useToast();
  const [summary, setSummary] = React.useState<AnalyticsSummary>({
    total_revenue: 0,
    total_profit: 0,
    total_expenses: 0,
    net_income: 0,
    total_sales_count: 0,
    total_products_count: 0,
    low_stock_count: 0,
  });
  const [products, setProducts] = React.useState<Product[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modals state
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = React.useState(false);

  // New product form
  const [productForm, setProductForm] = React.useState({
    name: '',
    category: 'Kirana',
    cost_price: '',
    selling_price: '',
    stock_qty: '',
    reorder_level: '10',
  });

  // New sale form
  const [saleForm, setSaleForm] = React.useState({
    total_amount: '',
    total_profit: '',
    payment_mode: 'UPI',
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [sum, prodList, saleList] = await Promise.all([
        api.getSummary(),
        api.getProducts(),
        api.getSales(),
      ]);
      setSummary(sum);
      setProducts(prodList);
      setSales(saleList);
    } catch {
      toast.error('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.selling_price) {
      toast.error('Please fill in product name and selling price');
      return;
    }
    try {
      await api.createProduct({
        name: productForm.name,
        category: productForm.category,
        cost_price: parseFloat(productForm.cost_price) || 0,
        selling_price: parseFloat(productForm.selling_price) || 0,
        stock_qty: parseInt(productForm.stock_qty, 10) || 0,
        reorder_level: parseInt(productForm.reorder_level, 10) || 10,
      });
      toast.success('Product added successfully');
      setIsAddProductOpen(false);
      setProductForm({
        name: '',
        category: 'Kirana',
        cost_price: '',
        selling_price: '',
        stock_qty: '',
        reorder_level: '10',
      });
      loadData();
    } catch {
      toast.error('Failed to create product');
    }
  };

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.total_amount) {
      toast.error('Please enter sale amount');
      return;
    }
    try {
      await api.createSale({
        total_amount: parseFloat(saleForm.total_amount) || 0,
        total_profit: parseFloat(saleForm.total_profit) || 0,
        payment_mode: saleForm.payment_mode,
        items: [],
      });
      toast.success('Sale transaction recorded');
      setIsRecordSaleOpen(false);
      setSaleForm({
        total_amount: '',
        total_profit: '',
        payment_mode: 'UPI',
      });
      loadData();
    } catch {
      toast.error('Failed to record sale');
    }
  };

  const hasData = summary.total_sales_count > 0 || summary.total_products_count > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">Business overview</h1>
          <p className="text-sm text-text-medium mt-0.5">
            Real-time financial performance and retail stock metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsAddProductOpen(true)}
            className="text-xs"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Add product</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsRecordSaleOpen(true)}
            className="text-xs"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Record sale</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total revenue"
          value={formatINR(summary.total_revenue)}
          previousValue={0}
          subtext="vs previous period"
          icon={<IndianRupee className="w-4 h-4" strokeWidth={2} />}
        />
        <StatCard
          label="Net profit"
          value={formatINR(summary.net_income)}
          previousValue={0}
          subtext="after expenses"
          icon={<TrendingUp className="w-4 h-4" strokeWidth={2} />}
        />
        <StatCard
          label="Sales count"
          value={summary.total_sales_count.toLocaleString('en-IN')}
          previousValue={0}
          subtext="total bills"
          icon={<ShoppingBag className="w-4 h-4" strokeWidth={2} />}
        />
        <StatCard
          label="Active products"
          value={summary.total_products_count.toLocaleString('en-IN')}
          previousValue={0}
          subtext="in store catalog"
          icon={<Package className="w-4 h-4" strokeWidth={2} />}
        />
      </div>

      {/* Main Body: Zero-Start Empty State or Data Tables */}
      {!hasData && !loading ? (
        <EmptyState
          icon={<Store className="w-6 h-6 text-primary" strokeWidth={2} />}
          title="Welcome to Store BI"
          description="Your store database starts completely clean with 0 records. Add your retail inventory items or record your first sale to activate real-time store analytics."
          actionLabel="Add first product"
          onAction={() => setIsAddProductOpen(true)}
          secondaryActionLabel="Record a sale"
          onSecondaryAction={() => setIsRecordSaleOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <Card>
            <CardHeader
              title="Recent sales"
              subtitle="Latest checkout transactions"
              action={
                <Button
                  variant="secondary"
                  className="min-h-[48px] px-3 text-xs"
                  onClick={() => setIsRecordSaleOpen(true)}
                >
                  New sale
                </Button>
              }
            />
            <CardContent className="p-0">
              {sales.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-medium">
                  No sales recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.slice(0, 5).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">#{s.id}</TableCell>
                        <TableCell>
                          <Badge variant="neutral">{s.payment_mode}</Badge>
                        </TableCell>
                        <TableCell isNumeric>{formatINR(s.total_amount)}</TableCell>
                        <TableCell isNumeric className="text-success font-semibold">
                          {formatINR(s.total_profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Catalog Highlights */}
          <Card>
            <CardHeader
              title="Product catalog"
              subtitle="Current inventory and reorder status"
              action={
                <Button
                  variant="secondary"
                  className="min-h-[48px] px-3 text-xs"
                  onClick={() => setIsAddProductOpen(true)}
                >
                  New product
                </Button>
              }
            />
            <CardContent className="p-0">
              {products.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-medium">
                  No products in catalog yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.slice(0, 5).map((p) => {
                      const isLowStock = p.stock_qty <= p.reorder_level;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell isNumeric>{p.stock_qty}</TableCell>
                          <TableCell isNumeric>{formatINR(p.selling_price)}</TableCell>
                          <TableCell>
                            <Badge variant={isLowStock ? 'warning' : 'success'}>
                              {isLowStock ? 'Low stock' : 'In stock'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add new product"
        description="Enter product details to add it to your retail inventory."
      >
        <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
          <Input
            label="Product name"
            placeholder="e.g. Aashirvaad Atta 10kg"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            required
          />
          <Input
            label="Category"
            placeholder="e.g. Kirana, Dairy, Personal care"
            value={productForm.category}
            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost price"
              isCurrency
              placeholder="0"
              value={productForm.cost_price}
              onChange={(e) =>
                setProductForm({ ...productForm, cost_price: e.target.value })
              }
            />
            <Input
              label="Selling price"
              isCurrency
              placeholder="0"
              value={productForm.selling_price}
              onChange={(e) =>
                setProductForm({ ...productForm, selling_price: e.target.value })
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Opening stock qty"
              type="number"
              placeholder="0"
              value={productForm.stock_qty}
              onChange={(e) =>
                setProductForm({ ...productForm, stock_qty: e.target.value })
              }
            />
            <Input
              label="Reorder alert level"
              type="number"
              placeholder="10"
              value={productForm.reorder_level}
              onChange={(e) =>
                setProductForm({ ...productForm, reorder_level: e.target.value })
              }
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddProductOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Sale Modal */}
      <Modal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        title="Record counter sale"
        description="Log a counter bill or UPI sale."
      >
        <form onSubmit={handleRecordSale} className="flex flex-col gap-4">
          <Input
            label="Total bill amount"
            isCurrency
            placeholder="0"
            value={saleForm.total_amount}
            onChange={(e) =>
              setSaleForm({ ...saleForm, total_amount: e.target.value })
            }
            required
          />
          <Input
            label="Estimated profit"
            isCurrency
            placeholder="0"
            value={saleForm.total_profit}
            onChange={(e) =>
              setSaleForm({ ...saleForm, total_profit: e.target.value })
            }
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-high">
              Payment mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['UPI', 'Cash', 'Card'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSaleForm({ ...saleForm, payment_mode: mode })}
                  className={`h-12 rounded-[8px] border font-semibold text-sm transition-colors ${
                    saleForm.payment_mode === mode
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-surface text-text-high hover:bg-canvas'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRecordSaleOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save sale
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
