import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface AgentConfig {
  apiUrl: string;
  deviceToken?: string;
  studioId?: string;
  deviceId?: string;
  deviceFriendlyName?: string;
  lastSyncAt?: string;
}

export function getDefaultConfigPath(): string {
  if (process.env.SNAPPRINT_CONFIG_PATH) {
    return process.env.SNAPPRINT_CONFIG_PATH;
  }
  const baseDir = process.env.SNAPPRINT_CONFIG_DIR || join(homedir(), '.snapprint');
  return join(baseDir, 'agent-config.json');
}

export function getDefaultApiUrl(): string {
  return process.env.SNAPPRINT_API_URL || 'https://api.snapprint.in';
}

export function protectCredential(plainText: string, platform = process.platform): string {
  if (!plainText) return '';
  if (platform === 'win32') {
    try {
      const psCommand = `
        Add-Type -AssemblyName System.Security;
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('${plainText.replace(/'/g, "''")}');
        $enc = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser);
        [Convert]::ToBase64String($enc)
      `.replace(/\s+/g, ' ');
      const result = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return `dpapi:${result.trim()}`;
    } catch {
      // Fallback if PowerShell invocation is unavailable
      return plainText;
    }
  }
  return plainText;
}

export function unprotectCredential(cipherText: string, platform = process.platform): string {
  if (!cipherText) return '';
  if (cipherText.startsWith('dpapi:') && platform === 'win32') {
    const rawBase64 = cipherText.slice(6);
    try {
      const psCommand = `
        Add-Type -AssemblyName System.Security;
        $enc = [Convert]::FromBase64String('${rawBase64}');
        $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect($enc, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser);
        [System.Text.Encoding]::UTF8.GetString($bytes)
      `.replace(/\s+/g, ' ');
      const result = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return result.trim();
    } catch {
      return cipherText;
    }
  }
  return cipherText.startsWith('dpapi:') ? cipherText.slice(6) : cipherText;
}

export function loadAgentConfig(customPath?: string): AgentConfig {
  const filePath = customPath || getDefaultConfigPath();
  const fallback: AgentConfig = { apiUrl: getDefaultApiUrl() };

  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const rawToken = typeof parsed.deviceToken === 'string' ? parsed.deviceToken : undefined;
    const deviceToken = rawToken ? unprotectCredential(rawToken) : undefined;

    return {
      apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : getDefaultApiUrl(),
      deviceToken,
      studioId: typeof parsed.studioId === 'string' ? parsed.studioId : undefined,
      deviceId: typeof parsed.deviceId === 'string' ? parsed.deviceId : undefined,
      deviceFriendlyName:
        typeof parsed.deviceFriendlyName === 'string' ? parsed.deviceFriendlyName : undefined,
      lastSyncAt: typeof parsed.lastSyncAt === 'string' ? parsed.lastSyncAt : undefined,
    };
  } catch {
    return fallback;
  }
}

export function saveAgentConfig(config: AgentConfig, customPath?: string): void {
  const filePath = customPath || getDefaultConfigPath();
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const tokenToStore = config.deviceToken ? protectCredential(config.deviceToken) : undefined;
  const toSave = {
    ...config,
    deviceToken: tokenToStore,
  };

  writeFileSync(filePath, JSON.stringify(toSave, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function unpairAgent(customPath?: string): void {
  const current = loadAgentConfig(customPath);
  saveAgentConfig({ apiUrl: current.apiUrl }, customPath);
}

export function clearAgentConfig(customPath?: string): void {
  const filePath = customPath || getDefaultConfigPath();
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}
