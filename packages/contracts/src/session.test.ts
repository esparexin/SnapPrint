import { describe, expect, it } from 'vitest';
import { CustomerQrSessionSchema } from './session.js';

describe('Session Contracts', () => {
  it('validates a valid customer QR session', () => {
    const session = {
      sessionId: 'sess_1234567890abcdef123456',
      studioId: 'std_koramangala',
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7200000).toISOString(),
    };
    expect(CustomerQrSessionSchema.safeParse(session).success).toBe(true);
  });

  it('rejects session with invalid short sessionId', () => {
    const session = {
      sessionId: 'short_id',
      studioId: 'std_koramangala',
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };
    expect(CustomerQrSessionSchema.safeParse(session).success).toBe(false);
  });
});
