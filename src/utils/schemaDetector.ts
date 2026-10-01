import { ConnectorType, FieldSchema, FieldType } from '../types/connector';

// Safe date check
function isIsoDateString(val: string): boolean {
  if (typeof val !== 'string' || val.length < 8) return false;
  // Match YYYY-MM-DD or ISO 8601 strings
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
  if (!dateRegex.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

// Safe email check
function isEmailString(val: string): boolean {
  return typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

// Safe URL check
function isUrlString(val: string): boolean {
  return typeof val === 'string' && /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(val);
}

// CSV/TSV parser
export function parseDelimitedText(text: string): { records: Record<string, unknown>[]; delimiter: string } {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { records: [], delimiter: ',' };

  // Determine delimiter: comma, tab, or semicolon
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';
  else if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';

  // Basic CSV line splitter respecting quotes
  function splitRow(rowText: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  }

  const headers = splitRow(lines[0]);
  const records: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i]);
    if (values.length === headers.length || values.length > 1) {
      const record: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        let rawVal = values[idx] ?? '';
        // Try parsing number or boolean
        if (rawVal.toLowerCase() === 'true') record[header] = true;
        else if (rawVal.toLowerCase() === 'false') record[header] = false;
        else if (!isNaN(Number(rawVal)) && rawVal.trim() !== '') record[header] = Number(rawVal);
        else record[header] = rawVal;
      });
      records.push(record);
    }
  }

  return { records, delimiter };
}

// Parse NDJSON (Newline Delimited JSON)
export function parseNdJson(text: string): Record<string, unknown>[] {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  const records: Record<string, unknown>[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object') {
        records.push(parsed);
      }
    } catch {
      // ignore invalid line
    }
  }
  return records;
}

// Extract tabular records from arbitrary JSON payload
export function extractRecordsFromPayload(raw: unknown): {
  records: Record<string, unknown>[];
  detectedFormat: 'json_array' | 'json_envelope' | 'csv' | 'tsv' | 'ndjson' | 'json_object';
  envelopeKey?: string;
} {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // Test if JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractRecordsFromPayload(parsed);
      } catch {
        // Not standard JSON, test NDJSON or Delimited
      }
    }

    if (trimmed.includes('\n') && (trimmed.includes(',') || trimmed.includes('\t') || trimmed.includes(';'))) {
      const { records, delimiter } = parseDelimitedText(trimmed);
      return {
        records,
        detectedFormat: delimiter === '\t' ? 'tsv' : 'csv',
      };
    }

    const ndjson = parseNdJson(trimmed);
    if (ndjson.length > 0) {
      return { records: ndjson, detectedFormat: 'ndjson' };
    }
  }

  // Already array of objects
  if (Array.isArray(raw)) {
    const records = raw.map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        return item as Record<string, unknown>;
      }
      return { id: idx + 1, value: item };
    });
    return { records, detectedFormat: 'json_array' };
  }

  // Object with potential envelopes (e.g. data, items, results, records, orders, etc.)
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const candidateKeys = [
      'data',
      'items',
      'results',
      'records',
      'orders',
      'tickets',
      'telemetry',
      'transactions',
      'rows',
      'entries',
      'features',
      'values',
    ];

    for (const key of candidateKeys) {
      if (Array.isArray(obj[key])) {
        return {
          records: obj[key] as Record<string, unknown>[],
          detectedFormat: 'json_envelope',
          envelopeKey: key,
        };
      }
    }

    // Check if any value is an array
    for (const [key, val] of Object.entries(obj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return {
          records: val as Record<string, unknown>[],
          detectedFormat: 'json_envelope',
          envelopeKey: key,
        };
      }
    }

    // Single object row fallback
    return {
      records: [obj],
      detectedFormat: 'json_object',
    };
  }

  return { records: [], detectedFormat: 'json_array' };
}

// Schema and data type inference engine
export function inferFieldSchema(records: Record<string, unknown>[]): FieldSchema[] {
  if (!records || records.length === 0) return [];

  // Collect all unique field keys across records
  const fieldKeySet = new Set<string>();
  records.slice(0, 50).forEach(r => {
    if (r && typeof r === 'object') {
      Object.keys(r).forEach(k => fieldKeySet.add(k));
    }
  });

  const fields = Array.from(fieldKeySet);
  const sampleCount = Math.min(records.length, 100);

  return fields.map(fieldName => {
    let nullCount = 0;
    const values: unknown[] = [];
    const lowerName = fieldName.toLowerCase();

    for (let i = 0; i < sampleCount; i++) {
      const val = records[i]?.[fieldName];
      if (val === undefined || val === null || val === '') {
        nullCount++;
      } else {
        values.push(val);
      }
    }

    const distinctValues = new Set(values.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))));
    const sampleValue = values[0] ?? null;

    // Detect type
    let detectedType: FieldType = 'string';

    const nonNullCount = values.length;
    if (nonNullCount === 0) {
      detectedType = 'string';
    } else {
      const numberMatches = values.filter(v => typeof v === 'number' || (!isNaN(Number(v)) && typeof v === 'string' && v.trim() !== '')).length;
      const booleanMatches = values.filter(v => typeof v === 'boolean' || v === 'true' || v === 'false').length;
      const dateMatches = values.filter(v => typeof v === 'string' && isIsoDateString(v)).length;
      const emailMatches = values.filter(v => typeof v === 'string' && isEmailString(v)).length;
      const urlMatches = values.filter(v => typeof v === 'string' && isUrlString(v)).length;
      const isGeo = (lowerName.includes('lat') || lowerName.includes('lng') || lowerName.includes('lon') || lowerName.includes('coord')) && numberMatches > nonNullCount * 0.8;

      if (isGeo) {
        detectedType = 'geo';
      } else if (dateMatches >= nonNullCount * 0.7 || lowerName.includes('date') || lowerName.includes('timestamp') || lowerName.endsWith('_at')) {
        detectedType = 'datetime';
      } else if (emailMatches >= nonNullCount * 0.7 || lowerName.includes('email')) {
        detectedType = 'email';
      } else if (urlMatches >= nonNullCount * 0.7 || lowerName.includes('url') || lowerName.includes('link')) {
        detectedType = 'url';
      } else if (booleanMatches >= nonNullCount * 0.8 || lowerName.startsWith('is_') || lowerName.startsWith('has_')) {
        detectedType = 'boolean';
      } else if (numberMatches >= nonNullCount * 0.8) {
        const isMoney = lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('revenue') || lowerName.includes('cost') || lowerName.includes('balance') || lowerName.includes('usd') || lowerName.includes('total');
        detectedType = isMoney ? 'currency' : 'number';
      } else if (distinctValues.size <= 8 && distinctValues.size > 1 && nonNullCount >= 5) {
        detectedType = 'status';
      } else if (typeof sampleValue === 'object') {
        detectedType = Array.isArray(sampleValue) ? 'array' : 'object';
      } else {
        detectedType = 'string';
      }
    }

    const isPrimaryKey = lowerName === 'id' || lowerName.endsWith('_id') || lowerName === 'uuid' || lowerName === 'key';
    const isTimestamp = detectedType === 'datetime' || lowerName.includes('time') || lowerName.includes('date') || lowerName.endsWith('_at');
    const isMetric = detectedType === 'number' || detectedType === 'currency';

    return {
      name: fieldName,
      type: detectedType,
      sampleValue,
      nullCount,
      distinctCount: distinctValues.size,
      isPrimaryKey,
      isTimestamp,
      isMetric,
    };
  });
}

// Connector Recommender based on Schema and Endpoints
export function determineConnector(
  endpoint: string,
  schema: FieldSchema[],
  detectedFormat: string
): {
  connectorType: ConnectorType;
  rationale: string;
  badgeName: string;
  color: string;
} {
  const fieldNames = schema.map(s => s.name.toLowerCase());
  const endpointLower = endpoint.toLowerCase();

  // E-commerce pattern
  const isEcom =
    fieldNames.some(f => f.includes('order') || f.includes('product') || f.includes('cart') || f.includes('shipping')) ||
    (fieldNames.some(f => f.includes('amount') || f.includes('price')) && fieldNames.some(f => f.includes('customer') || f.includes('item'))) ||
    endpointLower.includes('order') ||
    endpointLower.includes('store') ||
    endpointLower.includes('shop');

  if (isEcom) {
    return {
      connectorType: 'ecommerce_transactions',
      rationale: 'Detected transactional entities, customer references, currency metrics, and fulfillment statuses.',
      badgeName: 'E-Commerce Transactions Connector',
      color: 'emerald',
    };
  }

  // CRM / Support tickets pattern
  const isCrm =
    fieldNames.some(f => f.includes('ticket') || f.includes('incident') || f.includes('issue')) ||
    (fieldNames.some(f => f.includes('priority')) && fieldNames.some(f => f.includes('status'))) ||
    endpointLower.includes('ticket') ||
    endpointLower.includes('support') ||
    endpointLower.includes('helpdesk');

  if (isCrm) {
    return {
      connectorType: 'crm_tickets',
      rationale: 'Detected incident identifiers, service priority levels, resolution times, and escalation statuses.',
      badgeName: 'Helpdesk & Incident Connector',
      color: 'amber',
    };
  }

  // IoT / Telemetry pattern
  const isTelemetry =
    fieldNames.some(f => f.includes('sensor') || f.includes('temperature') || f.includes('humidity') || f.includes('watts') || f.includes('telemetry') || f.includes('device_id')) ||
    endpointLower.includes('telemetry') ||
    endpointLower.includes('iot') ||
    endpointLower.includes('sensor') ||
    endpointLower.includes('meteo') ||
    endpointLower.includes('weather');

  if (isTelemetry) {
    return {
      connectorType: 'timeseries_telemetry',
      rationale: 'Detected high-frequency numeric readings, sensor hardware telemetry IDs, and temporal logs.',
      badgeName: 'Timeseries Telemetry Connector',
      color: 'cyan',
    };
  }

  // Financial Ledger pattern
  const isFinance =
    fieldNames.some(f => f.includes('transaction') || f.includes('ledger') || f.includes('debit') || f.includes('credit') || f.includes('reconciled')) ||
    endpointLower.includes('finance') ||
    endpointLower.includes('stripe') ||
    endpointLower.includes('bank') ||
    endpointLower.includes('ledger');

  if (isFinance) {
    return {
      connectorType: 'financial_ledger',
      rationale: 'Detected accounting transaction lines, reference codes, entity ledgers, and reconciliation flags.',
      badgeName: 'Financial Ledger Connector',
      color: 'indigo',
    };
  }

  // Tabular delimited
  if (detectedFormat === 'csv' || detectedFormat === 'tsv') {
    return {
      connectorType: 'tabular_delimited',
      rationale: 'Detected structured flat delimiter stream with auto-parsed headers and typed columns.',
      badgeName: 'Delimited Flat-File Connector',
      color: 'violet',
    };
  }

  // Default REST API
  return {
    connectorType: 'rest_envelope',
    rationale: 'Detected standard RESTful HTTP endpoint with structured JSON payload envelope.',
    badgeName: 'REST API Envelope Connector',
    color: 'blue',
  };
}
