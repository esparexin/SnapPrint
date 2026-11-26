import { spawn } from 'node:child_process';
import { IncomingMessage, ServerResponse } from 'node:http';

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
    if (platform === 'win32') {
      spawner(
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
        }
      );
    } else if (platform === 'darwin') {
      spawner('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      spawner('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
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
