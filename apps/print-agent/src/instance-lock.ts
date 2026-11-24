import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function getDefaultLockPath(): string {
  const baseDir = process.env.SNAPPRINT_CONFIG_DIR || join(homedir(), '.snapprint');
  return join(baseDir, 'agent.lock');
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    // ESRCH means process does not exist
    const nodeErr = err as NodeJS.ErrnoException;
    return nodeErr.code === 'EPERM'; // EPERM means exists but owned by other user
  }
}

export interface InstanceLockResult {
  acquired: boolean;
  pid?: number;
}

export function acquireInstanceLock(lockPath = getDefaultLockPath()): InstanceLockResult {
  if (existsSync(lockPath)) {
    try {
      const content = readFileSync(lockPath, 'utf-8').trim();
      const existingPid = parseInt(content, 10);
      if (!Number.isNaN(existingPid) && isPidAlive(existingPid)) {
        return { acquired: false, pid: existingPid };
      }
    } catch {
      // Corrupt lock file, overwrite
    }
  }

  const currentPid = process.pid;
  try {
    writeFileSync(lockPath, String(currentPid), 'utf-8');
    return { acquired: true, pid: currentPid };
  } catch {
    return { acquired: false };
  }
}

export function releaseInstanceLock(lockPath = getDefaultLockPath()): void {
  try {
    if (existsSync(lockPath)) {
      const content = readFileSync(lockPath, 'utf-8').trim();
      if (parseInt(content, 10) === process.pid) {
        unlinkSync(lockPath);
      }
    }
  } catch {
    // Best-effort cleanup
  }
}
