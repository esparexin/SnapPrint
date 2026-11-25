import { describe, expect, it } from 'vitest';
import {
  AgentEnrollmentRequestSchema,
  AgentJobStatusUpdateRequestSchema,
  AgentPairingKeySchema,
  AgentPendingJobsResponseSchema,
  AgentSyncPrintersRequestSchema,
  AssignedStudioPrinterSchema,
  CapabilityProvenanceSchema,
  DiscoveredPrinterSchema,
  DuplexSupportSchema,
  PrinterIdSchema,
  PrinterRoleSchema,
  PrinterStatusSchema,
  PrintJobRecordSchema,
  PrintJobStatusSchema,
} from './printer.js';

describe('Printer Schemas (contracts)', () => {
  describe('PrinterIdSchema & Enums', () => {
    it('validates printer ID with letters, numbers, and dashes', () => {
      expect(PrinterIdSchema.parse('prn_hp-laserjet_01')).toBe('prn_hp-laserjet_01');
      expect(() => PrinterIdSchema.parse('p!')).toThrow();
    });

    it('validates duplex support enum', () => {
      expect(DuplexSupportSchema.parse('supported')).toBe('supported');
      expect(DuplexSupportSchema.parse('unsupported')).toBe('unsupported');
      expect(DuplexSupportSchema.parse('unknown')).toBe('unknown');
      expect(() => DuplexSupportSchema.parse('invalid')).toThrow();
    });

    it('validates capability provenance enum', () => {
      expect(CapabilityProvenanceSchema.parse('driver_query')).toBe('driver_query');
      expect(CapabilityProvenanceSchema.parse('system_detected')).toBe('system_detected');
      expect(CapabilityProvenanceSchema.parse('manual_verified')).toBe('manual_verified');
      expect(CapabilityProvenanceSchema.parse('unverified')).toBe('unverified');
      expect(() => CapabilityProvenanceSchema.parse('guessed')).toThrow();
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
      expect(valid.duplexSupport).toBe('unknown');
      expect(valid.supportedDuplexSizes).toEqual([]);
      expect(valid.capabilityProvenance).toBe('unverified');
    });

    it('parses verified duplex printer with supported duplex sizes', () => {
      const valid = DiscoveredPrinterSchema.parse({
        printerId: 'prn_canon_duplex',
        name: 'Canon imageRUNNER 2520',
        driverName: 'Canon Generic UFR II',
        isColorSupported: false,
        supportedPaperSizes: ['A4', 'A3', 'legal'],
        duplexSupport: 'supported',
        supportedDuplexSizes: ['A4', 'A3'],
        capabilityProvenance: 'driver_query',
        lastSeenAt: new Date().toISOString(),
      });
      expect(valid.duplexSupport).toBe('supported');
      expect(valid.supportedDuplexSizes).toEqual(['A4', 'A3']);
      expect(valid.capabilityProvenance).toBe('driver_query');
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

  describe('PrintJob Contracts', () => {
    it('validates print job status enum', () => {
      expect(PrintJobStatusSchema.parse('pending')).toBe('pending');
      expect(PrintJobStatusSchema.parse('processing')).toBe('processing');
      expect(PrintJobStatusSchema.parse('completed')).toBe('completed');
      expect(PrintJobStatusSchema.parse('failed')).toBe('failed');
      expect(() => PrintJobStatusSchema.parse('unknown')).toThrow();
    });

    it('parses valid print job record', () => {
      const now = new Date().toISOString();
      const job = PrintJobRecordSchema.parse({
        jobId: 'job_123456',
        studioId: 'std_test',
        orderId: 'ord_987654',
        itemId: 'item_1',
        assetId: 'asset_pdf_01',
        targetPrinterId: 'prn_hp_01',
        printerName: 'HP LaserJet Pro M126nw',
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'single',
        copies: 2,
        filename: 'invoice.pdf',
        createdAt: now,
      });

      expect(job.status).toBe('pending');
      expect(job.copies).toBe(2);
      expect(job.printerName).toBe('HP LaserJet Pro M126nw');
    });

    it('parses agent pending jobs response', () => {
      const now = new Date().toISOString();
      const res = AgentPendingJobsResponseSchema.parse({
        jobs: [
          {
            jobId: 'job_1',
            studioId: 'std_test',
            orderId: 'ord_1',
            itemId: 'itm_1',
            assetId: 'ast_1',
            targetPrinterId: 'prn_epson',
            printerName: 'Epson L3150',
            colorMode: 'color',
            paperSize: 'A4',
            sides: 'single',
            copies: 1,
            filename: 'photo.jpg',
            createdAt: now,
          },
        ],
      });
      expect(res.jobs).toHaveLength(1);
      expect(res.jobs[0].colorMode).toBe('color');
    });

    it('parses agent job status update request', () => {
      const req = AgentJobStatusUpdateRequestSchema.parse({
        status: 'completed',
      });
      expect(req.status).toBe('completed');

      const failedReq = AgentJobStatusUpdateRequestSchema.parse({
        status: 'failed',
        errorMessage: 'Paper jam in tray 1',
      });
      expect(failedReq.errorMessage).toBe('Paper jam in tray 1');
    });
  });
});
