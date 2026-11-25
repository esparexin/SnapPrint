import { spawn } from 'node:child_process';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { hostname } from 'node:os';
import { AgentClient } from './agent-client.js';
import { loadAgentConfig, saveAgentConfig, unpairAgent } from './config.js';
import { AgentDaemon } from './daemon.js';
import { getGuiHtml } from './gui-html.js';
import { SpoolerAdapter } from './spooler-adapter.js';

export interface GuiServerHandle {
  server: Server;
  port: number;
  url: string;
  close: () => Promise<void>;
}

export function launchGuiWindow(url: string, platform = process.platform): void {
  try {
    if (platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', 'msedge', `--app=${url}`, '--window-size=500,700'], {
        detached: true,
        stdio: 'ignore',
      });
    } else if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
  } catch {
    // Non-fatal if launcher cannot spawn
  }
}

async function parseJsonBody<T>(req: IncomingMessage): Promise<T | null> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as T);
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

export function createGuiServer(
  client: AgentClient,
  spooler: SpoolerAdapter,
  configPath?: string
): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(getGuiHtml());
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      const config = loadAgentConfig(configPath);
      const printers = await spooler.getPrinters().catch(() => []);
      return sendJson(res, 200, {
        isEnrolled: Boolean(config.deviceToken),
        studioId: config.studioId,
        deviceId: config.deviceId,
        apiUrl: config.apiUrl,
        printers,
      });
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

        config.deviceToken = enrollResult.deviceToken;
        config.studioId = enrollResult.studioId;
        config.deviceId = enrollResult.deviceId;
        config.deviceFriendlyName = host;
        saveAgentConfig(config, configPath);

        const daemon = new AgentDaemon(config, client, spooler);
        await daemon.syncOnce().catch(() => {});

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
      unpairAgent(configPath);
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/sync') {
      const config = loadAgentConfig(configPath);
      if (config.deviceToken) {
        const daemon = new AgentDaemon(config, client, spooler);
        await daemon.syncOnce().catch(() => {});
      }
      const printers = await spooler.getPrinters().catch(() => []);
      return sendJson(res, 200, { printers });
    }

    res.writeHead(404).end('Not Found');
  });
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
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}
