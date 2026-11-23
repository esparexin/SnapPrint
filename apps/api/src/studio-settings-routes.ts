import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { UpdateShopProfileRequestSchema, z } from '@snapprint/contracts';
import { validateSlugSanity } from '@snapprint/domain';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import {
  updateStudioOnboardingProfile,
  updateStudioRazorpayVerification,
} from './repositories/studio-onboarding.repository.js';
import { findStudioBySlug } from './repositories/studio.repository.js';

export interface StudioSettingsRouteOptions {
  db?: Db;
  config?: AppConfig;
}

const VerifyRazorpayBodySchema = z.object({
  keyId: z.string().trim().min(1),
  keySecret: z.string().trim().min(1),
});

export const studioSettingsRoutes: FastifyPluginAsync<StudioSettingsRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const config = opts?.config ?? loadConfig();

  // PATCH /studios/:studioId - Update profile, capabilities, or payment preferences
  app.patch(
    '/studios/:studioId',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };
      const parsed = UpdateShopProfileRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }

      if (parsed.data.slug) {
        const slugCheck = validateSlugSanity(parsed.data.slug);
        if (!slugCheck.valid) {
          return reply.status(400).send({
            statusCode: 400,
            code: 'INVALID_SLUG',
            message: slugCheck.reason,
          });
        }
        const existing = await findStudioBySlug(db, parsed.data.slug);
        if (existing && existing.id !== studioId) {
          return reply.status(409).send({
            statusCode: 409,
            code: 'SLUG_ALREADY_EXISTS',
            message: `Studio slug '${parsed.data.slug}' is already in use by another shop.`,
          });
        }
      }

      const updated = await updateStudioOnboardingProfile(db, studioId, parsed.data);
      if (!updated) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'STUDIO_NOT_FOUND',
          message: 'Studio not found.',
        });
      }

      return reply.status(200).send(updated);
    }
  );

  // POST /studios/:studioId/verify-razorpay - Verification handshake with Razorpay
  app.post(
    '/studios/:studioId/verify-razorpay',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };
      const parsed = VerifyRazorpayBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Both keyId and keySecret are required for gateway verification.',
        });
      }

      const { keyId, keySecret } = parsed.data;
      let isVerified = false;

      // In development/test with test credentials, simulate verification
      const isTestCredential = keyId.startsWith('rzp_test_');
      if (config.nodeEnv !== 'production' && isTestCredential) {
        isVerified = keySecret.length >= 8;
      } else {
        // Production or live credential mode: verify against Razorpay API
        try {
          const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
            method: 'GET',
            headers: { Authorization: `Basic ${auth}` },
          });
          isVerified = res.ok;
        } catch {
          isVerified = false;
        }
      }

      if (!isVerified) {
        await updateStudioRazorpayVerification(db, studioId, false);
        return reply.status(400).send({
          statusCode: 400,
          code: 'RAZORPAY_VERIFICATION_FAILED',
          message: 'Failed to verify Razorpay credentials. Please check keyId and keySecret.',
          isConfirmed: false,
        });
      }

      await updateStudioRazorpayVerification(db, studioId, true, keyId);
      return reply.status(200).send({
        isConfirmed: true,
        message: 'Razorpay credentials verified successfully. Online payments are now enabled.',
      });
    }
  );
};
