import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AgentClient } from './agent-client.js';
import { AgentConfig } from './config.js';
import { AgentDaemon } from './daemon.js';
import { InFlightJobTracker } from './job-tracker.js';
import { SpoolerAdapter } from './spooler-adapter.js';

describe('AgentDaemon Runtime Lifecycle & Safety', () => {
  const tempConfigPath = join(tmpdir(), `daemon-lifecycle-${Date.now()}.json`);
  const tempTrackerPath = join(tmpdir(), `daemon-tracker-${Date.now()}.json`);
  const mockConfig: AgentConfig = {
    apiUrl: 'http://127.0.0.1:3001',
    deviceToken: 'tok_active_device',
    studioId: 'std_test_life',
  };

  it('halts operations and enters revoked state when server responds with 401', async () => {
    const mockSpooler: SpoolerAdapter = {
      getPrinters: vi.fn().mockResolvedValue([]),
      printFile: vi.fn().mockResolvedValue(undefined),
    };
    const mockClient = {
      syncPrinters: vi.fn().mockRejectedValue(new Error('401 DEVICE_UNAUTHORIZED: Token revoked')),
      sendHeartbeat: vi.fn().mockResolvedValue({}),
      fetchPendingJobs: vi.fn().mockResolvedValue([]),
      updateJobStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as AgentClient;

    const daemon = new AgentDaemon(mockConfig, mockClient, mockSpooler, {
      configPath: tempConfigPath,
      logger: () => {},
    });

    await daemon.start();
    expect(daemon.revoked).toBe(true);
    expect(daemon.running).toBe(false);
  });

  it('recovers uncertain in-flight jobs on startup without re-spooling duplicate pages', async () => {
    const tracker = new InFlightJobTracker(tempTrackerPath);
    tracker.recordInFlight('job_interrupted_99', 'Canon Pixma', 'receipt.pdf');

    const mockSpooler: SpoolerAdapter = {
      getPrinters: vi.fn().mockResolvedValue([]),
      printFile: vi.fn().mockResolvedValue(undefined),
    };
    const mockClient = {
      syncPrinters: vi.fn().mockResolvedValue({ count: 0 }),
      sendHeartbeat: vi.fn().mockResolvedValue({}),
      fetchPendingJobs: vi.fn().mockResolvedValue([]),
      updateJobStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as AgentClient;

    const daemon = new AgentDaemon(mockConfig, mockClient, mockSpooler, {
      configPath: tempConfigPath,
      inFlightTracker: tracker,
      logger: () => {},
    });

    await daemon.start();

    // Spooler must NOT have been called for the interrupted job
    expect(mockSpooler.printFile).not.toHaveBeenCalled();
    // Job must be marked failed with diagnosis
    expect(mockClient.updateJobStatus).toHaveBeenCalledWith(
      'tok_active_device',
      'job_interrupted_99',
      'failed',
      expect.stringContaining('UNCERTAIN_PHYSICAL_DISPATCH')
    );
    // In-flight tracker must now be clean
    expect(tracker.getInFlightJobs()).toEqual([]);
    daemon.stop();
  });
});
