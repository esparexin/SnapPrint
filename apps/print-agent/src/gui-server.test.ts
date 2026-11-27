import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentClient } from './agent-client.js';
import { saveAgentConfig } from './config.js';
import { startGuiServer } from './gui-server.js';
import { DiscoveredPrinter, SpoolerAdapter } from './spooler-adapter.js';

interface StateResponse {
  apiUrl: string;
  isEnrolled: boolean;
  printers?: DiscoveredPrinter[];
  studioId?: string;
}
interface PairResponse {
  success: boolean;
  studioId?: string;
}
interface UnpairResponse {
  success: boolean;
}

describe('GUI Local Server & Endpoints', () => {
  const testConfigPath = join(tmpdir(), `snapprint-gui-test-${Date.now()}.json`);
  let mockPrinters: DiscoveredPrinter[];
  let mockSpooler: SpoolerAdapter;
  let mockClient: AgentClient;

  beforeEach(() => {
    saveAgentConfig({ apiUrl: 'https://snapprint.onrender.com' }, testConfigPath);
    mockPrinters = [
      {
        name: 'Epson L3150 Series',
        driverName: 'EPSON L3150',
        isColorSupported: true,
        supportedPaperSizes: ['A4'],
        isDefault: true,
      },
    ];
    mockSpooler = {
      getPrinters: vi.fn().mockResolvedValue(mockPrinters),
      printFile: vi.fn().mockResolvedValue(undefined),
    };
    mockClient = {
      enroll: vi.fn().mockResolvedValue({
        deviceToken: 'tok_test123',
        studioId: 'std_test456',
        deviceId: 'dev_test789',
      }),
      syncPrinters: vi.fn().mockResolvedValue({ count: 1 }),
      sendHeartbeat: vi.fn().mockResolvedValue(true),
      pollPendingJobs: vi.fn().mockResolvedValue([]),
    } as unknown as AgentClient;
  });

  it('GET / serves the standalone HTML dashboard', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const res = await fetch(`${handle.url}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const html = await res.text();
      expect(html).toContain('SnapPrint Print Agent');
      expect(html).toContain('Studio Connection');
      expect(html).toContain('Live Print Queue');
      expect(html).toContain('id="updateBtn"');
      expect(html).toContain('.btn-update');
      expect(html).toContain('Check Update');
      expect(html).not.toContain('style="display:none;" onclick="performUpdate()"');
    } finally {
      await handle.close();
    }
  });

  it('GET /api/jobs, /api/state, /api/printers, and /favicon.ico return agent telemetry', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const jobsRes = await fetch(`${handle.url}/api/jobs`);
      expect(jobsRes.status).toBe(200);
      expect(Array.isArray(((await jobsRes.json()) as { jobs: unknown[] }).jobs)).toBe(true);

      const res = await fetch(`${handle.url}/api/state`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as StateResponse;
      expect(data.apiUrl).toBe('https://snapprint.onrender.com');
      expect(data.isEnrolled).toBe(false);

      const printerRes = await fetch(`${handle.url}/api/printers`);
      expect(printerRes.status).toBe(200);
      const printerData = (await printerRes.json()) as { printers: DiscoveredPrinter[] };
      expect(printerData.printers).toHaveLength(1);
      expect(printerData.printers[0].name).toBe('Epson L3150 Series');

      const favRes = await fetch(`${handle.url}/favicon.ico`);
      expect(favRes.status).toBe(200);
      expect(favRes.headers.get('content-type')).toBe('image/png');
    } finally {
      await handle.close();
    }
  });

  it('POST /api/config updates apiUrl dynamically', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const res = await fetch(`${handle.url}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: 'https://custom-server.snapprint.in' }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; apiUrl: string };
      expect(data.success).toBe(true);
      expect(data.apiUrl).toBe('https://custom-server.snapprint.in');
    } finally {
      await handle.close();
    }
  });

  it('POST /api/pair and /api/unpair manage studio enrollment', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const badRes = await fetch(`${handle.url}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: '' }),
      });
      expect(badRes.status).toBe(400);

      const res = await fetch(`${handle.url}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: 'SNAP-ABCD-1234' }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as PairResponse;
      expect(data.success).toBe(true);
      expect(data.studioId).toBe('std_test456');

      const stateData = (await (await fetch(`${handle.url}/api/state`)).json()) as StateResponse;
      expect(stateData.isEnrolled).toBe(true);
      expect(stateData.studioId).toBe('std_test456');
      expect(mockClient.syncPrinters).toHaveBeenCalled();

      const unpairRes = await fetch(`${handle.url}/api/unpair`, { method: 'POST' });
      expect(unpairRes.status).toBe(200);
      expect(((await unpairRes.json()) as UnpairResponse).success).toBe(true);
    } finally {
      await handle.close();
    }
  }, 15000);

  it('GET /api/update/check returns update check status', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input).includes('/downloads/windows-agent/metadata')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              version: '0.1.2',
              installerName: 'SnapPrint-Print-Agent.msi',
              downloadUrl: 'https://snapprint.onrender.com/downloads/latest.msi',
              sha256: 'a'.repeat(64),
              sizeBytes: 1048576,
              releaseDate: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      return originalFetch(input, init);
    });

    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const res = await fetch(`${handle.url}/api/update/check`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { updateAvailable: boolean; currentVersion: string };
      expect(typeof data.updateAvailable).toBe('boolean');
      expect(data.currentVersion).toBe('0.1.2');
    } finally {
      await handle.close();
      fetchSpy.mockRestore();
    }
  });
});
