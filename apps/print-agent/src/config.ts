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
  return process.env.SNAPPRINT_API_URL || 'http://127.0.0.1:3001';
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
    return {
      apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : getDefaultApiUrl(),
      deviceToken: typeof parsed.deviceToken === 'string' ? parsed.deviceToken : undefined,
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
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

export function clearAgentConfig(customPath?: string): void {
  const filePath = customPath || getDefaultConfigPath();
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}
