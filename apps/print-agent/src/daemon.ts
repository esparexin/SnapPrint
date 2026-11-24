import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { PrintJobRecord } from '@snapprint/contracts';
import { AgentClient } from './agent-client.js';
import { AgentConfig, saveAgentConfig } from './config.js';
import { SpoolerAdapter } from './spooler-adapter.js';

export interface DaemonOptions {
  syncIntervalMs?: number;
  heartbeatIntervalMs?: number;
  jobPollIntervalMs?: number;
  configPath?: string;
  logger?: (msg: string) => void;
}

export class AgentDaemon {
  private isRunning = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private jobPollTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: AgentConfig,
    private readonly client: AgentClient,
    private readonly spooler: SpoolerAdapter,
    private readonly options: DaemonOptions = {}
  ) {}

  public get running(): boolean {
    return this.isRunning;
  }

  async syncOnce(): Promise<number> {
    const token = this.config.deviceToken;
    if (!token) {
      throw new Error('Agent is not enrolled. Run enroll command with pairing code first.');
    }

    const log = this.options.logger || console.log;
    log('Scanning local printers and drivers...');
    const discovered = await this.spooler.getPrinters();
    log(`Discovered ${discovered.length} local printer(s). Uploading to cloud...`);

    const result = await this.client.syncPrinters(token, discovered);
    try {
      this.config.lastSyncAt = new Date().toISOString();
      saveAgentConfig(this.config, this.options.configPath);
    } catch {
      // Non-fatal if config save fails due to filesystem permissions
    }
    log(`Printers synced successfully (${result.count} registered).`);
    return result.count;
  }

  async heartbeatOnce(): Promise<void> {
    const token = this.config.deviceToken;
    if (!token) return;

    try {
      await this.client.sendHeartbeat(token);
    } catch (err) {
      const log = this.options.logger || console.warn;
      log(`Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async pollAndExecuteJobsOnce(): Promise<number> {
    const token = this.config.deviceToken;
    if (!token) return 0;

    const log = this.options.logger || console.log;
    let jobs: PrintJobRecord[] = [];
    try {
      jobs = await this.client.fetchPendingJobs(token);
    } catch (err) {
      log(`Job polling check failed: ${err instanceof Error ? err.message : String(err)}`);
      return 0;
    }

    if (!jobs || jobs.length === 0) {
      return 0;
    }

    log(`Received ${jobs.length} pending print job(s). Executing spooler queue...`);
    let executedCount = 0;

    for (const job of jobs) {
      const cleanExt = extname(job.filename) || '.pdf';
      const safeBase = basename(job.filename, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
      const tempFilePath = join(tmpdir(), `snapprint_${job.jobId}_${safeBase}${cleanExt}`);

      try {
        log(`[Job ${job.jobId}] Marking processing...`);
        await this.client.updateJobStatus(token, job.jobId, 'processing');

        log(
          `[Job ${job.jobId}] Downloading ${job.filename} (${job.colorMode}, ${job.copies} copy/copies)...`
        );
        await this.client.downloadJobDocument(token, job.jobId, tempFilePath);

        log(`[Job ${job.jobId}] Sending to native spooler -> ${job.printerName}...`);
        await this.spooler.printFile(job.printerName, tempFilePath, {
          copies: job.copies,
          paperSize: job.paperSize,
        });

        log(`[Job ${job.jobId}] Print successfully queued to hardware. Marking completed...`);
        await this.client.updateJobStatus(token, job.jobId, 'completed');
        executedCount++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log(`[Job ${job.jobId}] Printing failed: ${errMsg}`);
        try {
          await this.client.updateJobStatus(token, job.jobId, 'failed', errMsg);
        } catch {
          // Ignore failure to report failure
        }
      } finally {
        try {
          if (existsSync(tempFilePath)) {
            unlinkSync(tempFilePath);
          }
        } catch {
          // Best effort cleanup
        }
      }
    }

    return executedCount;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    const log = this.options.logger || console.log;
    log('Starting SnapPrint Desktop Print Agent Daemon...');

    // Perform initial sync, heartbeat, and job poll
    await this.syncOnce();
    await this.heartbeatOnce();
    await this.pollAndExecuteJobsOnce().catch(() => {});

    const heartbeatMs = this.options.heartbeatIntervalMs ?? 30_000;
    const syncMs = this.options.syncIntervalMs ?? 300_000;
    const pollMs = this.options.jobPollIntervalMs ?? 3_000;

    this.heartbeatTimer = setInterval(() => {
      this.heartbeatOnce().catch(() => {});
    }, heartbeatMs);

    this.syncTimer = setInterval(() => {
      this.syncOnce().catch((err) => {
        log(`Periodic printer sync error: ${err instanceof Error ? err.message : String(err)}`);
      });
    }, syncMs);

    this.jobPollTimer = setInterval(() => {
      this.pollAndExecuteJobsOnce().catch(() => {});
    }, pollMs);

    log(
      `Daemon running (Job Poller: ${pollMs / 1000}s, Heartbeat: ${heartbeatMs / 1000}s, Discovery: ${syncMs / 1000}s).`
    );
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.jobPollTimer) {
      clearInterval(this.jobPollTimer);
      this.jobPollTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    const log = this.options.logger || console.log;
    log('SnapPrint Desktop Print Agent Daemon stopped.');
  }
}
