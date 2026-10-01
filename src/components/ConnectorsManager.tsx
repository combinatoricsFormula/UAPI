import React, { useState } from 'react';
import {
  Globe,
  Database,
  Cloud,
  Activity,
  Layers,
  FileText,
  RefreshCw,
  Trash2,
  CheckCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { DataSource } from '../types/connector';

interface ConnectorsManagerProps {
  sources: DataSource[];
  onOpenConnectModal: () => void;
  onRemoveSource: (id: string) => void;
  onSyncSource: (id: string) => void;
  syncingSourceId: string | null;
}

export const ConnectorsManager: React.FC<ConnectorsManagerProps> = ({
  sources,
  onOpenConnectModal,
  onRemoveSource,
  onSyncSource,
  syncingSourceId,
}) => {
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(
    sources.length > 0 ? sources[0].id : null
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rest_api':
        return <Globe className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'cloud_storage':
        return <Cloud className="h-4 w-4" />;
      case 'event_stream':
        return <Activity className="h-4 w-4" />;
      case 'saas_app':
        return <Layers className="h-4 w-4" />;
      case 'file_upload':
        return <FileText className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Registered Connectors & Schema Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit endpoint configurations, detected data types, authentication mechanisms, and sync states.
          </p>
        </div>

        <button
          onClick={onOpenConnectModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Connector</span>
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
          <Database className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No active connectors</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Connect an endpoint, database query, or public test feed to register built-in connectors.
          </p>
          <button
            onClick={onOpenConnectModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
          >
            Connect First Source
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map(src => {
            const isExpanded = expandedSourceId === src.id;
            const isSyncing = syncingSourceId === src.id;

            return (
              <div
                key={src.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden transition-all"
              >
                {/* Connector Summary Row */}
                <div
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedSourceId(isExpanded ? null : src.id)}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0"
                      style={{ color: src.color }}
                    >
                      {getCategoryIcon(src.locationCategory)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-semibold text-white">{src.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {src.connectorType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Format: {src.detectedFormat.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                        {src.endpoint}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {src.latencyMs}ms
                      </span>
                      <span>·</span>
                      <span className="text-white font-medium">
                        {src.records.length.toLocaleString()} rows
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        Synced
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onSyncSource(src.id)}
                        disabled={isSyncing}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer disabled:opacity-40"
                        title="Re-sync endpoint"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                      </button>
                      <button
                        onClick={() => onRemoveSource(src.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Disconnect source"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => setExpandedSourceId(isExpanded ? null : src.id)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Schema & Protocol Details */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950 p-5 space-y-4">
                    {/* Protocol Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/50 space-y-1">
                        <span className="text-slate-400 font-medium">Authentication Protocol</span>
                        <div className="flex items-center gap-1.5 text-white font-mono">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{src.authType === 'none' ? 'Public (Zero Auth)' : src.authType.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/50 space-y-1">
                        <span className="text-slate-400 font-medium">Connector Engine</span>
                        <div className="text-slate-200 font-mono truncate">{src.connectorType}</div>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/50 space-y-1">
                        <span className="text-slate-400 font-medium">Last Synchronized</span>
                        <div className="text-slate-200 font-mono text-[11px]">
                          {src.lastSyncedAt ? new Date(src.lastSyncedAt).toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    </div>

                    {src.description && (
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                        <span className="font-semibold text-slate-200">Connector Rationale: </span>
                        {src.description}
                      </p>
                    )}

                    {/* Inferred Schema Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white">
                          Inferred Schema Attributes ({src.schema.length})
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Auto-typed & Normalized
                        </span>
                      </div>

                      <div className="rounded-lg border border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-medium">
                              <th className="py-2 px-3">Field Name</th>
                              <th className="py-2 px-3">Inferred Type</th>
                              <th className="py-2 px-3">Distinct Values</th>
                              <th className="py-2 px-3">Sample Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono bg-slate-950">
                            {src.schema.map(field => (
                              <tr key={field.name} className="hover:bg-slate-900/30">
                                <td className="py-2 px-3 text-slate-200 font-medium">{field.name}</td>
                                <td className="py-2 px-3">
                                  <span className="text-[11px] font-sans px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {field.type}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-400 tabular-nums">
                                  {field.distinctCount}
                                </td>
                                <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                                  {field.sampleValue !== null && field.sampleValue !== undefined
                                    ? typeof field.sampleValue === 'object'
                                      ? JSON.stringify(field.sampleValue)
                                      : String(field.sampleValue)
                                    : 'null'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
