/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UnifiedOverview } from './components/UnifiedOverview';
import { VisualizationsView } from './components/VisualizationsView';
import { DataExplorer } from './components/DataExplorer';
import { ConnectorsManager } from './components/ConnectorsManager';
import { AiAnalystPanel } from './components/AiAnalystPanel';
import { SourceWizardModal } from './components/SourceWizardModal';
import { DataSource } from './types/connector';
import { getInitialDataSources } from './data/initialSources';
import { extractRecordsFromPayload, inferFieldSchema } from './utils/schemaDetector';

export default function App() {
  const [sources, setSources] = useState<DataSource[]>(() => {
    try {
      const stored = localStorage.getItem('omnisource_connected_sources');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getInitialDataSources();
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'connectors' | 'visualizations' | 'explorer' | 'ai'>('overview');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [selectedSourceForExplorer, setSelectedSourceForExplorer] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem('omnisource_connected_sources', JSON.stringify(sources));
    } catch {
      // ignore
    }
  }, [sources]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSourceConnected = (newSource: DataSource) => {
    setSources(prev => [newSource, ...prev]);
    showToast(`Successfully connected and retrieved "${newSource.name}"`);
    setActiveTab('overview');
  };

  const handleRemoveSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
    showToast('Source connector disconnected');
  };

  // Sync an individual source
  const handleSyncSource = async (id: string) => {
    const src = sources.find(s => s.id === id);
    if (!src) return;

    setSyncingSourceId(id);
    try {
      if (src.locationCategory === 'file_upload') {
        // Local source, update timestamp
        setSources(prev =>
          prev.map(s =>
            s.id === id
              ? { ...s, lastSyncedAt: new Date().toISOString(), latencyMs: 8 }
              : s
          )
        );
      } else {
        const res = await fetch('/api/connector/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: src.endpoint,
            method: src.method,
            headers: src.headers,
            authType: src.authType,
            credentials: src.credentials,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const dataResponse = await res.json();
        const { records } = extractRecordsFromPayload(dataResponse.data);

        setSources(prev =>
          prev.map(s =>
            s.id === id
              ? {
                  ...s,
                  records: records.length > 0 ? records : s.records,
                  latencyMs: dataResponse.latencyMs || 22,
                  lastSyncedAt: new Date().toISOString(),
                }
              : s
          )
        );
      }
      showToast(`Updated "${src.name}"`);
    } catch (err) {
      showToast(`Failed to sync: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncingSourceId(null);
    }
  };

  // Sync all sources
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    for (const src of sources) {
      await handleSyncSource(src.id);
    }
    setIsSyncingAll(false);
    showToast('All connected data sources synchronized.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Primary Top Bar Contract Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncingAll}
        totalSourcesCount={sources.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <UnifiedOverview
            sources={sources}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onSelectTab={setActiveTab}
            onSyncAll={handleSyncAll}
            isSyncing={isSyncingAll}
            onSelectSourceForExplorer={srcId => {
              setSelectedSourceForExplorer(srcId);
              setActiveTab('explorer');
            }}
          />
        )}

        {activeTab === 'connectors' && (
          <ConnectorsManager
            sources={sources}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onRemoveSource={handleRemoveSource}
            onSyncSource={handleSyncSource}
            syncingSourceId={syncingSourceId}
          />
        )}

        {activeTab === 'visualizations' && (
          <VisualizationsView sources={sources} />
        )}

        {activeTab === 'explorer' && (
          <DataExplorer
            sources={sources}
            selectedSourceId={selectedSourceForExplorer}
            onSelectSourceId={setSelectedSourceForExplorer}
          />
        )}

        {activeTab === 'ai' && (
          <AiAnalystPanel sources={sources} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OmniSource Data Hub · Universal Ingestion & Intelligence Plane</span>
          <span className="font-mono text-[11px] text-slate-500">
            {sources.length} active connectors · Auto-schema detection
          </span>
        </div>
      </footer>

      {/* Connection Onboarding Wizard Modal */}
      <SourceWizardModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSourceConnected={handleSourceConnected}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-white shadow-2xl animate-fade-in font-medium">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
