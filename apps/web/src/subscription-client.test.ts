import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activateStudioTrial,
  createSubscriptionOrder,
  fetchStudioSubscription,
  SubscriptionApiError,
  verifySubscriptionPayment,
} from './subscription-client.js';

describe('subscription-client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches studio subscription successfully', async () => {
    const mockRes = {
      subscription: {
        studioId: 'studio-123',
        plan: 'quarterly',
        status: 'active',
        startsAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await fetchStudioSubscription('studio-123');
    expect(res.subscription?.plan).toBe('quarterly');
    expect(res.subscription?.status).toBe('active');
  });

  it('activates 30-day trial successfully', async () => {
    const mockRes = {
      subscription: {
        studioId: 'studio-123',
        plan: 'free',
        status: 'active',
        startsAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-01-31T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await activateStudioTrial('studio-123');
    expect(res.subscription.plan).toBe('free');
    expect(res.subscription.status).toBe('active');
  });

  it('creates subscription order successfully', async () => {
    const mockRes = {
      subscriptionOrderId: 'subord_123',
      gatewayOrderId: 'order_rzp_sub_123',
      amountMinor: 99900,
      currency: 'INR',
      keyId: 'rzp_test_key',
      plan: 'quarterly',
      durationDays: 90,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await createSubscriptionOrder('studio-123', 'quarterly');
    expect(res.subscriptionOrderId).toBe('subord_123');
    expect(res.gatewayOrderId).toBe('order_rzp_sub_123');
    expect(res.amountMinor).toBe(99900);
  });

  it('verifies subscription payment successfully', async () => {
    const mockRes = {
      subscription: {
        studioId: 'studio-123',
        plan: 'yearly',
        status: 'active',
        startsAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await verifySubscriptionPayment('studio-123', {
      gatewayOrderId: 'order_rzp_sub_123',
      gatewayPaymentId: 'pay_rzp_sub_456',
      gatewaySignature: 'sig_sub_789',
    });
    expect(res.subscription.plan).toBe('yearly');
    expect(res.subscription.status).toBe('active');
  });

  it('throws SubscriptionApiError on API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ code: 'TRIAL_ALREADY_USED', message: 'Trial already activated' }),
    } as Response);

    await expect(activateStudioTrial('studio-123')).rejects.toThrow(SubscriptionApiError);
  });
});
