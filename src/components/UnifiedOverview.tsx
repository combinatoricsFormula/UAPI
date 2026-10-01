import React from 'react';
import {
  Database,
  Layers,
  ArrowUpRight,
  Clock,
  Sparkles,
  Server,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DataSource } from '../types/connector';

interface UnifiedOverviewProps {
  sources: DataSource[];
  onOpenConnectModal: () => void;
  onSelectTab: (tab: 'connectors' | 'visualizations' | 'explorer' | 'ai') => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  onSelectSourceForExplorer?: (sourceId: string) => void;
}

export const UnifiedOverview: React.FC<UnifiedOverviewProps> = ({
  sources,
  onOpenConnectModal,
  onSelectTab,
  onSyncAll,
  isSyncing,
  onSelectSourceForExplorer,
}) => {
  const totalRecords = sources.reduce((acc, s) => acc + (s.records?.length || 0), 0);
  const totalAttributes = sources.reduce((acc, s) => acc + (s.schema?.length || 0), 0);
  const avgLatency =
    sources.length > 0
      ? Math.round(sources.reduce((acc, s) => acc + (s.latencyMs || 0), 0) / sources.length)
      : 0;

  // Compute total currency value if present in datasets
  let totalMonetarySum = 0;
  let hasMonetaryData = false;
  sources.forEach(src => {
    const moneyField = src.schema.find(f => f.type === 'currency' || f.name.toLowerCase().includes('amount'));
    if (moneyField) {
      hasMonetaryData = true;
      src.records.forEach(r => {
        const val = Number(r[moneyField.name]);
        if (!isNaN(val)) totalMonetarySum += val;
      });
    }
  });

  // Recent consolidated items across all sources
  const consolidatedItems = sources.flatMap(src =>
    (src.records || []).slice(0, 5).map((r, i) => ({
      sourceId: src.id,
      sourceName: src.name,
      sourceColor: src.color,
      connectorType: src.connectorType,
      recordKey: (r.id || r.order_id || r.ticket_id || r.telemetry_id || r.transaction_id || `rec-${i}`) as string,
      data: r,
      timestamp: (r.timestamp || r.created_at || r.date || new Date().toISOString()) as string,
    }))
  );

  return (
    <div className="space-y-6">
      {/* Hero Ingestion Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Unified Ingestion Pipeline Active</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-mono">{sources.length} Endpoints Unified</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cross-Source Data Orchestration
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Auto-sniffing endpoints, determining relational & timeseries types, applying credentials securely,
              and harmonizing distributed data streams into a single analytical plane.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('ai')}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Ask AI Intelligence</span>
            </button>
            <button
              onClick={onOpenConnectModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect Another Endpoint</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Connected Sources</span>
            <Database className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {sources.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active remote streams</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Ingested Records</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {totalRecords.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Normalized rows</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Schema Attributes</span>
            <Server className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {totalAttributes}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Typed & indexed fields</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Avg Ingestion Latency</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {avgLatency} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Response & probe health</p>
        </div>
      </div>

      {/* Connected Sources Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200">Active Connected Sources</h2>
            <span className="text-xs text-slate-500 font-mono">({sources.length})</span>
          </div>
          <button
            onClick={() => onSelectTab('connectors')}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Manage Connectors & Schemas</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {sources.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
            <Database className="h-8 w-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No data sources connected yet</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Add your REST API endpoint, database query, cloud file URL, or test with ready-to-use live presets.
            </p>
            <button
              onClick={onOpenConnectModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
            >
              Connect First Source
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map(src => {
              const primaryTimestamp = src.schema.find(f => f.type === 'datetime');
              const metricsCount = src.schema.filter(f => f.isMetric).length;

              return (
                <div
                  key={src.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 max-w-[80%]">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: src.color }}
                          />
                          <h3 className="text-xs font-semibold text-white truncate">{src.name}</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate font-mono">
                          {src.endpoint}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {src.method}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Connector</span>
                        <span className="text-slate-200 font-mono font-medium">{src.connectorType}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Rows Ingested</span>
                        <span className="text-white font-mono font-medium tabular-nums">
                          {src.records.length.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Schema Attributes</span>
                        <span className="text-slate-200 font-mono">{src.schema.length} fields</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Auth Protocol</span>
                        <span className="text-slate-300 font-mono">
                          {src.authType === 'none' ? 'Public (No Auth)' : src.authType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono">
                      {src.latencyMs}ms response
                    </span>
                    <button
                      onClick={() => {
                        if (onSelectSourceForExplorer) onSelectSourceForExplorer(src.id);
                        onSelectTab('explorer');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore Data</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unified Cross-Source Activity Feed */}
      {consolidatedItems.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Unified Ingestion Stream</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consolidated cross-source record feed sampled across active endpoints.
              </p>
            </div>
            <button
              onClick={() => onSelectTab('explorer')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Data Grid</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
            {consolidatedItems.slice(0, 6).map((item, idx) => (
              <div
                key={`${item.sourceId}-${item.recordKey}-${idx}`}
                className="p-3 hover:bg-slate-900/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.sourceColor }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{item.recordKey}</span>
                      <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.2 rounded bg-slate-800/80">
                        {item.sourceName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                      {Object.entries(item.data)
                        .filter(([k]) => !['id', 'order_id', 'ticket_id', 'telemetry_id'].includes(k))
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono shrink-0">
                  {item.timestamp ? item.timestamp.slice(0, 19).replace('T', ' ') : 'Live'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
