import { describe, expect, it, vi } from 'vitest';
import {
  fetchStudioDevices,
  fetchStudioPrinters,
  generateAgentPairingKey,
  getAgentDownloadUrl,
  PrinterApiError,
  revokeAgentDevice,
  updatePrinterRole,
} from './printer-client';

describe('Printer Client (apps/web)', () => {
  it('generateAgentPairingKey issues POST /studios/:id/agent/pairing-keys', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'SNAP-7X9K-2M4P',
        studioId: 'std_1',
        expiresAt: '2026-11-23T13:00:00.000Z',
        status: 'active',
      }),
    });

    const res = await generateAgentPairingKey('std_1', mockFetch as unknown as typeof fetch);
    expect(res.code).toBe('SNAP-7X9K-2M4P');
    expect(res.status).toBe('active');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/agent/pairing-keys');
    expect(init.method).toBe('POST');
  });

  it('fetchStudioPrinters issues GET /studios/:id/printers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        printers: [
          {
            id: 'prn_1',
            studioId: 'std_1',
            name: 'HP LaserJet 1020',
            driverName: 'HP Driver',
            role: 'active_bw',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            lastSeenAt: '2026-11-23T12:00:00.000Z',
          },
        ],
      }),
    });

    const res = await fetchStudioPrinters('std_1', mockFetch as unknown as typeof fetch);
    expect(res.printers).toHaveLength(1);
    expect(res.printers[0].role).toBe('active_bw');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/printers');
    expect(init.method).toBe('GET');
  });

  it('updatePrinterRole issues PATCH /studios/:id/printers/:printerId/role', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, printerId: 'prn_1', role: 'active_color' }),
    });

    const res = await updatePrinterRole(
      'std_1',
      'prn_1',
      'active_color',
      mockFetch as unknown as typeof fetch
    );
    expect(res.role).toBe('active_color');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/printers/prn_1/role');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ role: 'active_color' });
  });

  it('handles API errors by throwing PrinterApiError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }),
    });

    await expect(
      generateAgentPairingKey('std_1', mockFetch as unknown as typeof fetch)
    ).rejects.toThrow(PrinterApiError);
  });

  it('getAgentDownloadUrl returns valid MSI download endpoint', () => {
    const url = getAgentDownloadUrl();
    expect(url).toContain('/downloads/windows-agent/latest.msi');
  });

  it('fetchStudioDevices issues GET /studios/:id/devices', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        devices: [
          {
            deviceId: 'dev_1',
            studioId: 'std_1',
            hostname: 'COUNTER-PC',
            osPlatform: 'win32',
            agentVersion: '1.0.0',
            status: 'active',
            isOnline: true,
            lastHeartbeatAt: '2026-11-24T12:00:00.000Z',
            createdAt: '2026-11-24T10:00:00.000Z',
          },
        ],
      }),
    });

    const res = await fetchStudioDevices('std_1', mockFetch as unknown as typeof fetch);
    expect(res.devices).toHaveLength(1);
    expect(res.devices[0].hostname).toBe('COUNTER-PC');
    expect(res.devices[0].isOnline).toBe(true);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/devices');
    expect(init.method).toBe('GET');
  });

  it('revokeAgentDevice issues POST /studios/:id/devices/:deviceId/revoke', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, deviceId: 'dev_1', status: 'revoked' }),
    });

    const res = await revokeAgentDevice('std_1', 'dev_1', mockFetch as unknown as typeof fetch);
    expect(res.success).toBe(true);
    expect(res.status).toBe('revoked');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/devices/dev_1/revoke');
    expect(init.method).toBe('POST');
  });
});
