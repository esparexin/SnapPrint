import { createServer, Server } from 'node:http';
import { hostname } from 'node:os';
import { AGENT_VERSION, applyAgentUpdate, checkForUpdate } from './agent-updater.js';
import { AgentClient } from './agent-client.js';
import { loadAgentConfig, saveAgentConfig, unpairAgent } from './config.js';
import { AgentDaemon } from './daemon.js';
import { FAVICON_BASE64, getGuiHtml } from './gui-html.js';
import { launchGuiWindow, parseJsonBody, sendJson } from './gui-http-helpers.js';
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

export function createGuiServer(
  client: AgentClient,
  spooler: SpoolerAdapter,
  configPath?: string
): Server {
  let activeDaemon: AgentDaemon | null = null;
  const initialConfig = loadAgentConfig(configPath);
  if (initialConfig.deviceToken) {
    activeDaemon = new AgentDaemon(initialConfig, client, spooler);
    activeDaemon.start().catch(() => {});
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(getGuiHtml());
    }

    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      const buf = Buffer.from(FAVICON_BASE64, 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buf.length,
        'Cache-Control': 'public, max-age=86400',
      });
      return res.end(buf);
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      const config = loadAgentConfig(configPath);
      return sendJson(res, 200, {
        isEnrolled: Boolean(config.deviceToken),
        studioId: config.studioId,
        deviceId: config.deviceId,
        apiUrl: config.apiUrl,
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/printers') {
      const printers = await spooler.getPrinters().catch(() => []);
      return sendJson(res, 200, { printers });
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
      if (!code) {
        return sendJson(res, 400, { message: 'Pairing code is required.' });
      }

      const config = loadAgentConfig(configPath);
      const host = hostname();
      const rawPlat = process.platform;
      const osPlatform =
        rawPlat === 'win32' || rawPlat === 'darwin' || rawPlat === 'linux' ? rawPlat : 'linux';

      try {
        const enrollResult = await client.enroll(code, host, {
          hostname: host,
          agentVersion: '0.1.0',
          osPlatform,
        });

        Object.assign(config, {
          deviceToken: enrollResult.deviceToken,
          studioId: enrollResult.studioId,
          deviceId: enrollResult.deviceId,
          deviceFriendlyName: host,
        });
        saveAgentConfig(config, configPath);

        if (activeDaemon) activeDaemon.stop();
        activeDaemon = new AgentDaemon(config, client, spooler);
        activeDaemon.start().catch(() => {});

        return sendJson(res, 200, {
          success: true,
          studioId: enrollResult.studioId,
          deviceId: enrollResult.deviceId,
        });
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
          activeDaemon = new AgentDaemon(config, client, spooler);
          activeDaemon.start().catch(() => {});
        } else {
          await activeDaemon.syncOnce().catch(() => {});
        }
      }
      const printers = await spooler.getPrinters().catch(() => []);
      return sendJson(res, 200, { printers });
    }

    if (req.method === 'GET' && url.pathname === '/api/update/check') {
      const config = loadAgentConfig(configPath);
      const update = await checkForUpdate(config.apiUrl, AGENT_VERSION);
      return sendJson(res, 200, update);
    }

    if (req.method === 'POST' && url.pathname === '/api/update/apply') {
      const config = loadAgentConfig(configPath);
      const result = await applyAgentUpdate(config.apiUrl, AGENT_VERSION);
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
  configPath?: string
): Promise<GuiServerHandle> {
  const server = createGuiServer(client, spooler, configPath);

  return new Promise((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0, '127.0.0.1');
      } else {
        reject(err);
      }
    });

    server.listen(preferredPort, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : preferredPort;
      const url = `http://127.0.0.1:${port}`;
      resolve({
        server,
        port,
        url,
        close: () =>
          new Promise((done) => {
            (server as unknown as { stopDaemon?: () => void }).stopDaemon?.();
            server.close(() => done());
          }),
        shutdown: (delayMs?: number) =>
          shutdownGracefully({
            server,
            delayMs,
          }),
      });
    });
  });
}
