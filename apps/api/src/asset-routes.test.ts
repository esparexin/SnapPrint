import { describe, expect, it } from 'vitest';
import { createTestApp } from './auth-test-helper.js';
import { signSessionToken } from './session-token.js';

function buildMultipart(filename: string, contentType: string, content: Buffer) {
  const boundary = '----SnapPrintBoundary' + Math.random().toString(36).substring(2);
  const prefix = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
  const suffix = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(prefix), content, Buffer.from(suffix)]);
  return {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: body,
  };
}

describe('Secure Document & Photo Upload Lifecycle', () => {
  async function seedTestSession() {
    const ctx = await createTestApp();
    const studioId = 'studio_alpha';
    const slug = 'alpha-studio';
    const sessionId = 'sess_valid_1234567890abcdef';
    const secret = 'test-session-secret-at-least-32-chars-long!';
    const expiresAt = new Date(Date.now() + 7200000).toISOString();

    ctx.studios.push({
      id: studioId,
      slug,
      name: 'Alpha Studio',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.qrSessions.push({
      sessionId,
      studioId,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
    });

    const token = signSessionToken({ sessionId, studioId, expiresAt }, secret);
    return { ctx, studioId, slug, sessionId, token, expiresAt };
  }

  it('completes upload intent handshake with private storage key', async () => {
    const { ctx, slug, sessionId, token } = await seedTestSession();

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/assets/intent`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'document.pdf', fileSizeBytes: 1024, mimeType: 'application/pdf' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.assetId).toBeDefined();
    expect(body.storageKey).toContain(`studios/studio_alpha/sessions/${sessionId}/`);
    expect(body.uploadUrl).toContain(`/public/studios/${slug}/sessions/${sessionId}/assets/upload`);
  });

  it('rejects intent on cross-tenant or mismatched session', async () => {
    const { ctx, slug, token } = await seedTestSession();

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/sess_tampered_id/assets/intent`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'photo.jpg', fileSizeBytes: 1024, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('SESSION_MISMATCH');
  });

  it('rejects intent without session token with 401', async () => {
    const { ctx, slug, sessionId } = await seedTestSession();

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/assets/intent`,
      payload: { filename: 'photo.jpg', fileSizeBytes: 1024, mimeType: 'image/jpeg' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('MISSING_SESSION_TOKEN');
  });

  it('uploads valid PDF document, extracts page count and stores privately', async () => {
    const { ctx, slug, sessionId, token } = await seedTestSession();

    const pdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Pages /Count 5 /Kids [] >>\nendobj\ntrailer\n%%EOF'
    );
    const multipart = buildMultipart('invoice.pdf', 'application/pdf', pdfContent);

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/assets/upload`,
      headers: { authorization: `Bearer ${token}`, ...multipart.headers },
      payload: multipart.payload,
    });

    expect(res.statusCode).toBe(201);
    const asset = JSON.parse(res.payload);
    expect(asset.originalFilename).toBe('invoice.pdf');
    expect(asset.mimeType).toBe('application/pdf');
    expect(asset.pageCount).toBe(5);
    expect(ctx.photoAssets).toHaveLength(1);
  });

  it('rejects spoofed MIME type and malicious executable payloads', async () => {
    const { ctx, slug, sessionId, token } = await seedTestSession();

    const fakeExe = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00malicious_binary');
    const multipart = buildMultipart('trojan.png', 'image/png', fakeExe);

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/assets/upload`,
      headers: { authorization: `Bearer ${token}`, ...multipart.headers },
      payload: multipart.payload,
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('INVALID_FILE_SIGNATURE');
    expect(ctx.photoAssets).toHaveLength(0);
  });
});
