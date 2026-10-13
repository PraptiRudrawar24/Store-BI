interface HotkeyBarProps {
  hardwareStatus?: string;
}

export function HotkeyBar({
  hardwareStatus = 'Citizen CTS-310II (Thermal)',
}: HotkeyBarProps) {
  return (
    <div className="h-10 px-4 bg-surface dark:bg-surface-low border-t border-border flex items-center justify-between text-xs text-text-medium select-none overflow-x-auto">
      {/* Keyboard shortcuts list */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-medium">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-canvas dark:bg-surface border border-border rounded-[4px] font-mono text-[11px] font-semibold text-text-high">
            F2
          </kbd>
          <span>Scanner</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-canvas dark:bg-surface border border-border rounded-[4px] font-mono text-[11px] font-semibold text-text-high">
            F4
          </kbd>
          <span>Custom Discount</span>
        </span>

        <span className="inline-flex items-center gap-1.5 hidden md:inline-flex">
          <kbd className="px-1.5 py-0.5 bg-canvas dark:bg-surface border border-border rounded-[4px] font-mono text-[11px] font-semibold text-text-high">
            Ctrl + P
          </kbd>
          <span>Print Last Bill</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-canvas dark:bg-surface border border-border rounded-[4px] font-mono text-[11px] font-semibold text-text-high">
            Esc
          </kbd>
          <span>Close / Unfocus</span>
        </span>
      </div>

      {/* Hardware Status Indicator */}
      <div className="flex items-center gap-2 shrink-0 pl-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold truncate max-w-[260px]">
          Hardware: {hardwareStatus}
        </span>
      </div>
    </div>
  );
}

export default HotkeyBar;
