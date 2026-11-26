import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearFleetStatusCache,
  fetchStudioFleetStatus,
  generateAgentPairingKey,
  revokeAgentDevice,
  updatePrinterRole,
} from './printer-client';

describe('Printer Client Fleet Cache Eviction', () => {
  beforeEach(() => {
    clearFleetStatusCache();
  });

  it('clearFleetStatusCache invalidates the in-memory promise cache', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) });

    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    clearFleetStatusCache();

    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('generateAgentPairingKey clears fleet cache', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'SNAP-1234',
          studioId: 'std_1',
          expiresAt: '2026-11-26T00:00:00.000Z',
          status: 'active',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) });

    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);
    await generateAgentPairingKey('std_1', mockFetch as unknown as typeof fetch);
    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('updatePrinterRole clears fleet cache', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, printerId: 'prn_1', role: 'active_color' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) });

    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);
    await updatePrinterRole('std_1', 'prn_1', 'active_color', mockFetch as unknown as typeof fetch);
    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('revokeAgentDevice clears fleet cache', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, deviceId: 'dev_1', status: 'revoked' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ printers: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ devices: [] }) });

    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);
    await revokeAgentDevice('std_1', 'dev_1', mockFetch as unknown as typeof fetch);
    await fetchStudioFleetStatus('std_1', mockFetch as unknown as typeof fetch);

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });
});
