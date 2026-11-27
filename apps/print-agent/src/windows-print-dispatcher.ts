import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import { PaperSize, StandardPaperSizes } from '@snapprint/contracts';

const COLOR_REGEX =
  /color|colour|cmyk|photo|l3150|l3250|l3110|l805|ecotank|inktank|deskjet|pixma|surecolor|envy/i;

const VIRTUAL_REGEX =
  /print to pdf|onenote|anydesk|xps document|fax|cutepdf|adobe pdf|foxit|pdf creator|pdf24|bullzip|virtual print|root print queue|cups-pdf/i;

export function isVirtualOrSoftwarePrinter(
  name: string,
  driverName = '',
  allowVirtual = false
): boolean {
  if (allowVirtual || process.env.SNAPPRINT_ALLOW_VIRTUAL_PRINTERS === '1') {
    return /onenote|anydesk|fax|root print queue/i.test(`${name} ${driverName}`);
  }
  return VIRTUAL_REGEX.test(`${name} ${driverName}`);
}

export function inferIsColorSupported(name: string, driverName: string): boolean {
  return COLOR_REGEX.test(`${name} ${driverName}`);
}

export function inferSupportedPaperSizes(name: string, driverName: string): PaperSize[] {
  void name;
  void driverName;
  // Return the full standard paper catalogue as the initial inferred capability.
  // The operator confirms real hardware constraints from the Printer & Page Setup
  // dashboard — no name-based guessing needed here.
  return [...StandardPaperSizes];
}

export const SUPPORTED_PRINT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const;
export type SupportedPrintExtension = (typeof SUPPORTED_PRINT_EXTENSIONS)[number];

export function validatePrintTarget(
  printerName: string,
  filePath: string
): { valid: boolean; ext: string; error?: string } {
  if (!printerName || printerName.trim().length === 0) {
    return { valid: false, ext: '', error: 'PRINTER_NAME_REQUIRED: Printer name cannot be empty.' };
  }
  if (!filePath || filePath.trim().length === 0) {
    return { valid: false, ext: '', error: 'FILE_PATH_REQUIRED: File path cannot be empty.' };
  }
  if (!existsSync(filePath)) {
    return { valid: false, ext: '', error: `FILE_NOT_FOUND: File not found at '${filePath}'.` };
  }

  const ext = extname(filePath).toLowerCase();
  if (!SUPPORTED_PRINT_EXTENSIONS.includes(ext as SupportedPrintExtension)) {
    return {
      valid: false,
      ext,
      error: `UNSUPPORTED_FORMAT: Document format '${ext}' is not supported. Supported: ${SUPPORTED_PRINT_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true, ext };
}

export function buildWindowsPrinterValidationScript(printerName: string): string {
  const safePrinter = printerName.replace(/'/g, "''");
  return `
    $p = Get-Printer -Name '${safePrinter}' -ErrorAction SilentlyContinue;
    if (-not $p) {
      throw 'PRINTER_NOT_FOUND: Target printer "${safePrinter}" is not installed on this system.';
    }
    if ($p.WorkOffline -eq $true -or ($p.PrinterStatus -match 'Offline|Error')) {
      throw 'PRINTER_OFFLINE: Target printer "${safePrinter}" is offline or in error state (Status: ' + $p.PrinterStatus + ').';
    }
  `
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildWindowsImagePrintScript(
  printerName: string,
  filePath: string,
  copies = 1,
  isDuplex = false
): string {
  const safePrinter = printerName.replace(/'/g, "''");
  const safePath = filePath.replace(/'/g, "''");
  const duplexSetting = isDuplex
    ? '$doc.PrinterSettings.Duplex = [System.Drawing.Printing.Duplex]::Vertical;'
    : '$doc.PrinterSettings.Duplex = [System.Drawing.Printing.Duplex]::Simplex;';
  return `
    Add-Type -AssemblyName System.Drawing;
    $img = [System.Drawing.Image]::FromFile('${safePath}');
    $doc = New-Object System.Drawing.Printing.PrintDocument;
    $doc.PrinterSettings.PrinterName = '${safePrinter}';
    $doc.PrinterSettings.Copies = ${copies};
    ${duplexSetting}
    $doc.add_PrintPage({
      param($sender, $ev)
      $ev.Graphics.DrawImage($img, $ev.MarginBounds);
      $ev.HasMorePages = $false;
    });
    $doc.Print();
    $img.Dispose();
    $doc.Dispose();
  `
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildWindowsPdfPrintScript(
  printerName: string,
  filePath: string,
  copies = 1,
  isDuplex = false
): string {
  const safePrinter = printerName.replace(/'/g, "''");
  const safePath = filePath.replace(/'/g, "''");
  const duplexMode = isDuplex ? 'TwoSidedLongEdge' : 'OneSided';
  return `
    $cfg = Get-PrintConfiguration -PrinterName '${safePrinter}' -ErrorAction SilentlyContinue;
    if ($cfg) { Set-PrintConfiguration -PrinterName '${safePrinter}' -DuplexingMode ${duplexMode} -ErrorAction SilentlyContinue; }
    for ($i = 0; $i -lt ${copies}; $i++) {
      $proc = Start-Process -FilePath '${safePath}' -Verb PrintTo -ArgumentList '${safePrinter}' -WindowStyle Hidden -PassThru;
      if ($proc) {
        $proc | Wait-Process -Timeout 30 -ErrorAction SilentlyContinue;
      }
    }
  `
    .trim()
    .replace(/\s+/g, ' ');
}

export function toSpoolerError(prefix: string, name: string, err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PRINTER_NOT_FOUND')) {
    return new Error(`PRINTER_NOT_FOUND: Target printer '${name}' is not installed.`);
  }
  if (msg.includes('PRINTER_OFFLINE')) {
    return new Error(`PRINTER_OFFLINE: Target printer '${name}' is offline or disconnected.`);
  }
  return new Error(`${prefix} for '${name}': ${msg}`);
}
