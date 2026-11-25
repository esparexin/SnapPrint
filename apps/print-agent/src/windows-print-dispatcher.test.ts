import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSystemSpoolerAdapter } from './spooler-adapter.js';
import {
  buildWindowsImagePrintScript,
  buildWindowsPdfPrintScript,
  buildWindowsPrinterValidationScript,
  validatePrintTarget,
} from './windows-print-dispatcher.js';

describe('Windows Print Dispatcher & Targeting', () => {
  const tempPdf = join(tmpdir(), `test-dispatch-${Date.now()}.pdf`);
  const tempPng = join(tmpdir(), `test-dispatch-${Date.now()}.png`);
  const tempDocx = join(tmpdir(), `test-dispatch-${Date.now()}.docx`);

  beforeEach(() => {
    writeFileSync(tempPdf, Buffer.from('%PDF-1.4 test'));
    writeFileSync(tempPng, Buffer.from('\x89PNG test'));
    writeFileSync(tempDocx, Buffer.from('PK docx test'));
  });

  afterEach(() => {
    for (const f of [tempPdf, tempPng, tempDocx]) {
      if (existsSync(f)) unlinkSync(f);
    }
  });

  describe('Explicit Printer Targeting', () => {
    it('generates Windows validation script checking target printer existence and offline state', () => {
      const script = buildWindowsPrinterValidationScript('Epson L3150 Series');
      expect(script).toContain("Get-Printer -Name 'Epson L3150 Series'");
      expect(script).toContain('PRINTER_NOT_FOUND');
      expect(script).toContain('PRINTER_OFFLINE');
    });

    it('generates .NET image print script explicitly configuring printer name and copies', () => {
      const script = buildWindowsImagePrintScript('HP LaserJet Pro', tempPng, 2);
      expect(script).toContain("PrinterSettings.PrinterName = 'HP LaserJet Pro'");
      expect(script).toContain('PrinterSettings.Copies = 2');
      expect(script).toContain('System.Drawing.Printing.PrintDocument');
      expect(script).toContain('DrawImage');
    });

    it('generates PDF print script explicitly passing target printer in argument list', () => {
      const script = buildWindowsPdfPrintScript('Canon Pixma G3010', tempPdf, 3);
      expect(script).toContain("-ArgumentList 'Canon Pixma G3010'");
      expect(script).toContain('-Verb PrintTo');
      expect(script).toContain('-WindowStyle Hidden');
    });

    it('configures vertical duplex for double-sided image printing', () => {
      const script = buildWindowsImagePrintScript('HP LaserJet Pro', tempPng, 1, true);
      expect(script).toContain(
        'PrinterSettings.Duplex = [System.Drawing.Printing.Duplex]::Vertical'
      );
    });

    it('configures Set-PrintConfiguration TwoSidedLongEdge for PDF duplex printing', () => {
      const script = buildWindowsPdfPrintScript('Canon Pixma G3010', tempPdf, 1, true);
      expect(script).toContain('-DuplexingMode TwoSidedLongEdge');
    });
  });

  describe('Format Validation & Error Handling', () => {
    it('accepts supported formats (.pdf, .png)', () => {
      expect(validatePrintTarget('Printer1', tempPdf).valid).toBe(true);
      expect(validatePrintTarget('Printer1', tempPng).valid).toBe(true);
    });

    it('rejects unsupported file formats (.docx, .txt)', () => {
      const res = validatePrintTarget('Printer1', tempDocx);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('UNSUPPORTED_FORMAT');
    });

    it('rejects non-existent file path with FILE_NOT_FOUND', () => {
      const res = validatePrintTarget('Printer1', '/non/existent/file.pdf');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('FILE_NOT_FOUND');
    });

    it('rejects empty printer name', () => {
      const res = validatePrintTarget('', tempPdf);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('PRINTER_NAME_REQUIRED');
    });
  });

  describe('Spooler Error Detection with Mock Exec', () => {
    it('throws PRINTER_NOT_FOUND when target printer is missing on Windows', async () => {
      const mockExec = async () => {
        throw new Error('PRINTER_NOT_FOUND: Target printer not installed.');
      };
      const adapter = createSystemSpoolerAdapter({ platform: 'win32', execAsync: mockExec });

      await expect(adapter.printFile('NonExistentPrinter', tempPdf)).rejects.toThrow(
        /PRINTER_NOT_FOUND/
      );
    });

    it('throws PRINTER_OFFLINE when target printer is offline or disconnected', async () => {
      const mockExec = async () => {
        throw new Error('PRINTER_OFFLINE: Printer is offline.');
      };
      const adapter = createSystemSpoolerAdapter({ platform: 'win32', execAsync: mockExec });

      await expect(adapter.printFile('OfflinePrinter', tempPdf)).rejects.toThrow(/PRINTER_OFFLINE/);
    });

    it('throws SPOOLER_SUBMISSION_FAILED when spooler dispatch throws', async () => {
      let callCount = 0;
      const mockExec = async () => {
        callCount++;
        if (callCount === 1) return { stdout: '', stderr: '' }; // Validation succeeds
        throw new Error('Spooler queue full');
      };
      const adapter = createSystemSpoolerAdapter({ platform: 'win32', execAsync: mockExec });

      await expect(adapter.printFile('GoodPrinter', tempPdf)).rejects.toThrow(
        /SPOOLER_SUBMISSION_FAILED/
      );
    });

    it('submits successfully to Windows spooler when validation and dispatch succeed', async () => {
      const executed: string[] = [];
      const mockExec = async (cmd: string) => {
        executed.push(cmd);
        return { stdout: '', stderr: '' };
      };
      const adapter = createSystemSpoolerAdapter({ platform: 'win32', execAsync: mockExec });

      await adapter.printFile('Epson L3150', tempPng, { copies: 1 });
      expect(executed).toHaveLength(2); // Validation + Dispatch
      expect(executed[0]).toContain("Get-Printer -Name 'Epson L3150'");
      expect(executed[1]).toContain("PrinterSettings.PrinterName = 'Epson L3150'");
    });
  });
});
