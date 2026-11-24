import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearAgentConfig,
  loadAgentConfig,
  protectCredential,
  saveAgentConfig,
  unpairAgent,
  unprotectCredential,
} from './config.js';

describe('Agent Config Store & Credential Protection', () => {
  const testDir = join(tmpdir(), `snapprint-agent-test-${Date.now()}`);
  const testConfigPath = join(testDir, 'agent-config.json');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('returns fallback config when file does not exist', () => {
    const config = loadAgentConfig(testConfigPath);
    expect(config.apiUrl).toBeDefined();
    expect(config.deviceToken).toBeUndefined();
  });

  it('saves and reloads agent configuration correctly', () => {
    saveAgentConfig(
      {
        apiUrl: 'http://localhost:3001',
        deviceToken: 'tok_abc123',
        studioId: 'std_test',
        deviceId: 'dev_test',
        deviceFriendlyName: 'Shop-PC-FrontDesk',
        lastSyncAt: '2026-11-23T12:00:00.000Z',
      },
      testConfigPath
    );

    const loaded = loadAgentConfig(testConfigPath);
    expect(loaded.apiUrl).toBe('http://localhost:3001');
    expect(loaded.deviceToken).toBe('tok_abc123');
    expect(loaded.studioId).toBe('std_test');
    expect(loaded.deviceId).toBe('dev_test');
    expect(loaded.deviceFriendlyName).toBe('Shop-PC-FrontDesk');
    expect(loaded.lastSyncAt).toBe('2026-11-23T12:00:00.000Z');
  });

  it('protects and unprotects credentials across platforms', () => {
    const rawToken = 'device_tok_secret_999';
    const nonWinProtected = protectCredential(rawToken, 'darwin');
    expect(nonWinProtected).toBe(rawToken);
    expect(unprotectCredential(nonWinProtected, 'darwin')).toBe(rawToken);

    const winProtected = protectCredential(rawToken, 'win32');
    expect(typeof winProtected).toBe('string');
    expect(unprotectCredential(winProtected, 'win32')).toBe(rawToken);
  });

  it('unpairs agent by removing device credentials while preserving apiUrl', () => {
    saveAgentConfig(
      {
        apiUrl: 'http://custom-api:3001',
        deviceToken: 'tok_to_unpair',
        studioId: 'std_unpair',
        deviceId: 'dev_unpair',
      },
      testConfigPath
    );

    unpairAgent(testConfigPath);
    const afterUnpair = loadAgentConfig(testConfigPath);
    expect(afterUnpair.apiUrl).toBe('http://custom-api:3001');
    expect(afterUnpair.deviceToken).toBeUndefined();
    expect(afterUnpair.studioId).toBeUndefined();
    expect(afterUnpair.deviceId).toBeUndefined();
  });

  it('clears agent config file', () => {
    saveAgentConfig({ apiUrl: 'http://localhost:3001', deviceToken: 'tok_1' }, testConfigPath);
    expect(existsSync(testConfigPath)).toBe(true);

    clearAgentConfig(testConfigPath);
    expect(existsSync(testConfigPath)).toBe(false);
  });
});
