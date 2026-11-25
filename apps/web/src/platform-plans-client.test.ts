import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPlatformSubscriptionPlan,
  deletePlatformSubscriptionPlan,
  listPlatformSubscriptionPlans,
  notifyStudioSubscription,
  updatePlatformSubscriptionPlan,
} from './platform-plans-client.js';

describe('platform-plans-client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists subscription plans using standardized getApiBaseUrl', async () => {
    const mockPlans = [{ id: 'plan_1', name: 'Standard', durationDays: 30, priceRupees: 499 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plans: mockPlans }),
    } as unknown as Response);

    const res = await listPlatformSubscriptionPlans();
    expect(res.plans).toEqual(mockPlans);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/plans'),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('creates a subscription plan', async () => {
    const newPlan = {
      id: 'custom_annual',
      name: 'Custom Annual',
      durationDays: 365,
      priceRupees: 4999,
      category: 'paid' as const,
      intervalMonths: 12,
      isActive: true,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plan: newPlan }),
    } as unknown as Response);

    const res = await createPlatformSubscriptionPlan(newPlan);
    expect(res.plan).toEqual(newPlan);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/plans'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(newPlan) })
    );
  });

  it('updates, deletes, and notifies studio subscriptions', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: { id: 'p1', name: 'Updated' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, deletedId: 'p1' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Notification sent' }),
      } as unknown as Response);

    const updateRes = await updatePlatformSubscriptionPlan('p1', { name: 'Updated' });
    expect(updateRes.plan.name).toBe('Updated');

    const deleteRes = await deletePlatformSubscriptionPlan('p1');
    expect(deleteRes.deletedId).toBe('p1');

    const notifyRes = await notifyStudioSubscription('studio_1', { type: 'expiry_reminder' });
    expect(notifyRes.success).toBe(true);
  });

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid plan schema' }),
    } as unknown as Response);

    await expect(listPlatformSubscriptionPlans()).rejects.toThrow('Invalid plan schema');
  });
});
