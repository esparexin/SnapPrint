import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Subscription Routes & Webhook Renewal (apps/api)', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_sub_owner';
    const studioId = 'studio_sub_test';

    ctx.users.push({
      id: userId,
      email: 'sub_owner@example.com',
      name: 'Sub Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'sub-prints',
      name: 'Sub Prints',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId,
      studioId,
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'sub_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0]!;

    return { ctx, studioId, cookies: { [cookie.name]: cookie.value } };
  }

  it('retrieves null subscription initially and activates 30-day free trial', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    const getRes1 = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/subscription`,
      cookies,
    });
    expect(getRes1.statusCode).toBe(200);
    expect(getRes1.json().subscription).toBeNull();

    const trialRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/trial`,
      cookies,
    });
    expect(trialRes.statusCode).toBe(201);
    const sub = trialRes.json().subscription;
    expect(sub.plan).toBe('free');
    expect(sub.status).toBe('active');

    const starts = new Date(sub.startsAt).getTime();
    const expires = new Date(sub.expiresAt).getTime();
    expect(expires - starts).toBe(30 * 86_400_000);

    const dupRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/trial`,
      cookies,
    });
    expect(dupRes.statusCode).toBe(400);
    expect(dupRes.json().code).toBe('TRIAL_ALREADY_USED');
  });

  it('rejects purchasing free plan and creates paid subscription order', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    const freeOrderRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/order`,
      cookies,
      payload: { plan: 'free' },
    });
    expect(freeOrderRes.statusCode).toBe(400);
    expect(freeOrderRes.json().code).toBe('INVALID_PLAN');

    const paidOrderRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/order`,
      cookies,
      payload: { plan: 'quarterly' },
    });
    expect(paidOrderRes.statusCode).toBe(201);
    const body = paidOrderRes.json();
    expect(body.plan).toBe('quarterly');
    expect(body.durationDays).toBe(90);
    expect(body.amountMinor).toBe(99900);
    expect(body.gatewayOrderId).toBeDefined();
  });

  it('verifies payment signature and renews subscription', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    const orderRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/order`,
      cookies,
      payload: { plan: 'half_yearly' },
    });
    const { gatewayOrderId } = orderRes.json();

    const invalidSigRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/verify`,
      cookies,
      payload: {
        gatewayOrderId,
        gatewayPaymentId: 'pay_rzp_test_123',
        gatewaySignature: 'mock_invalid_sig',
      },
    });
    expect(invalidSigRes.statusCode).toBe(400);
    expect(invalidSigRes.json().code).toBe('INVALID_PAYMENT_SIGNATURE');

    const validSigRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/verify`,
      cookies,
      payload: {
        gatewayOrderId,
        gatewayPaymentId: 'pay_rzp_test_123',
        gatewaySignature: 'mock_valid_sig',
      },
    });
    expect(validSigRes.statusCode).toBe(200);
    const verified = validSigRes.json();
    expect(verified.success).toBe(true);
    expect(verified.subscription.plan).toBe('half_yearly');
    expect(verified.subscription.status).toBe('active');
  });

  it('processes subscription renewal via Razorpay webhook', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    const orderRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/subscription/order`,
      cookies,
      payload: { plan: 'yearly' },
    });
    const { gatewayOrderId } = orderRes.json();

    const webhookSecret = 'mock_webhook_secret';
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: 'evt_sub_wh_001',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_sub_captured_001',
            order_id: gatewayOrderId,
            status: 'captured',
            created_at: nowSec,
          },
        },
      },
    });

    const sig = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    const whRes = await ctx.app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: { 'x-razorpay-signature': sig, 'content-type': 'application/json' },
      payload,
    });

    expect(whRes.statusCode).toBe(200);
    expect(whRes.json().received).toBe(true);

    const getRes = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/subscription`,
      cookies,
    });
    expect(getRes.statusCode).toBe(200);
    const sub = getRes.json().subscription;
    expect(sub.plan).toBe('yearly');
    expect(sub.status).toBe('active');
  });
});
