import { StudioSubscriptionRecord, SubscriptionPlanId } from '@snapprint/contracts';
import { getApiBaseUrl } from './auth-client.js';

export class SubscriptionApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'SubscriptionApiError';
  }
}

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {},
  customFetch: typeof fetch = fetch
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await customFetch(`${baseUrl}${endpoint}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    throw new SubscriptionApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new SubscriptionApiError(
      data?.message || `Request failed with status ${res.status}`,
      res.status,
      data?.code
    );
  }
  return data as T;
}

export async function fetchStudioSubscription(
  studioId: string,
  customFetch?: typeof fetch
): Promise<{ subscription: StudioSubscriptionRecord | null }> {
  return requestJson<{ subscription: StudioSubscriptionRecord | null }>(
    `/studios/${encodeURIComponent(studioId)}/subscription`,
    { method: 'GET' },
    customFetch
  );
}

export async function activateStudioTrial(
  studioId: string,
  customFetch?: typeof fetch
): Promise<{ subscription: StudioSubscriptionRecord }> {
  return requestJson<{ subscription: StudioSubscriptionRecord }>(
    `/studios/${encodeURIComponent(studioId)}/subscription/trial`,
    { method: 'POST' },
    customFetch
  );
}

export interface CreateSubscriptionOrderResponse {
  subscriptionOrderId: string;
  gatewayOrderId: string;
  amountMinor: number;
  currency: string;
  keyId: string;
  plan: SubscriptionPlanId;
  durationDays: number;
}

export async function createSubscriptionOrder(
  studioId: string,
  plan: SubscriptionPlanId,
  customFetch?: typeof fetch
): Promise<CreateSubscriptionOrderResponse> {
  return requestJson<CreateSubscriptionOrderResponse>(
    `/studios/${encodeURIComponent(studioId)}/subscription/order`,
    { method: 'POST', body: JSON.stringify({ plan }) },
    customFetch
  );
}

export async function verifySubscriptionPayment(
  studioId: string,
  payload: { gatewayOrderId: string; gatewayPaymentId: string; gatewaySignature: string },
  customFetch?: typeof fetch
): Promise<{ subscription: StudioSubscriptionRecord }> {
  return requestJson<{ subscription: StudioSubscriptionRecord }>(
    `/studios/${encodeURIComponent(studioId)}/subscription/verify`,
    { method: 'POST', body: JSON.stringify(payload) },
    customFetch
  );
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpayResponse) => Promise<void>;
}

export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
