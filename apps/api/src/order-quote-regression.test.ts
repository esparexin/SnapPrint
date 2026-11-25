import { describe, expect, it } from 'vitest';
import { createTestApp } from './auth-test-helper.js';
import { signSessionToken } from './session-token.js';

describe('Quote Regression: PDF Null Dimensions, Deleted Assets & Ownership', () => {
  async function seedQuoteContext() {
    const ctx = await createTestApp();
    const studioId = 'studio_vikram';
    const slug = 'vikram-mobiles';
    const sessionId = 'sess_quote_1234567890abcdef';
    const secret = 'test-session-secret-at-least-32-chars-long!';
    const expiresAt = new Date(Date.now() + 7200000).toISOString();

    ctx.studios.push({
      id: studioId,
      slug,
      name: 'Vikram Mobiles',
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
    return { ctx, studioId, slug, sessionId, token };
  }

  it('quotes PDFs persisted with MongoDB BSON null dimensions alongside image assets', async () => {
    const { ctx, studioId, slug, sessionId, token } = await seedQuoteContext();
    const pdfId = 'asset_pdf_null_dims_12345';
    const pngId = 'asset_png_valid_dims_12345';

    // Simulate legacy MongoDB BSON null fields on PDF asset (original 400 VALIDATION_ERROR cause)
    await ctx.db.collection('photo_assets').insertOne({
      assetId: pdfId,
      studioId,
      sessionId,
      originalFilename: 'contract.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 4096,
      widthPx: null,
      heightPx: null,
      pageCount: 3,
      storageKey: `studios/${studioId}/sessions/${sessionId}/${pdfId}/contract.pdf`,
      createdAt: new Date(),
    });
    await ctx.db.collection('photo_assets').insertOne({
      assetId: pngId,
      studioId,
      sessionId,
      originalFilename: 'photo.png',
      mimeType: 'image/png',
      fileSizeBytes: 2048,
      widthPx: 1200,
      heightPx: 900,
      pageCount: 1,
      storageKey: `studios/${studioId}/sessions/${sessionId}/${pngId}/photo.png`,
      createdAt: new Date(),
    });

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        items: [
          { assetId: pdfId, colorMode: 'black_and_white', copies: 1 },
          { assetId: pngId, colorMode: 'color', copies: 2 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const quote = JSON.parse(res.payload);
    expect(quote.items).toHaveLength(2);
    expect(quote.items[0].documentPageCount).toBe(3);
    expect(quote.items[1].documentPageCount).toBe(1);
    expect(quote.totalSheets).toBe(5);
    expect(quote.totalAmountMinor).toBe(3 * 200 + 2 * 1000);
  });

  it('rejects deleted, invalid, or cross-tenant assets and falls back when printRates is empty', async () => {
    const { ctx, studioId, slug, sessionId, token } = await seedQuoteContext();
    const pdfId = 'asset_pdf_valid_quote_1234';
    await ctx.db.collection('photo_assets').insertOne({
      assetId: pdfId,
      studioId,
      sessionId,
      originalFilename: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      widthPx: null,
      heightPx: null,
      pageCount: 2,
      storageKey: `studios/${studioId}/sessions/${sessionId}/${pdfId}/doc.pdf`,
      createdAt: new Date(),
    });

    // Empty printRates falls back to default rates
    ctx.studios[0].settings.printRates = {};
    const okRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [{ assetId: pdfId }] },
    });
    expect(okRes.statusCode).toBe(200);

    // Deleted / missing asset -> 404 ASSET_NOT_FOUND
    const delRes = await ctx.app.inject({
      method: 'DELETE',
      url: `/public/studios/${slug}/sessions/${sessionId}/assets/${pdfId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(delRes.statusCode).toBe(200);

    const staleRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [{ assetId: pdfId }] },
    });
    expect(staleRes.statusCode).toBe(404);
    expect(JSON.parse(staleRes.payload).code).toBe('ASSET_NOT_FOUND');

    // Cross-session token mismatch -> 403 SESSION_MISMATCH
    const mismatchRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/sess_other_1234567890/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [{ assetId: pdfId }] },
    });
    expect(mismatchRes.statusCode).toBe(403);
    expect(JSON.parse(mismatchRes.payload).code).toBe('SESSION_MISMATCH');

    // Asset owned by another studio -> 404 ASSET_NOT_FOUND
    await ctx.db.collection('photo_assets').insertOne({
      assetId: 'asset_other_studio_12345',
      studioId: 'studio_other',
      sessionId,
      originalFilename: 'other.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 512,
      pageCount: 1,
      storageKey: 'studios/studio_other/other.pdf',
      createdAt: new Date(),
    });
    const crossTenantRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [{ assetId: 'asset_other_studio_12345' }] },
    });
    expect(crossTenantRes.statusCode).toBe(404);
  });
});
