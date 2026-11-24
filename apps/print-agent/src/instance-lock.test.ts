import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireInstanceLock, releaseInstanceLock } from './instance-lock.js';

describe('Agent Instance Lock', () => {
  const lockPath = join(tmpdir(), `snapprint-test-lock-${Date.now()}.lock`);

  beforeEach(() => {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  });

  afterEach(() => {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  });

  it('successfully acquires lock when no lock exists', () => {
    const result = acquireInstanceLock(lockPath);
    expect(result.acquired).toBe(true);
    expect(result.pid).toBe(process.pid);
    expect(existsSync(lockPath)).toBe(true);
  });

  it('prevents multiple instances from acquiring the lock concurrently', () => {
    const first = acquireInstanceLock(lockPath);
    expect(first.acquired).toBe(true);

    const second = acquireInstanceLock(lockPath);
    expect(second.acquired).toBe(false);
    expect(second.pid).toBe(process.pid);
  });

  it('releases lock cleanly when requested', () => {
    acquireInstanceLock(lockPath);
    expect(existsSync(lockPath)).toBe(true);

    releaseInstanceLock(lockPath);
    expect(existsSync(lockPath)).toBe(false);
  });
});
