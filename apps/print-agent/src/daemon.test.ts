import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AgentClient } from './agent-client.js';
import { AgentConfig } from './config.js';
import { AgentDaemon } from './daemon.js';
import { InFlightJobTracker } from './job-tracker.js';
import { SpoolerAdapter } from './spooler-adapter.js';

describe('AgentDaemon', () => {
  const tempConfigPath = join(tmpdir(), `agent-daemon-test-${Date.now()}.json`);
  const tempTrackerPath = join(tmpdir(), `agent-tracker-test-${Date.now()}.json`);
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
      printFile: vi.fn().mockResolvedValue(undefined),
    };

    const mockClient = {
      syncPrinters: vi.fn().mockResolvedValue({ count: 1 }),
      sendHeartbeat: vi.fn().mockResolvedValue({ timestamp: '2026-11-23T12:00:00.000Z' }),
    } as unknown as AgentClient;

    const daemon = new AgentDaemon(mockConfig, mockClient, mockSpooler, {
      configPath: tempConfigPath,
      inFlightTracker: new InFlightJobTracker(tempTrackerPath),
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
      printFile: vi.fn().mockResolvedValue(undefined),
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

  it('pollAndExecuteJobsOnce fetches job, downloads, prints via spooler, and marks completed', async () => {
    const mockJob = {
      jobId: 'job_test_456',
      studioId: 'std_test',
      orderId: 'ord_123',
      itemId: 'itm_1',
      assetId: 'ast_1',
      targetPrinterId: 'prn_hp_01',
      printerName: 'HP LaserJet Pro M126nw',
      colorMode: 'bw' as const,
      paperSize: 'A4' as const,
      sides: 'single' as const,
      copies: 2,
      filename: 'ticket.pdf',
      status: 'pending' as const,
      createdAt: '2026-11-24T00:00:00.000Z',
    };

    const mockSpooler: SpoolerAdapter = {
      getPrinters: vi.fn().mockResolvedValue([]),
      printFile: vi.fn().mockResolvedValue(undefined),
    };

    const mockClient = {
      fetchPendingJobs: vi.fn().mockResolvedValue([mockJob]),
      downloadJobDocument: vi.fn().mockResolvedValue(undefined),
      updateJobStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as AgentClient;

    const daemon = new AgentDaemon(mockConfig, mockClient, mockSpooler, {
      configPath: tempConfigPath,
      inFlightTracker: new InFlightJobTracker(tempTrackerPath),
      logger: () => {},
    });

    const count = await daemon.pollAndExecuteJobsOnce();
    expect(count).toBe(1);

    expect(mockClient.fetchPendingJobs).toHaveBeenCalledWith('tok_device_test');
    expect(mockClient.updateJobStatus).toHaveBeenCalledWith(
      'tok_device_test',
      'job_test_456',
      'processing'
    );
    expect(mockClient.downloadJobDocument).toHaveBeenCalledTimes(1);
    expect(mockSpooler.printFile).toHaveBeenCalledWith(
      'HP LaserJet Pro M126nw',
      expect.stringContaining('snapprint_job_test_456_ticket.pdf'),
      { copies: 2, paperSize: 'A4' }
    );
    expect(mockClient.updateJobStatus).toHaveBeenCalledWith(
      'tok_device_test',
      'job_test_456',
      'completed'
    );
  });

  it('pollAndExecuteJobsOnce marks job failed when spooler throws', async () => {
    const mockJob = {
      jobId: 'job_fail_789',
      studioId: 'std_test',
      orderId: 'ord_123',
      itemId: 'itm_1',
      assetId: 'ast_1',
      targetPrinterId: 'prn_hp_01',
      printerName: 'HP LaserJet Pro M126nw',
      colorMode: 'bw' as const,
      paperSize: 'A4' as const,
      sides: 'single' as const,
      copies: 1,
      filename: 'document.pdf',
      status: 'pending' as const,
      createdAt: '2026-11-24T00:00:00.000Z',
    };

    const mockSpooler: SpoolerAdapter = {
      getPrinters: vi.fn().mockResolvedValue([]),
      printFile: vi.fn().mockRejectedValue(new Error('Hardware spooler offline')),
    };

    const mockClient = {
      fetchPendingJobs: vi.fn().mockResolvedValue([mockJob]),
      downloadJobDocument: vi.fn().mockResolvedValue(undefined),
      updateJobStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as AgentClient;

    const daemon = new AgentDaemon(mockConfig, mockClient, mockSpooler, {
      configPath: tempConfigPath,
      inFlightTracker: new InFlightJobTracker(tempTrackerPath),
      logger: () => {},
    });

    const count = await daemon.pollAndExecuteJobsOnce();
    expect(count).toBe(0);

    expect(mockClient.updateJobStatus).toHaveBeenCalledWith(
      'tok_device_test',
      'job_fail_789',
      'failed',
      'Hardware spooler offline'
    );
  });
});
