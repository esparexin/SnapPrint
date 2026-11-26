import { createConnection } from 'node:net';
import {
  CapabilityProvenance,
  DuplexSupport,
  PaperSize,
  PrinterConnectionType,
  PrinterStatus,
} from '@snapprint/contracts';
import {
  inferIsColorSupported,
  inferSupportedPaperSizes,
  isVirtualOrSoftwarePrinter,
} from './windows-print-dispatcher.js';

export interface HardwareTelemetryParams {
  workOffline?: boolean;
  printerStatus?: string;
  detectedErrorState?: number;
  extendedPrinterStatus?: number;
  networkReachable?: boolean;
}

export interface DiscoveredPrinter {
  name: string;
  driverName: string;
  isColorSupported: boolean;
  supportedPaperSizes: PaperSize[];
  duplexSupport?: DuplexSupport;
  supportedDuplexSizes?: PaperSize[];
  capabilityProvenance?: CapabilityProvenance;
  isDefault?: boolean;
  status?: PrinterStatus;
  connectionType?: PrinterConnectionType;
  portName?: string;
}

export function classifyPortConnectionType(portName?: string): PrinterConnectionType {
  const p = (portName || '').trim().toLowerCase();
  if (!p) return 'unknown';
  if (p.startsWith('usb') || p.includes('usb')) return 'usb';
  if (
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(p) ||
    p.startsWith('ip_') ||
    p.startsWith('wsd-') ||
    p.startsWith('tcp')
  ) {
    return 'network';
  }
  if (/pdf|xps|file|prompt|nul/i.test(p)) return 'virtual';
  return 'unknown';
}

export function extractNetworkHost(portName?: string): string | null {
  if (!portName) return null;
  const ipMatch = portName.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (ipMatch) return ipMatch[0];
  const cleaned = portName.replace(/^(?:IP_|WSD-|TCP_)/i, '').trim();
  if (/^[a-zA-Z0-9.-]+$/.test(cleaned) && !cleaned.toLowerCase().startsWith('usb')) {
    return cleaned;
  }
  return null;
}

export function checkNetworkPrinterReachable(
  host: string,
  port = 9100,
  timeoutMs = 400
): Promise<boolean> {
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

export function resolveHardwarePrinterStatus(params: HardwareTelemetryParams): PrinterStatus {
  if (params.workOffline === true) return 'offline';
  if (params.networkReachable === false) return 'offline';

  const extStatus = params.extendedPrinterStatus;
  if (extStatus === 7 || extStatus === 11) return 'offline';
  if (extStatus === 9) return 'error';
  if (extStatus === 4 || extStatus === 10) return 'busy';

  const detErr = params.detectedErrorState;
  if (detErr === 9) return 'offline';
  if (detErr === 4 || detErr === 7 || detErr === 8 || detErr === 10) return 'error';

  const s = String(params.printerStatus || '').toLowerCase();
  if (s.includes('offline') || s.includes('paused') || s.includes('userintervention')) {
    return 'offline';
  }
  if (s.includes('error') || s.includes('jam') || s.includes('paperproblem')) {
    return 'error';
  }
  if (s.includes('busy') || s.includes('printing')) {
    return 'busy';
  }

  return 'online';
}

export function resolvePrinterStatus(
  workOffline?: boolean,
  printerStatus?: string,
  extra?: Omit<HardwareTelemetryParams, 'workOffline' | 'printerStatus'>
): PrinterStatus {
  return resolveHardwarePrinterStatus({ workOffline, printerStatus, ...extra });
}

function resolveDuplexMode(
  mode: string,
  boolVal?: boolean
): { duplexSupport: DuplexSupport; capabilityProvenance: CapabilityProvenance } {
  const m = mode.toLowerCase();
  const isTwo = m.includes('twosided') || m.includes('duplex') || boolVal === true;
  const isOne = m.includes('onesided') || m.includes('simplex') || boolVal === false;
  return {
    duplexSupport: isTwo ? 'supported' : isOne ? 'unsupported' : 'unknown',
    capabilityProvenance: isTwo || isOne ? 'driver_query' : 'unverified',
  };
}

function toDiscovered(
  name: string,
  driverName: string,
  mode: string,
  boolDuplex: boolean | undefined,
  isDefault: boolean,
  status: PrinterStatus,
  connectionType?: PrinterConnectionType,
  portName?: string
): DiscoveredPrinter {
  const { duplexSupport, capabilityProvenance } = resolveDuplexMode(mode, boolDuplex);
  const supportedPaperSizes = inferSupportedPaperSizes(name, driverName);
  return {
    name,
    driverName,
    isColorSupported: inferIsColorSupported(name, driverName),
    supportedPaperSizes,
    duplexSupport,
    supportedDuplexSizes: duplexSupport === 'supported' ? supportedPaperSizes : [],
    capabilityProvenance,
    isDefault,
    status,
    connectionType: connectionType || 'unknown',
    portName,
  };
}

export function parseWindowsPrintersJson(stdout: string): DiscoveredPrinter[] {
  if (!stdout.trim()) return [];
  try {
    const parsed = JSON.parse(stdout);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const printers: DiscoveredPrinter[] = [];

    for (const item of list) {
      if (!item || typeof item.Name !== 'string') continue;
      const name = String(item.Name).trim();
      const driverName = String(item.DriverName || item.Name).trim();
      if (isVirtualOrSoftwarePrinter(name, driverName)) continue;
      const mode = String(item.DuplexMode || item.DuplexingMode || item.Duplex || '');
      const boolDuplex = typeof item.Duplex === 'boolean' ? item.Duplex : undefined;
      const portName = typeof item.PortName === 'string' ? item.PortName.trim() : undefined;
      const connectionType = classifyPortConnectionType(portName);
      const status = resolvePrinterStatus(
        Boolean(item.WorkOffline),
        typeof item.PrinterStatus === 'string' ? item.PrinterStatus : undefined,
        {
          detectedErrorState:
            typeof item.DetectedErrorState === 'number' ? item.DetectedErrorState : undefined,
          extendedPrinterStatus:
            typeof item.ExtendedPrinterStatus === 'number' ? item.ExtendedPrinterStatus : undefined,
        }
      );
      printers.push(
        toDiscovered(
          name,
          driverName,
          mode,
          boolDuplex,
          Boolean(item.Default),
          status,
          connectionType,
          portName
        )
      );
    }
    return printers;
  } catch {
    return [];
  }
}

export function parseCupsPrinters(
  lpstatPStdout: string,
  lpstatDStdout = '',
  optionsMap: Record<string, string> = {}
): DiscoveredPrinter[] {
  const defMatch = lpstatDStdout.match(/system default destination:\s*([^\s]+)/i);
  const defaultName = defMatch ? defMatch[1].trim() : null;
  const printers: DiscoveredPrinter[] = [];

  for (const line of lpstatPStdout.split('\n')) {
    const match = line.match(/^printer\s+([^\s]+)\s+(?:is\s+)?(.*)/i);
    if (!match || !match[1]?.trim()) continue;
    const name = match[1].trim();
    const driverName = name.replace(/_/g, ' ');
    if (isVirtualOrSoftwarePrinter(name, driverName)) continue;

    const raw = (optionsMap[name] || '').toLowerCase();
    const cupsMode = /duplextumble|twosided/i.test(raw)
      ? 'twosided'
      : /\*none|\*onesided/i.test(raw)
        ? 'onesided'
        : '';
    const status: PrinterStatus = /disabled|offline|stopped/i.test(match[2] || '')
      ? 'offline'
      : 'online';
    printers.push(
      toDiscovered(name, driverName, cupsMode, undefined, defaultName === name, status, 'unknown')
    );
  }

  return printers;
}
