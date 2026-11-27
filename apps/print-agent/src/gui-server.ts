import { createServer, Server } from 'node:http';
import { hostname } from 'node:os';
import { AGENT_VERSION, applyAgentUpdate, checkForUpdate } from './agent-updater.js';
import { AgentClient } from './agent-client.js';
import { getDefaultWebUrl, loadAgentConfig, saveAgentConfig, unpairAgent } from './config.js';
import { AgentDaemon } from './daemon.js';
import { FAVICON_BASE64 } from './gui-assets.js';
import { getGuiHtml } from './gui-html.js';
import { parseJsonBody, sendFavicon, sendHtml, sendJson } from './gui-http-helpers.js';
import { InFlightJobTracker } from './job-tracker.js';
import { shutdownGracefully } from './lifecycle.js';
import { SpoolerAdapter } from './spooler-adapter.js';

export { launchGuiWindow } from './gui-http-helpers.js';

export interface GuiServerHandle {
  server: Server;
  port: number;
  url: string;
  close: () => Promise<void>;
  shutdown: (delayMs?: number) => Promise<void>;
}

export interface GuiServerOptions {
  daemon?: AgentDaemon | null;
  skipAutoDaemon?: boolean;
}

export function createGuiServer(
  client: AgentClient,
  spooler: SpoolerAdapter,
  configPath?: string,
  inFlightTracker?: InFlightJobTracker,
  options?: GuiServerOptions
): Server {
  const localTracker = inFlightTracker || new InFlightJobTracker();
  let activeDaemon: AgentDaemon | null = options?.daemon ?? null;
  let pendingPrinterScan: Promise<Awaited<ReturnType<SpoolerAdapter['getPrinters']>>> | null = null;
  const getPrintersCoalesced = () => {
    if (!pendingPrinterScan) {
      pendingPrinterScan = spooler
        .getPrinters()
        .catch(() => [])
        .finally(() => {
          pendingPrinterScan = null;
        });
    }
    return pendingPrinterScan;
  };
  const initialConfig = loadAgentConfig(configPath);
  if (!activeDaemon && !options?.skipAutoDaemon && initialConfig.deviceToken) {
    activeDaemon = new AgentDaemon(initialConfig, client, spooler, {
      inFlightTracker: localTracker,
      configPath,
    });
    activeDaemon.start().catch(() => {});
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/') {
      return sendHtml(res, getGuiHtml());
    }

    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      return sendFavicon(res, FAVICON_BASE64);
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      if (activeDaemon?.revoked) {
        unpairAgent(configPath);
        activeDaemon = null;
      }
      const config = loadAgentConfig(configPath);
      return sendJson(res, 200, {
        isEnrolled: Boolean(config.deviceToken),
        studioId: config.studioId,
        studioName: config.studioName || (config.studioId ? 'Connected Studio' : undefined),
        deviceId: config.deviceId,
        computerName: config.deviceFriendlyName || hostname(),
        apiUrl: config.apiUrl,
        webUrl: config.webUrl || getDefaultWebUrl(),
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/printers') {
      const printers = await getPrintersCoalesced();
      return sendJson(res, 200, { printers });
    }

    if (req.method === 'GET' && url.pathname === '/api/jobs') {
      const tracker = activeDaemon?.getJobTracker() || localTracker;
      return sendJson(res, 200, { jobs: tracker.getRecentJobs() });
    }

    if (req.method === 'POST' && url.pathname === '/api/config') {
      const body = await parseJsonBody<{ apiUrl?: string }>(req);
      const newUrl = body?.apiUrl?.trim().replace(/\/+$/, '');
      if (newUrl && (newUrl.startsWith('http://') || newUrl.startsWith('https://'))) {
        const config = loadAgentConfig(configPath);
        config.apiUrl = newUrl;
        saveAgentConfig(config, configPath);
        return sendJson(res, 200, { success: true, apiUrl: config.apiUrl });
      }
      return sendJson(res, 400, { message: 'Valid http:// or https:// URL required.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/pair') {
      const body = await parseJsonBody<{ pairingCode?: string }>(req);
      const code = body?.pairingCode?.trim().toUpperCase();
      if (!code) return sendJson(res, 400, { message: 'Pairing code is required.' });

      const config = loadAgentConfig(configPath);
      const host = hostname();
      const rawPlat = process.platform;
      const osPlatform =
        rawPlat === 'win32' || rawPlat === 'darwin' || rawPlat === 'linux' ? rawPlat : 'linux';

      try {
        const enrollResult = await client.enroll(code, host, {
          hostname: host,
          agentVersion: AGENT_VERSION,
          osPlatform,
        });
        Object.assign(config, {
          deviceToken: enrollResult.deviceToken,
          studioId: enrollResult.studioId,
          studioName: enrollResult.studioName,
          deviceId: enrollResult.deviceId,
          deviceFriendlyName: host,
        });
        saveAgentConfig(config, configPath);
        if (activeDaemon) activeDaemon.stop();
        activeDaemon = new AgentDaemon(config, client, spooler, {
          inFlightTracker: localTracker,
          configPath,
        });
        activeDaemon.start().catch(() => {});
        return sendJson(res, 200, { success: true, ...enrollResult });
      } catch (err) {
        return sendJson(res, 400, {
          message: err instanceof Error ? err.message : 'Enrollment failed',
        });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/unpair') {
      if (activeDaemon) {
        activeDaemon.stop();
        activeDaemon = null;
      }
      unpairAgent(configPath);
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/sync') {
      const config = loadAgentConfig(configPath);
      if (config.deviceToken) {
        if (!activeDaemon) {
          activeDaemon = new AgentDaemon(config, client, spooler, {
            inFlightTracker: localTracker,
            configPath,
          });
          activeDaemon.start().catch(() => {});
        } else {
          await activeDaemon.syncOnce().catch(() => {
            if (activeDaemon?.revoked) {
              unpairAgent(configPath);
              activeDaemon = null;
            }
          });
        }
      }
      const printers = await getPrintersCoalesced();
      return sendJson(res, 200, { printers });
    }

    if (req.method === 'GET' && url.pathname === '/api/update/check') {
      return sendJson(
        res,
        200,
        await checkForUpdate(loadAgentConfig(configPath).apiUrl, AGENT_VERSION)
      );
    }

    if (req.method === 'POST' && url.pathname === '/api/update/apply') {
      const config = loadAgentConfig(configPath);
      const result = await applyAgentUpdate(config.apiUrl, AGENT_VERSION, { relaunchArgs: 'gui' });
      if (result.success)
        setTimeout(
          () => shutdownGracefully({ server, daemon: activeDaemon, exitProcess: true }),
          500
        );
      return sendJson(res, result.success ? 200 : 400, result);
    }

    res.writeHead(404).end('Not Found');
  });

  (server as unknown as { stopDaemon?: () => void }).stopDaemon = () => {
    activeDaemon?.stop();
    activeDaemon = null;
  };

  return server;
}

export async function startGuiServer(
  client: AgentClient,
  spooler: SpoolerAdapter,
  preferredPort = 48900,
  configPath?: string,
  inFlightTracker?: InFlightJobTracker,
  options?: GuiServerOptions
): Promise<GuiServerHandle> {
  const server = createGuiServer(client, spooler, configPath, inFlightTracker, options);

  return new Promise((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') server.listen(0, '127.0.0.1');
      else reject(err);
    });

    server.listen(preferredPort, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : preferredPort;
      resolve({
        server,
        port,
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            (server as unknown as { stopDaemon?: () => void }).stopDaemon?.();
            server.closeIdleConnections?.();
            server.closeAllConnections?.();
            server.close(() => done());
          }),
        shutdown: (delayMs?: number) => shutdownGracefully({ server, delayMs }),
      });
    });
  });
}
