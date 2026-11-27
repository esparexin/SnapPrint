import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  buildPosixTrampolineScript,
  buildWindowsTrampolineScript,
  createTrampolineScriptFile,
  getDefaultUpdateLogPath,
  launchTrampolineUpdater,
} from './update-trampoline.js';

describe('Update Trampoline & Rollback Engine', () => {
  it('returns valid default update log path within .snapprint directory', () => {
    const logPath = getDefaultUpdateLogPath();
    expect(logPath).toContain('.snapprint');
    expect(logPath.endsWith('update.log')).toBe(true);
  });

  it('builds Windows PowerShell trampoline with process wait, backup, test, and rollback', () => {
    const script = buildWindowsTrampolineScript({
      parentPid: 4567,
      installerPath: 'C:\\temp\\SnapPrint.msi',
      targetExePath: 'C:\\Program Files\\SnapPrint\\snapprint-agent.exe',
      logPath: 'C:\\Users\\Shop\\.snapprint\\update.log',
      relaunchArgs: 'gui',
    });

    expect(script).toContain('$ParentPid = 4567');
    expect(script).toContain('SnapPrint In-Place Updater Started');
    expect(script).toContain('Wait-Process -Timeout 15');
    expect(script).toContain('Stop-Process -Id $ParentPid -Force');
    expect(script).toContain('Copy-Item -Path $TargetExe -Destination $bakFile');
    expect(script).toContain('Start-Process msiexec.exe');
    expect(script).toContain('-Verb RunAs');
    expect(script).toContain('& $TargetExe --version');
    expect(script).toContain('[ROLLBACK] Restoring previous working binary');
    expect(script).toContain('Copy-Item -Path $bakFile -Destination $TargetExe -Force');
    expect(script).toContain('Start-Process -FilePath $TargetExe -ArgumentList $RelaunchArgs');
  });

  it('builds POSIX shell trampoline with wait, backup, test, and rollback', () => {
    const script = buildPosixTrampolineScript({
      parentPid: 7890,
      installerPath: '/tmp/snapprint-agent-new',
      targetExePath: '/usr/local/bin/snapprint-agent',
      logPath: '/tmp/test-update.log',
      relaunchArgs: 'start',
    });

    expect(script).toContain('#!/bin/sh');
    expect(script).toContain('kill "7890"');
    expect(script).toContain(
      'cp "/usr/local/bin/snapprint-agent" "/usr/local/bin/snapprint-agent.bak"'
    );
    expect(script).toContain('chmod +x "/usr/local/bin/snapprint-agent"');
    expect(script).toContain('[ROLLBACK] Reverting to backup');
    expect(script).toContain('nohup "/usr/local/bin/snapprint-agent" start');
  });

  it('creates physical trampoline script file on disk in temporary directory', () => {
    const tempDir = join(tmpdir(), `trampoline-test-${Date.now()}`);
    const scriptPath = createTrampolineScriptFile(
      {
        parentPid: 1234,
        installerPath: '/tmp/installer.msi',
        targetExePath: '/tmp/agent.exe',
        logPath: join(tempDir, 'update.log'),
      },
      'win32',
      tempDir
    );

    expect(existsSync(scriptPath)).toBe(true);
    expect(scriptPath.endsWith('.ps1')).toBe(true);
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('$ParentPid = 1234');
    unlinkSync(scriptPath);
  });

  it('spawns detached powershell process on win32 platform', () => {
    const mockSpawn = vi.fn().mockReturnValue({
      pid: 9988,
      unref: vi.fn(),
    });

    const tempDir = join(tmpdir(), `trampoline-launch-${Date.now()}`);
    const result = launchTrampolineUpdater({
      parentPid: 1122,
      installerPath: 'C:\\installer.msi',
      targetExePath: 'C:\\agent.exe',
      platform: 'win32',
      tempDir,
      logPath: join(tempDir, 'update.log'),
      spawnImpl: mockSpawn as unknown as typeof import('node:child_process').spawn,
    });

    expect(result.success).toBe(true);
    expect(result.pid).toBe(9988);
    expect(mockSpawn).toHaveBeenCalledWith(
      'powershell.exe',
      expect.arrayContaining(['-File', result.scriptPath]),
      expect.objectContaining({ detached: true })
    );

    if (existsSync(result.scriptPath)) {
      unlinkSync(result.scriptPath);
    }
  });

  it('spawns detached shell process on posix platforms', () => {
    const mockSpawn = vi.fn().mockReturnValue({
      pid: 3344,
      unref: vi.fn(),
    });

    const tempDir = join(tmpdir(), `trampoline-posix-${Date.now()}`);
    const result = launchTrampolineUpdater({
      parentPid: 5566,
      installerPath: '/tmp/new-agent',
      targetExePath: '/tmp/agent',
      platform: 'linux',
      tempDir,
      logPath: join(tempDir, 'update.log'),
      spawnImpl: mockSpawn as unknown as typeof import('node:child_process').spawn,
    });

    expect(result.success).toBe(true);
    expect(result.pid).toBe(3344);
    expect(mockSpawn).toHaveBeenCalledWith(
      '/bin/sh',
      [result.scriptPath],
      expect.objectContaining({ detached: true })
    );

    if (existsSync(result.scriptPath)) {
      unlinkSync(result.scriptPath);
    }
  });
});
