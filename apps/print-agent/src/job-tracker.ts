import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface InFlightJobRecord {
  jobId: string;
  printerName: string;
  filename: string;
  startedAt: string;
}

export interface AgentRecentJobRecord {
  jobId: string;
  printerName: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  copies?: number;
  startedAt: string;
  finishedAt?: string;
}

export function getDefaultInFlightPath(): string {
  const baseDir = process.env.SNAPPRINT_CONFIG_DIR || join(homedir(), '.snapprint');
  return join(baseDir, 'in-flight-jobs.json');
}

export function getDefaultRecentJobsPath(): string {
  const baseDir = process.env.SNAPPRINT_CONFIG_DIR || join(homedir(), '.snapprint');
  return join(baseDir, 'recent-jobs.json');
}

const MAX_RECENT_JOBS = 30;

export class InFlightJobTracker {
  constructor(
    private readonly inFlightPath = getDefaultInFlightPath(),
    private readonly recentJobsPath = getDefaultRecentJobsPath()
  ) {}

  getInFlightJobs(): InFlightJobRecord[] {
    if (!existsSync(this.inFlightPath)) return [];
    try {
      const content = readFileSync(this.inFlightPath, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  recordInFlight(jobId: string, printerName: string, filename: string): void {
    const jobs = this.getInFlightJobs().filter((j) => j.jobId !== jobId);
    jobs.push({ jobId, printerName, filename, startedAt: new Date().toISOString() });
    this.saveInFlight(jobs);
  }

  clearInFlight(jobId: string): void {
    const jobs = this.getInFlightJobs().filter((j) => j.jobId !== jobId);
    this.saveInFlight(jobs);
  }

  getRecentJobs(): AgentRecentJobRecord[] {
    if (!existsSync(this.recentJobsPath)) return [];
    try {
      const content = readFileSync(this.recentJobsPath, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  recordRecentJob(
    jobId: string,
    printerName: string,
    filename: string,
    status: AgentRecentJobRecord['status'],
    options?: { errorMessage?: string; copies?: number }
  ): void {
    const jobs = this.getRecentJobs().filter((j) => j.jobId !== jobId);
    const existing = this.getRecentJobs().find((j) => j.jobId === jobId);
    const now = new Date().toISOString();
    const isTerminal = status === 'completed' || status === 'failed';

    jobs.unshift({
      jobId,
      printerName,
      filename,
      status,
      errorMessage: options?.errorMessage,
      copies: options?.copies ?? existing?.copies ?? 1,
      startedAt: existing?.startedAt || now,
      finishedAt: isTerminal ? now : undefined,
    });

    const trimmed = jobs.slice(0, MAX_RECENT_JOBS);
    this.saveRecent(trimmed);
  }

  private saveInFlight(jobs: InFlightJobRecord[]): void {
    const dir = dirname(this.inFlightPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (jobs.length === 0) {
      if (existsSync(this.inFlightPath)) unlinkSync(this.inFlightPath);
    } else {
      writeFileSync(this.inFlightPath, JSON.stringify(jobs, null, 2), 'utf-8');
    }
  }

  private saveRecent(jobs: AgentRecentJobRecord[]): void {
    const dir = dirname(this.recentJobsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.recentJobsPath, JSON.stringify(jobs, null, 2), 'utf-8');
  }
}
