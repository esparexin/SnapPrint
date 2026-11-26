import { spawn } from 'node:child_process';
import { IncomingMessage, ServerResponse } from 'node:http';

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
