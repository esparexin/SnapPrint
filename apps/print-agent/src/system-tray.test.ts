import { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { buildTrayScript, hideConsoleWindow, startSystemTray } from './system-tray.js';

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

  it('hideConsoleWindow invokes PowerShell with hidden window style on Windows', () => {
    const mockSpawnSync = vi.fn();
    hideConsoleWindow('win32', mockSpawnSync as never);
    expect(mockSpawnSync).toHaveBeenCalledWith(
      'powershell.exe',
      expect.arrayContaining(['-WindowStyle', 'Hidden']),
      expect.objectContaining({ windowsHide: true })
    );
  });

  it('buildTrayScript generates valid PowerShell script with URL and menu items', () => {
    const script = buildTrayScript('http://127.0.0.1:48900');
    expect(script).toContain('System.Windows.Forms.NotifyIcon');
    expect(script).toContain('Open SnapPrint');
    expect(script).toContain('Exit');
    expect(script).toContain('http://127.0.0.1:48900');
    expect(script).toContain('[System.Windows.Forms.Application]::Run()');
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
