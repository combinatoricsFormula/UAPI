import { DataSource } from '../types/connector';
import { determineConnector, extractRecordsFromPayload, inferFieldSchema } from '../utils/schemaDetector';

const INITIAL_ECOMMERCE_DATA = [
  { order_id: 'ORD-1001', customer_name: 'Sarah Jenkins', customer_email: 'sarah.j@example.com', category: 'Electronics', amount_usd: 145.5, status: 'Delivered', shipping_city: 'Seattle', created_at: '2026-03-22T10:14:00Z', items_count: 2 },
  { order_id: 'ORD-1002', customer_name: 'David Chen', customer_email: 'david.c@example.com', category: 'Home & Kitchen', amount_usd: 64.2, status: 'Delivered', shipping_city: 'Toronto', created_at: '2026-03-23T11:30:00Z', items_count: 1 },
  { order_id: 'ORD-1003', customer_name: 'Elena Rostova', customer_email: 'elena.r@example.com', category: 'Apparel', amount_usd: 210.0, status: 'Shipped', shipping_city: 'Berlin', created_at: '2026-03-24T09:45:00Z', items_count: 3 },
  { order_id: 'ORD-1004', customer_name: 'Marcus Brody', customer_email: 'marcus.b@example.com', category: 'Footwear', amount_usd: 129.99, status: 'Processing', shipping_city: 'Austin', created_at: '2026-03-25T14:20:00Z', items_count: 1 },
  { order_id: 'ORD-1005', customer_name: 'Aoi Tanaka', customer_email: 'aoi.t@example.com', category: 'Accessories', amount_usd: 85.0, status: 'Delivered', shipping_city: 'Tokyo', created_at: '2026-03-26T16:05:00Z', items_count: 2 },
  { order_id: 'ORD-1006', customer_name: 'Sarah Jenkins', customer_email: 'sarah.j@example.com', category: 'Electronics', amount_usd: 340.0, status: 'Shipped', shipping_city: 'Seattle', created_at: '2026-03-27T08:30:00Z', items_count: 4 },
  { order_id: 'ORD-1007', customer_name: 'David Chen', customer_email: 'david.c@example.com', category: 'Accessories', amount_usd: 45.0, status: 'Refunded', shipping_city: 'Toronto', created_at: '2026-03-28T12:10:00Z', items_count: 1 },
  { order_id: 'ORD-1008', customer_name: 'Liam Vance', customer_email: 'liam.v@example.com', category: 'Electronics', amount_usd: 489.0, status: 'Delivered', shipping_city: 'London', created_at: '2026-03-29T15:45:00Z', items_count: 2 },
];

const INITIAL_SUPPORT_DATA = [
  { ticket_id: 'TCK-501', customer_email: 'sarah.j@example.com', customer_name: 'Sarah Jenkins', subject: 'Shipping delay inquiry on ORD-1006', priority: 'High', status: 'In Progress', response_time_hours: 2.4, created_at: '2026-03-27T10:00:00Z', assigned_agent: 'Agent A', satisfaction_score: 4 },
  { ticket_id: 'TCK-502', customer_email: 'david.c@example.com', customer_name: 'David Chen', subject: 'Return request for damaged packaging', priority: 'Medium', status: 'Resolved', response_time_hours: 5.1, created_at: '2026-03-28T13:00:00Z', assigned_agent: 'Agent B', satisfaction_score: 5 },
  { ticket_id: 'TCK-503', customer_email: 'elena.r@example.com', customer_name: 'Elena Rostova', subject: 'Payment 2FA authorization prompt failed', priority: 'Urgent', status: 'Open', response_time_hours: 0.8, created_at: '2026-03-29T08:20:00Z', assigned_agent: 'Agent C', satisfaction_score: 3 },
  { ticket_id: 'TCK-504', customer_email: 'marcus.b@example.com', customer_name: 'Marcus Brody', subject: 'Change delivery address request', priority: 'Medium', status: 'Resolved', response_time_hours: 3.2, created_at: '2026-03-25T15:10:00Z', assigned_agent: 'Agent A', satisfaction_score: 5 },
  { ticket_id: 'TCK-505', customer_email: 'liam.v@example.com', customer_name: 'Liam Vance', subject: 'Bulk corporate discount question', priority: 'Low', status: 'Open', response_time_hours: 8.5, created_at: '2026-03-29T16:30:00Z', assigned_agent: 'Agent D', satisfaction_score: 4 },
];

const INITIAL_IOT_DATA = [
  { telemetry_id: 'TEL-101', device_id: 'NODE-ALPHA-01', location: 'Warehouse Rack A', temperature_celsius: 21.4, relative_humidity_pct: 46.2, power_draw_watts: 135.2, operational_status: 'Nominal', timestamp: '2026-03-29T10:00:00Z', battery_level_pct: 94 },
  { telemetry_id: 'TEL-102', device_id: 'NODE-BETA-02', location: 'Server Room East', temperature_celsius: 24.8, relative_humidity_pct: 41.5, power_draw_watts: 182.0, operational_status: 'Nominal', timestamp: '2026-03-29T11:00:00Z', battery_level_pct: 91 },
  { telemetry_id: 'TEL-103', device_id: 'NODE-GAMMA-03', location: 'Assembly Floor 2', temperature_celsius: 28.6, relative_humidity_pct: 54.0, power_draw_watts: 210.5, operational_status: 'Warning', timestamp: '2026-03-29T12:00:00Z', battery_level_pct: 78 },
  { telemetry_id: 'TEL-104', device_id: 'NODE-DELTA-04', location: 'Cold Storage Unit', temperature_celsius: 4.2, relative_humidity_pct: 68.1, power_draw_watts: 95.0, operational_status: 'Nominal', timestamp: '2026-03-29T13:00:00Z', battery_level_pct: 88 },
];

export function getInitialDataSources(): DataSource[] {
  const ecomSchema = inferFieldSchema(INITIAL_ECOMMERCE_DATA);
  const supportSchema = inferFieldSchema(INITIAL_SUPPORT_DATA);
  const iotSchema = inferFieldSchema(INITIAL_IOT_DATA);

  return [
    {
      id: 'src-init-ecom',
      name: 'Global Store E-Commerce Orders',
      locationCategory: 'rest_api',
      endpoint: '/api/mock/ecommerce-orders',
      method: 'GET',
      authType: 'none',
      credentials: {},
      connectorType: 'ecommerce_transactions',
      detectedFormat: 'json_envelope',
      envelopeKey: 'data',
      schema: ecomSchema,
      records: INITIAL_ECOMMERCE_DATA,
      status: 'active',
      latencyMs: 18,
      lastSyncedAt: new Date().toISOString(),
      color: '#10B981',
      description: 'Auto-detected transactional entities, currency metrics, and order fulfillment tracking.',
    },
    {
      id: 'src-init-support',
      name: 'Customer Support & Helpdesk Incidents',
      locationCategory: 'saas_app',
      endpoint: '/api/mock/support-tickets',
      method: 'GET',
      authType: 'apiKey',
      credentials: { headerName: 'X-API-Key', key: 'live_desk_secret_token_8892' },
      connectorType: 'crm_tickets',
      detectedFormat: 'json_envelope',
      envelopeKey: 'data',
      schema: supportSchema,
      records: INITIAL_SUPPORT_DATA,
      status: 'active',
      latencyMs: 24,
      lastSyncedAt: new Date().toISOString(),
      color: '#F59E0B',
      description: 'Auto-detected incident identifiers, SLA resolution hours, and support priority levels.',
    },
    {
      id: 'src-init-iot',
      name: 'Industrial Facility Environmental Telemetry',
      locationCategory: 'event_stream',
      endpoint: '/api/mock/iot-telemetry',
      method: 'GET',
      authType: 'bearer',
      credentials: { token: 'iot_stream_bearer_jwt_auth_9011' },
      connectorType: 'timeseries_telemetry',
      detectedFormat: 'json_envelope',
      envelopeKey: 'data',
      schema: iotSchema,
      records: INITIAL_IOT_DATA,
      status: 'active',
      latencyMs: 14,
      lastSyncedAt: new Date().toISOString(),
      color: '#06B6D4',
      description: 'Auto-detected hardware telemetry IDs, environmental sensors, and operational status.',
    },
  ];
}
