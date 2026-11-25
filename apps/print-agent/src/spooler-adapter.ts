import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PaperSize } from '@snapprint/contracts';
import {
  buildWindowsImagePrintScript,
  buildWindowsPdfPrintScript,
  buildWindowsPrinterValidationScript,
  validatePrintTarget,
} from './windows-print-dispatcher.js';

const execPromise = promisify(exec);

export interface DiscoveredPrinter {
  name: string;
  driverName: string;
  isColorSupported: boolean;
  supportedPaperSizes: PaperSize[];
  duplexSupport?: 'supported' | 'unsupported' | 'unknown';
  supportedDuplexSizes?: PaperSize[];
  capabilityProvenance?: 'driver_query' | 'system_detected' | 'manual_verified' | 'unverified';
  isDefault?: boolean;
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

const COLOR_REGEX =
  /color|colour|cmyk|photo|l3150|l3250|l3110|l805|ecotank|inktank|deskjet|pixma|surecolor|envy/i;

const VIRTUAL_REGEX =
  /print to pdf|onenote|anydesk|xps document|fax|cutepdf|adobe pdf|foxit|pdf creator|pdf24|bullzip|virtual print|root print queue|cups-pdf/i;

export function isVirtualOrSoftwarePrinter(name: string, driverName = ''): boolean {
  return VIRTUAL_REGEX.test(`${name} ${driverName}`);
}

export function inferIsColorSupported(name: string, driverName: string): boolean {
  return COLOR_REGEX.test(`${name} ${driverName}`);
}

export function inferSupportedPaperSizes(name: string, driverName: string): PaperSize[] {
  const combined = `${name} ${driverName}`.toLowerCase();
  const sizes: PaperSize[] = ['A4'];
  if (/mfp|laserjet|legal|office|copier/i.test(combined)) sizes.push('legal');
  return sizes;
}

export function parseWindowsPrintersJson(stdout: string): DiscoveredPrinter[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    return list
      .filter((item) => {
        if (!item || typeof item.Name !== 'string') return false;
        const name = String(item.Name).trim();
        const driverName = String(item.DriverName || item.Name).trim();
        return !isVirtualOrSoftwarePrinter(name, driverName);
      })
      .map((item) => {
        const name = String(item.Name).trim();
        const driverName = String(item.DriverName || item.Name).trim();
        const isDefault = Boolean(item.Default);
        const duplexMode = String(item.DuplexMode || item.DuplexingMode || item.Duplex || '').toLowerCase();
        let duplexSupport: 'supported' | 'unsupported' | 'unknown' = 'unknown';
        let provenance: 'driver_query' | 'unverified' = 'unverified';
        if (duplexMode.includes('twosided') || duplexMode.includes('duplex') || item.Duplex === true) {
          duplexSupport = 'supported';
          provenance = 'driver_query';
        } else if (duplexMode.includes('onesided') || duplexMode.includes('simplex') || item.Duplex === false) {
          duplexSupport = 'unsupported';
          provenance = 'driver_query';
        }
        const supportedPaperSizes = inferSupportedPaperSizes(name, driverName);
        return {
          name,
          driverName,
          isColorSupported: inferIsColorSupported(name, driverName),
          supportedPaperSizes,
          duplexSupport,
          supportedDuplexSizes: duplexSupport === 'supported' ? supportedPaperSizes : [],
          capabilityProvenance: provenance,
          isDefault,
        };
      });
  } catch {
    return [];
  }
}

export function parseCupsPrinters(
  lpstatPStdout: string,
  lpstatDStdout: string = '',
  optionsMap: Record<string, string> = {}
): DiscoveredPrinter[] {
  const defaultPrinterMatch = lpstatDStdout.match(/system default destination:\s*([^\s]+)/i);
  const defaultPrinterName = defaultPrinterMatch ? defaultPrinterMatch[1].trim() : null;

  const lines = lpstatPStdout.split('\n');
  const printers: DiscoveredPrinter[] = [];

  for (const line of lines) {
    const match = line.match(/^printer\s+([^\s]+)\s+(?:is\s+)?(.*)/i);
    if (!match) continue;

    const name = match[1].trim();
    if (!name) continue;

    const driverName = name.replace(/_/g, ' ');
    if (isVirtualOrSoftwarePrinter(name, driverName)) continue;

    const isDefault = defaultPrinterName ? name === defaultPrinterName : false;
    const rawOptions = (optionsMap[name] || '').toLowerCase();
    let duplexSupport: 'supported' | 'unsupported' | 'unknown' = 'unknown';
    let provenance: 'driver_query' | 'unverified' = 'unverified';
    if (rawOptions.includes('duplextumble') || rawOptions.includes('twosided')) {
      duplexSupport = 'supported';
      provenance = 'driver_query';
    } else if (rawOptions.includes('*none') || rawOptions.includes('*onesided')) {
      duplexSupport = 'unsupported';
      provenance = 'driver_query';
    }
    const supportedPaperSizes = inferSupportedPaperSizes(name, driverName);

    printers.push({
      name,
      driverName,
      isColorSupported: inferIsColorSupported(name, driverName),
      supportedPaperSizes,
      duplexSupport,
      supportedDuplexSizes: duplexSupport === 'supported' ? supportedPaperSizes : [],
      capabilityProvenance: provenance,
      isDefault,
    });
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
          const { stdout } = await runner(
            'powershell -NoProfile -Command "Get-Printer | ForEach-Object { $p = $_; $cfg = Get-PrintConfiguration -PrinterName $p.Name -ErrorAction SilentlyContinue; [PSCustomObject]@{ Name = $p.Name; DriverName = $p.DriverName; Default = [bool]$p.Default; DuplexMode = if ($cfg) { [string]$cfg.DuplexingMode } else { \'\' } } } | ConvertTo-Json"',
            { timeout: 5000 }
          );
          return parseWindowsPrintersJson(String(stdout));
        } catch {
          return [];
        }
      }

      // Unix / macOS / Linux fallback via CUPS
      try {
        const [pRes, dRes] = await Promise.all([
          runner('lpstat -p', { timeout: 5000 }).catch(() => ({ stdout: '', stderr: '' })),
          runner('lpstat -d', { timeout: 5000 }).catch(() => ({ stdout: '', stderr: '' })),
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
        const checkCmd = buildWindowsPrinterValidationScript(printerName);
        try {
          await runner(`powershell -NoProfile -Command "${checkCmd}"`, { timeout: 10000 });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('PRINTER_NOT_FOUND')) throw new Error(`PRINTER_NOT_FOUND: Target printer '${printerName}' is not installed.`);
          if (msg.includes('PRINTER_OFFLINE')) throw new Error(`PRINTER_OFFLINE: Target printer '${printerName}' is offline or disconnected.`);
          throw new Error(`SPOOLER_SUBMISSION_FAILED: Validation failed for printer '${printerName}': ${msg}`);
        }

        const printCmd = ['.png', '.jpg', '.jpeg'].includes(validation.ext)
          ? buildWindowsImagePrintScript(printerName, filePath, copies, isDuplex)
          : buildWindowsPdfPrintScript(printerName, filePath, copies, isDuplex);

        try {
          await runner(`powershell -NoProfile -Command "${printCmd}"`, { timeout: 30000 });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`SPOOLER_SUBMISSION_FAILED: Spooler dispatch failed for '${printerName}': ${msg}`);
        }
        return;
      }

      // Unix / macOS / Linux fallback via CUPS
      const safePath = filePath.replace(/"/g, '\\"');
      const safePrinter = printerName.replace(/"/g, '\\"');
      const duplexFlag = isDuplex ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';
      try {
        await runner(`lp -d "${safePrinter}" -n ${copies} ${duplexFlag} "${safePath}"`, { timeout: 30000 });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`SPOOLER_SUBMISSION_FAILED: CUPS dispatch failed for '${printerName}': ${msg}`);
      }
    },
  };
}
