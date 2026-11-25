import { describe, expect, it } from 'vitest';
import {
  createPrintJobsForOrder,
  PrinterRoutingCandidate,
  resolvePrinterForJob,
} from './printer-routing.js';

describe('Printer Routing - Duplex Capability & Fail-Closed Logic', () => {
  const simplexBwPrinter: PrinterRoutingCandidate = {
    id: 'prn_simplex_bw',
    name: 'HP LaserJet 1020 (Simplex Only)',
    role: 'active_bw',
    isColorSupported: false,
    supportedPaperSizes: ['A4', 'legal'],
    status: 'online',
    duplexSupport: 'unsupported',
    supportedDuplexSizes: [],
  };

  const duplexColorPrinter: PrinterRoutingCandidate = {
    id: 'prn_duplex_color',
    name: 'Canon ImageRUNNER C3226 (Duplex Color)',
    role: 'active_color',
    isColorSupported: true,
    supportedPaperSizes: ['A4', 'A3', 'legal'],
    status: 'online',
    duplexSupport: 'supported',
    supportedDuplexSizes: ['A4', 'A3'], // Legal is simplex only on this device
  };

  const unknownDuplexBwPrinter: PrinterRoutingCandidate = {
    id: 'prn_unknown_bw',
    name: 'Generic Network Printer (Unverified)',
    role: 'active_bw',
    isColorSupported: false,
    supportedPaperSizes: ['A4'],
    status: 'online',
    duplexSupport: 'unknown',
  };

  describe('Duplex resolution (fail-closed)', () => {
    it('rejects double-sided job when printer duplex support is unknown', () => {
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'double',
        printers: [unknownDuplexBwPrinter],
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_DUPLEX_SUPPORT');
    });

    it('rejects double-sided job when candidate printer is explicitly simplex-only', () => {
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'double',
        printers: [simplexBwPrinter],
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_DUPLEX_SUPPORT');
    });

    it('routes double-sided job when printer is verified duplex capable', () => {
      const res = resolvePrinterForJob({
        colorMode: 'color',
        paperSize: 'A4',
        sides: 'double',
        printers: [simplexBwPrinter, duplexColorPrinter],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_duplex_color');
    });

    it('rejects double-sided job if paper size is not in supportedDuplexSizes', () => {
      // duplexColorPrinter supports legal for simplex, but only A4/A3 for duplex
      const res = resolvePrinterForJob({
        colorMode: 'color',
        paperSize: 'legal',
        sides: 'double',
        printers: [duplexColorPrinter],
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_DUPLEX_SUPPORT');
    });

    it('allows single-sided job on same paper size where duplex is constrained', () => {
      const res = resolvePrinterForJob({
        colorMode: 'color',
        paperSize: 'legal',
        sides: 'single',
        printers: [duplexColorPrinter],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_duplex_color');
    });

    it('falls back to duplex-capable color printer for B&W duplex job if B&W is simplex', () => {
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'double',
        printers: [simplexBwPrinter, duplexColorPrinter],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_duplex_color');
    });

    it('routes single-sided B&W job to simplex B&W printer even if duplex color exists', () => {
      const res = resolvePrinterForJob({
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'single',
        printers: [simplexBwPrinter, duplexColorPrinter],
      });
      expect(res.allowed).toBe(true);
      expect(res.selectedPrinter?.id).toBe('prn_simplex_bw');
    });
  });

  describe('createPrintJobsForOrder with duplex constraints', () => {
    it('creates double-sided job when duplex hardware is available', () => {
      const order = {
        orderId: 'ord_dup_101',
        studioId: 'std_koramangala',
        items: [
          {
            assetId: 'ast_brochure',
            filename: 'brochure.pdf',
            paperSize: 'A4' as const,
            colorMode: 'color' as const,
            sides: 'double_sided' as const,
            copies: 3,
          },
        ],
      };
      const result = createPrintJobsForOrder(order, [duplexColorPrinter]);
      expect(result.success).toBe(true);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].sides).toBe('double');
      expect(result.jobs[0].targetPrinterId).toBe('prn_duplex_color');
    });

    it('fails order item creation with NO_DUPLEX_SUPPORT when shop has only simplex hardware', () => {
      const order = {
        orderId: 'ord_dup_102',
        studioId: 'std_koramangala',
        items: [
          {
            assetId: 'ast_thesis',
            filename: 'thesis.pdf',
            paperSize: 'A4' as const,
            colorMode: 'black_and_white' as const,
            sides: 'double_sided' as const,
            copies: 1,
          },
        ],
      };
      const result = createPrintJobsForOrder(order, [simplexBwPrinter]);
      expect(result.success).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].reason).toBe('NO_DUPLEX_SUPPORT');
    });
  });
});
