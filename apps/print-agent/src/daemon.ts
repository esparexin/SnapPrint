import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { PrintJobRecord } from '@snapprint/contracts';
import { AgentClient, AgentClientError } from './agent-client.js';
import { AgentConfig, saveAgentConfig, unpairAgent } from './config.js';
import { InFlightJobTracker } from './job-tracker.js';
import { SpoolerAdapter } from './spooler-adapter.js';

export interface DaemonOptions {
  syncIntervalMs?: number;
  heartbeatIntervalMs?: number;
  jobPollIntervalMs?: number;
  configPath?: string;
  inFlightTracker?: InFlightJobTracker;
  logger?: (msg: string) => void;
}

export class AgentDaemon {
  private isRunning = false;
  private isRevoked = false;
  private isSyncing = false;
  private isHeartbeating = false;
  private isPollingJobs = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private jobPollTimer: NodeJS.Timeout | null = null;
  private readonly jobTracker: InFlightJobTracker;

  constructor(
    private config: AgentConfig,
    private readonly client: AgentClient,
    private readonly spooler: SpoolerAdapter,
    private readonly options: DaemonOptions = {}
  ) {
    this.jobTracker = options.inFlightTracker || new InFlightJobTracker();
  }

  public get running(): boolean {
    return this.isRunning;
  }
  public get revoked(): boolean {
    return this.isRevoked;
  }

  public getJobTracker(): InFlightJobTracker {
    return this.jobTracker;
  }

  private handleAuthError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    const isAuth =
      err instanceof AgentClientError
        ? err.statusCode === 401 ||
          err.code === 'DEVICE_UNBOUND' ||
          err.code === 'DEVICE_UNAUTHORIZED' ||
          err.code === 'DEVICE_REVOKED'
        : msg.includes('401') ||
          msg.includes('DEVICE_UNAUTHORIZED') ||
          msg.includes('DEVICE_REVOKED') ||
          msg.includes('DEVICE_UNBOUND') ||
          msg.includes('unbound by the operator');

    if (isAuth) {
      const log = this.options.logger || console.error;
      log('[CRITICAL] Workstation unbound or revoked by studio operator. Halting operations.');
      this.isRevoked = true;
      this.config = { ...this.config, deviceToken: undefined };
      try {
        unpairAgent(this.options.configPath);
      } catch {
        // non-fatal
      }
      this.stop();
      return true;
    }
    return false;
  }

  async syncOnce(): Promise<number> {
    if (this.isRevoked) return 0;
    const token = this.config.deviceToken;
    if (!token) throw new Error('Agent is not enrolled.');
    if (this.isSyncing) return 0;
    this.isSyncing = true;
    try {
      const discovered = await this.spooler.getPrinters();
      const result = await this.client.syncPrinters(token, discovered);
      this.config.lastSyncAt = new Date().toISOString();
      try {
        saveAgentConfig(this.config, this.options.configPath);
      } catch {
        // non-fatal
      }
      return result.count;
    } catch (err) {
      if (this.handleAuthError(err)) return 0;
      throw err;
    } finally {
      this.isSyncing = false;
    }
  }

  async heartbeatOnce(): Promise<void> {
    if (this.isRevoked || this.isHeartbeating) return;
    const token = this.config.deviceToken;
    if (!token) return;
    this.isHeartbeating = true;
    try {
      await this.client.sendHeartbeat(token);
    } catch (err) {
      if (this.handleAuthError(err)) return;
      const log = this.options.logger || console.warn;
      log(`Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.isHeartbeating = false;
    }
  }

  async recoverUncertainJobs(): Promise<void> {
    const token = this.config.deviceToken;
    if (!token) return;

    const interrupted = this.jobTracker.getInFlightJobs();
    if (interrupted.length === 0) return;

    const log = this.options.logger || console.warn;
    for (const job of interrupted) {
      log(`[Job ${job.jobId}] Found interrupted print job from prior run. Marking failed.`);
      const errMsg = 'UNCERTAIN_PHYSICAL_DISPATCH: Agent restarted while print job was in flight.';
      try {
        await this.client.updateJobStatus(token, job.jobId, 'failed', errMsg);
      } catch {
        // best effort
      }
      this.jobTracker.recordRecentJob(job.jobId, job.printerName, job.filename, 'failed', {
        errorMessage: errMsg,
      });
      this.jobTracker.clearInFlight(job.jobId);
    }
  }

  async pollAndExecuteJobsOnce(): Promise<number> {
    if (this.isRevoked || this.isPollingJobs) return 0;
    const token = this.config.deviceToken;
    if (!token) return 0;
    this.isPollingJobs = true;
    try {
      return await this.runJobPollCycle(token);
    } finally {
      this.isPollingJobs = false;
    }
  }

  private async runJobPollCycle(token: string): Promise<number> {
    let jobs: PrintJobRecord[] = [];
    try {
      jobs = await this.client.fetchPendingJobs(token);
    } catch (err) {
      if (this.handleAuthError(err)) return 0;
      return 0;
    }

    if (!jobs || jobs.length === 0) return 0;

    const log = this.options.logger || console.log;
    let executedCount = 0;

    for (const job of jobs) {
      const cleanExt = extname(job.filename) || '.pdf';
      const safeBase = basename(job.filename, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
      const tempFilePath = join(tmpdir(), `snapprint_${job.jobId}_${safeBase}${cleanExt}`);

      try {
        this.jobTracker.recordRecentJob(job.jobId, job.printerName, job.filename, 'processing', {
          copies: job.copies,
        });
        await this.client.updateJobStatus(token, job.jobId, 'processing');
        await this.client.downloadJobDocument(token, job.jobId, tempFilePath);

        this.jobTracker.recordInFlight(job.jobId, job.printerName, job.filename);
        await this.spooler.printFile(job.printerName, tempFilePath, {
          copies: job.copies,
          paperSize: job.paperSize,
          sides: job.sides,
        });
        this.jobTracker.clearInFlight(job.jobId);

        log(`[Job ${job.jobId}] Spooler accepted document for ${job.printerName}.`);
        await this.client.updateJobStatus(token, job.jobId, 'completed');
        this.jobTracker.recordRecentJob(job.jobId, job.printerName, job.filename, 'completed', {
          copies: job.copies,
        });
        executedCount++;
      } catch (err) {
        this.jobTracker.clearInFlight(job.jobId);
        const errMsg = err instanceof Error ? err.message : String(err);
        log(`[Job ${job.jobId}] Spooler submission failed: ${errMsg}`);
        this.jobTracker.recordRecentJob(job.jobId, job.printerName, job.filename, 'failed', {
          errorMessage: errMsg,
          copies: job.copies,
        });
        try {
          await this.client.updateJobStatus(token, job.jobId, 'failed', errMsg);
        } catch {
          /* ignore */
        }
      } finally {
        try {
          if (existsSync(tempFilePath)) unlinkSync(tempFilePath);
        } catch {
          /* ignore file cleanup errors */
        }
      }
    }

    return executedCount;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isRevoked = false;

    const log = this.options.logger || console.log;
    log('Starting SnapPrint Desktop Print Agent Daemon...');
    await this.recoverUncertainJobs();
    await this.syncOnce().catch(() => {});
    await this.heartbeatOnce();
    await this.pollAndExecuteJobsOnce().catch(() => {});
    if (this.isRevoked) return;

    const opt = this.options;
    const tick = (fn: () => Promise<unknown>, t: number) =>
      setInterval(() => fn().catch(() => {}), t);
    this.heartbeatTimer = tick(() => this.heartbeatOnce(), opt.heartbeatIntervalMs ?? 30_000);
    this.syncTimer = tick(() => this.syncOnce(), opt.syncIntervalMs ?? 30_000);
    this.jobPollTimer = tick(() => this.pollAndExecuteJobsOnce(), opt.jobPollIntervalMs ?? 3_000);
  }

  stop(): void {
    this.isRunning = false;
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.jobPollTimer) clearInterval(this.jobPollTimer);
    this.syncTimer = this.heartbeatTimer = this.jobPollTimer = null;
  }
}
