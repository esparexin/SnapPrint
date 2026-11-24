import { existsSync } from 'node:fs';
import { extname } from 'node:path';

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
  copies = 1
): string {
  const safePrinter = printerName.replace(/'/g, "''");
  const safePath = filePath.replace(/'/g, "''");
  return `
    Add-Type -AssemblyName System.Drawing;
    $img = [System.Drawing.Image]::FromFile('${safePath}');
    $doc = New-Object System.Drawing.Printing.PrintDocument;
    $doc.PrinterSettings.PrinterName = '${safePrinter}';
    $doc.PrinterSettings.Copies = ${copies};
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
  copies = 1
): string {
  const safePrinter = printerName.replace(/'/g, "''");
  const safePath = filePath.replace(/'/g, "''");
  return `
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
