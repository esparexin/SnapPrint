import { describe, expect, it } from 'vitest';
import {
  AgentEnrollmentRequestSchema,
  AgentPairingKeySchema,
  AgentSyncPrintersRequestSchema,
  AssignedStudioPrinterSchema,
  DiscoveredPrinterSchema,
  PrinterIdSchema,
  PrinterRoleSchema,
  PrinterStatusSchema,
} from './printer.js';

describe('Printer Schemas (contracts)', () => {
  describe('PrinterIdSchema & Enums', () => {
    it('validates printer ID with letters, numbers, and dashes', () => {
      expect(PrinterIdSchema.parse('prn_hp-laserjet_01')).toBe('prn_hp-laserjet_01');
      expect(() => PrinterIdSchema.parse('p!')).toThrow();
    });

    it('validates printer role enums', () => {
      expect(PrinterRoleSchema.parse('active_bw')).toBe('active_bw');
      expect(PrinterRoleSchema.parse('active_color')).toBe('active_color');
      expect(PrinterRoleSchema.parse('standby')).toBe('standby');
      expect(() => PrinterRoleSchema.parse('invalid_role')).toThrow();
    });

    it('validates printer status enums', () => {
      expect(PrinterStatusSchema.parse('online')).toBe('online');
      expect(PrinterStatusSchema.parse('offline')).toBe('offline');
      expect(PrinterStatusSchema.parse('busy')).toBe('busy');
      expect(() => PrinterStatusSchema.parse('sleeping')).toThrow();
    });
  });

  describe('DiscoveredPrinterSchema', () => {
    it('parses valid discovered printer with default A4 paper size', () => {
      const valid = DiscoveredPrinterSchema.parse({
        printerId: 'prn_123',
        name: 'HP LaserJet Pro M126nw',
        driverName: 'HP LaserJet Pro MFP',
        isColorSupported: false,
        lastSeenAt: new Date().toISOString(),
      });
      expect(valid.name).toBe('HP LaserJet Pro M126nw');
      expect(valid.supportedPaperSizes).toEqual(['A4']);
      expect(valid.status).toBe('online');
      expect(valid.isColorSupported).toBe(false);
    });

    it('rejects empty driver name or invalid date', () => {
      expect(() =>
        DiscoveredPrinterSchema.parse({
          printerId: 'prn_1',
          name: 'Printer',
          driverName: '',
          lastSeenAt: 'invalid-date',
        })
      ).toThrow();
    });
  });

  describe('AssignedStudioPrinterSchema', () => {
    it('parses assigned studio printer with standby default role', () => {
      const now = new Date().toISOString();
      const printer = AssignedStudioPrinterSchema.parse({
        id: 'prn_hp_01',
        studioId: 'std_koramangala',
        name: 'HP LaserJet',
        driverName: 'HP LaserJet Driver',
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
      expect(printer.role).toBe('standby');
      expect(printer.studioId).toBe('std_koramangala');
    });
  });

  describe('AgentPairingKeySchema & Enrollment', () => {
    it('validates valid pairing key format SNAP-XXXX-YYYY', () => {
      const now = new Date().toISOString();
      const parsed = AgentPairingKeySchema.parse({
        code: 'SNAP-7X9K-2M4P',
        studioId: 'std_123',
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        createdAt: now,
      });
      expect(parsed.code).toBe('SNAP-7X9K-2M4P');
      expect(parsed.status).toBe('active');
    });

    it('rejects invalid pairing key format', () => {
      expect(() =>
        AgentPairingKeySchema.parse({
          code: 'INVALID-CODE',
          studioId: 'std_123',
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it('validates agent enrollment request', () => {
      const req = AgentEnrollmentRequestSchema.parse({
        pairingCode: 'SNAP-ABCD-1234',
        agentVersion: '1.0.0',
        hostname: 'FRONT-DESK-PC',
        osPlatform: 'win32',
      });
      expect(req.hostname).toBe('FRONT-DESK-PC');
      expect(req.osPlatform).toBe('win32');
    });

    it('validates agent sync printers payload', () => {
      const now = new Date().toISOString();
      const sync = AgentSyncPrintersRequestSchema.parse({
        printers: [
          {
            printerId: 'prn_1',
            name: 'Epson L3150',
            driverName: 'EPSON L3150 Series',
            isColorSupported: true,
            lastSeenAt: now,
          },
        ],
        timestamp: now,
      });
      expect(sync.printers).toHaveLength(1);
      expect(sync.printers[0].isColorSupported).toBe(true);
    });
  });
});
