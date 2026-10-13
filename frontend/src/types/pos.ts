export type ProductCategory =
  | 'All Items'
  | 'Personal Care'
  | 'Health & OTC'
  | 'Snacks & Sweets'
  | 'Dairy & Staples'
  | 'Beverages'
  | 'Household';

export interface ProductItem {
  id: string;
  dbId?: number; // Database ID in models.Product if synced
  name: string;
  sku: string;
  barcode: string;
  category: Exclude<ProductCategory, 'All Items'>;
  pricePaise: number; // Stored in paise (integer) e.g. 22500 = ₹225.00
  costPaise?: number; // Wholesale cost in paise for net margin calculations
  stock: number;
  lowStockThreshold: number;
  batchInfo?: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

export interface CartTotals {
  itemCount: number;
  totalQuantity: number;
  subtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  gstPaise: number;
  rawTotalPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
}

export type PaymentMethod = 'Cash' | 'UPI / QR' | 'Card' | 'Store Credit';

export interface CustomerInfo {
  name: string;
  phone: string;
}

export interface CompletedSale {
  billNumber: string;
  timestamp: string;
  items: CartItem[];
  totals: CartTotals;
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
  storeName: string;
  storeDivision: string;
  storeCode: string;
}
