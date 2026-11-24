import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface InFlightJobRecord {
  jobId: string;
  printerName: string;
  filename: string;
  startedAt: string;
}

export function getDefaultInFlightPath(): string {
  const baseDir = process.env.SNAPPRINT_CONFIG_DIR || join(homedir(), '.snapprint');
  return join(baseDir, 'in-flight-jobs.json');
}

export class InFlightJobTracker {
  constructor(private readonly filePath = getDefaultInFlightPath()) {}

  getInFlightJobs(): InFlightJobRecord[] {
    if (!existsSync(this.filePath)) {
      return [];
    }
    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  recordInFlight(jobId: string, printerName: string, filename: string): void {
    const jobs = this.getInFlightJobs().filter((j) => j.jobId !== jobId);
    jobs.push({
      jobId,
      printerName,
      filename,
      startedAt: new Date().toISOString(),
    });
    this.save(jobs);
  }

  clearInFlight(jobId: string): void {
    const jobs = this.getInFlightJobs().filter((j) => j.jobId !== jobId);
    this.save(jobs);
  }

  private save(jobs: InFlightJobRecord[]): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (jobs.length === 0) {
      if (existsSync(this.filePath)) {
        unlinkSync(this.filePath);
      }
    } else {
      writeFileSync(this.filePath, JSON.stringify(jobs, null, 2), 'utf-8');
    }
  }
}
