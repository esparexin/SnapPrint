import { describe, expect, it, vi } from 'vitest';
import { AgentClient, AgentClientError } from './agent-client.js';

describe('AgentClient', () => {
  it('enroll sends POST /agent/enroll and returns token details', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        deviceToken: 'tok_device_999',
        studioId: 'studio_abc',
        deviceId: 'dev_123',
      }),
    });

    const customClient = new AgentClient(
      'http://127.0.0.1:3001',
      mockFetch as unknown as typeof fetch
    );
    const result = await customClient.enroll('snap-7x9k-2m4p', 'Shop-PC');

    expect(result.deviceToken).toBe('tok_device_999');
    expect(result.studioId).toBe('studio_abc');
    expect(result.deviceId).toBe('dev_123');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/agent/enroll');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      pairingCode: 'SNAP-7X9K-2M4P',
      agentVersion: '0.1.2',
      hostname: 'Shop-PC',
      osPlatform: expect.any(String),
    });
  });

  it('enroll throws AgentClientError on non-200 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Invalid or expired pairing code',
        code: 'INVALID_PAIRING_CODE',
      }),
    });

    const customClient = new AgentClient(
      'http://127.0.0.1:3001',
      mockFetch as unknown as typeof fetch
    );
    await expect(customClient.enroll('invalid_code')).rejects.toThrow(AgentClientError);
  });

  it('syncPrinters sends POST /agent/sync-printers with x-device-token header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, count: 2 }),
    });

    const customClient = new AgentClient(
      'http://127.0.0.1:3001',
      mockFetch as unknown as typeof fetch
    );
    const res = await customClient.syncPrinters('tok_xyz', [
      {
        name: 'HP M126nw',
        driverName: 'HP Driver',
        isColorSupported: false,
        supportedPaperSizes: ['A4'],
      },
    ]);

    expect(res.count).toBe(2);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/agent/sync-printers');
    expect(init.headers['x-device-token']).toBe('tok_xyz');
  });

  it('sendHeartbeat sends POST /agent/heartbeat', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, timestamp: '2026-11-23T12:00:00.000Z' }),
    });

    const customClient = new AgentClient(
      'http://127.0.0.1:3001',
      mockFetch as unknown as typeof fetch
    );
    const res = await customClient.sendHeartbeat('tok_xyz');
    expect(res.timestamp).toBe('2026-11-23T12:00:00.000Z');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/agent/heartbeat');
    expect(init.method).toBe('POST');
    expect(init.headers['x-device-token']).toBe('tok_xyz');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{}');
  });

  it('fetchPendingJobs sends GET /agent/jobs/pending and returns jobs array', async () => {
    const mockJobs = [
      {
        jobId: 'job_123',
        studioId: 'std_1',
        orderId: 'ord_1',
        itemId: 'itm_1',
        assetId: 'ast_1',
        targetPrinterId: 'prn_hp',
        printerName: 'HP LaserJet',
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'single',
        copies: 1,
        filename: 'doc.pdf',
        status: 'pending',
        createdAt: '2026-11-24T00:00:00.000Z',
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobs: mockJobs }),
    });

    const client = new AgentClient('http://127.0.0.1:3001', mockFetch as unknown as typeof fetch);
    const jobs = await client.fetchPendingJobs('tok_xyz');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].jobId).toBe('job_123');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/agent/jobs/pending');
    expect(init.headers['x-device-token']).toBe('tok_xyz');
  });

  it('updateJobStatus sends POST /agent/jobs/:jobId/status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, jobId: 'job_123', status: 'completed' }),
    });

    const client = new AgentClient('http://127.0.0.1:3001', mockFetch as unknown as typeof fetch);
    await client.updateJobStatus('tok_xyz', 'job_123', 'completed');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:3001/agent/jobs/job_123/status');
    expect(init.method).toBe('POST');
    expect(init.headers['x-device-token']).toBe('tok_xyz');
    expect(JSON.parse(init.body)).toEqual({ status: 'completed' });
  });
});
