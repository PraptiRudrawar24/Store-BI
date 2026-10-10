import * as React from 'react';
import { Receipt, Plus } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatINR } from '../utils';
import { api } from '../api/client';
import type { Sale } from '../api/client';
import { useToast } from '../components/ui/Toast';

export function SalesPage() {
  const toast = useToast();
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const [form, setForm] = React.useState({
    total_amount: '',
    total_profit: '',
    payment_mode: 'UPI',
  });

  const loadSales = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getSales();
      setSales(list);
    } catch {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.total_amount) {
      toast.error('Bill amount is required');
      return;
    }
    try {
      await api.createSale({
        total_amount: parseFloat(form.total_amount) || 0,
        total_profit: parseFloat(form.total_profit) || 0,
        payment_mode: form.payment_mode,
        items: [],
      });
      toast.success('Sale transaction recorded');
      setIsAddOpen(false);
      setForm({
        total_amount: '',
        total_profit: '',
        payment_mode: 'UPI',
      });
      loadSales();
    } catch {
      toast.error('Failed to record sale');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">Sales history</h1>
          <p className="text-sm text-text-medium mt-0.5">
            View transaction logs, billing receipts, and counter payments.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>Record sale</span>
        </Button>
      </div>

      {sales.length === 0 && !loading ? (
        <EmptyState
          icon={<Receipt className="w-6 h-6 text-primary" strokeWidth={2} />}
          title="No sales recorded yet"
          description="Your sales ledger is empty. Record customer counter purchases or scan bills to calculate daily revenue and profitability."
          actionLabel="Record first sale"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <Card>
          <CardHeader
            title="Transactions ledger"
            subtitle={`${sales.length} transactions total`}
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date & time</TableHead>
                  <TableHead>Payment mode</TableHead>
                  <TableHead>Total bill</TableHead>
                  <TableHead>Gross profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold">REC-{s.id.toString().padStart(4, '0')}</TableCell>
                    <TableCell className="text-text-medium">
                      {s.date_time ? new Date(s.date_time).toLocaleString('en-IN') : 'Just now'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{s.payment_mode}</Badge>
                    </TableCell>
                    <TableCell isNumeric className="font-semibold">
                      {formatINR(s.total_amount)}
                    </TableCell>
                    <TableCell isNumeric className="text-success font-semibold">
                      {formatINR(s.total_profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Record Sale Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record sale transaction"
        description="Enter bill details and payment method."
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Total amount"
            isCurrency
            placeholder="0"
            value={form.total_amount}
            onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
            required
          />
          <Input
            label="Gross profit"
            isCurrency
            placeholder="0"
            value={form.total_profit}
            onChange={(e) => setForm({ ...form, total_profit: e.target.value })}
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
                  onClick={() => setForm({ ...form, payment_mode: mode })}
                  className={`h-12 rounded-[8px] border font-semibold text-sm transition-colors ${
                    form.payment_mode === mode
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
              onClick={() => setIsAddOpen(false)}
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
