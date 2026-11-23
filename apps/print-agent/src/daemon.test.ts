import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AgentClient } from './agent-client.js';
import { AgentConfig } from './config.js';
import { AgentDaemon } from './daemon.js';
import { SpoolerAdapter } from './spooler-adapter.js';

describe('AgentDaemon', () => {
  const tempConfigPath = join(tmpdir(), `agent-daemon-test-${Date.now()}.json`);
  const mockConfig: AgentConfig = {
    apiUrl: 'http://127.0.0.1:3001',
    deviceToken: 'tok_device_test',
    studioId: 'std_test',
  };

  it('syncOnce discovers and uploads printers', async () => {
    const mockSpooler: SpoolerAdapter = {
      getPrinters: vi.fn().mockResolvedValue([
        {
          name: 'HP LaserJet Pro',
          driverName: 'HP Driver',
          isColorSupported: false,
          supportedPaperSizes: ['A4'],
        },
      ]),
    };

    const mockClient = {
      syncPrinters: vi.fn().mockResolvedValue({ count: 1 }),
      sendHeartbeat: vi.fn().mockResolvedValue({ timestamp: '2026-11-23T12:00:00.000Z' }),
    } as unknown as AgentClient;

    const daemon = new AgentDaemon(mockConfig, mockClient, mockSpooler, {
      configPath: tempConfigPath,
      logger: () => {},
    });

    const count = await daemon.syncOnce();
    expect(count).toBe(1);
    expect(mockSpooler.getPrinters).toHaveBeenCalledTimes(1);
    expect(mockClient.syncPrinters).toHaveBeenCalledWith('tok_device_test', [
      {
        name: 'HP LaserJet Pro',
        driverName: 'HP Driver',
        isColorSupported: false,
        supportedPaperSizes: ['A4'],
      },
    ]);
  });

  it('throws error when syncOnce is called without enrollment token', async () => {
    const daemon = new AgentDaemon(
      { apiUrl: 'http://localhost:3001' },
      {} as unknown as AgentClient,
      { getPrinters: vi.fn() } as unknown as SpoolerAdapter,
      { configPath: tempConfigPath, logger: () => {} }
    );

    await expect(daemon.syncOnce()).rejects.toThrow('Agent is not enrolled');
  });

  it('starts and stops timers cleanly', async () => {
    const mockSpooler: SpoolerAdapter = {
      getPrinters: vi.fn().mockResolvedValue([]),
    };
    const mockClient = {
      syncPrinters: vi.fn().mockResolvedValue({ count: 0 }),
      sendHeartbeat: vi.fn().mockResolvedValue({ timestamp: '2026-11-23T12:00:00.000Z' }),
    } as unknown as AgentClient;

    const daemon = new AgentDaemon(mockConfig, mockClient, mockSpooler, {
      configPath: tempConfigPath,
      heartbeatIntervalMs: 10_000,
      syncIntervalMs: 60_000,
      logger: () => {},
    });

    await daemon.start();
    expect(daemon.running).toBe(true);

    daemon.stop();
    expect(daemon.running).toBe(false);
  });
});
