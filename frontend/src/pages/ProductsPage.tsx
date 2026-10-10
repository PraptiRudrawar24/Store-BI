import * as React from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatINR } from '../utils';
import { api } from '../api/client';
import type { Product } from '../api/client';
import { useToast } from '../components/ui/Toast';

export function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const [form, setForm] = React.useState({
    name: '',
    category: 'General',
    cost_price: '',
    selling_price: '',
    stock_qty: '',
    reorder_level: '10',
  });

  const loadProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getProducts();
      setProducts(list);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.selling_price) {
      toast.error('Product name and selling price are required');
      return;
    }
    try {
      await api.createProduct({
        name: form.name,
        category: form.category,
        cost_price: parseFloat(form.cost_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        stock_qty: parseInt(form.stock_qty, 10) || 0,
        reorder_level: parseInt(form.reorder_level, 10) || 10,
      });
      toast.success('Product added to inventory');
      setIsAddOpen(false);
      setForm({
        name: '',
        category: 'General',
        cost_price: '',
        selling_price: '',
        stock_qty: '',
        reorder_level: '10',
      });
      loadProducts();
    } catch {
      toast.error('Error saving product');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteProduct(id);
      toast.success('Product removed');
      loadProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">Product catalog</h1>
          <p className="text-sm text-text-medium mt-0.5">
            Manage store inventory, cost prices, and reorder levels.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>Add product</span>
        </Button>
      </div>

      {products.length === 0 && !loading ? (
        <EmptyState
          icon={<Package className="w-6 h-6 text-primary" strokeWidth={2} />}
          title="No products in catalog"
          description="Your product inventory is currently empty. Add items one-by-one or import stock to track availability and sales margins."
          actionLabel="Add first product"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <Card>
          <CardHeader
            title="All inventory items"
            subtitle={`${products.length} products listed`}
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost price</TableHead>
                  <TableHead>Selling price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const isLow = p.stock_qty <= p.reorder_level;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="neutral">{p.category}</Badge>
                      </TableCell>
                      <TableCell isNumeric>{formatINR(p.cost_price)}</TableCell>
                      <TableCell isNumeric>{formatINR(p.selling_price)}</TableCell>
                      <TableCell isNumeric>{p.stock_qty}</TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'warning' : 'success'}>
                          {isLow ? 'Low stock' : 'In stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="w-8 h-8 rounded-[4px] flex items-center justify-center text-text-low hover:text-destructive hover:bg-canvas transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add product to catalog"
        description="Enter name, price, and initial stock quantities."
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Product name"
            placeholder="e.g. Tata Salt 1kg"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Category"
            placeholder="e.g. Kirana, Dairy, Snacks"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost price"
              isCurrency
              placeholder="0"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            />
            <Input
              label="Selling price"
              isCurrency
              placeholder="0"
              value={form.selling_price}
              onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stock quantity"
              type="number"
              placeholder="0"
              value={form.stock_qty}
              onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
            />
            <Input
              label="Reorder level"
              type="number"
              placeholder="10"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save product
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
