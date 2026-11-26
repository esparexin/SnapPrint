import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PaperSize } from '@snapprint/contracts';
import {
  checkNetworkPrinterReachable,
  classifyPortConnectionType,
  DiscoveredPrinter,
  extractNetworkHost,
  parseCupsPrinters,
  parseWindowsPrintersJson,
  resolvePrinterStatus,
} from './printer-telemetry.js';
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

export {
  checkNetworkPrinterReachable,
  classifyPortConnectionType,
  extractNetworkHost,
  inferIsColorSupported,
  inferSupportedPaperSizes,
  isVirtualOrSoftwarePrinter,
  parseCupsPrinters,
  parseWindowsPrintersJson,
  resolvePrinterStatus,
};
export type { DiscoveredPrinter };

const execPromise = promisify(exec);

export interface PrintFileOptions {
  copies?: number;
  paperSize?: PaperSize;
  sides?: 'single' | 'double';
}

export interface SpoolerAdapter {
  getPrinters(): Promise<DiscoveredPrinter[]>;
  printFile(printerName: string, filePath: string, options?: PrintFileOptions): Promise<void>;
}

export function createSystemSpoolerAdapter(options?: {
  platform?: NodeJS.Platform;
  execAsync?: (
    cmd: string,
    opts?: { timeout?: number }
  ) => Promise<{ stdout: string; stderr: string }>;
  pingNetworkPrinter?: (host: string) => Promise<boolean>;
}): SpoolerAdapter {
  const platform = options?.platform || process.platform;
  const pingNet = options?.pingNetworkPrinter || checkNetworkPrinterReachable;
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
            "Get-Printer | ForEach-Object { $p = $_; $cfg = Get-PrintConfiguration -PrinterName $p.Name -ErrorAction SilentlyContinue; [PSCustomObject]@{ Name = $p.Name; DriverName = $p.DriverName; PortName = $p.PortName; Default = [bool]$p.Default; WorkOffline = [bool]$p.WorkOffline; PrinterStatus = [string]$p.PrinterStatus; DuplexMode = if ($cfg) { [string]$cfg.DuplexingMode } else { '' } } } | ConvertTo-Json";
          const { stdout } = await runner(`powershell -NoProfile -Command "${ps}"`, {
            timeout: 5000,
          });
          const printers = parseWindowsPrintersJson(String(stdout));
          await Promise.all(
            printers.map(async (p) => {
              if (p.connectionType === 'network' && p.portName) {
                const host = extractNetworkHost(p.portName);
                if (host) {
                  const reachable = await pingNet(host);
                  if (!reachable) {
                    p.status = 'offline';
                  }
                }
              }
            })
          );
          return printers;
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
