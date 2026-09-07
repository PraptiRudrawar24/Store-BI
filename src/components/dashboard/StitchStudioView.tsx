import React, { useState } from 'react';
import {
  Sparkles,
  Key,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Palette,
  ExternalLink,
  Layers,
  Smartphone,
  Monitor,
  Code2,
  Server,
  FolderKanban,
  FileCode,
  Maximize2,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useStoreData } from '../../context/StoreDataContext';
import { mockStitchScreens } from '../../data/mockStoreData';
import { StitchScreenSummary, StitchTheme } from '../../types/store';

export const StitchStudioView: React.FC = () => {
  const { theme, setTheme, themeMeta } = useTheme();
  const { stitchApiKey, searchQuery } = useStoreData();

  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('all');
  const [activePreviewScreen, setActivePreviewScreen] = useState<StitchScreenSummary | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(stitchApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredScreens = mockStitchScreens.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedStyleFilter === 'all') return matchesSearch;
    return matchesSearch && s.styleVariant.toLowerCase() === selectedStyleFilter.toLowerCase();
  });

  const stitchThemes: { id: StitchTheme; name: string; desc: string; colors: string[] }[] = [
    {
      id: 'professional',
      name: 'Professional (Modern Corporate)',
      desc: 'High density, structured surface-on-surface cards with crisp 1px borders & blue accents',
      colors: ['#004ac6', '#006c49', '#f8f9ff', '#ffffff', '#0b1c30'],
    },
    {
      id: 'glassmorphism',
      name: 'Glassmorphism (Luminous)',
      desc: 'Translucent frosted glass cards, backdrop blurs, and electric cyan/emerald glows',
      colors: ['#3b82f6', '#10b981', '#0f172a', 'rgba(255,255,255,0.1)', '#f8fafc'],
    },
    {
      id: 'claymorphism',
      name: 'Claymorphism (3D Soft Tactile)',
      desc: 'Double ambient box-shadows, pillowy rounded-2xl cards with friendly ergonomic depth',
      colors: ['#4338ca', '#059669', '#edf2f7', '#f8fafc', '#1e293b'],
    },
    {
      id: 'berry-glass',
      name: 'Berry Glass (Vibrant Plum)',
      desc: 'Deep royal amethyst and berry hues combined with high-contrast glassy overlays',
      colors: ['#9333ea', '#ec4899', '#12071a', 'rgba(255,255,255,0.08)', '#fdf2f8'],
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Stitch Design Studio & API Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1 font-mono">
              <Sparkles size={12} />
              Google Stitch MCP
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Connected to project <strong>Supermarket Business Analytics Dashboard</strong> (ID: 8659035975873551379)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            API Key Verified & Active
          </span>
        </div>
      </div>

      {/* Stitch API Key & Project Authentication Banner */}
      <div className="bg-gradient-to-r from-purple-900/10 via-primary/10 to-transparent border border-purple-500/25 rounded-2xl p-5 shadow-stitch-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-primary" />
              <h3 className="font-bold text-base text-text-primary">Stitch Authentication Credentials</h3>
            </div>
            <p className="text-xs text-text-muted">
              Configured in <code className="font-mono bg-surface-container px-1 py-0.5 rounded">.agents/mcp_config.json</code> and <code className="font-mono bg-surface-container px-1 py-0.5 rounded">.env</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-surface-card border border-border-subtle rounded-xl px-3.5 py-2">
              <span className="text-xs font-mono text-text-primary">
                {showKey ? stitchApiKey : `${stitchApiKey.slice(0, 10)}••••••••••••••••••••••••••••${stitchApiKey.slice(-6)}`}
              </span>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-text-muted hover:text-text-primary p-1 rounded"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                onClick={handleCopyKey}
                className="text-text-muted hover:text-text-primary p-1 rounded"
                title="Copy API key"
              >
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border-subtle/50 text-xs">
          <div className="flex items-center gap-2 text-text-muted">
            <Server size={14} className="text-primary shrink-0" />
            <span>Server: <strong className="text-text-primary font-mono">stitch.googleapis.com/mcp</strong></span>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <FolderKanban size={14} className="text-emerald-500 shrink-0" />
            <span>Project: <strong className="text-text-primary">Supermarket Analytics</strong></span>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <FileCode size={14} className="text-purple-500 shrink-0" />
            <span>Screens: <strong className="text-text-primary">28 Designs Generated</strong></span>
          </div>
        </div>
      </div>

      {/* Theme Switcher Gallery (The 4 Design Systems) */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-primary" />
              <h3 className="font-bold text-base text-text-primary">Stitch Design Theme Engine</h3>
            </div>
            <p className="text-xs text-text-muted">
              Select one of the 4 design systems created in Stitch to transform the application's appearance
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
            Active: {themeMeta.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stitchThemes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                    : 'border-border-subtle bg-surface-container/50 hover:bg-surface-container hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-text-primary">{t.name}</span>
                    {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed mb-3">{t.desc}</p>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-border-subtle/50">
                  {t.colors.map((c, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <span className="ml-auto text-[10px] font-mono text-text-muted uppercase">Palette</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stitch Screens Gallery */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              <h3 className="font-bold text-base text-text-primary">Stitch Screen Design Gallery</h3>
            </div>
            <p className="text-xs text-text-muted">
              High-resolution screens generated by Stitch for this supermarket BI dashboard
            </p>
          </div>

          {/* Style Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'professional', 'glassmorphism', 'claymorphism', 'berry glass'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStyleFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  selectedStyleFilter === st
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container text-text-muted hover:text-text-primary'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScreens.map((screen) => (
            <div
              key={screen.id}
              className="rounded-xl border border-border-subtle overflow-hidden bg-surface-container/40 hover:border-primary/50 transition-all flex flex-col group"
            >
              <div className="relative aspect-[9/16] max-h-64 bg-slate-900 overflow-hidden flex items-center justify-center">
                <img
                  src={screen.screenshotUrl}
                  alt={screen.title}
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <button
                    onClick={() => setActivePreviewScreen(screen)}
                    className="w-full py-1.5 rounded-lg bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md hover:bg-primary-hover"
                  >
                    <Maximize2 size={13} />
                    <span>Enlarge Screenshot</span>
                  </button>
                </div>
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                    <span className="font-mono">{screen.width} × {screen.height}</span>
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                      {screen.styleVariant}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-text-primary truncate" title={screen.title}>
                    {screen.title}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-border-subtle/50 flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-mono">{screen.category}</span>
                  <button
                    onClick={() => setActivePreviewScreen(screen)}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                  >
                    Inspect <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen Preview Modal */}
      {activePreviewScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-surface-card border border-border-subtle rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-container/60">
              <div>
                <h3 className="font-bold text-base text-text-primary">{activePreviewScreen.title}</h3>
                <p className="text-xs text-text-muted font-mono">
                  Stitch Screen ID: {activePreviewScreen.id} • {activePreviewScreen.width} × {activePreviewScreen.height}
                </p>
              </div>
              <button
                onClick={() => setActivePreviewScreen(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-container"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950">
              <img
                src={activePreviewScreen.screenshotUrl}
                alt={activePreviewScreen.title}
                className="max-w-full rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
