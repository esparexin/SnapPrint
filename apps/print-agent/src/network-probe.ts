import { createConnection } from 'node:net';

export function isUuidString(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export function isUncPath(portName: string): boolean {
  const p = (portName || '').trim();
  return p.startsWith('\\\\') || p.startsWith('//');
}

export function extractNetworkHost(portName?: string): string | null {
  if (!portName) return null;
  const p = portName.trim();
  if (!p) return null;

  if (isUncPath(p)) {
    const match = p.match(/^[\\/]{2}([^\\/]+)/);
    if (match && match[1]) {
      const h = match[1].trim();
      return h || null;
    }
  }

  const ipMatch = p.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (ipMatch) return ipMatch[0];

  const cleaned = p.replace(/^(?:IP_|WSD-|TCP_)/i, '').trim();
  if (isUuidString(cleaned)) {
    return null;
  }

  if (/^[a-zA-Z0-9.-]+$/.test(cleaned) && !cleaned.toLowerCase().startsWith('usb')) {
    return cleaned;
  }
  return null;
}

export function probeTcpPort(host: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: timeoutMs });

    const finish = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

export async function checkNetworkPrinterReachable(
  host: string,
  port = 9100,
  timeoutMs = 800,
  isUnc = false
): Promise<boolean> {
  if (isUnc) {
    const smbReachable = await probeTcpPort(host, 445, timeoutMs);
    if (smbReachable) return true;
    return probeTcpPort(host, 139, timeoutMs);
  }

  const primary = await probeTcpPort(host, port, timeoutMs);
  if (primary) return true;

  if (port === 9100) {
    return probeTcpPort(host, 631, Math.min(timeoutMs, 600));
  }

  return false;
}
