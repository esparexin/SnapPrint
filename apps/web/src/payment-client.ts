import {
  CounterPaymentRequest,
  CounterPaymentRequestSchema,
  OrderRecord,
  OrderRecordSchema,
  PaymentHistoryResponse,
  PaymentHistoryResponseSchema,
  PaymentInitiateRequestSchema,
  PaymentInitiateResponse,
  PaymentInitiateResponseSchema,
  PaymentRecord,
  PaymentRecordSchema,
  PaymentVerifyRequest,
  PaymentVerifyRequestSchema,
} from '@snapprint/contracts';
import { getApiBaseUrl } from './auth-client.js';

const API_BASE = getApiBaseUrl();

export class PaymentApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'PaymentApiError';
  }
}

export async function initiateOnlinePayment(
  slug: string,
  orderId: string,
  token?: string
): Promise<PaymentInitiateResponse> {
  const payload = { orderId, method: 'razorpay' as const };
  PaymentInitiateRequestSchema.parse(payload);

  const url = `${API_BASE}/public/studios/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderId)}/pay/initiate`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-session-token'] = token;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PaymentApiError(
      data?.message || `Payment initiation failed with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return PaymentInitiateResponseSchema.parse(data);
}

export async function verifyOnlinePayment(
  slug: string,
  orderId: string,
  payload: PaymentVerifyRequest,
  token?: string
): Promise<PaymentRecord> {
  PaymentVerifyRequestSchema.parse(payload);

  const url = `${API_BASE}/public/studios/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderId)}/pay/verify`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-session-token'] = token;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PaymentApiError(
      data?.message || `Payment verification failed with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return PaymentRecordSchema.parse(data);
}

export async function fetchCustomerPaymentHistory(
  slug: string,
  orderId: string,
  token?: string
): Promise<PaymentHistoryResponse> {
  const url = `${API_BASE}/public/studios/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderId)}/payments`;
  const headers: Record<string, string> = {};
  if (token) headers['x-session-token'] = token;

  const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PaymentApiError(
      data?.message || `Failed to fetch payment history with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return PaymentHistoryResponseSchema.parse(data);
}

export async function recordOperatorCounterPayment(
  studioId: string,
  orderId: string,
  payload: CounterPaymentRequest
): Promise<{ payment: PaymentRecord; order: OrderRecord }> {
  CounterPaymentRequestSchema.parse(payload);

  const url = `${API_BASE}/studios/${encodeURIComponent(studioId)}/orders/${encodeURIComponent(orderId)}/payments/counter`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-studio-id': studioId },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PaymentApiError(
      data?.message || `Failed to record counter payment with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return {
    payment: PaymentRecordSchema.parse(data.payment),
    order: OrderRecordSchema.parse(data.order),
  };
}
