import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InFlightJobTracker } from './job-tracker.js';

describe('InFlightJobTracker', () => {
  const testPath = join(tmpdir(), `snapprint-inflight-test-${Date.now()}.json`);
  let tracker: InFlightJobTracker;

  beforeEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
    tracker = new InFlightJobTracker(testPath);
  });

  afterEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  it('returns empty list when no jobs are in flight', () => {
    expect(tracker.getInFlightJobs()).toEqual([]);
  });

  it('records, queries, and clears in-flight jobs', () => {
    tracker.recordInFlight('job_101', 'Epson L3150', 'invoice.pdf');
    const inFlight = tracker.getInFlightJobs();
    expect(inFlight.length).toBe(1);
    expect(inFlight[0].jobId).toBe('job_101');
    expect(inFlight[0].printerName).toBe('Epson L3150');
    expect(inFlight[0].filename).toBe('invoice.pdf');

    tracker.clearInFlight('job_101');
    expect(tracker.getInFlightJobs()).toEqual([]);
  });

  it('preserves in-flight jobs across tracker instances to simulate crash recovery', () => {
    tracker.recordInFlight('job_crash_1', 'HP LaserJet', 'doc.pdf');

    const recoveredTracker = new InFlightJobTracker(testPath);
    const recoveredJobs = recoveredTracker.getInFlightJobs();
    expect(recoveredJobs.length).toBe(1);
    expect(recoveredJobs[0].jobId).toBe('job_crash_1');
  });
});
