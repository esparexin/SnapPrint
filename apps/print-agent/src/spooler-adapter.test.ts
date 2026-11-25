import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createSystemSpoolerAdapter,
  DiscoveredPrinter,
  inferIsColorSupported,
  inferSupportedPaperSizes,
  parseCupsPrinters,
  parseWindowsPrintersJson,
} from './spooler-adapter.js';

describe('Spooler Adapter & Drivers Discovery', () => {
  describe('Capability Inference', () => {
    it('infers color capability from printer and driver names', () => {
      expect(inferIsColorSupported('Epson L3150 Series', 'Epson L3150 Driver')).toBe(true);
      expect(inferIsColorSupported('Canon PIXMA G3010', 'Canon Inkjet')).toBe(true);
      expect(inferIsColorSupported('HP LaserJet Pro MFP M126nw', 'HP LaserJet Driver')).toBe(false);
      expect(inferIsColorSupported('HP Color LaserJet Pro', 'HP Color Driver')).toBe(true);
    });

    it('infers paper sizes based on printer capabilities', () => {
      expect(inferSupportedPaperSizes('HP LaserJet Pro MFP M126nw', 'HP Driver')).toEqual([
        'A4',
        'legal',
      ]);
      expect(inferSupportedPaperSizes('Epson L3150', 'Epson Driver')).toEqual(['A4']);
    });
  });

  describe('Windows PowerShell JSON Parser', () => {
    it('parses array of printers from PowerShell output', () => {
      const psJson = JSON.stringify([
        {
          Name: 'HP LaserJet Pro MFP M126nw',
          DriverName: 'HP LaserJet M126 Driver',
          Default: true,
        },
        {
          Name: 'Epson L3150 Series',
          DriverName: 'EPSON L3150 Series',
          Default: false,
        },
      ]);

      const printers = parseWindowsPrintersJson(psJson);
      expect(printers).toHaveLength(2);
      expect(printers[0].name).toBe('HP LaserJet Pro MFP M126nw');
      expect(printers[0].isColorSupported).toBe(false);
      expect(printers[0].isDefault).toBe(true);
      expect(printers[0].supportedPaperSizes).toContain('legal');

      expect(printers[1].name).toBe('Epson L3150 Series');
      expect(printers[1].isColorSupported).toBe(true);
      expect(printers[1].isDefault).toBe(false);
    });

    it('parses single object printer output from PowerShell', () => {
      const psJson = JSON.stringify({
        Name: 'Brother HL-L2320D series',
        DriverName: 'Brother HL-L2320D series',
        Default: true,
      });

      const printers = parseWindowsPrintersJson(psJson);
      expect(printers).toHaveLength(1);
      expect(printers[0].name).toBe('Brother HL-L2320D series');
      expect(printers[0].isColorSupported).toBe(false);
    });

    it('handles empty or malformed output gracefully', () => {
      expect(parseWindowsPrintersJson('')).toEqual([]);
      expect(parseWindowsPrintersJson('Invalid JSON')).toEqual([]);
    });
  });

  describe('CUPS / Unix Parser', () => {
    it('parses lpstat output lines and identifies default printer', () => {
      const lpstatP = `
printer Epson_L3150 is idle. enabled since Mon 23 Nov 2026 10:00:00 AM IST
printer HP_LaserJet_1020 is idle. enabled since Mon 23 Nov 2026 10:00:00 AM IST
`;
      const lpstatD = 'system default destination: HP_LaserJet_1020\n';

      const printers = parseCupsPrinters(lpstatP, lpstatD);
      expect(printers).toHaveLength(2);

      const epson = printers.find((p: DiscoveredPrinter) => p.name === 'Epson_L3150');
      expect(epson).toBeDefined();
      expect(epson?.isColorSupported).toBe(true);
      expect(epson?.isDefault).toBe(false);

      const hp = printers.find((p: DiscoveredPrinter) => p.name === 'HP_LaserJet_1020');
      expect(hp).toBeDefined();
      expect(hp?.isColorSupported).toBe(false);
      expect(hp?.isDefault).toBe(true);
    });
  });

  describe('createSystemSpoolerAdapter with Mock Exec', () => {
    it('queries Windows spooler when on win32', async () => {
      const mockExec = async (cmd: string) => {
        expect(cmd).toContain('Get-Printer');
        return {
          stdout: JSON.stringify([
            { Name: 'Mocked Windows Printer', DriverName: 'Generic Driver', Default: true },
          ]),
          stderr: '',
        };
      };

      const adapter = createSystemSpoolerAdapter({ platform: 'win32', execAsync: mockExec });
      const printers = await adapter.getPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0].name).toBe('Mocked Windows Printer');
    });

    it('passes timeout option to runner to prevent hang on win32', async () => {
      let passedTimeout: number | undefined;
      const mockExec = async (cmd: string, opts?: { timeout?: number }) => {
        passedTimeout = opts?.timeout;
        return { stdout: '[]', stderr: '' };
      };

      const adapter = createSystemSpoolerAdapter({ platform: 'win32', execAsync: mockExec });
      await adapter.getPrinters();
      expect(passedTimeout).toBe(5000);
    });

    it('queries CUPS when on darwin/linux', async () => {
      const mockExec = async (cmd: string) => {
        if (cmd === 'lpstat -p') {
          return { stdout: 'printer DeskJet_2300 is idle.\n', stderr: '' };
        }
        return { stdout: 'system default destination: DeskJet_2300\n', stderr: '' };
      };

      const adapter = createSystemSpoolerAdapter({ platform: 'darwin', execAsync: mockExec });
      const printers = await adapter.getPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0].name).toBe('DeskJet_2300');
      expect(printers[0].isColorSupported).toBe(true);
      expect(printers[0].isDefault).toBe(true);
    });

    it('executes silent Start-Process command on win32', async () => {
      const tempPdf = join(tmpdir(), 'test_invoice.pdf');
      writeFileSync(tempPdf, Buffer.from('%PDF-1.4 test'));
      const executedCommands: string[] = [];
      const mockExec = async (cmd: string) => {
        executedCommands.push(cmd);
        return { stdout: '', stderr: '' };
      };

      try {
        const adapter = createSystemSpoolerAdapter({ platform: 'win32', execAsync: mockExec });
        await adapter.printFile('HP LaserJet Pro M126nw', tempPdf, { copies: 2 });

        expect(executedCommands).toHaveLength(2); // Validation + Dispatch
        expect(executedCommands[0]).toContain("Get-Printer -Name 'HP LaserJet Pro M126nw'");
        expect(executedCommands[1]).toContain('Start-Process');
        expect(executedCommands[1]).toContain('-Verb PrintTo');
        expect(executedCommands[1]).toContain('HP LaserJet Pro M126nw');
        expect(executedCommands[1]).toContain(tempPdf);
      } finally {
        if (existsSync(tempPdf)) unlinkSync(tempPdf);
      }
    });

    it('executes lp command on darwin/linux', async () => {
      const tempPdf = join(tmpdir(), 'test_ticket.pdf');
      writeFileSync(tempPdf, Buffer.from('%PDF-1.4 test'));
      const executedCommands: string[] = [];
      const mockExec = async (cmd: string) => {
        executedCommands.push(cmd);
        return { stdout: '', stderr: '' };
      };

      try {
        const adapter = createSystemSpoolerAdapter({ platform: 'darwin', execAsync: mockExec });
        await adapter.printFile('Epson_L3150', tempPdf, { copies: 3 });

        expect(executedCommands).toHaveLength(1);
        expect(executedCommands[0]).toBe(`lp -d "Epson_L3150" -n 3 "${tempPdf}"`);
      } finally {
        if (existsSync(tempPdf)) unlinkSync(tempPdf);
      }
    });
  });
});
