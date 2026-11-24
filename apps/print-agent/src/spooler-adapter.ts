import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PaperSize } from '@snapprint/contracts';

const execPromise = promisify(exec);

export interface DiscoveredPrinter {
  name: string;
  driverName: string;
  isColorSupported: boolean;
  supportedPaperSizes: PaperSize[];
  isDefault?: boolean;
}

export interface PrintFileOptions {
  copies?: number;
  paperSize?: PaperSize;
}

export interface SpoolerAdapter {
  getPrinters(): Promise<DiscoveredPrinter[]>;
  printFile(printerName: string, filePath: string, options?: PrintFileOptions): Promise<void>;
}

export function inferIsColorSupported(name: string, driverName: string): boolean {
  const combined = `${name} ${driverName}`.toLowerCase();
  const colorKeywords = [
    'color',
    'colour',
    'cmyk',
    'photo',
    'l3150',
    'l3250',
    'l3110',
    'l805',
    'ecotank',
    'inktank',
    'deskjet',
    'pixma',
    'surecolor',
    'envy',
  ];
  return colorKeywords.some((kw) => combined.includes(kw));
}

export function inferSupportedPaperSizes(name: string, driverName: string): PaperSize[] {
  const combined = `${name} ${driverName}`.toLowerCase();
  const sizes: PaperSize[] = ['A4'];

  if (
    combined.includes('mfp') ||
    combined.includes('laserjet') ||
    combined.includes('legal') ||
    combined.includes('office') ||
    combined.includes('copier')
  ) {
    sizes.push('legal');
  }

  return sizes;
}

export function parseWindowsPrintersJson(stdout: string): DiscoveredPrinter[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    return list
      .filter((item) => item && typeof item.Name === 'string')
      .map((item) => {
        const name = String(item.Name).trim();
        const driverName = String(item.DriverName || item.Name).trim();
        const isDefault = Boolean(item.Default);
        return {
          name,
          driverName,
          isColorSupported: inferIsColorSupported(name, driverName),
          supportedPaperSizes: inferSupportedPaperSizes(name, driverName),
          isDefault,
        };
      });
  } catch {
    return [];
  }
}

export function parseCupsPrinters(
  lpstatPStdout: string,
  lpstatDStdout: string = ''
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
    const isDefault = defaultPrinterName ? name === defaultPrinterName : false;

    printers.push({
      name,
      driverName,
      isColorSupported: inferIsColorSupported(name, driverName),
      supportedPaperSizes: inferSupportedPaperSizes(name, driverName),
      isDefault,
    });
  }

  return printers;
}

export function createSystemSpoolerAdapter(options?: {
  platform?: NodeJS.Platform;
  execAsync?: (cmd: string) => Promise<{ stdout: string; stderr: string }>;
}): SpoolerAdapter {
  const platform = options?.platform || process.platform;
  const runner = options?.execAsync || execPromise;

  return {
    async getPrinters(): Promise<DiscoveredPrinter[]> {
      if (platform === 'win32') {
        try {
          const { stdout } = await runner(
            'powershell -NoProfile -Command "Get-Printer | Select-Object Name,DriverName,Default | ConvertTo-Json"'
          );
          return parseWindowsPrintersJson(stdout);
        } catch {
          return [];
        }
      }

      // Unix / macOS / Linux fallback via CUPS
      try {
        const [pRes, dRes] = await Promise.all([
          runner('lpstat -p').catch(() => ({ stdout: '', stderr: '' })),
          runner('lpstat -d').catch(() => ({ stdout: '', stderr: '' })),
        ]);
        return parseCupsPrinters(pRes.stdout, dRes.stdout);
      } catch {
        return [];
      }
    },

    async printFile(printerName: string, filePath: string, opts?: PrintFileOptions): Promise<void> {
      const copies = opts?.copies && opts.copies > 0 ? opts.copies : 1;

      if (platform === 'win32') {
        const safePath = filePath.replace(/"/g, '`"');
        const safePrinter = printerName.replace(/"/g, '`"');
        for (let i = 0; i < copies; i++) {
          await runner(
            `powershell -NoProfile -Command "Start-Process -FilePath '${safePath}' -Verb PrintTo -ArgumentList '${safePrinter}' -PassThru | Wait-Process"`
          );
        }
        return;
      }

      // macOS / Linux via CUPS lp
      const safePath = filePath.replace(/"/g, '\\"');
      const safePrinter = printerName.replace(/"/g, '\\"');
      await runner(`lp -d "${safePrinter}" -n ${copies} "${safePath}"`);
    },
  };
}
