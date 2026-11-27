import { spawn } from 'node:child_process';
import { AgentClient } from './agent-client.js';
import { AgentConfig, getDefaultWebUrl } from './config.js';
import { AgentDaemon } from './daemon.js';
import { launchAppWindow, launchGuiWindow } from './gui-http-helpers.js';
import { startGuiServer } from './gui-server.js';
import {
  acquireInstanceLock,
  getRunningInstancePid,
  releaseInstanceLock,
} from './instance-lock.js';
import { shutdownGracefully } from './lifecycle.js';
import { SpoolerAdapter } from './spooler-adapter.js';
import { hideConsoleWindow, launchDetachedTrayWorker, startSystemTray } from './system-tray.js';

export interface DesktopRunnerOptions {
  config: AgentConfig;
  client: AgentClient;
  spooler: SpoolerAdapter;
  mode?: 'desktop' | 'gui';
  isDetachedWorker?: boolean;
  foreground?: boolean;
  minimized?: boolean;
  platform?: NodeJS.Platform;
  spawnImpl?: typeof spawn;
  testMode?: boolean;
  lockPath?: string;
}

export interface SessionFlags {
  isDetachedWorker: boolean;
  foreground: boolean;
  minimized: boolean;
  filteredArgv: string[];
}

export function extractSessionFlags(argv: string[], env = process.env): SessionFlags {
  const ignored = new Set(['--tray-worker', '--foreground', '--minimized', '--tray']);
  return {
    isDetachedWorker: argv.includes('--tray-worker') || env.SNAPPRINT_TRAY_WORKER === '1',
    foreground: argv.includes('--foreground') || env.SNAPPRINT_FOREGROUND === '1',
    minimized: argv.includes('--minimized') || argv.includes('--tray'),
    filteredArgv: argv.filter((a) => !ignored.has(a)),
  };
}

/**
 * Supervised desktop session: starts the local GUI server, launches
 * the standalone application shell (or settings window), runs background
 * printer daemon if enrolled, and maintains the system tray.
 */
export async function runDesktopSession(options: DesktopRunnerOptions): Promise<number> {
  const { config, client, spooler, mode = 'desktop' } = options;
  const webUrl = config.webUrl || getDefaultWebUrl();
  const portalUrl = `${webUrl.replace(/\/+$/, '')}/portal`;
  const isTestMode =
    options.testMode ??
    (process.env.NODE_ENV === 'test' || Boolean(process.env.SNAPPRINT_TEST_MODE));
  const platform = options.platform ?? process.platform;
  const isDetachedWorker =
    options.isDetachedWorker ??
    (process.env.SNAPPRINT_TRAY_WORKER === '1' || process.argv.includes('--tray-worker'));
  const foreground =
    options.foreground ??
    (process.env.SNAPPRINT_FOREGROUND === '1' || process.argv.includes('--foreground'));
  const minimized = options.minimized ?? process.argv.includes('--minimized');

  if (mode === 'desktop' && !isTestMode) {
    const runningPid = getRunningInstancePid(options.lockPath);
    if (runningPid !== null) {
      launchAppWindow(portalUrl, {
        width: 1280,
        height: 820,
        appId: 'SnapPrintDesktop',
      });
      console.log(`SnapPrint Agent is already running (PID: ${runningPid}). Focused app window.`);
      return 0;
    }
  }

  if (platform === 'win32' && !isTestMode && !isDetachedWorker && !foreground) {
    const detached = launchDetachedTrayWorker({
      mode,
      minimized,
      platform,
      spawnImpl: options.spawnImpl,
    });
    if (detached) {
      console.log('SnapPrint Desktop Agent minimized to system tray.');
      return 0;
    }
  }

  let daemon: AgentDaemon | undefined;
  let lockAcquired = false;
  if (mode === 'desktop') {
    const lock = acquireInstanceLock(options.lockPath);
    lockAcquired = lock.acquired;
    if (!lockAcquired && !isTestMode) {
      launchAppWindow(portalUrl, {
        width: 1280,
        height: 820,
        appId: 'SnapPrintDesktop',
      });
      console.log(
        `SnapPrint Agent is already running (PID: ${lock.pid ?? 'active'}). Focused app window.`
      );
      return 0;
    }
    if (config.deviceToken && lockAcquired) {
      daemon = new AgentDaemon(config, client, spooler);
      await daemon.start();
      console.log('Background print agent daemon active and polling jobs.');
    }
  }

  const handle = await startGuiServer(client, spooler, 48900, undefined, undefined, {
    daemon: daemon ?? null,
    skipAutoDaemon: mode === 'desktop',
  });

  if (!minimized) {
    if (mode === 'desktop') {
      launchAppWindow(portalUrl, { width: 1280, height: 820, appId: 'SnapPrintDesktop' });
      console.log(`SnapPrint Desktop App window launched: ${webUrl}`);
    } else {
      launchGuiWindow(handle.url);
    }
  }
  console.log(`SnapPrint Agent GUI running at: ${handle.url}`);

  if (isTestMode) {
    if (daemon) {
      daemon.stop();
    }
    if (lockAcquired) {
      releaseInstanceLock();
    }
    await handle.close();
    return 0;
  }

  let tray: { stop: () => void } | null = null;
  const handleExit = () => {
    if (daemon) {
      daemon.stop();
    }
    if (lockAcquired) {
      releaseInstanceLock();
    }
    shutdownGracefully({ server: handle.server, daemon, tray, exitProcess: true });
  };

  tray = startSystemTray({
    url: handle.url,
    desktopUrl: portalUrl,
    onExit: handleExit,
  });
  if (!foreground) {
    setImmediate(() => hideConsoleWindow(platform));
  }

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
  return new Promise(() => {});
}
