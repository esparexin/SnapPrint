import { ChildProcess, spawn, spawnSync } from 'node:child_process';

export interface SystemTrayOptions {
  url: string;
  desktopUrl?: string;
  onExit?: () => void;
  platform?: NodeJS.Platform;
  spawnImpl?: typeof spawn;
  spawnSyncImpl?: typeof spawnSync;
}

export interface SystemTrayHandle {
  supported: boolean;
  stop: () => void;
}

export interface DetachedWorkerOptions {
  mode: 'desktop' | 'gui';
  minimized?: boolean;
  platform?: NodeJS.Platform;
  execPath?: string;
  execArgv?: string[];
  argv?: string[];
  env?: NodeJS.ProcessEnv;
  spawnImpl?: typeof spawn;
}

export function isStandaloneExecutable(
  execPath = process.execPath,
  argv1 = process.argv[1],
  env = process.env
): boolean {
  if (env.SNAPPRINT_AGENT_STANDALONE) return true;
  const normExec = execPath.replace(/\\/g, '/').toLowerCase();
  if (!normExec.endsWith('/node') && !normExec.endsWith('/node.exe')) {
    return true;
  }
  const normArg1 = (argv1 || '').replace(/\\/g, '/').toLowerCase();
  return normArg1 === normExec || normArg1.endsWith('.exe');
}

/**
 * Spawns a detached, windowless background worker for the desktop/tray session
 * so the launching console/Windows Terminal window closes or returns immediately.
 */
export function launchDetachedTrayWorker(options: DetachedWorkerOptions): boolean {
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32') return false;

  const execPath = options.execPath ?? process.execPath;
  const argv = options.argv ?? process.argv;
  const execArgv = options.execArgv ?? process.execArgv;
  const env = options.env ?? process.env;
  const spawner = options.spawnImpl ?? spawn;

  const workerArgs = [options.mode, '--tray-worker'];
  if (options.minimized) {
    workerArgs.push('--minimized');
  }

  const standalone = isStandaloneExecutable(execPath, argv[1], env);
  const spawnArgs = standalone
    ? workerArgs
    : [...execArgv, ...(argv[1] ? [argv[1]] : []), ...workerArgs];

  try {
    const child = spawner(execPath, spawnArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...env, SNAPPRINT_TRAY_WORKER: '1' },
    });
    child?.on?.('error', () => {});
    child?.unref?.();
    return true;
  } catch {
    return false;
  }
}

export function hideConsoleWindow(
  platform: NodeJS.Platform = process.platform,
  spawnSyncImpl?: typeof spawnSync,
  parentPid = process.pid
): void {
  if (platform !== 'win32') return;
  try {
    const psCmd = `$w=Add-Type -Name W -Namespace C -MemberDefinition '[DllImport("Kernel32.dll")]public static extern bool AttachConsole(int p);[DllImport("Kernel32.dll")]public static extern IntPtr GetConsoleWindow();[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);' -PassThru;$w::AttachConsole(${parentPid})|Out-Null;$h=$w::GetConsoleWindow();if($h -ne [IntPtr]::Zero){$w::ShowWindow($h,0)}`;
    const args = ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd];
    if (spawnSyncImpl) {
      spawnSyncImpl('powershell.exe', args, {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 2500,
      });
      return;
    }
    const child = spawn('powershell.exe', args, {
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => {});
    child.unref();
  } catch {
    // Non-fatal if console hiding is unsupported
  }
}

export function buildTrayScript(url: string, desktopUrl?: string): string {
  const items: string[] = [
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    '$notify = New-Object System.Windows.Forms.NotifyIcon',
    '$notify.Icon = [System.Drawing.SystemIcons]::Application',
    '$notify.Text = "SnapPrint Desktop Print Agent"',
    '$notify.Visible = $true',
    '$menu = New-Object System.Windows.Forms.ContextMenuStrip',
  ];

  if (desktopUrl) {
    items.push(
      '$desktopItem = $menu.Items.Add("Open SnapPrint Desktop")',
      `$desktopItem.add_Click({ try { Start-Process "msedge" "--app=${desktopUrl} --app-id=SnapPrintDesktop --window-size=1280,820" -ErrorAction Stop } catch { Start-Process "${desktopUrl}" } })`,
      '$settingsItem = $menu.Items.Add("Printer Settings & Queue")',
      `$settingsItem.add_Click({ try { Start-Process "msedge" "--app=${url} --app-id=SnapPrintAgentSettings --window-size=500,700" -ErrorAction Stop } catch { Start-Process "${url}" } })`
    );
  } else {
    items.push(
      '$openItem = $menu.Items.Add("Open SnapPrint")',
      `$openItem.add_Click({ try { Start-Process "msedge" "--app=${url} --window-size=500,700" -ErrorAction Stop } catch { Start-Process "${url}" } })`
    );
  }

  const primaryArgs = desktopUrl
    ? `--app=${desktopUrl} --app-id=SnapPrintDesktop --window-size=1280,820`
    : `--app=${url} --window-size=500,700`;
  const primaryFallback = desktopUrl || url;

  items.push(
    '$sep = New-Object System.Windows.Forms.ToolStripSeparator',
    '$menu.Items.Add($sep) | Out-Null',
    '$exitItem = $menu.Items.Add("Exit")',
    '$exitItem.add_Click({ $notify.Visible = $false; [System.Windows.Forms.Application]::Exit() })',
    '$notify.ContextMenuStrip = $menu',
    `$notify.add_DoubleClick({ try { Start-Process "msedge" "${primaryArgs}" -ErrorAction Stop } catch { Start-Process "${primaryFallback}" } })`,
    '[System.Windows.Forms.Application]::Run()'
  );

  return items.join('\n');
}

export function startSystemTray(options: SystemTrayOptions): SystemTrayHandle {
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32') {
    return { supported: false, stop: () => {} };
  }

  const spawner = options.spawnImpl ?? spawn;
  const script = buildTrayScript(options.url, options.desktopUrl);

  let proc: ChildProcess | null = null;
  try {
    proc = spawner(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
      {
        detached: false,
        stdio: 'ignore',
        windowsHide: true,
      }
    );

    if (proc) {
      proc.on('error', () => {
        // Non-fatal if tray host fails to launch
      });
      if (options.onExit) {
        proc.on('exit', (code) => {
          if (code === 0 || code === null) {
            options.onExit?.();
          }
        });
      }
    }
  } catch {
    return { supported: false, stop: () => {} };
  }

  return {
    supported: true,
    stop: () => {
      try {
        proc?.kill();
      } catch {
        // ignore
      }
    },
  };
}
