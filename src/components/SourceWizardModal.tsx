import React, { useState } from 'react';
import {
  X,
  Globe,
  Database,
  Cloud,
  Activity,
  Layers,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Key,
  Shield,
  Loader2,
  Check,
} from 'lucide-react';
import { AuthType, ConnectorType, DataSource, DataSourceLocation, FieldSchema } from '../types/connector';
import { LOCATION_CATEGORIES, PRESET_SOURCES, PresetSourceDefinition } from '../data/presetSources';
import { determineConnector, extractRecordsFromPayload, inferFieldSchema } from '../utils/schemaDetector';

interface SourceWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceConnected: (source: DataSource) => void;
}

export const SourceWizardModal: React.FC<SourceWizardModalProps> = ({
  isOpen,
  onClose,
  onSourceConnected,
}) => {
  // Wizard steps: 1: Location -> 2: Endpoint -> 3: Type Determination -> 4: Credentials -> 5: Retrieving
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [location, setLocation] = useState<DataSourceLocation>('rest_api');
  const [sourceName, setSourceName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [rawTextPayload, setRawTextPayload] = useState('');

  // Credentials
  const [authType, setAuthType] = useState<AuthType>('none');
  const [token, setToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiHeaderName, setApiHeaderName] = useState('X-API-Key');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [queryParamName, setQueryParamName] = useState('api_key');
  const [queryParamValue, setQueryParamValue] = useState('');

  // Probing and schema detection states
  const [isProbing, setIsProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DataSource['detectedFormat']>('json_array');
  const [envelopeKey, setEnvelopeKey] = useState<string | undefined>();
  const [extractedRecords, setExtractedRecords] = useState<Record<string, unknown>[]>([]);
  const [detectedSchema, setDetectedSchema] = useState<FieldSchema[]>([]);
  const [recommendedConnector, setRecommendedConnector] = useState<{
    connectorType: ConnectorType;
    rationale: string;
    badgeName: string;
    color: string;
  } | null>(null);

  // Retrieval state
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Preset Selection
  const applyPreset = (preset: PresetSourceDefinition) => {
    setLocation(preset.category);
    setSourceName(preset.name);
    setEndpoint(preset.endpoint);
    setMethod(preset.method);
    setAuthType(preset.authType);

    if (preset.credentialsHint) {
      if (preset.credentialsHint.token) setToken(preset.credentialsHint.token);
      if (preset.credentialsHint.key) setApiKey(preset.credentialsHint.key);
      if (preset.credentialsHint.headerName) setApiHeaderName(preset.credentialsHint.headerName);
      if (preset.credentialsHint.username) setUsername(preset.credentialsHint.username);
      if (preset.credentialsHint.password) setPassword(preset.credentialsHint.password);
    } else {
      setToken('');
      setApiKey('');
      setUsername('');
      setPassword('');
    }

    setStep(2);
  };

  // Run Schema and Data Type Detection
  const runTypeDetermination = async () => {
    setIsProbing(true);
    setProbeError(null);

    try {
      // If it's direct paste / file text
      if (location === 'file_upload' && rawTextPayload.trim()) {
        const { records, detectedFormat: format, envelopeKey: envK } = extractRecordsFromPayload(rawTextPayload);
        if (records.length === 0) {
          throw new Error('Could not parse any records from the provided content. Please ensure valid JSON, CSV, or TSV format.');
        }

        const schema = inferFieldSchema(records);
        const connector = determineConnector(endpoint || 'pasted_data', schema, format);

        setDetectedFormat(format);
        setEnvelopeKey(envK);
        setExtractedRecords(records);
        setDetectedSchema(schema);
        setRecommendedConnector(connector);
        if (!sourceName) setSourceName('Pasted Delimited Stream');
        setStep(3);
        setIsProbing(false);
        return;
      }

      // External / REST / DB probe through backend proxy
      const headersObj: Record<string, string> = {};
      customHeaders.forEach(h => {
        if (h.key.trim() && h.value.trim()) headersObj[h.key.trim()] = h.value.trim();
      });

      const creds: Record<string, string> = {};
      if (authType === 'bearer') creds.token = token;
      if (authType === 'apiKey') {
        creds.key = apiKey;
        creds.headerName = apiHeaderName;
      }
      if (authType === 'basic') {
        creds.username = username;
        creds.password = password;
      }
      if (authType === 'queryParam') {
        creds.queryParamName = queryParamName;
        creds.queryParamValue = queryParamValue;
      }

      const res = await fetch('/api/connector/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          method,
          headers: headersObj,
          authType,
          credentials: creds,
        }),
      });

      const probeResult = await res.json();

      if (!probeResult.reachable) {
        throw new Error(probeResult.error || `Unable to reach endpoint ${endpoint}`);
      }

      // Extract records from preview
      const previewData = probeResult.previewParsed || probeResult.rawSnippet;
      const { records, detectedFormat: format, envelopeKey: envK } = extractRecordsFromPayload(previewData);

      if (records.length === 0) {
        throw new Error('Connected to endpoint successfully, but no structured tabular items could be recognized in the response.');
      }

      const schema = inferFieldSchema(records);
      const connector = determineConnector(endpoint, schema, format);

      setDetectedFormat(format);
      setEnvelopeKey(envK);
      setExtractedRecords(records);
      setDetectedSchema(schema);
      setRecommendedConnector(connector);

      if (!sourceName) {
        try {
          const u = new URL(endpoint, window.location.origin);
          const parts = u.pathname.split('/').filter(Boolean);
          const lastPart = parts[parts.length - 1] || u.hostname;
          setSourceName(lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/[-_]/g, ' '));
        } catch {
          setSourceName('Connected Stream');
        }
      }

      setStep(3);
    } catch (err: unknown) {
      setProbeError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProbing(false);
    }
  };

  // Step 4: Final Retrieval & Activation
  const executeDataRetrieval = async () => {
    setIsRetrieving(true);
    setRetrievalError(null);

    try {
      let finalRecords: Record<string, unknown>[] = [];
      let latencyMs = 25;

      if (location === 'file_upload' && rawTextPayload.trim()) {
        const { records } = extractRecordsFromPayload(rawTextPayload);
        finalRecords = records;
      } else {
        const headersObj: Record<string, string> = {};
        customHeaders.forEach(h => {
          if (h.key.trim() && h.value.trim()) headersObj[h.key.trim()] = h.value.trim();
        });

        const creds: Record<string, string> = {};
        if (authType === 'bearer') creds.token = token;
        if (authType === 'apiKey') {
          creds.key = apiKey;
          creds.headerName = apiHeaderName;
        }
        if (authType === 'basic') {
          creds.username = username;
          creds.password = password;
        }
        if (authType === 'queryParam') {
          creds.queryParamName = queryParamName;
          creds.queryParamValue = queryParamValue;
        }

        const res = await fetch('/api/connector/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            method,
            headers: headersObj,
            authType,
            credentials: creds,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP ${res.status} retrieval error.`);
        }

        const dataResponse = await res.json();
        latencyMs = dataResponse.latencyMs || 42;

        const { records } = extractRecordsFromPayload(dataResponse.data);
        finalRecords = records.length > 0 ? records : extractedRecords;
      }

      if (finalRecords.length === 0) {
        throw new Error('Retrieved 0 records from source.');
      }

      const fullSchema = inferFieldSchema(finalRecords);

      // Color assignment
      const colors = ['#6366F1', '#10B981', '#F59E0B', '#06B6D4', '#EC4899', '#8B5CF6'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const newSource: DataSource = {
        id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: sourceName || 'Live Data Source',
        locationCategory: location,
        endpoint: location === 'file_upload' ? 'Raw Delimited Stream' : endpoint,
        method,
        authType,
        credentials: {
          token: token || undefined,
          key: apiKey || undefined,
          headerName: apiHeaderName,
          username: username || undefined,
          password: password || undefined,
        },
        connectorType: recommendedConnector?.connectorType || 'rest_envelope',
        detectedFormat,
        envelopeKey,
        schema: fullSchema,
        records: finalRecords,
        status: 'active',
        latencyMs,
        lastSyncedAt: new Date().toISOString(),
        color,
        description: recommendedConnector?.rationale,
      };

      onSourceConnected(newSource);
      onClose();
    } catch (err: unknown) {
      setRetrievalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRetrieving(false);
    }
  };

  const getCategoryIcon = (cat: DataSourceLocation) => {
    switch (cat) {
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Connect New Data Source</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className={step >= 1 ? 'text-indigo-400 font-medium' : ''}>1. Location</span>
              <span>·</span>
              <span className={step >= 2 ? 'text-indigo-400 font-medium' : ''}>2. Endpoint</span>
              <span>·</span>
              <span className={step >= 3 ? 'text-indigo-400 font-medium' : ''}>3. Data Types & Connector</span>
              <span>·</span>
              <span className={step >= 4 ? 'text-indigo-400 font-medium' : ''}>4. Credentials & Retrieval</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: Ask where data is located */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Where is your data located?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select your storage architecture, API framework, or choose a live test endpoint to connect in seconds.
                </p>
              </div>

              {/* Location Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {LOCATION_CATEGORIES.map(cat => {
                  const isSelected = location === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setLocation(cat.id)}
                      className={`flex flex-col items-start p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/30 text-white'
                          : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={isSelected ? 'text-indigo-400' : 'text-slate-400'}>
                          {getCategoryIcon(cat.id)}
                        </span>
                        <span className="text-xs font-semibold">{cat.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{cat.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Ready-to-Test Instant Presets */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    Instant Ready-to-Test Live Endpoints
                  </span>
                  <span className="text-[11px] text-slate-500">1-click automated setup</span>
                </div>

                <div className="space-y-2">
                  {PRESET_SOURCES.map(preset => (
                    <div
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className="group flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-indigo-500/60 hover:bg-slate-800/40 transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5 max-w-[80%]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {preset.categoryLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{preset.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 hidden sm:inline">
                          {preset.authDescription}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Provide the Endpoints */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Provide the Endpoint Details</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Specify the network location or paste data directly. The engine will inspect the structure and detect data types.
                </p>
              </div>

              {location !== 'file_upload' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">HTTP Method</label>
                      <select
                        value={method}
                        onChange={e => setMethod(e.target.value as 'GET' | 'POST')}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Endpoint URL</label>
                      <input
                        type="text"
                        value={endpoint}
                        onChange={e => setEndpoint(e.target.value)}
                        placeholder="https://api.example.com/v1/data or /api/mock/..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Source Display Name</label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={e => setSourceName(e.target.value)}
                      placeholder="e.g. Production Sales API or Warehouse Telemetry"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Custom Request Headers */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-300">Custom Request Headers (Optional)</label>
                      <button
                        type="button"
                        onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        + Add Header
                      </button>
                    </div>

                    {customHeaders.length > 0 && (
                      <div className="space-y-2">
                        {customHeaders.map((hdr, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Header Name (e.g. X-Tenant-Id)"
                              value={hdr.key}
                              onChange={e => {
                                const copy = [...customHeaders];
                                copy[idx].key = e.target.value;
                                setCustomHeaders(copy);
                              }}
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Header Value"
                              value={hdr.value}
                              onChange={e => {
                                const copy = [...customHeaders];
                                copy[idx].value = e.target.value;
                                setCustomHeaders(copy);
                              }}
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomHeaders(customHeaders.filter((_, i) => i !== idx))}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* File / Delimited Raw Paste */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Source Display Name</label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={e => setSourceName(e.target.value)}
                      placeholder="e.g. Regional Retail Ledger CSV"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">Paste CSV, TSV, NDJSON or JSON Array</label>
                      <button
                        type="button"
                        onClick={() =>
                          setRawTextPayload(`transaction_id,timestamp,customer,amount,status,category
TX-801,2026-03-28T09:15:00Z,Alice Gomez,189.50,Approved,Software
TX-802,2026-03-28T10:42:00Z,Beta Labs,1250.00,Approved,Cloud Hosting
TX-803,2026-03-29T14:20:00Z,Charles Ray,45.20,Pending,Hardware
TX-804,2026-03-29T16:05:00Z,Delta Systems,890.00,Approved,Security
TX-805,2026-03-30T11:30:00Z,Elena Vance,310.00,Rejected,Accessories`)
                        }
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        Insert Sample CSV
                      </button>
                    </div>
                    <textarea
                      rows={7}
                      value={rawTextPayload}
                      onChange={e => setRawTextPayload(e.target.value)}
                      placeholder="Paste text here with headers..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white font-mono placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {probeError && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <div className="space-y-1">
                    <span className="font-semibold">Endpoint Probe Issue:</span>
                    <p className="text-[11px] opacity-90">{probeError}</p>
                    <p className="text-[10px] text-slate-400">
                      Tip: If this endpoint requires credentials, you can configure authentication in Step 4.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Determining Data Types & Built-in Connector */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Data Types & Built-in Connector Determined</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    OmniSource analyzed the endpoint response, inferred schema types, and selected the optimized built-in connector.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Inspected {extractedRecords.length} records</span>
                </div>
              </div>

              {/* Recommended Built-in Connector Card */}
              {recommendedConnector && (
                <div className="rounded-lg border border-indigo-500/40 bg-indigo-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                      Selected Built-in Connector
                    </span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {recommendedConnector.badgeName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {recommendedConnector.rationale}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-mono">
                    <span>Format: {detectedFormat.toUpperCase()}</span>
                    {envelopeKey && <span>Envelope Key: "{envelopeKey}"</span>}
                    <span>Total Attributes: {detectedSchema.length}</span>
                  </div>
                </div>
              )}

              {/* Schema Table */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  Inferred Schema Attributes & Data Types ({detectedSchema.length})
                </span>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                        <th className="py-2 px-3">Field Name</th>
                        <th className="py-2 px-3">Inferred Type</th>
                        <th className="py-2 px-3">Distinct Values</th>
                        <th className="py-2 px-3">Sample Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {detectedSchema.map(field => (
                        <tr key={field.name} className="hover:bg-slate-900/40 transition-colors">
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

          {/* STEP 4: Asks the Credentials & Retrieves Data */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Authentication & Credentials</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure authentication for <span className="text-white font-mono">{endpoint}</span> to retrieve the full dataset.
                </p>
              </div>

              {/* Auth Type Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'none', label: 'No Auth (Public)' },
                  { id: 'bearer', label: 'Bearer Token' },
                  { id: 'apiKey', label: 'API Key Header' },
                  { id: 'basic', label: 'Basic Auth' },
                  { id: 'queryParam', label: 'Query Param' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAuthType(opt.id as AuthType)}
                    className={`p-2.5 rounded-lg border text-center text-xs transition-colors cursor-pointer ${
                      authType === opt.id
                        ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Auth Inputs */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-4">
                {authType === 'none' && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-400">
                    <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>This endpoint requires no authentication or is publicly readable.</span>
                  </div>
                )}

                {authType === 'bearer' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-indigo-400" />
                      Bearer / JWT Token
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Injected into requests as <span className="font-mono text-slate-400">Authorization: Bearer &lt;token&gt;</span>
                    </p>
                  </div>
                )}

                {authType === 'apiKey' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Header Name</label>
                      <input
                        type="text"
                        value={apiHeaderName}
                        onChange={e => setApiHeaderName(e.target.value)}
                        placeholder="X-API-Key"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">API Key Value</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="live_secret_key_..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {authType === 'basic' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="service_account"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {authType === 'queryParam' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Parameter Name</label>
                      <input
                        type="text"
                        value={queryParamName}
                        onChange={e => setQueryParamName(e.target.value)}
                        placeholder="api_key"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Parameter Value</label>
                      <input
                        type="password"
                        value={queryParamValue}
                        onChange={e => setQueryParamValue(e.target.value)}
                        placeholder="secret_token"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {retrievalError && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <span className="font-semibold">Retrieval Error:</span>
                    <p className="text-[11px] opacity-90 mt-0.5">{retrievalError}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500">Select source location</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
              >
                <span>Continue to Endpoint</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={runTypeDetermination}
                disabled={isProbing || (location !== 'file_upload' && !endpoint.trim()) || (location === 'file_upload' && !rawTextPayload.trim())}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProbing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Inspecting & Determining Types...</span>
                  </>
                ) : (
                  <>
                    <span>Inspect & Determine Connector</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
              >
                <span>Configure Credentials & Retrieve</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={executeDataRetrieval}
                disabled={isRetrieving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRetrieving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Retrieving Ingested Stream...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Retrieve Data & Mount Source</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
