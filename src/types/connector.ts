export type DataSourceLocation =
  | 'rest_api'
  | 'database'
  | 'cloud_storage'
  | 'event_stream'
  | 'saas_app'
  | 'file_upload';

export type AuthType = 'none' | 'bearer' | 'apiKey' | 'basic' | 'queryParam' | 'customHeaders';

export type ConnectorType =
  | 'rest_envelope'
  | 'tabular_delimited'
  | 'timeseries_telemetry'
  | 'ecommerce_transactions'
  | 'crm_tickets'
  | 'financial_ledger'
  | 'raw_document';

export type FieldType =
  | 'string'
  | 'number'
  | 'currency'
  | 'datetime'
  | 'boolean'
  | 'email'
  | 'url'
  | 'status'
  | 'geo'
  | 'object'
  | 'array';

export interface FieldSchema {
  name: string;
  type: FieldType;
  sampleValue: unknown;
  nullCount: number;
  distinctCount: number;
  isPrimaryKey?: boolean;
  isTimestamp?: boolean;
  isMetric?: boolean;
  unit?: string;
}

export interface DataSource {
  id: string;
  name: string;
  locationCategory: DataSourceLocation;
  endpoint: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  authType: AuthType;
  credentials: {
    token?: string;
    key?: string;
    headerName?: string;
    username?: string;
    password?: string;
    queryParamName?: string;
    queryParamValue?: string;
    customHeaders?: Record<string, string>;
  };
  connectorType: ConnectorType;
  detectedFormat: 'json_array' | 'json_envelope' | 'csv' | 'tsv' | 'ndjson' | 'json_object';
  envelopeKey?: string;
  schema: FieldSchema[];
  records: Record<string, unknown>[];
  status: 'active' | 'syncing' | 'error' | 'idle';
  latencyMs: number;
  lastSyncedAt: string;
  color: string;
  description?: string;
  errorMessage?: string;
  totalSizeText?: string;
}

export interface ProbeResult {
  reachable: boolean;
  status?: number;
  statusText?: string;
  latencyMs?: number;
  contentType?: string;
  isJson?: boolean;
  rawSnippet?: string;
  previewParsed?: unknown;
  byteLength?: number;
  error?: string;
}

export interface AiAnalysisResult {
  headline: string;
  summary: string;
  keyMetrics: Array<{
    label: string;
    value: string;
    subtext: string;
    source: string;
  }>;
  crossSourceCorrelations: Array<{
    title: string;
    description: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  actionableInsights: string[];
}
