import type { ProductItem } from '../../types/pos';
import { formatPaiseToRupee } from '../../utils/money';
import { Plus } from 'lucide-react';
import { cn } from '../ui/utils';

interface ProductCardProps {
  product: ProductItem;
  quantityInCart: number;
  onAddToCart: (product: ProductItem) => void;
}

function getCategoryBadgeClass(category: ProductItem['category']): string {
  switch (category) {
    case 'Personal Care':
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    case 'Health & OTC':
      return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    case 'Snacks & Sweets':
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    case 'Dairy & Staples':
      return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
    case 'Beverages':
      return 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
    case 'Household':
      return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
    default:
      return 'bg-canvas dark:bg-surface border border-border text-text-medium';
  }
}

export function ProductCard({
  product,
  quantityInCart,
  onAddToCart,
}: ProductCardProps) {
  const isLowStock = product.stock <= product.lowStockThreshold;

  return (
    <div
      onClick={() => onAddToCart(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAddToCart(product);
        }
      }}
      className={cn(
        'group bg-surface dark:bg-surface-low border rounded-[8px] p-3.5 flex flex-col justify-between cursor-pointer hover:shadow-raised transition-all relative select-none',
        quantityInCart > 0
          ? 'border-primary ring-1 ring-primary/30'
          : 'border-border hover:border-primary'
      )}
    >
      {/* Top Meta: Category Tag & Stock Level Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={cn(
            'px-2 py-0.5 text-[11px] rounded-[4px] font-semibold leading-tight',
            getCategoryBadgeClass(product.category)
          )}
        >
          {product.category}
        </span>

        {isLowStock ? (
          <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-mono rounded-[4px] font-bold">
            {product.stock} left
          </span>
        ) : (
          <span className="text-[11px] font-mono text-text-medium">
            {product.stock} left
          </span>
        )}
      </div>

      {/* Product Title and SKU */}
      <div className="flex-1 my-1">
        <h3 className="font-semibold text-sm text-text-high group-hover:text-primary transition-colors line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <p className="text-[11px] text-text-medium mt-1 font-mono">
          SKU: {product.sku}
        </p>
      </div>

      {/* Price and Add Button */}
      <div className="flex items-baseline justify-between mt-3 pt-2.5 border-t border-border/60">
        <div className="text-base font-bold text-primary tabular-nums tracking-tight">
          {formatPaiseToRupee(product.pricePaise)}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className="w-8 h-8 rounded-[6px] bg-canvas dark:bg-surface-high group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center transition-colors shadow-xs"
          title={`Add ${product.name} to cart`}
          aria-label={`Add ${product.name} to cart`}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Cart Quantity Badge in Top-Right Corner */}
      {quantityInCart > 0 && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold shadow-card border border-surface dark:border-surface-low">
          {quantityInCart}
        </div>
      )}
    </div>
  );
}

export default ProductCard;
