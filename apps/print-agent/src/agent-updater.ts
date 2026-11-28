import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentDownloadMetadata, AgentDownloadMetadataSchema } from '@snapprint/contracts';
import { resolveGitHubFallback } from './github-release-resolver.js';
import { launchTrampolineUpdater } from './update-trampoline.js';

export const AGENT_VERSION = '0.1.5';

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

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkForUpdate(
  apiUrl: string,
  currentVersion = AGENT_VERSION,
  fetchImpl: typeof fetch = fetch
): Promise<UpdateCheckResult> {
  const endpoint = `${apiUrl.replace(/\/+$/, '')}/downloads/windows-agent/metadata`;
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      endpoint,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      15_000
    );
    if (!res.ok) {
      return resolveGitHubFallback(
        currentVersion,
        fetchImpl,
        compareVersions,
        `Server returned HTTP ${res.status}`
      );
    }
    const rawData = await res.json();
    const parsed = AgentDownloadMetadataSchema.safeParse(rawData);
    if (!parsed.success) {
      return resolveGitHubFallback(
        currentVersion,
        fetchImpl,
        compareVersions,
        'Invalid metadata received from server'
      );
    }
    const metadata = parsed.data;
    if (compareVersions(metadata.version, currentVersion) > 0) {
      return {
        updateAvailable: true,
        currentVersion,
        latestVersion: metadata.version,
        metadata,
      };
    }
    const ghFallback = await resolveGitHubFallback(currentVersion, fetchImpl, compareVersions);
    if (ghFallback.updateAvailable) {
      return ghFallback;
    }
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: ghFallback.latestVersion || metadata.version,
      metadata,
    };
  } catch (err) {
    return resolveGitHubFallback(
      currentVersion,
      fetchImpl,
      compareVersions,
      err instanceof Error ? err.message : String(err)
    );
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
  const res = await fetchWithTimeout(fetchImpl, metadata.downloadUrl, { method: 'GET' }, 120_000);
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

export interface ApplyUpdateOptions {
  platform?: NodeJS.Platform;
  spawnImpl?: typeof spawn;
  parentPid?: number;
  targetExePath?: string;
  relaunchArgs?: string;
  logPath?: string;
  tempDir?: string;
}

export interface ApplyAgentUpdateOptions extends ApplyUpdateOptions {
  downloadDir?: string;
  fetchImpl?: typeof fetch;
}

export function applyUpdate(
  installerPath: string,
  platform = process.platform,
  spawnImpl: typeof spawn = spawn,
  options?: ApplyUpdateOptions
): { success: boolean; command: string; pid?: number; scriptPath?: string } {
  const trampoline = launchTrampolineUpdater({
    parentPid: options?.parentPid ?? process.pid,
    installerPath,
    targetExePath: options?.targetExePath ?? process.execPath,
    platform,
    spawnImpl,
    relaunchArgs: options?.relaunchArgs ?? 'start',
    logPath: options?.logPath,
    tempDir: options?.tempDir,
  });

  return {
    success: trampoline.success,
    command: trampoline.scriptPath,
    pid: trampoline.pid,
    scriptPath: trampoline.scriptPath,
  };
}

export async function applyAgentUpdate(
  apiUrl: string,
  currentVersion = AGENT_VERSION,
  options?: ApplyAgentUpdateOptions
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
  const execResult = applyUpdate(installerPath, options?.platform, options?.spawnImpl, options);

  return {
    success: true,
    message: `Update v${check.metadata.version} downloaded and trampoline launcher dispatched.`,
    version: check.metadata.version,
    installerPath,
    command: execResult.command,
  };
}

export async function handleUpdateCommand(
  apiUrl: string,
  currentVersion = AGENT_VERSION,
  options?: ApplyAgentUpdateOptions
): Promise<number> {
  console.log(`Checking for agent updates from ${apiUrl}...`);
  console.log(`Current version: v${currentVersion}`);
  const result = await applyAgentUpdate(apiUrl, currentVersion, {
    relaunchArgs: 'start',
    ...options,
  });
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
