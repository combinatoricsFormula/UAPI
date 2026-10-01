import React from 'react';
import { RefreshCw, Plus, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: 'overview' | 'connectors' | 'visualizations' | 'explorer' | 'ai';
  setActiveTab: (tab: 'overview' | 'connectors' | 'visualizations' | 'explorer' | 'ai') => void;
  onOpenConnectModal: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  totalSourcesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenConnectModal,
  onSyncAll,
  isSyncing,
  totalSourcesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Database className="h-4 w-4" />
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="text-base font-semibold tracking-tight text-white hover:text-indigo-400 transition-colors cursor-pointer"
          >
            OmniSource Data Hub
          </button>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-800/80 text-white font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Unified Hub
          </button>
          <button
            onClick={() => setActiveTab('connectors')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'connectors'
                ? 'bg-slate-800/80 text-white font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Connectors ({totalSourcesCount})
          </button>
          <button
            onClick={() => setActiveTab('visualizations')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'visualizations'
                ? 'bg-slate-800/80 text-white font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Visualizations
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'explorer'
                ? 'bg-slate-800/80 text-white font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Data Explorer
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-slate-800/80 text-indigo-400 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            AI Intelligence
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh and sync all connected endpoints"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Sync All</span>
          </button>

          <button
            onClick={onOpenConnectModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-indigo-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect Source</span>
          </button>
        </div>
      </div>
    </header>
  );
};
