import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface AgentConfig {
  apiUrl: string;
  webUrl?: string;
  deviceToken?: string;
  studioId?: string;
  studioName?: string;
  deviceId?: string;
  deviceFriendlyName?: string;
  lastSyncAt?: string;
  allowVirtualPrinters?: boolean;
}

export function getDefaultConfigPath(): string {
  if (process.env.SNAPPRINT_CONFIG_PATH) {
    return process.env.SNAPPRINT_CONFIG_PATH;
  }
  const baseDir = process.env.SNAPPRINT_CONFIG_DIR || join(homedir(), '.snapprint');
  return join(baseDir, 'agent-config.json');
}

export function getDefaultApiUrl(): string {
  return process.env.SNAPPRINT_API_URL || 'https://snapprint.onrender.com';
}

export function getDefaultWebUrl(): string {
  return process.env.SNAPPRINT_WEB_URL || 'https://snap.palnadu.dev';
}

const dpapiProtectCache = new Map<string, string>();
const dpapiUnprotectCache = new Map<string, string>();

export function protectCredential(plainText: string, platform = process.platform): string {
  if (!plainText) return '';
  if (platform === 'win32') {
    const cached = dpapiProtectCache.get(plainText);
    if (cached) return cached;
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
        windowsHide: true,
        timeout: 4000,
      });
      const encrypted = `dpapi:${result.trim()}`;
      dpapiProtectCache.set(plainText, encrypted);
      dpapiUnprotectCache.set(encrypted, plainText);
      return encrypted;
    } catch {
      // Fallback if PowerShell invocation is unavailable or times out
      return plainText;
    }
  }
  return plainText;
}

export function unprotectCredential(cipherText: string, platform = process.platform): string {
  if (!cipherText) return '';
  if (cipherText.startsWith('dpapi:') && platform === 'win32') {
    const cached = dpapiUnprotectCache.get(cipherText);
    if (cached) return cached;
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
        windowsHide: true,
        timeout: 4000,
      });
      const decrypted = result.trim();
      dpapiUnprotectCache.set(cipherText, decrypted);
      dpapiProtectCache.set(decrypted, cipherText);
      return decrypted;
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

    let apiUrl = typeof parsed.apiUrl === 'string' ? parsed.apiUrl : getDefaultApiUrl();
    if (apiUrl === 'https://api.snapprint.in') {
      apiUrl = getDefaultApiUrl();
    }

    const webUrl =
      typeof parsed.webUrl === 'string' && parsed.webUrl.trim()
        ? parsed.webUrl.trim()
        : getDefaultWebUrl();

    return {
      apiUrl,
      webUrl,
      deviceToken,
      studioId: typeof parsed.studioId === 'string' ? parsed.studioId : undefined,
      studioName: typeof parsed.studioName === 'string' ? parsed.studioName : undefined,
      deviceId: typeof parsed.deviceId === 'string' ? parsed.deviceId : undefined,
      deviceFriendlyName:
        typeof parsed.deviceFriendlyName === 'string' ? parsed.deviceFriendlyName : undefined,
      lastSyncAt: typeof parsed.lastSyncAt === 'string' ? parsed.lastSyncAt : undefined,
      allowVirtualPrinters:
        typeof parsed.allowVirtualPrinters === 'boolean'
          ? parsed.allowVirtualPrinters
          : process.env.SNAPPRINT_ALLOW_VIRTUAL_PRINTERS === '1',
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
  saveAgentConfig({ apiUrl: current.apiUrl, webUrl: current.webUrl }, customPath);
}

export function clearAgentConfig(customPath?: string): void {
  const filePath = customPath || getDefaultConfigPath();
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}
