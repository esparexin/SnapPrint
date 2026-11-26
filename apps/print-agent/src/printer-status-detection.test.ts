import { describe, expect, it, vi } from 'vitest';
import {
  classifyPortConnectionType,
  createSystemSpoolerAdapter,
  extractNetworkHost,
  parseCupsPrinters,
  parseWindowsPrintersJson,
  resolvePrinterStatus,
} from './spooler-adapter.js';

describe('Printer Status Detection (Spooler & Hardware)', () => {
  describe('Port & Connection Classification', () => {
    it('correctly classifies USB, Network, and Virtual ports', () => {
      expect(classifyPortConnectionType('USB001')).toBe('usb');
      expect(classifyPortConnectionType('usb_printer_dot4')).toBe('usb');
      expect(classifyPortConnectionType('192.168.1.50')).toBe('network');
      expect(classifyPortConnectionType('IP_192.168.0.200')).toBe('network');
      expect(classifyPortConnectionType('WSD-49b2-aef1')).toBe('network');
      expect(classifyPortConnectionType('PORTPROMPT:')).toBe('virtual');
      expect(classifyPortConnectionType('Microsoft Print to PDF')).toBe('virtual');
      expect(classifyPortConnectionType('COM1:')).toBe('unknown');
      expect(classifyPortConnectionType('')).toBe('unknown');
    });

    it('extracts IP or hostname from network ports', () => {
      expect(extractNetworkHost('192.168.1.150')).toBe('192.168.1.150');
      expect(extractNetworkHost('IP_10.0.0.45')).toBe('10.0.0.45');
      expect(extractNetworkHost('WSD-canon-ir2520')).toBe('canon-ir2520');
      expect(extractNetworkHost('USB001')).toBeNull();
      expect(extractNetworkHost('')).toBeNull();
    });
  });

  describe('resolvePrinterStatus with Hardware & WMI Telemetry', () => {
    it('returns offline when WorkOffline is true', () => {
      expect(resolvePrinterStatus(true, 'Normal')).toBe('offline');
      expect(resolvePrinterStatus(true, '')).toBe('offline');
      expect(resolvePrinterStatus(true, undefined)).toBe('offline');
    });

    it('returns offline when network reachability fails', () => {
      expect(
        resolvePrinterStatus(false, 'Normal', {
          networkReachable: false,
        })
      ).toBe('offline');
    });

    it('detects WMI DetectedErrorState (Paper Jam, Door Open, Out of Paper, Offline)', () => {
      // 8 = Jammed (Paper Jam)
      expect(resolvePrinterStatus(false, 'Normal', { detectedErrorState: 8 })).toBe('error');
      // 4 = No Paper (Paper Out)
      expect(resolvePrinterStatus(false, 'Normal', { detectedErrorState: 4 })).toBe('error');
      // 7 = Door Open
      expect(resolvePrinterStatus(false, 'Normal', { detectedErrorState: 7 })).toBe('error');
      // 9 = Offline
      expect(resolvePrinterStatus(false, 'Normal', { detectedErrorState: 9 })).toBe('offline');
      // 2 = No Error
      expect(resolvePrinterStatus(false, 'Normal', { detectedErrorState: 2 })).toBe('online');
    });

    it('detects WMI ExtendedPrinterStatus (Offline, Busy, Printing, Error)', () => {
      // 7 = Offline, 11 = Not Available
      expect(resolvePrinterStatus(false, 'Normal', { extendedPrinterStatus: 7 })).toBe('offline');
      expect(resolvePrinterStatus(false, 'Normal', { extendedPrinterStatus: 11 })).toBe('offline');
      // 9 = Error
      expect(resolvePrinterStatus(false, 'Normal', { extendedPrinterStatus: 9 })).toBe('error');
      // 4 = Printing, 10 = Busy
      expect(resolvePrinterStatus(false, 'Normal', { extendedPrinterStatus: 4 })).toBe('busy');
      expect(resolvePrinterStatus(false, 'Normal', { extendedPrinterStatus: 10 })).toBe('busy');
    });

    it('returns offline when PrinterStatus indicates offline or paused', () => {
      expect(resolvePrinterStatus(false, 'Offline')).toBe('offline');
      expect(resolvePrinterStatus(false, 'Paused')).toBe('offline');
      expect(resolvePrinterStatus(false, 'UserInterventionRequired')).toBe('offline');
    });

    it('returns error when PrinterStatus contains Error or Jam', () => {
      expect(resolvePrinterStatus(false, 'Error')).toBe('error');
      expect(resolvePrinterStatus(false, 'PaperError')).toBe('error');
      expect(resolvePrinterStatus(false, 'PaperJam')).toBe('error');
    });

    it('returns online when WorkOffline is false, reachable, and status is normal', () => {
      expect(resolvePrinterStatus(false, 'Normal')).toBe('online');
      expect(resolvePrinterStatus(false, 'Idle')).toBe('online');
      expect(resolvePrinterStatus(false, '')).toBe('online');
      expect(resolvePrinterStatus(undefined, undefined)).toBe('online');
    });
  });

  describe('parseWindowsPrintersJson with live status & PortName', () => {
    it('correctly maps online, offline, and connection types from Windows spooler JSON', () => {
      const psJson = JSON.stringify([
        {
          Name: 'HP LaserJet M126nw',
          DriverName: 'HP LaserJet M126 Driver',
          PortName: '192.168.1.50',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
        },
        {
          Name: 'Canon imageRUNNER 2520',
          DriverName: 'Canon iR2520',
          PortName: 'USB001',
          Default: false,
          WorkOffline: false,
          PrinterStatus: 'Normal',
          DetectedErrorState: 8, // Paper Jam!
        },
        {
          Name: 'Epson L3150 Series',
          DriverName: 'EPSON L3150 Series',
          PortName: 'USB002',
          Default: false,
          WorkOffline: true,
          PrinterStatus: 'Offline',
        },
      ]);

      const printers = parseWindowsPrintersJson(psJson);
      expect(printers).toHaveLength(3);

      expect(printers[0].name).toBe('HP LaserJet M126nw');
      expect(printers[0].status).toBe('online');
      expect(printers[0].connectionType).toBe('network');
      expect(printers[0].portName).toBe('192.168.1.50');

      expect(printers[1].name).toBe('Canon imageRUNNER 2520');
      expect(printers[1].status).toBe('error'); // Caught hardware Paper Jam!
      expect(printers[1].connectionType).toBe('usb');

      expect(printers[2].name).toBe('Epson L3150 Series');
      expect(printers[2].status).toBe('offline');
      expect(printers[2].connectionType).toBe('usb');
    });
  });

  describe('createSystemSpoolerAdapter with Network Socket Ping', () => {
    it('marks network printer offline when ping fails (physically powered off)', async () => {
      const mockStdout = JSON.stringify([
        {
          Name: 'Canon Network iR2520',
          DriverName: 'Canon iR2520 Driver',
          PortName: '192.168.1.200',
          Default: false,
          WorkOffline: false, // Windows Spooler claims Normal!
          PrinterStatus: 'Normal',
        },
        {
          Name: 'Epson L3150 USB',
          DriverName: 'EPSON L3150',
          PortName: 'USB001',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
        },
      ]);

      const mockExec = vi.fn().mockResolvedValue({ stdout: mockStdout, stderr: '' });
      // Ping returns false for 192.168.1.200 (printer is turned off / unplugged)
      const mockPing = vi.fn().mockResolvedValue(false);

      const adapter = createSystemSpoolerAdapter({
        platform: 'win32',
        execAsync: mockExec,
        pingNetworkPrinter: mockPing,
      });

      const printers = await adapter.getPrinters();
      expect(printers).toHaveLength(2);

      // Network printer was verified offline by socket ping
      expect(printers[0].name).toBe('Canon Network iR2520');
      expect(printers[0].status).toBe('offline');

      // USB printer without error remains online
      expect(printers[1].name).toBe('Epson L3150 USB');
      expect(printers[1].status).toBe('online');
    });

    it('keeps network printer online when ping succeeds (physically powered on)', async () => {
      const mockStdout = JSON.stringify([
        {
          Name: 'Canon Network iR2520',
          DriverName: 'Canon iR2520 Driver',
          PortName: '192.168.1.200',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
        },
      ]);

      const mockExec = vi.fn().mockResolvedValue({ stdout: mockStdout, stderr: '' });
      const mockPing = vi.fn().mockResolvedValue(true);

      const adapter = createSystemSpoolerAdapter({
        platform: 'win32',
        execAsync: mockExec,
        pingNetworkPrinter: mockPing,
      });

      const printers = await adapter.getPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0].status).toBe('online');
    });
  });

  describe('parseCupsPrinters with live status', () => {
    it('detects enabled vs disabled/offline CUPS printers', () => {
      const pStdout = [
        'printer HP_LaserJet is idle. enabled since Wed Nov 25 10:00:00 2026',
        'printer Epson_L3150 disabled since Wed Nov 25 10:05:00 2026 - offline or disconnected',
      ].join('\n');

      const printers = parseCupsPrinters(pStdout);
      expect(printers).toHaveLength(2);
      expect(printers[0].name).toBe('HP_LaserJet');
      expect(printers[0].status).toBe('online');
      expect(printers[1].name).toBe('Epson_L3150');
      expect(printers[1].status).toBe('offline');
    });
  });
});
