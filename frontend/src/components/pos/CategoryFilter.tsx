import type { ProductCategory } from '../../types/pos';
import { cn } from '../ui/utils';

interface CategoryFilterProps {
  categories: ProductCategory[];
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold select-none"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      role="tablist"
      aria-label="Product categories"
    >
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={cn(
              'px-3.5 py-1.5 rounded-[8px] whitespace-nowrap transition-all duration-150 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isSelected
                ? 'bg-primary text-primary-foreground shadow-card'
                : 'bg-surface dark:bg-surface-low hover:bg-canvas dark:hover:bg-surface-high border border-border text-text-medium hover:text-text-high'
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

export default CategoryFilter;
