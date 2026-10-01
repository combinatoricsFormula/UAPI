import { AuthType, ConnectorType, DataSourceLocation } from '../types/connector';

export interface PresetSourceDefinition {
  id: string;
  name: string;
  category: DataSourceLocation;
  categoryLabel: string;
  endpoint: string;
  method: 'GET' | 'POST';
  authType: AuthType;
  authDescription: string;
  credentialsHint?: {
    token?: string;
    key?: string;
    headerName?: string;
    username?: string;
    password?: string;
  };
  samplePayloadSummary: string;
  suggestedConnector: ConnectorType;
  badge: string;
  accentColor: string;
  description: string;
}

export const PRESET_SOURCES: PresetSourceDefinition[] = [
  {
    id: 'ecommerce-live-orders',
    name: 'Global Store E-Commerce Orders',
    category: 'rest_api',
    categoryLabel: 'REST / Web API',
    endpoint: '/api/mock/ecommerce-orders',
    method: 'GET',
    authType: 'none',
    authDescription: 'Public / Demonstration Endpoint (No Token Required)',
    samplePayloadSummary: '35 live customer order lines with status, item counts, amounts (USD), and delivery cities.',
    suggestedConnector: 'ecommerce_transactions',
    badge: 'E-Commerce',
    accentColor: 'emerald',
    description: 'High-frequency online storefront transactions including order fulfillment status, customer names, and geographic destinations.',
  },
  {
    id: 'support-helpdesk-tickets',
    name: 'Customer Support & Helpdesk Incidents',
    category: 'saas_app',
    categoryLabel: 'SaaS / Helpdesk',
    endpoint: '/api/mock/support-tickets',
    method: 'GET',
    authType: 'apiKey',
    authDescription: 'API Key Header Authentication (X-API-Key)',
    credentialsHint: {
      headerName: 'X-API-Key',
      key: 'live_desk_secret_token_8892',
    },
    samplePayloadSummary: '30 incident tickets with priority (Urgent/High/Medium), response time metrics, and satisfaction scores.',
    suggestedConnector: 'crm_tickets',
    badge: 'Helpdesk',
    accentColor: 'amber',
    description: 'Incident ticket backlog capturing customer emails, assigned engineers, resolution timelines, and satisfaction levels.',
  },
  {
    id: 'iot-facility-telemetry',
    name: 'Industrial Facility Environmental Telemetry',
    category: 'event_stream',
    categoryLabel: 'IoT Event Stream',
    endpoint: '/api/mock/iot-telemetry',
    method: 'GET',
    authType: 'bearer',
    authDescription: 'Bearer Token (Authorization: Bearer <token>)',
    credentialsHint: {
      token: 'iot_stream_bearer_jwt_auth_9011',
    },
    samplePayloadSummary: '40 sensor telemetry records tracking temperature (°C), humidity (%), power draw (Watts), and node operational alerts.',
    suggestedConnector: 'timeseries_telemetry',
    badge: 'IoT Sensors',
    accentColor: 'cyan',
    description: 'Continuous time-series sensor telemetry from rack nodes and warehouse chambers with hardware power metrics.',
  },
  {
    id: 'corporate-financial-ledger',
    name: 'Corporate Cashflow & Financial Ledger',
    category: 'database',
    categoryLabel: 'SQL / Ledger Warehouse',
    endpoint: '/api/mock/financial-transactions',
    method: 'GET',
    authType: 'basic',
    authDescription: 'Basic Auth (Username & Secret Passcode)',
    credentialsHint: {
      username: 'finance_readonly_svc',
      password: 'Ledger_Pass_9921_Live',
    },
    samplePayloadSummary: '30 double-entry ledger items tracking credits, vendor payouts, reference numbers, and reconciliation status.',
    suggestedConnector: 'financial_ledger',
    badge: 'Fintech',
    accentColor: 'indigo',
    description: 'Enterprise cashflow entries with counterparty entity identification, credit/debit classification, and reconciliation auditing.',
  },
  {
    id: 'public-open-meteo',
    name: 'Live Weather Telemetry API (Public Open-Meteo)',
    category: 'rest_api',
    categoryLabel: 'External OpenData REST',
    endpoint: 'https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.41&hourly=temperature_2m,relative_humidity_2m&forecast_days=2',
    method: 'GET',
    authType: 'none',
    authDescription: 'Public OpenData (Zero Credentials Required)',
    samplePayloadSummary: 'Live 48-hour hourly atmospheric readings for San Francisco coordinates.',
    suggestedConnector: 'timeseries_telemetry',
    badge: 'Public API',
    accentColor: 'sky',
    description: 'Direct internet weather endpoint delivering hourly meteorological readings with latitude/longitude coordinates.',
  },
];

export const LOCATION_CATEGORIES: Array<{
  id: DataSourceLocation;
  name: string;
  description: string;
  icon: string;
  exampleEndpoints: string[];
}> = [
  {
    id: 'rest_api',
    name: 'REST / HTTP API & Webhook',
    description: 'Any RESTful endpoint delivering JSON or paginated envelopes (GitHub, Stripe, Shopify, custom microservices).',
    icon: 'Globe',
    exampleEndpoints: ['https://api.github.com/repos/facebook/react/commits?per_page=15', '/api/mock/ecommerce-orders'],
  },
  {
    id: 'database',
    name: 'SQL Database / Data Warehouse',
    description: 'PostgreSQL, Supabase REST query, MySQL, ClickHouse, or read-only analytical endpoint.',
    icon: 'Database',
    exampleEndpoints: ['https://your-project.supabase.co/rest/v1/orders?select=*', '/api/mock/financial-transactions'],
  },
  {
    id: 'cloud_storage',
    name: 'Cloud Object Storage / URL',
    description: 'Public or authenticated S3 bucket URL, Google Cloud Storage, or raw GitHub CSV/JSON file.',
    icon: 'Cloud',
    exampleEndpoints: ['https://raw.githubusercontent.com/datasets/gdp/master/data/gdp.csv'],
  },
  {
    id: 'event_stream',
    name: 'IoT & Event Streaming',
    description: 'High-frequency telemetry, sensor feeds, PostHog, or Segment event batches.',
    icon: 'Activity',
    exampleEndpoints: ['/api/mock/iot-telemetry'],
  },
  {
    id: 'saas_app',
    name: 'SaaS & Helpdesk / CRM',
    description: 'Zendesk, HubSpot, Linear, Jira, or Notion integration endpoints.',
    icon: 'Layers',
    exampleEndpoints: ['/api/mock/support-tickets'],
  },
  {
    id: 'file_upload',
    name: 'Raw Paste / Delimited File',
    description: 'Directly paste or drop CSV, TSV, NDJSON, or JSON arrays with automatic delimiter parsing.',
    icon: 'FileText',
    exampleEndpoints: ['Paste CSV / JSON text directly'],
  },
];
