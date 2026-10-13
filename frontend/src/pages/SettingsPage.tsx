import * as React from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { api } from '../api/client';
import type { Shop } from '../api/client';

import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [shop, setShop] = React.useState<Shop | null>(user);

  const [form, setForm] = React.useState({
    name: user?.name || '',
    owner_name: user?.owner_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    category: user?.category || 'Grocery & kirana',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    gstin: user?.gstin || '',
    language: user?.language || 'en',
  });

  React.useEffect(() => {
    if (user) {
      setShop(user);
      setForm({
        name: user.name || '',
        owner_name: user.owner_name || '',
        phone: user.phone || '',
        email: user.email || '',
        category: user.category || 'Grocery & kirana',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
        gstin: user.gstin || '',
        language: user.language || 'en',
      });
    } else {
      api.getMe().then((me) => {
        if (me) {
          setShop(me);
          setForm({
            name: me.name || '',
            owner_name: me.owner_name || '',
            phone: me.phone || '',
            email: me.email || '',
            category: me.category || 'Grocery & kirana',
            city: me.city || '',
            state: me.state || '',
            pincode: me.pincode || '',
            gstin: me.gstin || '',
            language: me.language || 'en',
          });
        }
      }).catch(() => {
        // Unauthenticated or guest mode
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeShopId = user?.id || shop?.id;
      if (activeShopId) {
        const updated = await api.updateShop(activeShopId, form);
        setShop(updated);
        await refreshUser();
      } else {
        const created = await api.createShop(form);
        setShop(created);
        await refreshUser();
      }
      toast.success('Shop details saved successfully');
    } catch {
      toast.error('Failed to update shop details');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-high">Shop settings</h1>
        <p className="text-sm text-text-medium mt-0.5">
          Configure your retail store profile, GSTIN, and business location.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Business profile"
          subtitle="Details displayed on receipts and ledger exports"
        />
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Store name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Owner name"
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone number"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit number"
              />
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="owner@store.in"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="Pincode"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GSTIN (optional)"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                placeholder="27AAAAA0000A1Z5"
              />
              <Input
                label="Language"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary">
                Save settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
