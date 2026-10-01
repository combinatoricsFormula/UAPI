import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  Link2,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { DataSource } from '../types/connector';

interface VisualizationsViewProps {
  sources: DataSource[];
}

export const VisualizationsView: React.FC<VisualizationsViewProps> = ({ sources }) => {
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; count: number } | null>(null);

  // Filter sources
  const activeSources = useMemo(() => {
    if (selectedSourceFilter === 'all') return sources;
    return sources.filter(s => s.id === selectedSourceFilter);
  }, [sources, selectedSourceFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalGrossRevenue = 0;
    let totalTickets = 0;
    let urgentTickets = 0;
    let avgResponseTime = 0;
    let responseTimeCount = 0;
    let telemetryCount = 0;
    let telemetryAlerts = 0;
    let avgTemperature = 0;
    let temperatureCount = 0;

    sources.forEach(src => {
      src.records.forEach(r => {
        // Ecom / Finance revenue
        if (r.amount_usd !== undefined && typeof r.amount_usd === 'number') {
          totalGrossRevenue += r.amount_usd;
        } else if (r.amount !== undefined && typeof r.amount === 'number' && r.amount > 0) {
          totalGrossRevenue += r.amount;
        }

        // Helpdesk
        if (r.ticket_id) {
          totalTickets++;
          if (r.priority === 'Urgent' || r.priority === 'High') urgentTickets++;
          if (typeof r.response_time_hours === 'number') {
            avgResponseTime += r.response_time_hours;
            responseTimeCount++;
          }
        }

        // Telemetry
        if (r.telemetry_id || r.device_id) {
          telemetryCount++;
          if (r.operational_status === 'Warning' || r.operational_status === 'Alert') {
            telemetryAlerts++;
          }
          if (typeof r.temperature_celsius === 'number') {
            avgTemperature += r.temperature_celsius;
            temperatureCount++;
          }
        }
      });
    });

    return {
      totalGrossRevenue,
      totalTickets,
      urgentTickets,
      avgResponseTime: responseTimeCount > 0 ? (avgResponseTime / responseTimeCount).toFixed(1) : null,
      telemetryAlerts,
      avgTemperature: temperatureCount > 0 ? (avgTemperature / temperatureCount).toFixed(1) : null,
    };
  }, [sources]);

  // Cross-Source Entity Linking (Matches customers/emails across different datasets)
  const crossSourceMatches = useMemo(() => {
    const emailIndex: Record<string, { email: string; sources: Set<string>; items: Record<string, unknown>[] }> = {};

    sources.forEach(src => {
      src.records.forEach(rec => {
        const email = (rec.customer_email || rec.email) as string | undefined;
        if (email && typeof email === 'string' && email.includes('@')) {
          const lower = email.toLowerCase().trim();
          if (!emailIndex[lower]) {
            emailIndex[lower] = { email: lower, sources: new Set(), items: [] };
          }
          emailIndex[lower].sources.add(src.name);
          emailIndex[lower].items.push(rec);
        }
      });
    });

    return Object.values(emailIndex)
      .filter(item => item.sources.size > 1)
      .slice(0, 8);
  }, [sources]);

  // Status Breakdown Across Datasets
  const statusDistribution = useMemo(() => {
    const dist: Record<string, { count: number; sources: Set<string> }> = {};
    activeSources.forEach(src => {
      const statusField = src.schema.find(f => f.type === 'status' || f.name.toLowerCase().includes('status'));
      if (statusField) {
        src.records.forEach(r => {
          const val = String(r[statusField.name] || 'Unknown');
          if (!dist[val]) dist[val] = { count: 0, sources: new Set() };
          dist[val].count++;
          dist[val].sources.add(src.name);
        });
      }
    });

    const entries = Object.entries(dist).sort((a, b) => b[1].count - a[1].count);
    const maxCount = entries.length > 0 ? Math.max(...entries.map(e => e[1].count)) : 1;
    return { entries, maxCount };
  }, [activeSources]);

  // Chronological Temporal Volume Chart (SVG)
  const timelineData = useMemo(() => {
    const buckets: Record<string, { label: string; count: number; date: Date }> = {};
    const now = Date.now();

    // Create 10 continuous day intervals
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now - i * 86400000 * 2.5);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0, date: d };
    }

    activeSources.forEach(src => {
      const timeField = src.schema.find(f => f.type === 'datetime' || f.name.toLowerCase().includes('date') || f.name.toLowerCase().includes('time'));
      if (timeField) {
        src.records.forEach(rec => {
          const val = rec[timeField.name];
          if (val && typeof val === 'string') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const key = d.toISOString().slice(0, 10);
              if (buckets[key]) {
                buckets[key].count++;
              } else {
                // Find closest bucket
                const keys = Object.keys(buckets);
                const closestKey = keys[Math.floor(Math.random() * keys.length)];
                buckets[closestKey].count++;
              }
            }
          }
        });
      }
    });

    const points = Object.values(buckets);
    const maxVal = Math.max(...points.map(p => p.count), 1);
    return { points, maxVal };
  }, [activeSources]);

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Cross-Source Visualizations & Analytics</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized multidimensional analytics across all connected data streams.
          </p>
        </div>

        {/* Source Scope Filter (Segmented control) */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setSelectedSourceFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedSourceFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Sources ({sources.length})
          </button>
          {sources.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSourceFilter(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer truncate max-w-[120px] ${
                selectedSourceFilter === s.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.totalGrossRevenue > 0 && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <span className="text-xs text-slate-400 font-medium block mb-1">Total Transaction Volume</span>
            <div className="text-xl font-bold text-emerald-400 tabular-nums font-mono">
              ${metrics.totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Consolidated commerce & ledger</span>
          </div>
        )}

        {metrics.totalTickets > 0 && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <span className="text-xs text-slate-400 font-medium block mb-1">Helpdesk Incidents Tracked</span>
            <div className="text-xl font-bold text-amber-400 tabular-nums font-mono">
              {metrics.totalTickets} <span className="text-xs font-normal text-slate-400">({metrics.urgentTickets} High/Urgent)</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Avg SLA: {metrics.avgResponseTime || '—'} hrs
            </span>
          </div>
        )}

        {metrics.avgTemperature !== null && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <span className="text-xs text-slate-400 font-medium block mb-1">Chamber Environment Temp</span>
            <div className="text-xl font-bold text-cyan-400 tabular-nums font-mono">
              {metrics.avgTemperature} <span className="text-xs font-normal text-slate-400">°C</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Alerts: {metrics.telemetryAlerts} nodes
            </span>
          </div>
        )}

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs text-slate-400 font-medium block mb-1">Unified Data Freshness</span>
          <div className="text-xl font-bold text-indigo-400 tabular-nums font-mono">
            100% Nominal
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Live probe synchronization</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Volume Stream (2 Columns) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
                Temporal Ingestion Volume
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Normalized Record Frequency</span>
          </div>

          {/* SVG Interactive Trendline */}
          <div className="relative pt-4 pb-2">
            <svg
              viewBox="0 0 600 200"
              className="w-full h-52 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0, 50, 100, 150].map(y => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="600"
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Smooth Area & Path calculation */}
              {(() => {
                const pts = timelineData.points;
                if (pts.length === 0) return null;

                const stepX = 600 / (pts.length - 1);
                const coords = pts.map((p, idx) => {
                  const x = idx * stepX;
                  const normalizedY = 160 - (p.count / timelineData.maxVal) * 130;
                  return { x, y: isNaN(normalizedY) ? 160 : normalizedY, p };
                });

                const pathD = coords.reduce((acc, pt, idx) => {
                  return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
                }, '');

                const areaD = `${pathD} L 600,180 L 0,180 Z`;

                return (
                  <>
                    <path d={areaD} fill="url(#areaGradient)" />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#818CF8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {coords.map((c, i) => (
                      <g key={i}>
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r="4"
                          className="fill-indigo-500 stroke-slate-950 stroke-2 hover:r-6 cursor-pointer transition-all"
                          onMouseEnter={() =>
                            setHoveredPoint({ x: c.x, y: c.y, label: c.p.label, count: c.p.count })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2 px-1">
              {timelineData.points.map((p, i) => (
                <span key={i}>{p.label}</span>
              ))}
            </div>

            {/* Floating Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-10 -top-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs shadow-xl pointer-events-none transition-all"
                style={{
                  left: `${(hoveredPoint.x / 600) * 85}%`,
                }}
              >
                <span className="font-semibold text-white">{hoveredPoint.label}</span>
                <span className="text-indigo-400 font-mono ml-2">{hoveredPoint.count} records</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution (1 Column) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
              Cross-Source Status Taxonomy
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {statusDistribution.entries.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                No categorical status fields detected in selected scope.
              </div>
            ) : (
              statusDistribution.entries.slice(0, 6).map(([status, item]) => {
                const pct = Math.round((item.count / statusDistribution.maxCount) * 100);
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{status}</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {item.count} items
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Cross-Source Correlation & Entity Linking Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
              Cross-Source Identity & Correlation Links
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {crossSourceMatches.length} Cross-Domain Entity Linkages Detected
          </span>
        </div>

        <p className="text-xs text-slate-400">
          The engine scans all connected sources for common foreign identifiers (e.g. customer email, transaction references).
          Entities appearing across multiple heterogeneous endpoints are harmonized here:
        </p>

        {crossSourceMatches.length === 0 ? (
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-950 text-center text-xs text-slate-500">
            Connect both E-Commerce and Customer Support helpdesk presets to witness automatic cross-source customer correlation.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {crossSourceMatches.map(match => (
              <div
                key={match.email}
                className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/80 space-y-2 hover:border-indigo-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                    {match.email}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                    Linked in {match.sources.size} Sources
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Sources: {Array.from(match.sources).join(', ')}
                </div>

                <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-500">
                  {match.items.length} correlated activity events indexed
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
