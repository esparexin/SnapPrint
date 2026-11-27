import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentClient } from './agent-client.js';
import { AgentConfig } from './config.js';
import { extractSessionFlags, runDesktopSession } from './desktop-runner.js';
import { launchAppWindow, launchGuiWindow } from './gui-http-helpers.js';
import { SpoolerAdapter } from './spooler-adapter.js';

describe('Desktop Runner & Session Lifecycle', () => {
  beforeEach(() => {
    process.env.SNAPPRINT_CONFIG_DIR = tmpdir();
    process.env.SNAPPRINT_TEST_MODE = '1';
  });

  const dummySpooler: SpoolerAdapter = {
    getPrinters: vi.fn().mockResolvedValue([]),
    printFile: vi.fn().mockResolvedValue(undefined),
  };

  it('runs desktop session and exits cleanly in test mode', async () => {
    const config: AgentConfig = {
      apiUrl: 'http://127.0.0.1:48999',
      webUrl: 'https://app.snapprint.in',
    };
    const client = new AgentClient(config.apiUrl);

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runDesktopSession({
      config,
      client,
      spooler: dummySpooler,
      mode: 'desktop',
    });

    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('SnapPrint Desktop Agent active in background and system tray.')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('SnapPrint Agent GUI running at: http://127.0.0.1:')
    );
    consoleLogSpy.mockRestore();
  });

  it('runs gui mode and launches settings window', async () => {
    const config: AgentConfig = {
      apiUrl: 'http://127.0.0.1:48999',
    };
    const client = new AgentClient(config.apiUrl);

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runDesktopSession({
      config,
      client,
      spooler: dummySpooler,
      mode: 'gui',
    });

    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('SnapPrint Agent GUI running at: http://127.0.0.1:')
    );
    consoleLogSpy.mockRestore();
  });

  it('starts background print agent daemon when device is enrolled', async () => {
    const config: AgentConfig = {
      apiUrl: 'http://127.0.0.1:48999',
      deviceToken: 'dummy-token',
      deviceId: 'dev-1',
      studioId: 'studio-1',
    };
    const client = new AgentClient(config.apiUrl);
    vi.spyOn(client, 'sendHeartbeat').mockResolvedValue({ timestamp: new Date().toISOString() });
    vi.spyOn(client, 'syncPrinters').mockResolvedValue({ count: 0 });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runDesktopSession({
      config,
      client,
      spooler: dummySpooler,
      mode: 'desktop',
    });

    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Background print agent daemon active and polling jobs.')
    );
    consoleLogSpy.mockRestore();
  });

  it('launchAppWindow and launchGuiWindow invoke correct platform commands', () => {
    const mockSpawn = vi.fn();

    // Windows msedge app mode
    launchAppWindow('https://app.snapprint.in', {
      platform: 'win32',
      width: 1280,
      height: 820,
      appId: 'SnapPrintDesktop',
      spawnImpl: mockSpawn as never,
    });
    expect(mockSpawn).toHaveBeenCalledWith(
      'cmd.exe',
      expect.arrayContaining([
        'start',
        'msedge',
        '--app=https://app.snapprint.in',
        '--app-id=SnapPrintDesktop',
        '--window-size=1280,820',
      ]),
      expect.objectContaining({ detached: true })
    );

    // macOS open
    mockSpawn.mockClear();
    launchAppWindow('https://app.snapprint.in', {
      platform: 'darwin',
      spawnImpl: mockSpawn as never,
    });
    expect(mockSpawn).toHaveBeenCalledWith(
      'open',
      ['https://app.snapprint.in'],
      expect.objectContaining({ detached: true })
    );

    // Linux xdg-open
    mockSpawn.mockClear();
    launchAppWindow('https://app.snapprint.in', {
      platform: 'linux',
      spawnImpl: mockSpawn as never,
    });
    expect(mockSpawn).toHaveBeenCalledWith(
      'xdg-open',
      ['https://app.snapprint.in'],
      expect.objectContaining({ detached: true })
    );

    // launchGuiWindow fallback
    expect(() => launchGuiWindow('http://127.0.0.1:42124')).not.toThrow();
  });

  it('extractSessionFlags parses tray worker, foreground, and minimized flags', () => {
    expect(extractSessionFlags(['desktop', '--minimized', '--foreground'], {})).toEqual({
      isDetachedWorker: false,
      foreground: true,
      minimized: true,
      filteredArgv: ['desktop'],
    });
    expect(extractSessionFlags(['gui', '--tray'], { SNAPPRINT_TRAY_WORKER: '1' })).toEqual({
      isDetachedWorker: true,
      foreground: false,
      minimized: true,
      filteredArgv: ['gui'],
    });
  });

  it('auto-detaches desktop session into silent tray worker on Windows', async () => {
    const config: AgentConfig = { apiUrl: 'http://127.0.0.1:48999' };
    const client = new AgentClient(config.apiUrl);
    const mockChild = { on: vi.fn(), unref: vi.fn() };
    const mockSpawn = vi.fn().mockReturnValue(mockChild);
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const exitCode = await runDesktopSession({
      config,
      client,
      spooler: dummySpooler,
      mode: 'desktop',
      platform: 'win32',
      testMode: false,
      isDetachedWorker: false,
      foreground: false,
      lockPath: join(tmpdir(), `nonexistent-snapprint-lock-${Date.now()}.lock`),
      spawnImpl: mockSpawn as never,
    });

    expect(exitCode).toBe(0);
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['desktop', '--tray-worker']),
      expect.objectContaining({ detached: true, windowsHide: true, stdio: 'ignore' })
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('SnapPrint Desktop Agent minimized to system tray.');
    consoleLogSpy.mockRestore();
  });
});
