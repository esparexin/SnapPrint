import { describe, expect, it } from 'vitest';
import {
  AssignedStudioPrinterSchema,
  ConfirmPrinterCapabilityRequestSchema,
  StudioDeviceRecordSchema,
  UnbindDeviceRequestSchema,
} from './printer.js';
import {
  CreateCustomPaperSizeRequestSchema,
  CustomPaperSizeSchema,
  STANDARD_PAPER_CATALOGUE,
} from './document-print.js';

describe('Printer Capability Redesign Contracts', () => {
  describe('Workstation Identity & Capability Confirmation Schemas', () => {
    it('parses assigned studio printer with deviceId and boundUserId', () => {
      const now = new Date().toISOString();
      const printer = AssignedStudioPrinterSchema.parse({
        id: 'prn_hp_01',
        studioId: 'std_koramangala',
        deviceId: 'dev_workstation_1',
        boundUserId: 'usr_hanvika',
        name: 'HP LaserJet',
        driverName: 'HP LaserJet Driver',
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
      expect(printer.deviceId).toBe('dev_workstation_1');
      expect(printer.boundUserId).toBe('usr_hanvika');
    });

    it('parses studio device with bound operator and unbound status', () => {
      const now = new Date().toISOString();
      const device = StudioDeviceRecordSchema.parse({
        deviceId: 'dev_counter_pc',
        studioId: 'std_hanvika',
        boundUserId: 'usr_hanvika',
        workstationLabel: "Hanvika's Counter PC",
        hostname: 'COUNTER-PC-01',
        osPlatform: 'win32',
        agentVersion: '1.2.0',
        status: 'unbound',
        lastHeartbeatAt: now,
        isOnline: false,
        createdAt: now,
      });
      expect(device.status).toBe('unbound');
      expect(device.workstationLabel).toBe("Hanvika's Counter PC");
    });

    it('validates manual capability confirmation payload', () => {
      const valid = ConfirmPrinterCapabilityRequestSchema.parse({ duplexSupport: 'supported' });
      expect(valid.duplexSupport).toBe('supported');
      expect(() =>
        ConfirmPrinterCapabilityRequestSchema.parse({ duplexSupport: 'unknown' })
      ).toThrow();
    });

    it('validates device unbind payload', () => {
      const req = UnbindDeviceRequestSchema.parse({ reason: 'Upgraded to new PC' });
      expect(req.reason).toBe('Upgraded to new PC');
    });
  });

  describe('Paper Sizes Catalogue & Custom Paper Sizes', () => {
    it('contains standard paper catalogue entries', () => {
      expect(STANDARD_PAPER_CATALOGUE.length).toBeGreaterThanOrEqual(8);
      const a4 = STANDARD_PAPER_CATALOGUE.find((p) => p.id === 'A4');
      expect(a4?.widthMm).toBe(210);
      expect(a4?.heightMm).toBe(297);
    });

    it('parses custom paper size record and request', () => {
      const now = new Date().toISOString();
      const custom = CustomPaperSizeSchema.parse({
        id: 'cps_poster_12x18',
        studioId: 'std_koramangala',
        printerId: 'prn_plotter_01',
        name: '12x18 Poster',
        width: 304.8,
        height: 457.2,
        unit: 'mm',
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
      expect(custom.name).toBe('12x18 Poster');
      expect(custom.unit).toBe('mm');

      const req = CreateCustomPaperSizeRequestSchema.parse({
        printerId: 'prn_plotter_01',
        name: '12x18 Poster',
        width: '304.8',
        height: '457.2',
        unit: 'mm',
      });
      expect(req.width).toBe(304.8);
    });
  });
});
