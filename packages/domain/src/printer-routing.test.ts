import { describe, expect, it } from 'vitest';
import {
  canRedeemPairingKey,
  createPrintJobsForOrder,
  generatePairingCode,
  PrinterRoutingCandidate,
  resolvePrinterForJob,
} from './printer-routing.js';

describe('Printer Routing Domain Logic', () => {
  const hpBwPrinter: PrinterRoutingCandidate = {
    id: 'prn_hp_bw',
    name: 'HP LaserJet Pro M126nw',
    role: 'active_bw',
    isColorSupported: false,
    supportedPaperSizes: ['A4', 'legal'],
    status: 'online',
  };

  const epsonColorPrinter: PrinterRoutingCandidate = {
    id: 'prn_epson_color',
    name: 'Epson L3150 Series',
    role: 'active_color',
    isColorSupported: true,
    supportedPaperSizes: ['A4', 'A5'],
    status: 'online',
  };

  const canonStandbyBw: PrinterRoutingCandidate = {
    id: 'prn_canon_standby',
    name: 'Canon LBP2900',
    role: 'standby',
    isColorSupported: false,
    supportedPaperSizes: ['A4'],
    status: 'online',
  };

  describe('resolvePrinterForJob', () => {
    it('returns error when no printers are registered', () => {
      const res = resolvePrinterForJob({ colorMode: 'bw', paperSize: 'A4', printers: [] });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_PRINTERS_CONFIGURED');
    });

    it('returns error when all printers are offline', () => {
      const offlineHp = { ...hpBwPrinter, status: 'offline' as const };
      const res = resolvePrinterForJob({ colorMode: 'bw', paperSize: 'A4', printers: [offlineHp] });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_ONLINE_PRINTERS');
    });

    it('returns error when no printer supports the requested paper size', () => {
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A3',
        printers: [hpBwPrinter, epsonColorPrinter],
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_PAPER_SIZE_SUPPORT');
    });

    it('routes B&W job directly to active_bw printer (HP LaserJet)', () => {
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A4',
        printers: [hpBwPrinter, epsonColorPrinter, canonStandbyBw],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_hp_bw');
      expect(res.selectedPrinter?.role).toBe('active_bw');
    });

    it('routes Color job directly to active_color printer (Epson L3150)', () => {
      const res = resolvePrinterForJob({
        colorMode: 'color',
        paperSize: 'A4',
        printers: [hpBwPrinter, epsonColorPrinter, canonStandbyBw],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_epson_color');
      expect(res.selectedPrinter?.role).toBe('active_color');
    });

    it('returns NO_COLOR_SUPPORT when color is requested but only B&W printers are available', () => {
      const res = resolvePrinterForJob({
        colorMode: 'color',
        paperSize: 'A4',
        printers: [hpBwPrinter, canonStandbyBw],
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_COLOR_SUPPORT');
    });

    it('falls back to standby B&W printer if active_bw is offline', () => {
      const offlineHp = { ...hpBwPrinter, status: 'offline' as const };
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A4',
        printers: [offlineHp, canonStandbyBw],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_canon_standby');
    });

    it('falls back to active_color printer for B&W job if no dedicated B&W printer exists', () => {
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A4',
        printers: [epsonColorPrinter],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_epson_color');
    });
  });

  describe('generatePairingCode', () => {
    it('generates pairing code matching SNAP-XXXX-YYYY pattern', () => {
      const code1 = generatePairingCode();
      const code2 = generatePairingCode();
      expect(code1).toMatch(/^SNAP-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(code2).toMatch(/^SNAP-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(code1).not.toBe(code2);
    });
  });

  describe('canRedeemPairingKey', () => {
    const now = '2026-11-23T12:00:00.000Z';
    const future = '2026-11-23T12:15:00.000Z';
    const past = '2026-11-23T11:59:00.000Z';

    it('allows redemption of active key before expiry', () => {
      const res = canRedeemPairingKey({ status: 'active', expiresAt: future }, now);
      expect(res.allowed).toBe(true);
    });

    it('rejects key if status is not active (consumed/revoked)', () => {
      const consumed = canRedeemPairingKey({ status: 'consumed', expiresAt: future }, now);
      expect(consumed.allowed).toBe(false);
      expect(consumed.reason).toBe('KEY_NOT_ACTIVE');

      const revoked = canRedeemPairingKey({ status: 'revoked', expiresAt: future }, now);
      expect(revoked.allowed).toBe(false);
      expect(revoked.reason).toBe('KEY_NOT_ACTIVE');
    });

    it('rejects key if current time is past expiry', () => {
      const expired = canRedeemPairingKey({ status: 'active', expiresAt: past }, now);
      expect(expired.allowed).toBe(false);
      expect(expired.reason).toBe('KEY_EXPIRED');
    });
  });

  describe('createPrintJobsForOrder', () => {
    it('generates concrete print jobs routing B&W to active_bw and Color to active_color', () => {
      const nowIso = '2026-11-24T08:00:00.000Z';
      const order = {
        orderId: 'ord_sample_999',
        studioId: 'std_hyderabad',
        items: [
          {
            assetId: 'ast_resume_pdf',
            filename: 'resume.pdf',
            paperSize: 'A4' as const,
            colorMode: 'black_and_white' as const,
            sides: 'single_sided' as const,
            copies: 2,
            pageSelection: '1-3',
          },
          {
            assetId: 'ast_cert_jpg',
            filename: 'certificate.jpg',
            paperSize: 'A4' as const,
            colorMode: 'color' as const,
            sides: 'single_sided' as const,
            copies: 1,
            pageSelection: 'all',
          },
        ],
      };

      const result = createPrintJobsForOrder(
        order,
        [hpBwPrinter, epsonColorPrinter],
        nowIso
      );

      expect(result.success).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.jobs).toHaveLength(2);

      const bwJob = result.jobs[0];
      expect(bwJob.orderId).toBe('ord_sample_999');
      expect(bwJob.targetPrinterId).toBe('prn_hp_bw');
      expect(bwJob.printerName).toBe('HP LaserJet Pro M126nw');
      expect(bwJob.colorMode).toBe('bw');
      expect(bwJob.copies).toBe(2);
      expect(bwJob.pageRange).toBe('1-3');
      expect(bwJob.status).toBe('pending');

      const colorJob = result.jobs[1];
      expect(colorJob.targetPrinterId).toBe('prn_epson_color');
      expect(colorJob.printerName).toBe('Epson L3150 Series');
      expect(colorJob.colorMode).toBe('color');
      expect(colorJob.copies).toBe(1);
      expect(colorJob.pageRange).toBeUndefined(); // 'all' converted to undefined
    });

    it('reports failure when an item cannot be routed to any available hardware', () => {
      const order = {
        orderId: 'ord_sample_888',
        studioId: 'std_hyderabad',
        items: [
          {
            assetId: 'ast_banner_pdf',
            filename: 'banner.pdf',
            paperSize: 'A3' as const, // Not supported by hpBwPrinter or epsonColorPrinter
            colorMode: 'color' as const,
            sides: 'single_sided' as const,
            copies: 1,
          },
        ],
      };

      const result = createPrintJobsForOrder(order, [hpBwPrinter, epsonColorPrinter]);

      expect(result.success).toBe(false);
      expect(result.jobs).toHaveLength(0);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].filename).toBe('banner.pdf');
      expect(result.failures[0].reason).toBe('NO_PAPER_SIZE_SUPPORT');
    });
  });
});
