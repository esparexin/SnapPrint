import { AgentClient } from './agent-client.js';
import { AgentConfig, getDefaultWebUrl } from './config.js';
import { AgentDaemon } from './daemon.js';
import { launchAppWindow, launchGuiWindow } from './gui-http-helpers.js';
import { startGuiServer } from './gui-server.js';
import { acquireInstanceLock, releaseInstanceLock } from './instance-lock.js';
import { shutdownGracefully } from './lifecycle.js';
import { SpoolerAdapter } from './spooler-adapter.js';
import { hideConsoleWindow, startSystemTray } from './system-tray.js';

export interface DesktopRunnerOptions {
  config: AgentConfig;
  client: AgentClient;
  spooler: SpoolerAdapter;
  mode?: 'desktop' | 'gui';
}

/**
 * Supervised desktop session: starts the local GUI server, launches
 * the standalone application shell (or settings window), runs background
 * printer daemon if enrolled, and maintains the system tray.
 */
export async function runDesktopSession(options: DesktopRunnerOptions): Promise<number> {
  const { config, client, spooler, mode = 'desktop' } = options;
  const handle = await startGuiServer(client, spooler);
  const webUrl = config.webUrl || getDefaultWebUrl();

  if (mode === 'desktop') {
    launchAppWindow(webUrl, { width: 1280, height: 820, appId: 'SnapPrintDesktop' });
    console.log(`SnapPrint Desktop App window launched: ${webUrl}`);
  } else {
    launchGuiWindow(handle.url);
  }
  console.log(`SnapPrint Agent GUI running at: ${handle.url}`);

  let daemon: AgentDaemon | undefined;
  if (config.deviceToken && mode === 'desktop') {
    const lock = acquireInstanceLock();
    if (lock.acquired) {
      daemon = new AgentDaemon(config, client, spooler);
      await daemon.start();
      console.log('Background print agent daemon active and polling jobs.');
    }
  }

  if (process.env.NODE_ENV === 'test' || Boolean(process.env.SNAPPRINT_TEST_MODE)) {
    if (daemon) {
      daemon.stop();
      releaseInstanceLock();
    }
    await handle.close();
    return 0;
  }

  let tray: { stop: () => void } | null = null;
  const handleExit = () => {
    if (daemon) {
      daemon.stop();
      releaseInstanceLock();
    }
    shutdownGracefully({ server: handle.server, daemon, tray, exitProcess: true });
  };

  tray = startSystemTray({
    url: handle.url,
    desktopUrl: webUrl,
    onExit: handleExit,
  });
  hideConsoleWindow();

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
  return new Promise(() => {});
}
