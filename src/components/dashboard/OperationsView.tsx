import React, { useState } from 'react';
import {
  Store,
  Clock,
  Thermometer,
  Zap,
  Users,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCw,
  Download,
} from 'lucide-react';
import { mockOperations, mockColdChainSensors } from '../../data/mockStoreData';
import { useStoreData } from '../../context/StoreDataContext';

interface OperationsViewProps {
  onOpenExport: () => void;
}

export const OperationsView: React.FC<OperationsViewProps> = ({ onOpenExport }) => {
  const { searchQuery } = useStoreData();
  const [lanes, setLanes] = useState(mockOperations);
  const [sensors, setSensors] = useState(mockColdChainSensors);

  const toggleLaneStatus = (laneName: string) => {
    setLanes((prev) =>
      prev.map((lane) => {
        if (lane.checkoutLane === laneName) {
          const nextStatus = lane.status === 'Open' ? 'Paused' : 'Open';
          return {
            ...lane,
            status: nextStatus,
            avgWaitTimeSec: nextStatus === 'Open' ? 45 : 0,
            queueLength: nextStatus === 'Open' ? 1 : 0,
          };
        }
        return lane;
      })
    );
  };

  const filteredLanes = lanes.filter(
    (l) =>
      l.checkoutLane.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.cashierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Store Operations & IoT Monitoring
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time cashier checkout lanes, cold-chain refrigeration units, and facility metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Ops Log</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Average Queue Wait</span>
            <Clock size={16} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">48 sec</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            Well within 90s SLA target
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Active Checkout Lanes</span>
            <Store size={16} className="text-primary" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">
            {lanes.filter((l) => l.status === 'Open').length} / {lanes.length} Open
          </div>
          <div className="text-xs text-text-muted mt-2">Includes 2 express self-checkouts</div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Scan Throughput Rate</span>
            <RotateCw size={16} className="text-blue-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">27.6 / min</div>
          <div className="text-xs text-text-muted mt-2">Per lane cashier scanning average</div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>IoT Cold Chain Status</span>
            <Thermometer size={16} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">3 / 4 Optimal</div>
          <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-2">
            1 unit running +1.2°C above target
          </div>
        </div>
      </div>

      {/* Real-Time Checkout Lanes Ledger */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-stitch-card glass-panel overflow-hidden">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-text-primary">Checkout Lane Real-Time Status</h3>
            <p className="text-xs text-text-muted">Live cashier station assignments, queue length, and throughput speed</p>
          </div>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
            All POS Terminals Online
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container/70 border-b border-border-subtle text-text-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-5">Lane Designation</th>
                <th className="py-3.5 px-5">Cashier / Staff</th>
                <th className="py-3.5 px-5">Lane Status</th>
                <th className="py-3.5 px-5">Wait Time</th>
                <th className="py-3.5 px-5">Scanning Speed</th>
                <th className="py-3.5 px-5">Shoppers in Line</th>
                <th className="py-3.5 px-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredLanes.map((lane) => {
                const isOpen = lane.status === 'Open';
                return (
                  <tr key={lane.checkoutLane} className="hover:bg-surface-container/40 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-text-primary text-sm">
                      {lane.checkoutLane}
                    </td>

                    <td className="py-3.5 px-5 flex items-center gap-2 text-text-primary font-medium">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                        {lane.cashierName[0]}
                      </div>
                      <span>{lane.cashierName}</span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isOpen
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {lane.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-mono font-bold text-text-primary">
                      {lane.avgWaitTimeSec > 0 ? `${lane.avgWaitTimeSec} sec` : '—'}
                    </td>

                    <td className="py-3.5 px-5 font-mono text-text-muted">
                      {lane.itemsPerMinute > 0 ? `${lane.itemsPerMinute} items/min` : '0 items/min'}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: lane.queueLength }).map((_, idx) => (
                            <span key={idx} className="w-2.5 h-2.5 rounded-full bg-primary" />
                          ))}
                          {lane.queueLength === 0 && (
                            <span className="text-[11px] text-text-muted">No queue</span>
                          )}
                        </div>
                        {lane.queueLength > 0 && (
                          <span className="text-xs font-mono font-bold text-text-primary">
                            ({lane.queueLength})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => toggleLaneStatus(lane.checkoutLane)}
                        className={`px-3 py-1.5 rounded-xl font-semibold text-xs inline-flex items-center gap-1 transition-all ${
                          isOpen
                            ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                      >
                        {isOpen ? <Pause size={13} /> : <Play size={13} />}
                        <span>{isOpen ? 'Pause Lane' : 'Open Lane'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cold Chain IoT Refrigeration Monitoring */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Thermometer size={18} className="text-primary" />
              <h3 className="font-bold text-base text-text-primary">Cold-Chain IoT Sensor Telemetry</h3>
            </div>
            <p className="text-xs text-text-muted">Continuous 24/7 temperature compliance monitoring for HACCP food safety</p>
          </div>
          <span className="text-xs font-mono text-text-muted">Polling: every 30s</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sensors.map((sensor) => {
            const isWarning = sensor.status === 'Warning';
            return (
              <div
                key={sensor.zone}
                className={`p-4 rounded-xl border transition-all ${
                  isWarning
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border-subtle bg-surface-container/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-text-muted">{sensor.type}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isWarning
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {sensor.status}
                  </span>
                </div>

                <div className="font-bold text-sm text-text-primary truncate">{sensor.zone}</div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-text-muted">Current Temp</div>
                    <div
                      className={`text-2xl font-black font-mono ${
                        isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary'
                      }`}
                    >
                      {sensor.currentTempC > 0 ? `+${sensor.currentTempC}` : sensor.currentTempC}°C
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-muted">Target Temp</div>
                    <div className="text-sm font-bold font-mono text-text-muted">
                      {sensor.targetTempC > 0 ? `+${sensor.targetTempC}` : sensor.targetTempC}°C
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border-subtle/60 flex items-center justify-between text-[11px] text-text-muted">
                  <span>Last sync: {sensor.lastChecked}</span>
                  {isWarning && (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} /> Deviation +1.2°C
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
