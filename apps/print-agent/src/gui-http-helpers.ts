import { spawn } from 'node:child_process';
import { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AgentDaemon } from './daemon.js';

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

export interface LaunchWindowOptions {
  width?: number;
  height?: number;
  appId?: string;
  platform?: NodeJS.Platform;
  spawnImpl?: typeof spawn;
}

export function launchAppWindow(url: string, options: LaunchWindowOptions = {}): void {
  const platform = options.platform ?? process.platform;
  const width = options.width ?? 1280;
  const height = options.height ?? 820;
  const appId = options.appId ?? 'SnapPrintDesktop';
  const spawner = options.spawnImpl ?? spawn;

  try {
    let child;
    if (platform === 'win32') {
      child = spawner(
        'cmd.exe',
        [
          '/c',
          'start',
          'msedge',
          `--app=${url}`,
          `--app-id=${appId}`,
          `--window-size=${width},${height}`,
        ],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        }
      );
      child?.on?.('exit', (code: number | null) => {
        if (code && code !== 0) {
          const fb = spawner('cmd.exe', ['/c', 'start', '', url], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
          });
          fb?.on?.('error', () => {});
          fb?.unref?.();
        }
      });
    } else if (platform === 'darwin') {
      child = spawner('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      child = spawner('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
    child?.on?.('error', () => {});
    child?.unref?.();
  } catch {
    // Non-fatal if launcher cannot spawn
  }
}

export function launchGuiWindow(url: string, platform = process.platform): void {
  launchAppWindow(url, { width: 500, height: 700, appId: 'SnapPrintAgentSettings', platform });
}

export async function parseJsonBody<T>(req: IncomingMessage): Promise<T | null> {
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

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

export function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

export function sendFavicon(res: ServerResponse, base64: string): void {
  const buf = Buffer.from(base64, 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': buf.length,
    'Cache-Control': 'public, max-age=86400',
  });
  res.end(buf);
}
