import * as React from 'react';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatINR } from '../utils';
import { api } from '../api/client';
import type { Expense } from '../api/client';
import { useToast } from '../components/ui/Toast';

export function ExpensesPage() {
  const toast = useToast();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const [form, setForm] = React.useState({
    category: 'Rent',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const loadExpenses = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getExpenses();
      setExpenses(list);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) {
      toast.error('Expense amount is required');
      return;
    }
    try {
      await api.createExpense({
        category: form.category,
        amount: parseFloat(form.amount) || 0,
        date: form.date,
        note: form.note,
      });
      toast.success('Expense recorded');
      setIsAddOpen(false);
      setForm({
        category: 'Rent',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
      });
      loadExpenses();
    } catch {
      toast.error('Failed to log expense');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteExpense(id);
      toast.success('Expense deleted');
      loadExpenses();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">Store expenses</h1>
          <p className="text-sm text-text-medium mt-0.5">
            Log shop overheads, rent, utilities, and daily petty cash.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>Log expense</span>
        </Button>
      </div>

      {expenses.length === 0 && !loading ? (
        <EmptyState
          icon={<Wallet className="w-6 h-6 text-primary" strokeWidth={2} />}
          title="No expenses logged yet"
          description="Your expense journal is clean. Log recurring overheads such as shop rent, electricity, transport, or employee salary to track exact net income."
          actionLabel="Log first expense"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <Card>
          <CardHeader
            title="Expenses ledger"
            subtitle={`${expenses.length} expense entries`}
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-text-medium">{exp.date}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{exp.category}</Badge>
                    </TableCell>
                    <TableCell isNumeric className="text-destructive font-semibold">
                      {formatINR(exp.amount)}
                    </TableCell>
                    <TableCell className="text-text-medium">{exp.note || '—'}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="w-8 h-8 rounded-[4px] flex items-center justify-center text-text-low hover:text-destructive hover:bg-canvas transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Log Expense Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Log store expense"
        description="Record an operational business expense."
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Category"
            placeholder="e.g. Rent, Electricity, Packaging, Wages"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <Input
            label="Amount"
            isCurrency
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <Input
            label="Note"
            placeholder="Optional comment (e.g. advance payment)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
