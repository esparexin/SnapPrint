import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAgentConfig, loadAgentConfig, saveAgentConfig } from './config.js';

describe('Agent Config Store', () => {
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

  it('clears agent config file', () => {
    saveAgentConfig({ apiUrl: 'http://localhost:3001', deviceToken: 'tok_1' }, testConfigPath);
    expect(existsSync(testConfigPath)).toBe(true);

    clearAgentConfig(testConfigPath);
    expect(existsSync(testConfigPath)).toBe(false);
  });
});
