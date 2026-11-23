import { AgentClient } from './agent-client.js';
import { AgentConfig, saveAgentConfig } from './config.js';
import { SpoolerAdapter } from './spooler-adapter.js';

export interface DaemonOptions {
  syncIntervalMs?: number;
  heartbeatIntervalMs?: number;
  configPath?: string;
  logger?: (msg: string) => void;
}

export class AgentDaemon {
  private isRunning = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

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

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    const log = this.options.logger || console.log;
    log('Starting SnapPrint Desktop Print Agent Daemon...');

    // Perform initial sync and heartbeat
    await this.syncOnce();
    await this.heartbeatOnce();

    const heartbeatMs = this.options.heartbeatIntervalMs ?? 30_000;
    const syncMs = this.options.syncIntervalMs ?? 300_000;

    this.heartbeatTimer = setInterval(() => {
      this.heartbeatOnce().catch(() => {});
    }, heartbeatMs);

    this.syncTimer = setInterval(() => {
      this.syncOnce().catch((err) => {
        log(`Periodic printer sync error: ${err instanceof Error ? err.message : String(err)}`);
      });
    }, syncMs);

    log(`Daemon running (Heartbeat: ${heartbeatMs / 1000}s, Discovery: ${syncMs / 1000}s).`);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

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
