import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentDownloadMetadata, AgentDownloadMetadataSchema } from '@snapprint/contracts';

export const AGENT_VERSION = '0.1.0';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  metadata?: AgentDownloadMetadata;
  error?: string;
}

export interface UpdateApplyResult {
  success: boolean;
  message: string;
  version?: string;
  installerPath?: string;
  command?: string;
}

export function compareVersions(v1: string, v2: string): number {
  const p1 = v1
    .replace(/^v/, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const p2 = v2
    .replace(/^v/, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(p1.length, p2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export async function checkForUpdate(
  apiUrl: string,
  currentVersion = AGENT_VERSION,
  fetchImpl: typeof fetch = fetch
): Promise<UpdateCheckResult> {
  const endpoint = `${apiUrl.replace(/\/+$/, '')}/downloads/windows-agent/metadata`;
  try {
    const res = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        updateAvailable: false,
        currentVersion,
        error: `Server returned HTTP ${res.status}`,
      };
    }
    const rawData = await res.json();
    const parsed = AgentDownloadMetadataSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        updateAvailable: false,
        currentVersion,
        error: 'Invalid metadata received from server',
      };
    }
    const metadata = parsed.data;
    const updateAvailable = compareVersions(metadata.version, currentVersion) > 0;
    return {
      updateAvailable,
      currentVersion,
      latestVersion: metadata.version,
      metadata,
    };
  } catch (err) {
    return {
      updateAvailable: false,
      currentVersion,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function downloadUpdate(
  metadata: AgentDownloadMetadata,
  downloadDir = tmpdir(),
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  if (!existsSync(downloadDir)) {
    mkdirSync(downloadDir, { recursive: true });
  }
  const targetPath = join(downloadDir, metadata.installerName);
  const res = await fetchImpl(metadata.downloadUrl, { method: 'GET' });
  if (!res.ok) {
    throw new Error(
      `Failed to download installer from ${metadata.downloadUrl} (HTTP ${res.status})`
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const hash = createHash('sha256').update(buffer).digest('hex').toLowerCase();
  if (hash !== metadata.sha256.toLowerCase()) {
    throw new Error(
      `Checksum mismatch for downloaded installer. Expected ${metadata.sha256}, got ${hash}`
    );
  }

  writeFileSync(targetPath, buffer);
  return targetPath;
}

export function applyUpdate(
  installerPath: string,
  platform = process.platform,
  spawnImpl: typeof spawn = spawn
): { success: boolean; command: string; pid?: number } {
  if (platform === 'win32') {
    const child = spawnImpl('msiexec.exe', ['/i', installerPath, '/passive', '/norestart'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return {
      success: true,
      command: `msiexec.exe /i "${installerPath}" /passive /norestart`,
      pid: child.pid,
    };
  }

  return {
    success: true,
    command: `file://${installerPath}`,
  };
}

export async function applyAgentUpdate(
  apiUrl: string,
  currentVersion = AGENT_VERSION,
  options?: {
    downloadDir?: string;
    fetchImpl?: typeof fetch;
    platform?: NodeJS.Platform;
    spawnImpl?: typeof spawn;
  }
): Promise<UpdateApplyResult> {
  const check = await checkForUpdate(apiUrl, currentVersion, options?.fetchImpl);
  if (!check.updateAvailable || !check.metadata) {
    return {
      success: false,
      message: check.error || `SnapPrint Agent is already up to date (v${currentVersion}).`,
      version: currentVersion,
    };
  }

  const installerPath = await downloadUpdate(
    check.metadata,
    options?.downloadDir,
    options?.fetchImpl
  );
  const execResult = applyUpdate(installerPath, options?.platform, options?.spawnImpl);

  return {
    success: true,
    message: `Update v${check.metadata.version} downloaded and installer launched.`,
    version: check.metadata.version,
    installerPath,
    command: execResult.command,
  };
}

export async function handleUpdateCommand(
  apiUrl: string,
  currentVersion = AGENT_VERSION,
  options?: {
    downloadDir?: string;
    fetchImpl?: typeof fetch;
    platform?: NodeJS.Platform;
    spawnImpl?: typeof spawn;
  }
): Promise<number> {
  console.log(`Checking for agent updates from ${apiUrl}...`);
  console.log(`Current version: v${currentVersion}`);
  const result = await applyAgentUpdate(apiUrl, currentVersion, options);
  if (!result.success) {
    if (result.message.includes('already up to date')) {
      console.log(result.message);
      return 0;
    }
    console.error(`Update failed: ${result.message}`);
    return 1;
  }
  console.log(`Update succeeded: ${result.message}`);
  return 0;
}
