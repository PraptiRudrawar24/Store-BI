import * as React from 'react';
import { Search, Loader2, Package, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type ProductAutocompleteItem } from '../../api/client';
import { Badge } from '../ui/Badge';
import { formatINR } from '../../utils';
import { cn } from '../ui/utils';

interface ProductSearchBarProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSelectProduct?: (product: ProductAutocompleteItem) => void;
  onCloseMobile?: () => void;
  isMobileModal?: boolean;
}

/**
 * HighlightedText: highlights matching characters or words within the product name
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            className="font-black text-primary bg-primary/15 dark:bg-primary/30 px-0.5 rounded-[2px]"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function ProductSearchBar({
  placeholder = 'Search products in inventory...',
  className,
  autoFocus = false,
  onSelectProduct,
  onCloseMobile,
  isMobileModal = false,
}: ProductSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<ProductAutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const latestRequestId = React.useRef<number>(0);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut: Command/Ctrl + K to focus search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch suggestions with every keystroke (debounced 150ms to keep it ultra-snappy)
  React.useEffect(() => {
    const cleanQ = query.trim();
    if (!cleanQ) {
      setSuggestions([]);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const requestId = ++latestRequestId.current;

    const timeout = setTimeout(async () => {
      try {
        const results = await api.autocompleteProducts(cleanQ, 10);
        // Stale response guard
        if (requestId === latestRequestId.current) {
          setSuggestions(results);
          setIsLoading(false);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch {
        if (requestId === latestRequestId.current) {
          setSuggestions([]);
          setIsLoading(false);
        }
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [query]);

  // Navigate & select product
  const selectItem = (product: ProductAutocompleteItem) => {
    setIsOpen(false);
    setQuery('');
    if (onCloseMobile) onCloseMobile();

    if (onSelectProduct) {
      onSelectProduct(product);
      return;
    }

    // Default: Navigate to Inventory management (/upload) with target product ID
    navigate(`/upload?subView=products&productId=${product.id}&highlight=${product.id}`);
  };

  // Keyboard navigation inside input (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        // Direct enter on search input without picking suggestion:
        // Navigate to upload page with the search query applied
        setIsOpen(false);
        if (onCloseMobile) onCloseMobile();
        navigate(`/upload?subView=products&search=${encodeURIComponent(query.trim())}`);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev < suggestions.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : suggestions.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        selectItem(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        // Enter selects the top relevant match!
        selectItem(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const scrollIndexIntoView = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Search Input Container */}
      <div className="relative flex items-center w-full">
        <Search
          className="w-4 h-4 text-text-medium absolute left-3.5 pointer-events-none"
          strokeWidth={2}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim() && suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-10 w-full pl-9 pr-16 rounded-[8px] border border-border bg-canvas text-xs text-text-high placeholder:text-text-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
        />

        {/* Right side controls: Spinner or Clear Button + ⌘K badge */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-text-low hover:text-text-high hover:bg-surface transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          {!isMobileModal && (
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-text-medium bg-surface border border-border rounded-[4px] pointer-events-none select-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface dark:bg-surface-low border border-border rounded-[8px] shadow-raised overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-text-medium">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Searching store inventory...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 text-center flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-canvas flex items-center justify-center text-text-low">
                <Package className="w-5 h-5 stroke-[1.5]" />
              </div>
              <p className="text-xs font-semibold text-text-high">
                No matching products found
              </p>
              <p className="text-[11px] text-text-medium max-w-xs">
                No inventory item matching "{query}" exists in your store. Check for typos or add this product to inventory.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="px-3 py-1.5 bg-canvas/70 border-b border-border/80 flex items-center justify-between text-[11px] text-text-medium font-medium">
                <span>Matching products in inventory</span>
                <span className="tabular-nums">{suggestions.length} {suggestions.length === 1 ? 'match' : 'matches'}</span>
              </div>

              <ul
                ref={listRef}
                className="max-h-80 overflow-y-auto divide-y divide-border/60 focus:outline-none"
                role="listbox"
              >
                {suggestions.map((p, idx) => {
                  const isSelected = selectedIndex === idx;
                  const isLow = p.stock_qty <= p.reorder_level && p.stock_qty > 0;
                  const isOut = p.stock_qty === 0;

                  return (
                    <li
                      key={p.id}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => selectItem(p)}
                      className={cn(
                        'px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs select-none',
                        isSelected
                          ? 'bg-primary/10 dark:bg-primary/20 text-text-high'
                          : 'hover:bg-canvas dark:hover:bg-surface-high text-text-high'
                      )}
                    >
                      {/* Left: Product Name, Category & Stock */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 border',
                            isOut
                              ? 'bg-red-500/10 text-destructive border-red-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                          )}
                        >
                          <Package className="w-3.5 h-3.5 stroke-[2]" />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-text-high truncate text-xs">
                            <HighlightedText text={p.name} query={query} />
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-medium">
                            <span className="px-1.5 py-0.2 rounded-[4px] bg-canvas border border-border text-[10px] font-medium shrink-0">
                              {p.category || 'General'}
                            </span>
                            <span className="tabular-nums">
                              {isOut ? (
                                <strong className="text-destructive font-semibold">0 in stock</strong>
                              ) : (
                                <span>{p.stock_qty} in stock</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Selling Price, Status Badge & Action arrow */}
                      <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-xs text-text-high">
                            {formatINR(p.selling_price)}
                          </span>
                          <Badge
                            variant={isOut ? 'destructive' : isLow ? 'warning' : 'success'}
                            className="text-[9px] px-1 py-0 h-4 min-h-[16px]"
                          >
                            {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                          </Badge>
                        </div>

                        <div
                          className={cn(
                            'w-6 h-6 rounded-[4px] flex items-center justify-center transition-opacity',
                            isSelected ? 'opacity-100 text-primary bg-primary/15' : 'opacity-0'
                          )}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Dropdown footer tip */}
              <div className="px-3 py-1.5 bg-canvas border-t border-border flex items-center justify-between text-[10px] text-text-low select-none">
                <span className="flex items-center gap-1">
                  <span>Use</span>
                  <kbd className="px-1 py-0.2 rounded bg-surface border border-border font-mono">↑</kbd>
                  <kbd className="px-1 py-0.2 rounded bg-surface border border-border font-mono">↓</kbd>
                  <span>to navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>Press</span>
                  <kbd className="px-1 py-0.2 rounded bg-surface border border-border font-mono flex items-center gap-0.5">
                    <CornerDownLeft className="w-2.5 h-2.5" /> Enter
                  </kbd>
                  <span>to jump to item</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
