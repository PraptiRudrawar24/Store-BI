import type { ProductItem, CartItem } from '../../types/pos';
import { ProductCard } from './ProductCard';
import { PackageSearch } from 'lucide-react';

interface ProductCatalogProps {
  products: ProductItem[];
  cartItems: CartItem[];
  onAddToCart: (product: ProductItem) => void;
}

export function ProductCatalog({
  products,
  cartItems,
  onAddToCart,
}: ProductCatalogProps) {
  const getCartQuantity = (productId: string) => {
    const found = cartItems.find((item) => item.product.id === productId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Catalog Subheader & Stock Legend */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-medium">
            Fast Pick Catalog
          </span>
          <span className="text-xs bg-surface dark:bg-surface-low border border-border px-2 py-0.5 rounded-full text-text-medium font-mono font-medium">
            {products.length} SKUs Shown
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Adequate Stock</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Low Stock</span>
          </span>
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {products.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-medium gap-3 p-6 text-center border border-dashed border-border rounded-[8px] bg-surface/50 dark:bg-surface-low/50">
            <PackageSearch className="w-10 h-10 text-text-low" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-text-high">No products currently available in inventory</p>
              <p className="text-xs text-text-medium mt-1">
                Add items to your inventory to see them appear here for POS billing.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantityInCart={getCartQuantity(product.id)}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductCatalog;
