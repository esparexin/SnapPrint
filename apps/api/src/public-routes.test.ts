import { describe, expect, it } from 'vitest';
import { CustomerSessionResponseSchema, PublicStudioSchema } from '@snapprint/contracts';
import { createTestApp } from './auth-test-helper.js';
import { verifySessionToken } from './session-token.js';

describe('Public Studio & Customer Session Routes', () => {
  async function seedPublicStudios() {
    const ctx = await createTestApp();

    ctx.studios.push({
      id: 'studio_active_1',
      slug: 'active-studio',
      name: 'Active Photo Studio',
      status: 'active',
      settings: {
        currency: 'INR',
        contactPhone: '+919876543210',
        contactEmail: 'hello@activestudio.in',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: 'studio_suspended_1',
      slug: 'suspended-studio',
      name: 'Suspended Photo Studio',
      status: 'suspended',
      settings: {
        currency: 'INR',
        contactPhone: '+919999999999',
        maxActivePrinters: 1,
        autoApproveOrders: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: 'studio_onboarding_1',
      slug: 'onboarding-studio',
      name: 'Onboarding Studio',
      status: 'onboarding',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return ctx;
  }

  describe('GET /public/studios/:slug', () => {
    it('returns safe public studio info for active studio', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'GET',
        url: '/public/studios/active-studio',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(PublicStudioSchema.safeParse(body).success).toBe(true);
      expect(body.id).toBe('studio_active_1');
      expect(body.slug).toBe('active-studio');
      expect(body.name).toBe('Active Photo Studio');
      expect(body.status).toBe('active');
      expect(body.currency).toBe('INR');
      expect(body.contactPhone).toBe('+919876543210');
      expect(body.contactEmail).toBe('hello@activestudio.in');

      // Verify internal settings are not leaked
      expect(body.maxActivePrinters).toBeUndefined();
      expect(body.autoApproveOrders).toBeUndefined();
    });

    it('returns safe public studio info for suspended studio so UI can show status', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'GET',
        url: '/public/studios/suspended-studio',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('suspended');
      expect(body.maxActivePrinters).toBeUndefined();
    });

    it('returns 404 for unknown studio slug', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'GET',
        url: '/public/studios/nonexistent-studio',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('STUDIO_NOT_FOUND');
    });

    it('returns 400 for invalid slug format', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'GET',
        url: '/public/studios/INVALID_SLUG!',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INVALID_STUDIO_SLUG');
    });
  });

  describe('POST /public/studios/:slug/sessions', () => {
    it('creates short-lived session with signed HMAC token for active studio', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'POST',
        url: '/public/studios/active-studio/sessions',
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(CustomerSessionResponseSchema.safeParse(body).success).toBe(true);

      const { session, token } = body;
      expect(session.studioId).toBe('studio_active_1');
      expect(session.status).toBe('active');
      expect(ctx.qrSessions).toHaveLength(1);
      expect(ctx.qrSessions[0].sessionId).toBe(session.sessionId);

      // Verify token signature with test sessionSecret
      const verified = verifySessionToken(token, 'test-session-secret-at-least-32-chars-long!');
      expect(verified.sessionId).toBe(session.sessionId);
      expect(verified.studioId).toBe('studio_active_1');
    });

    it('rejects session creation for suspended studio with 403 STUDIO_NOT_ACTIVE', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'POST',
        url: '/public/studios/suspended-studio/sessions',
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('STUDIO_NOT_ACTIVE');
      expect(ctx.qrSessions).toHaveLength(0);
    });

    it('rejects session creation for onboarding studio with 403 STUDIO_NOT_ACTIVE', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'POST',
        url: '/public/studios/onboarding-studio/sessions',
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('STUDIO_NOT_ACTIVE');
      expect(ctx.qrSessions).toHaveLength(0);
    });

    it('rejects session creation for unknown studio with 404 STUDIO_NOT_FOUND', async () => {
      const ctx = await seedPublicStudios();

      const res = await ctx.app.inject({
        method: 'POST',
        url: '/public/studios/unknown-studio/sessions',
      });

      expect(res.statusCode).toBe(404);
      expect(ctx.qrSessions).toHaveLength(0);
    });

    it('ensures session isolation between repeated calls', async () => {
      const ctx = await seedPublicStudios();

      const res1 = await ctx.app.inject({
        method: 'POST',
        url: '/public/studios/active-studio/sessions',
      });
      const res2 = await ctx.app.inject({
        method: 'POST',
        url: '/public/studios/active-studio/sessions',
      });

      const body1 = JSON.parse(res1.payload);
      const body2 = JSON.parse(res2.payload);

      expect(body1.session.sessionId).not.toBe(body2.session.sessionId);
      expect(body1.token).not.toBe(body2.token);
      expect(ctx.qrSessions).toHaveLength(2);
    });
  });
});
