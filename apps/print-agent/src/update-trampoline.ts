import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface TrampolineScriptOptions {
  parentPid: number;
  installerPath: string;
  targetExePath: string;
  logPath?: string;
  relaunchArgs?: string;
}

export interface LaunchTrampolineOptions extends TrampolineScriptOptions {
  platform?: NodeJS.Platform;
  tempDir?: string;
  spawnImpl?: typeof spawn;
}

export function getDefaultUpdateLogPath(): string {
  const baseDir = process.env.SNAPPRINT_CONFIG_DIR || join(homedir(), '.snapprint');
  return join(baseDir, 'update.log');
}

function escapePs(str: string): string {
  return str.replace(/'/g, "''");
}

export function buildWindowsTrampolineScript(options: TrampolineScriptOptions): string {
  const log = escapePs(options.logPath || getDefaultUpdateLogPath());
  const installer = escapePs(options.installerPath);
  const target = escapePs(options.targetExePath);
  const args = options.relaunchArgs || 'start';

  return `
$ParentPid = ${options.parentPid}
$InstallerPath = '${installer}'
$TargetExe = '${target}'
$LogFile = '${log}'
$RelaunchArgs = '${args}'

function Log($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}

Log "=== SnapPrint In-Place Updater Started ==="
Log "Target Executable: $TargetExe"
Log "Installer: $InstallerPath"

if ($ParentPid -gt 0) {
  Log "Waiting for parent agent (PID: $ParentPid) to shut down..."
  try {
    $proc = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
    if ($proc) {
      $proc | Wait-Process -Timeout 15 -ErrorAction SilentlyContinue
    }
  } catch {}

  $proc = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
  if ($proc) {
    Log "Parent process did not exit within timeout. Forcing termination..."
    Stop-Process -Id $ParentPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

$bakFile = "$TargetExe.bak"
if (Test-Path $TargetExe) {
  Log "Backing up existing binary to $bakFile..."
  Copy-Item -Path $TargetExe -Destination $bakFile -Force
}

$isMsi = $InstallerPath.ToLower().EndsWith('.msi')
$updateSucceeded = $false

if ($isMsi) {
  Log "Executing MSI installer..."
  $msiProc = Start-Process msiexec.exe -ArgumentList "/i \`"$InstallerPath\`" /passive /norestart" -Wait -PassThru
  $code = $msiProc.ExitCode
  Log "MSI exit code: $code"
  if ($code -eq 0 -or $code -eq 3010) {
    $updateSucceeded = $true
  }
} else {
  Log "Replacing executable binary..."
  Copy-Item -Path $InstallerPath -Destination $TargetExe -Force
  $updateSucceeded = $true
}

if ($updateSucceeded -and (Test-Path $TargetExe)) {
  Log "Smoke testing updated binary..."
  try {
    $verOut = & $TargetExe --version
    Log "Verified updated agent version: $verOut"
    if (Test-Path $bakFile) { Remove-Item -Path $bakFile -Force -ErrorAction SilentlyContinue }
  } catch {
    Log "Smoke test failed. Rolling back..."
    $updateSucceeded = $false
  }
}

if (-not $updateSucceeded) {
  Log "[ROLLBACK] Restoring previous working binary..."
  if (Test-Path $bakFile) {
    Copy-Item -Path $bakFile -Destination $TargetExe -Force
    Log "Restored backup successfully."
  }
}

Log "Relaunching SnapPrint Agent with: $RelaunchArgs"
Start-Process -FilePath $TargetExe -ArgumentList $RelaunchArgs
Log "=== Update Sequence Finished ==="
`.trim();
}

export function buildPosixTrampolineScript(options: TrampolineScriptOptions): string {
  const log = options.logPath || getDefaultUpdateLogPath();
  const installer = options.installerPath;
  const target = options.targetExePath;
  const args = options.relaunchArgs || 'start';

  return `#!/bin/sh
LOG="${log}"
log() { echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" >> "\$LOG" 2>&1; }

log "=== SnapPrint In-Place Updater Started ==="
if [ "${options.parentPid}" -gt 0 ]; then
  kill "${options.parentPid}" 2>/dev/null || true
  sleep 1
fi
if [ -f "${target}" ]; then
  cp "${target}" "${target}.bak"
fi
cp "${installer}" "${target}"
chmod +x "${target}"
if "${target}" --version >> "\$LOG" 2>&1; then
  rm -f "${target}.bak"
  log "Updated agent verified successfully."
else
  log "[ROLLBACK] Reverting to backup..."
  cp "${target}.bak" "${target}"
fi
nohup "${target}" ${args} >> "\$LOG" 2>&1 &
log "=== Update Sequence Finished ==="
`.trim();
}

export function createTrampolineScriptFile(
  options: TrampolineScriptOptions,
  platform = process.platform,
  tempDirectory = tmpdir()
): string {
  if (!existsSync(tempDirectory)) {
    mkdirSync(tempDirectory, { recursive: true });
  }

  const logPath = options.logPath || getDefaultUpdateLogPath();
  const logDir = dirname(logPath);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const isWin = platform === 'win32';
  const ext = isWin ? '.ps1' : '.sh';
  const scriptPath = join(tempDirectory, `snapprint-updater-${Date.now()}${ext}`);
  const content = isWin
    ? buildWindowsTrampolineScript({ ...options, logPath })
    : buildPosixTrampolineScript({ ...options, logPath });

  writeFileSync(scriptPath, content, { encoding: 'utf-8', mode: 0o755 });
  return scriptPath;
}

export function launchTrampolineUpdater(options: LaunchTrampolineOptions): {
  success: boolean;
  scriptPath: string;
  pid?: number;
} {
  const platform = options.platform ?? process.platform;
  const spawner = options.spawnImpl ?? spawn;
  const scriptPath = createTrampolineScriptFile(options, platform, options.tempDir);

  if (platform === 'win32') {
    const child = spawner(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }
    );
    child.unref();
    return { success: true, scriptPath, pid: child.pid };
  }

  const child = spawner('/bin/sh', [scriptPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { success: true, scriptPath, pid: child.pid };
}
