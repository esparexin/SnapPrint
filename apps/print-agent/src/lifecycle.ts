import { Server } from 'node:http';
import { AgentDaemon } from './daemon.js';
import { releaseInstanceLock } from './instance-lock.js';

export interface ShutdownOptions {
  delayMs?: number;
  server?: Server;
  daemon?: AgentDaemon | null;
  tray?: { stop: () => void } | null;
  lockPath?: string;
  exitProcess?: boolean;
  exitCode?: number;
}

export interface LifecycleCoordinator {
  registerServer: (server: Server) => void;
  registerDaemon: (daemon: AgentDaemon | null) => void;
  registerTray: (tray: { stop: () => void } | null) => void;
  shutdown: (options?: Partial<ShutdownOptions>) => Promise<void>;
}

export async function shutdownGracefully(options: ShutdownOptions = {}): Promise<void> {
  const delay = options.delayMs ?? 0;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  try {
    options.daemon?.stop();
  } catch {
    // Non-fatal cleanup
  }

  try {
    options.tray?.stop();
  } catch {
    // Non-fatal cleanup
  }

  if (options.server) {
    await new Promise<void>((resolve) => {
      try {
        options.server?.close(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  try {
    releaseInstanceLock(options.lockPath);
  } catch {
    // Non-fatal cleanup
  }

  if (options.exitProcess) {
    process.exit(options.exitCode ?? 0);
  }
}

export function createLifecycleCoordinator(
  defaultOptions: ShutdownOptions = {}
): LifecycleCoordinator {
  let activeServer: Server | undefined = defaultOptions.server;
  let activeDaemon: AgentDaemon | null | undefined = defaultOptions.daemon;
  let activeTray: { stop: () => void } | null | undefined = defaultOptions.tray;

  return {
    registerServer: (s: Server) => {
      activeServer = s;
    },
    registerDaemon: (d: AgentDaemon | null) => {
      activeDaemon = d;
    },
    registerTray: (t: { stop: () => void } | null) => {
      activeTray = t;
    },
    shutdown: async (overrides: Partial<ShutdownOptions> = {}) => {
      await shutdownGracefully({
        ...defaultOptions,
        server: activeServer,
        daemon: activeDaemon,
        tray: activeTray,
        ...overrides,
      });
    },
  };
}
