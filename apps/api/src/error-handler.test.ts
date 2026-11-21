import { describe, expect, it } from 'vitest';
import { sanitizeLogText, sanitizePath } from './error-handler.js';

describe('Error Handler Logging Sanitization', () => {
  it('redacts MongoDB connection strings containing passwords', () => {
    const raw =
      'Connection failed: mongodb+srv://admin_user:SuperSecretPassword123@snapprint.cluster.net/snapprint?retryWrites=true';
    const sanitized = sanitizeLogText(raw);

    expect(sanitized).not.toContain('SuperSecretPassword123');
    expect(sanitized).not.toContain('admin_user');
    expect(sanitized).toContain('mongodb+srv://[REDACTED]:[REDACTED]@snapprint.cluster.net');
  });

  it('redacts Bearer tokens in error text', () => {
    const raw = 'Failed to verify Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';
    const sanitized = sanitizeLogText(raw);

    expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(sanitized).toContain('Bearer [REDACTED]');
  });

  it('redacts sensitive query parameters from logged paths', () => {
    const rawPath = '/api/callback?token=secret-token-12345&studioId=studio-alpha&key=xyz987';
    const sanitized = sanitizePath(rawPath);

    expect(sanitized).not.toContain('secret-token-12345');
    expect(sanitized).not.toContain('xyz987');
    expect(sanitized).toContain('token=[REDACTED]');
    expect(sanitized).toContain('key=[REDACTED]');
    expect(sanitized).toContain('studioId=studio-alpha');
  });

  it('leaves clean paths without query parameters unchanged', () => {
    expect(sanitizePath('/api/studio/photo-express/public')).toBe(
      '/api/studio/photo-express/public'
    );
  });
});
