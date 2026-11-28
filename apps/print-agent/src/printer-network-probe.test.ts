import { describe, expect, it, vi } from 'vitest';
import {
  checkNetworkPrinterReachable,
  extractNetworkHost,
  isUncPath,
  isUuidString,
} from './network-probe.js';
import {
  classifyPortConnectionType,
  createSystemSpoolerAdapter,
  parseWindowsPrintersJson,
} from './spooler-adapter.js';

describe('Network & Wi-Fi & Shared Printer Probing', () => {
  describe('isUuidString and isUncPath helpers', () => {
    it('detects UUIDs correctly', () => {
      expect(isUuidString('3b7c92a1-e45f-4a0b-9c21-789a0b1c2d3e')).toBe(true);
      expect(isUuidString('192.168.1.50')).toBe(false);
      expect(isUuidString('canon-ir2520')).toBe(false);
    });

    it('detects UNC paths correctly', () => {
      expect(isUncPath('\\\\CASHIER-PC\\EPSON')).toBe(true);
      expect(isUncPath('//192.168.1.10/HP_Printer')).toBe(true);
      expect(isUncPath('IP_192.168.1.50')).toBe(false);
      expect(isUncPath('USB001')).toBe(false);
    });
  });

  describe('extractNetworkHost for Wi-Fi, WSD, and SMB Shares', () => {
    it('extracts host from UNC shared printer ports', () => {
      expect(extractNetworkHost('\\\\192.168.1.10\\EPSON_L3150')).toBe('192.168.1.10');
      expect(extractNetworkHost('\\\\CASHIER-PC\\Canon_IR')).toBe('CASHIER-PC');
      expect(extractNetworkHost('//PRINT-SERVER/OfficeJet')).toBe('PRINT-SERVER');
    });

    it('extracts IP from standard network ports', () => {
      expect(extractNetworkHost('192.168.1.150')).toBe('192.168.1.150');
      expect(extractNetworkHost('IP_10.0.0.45')).toBe('10.0.0.45');
      expect(extractNetworkHost('WSD-canon-ir2520')).toBe('canon-ir2520');
    });

    it('returns null for WSD UUID ports to prevent broken DNS queries', () => {
      expect(extractNetworkHost('WSD-3b7c92a1-e45f-4a0b-9c21-789a0b1c2d3e')).toBeNull();
    });
  });

  describe('classifyPortConnectionType for UNC shares', () => {
    it('classifies UNC ports as network', () => {
      expect(classifyPortConnectionType('\\\\CASHIER-PC\\EPSON')).toBe('network');
      expect(classifyPortConnectionType('//192.168.1.20/HP')).toBe('network');
    });
  });

  describe('checkNetworkPrinterReachable multi-port and SMB probing', () => {
    it('returns false when standard host is unreachable', async () => {
      const res = await checkNetworkPrinterReachable('192.0.2.1', 9100, 30);
      expect(res).toBe(false);
    });

    it('returns false when UNC host is unreachable on port 445', async () => {
      const res = await checkNetworkPrinterReachable('192.0.2.1', 445, 30, true);
      expect(res).toBe(false);
    });
  });

  describe('parseWindowsPrintersJson with HostAddress resolution', () => {
    it('preserves resolved HostAddress for WSD and network printers', () => {
      const psJson = JSON.stringify([
        {
          Name: 'Canon iR2520 Wi-Fi',
          DriverName: 'Canon iR2520 Driver',
          PortName: 'WSD-3b7c92a1-e45f-4a0b-9c21-789a0b1c2d3e',
          HostAddress: '192.168.1.220',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
          IsPnpPresent: true,
        },
      ]);

      const printers = parseWindowsPrintersJson(psJson);
      expect(printers).toHaveLength(1);
      expect(printers[0].name).toBe('Canon iR2520 Wi-Fi');
      expect(printers[0].hostAddress).toBe('192.168.1.220');
      expect(printers[0].connectionType).toBe('network');
    });
  });

  describe('createSystemSpoolerAdapter with HostAddress and UNC ping', () => {
    it('uses HostAddress when PortName is a WSD UUID', async () => {
      const mockStdout = JSON.stringify([
        {
          Name: 'Epson EcoTank L3250 Wi-Fi',
          DriverName: 'EPSON L3250 Series',
          PortName: 'WSD-5f60b45d-7521-432d-86b1-0db66b168925',
          HostAddress: '192.168.1.75',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
          IsPnpPresent: true,
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
      expect(mockPing).toHaveBeenCalledWith('192.168.1.75', 9100, undefined, false);
    });

    it('probes UNC shared printer on port 445', async () => {
      const mockStdout = JSON.stringify([
        {
          Name: 'Cashier Shared HP',
          DriverName: 'HP LaserJet M126nw',
          PortName: '\\\\192.168.1.10\\HP_M126',
          Default: false,
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
      expect(mockPing).toHaveBeenCalledWith('192.168.1.10', 445, undefined, true);
    });
  });
});
