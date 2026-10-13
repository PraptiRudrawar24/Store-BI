import * as React from 'react';
import { ScanLine, Plus, Search } from 'lucide-react';

interface BarcodeSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onScanClick: () => void;
  onCustomItemClick?: () => void;
}

export function BarcodeSearch({
  value,
  onChange,
  onSubmit,
  inputRef,
  onScanClick,
  onCustomItemClick,
}: BarcodeSearchProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      {/* Barcode & Search Input with Hint Badge */}
      <div className="relative flex-1">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-medium pointer-events-none">
          <Search className="w-4 h-4" strokeWidth={2} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search product name, SKU, or scan barcode (e.g. 8901030...)"
          className="w-full h-11 pl-10 pr-28 bg-surface dark:bg-surface-low text-text-high rounded-[8px] border border-border text-sm placeholder:text-text-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-card"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-medium px-2 py-0.5 bg-canvas dark:bg-surface rounded-[4px] text-text-medium border border-border pointer-events-none select-none hidden sm:inline-block">
          Enter to Add
        </span>
      </div>

      {/* Fast Scan Button [F2] */}
      <button
        type="button"
        onClick={onScanClick}
        title="Barcode Scanner [F2]"
        className="h-11 px-3.5 sm:px-4 bg-surface dark:bg-surface-low hover:bg-canvas dark:hover:bg-surface-high border border-border text-primary rounded-[8px] text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all shadow-card shrink-0"
      >
        <ScanLine className="w-4 h-4 text-primary" strokeWidth={2} />
        <span className="hidden sm:inline">Scan [F2]</span>
      </button>

      {/* Quick Add Custom Item Button */}
      <button
        type="button"
        onClick={onCustomItemClick}
        title="Quick add custom price SKU"
        className="h-11 w-11 bg-surface dark:bg-surface-low hover:bg-canvas dark:hover:bg-surface-high border border-border text-text-medium hover:text-text-high rounded-[8px] flex items-center justify-center transition-all shadow-card shrink-0"
        aria-label="Add custom item"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export default BarcodeSearch;
