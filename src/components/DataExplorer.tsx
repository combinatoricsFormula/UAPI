import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Filter,
  ArrowUpDown,
  Eye,
  X,
  FileCode,
  Copy,
  Check,
} from 'lucide-react';
import { DataSource, FieldSchema } from '../types/connector';

interface DataExplorerProps {
  sources: DataSource[];
  selectedSourceId?: string;
  onSelectSourceId?: (id: string) => void;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({
  sources,
  selectedSourceId: initialSelectedSourceId,
  onSelectSourceId,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialSelectedSourceId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [inspectedRecord, setInspectedRecord] = useState<{
    sourceName: string;
    record: Record<string, unknown>;
  } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const pageSize = 12;

  // Flattened and normalized record list with source metadata
  const allRows = useMemo(() => {
    let rows: Array<{ _sourceId: string; _sourceName: string; _sourceColor: string; [key: string]: unknown }> = [];

    sources.forEach(src => {
      if (selectedSourceId === 'all' || src.id === selectedSourceId) {
        src.records.forEach((r, idx) => {
          rows.push({
            _sourceId: src.id,
            _sourceName: src.name,
            _sourceColor: src.color,
            _uid: `${src.id}-${idx}`,
            ...r,
          });
        });
      }
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(r =>
        Object.entries(r).some(([k, v]) => {
          if (k.startsWith('_')) return false;
          if (v === null || v === undefined) return false;
          return String(v).toLowerCase().includes(q);
        })
      );
    }

    // Apply sorting
    if (sortField) {
      rows.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [sources, selectedSourceId, searchQuery, sortField, sortAsc]);

  // Compute common columns to display in grid
  const visibleColumns = useMemo(() => {
    const colSet = new Set<string>();
    const activeSchemas: FieldSchema[] = [];

    sources.forEach(src => {
      if (selectedSourceId === 'all' || src.id === selectedSourceId) {
        src.schema.forEach(f => {
          colSet.add(f.name);
          activeSchemas.push(f);
        });
      }
    });

    // Pick top 7 primary columns
    const cols = Array.from(colSet).slice(0, 7);
    return cols;
  }, [sources, selectedSourceId]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [allRows, currentPage]);

  const toggleSort = (col: string) => {
    if (sortField === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(col);
      setSortAsc(true);
    }
  };

  // Export functions
  const exportToCsv = () => {
    if (allRows.length === 0) return;
    const exportCols = visibleColumns;
    const headerRow = ['Source', ...exportCols].join(',');
    const csvLines = allRows.map(r => {
      const line = [
        `"${r._sourceName}"`,
        ...exportCols.map(col => {
          const val = r[col];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        }),
      ];
      return line.join(',');
    });

    const csvContent = [headerRow, ...csvLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omnisource_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJson = () => {
    if (allRows.length === 0) return;
    const cleanData = allRows.map(r => {
      const copy = { ...r };
      delete copy._uid;
      return copy;
    });
    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omnisource_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    if (!inspectedRecord) return;
    navigator.clipboard.writeText(JSON.stringify(inspectedRecord.record, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Source Scope Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Source:</span>
            <select
              value={selectedSourceId}
              onChange={e => {
                setSelectedSourceId(e.target.value);
                setCurrentPage(1);
                if (onSelectSourceId) onSelectSourceId(e.target.value);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Sources ({sources.length})</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.records.length} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search across all attributes..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            disabled={allRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportToJson}
            disabled={allRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileCode className="h-3 w-3" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Grid (Compliant with SaaS Design guidelines) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                <th className="py-2.5 px-3 w-36">Source Stream</th>
                {visibleColumns.map(col => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono">{col}</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-600" />
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 w-16 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-12 text-center text-slate-500 font-sans"
                  >
                    No records found matching current query or source scope.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => (
                  <tr
                    key={row._uid as string || idx}
                    className="h-10 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() =>
                      setInspectedRecord({
                        sourceName: row._sourceName as string,
                        record: row,
                      })
                    }
                  >
                    <td className="py-2 px-3 whitespace-nowrap font-sans">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: row._sourceColor as string }}
                        />
                        <span className="text-[11px] font-medium text-slate-300 truncate max-w-[120px]">
                          {row._sourceName as string}
                        </span>
                      </div>
                    </td>

                    {visibleColumns.map(col => {
                      const val = row[col];
                      const isNumeric = typeof val === 'number';
                      return (
                        <td
                          key={col}
                          className={`py-2 px-3 truncate max-w-[180px] tabular-nums ${
                            isNumeric ? 'text-right text-slate-200 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          {val !== null && val !== undefined
                            ? typeof val === 'object'
                              ? JSON.stringify(val)
                              : typeof val === 'boolean'
                              ? (val ? 'true' : 'false')
                              : String(val)
                            : '—'}
                        </td>
                      );
                    })}

                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setInspectedRecord({
                            sourceName: row._sourceName as string,
                            record: row,
                          });
                        }}
                        className="text-slate-500 group-hover:text-indigo-400 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400">
          <div className="font-mono">
            Showing{' '}
            <span className="text-white font-medium">
              {allRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="text-white font-medium">
              {Math.min(currentPage * pageSize, allRows.length)}
            </span>{' '}
            of <span className="text-white font-medium">{allRows.length}</span> rows
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Prev
            </button>
            <span className="font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Record Inspector Modal */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-white">Record Detail Inspector</h3>
                <span className="text-xs text-slate-400 font-mono">
                  Source: {inspectedRecord.sourceName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  {copiedJson ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setInspectedRecord(null)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 font-mono text-xs">
              <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950">
                {Object.entries(inspectedRecord.record)
                  .filter(([k]) => !k.startsWith('_'))
                  .map(([key, val]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 gap-1 hover:bg-slate-900/40">
                      <span className="text-slate-400 font-medium">{key}</span>
                      <span className="text-white truncate max-w-sm">
                        {val !== null && val !== undefined
                          ? typeof val === 'object'
                            ? JSON.stringify(val)
                            : String(val)
                          : 'null'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
