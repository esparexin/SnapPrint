import { writeFileSync } from 'node:fs';
import { PrintJobRecord, PrintJobStatus } from '@snapprint/contracts';
import { DiscoveredPrinter } from './spooler-adapter.js';

export interface EnrollResult {
  deviceToken: string;
  studioId: string;
  deviceId: string;
}

export interface SyncPrintersResult {
  count: number;
}

export interface HeartbeatResult {
  timestamp: string;
}

export class AgentClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AgentClientError';
  }
}

export interface EnrollOptions {
  agentVersion?: string;
  hostname?: string;
  osPlatform?: 'win32' | 'darwin' | 'linux';
}

export class AgentClient {
  constructor(
    private readonly apiUrl: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async enroll(
    pairingCode: string,
    friendlyName?: string,
    options?: EnrollOptions
  ): Promise<EnrollResult> {
    const url = `${this.apiUrl.replace(/\/+$/, '')}/agent/enroll`;
    const rawPlat = options?.osPlatform || process.platform;
    const osPlatform: 'win32' | 'darwin' | 'linux' =
      rawPlat === 'win32' || rawPlat === 'darwin' || rawPlat === 'linux' ? rawPlat : 'linux';
    const host = (options?.hostname || friendlyName || 'shop-pc').trim().slice(0, 128);
    const agentVersion = (options?.agentVersion || '0.1.0').trim().slice(0, 32);

    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairingCode: pairingCode.trim().toUpperCase(),
        agentVersion,
        hostname: host,
        osPlatform,
      }),
    });

    const data = (await res.json().catch(() => null)) as {
      message?: string;
      code?: string;
      deviceToken?: string;
      studioId?: string;
      deviceId?: string;
    } | null;

    if (!res.ok || !data?.deviceToken || !data?.studioId || !data?.deviceId) {
      throw new AgentClientError(
        data?.message || 'Device enrollment failed',
        res.status,
        data?.code
      );
    }

    return {
      deviceToken: data.deviceToken,
      studioId: data.studioId,
      deviceId: data.deviceId,
    };
  }

  async syncPrinters(
    deviceToken: string,
    printers: DiscoveredPrinter[]
  ): Promise<SyncPrintersResult> {
    const url = `${this.apiUrl.replace(/\/+$/, '')}/agent/sync-printers`;
    const now = new Date().toISOString();
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': deviceToken,
      },
      body: JSON.stringify({
        timestamp: now,
        printers: printers.map((p) => {
          const rawId = p.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
          const cleanId = rawId.length >= 3 ? rawId : `printer_${rawId}`;
          const printerId = cleanId.slice(0, 60);
          return {
            printerId,
            name: p.name.slice(0, 120),
            driverName: (p.driverName || p.name).slice(0, 160),
            connectionType: 'unknown',
            isColorSupported: Boolean(p.isColorSupported),
            supportedPaperSizes:
              p.supportedPaperSizes && p.supportedPaperSizes.length > 0
                ? p.supportedPaperSizes
                : ['A4'],
            duplexSupport: p.duplexSupport || 'unknown',
            supportedDuplexSizes: p.supportedDuplexSizes || [],
            capabilityProvenance: p.capabilityProvenance || 'unverified',
            status: 'online',
            isDefaultOsPrinter: Boolean(p.isDefault),
            lastSeenAt: now,
          };
        }),
      }),
    });

    const data = (await res.json().catch(() => null)) as {
      message?: string;
      code?: string;
      count?: number;
    } | null;

    if (!res.ok) {
      throw new AgentClientError(data?.message || 'Printer sync failed', res.status, data?.code);
    }

    return { count: data?.count ?? printers.length };
  }

  async sendHeartbeat(deviceToken: string): Promise<HeartbeatResult> {
    const url = `${this.apiUrl.replace(/\/+$/, '')}/agent/heartbeat`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': deviceToken,
      },
    });

    const data = (await res.json().catch(() => null)) as {
      message?: string;
      code?: string;
      timestamp?: string;
    } | null;

    if (!res.ok) {
      throw new AgentClientError(data?.message || 'Heartbeat failed', res.status, data?.code);
    }

    return { timestamp: data?.timestamp || new Date().toISOString() };
  }

  async fetchPendingJobs(deviceToken: string): Promise<PrintJobRecord[]> {
    const url = `${this.apiUrl.replace(/\/+$/, '')}/agent/jobs/pending`;
    const res = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        'x-device-token': deviceToken,
      },
    });

    const data = (await res.json().catch(() => null)) as {
      jobs?: PrintJobRecord[];
      message?: string;
      code?: string;
    } | null;

    if (!res.ok || !Array.isArray(data?.jobs)) {
      throw new AgentClientError(
        data?.message || 'Failed to fetch pending jobs',
        res.status,
        data?.code
      );
    }

    return data.jobs;
  }

  async downloadJobDocument(deviceToken: string, jobId: string, targetPath: string): Promise<void> {
    const url = `${this.apiUrl.replace(/\/+$/, '')}/agent/jobs/${encodeURIComponent(jobId)}/document`;
    const res = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        'x-device-token': deviceToken,
      },
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        code?: string;
      } | null;
      throw new AgentClientError(
        data?.message || `Failed to download job document for job ${jobId}`,
        res.status,
        data?.code
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    writeFileSync(targetPath, Buffer.from(arrayBuffer));
  }

  async updateJobStatus(
    deviceToken: string,
    jobId: string,
    status: PrintJobStatus,
    errorMessage?: string
  ): Promise<void> {
    const url = `${this.apiUrl.replace(/\/+$/, '')}/agent/jobs/${encodeURIComponent(jobId)}/status`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': deviceToken,
      },
      body: JSON.stringify({
        status,
        errorMessage,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        code?: string;
      } | null;
      throw new AgentClientError(
        data?.message || `Failed to update job status for job ${jobId}`,
        res.status,
        data?.code
      );
    }
  }
}
