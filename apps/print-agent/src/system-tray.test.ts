import { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import {
  buildTrayScript,
  hideConsoleWindow,
  isStandaloneExecutable,
  launchDetachedTrayWorker,
  startSystemTray,
} from './system-tray.js';

describe('System Tray & Silent Background Execution', () => {
  it('returns supported=false on non-Windows platforms', () => {
    const handle = startSystemTray({
      url: 'http://127.0.0.1:48900',
      platform: 'darwin',
    });
    expect(handle.supported).toBe(false);
    expect(() => handle.stop()).not.toThrow();
  });

  it('hideConsoleWindow is a no-op on non-Windows platforms', () => {
    const mockSpawnSync = vi.fn();
    hideConsoleWindow('darwin', mockSpawnSync as never);
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it('hideConsoleWindow attaches to parent console and invokes PowerShell hidden on Windows', () => {
    const mockSpawnSync = vi.fn();
    hideConsoleWindow('win32', mockSpawnSync as never, 4242);
    expect(mockSpawnSync).toHaveBeenCalledWith(
      'powershell.exe',
      expect.arrayContaining([
        '-WindowStyle',
        'Hidden',
        expect.stringContaining('AttachConsole(4242)'),
      ]),
      expect.objectContaining({ windowsHide: true })
    );
  });

  it('detects standalone executables vs node/tsx script invocations', () => {
    expect(
      isStandaloneExecutable('C:\\Program Files\\SnapPrint\\snapprint-agent.exe', '', {})
    ).toBe(true);
    expect(
      isStandaloneExecutable(
        'C:\\Program Files\\nodejs\\node.exe',
        'C:\\Program Files\\SnapPrint\\snapprint-agent.exe',
        {}
      )
    ).toBe(true);
    expect(
      isStandaloneExecutable('C:\\Program Files\\nodejs\\node.exe', 'C:\\app\\dist\\cli.js', {})
    ).toBe(false);
  });

  it('launchDetachedTrayWorker spawns a detached windowless background process on Windows', () => {
    const mockChild = { on: vi.fn(), unref: vi.fn() };
    const mockSpawn = vi.fn().mockReturnValue(mockChild);

    const launched = launchDetachedTrayWorker({
      mode: 'desktop',
      minimized: true,
      platform: 'win32',
      execPath: 'C:\\Program Files\\SnapPrint\\snapprint-agent.exe',
      argv: ['C:\\Program Files\\SnapPrint\\snapprint-agent.exe'],
      execArgv: [],
      env: {},
      spawnImpl: mockSpawn as never,
    });

    expect(launched).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith(
      'C:\\Program Files\\SnapPrint\\snapprint-agent.exe',
      ['desktop', '--tray-worker', '--minimized'],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: expect.objectContaining({ SNAPPRINT_TRAY_WORKER: '1' }),
      })
    );
    expect(mockChild.unref).toHaveBeenCalled();

    expect(
      launchDetachedTrayWorker({
        mode: 'desktop',
        platform: 'linux',
        spawnImpl: mockSpawn as never,
      })
    ).toBe(false);
  });

  it('buildTrayScript generates valid PowerShell script with URL and menu items', () => {
    const script = buildTrayScript('http://127.0.0.1:48900');
    expect(script).toContain('System.Windows.Forms.NotifyIcon');
    expect(script).toContain('Open SnapPrint');
    expect(script).toContain('Exit');
    expect(script).toContain('http://127.0.0.1:48900');
    expect(script).toContain('[System.Windows.Forms.Application]::Run()');
  });

  it('buildTrayScript includes Open SnapPrint Desktop and Printer Settings when desktopUrl provided', () => {
    const script = buildTrayScript('http://127.0.0.1:48900', 'https://app.snapprint.in');
    expect(script).toContain('Open SnapPrint Desktop');
    expect(script).toContain('Printer Settings & Queue');
    expect(script).toContain('https://app.snapprint.in');
    expect(script).toContain('http://127.0.0.1:48900');
    expect(script).toContain('--app-id=SnapPrintDesktop');
    expect(script).toContain('--window-size=1280,820');
  });

  it('spawns PowerShell on Windows and triggers onExit when process terminates', () => {
    const mockProc = new EventEmitter() as unknown as ChildProcess & { kill: () => void };
    mockProc.kill = vi.fn();

    const mockSpawn = vi.fn().mockReturnValue(mockProc);
    const onExit = vi.fn();

    const handle = startSystemTray({
      url: 'http://127.0.0.1:48900',
      platform: 'win32',
      spawnImpl: mockSpawn as never,
      onExit,
    });

    expect(handle.supported).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith(
      'powershell.exe',
      expect.arrayContaining(['-WindowStyle', 'Hidden']),
      expect.objectContaining({ windowsHide: true })
    );

    mockProc.emit('exit', 0);
    expect(onExit).toHaveBeenCalledTimes(1);

    handle.stop();
    expect(mockProc.kill).toHaveBeenCalled();
  });
});
