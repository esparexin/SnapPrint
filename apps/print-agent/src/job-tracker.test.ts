import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InFlightJobTracker } from './job-tracker.js';

describe('InFlightJobTracker', () => {
  const testInFlightPath = join(tmpdir(), `snapprint-inflight-test-${Date.now()}.json`);
  const testRecentJobsPath = join(tmpdir(), `snapprint-recent-test-${Date.now()}.json`);
  let tracker: InFlightJobTracker;

  beforeEach(() => {
    if (existsSync(testInFlightPath)) unlinkSync(testInFlightPath);
    if (existsSync(testRecentJobsPath)) unlinkSync(testRecentJobsPath);
    tracker = new InFlightJobTracker(testInFlightPath, testRecentJobsPath);
  });

  afterEach(() => {
    if (existsSync(testInFlightPath)) unlinkSync(testInFlightPath);
    if (existsSync(testRecentJobsPath)) unlinkSync(testRecentJobsPath);
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

    const recoveredTracker = new InFlightJobTracker(testInFlightPath, testRecentJobsPath);
    const recoveredJobs = recoveredTracker.getInFlightJobs();
    expect(recoveredJobs.length).toBe(1);
    expect(recoveredJobs[0].jobId).toBe('job_crash_1');
  });

  it('records and retrieves recent jobs with status, copies, and timestamps', () => {
    expect(tracker.getRecentJobs()).toEqual([]);

    tracker.recordRecentJob('job_201', 'Canon iR2520', 'notes.pdf', 'processing', { copies: 2 });
    let recent = tracker.getRecentJobs();
    expect(recent.length).toBe(1);
    expect(recent[0].jobId).toBe('job_201');
    expect(recent[0].status).toBe('processing');
    expect(recent[0].copies).toBe(2);
    expect(recent[0].startedAt).toBeDefined();
    expect(recent[0].finishedAt).toBeUndefined();

    // Mark completed
    tracker.recordRecentJob('job_201', 'Canon iR2520', 'notes.pdf', 'completed');
    recent = tracker.getRecentJobs();
    expect(recent.length).toBe(1);
    expect(recent[0].status).toBe('completed');
    expect(recent[0].finishedAt).toBeDefined();

    // Record a failed job
    tracker.recordRecentJob('job_202', 'Epson L3150', 'contract.pdf', 'failed', {
      errorMessage: 'PAPER_JAM: Paper tray empty or jammed',
    });
    recent = tracker.getRecentJobs();
    expect(recent.length).toBe(2);
    expect(recent[0].jobId).toBe('job_202'); // Most recent first
    expect(recent[0].status).toBe('failed');
    expect(recent[0].errorMessage).toContain('PAPER_JAM');
  });

  it('preserves recent jobs across tracker instances', () => {
    tracker.recordRecentJob('job_persist_1', 'HP M404', 'invoice.pdf', 'completed');

    const recovered = new InFlightJobTracker(testInFlightPath, testRecentJobsPath);
    const jobs = recovered.getRecentJobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].jobId).toBe('job_persist_1');
    expect(jobs[0].status).toBe('completed');
  });
});
