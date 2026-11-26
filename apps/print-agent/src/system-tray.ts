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

export function hideConsoleWindow(
  platform: NodeJS.Platform = process.platform,
  spawnSyncImpl: typeof spawnSync = spawnSync
): void {
  if (platform !== 'win32') return;
  try {
    const psCmd =
      '$w=Add-Type -Name W -Namespace C -MemberDefinition \'[DllImport("Kernel32.dll")]public static extern IntPtr GetConsoleWindow();[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);\' -PassThru;$w::ShowWindow($w::GetConsoleWindow(),0)';
    spawnSyncImpl(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd],
      {
        stdio: 'ignore',
        windowsHide: true,
      }
    );
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
      `$desktopItem.add_Click({ Start-Process "msedge" "--app=${desktopUrl} --app-id=SnapPrintDesktop --window-size=1280,820" })`,
      '$settingsItem = $menu.Items.Add("Printer Settings & Queue")',
      `$settingsItem.add_Click({ Start-Process "msedge" "--app=${url} --app-id=SnapPrintAgentSettings --window-size=500,700" })`
    );
  } else {
    items.push(
      '$openItem = $menu.Items.Add("Open SnapPrint")',
      `$openItem.add_Click({ Start-Process "msedge" "--app=${url} --window-size=500,700" })`
    );
  }

  const primaryArgs = desktopUrl
    ? `--app=${desktopUrl} --app-id=SnapPrintDesktop --window-size=1280,820`
    : `--app=${url} --window-size=500,700`;

  items.push(
    '$sep = New-Object System.Windows.Forms.ToolStripSeparator',
    '$menu.Items.Add($sep) | Out-Null',
    '$exitItem = $menu.Items.Add("Exit")',
    '$exitItem.add_Click({ $notify.Visible = $false; [System.Windows.Forms.Application]::Exit() })',
    '$notify.ContextMenuStrip = $menu',
    `$notify.add_DoubleClick({ Start-Process "msedge" "${primaryArgs}" })`,
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

    if (options.onExit && proc) {
      proc.on('exit', () => {
        options.onExit?.();
      });
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
