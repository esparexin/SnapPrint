import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  CapabilityProvenance,
  DuplexSupport,
  PaperSize,
  PrinterStatus,
} from '@snapprint/contracts';
import {
  buildWindowsImagePrintScript,
  buildWindowsPdfPrintScript,
  buildWindowsPrinterValidationScript,
  inferIsColorSupported,
  inferSupportedPaperSizes,
  isVirtualOrSoftwarePrinter,
  toSpoolerError,
  validatePrintTarget,
} from './windows-print-dispatcher.js';

export { inferIsColorSupported, inferSupportedPaperSizes, isVirtualOrSoftwarePrinter };

const execPromise = promisify(exec);

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
}

export interface PrintFileOptions {
  copies?: number;
  paperSize?: PaperSize;
  sides?: 'single' | 'double';
}

export interface SpoolerAdapter {
  getPrinters(): Promise<DiscoveredPrinter[]>;
  printFile(printerName: string, filePath: string, options?: PrintFileOptions): Promise<void>;
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

export function resolvePrinterStatus(workOffline?: boolean, printerStatus?: string): PrinterStatus {
  if (workOffline === true) return 'offline';
  const s = String(printerStatus || '').toLowerCase();
  if (s.includes('offline') || s.includes('paused') || s.includes('userintervention'))
    return 'offline';
  return s.includes('error') ? 'error' : 'online';
}

function toDiscovered(
  name: string,
  driverName: string,
  mode: string,
  boolDuplex: boolean | undefined,
  isDefault: boolean,
  status: PrinterStatus
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
      const status = resolvePrinterStatus(
        Boolean(item.WorkOffline),
        typeof item.PrinterStatus === 'string' ? item.PrinterStatus : undefined
      );
      printers.push(
        toDiscovered(name, driverName, mode, boolDuplex, Boolean(item.Default), status)
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
      toDiscovered(name, driverName, cupsMode, undefined, defaultName === name, status)
    );
  }

  return printers;
}

export function createSystemSpoolerAdapter(options?: {
  platform?: NodeJS.Platform;
  execAsync?: (
    cmd: string,
    opts?: { timeout?: number }
  ) => Promise<{ stdout: string; stderr: string }>;
}): SpoolerAdapter {
  const platform = options?.platform || process.platform;
  const runner =
    options?.execAsync ||
    (async (cmd: string, opts?: { timeout?: number }) => {
      const res = await execPromise(cmd, { encoding: 'utf-8', ...opts });
      return { stdout: String(res.stdout), stderr: String(res.stderr) };
    });

  return {
    async getPrinters(): Promise<DiscoveredPrinter[]> {
      if (platform === 'win32') {
        try {
          const ps =
            "Get-Printer | ForEach-Object { $p = $_; $cfg = Get-PrintConfiguration -PrinterName $p.Name -ErrorAction SilentlyContinue; [PSCustomObject]@{ Name = $p.Name; DriverName = $p.DriverName; Default = [bool]$p.Default; WorkOffline = [bool]$p.WorkOffline; PrinterStatus = [string]$p.PrinterStatus; DuplexMode = if ($cfg) { [string]$cfg.DuplexingMode } else { '' } } } | ConvertTo-Json";
          const { stdout } = await runner(`powershell -NoProfile -Command "${ps}"`, {
            timeout: 5000,
          });
          return parseWindowsPrintersJson(String(stdout));
        } catch {
          return [];
        }
      }

      // Unix / macOS / Linux fallback via CUPS
      try {
        const noop = () => ({ stdout: '', stderr: '' });
        const [pRes, dRes] = await Promise.all([
          runner('lpstat -p', { timeout: 5000 }).catch(noop),
          runner('lpstat -d', { timeout: 5000 }).catch(noop),
        ]);
        return parseCupsPrinters(String(pRes.stdout), String(dRes.stdout));
      } catch {
        return [];
      }
    },

    async printFile(printerName: string, filePath: string, opts?: PrintFileOptions): Promise<void> {
      const validation = validatePrintTarget(printerName, filePath);
      if (!validation.valid) throw new Error(validation.error);

      const copies = opts?.copies && opts.copies > 0 ? opts.copies : 1;
      const isDuplex = opts?.sides === 'double';

      if (platform === 'win32') {
        const vScript = buildWindowsPrinterValidationScript(printerName);
        await runner(`powershell -NoProfile -Command "${vScript}"`, { timeout: 10000 }).catch(
          (err) => {
            throw toSpoolerError('SPOOLER_SUBMISSION_FAILED: Validation failed', printerName, err);
          }
        );

        const printCmd = ['.png', '.jpg', '.jpeg'].includes(validation.ext)
          ? buildWindowsImagePrintScript(printerName, filePath, copies, isDuplex)
          : buildWindowsPdfPrintScript(printerName, filePath, copies, isDuplex);

        await runner(`powershell -NoProfile -Command "${printCmd}"`, { timeout: 30000 }).catch(
          (err) => {
            throw toSpoolerError(
              'SPOOLER_SUBMISSION_FAILED: Spooler dispatch failed',
              printerName,
              err
            );
          }
        );
        return;
      }

      // Unix / macOS / Linux fallback via CUPS
      const safePath = filePath.replace(/"/g, '\\"');
      const safePrinter = printerName.replace(/"/g, '\\"');
      const duplexFlag = isDuplex ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';
      await runner(`lp -d "${safePrinter}" -n ${copies} ${duplexFlag} "${safePath}"`, {
        timeout: 30000,
      }).catch((err) => {
        throw toSpoolerError('SPOOLER_SUBMISSION_FAILED: CUPS dispatch failed', printerName, err);
      });
    },
  };
}
