import {
  CreateSubscriptionPlanRequest,
  SubscriptionNotificationRequest,
  SubscriptionPlanDefinition,
  UpdateSubscriptionPlanRequest,
} from '@snapprint/contracts';
import { getApiBaseUrl } from './auth-client.js';

const API_BASE_URL = getApiBaseUrl();

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request to ${path} failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function listPlatformSubscriptionPlans(): Promise<{
  plans: SubscriptionPlanDefinition[];
}> {
  return fetchJson<{ plans: SubscriptionPlanDefinition[] }>('/admin/plans');
}

export async function createPlatformSubscriptionPlan(
  payload: CreateSubscriptionPlanRequest
): Promise<{ plan: SubscriptionPlanDefinition }> {
  return fetchJson<{ plan: SubscriptionPlanDefinition }>('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformSubscriptionPlan(
  planId: string,
  payload: UpdateSubscriptionPlanRequest
): Promise<{ plan: SubscriptionPlanDefinition }> {
  return fetchJson<{ plan: SubscriptionPlanDefinition }>(`/admin/plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePlatformSubscriptionPlan(
  planId: string
): Promise<{ success: boolean; deletedId: string }> {
  return fetchJson<{ success: boolean; deletedId: string }>(`/admin/plans/${planId}`, {
    method: 'DELETE',
  });
}

export async function notifyStudioSubscription(
  studioId: string,
  payload?: SubscriptionNotificationRequest
): Promise<{ success: boolean; message: string }> {
  return fetchJson<{ success: boolean; message: string }>(
    `/admin/studios/${studioId}/subscription/notify`,
    {
      method: 'POST',
      body: JSON.stringify(payload || { type: 'expiry_reminder' }),
    }
  );
}
