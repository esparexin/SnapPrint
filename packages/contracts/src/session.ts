import { z } from 'zod';
import { StudioIdSchema } from './tenant.js';

export const QrSessionStatusSchema = z.enum(['active', 'expired', 'completed']);

export type QrSessionStatus = z.infer<typeof QrSessionStatusSchema>;

export const CustomerQrSessionSchema = z.object({
  sessionId: z.string().min(16).max(128),
  studioId: StudioIdSchema,
  status: QrSessionStatusSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type CustomerQrSession = z.infer<typeof CustomerQrSessionSchema>;

export const CreateQrSessionRequestSchema = z.object({
  studioId: StudioIdSchema,
});

export type CreateQrSessionRequest = z.infer<typeof CreateQrSessionRequestSchema>;

export const CustomerSessionResponseSchema = z.object({
  session: CustomerQrSessionSchema,
  token: z.string().min(1),
});

export type CustomerSessionResponse = z.infer<typeof CustomerSessionResponseSchema>;
