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
  printers: DiscoveredPrinter[];
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
    saveAgentConfig({ apiUrl: 'https://api.snapprint.in' }, testConfigPath);

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
    } finally {
      await handle.close();
    }
  });

  it('GET /api/state returns current agent and printer telemetry', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const res = await fetch(`${handle.url}/api/state`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as StateResponse;
      expect(data.apiUrl).toBe('https://api.snapprint.in');
      expect(data.isEnrolled).toBe(false);
      expect(data.printers).toHaveLength(1);
      expect(data.printers[0].name).toBe('Epson L3150 Series');
    } finally {
      await handle.close();
    }
  });

  it('POST /api/pair connects device to studio and updates configuration', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const res = await fetch(`${handle.url}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: 'SNAP-ABCD-1234' }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as PairResponse;
      expect(data.success).toBe(true);
      expect(data.studioId).toBe('std_test456');

      const stateRes = await fetch(`${handle.url}/api/state`);
      const stateData = (await stateRes.json()) as StateResponse;
      expect(stateData.isEnrolled).toBe(true);
      expect(stateData.studioId).toBe('std_test456');
    } finally {
      await handle.close();
    }
  });

  it('POST /api/pair rejects empty pairing code with 400', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const res = await fetch(`${handle.url}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: '' }),
      });

      expect(res.status).toBe(400);
    } finally {
      await handle.close();
    }
  });

  it('POST /api/unpair resets enrolled credentials', async () => {
    const handle = await startGuiServer(mockClient, mockSpooler, 0, testConfigPath);
    try {
      const res = await fetch(`${handle.url}/api/unpair`, { method: 'POST' });
      expect(res.status).toBe(200);
      const data = (await res.json()) as UnpairResponse;
      expect(data.success).toBe(true);
    } finally {
      await handle.close();
    }
  });
});
