import { describe, expect, it } from 'vitest';
import {
  parseCupsPrinters,
  parseWindowsPrintersJson,
  resolvePrinterStatus,
} from './spooler-adapter.js';

describe('Printer Status Detection (Spooler & Hardware)', () => {
  describe('resolvePrinterStatus', () => {
    it('returns offline when WorkOffline is true', () => {
      expect(resolvePrinterStatus(true, 'Normal')).toBe('offline');
      expect(resolvePrinterStatus(true, '')).toBe('offline');
      expect(resolvePrinterStatus(true, undefined)).toBe('offline');
    });

    it('returns offline when PrinterStatus indicates offline or paused', () => {
      expect(resolvePrinterStatus(false, 'Offline')).toBe('offline');
      expect(resolvePrinterStatus(false, 'Paused')).toBe('offline');
      expect(resolvePrinterStatus(false, 'UserInterventionRequired')).toBe('offline');
    });

    it('returns error when PrinterStatus contains Error', () => {
      expect(resolvePrinterStatus(false, 'Error')).toBe('error');
      expect(resolvePrinterStatus(false, 'PaperError')).toBe('error');
    });

    it('returns online when WorkOffline is false and status is normal', () => {
      expect(resolvePrinterStatus(false, 'Normal')).toBe('online');
      expect(resolvePrinterStatus(false, 'Idle')).toBe('online');
      expect(resolvePrinterStatus(false, '')).toBe('online');
      expect(resolvePrinterStatus(undefined, undefined)).toBe('online');
    });
  });

  describe('parseWindowsPrintersJson with live status', () => {
    it('correctly maps online and offline printers from Windows spooler', () => {
      const psJson = JSON.stringify([
        {
          Name: 'HP LaserJet M126nw',
          DriverName: 'HP LaserJet M126 Driver',
          Default: true,
          WorkOffline: false,
          PrinterStatus: 'Normal',
        },
        {
          Name: 'Epson L3150 Series',
          DriverName: 'EPSON L3150 Series',
          Default: false,
          WorkOffline: true,
          PrinterStatus: 'Offline',
        },
      ]);

      const printers = parseWindowsPrintersJson(psJson);
      expect(printers).toHaveLength(2);
      expect(printers[0].name).toBe('HP LaserJet M126nw');
      expect(printers[0].status).toBe('online');
      expect(printers[1].name).toBe('Epson L3150 Series');
      expect(printers[1].status).toBe('offline');
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
