import React from 'react';
import type { HeatmapCell } from '../../api/client';
import { formatINR } from '../../utils';

interface WeekdayHourHeatmapProps {
  cells: HeatmapCell[];
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Display hours from 6 AM to 11 PM (18 operating hours) or all 24
const DISPLAY_HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6..23

export function WeekdayHourHeatmap({ cells }: WeekdayHourHeatmapProps) {
  const [activeCell, setActiveCell] = React.useState<HeatmapCell | null>(null);

  // Map key "weekday-hour" -> cell
  const cellMap = React.useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    cells.forEach((c) => {
      map.set(`${c.weekday}-${c.hour}`, c);
    });
    return map;
  }, [cells]);

  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-[#F1F3FF] border-[#E5E7EB] text-[#737686]';
    const ratio = count / maxCount;
    if (ratio < 0.25) return 'bg-[#DBE1FF] text-[#00174B] border-[#B4C5FF] font-semibold';
    if (ratio < 0.6) return 'bg-[#B4C5FF] text-[#00174B] border-[#2563EB]/40 font-bold';
    return 'bg-[#2563EB] text-[#FFFFFF] border-[#1D4ED8] font-bold';
  };

  const formatHourLabel = (h: number) => {
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}${ampm}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="font-bold text-text-high">Weekday × hour footfall heatmap</span>
        <div className="flex items-center gap-2 text-[11px] text-text-medium">
          <span>Less busy</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-[#F1F3FF] border border-[#E5E7EB]" />
            <span className="w-3.5 h-3.5 rounded-[3px] bg-[#DBE1FF] border border-[#B4C5FF]" />
            <span className="w-3.5 h-3.5 rounded-[3px] bg-[#B4C5FF] border border-[#2563EB]/40" />
            <span className="w-3.5 h-3.5 rounded-[3px] bg-[#2563EB] border border-[#1D4ED8]" />
          </div>
          <span>Busiest peak</span>
        </div>
      </div>

      {/* Heatmap Grid Wrapper (Scrollable on small viewports) */}
      <div className="relative overflow-x-auto pb-2">
        <div className="min-w-[560px] flex flex-col gap-1.5">
          {/* Header Hours Row */}
          <div className="flex items-center gap-1 pl-10 text-[10px] font-semibold text-text-medium">
            {DISPLAY_HOURS.map((h) => (
              <div key={h} className="flex-1 text-center truncate">
                {h % 3 === 0 ? formatHourLabel(h) : '•'}
              </div>
            ))}
          </div>

          {/* Weekday Rows */}
          {WEEKDAYS.map((dayName, wIdx) => (
            <div key={dayName} className="flex items-center gap-1">
              <span className="w-9 text-xs font-semibold text-text-medium text-left">
                {dayName}
              </span>
              <div className="flex-1 flex items-center gap-1">
                {DISPLAY_HOURS.map((hour) => {
                  const cell = cellMap.get(`${wIdx}-${hour}`) || {
                    weekday: wIdx,
                    hour,
                    count: 0,
                    sales: 0,
                  };
                  const colorCls = getCellColor(cell.count);

                  return (
                    <button
                      key={hour}
                      type="button"
                      onMouseEnter={() => setActiveCell(cell)}
                      onClick={() => setActiveCell(cell)}
                      className={`flex-1 h-7 rounded-[4px] border text-[11px] tabular-nums flex items-center justify-center transition-transform hover:scale-105 select-none ${colorCls}`}
                      title={`${dayName} ${formatHourLabel(hour)}: ${cell.count} bills`}
                      aria-label={`${dayName} at ${hour}:00, ${cell.count} bills`}
                    >
                      {cell.count > 0 ? cell.count : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Cell Info Strip */}
      <div className="p-2.5 rounded-[6px] bg-canvas border border-border text-xs flex items-center justify-between">
        {activeCell ? (
          <div className="flex items-center gap-3">
            <span className="font-bold text-text-high">
              {WEEKDAYS[activeCell.weekday]} at {formatHourLabel(activeCell.hour)} –{' '}
              {formatHourLabel((activeCell.hour + 1) % 24)}
            </span>
            <span className="text-text-medium">
              Transactions: <strong className="text-text-high">{activeCell.count} bills</strong>
            </span>
            <span className="text-text-medium">
              Sales: <strong className="text-primary">{formatINR(activeCell.sales)}</strong>
            </span>
          </div>
        ) : (
          <span className="text-text-low text-[11px]">
            Hover or tap any cell in the grid to inspect hourly sales and transaction volume
          </span>
        )}
      </div>
    </div>
  );
}
