import { describe, expect, it } from 'vitest';
import {
  InvalidSessionTokenError,
  SessionExpiredError,
  resolveSessionIdFromHeader,
  signSessionToken,
  verifySessionToken,
} from './session-token.js';

describe('Customer QR Session Tokens', () => {
  const secret = 'super-secret-key-that-has-sufficient-length-for-hmac-sha256!';
  const validPayload = {
    sessionId: 'session_abcdef1234567890',
    studioId: 'studio_alpha',
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  it('signs and verifies a valid session token', () => {
    const token = signSessionToken(validPayload, secret);
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verified = verifySessionToken(token, secret);
    expect(verified.sessionId).toBe(validPayload.sessionId);
    expect(verified.studioId).toBe(validPayload.studioId);
    expect(verified.expiresAt).toBe(validPayload.expiresAt);
  });

  it('rejects tampered signature', () => {
    const token = signSessionToken(validPayload, secret);
    const [payloadB64] = token.split('.');
    const tamperedToken = `${payloadB64}.tamperedSignature`;

    expect(() => verifySessionToken(tamperedToken, secret)).toThrow(InvalidSessionTokenError);
  });

  it('rejects token signed with wrong secret', () => {
    const token = signSessionToken(validPayload, secret);
    const wrongSecret = 'different-secret-key-which-should-fail-verification!';

    expect(() => verifySessionToken(token, wrongSecret)).toThrow(InvalidSessionTokenError);
  });

  it('rejects expired session token', () => {
    const expiredPayload = {
      sessionId: 'session_abcdef1234567890',
      studioId: 'studio_alpha',
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min in past
    };
    const token = signSessionToken(expiredPayload, secret);

    expect(() => verifySessionToken(token, secret)).toThrow(SessionExpiredError);
  });

  it('rejects malformed token strings', () => {
    expect(() => verifySessionToken('invalid-token-without-dot', secret)).toThrow(
      InvalidSessionTokenError
    );
    expect(() => verifySessionToken('', secret)).toThrow(InvalidSessionTokenError);
  });

  describe('resolveSessionIdFromHeader', () => {
    it('returns null for empty or undefined headers', () => {
      expect(resolveSessionIdFromHeader(undefined, secret)).toBeNull();
      expect(resolveSessionIdFromHeader('', secret)).toBeNull();
      expect(resolveSessionIdFromHeader('   ', secret)).toBeNull();
    });

    it('returns raw session string when un-dotted (test harness compatibility)', () => {
      expect(resolveSessionIdFromHeader('raw-session-uuid-1234', secret)).toBe(
        'raw-session-uuid-1234'
      );
    });

    it('resolves sessionId from signed token in x-session-token or Bearer format', () => {
      const token = signSessionToken(validPayload, secret);
      expect(resolveSessionIdFromHeader(token, secret, validPayload.studioId)).toBe(
        validPayload.sessionId
      );
      expect(resolveSessionIdFromHeader(`Bearer ${token}`, secret, validPayload.studioId)).toBe(
        validPayload.sessionId
      );
    });

    it('returns null when studioId mismatches in expectedStudioId check', () => {
      const token = signSessionToken(validPayload, secret);
      expect(resolveSessionIdFromHeader(token, secret, 'different_studio')).toBeNull();
    });

    it('returns null for tampered or expired signed tokens', () => {
      const token = signSessionToken(validPayload, secret);
      expect(resolveSessionIdFromHeader(`${token}tampered`, secret)).toBeNull();

      const expiredToken = signSessionToken(
        { ...validPayload, expiresAt: new Date(Date.now() - 60000).toISOString() },
        secret
      );
      expect(resolveSessionIdFromHeader(expiredToken, secret)).toBeNull();
    });
  });
});
