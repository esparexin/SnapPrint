import { describe, expect, it, vi } from 'vitest';
import {
  createSystemSpoolerAdapter,
  parseWindowsPrintersJson,
  resolvePrinterStatus,
} from './spooler-adapter.js';
import { buildWindowsPrinterValidationScript } from './windows-print-dispatcher.js';

describe('USB Printer Physical Connectivity & Status', () => {
  describe('resolvePrinterStatus for USB hardware', () => {
    it('returns offline when USB printer is not present in PnP (powered off or unplugged)', () => {
      expect(
        resolvePrinterStatus(false, 'Normal', {
          connectionType: 'usb',
          isPnpPresent: false,
        })
      ).toBe('offline');
    });

    it('returns online when USB printer is present in PnP (powered on and connected)', () => {
      expect(
        resolvePrinterStatus(false, 'Normal', {
          connectionType: 'usb',
          isPnpPresent: true,
        })
      ).toBe('online');
    });

    it('gracefully falls back to normal status when isPnpPresent is undefined', () => {
      expect(
        resolvePrinterStatus(false, 'Normal', {
          connectionType: 'usb',
          isPnpPresent: undefined,
        })
      ).toBe('online');
    });
  });

  describe('parseWindowsPrintersJson with USB PnP presence', () => {
    it('marks USB printer offline when Windows Spooler claims Normal but PnP reports absent', () => {
      const psJson = JSON.stringify([
        {
          Name: 'EPSON L3150 Series',
          DriverName: 'EPSON L3150 Series',
          PortName: 'USB001',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
          IsPnpPresent: false,
        },
        {
          Name: 'HP LaserJet M126nw',
          DriverName: 'HP LaserJet M126nw',
          PortName: 'USB002',
          Default: false,
          WorkOffline: false,
          PrinterStatus: 'Normal',
          IsPnpPresent: true,
        },
      ]);

      const printers = parseWindowsPrintersJson(psJson);
      expect(printers).toHaveLength(2);

      // Powered off USB printer is offline
      expect(printers[0].name).toBe('EPSON L3150 Series');
      expect(printers[0].status).toBe('offline');
      expect(printers[0].connectionType).toBe('usb');

      // Powered on USB printer is online
      expect(printers[1].name).toBe('HP LaserJet M126nw');
      expect(printers[1].status).toBe('online');
      expect(printers[1].connectionType).toBe('usb');
    });
  });

  describe('createSystemSpoolerAdapter USB presence hook', () => {
    it('marks USB printer offline when checkUsbPrinterPresent returns false', async () => {
      const mockStdout = JSON.stringify([
        {
          Name: 'EPSON L3150 USB',
          DriverName: 'EPSON L3150',
          PortName: 'USB001',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
          IsPnpPresent: true,
        },
      ]);

      const mockExec = vi.fn().mockResolvedValue({ stdout: mockStdout, stderr: '' });
      const mockUsbCheck = vi.fn().mockResolvedValue(false);

      const adapter = createSystemSpoolerAdapter({
        platform: 'win32',
        execAsync: mockExec,
        checkUsbPrinterPresent: mockUsbCheck,
      });

      const printers = await adapter.getPrinters();
      expect(printers).toHaveLength(1);
      expect(printers[0].status).toBe('offline');
      expect(mockUsbCheck).toHaveBeenCalledWith('EPSON L3150 USB');
    });
  });

  describe('buildWindowsPrinterValidationScript USB validation', () => {
    it('includes PnP presence check for USB ports', () => {
      const script = buildWindowsPrinterValidationScript('EPSON L3150 Series');
      expect(script).toContain("PortName -match 'usb'");
      expect(script).toContain('Get-PnpDevice -Class PrintQueue, USB -PresentOnly');
      expect(script).toContain('PRINTER_OFFLINE: USB printer');
    });
  });
});
