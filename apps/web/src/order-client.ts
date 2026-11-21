import {
  DocumentPrintConfig,
  OrderListResponse,
  OrderListResponseSchema,
  OrderRecord,
  OrderRecordSchema,
  OrderSubmissionRequest,
  OrderStatus,
  QuoteRequestSchema,
  QuoteResponse,
  QuoteResponseSchema,
} from '@snapprint/contracts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class OrderApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OrderApiError';
  }
}

export async function requestPrintQuote(
  slug: string,
  sessionId: string,
  token: string,
  items: DocumentPrintConfig[]
): Promise<QuoteResponse> {
  QuoteRequestSchema.parse({ items });

  const url = `${API_BASE}/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/quote`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new OrderApiError(
      data?.message || `Quote calculation failed with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return QuoteResponseSchema.parse(data);
}

export async function submitPrintOrder(
  slug: string,
  sessionId: string,
  token: string,
  payload: OrderSubmissionRequest
): Promise<OrderRecord> {
  const url = `${API_BASE}/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/orders`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new OrderApiError(
      data?.message || `Order submission failed with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return OrderRecordSchema.parse(data);
}

export async function fetchOrderDetails(
  slug: string,
  sessionId: string,
  token: string,
  orderId: string
): Promise<OrderRecord> {
  const url = `${API_BASE}/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new OrderApiError(
      data?.message || `Failed to fetch order with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return OrderRecordSchema.parse(data);
}

export async function fetchOperatorOrderQueue(studioId: string): Promise<OrderListResponse> {
  const url = `${API_BASE}/studios/${encodeURIComponent(studioId)}/orders`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new OrderApiError(
      data?.message || `Failed to load order queue with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return OrderListResponseSchema.parse(data);
}

export async function updateOperatorOrderStatus(
  studioId: string,
  orderId: string,
  status: OrderStatus
): Promise<OrderRecord> {
  const url = `${API_BASE}/studios/${encodeURIComponent(studioId)}/orders/${encodeURIComponent(orderId)}/status`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new OrderApiError(
      data?.message || `Failed to update order status with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return OrderRecordSchema.parse(data);
}
