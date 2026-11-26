import { describe, expect, it, vi } from 'vitest';
import {
  confirmPrinterCapability,
  createCustomPaperSize,
  deleteCustomPaperSize,
  fetchStudioPaperSizes,
  unbindAgentDevice,
} from './printer-capability-client.js';

describe('Printer Capability Client (apps/web)', () => {
  const studioId = 'std_test_client';

  it('confirmPrinterCapability sends PATCH request with duplex payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        printerId: 'prn_1',
        duplexSupport: 'supported',
        capabilityProvenance: 'manual_verified',
      }),
    });

    const res = await confirmPrinterCapability(
      studioId,
      'prn_1',
      { duplexSupport: 'supported' },
      mockFetch as unknown as typeof fetch
    );

    expect(res.success).toBe(true);
    expect(res.duplexSupport).toBe('supported');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/studios/std_test_client/printers/prn_1/capabilities/confirm'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('unbindAgentDevice sends POST request to unbind endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        deviceId: 'dev_laptop',
        status: 'unbound',
      }),
    });

    const res = await unbindAgentDevice(
      studioId,
      'dev_laptop',
      'Migrating to new desktop',
      mockFetch as unknown as typeof fetch
    );

    expect(res.success).toBe(true);
    expect(res.status).toBe('unbound');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/studios/std_test_client/devices/dev_laptop/unbind'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('fetchStudioPaperSizes sends GET request and returns catalogue and custom sizes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        standard: [
          {
            id: 'A4',
            name: 'A4 Document',
            widthMm: 210,
            heightMm: 297,
            widthIn: 8.27,
            heightIn: 11.69,
          },
        ],
        custom: [],
      }),
    });

    const res = await fetchStudioPaperSizes(
      studioId,
      undefined,
      mockFetch as unknown as typeof fetch
    );
    expect(res.standard).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/studios/std_test_client/paper-sizes'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('createCustomPaperSize and deleteCustomPaperSize interact with paper-sizes API', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'cps_123',
          name: '12x18 Poster',
          width: 12,
          height: 18,
          unit: 'in',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'cps_123' }),
      });

    const created = await createCustomPaperSize(
      studioId,
      { printerId: 'prn_1', name: '12x18 Poster', width: 12, height: 18, unit: 'in' },
      mockFetch as unknown as typeof fetch
    );
    expect(created.id).toBe('cps_123');

    const deleted = await deleteCustomPaperSize(
      studioId,
      'cps_123',
      mockFetch as unknown as typeof fetch
    );
    expect(deleted.success).toBe(true);
  });
});
