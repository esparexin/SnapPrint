import { describe, expect, it } from 'vitest';
import { calculateFitGeometry, PAPER_DIMENSIONS } from './print-geometry.js';
import {
  createPrintJobsForOrder,
  PrinterRoutingCandidate,
  resolvePrinterForJob,
} from './printer-routing.js';

describe('Printer Capability & Fleet Routing Enhancements', () => {
  const laserA4: PrinterRoutingCandidate = {
    id: 'prn_laser_a4',
    name: 'Canon LBP2900 A4 Laser',
    role: 'active_bw',
    isColorSupported: false,
    supportedPaperSizes: ['A4'],
    status: 'online',
    deviceId: 'dev_pc_1',
  };

  const commercialA3: PrinterRoutingCandidate = {
    id: 'prn_commercial_a3',
    name: 'Xerox Commercial A3 Laser',
    role: 'active_bw',
    isColorSupported: false,
    supportedPaperSizes: ['A3', 'legal'],
    status: 'online',
    deviceId: 'dev_pc_1',
  };

  const photoPrinter: PrinterRoutingCandidate = {
    id: 'prn_photo_lab',
    name: 'Epson L805 Photo Lab',
    role: 'active_color',
    isColorSupported: true,
    supportedPaperSizes: ['4x6', '5x7', 'A4', 'cps_12x18_poster'],
    status: 'online',
    deviceId: 'dev_pc_2',
  };

  it('routes A4 job to Canon LBP2900 and A3 job to Xerox A3 seamlessly', () => {
    const fleet = [laserA4, commercialA3, photoPrinter];

    const a4Job = resolvePrinterForJob({
      colorMode: 'bw',
      paperSize: 'A4',
      printers: fleet,
    });
    expect(a4Job.allowed).toBe(true);
    expect(a4Job.selectedPrinter?.id).toBe('prn_laser_a4');

    const a3Job = resolvePrinterForJob({
      colorMode: 'bw',
      paperSize: 'A3',
      printers: fleet,
    });
    expect(a3Job.allowed).toBe(true);
    expect(a3Job.selectedPrinter?.id).toBe('prn_commercial_a3');
  });

  it('routes photo paper sizes (4x6, 5x7) to photo printer', () => {
    const fleet = [laserA4, commercialA3, photoPrinter];

    const photo4x6 = resolvePrinterForJob({
      colorMode: 'color',
      paperSize: '4x6',
      printers: fleet,
    });
    expect(photo4x6.allowed).toBe(true);
    expect(photo4x6.selectedPrinter?.id).toBe('prn_photo_lab');

    const photo5x7 = resolvePrinterForJob({
      colorMode: 'color',
      paperSize: '5x7',
      printers: fleet,
    });
    expect(photo5x7.allowed).toBe(true);
    expect(photo5x7.selectedPrinter?.id).toBe('prn_photo_lab');
  });

  it('routes custom paper size (cps_*) to configured physical printer', () => {
    const fleet = [laserA4, commercialA3, photoPrinter];

    const customJob = resolvePrinterForJob({
      colorMode: 'color',
      paperSize: 'cps_12x18_poster',
      printers: fleet,
    });
    expect(customJob.allowed).toBe(true);
    expect(customJob.selectedPrinter?.id).toBe('prn_photo_lab');
  });

  it('preserves host deviceId on generated print jobs', () => {
    const fleet = [laserA4, photoPrinter];
    const result = createPrintJobsForOrder(
      {
        orderId: 'ord_test_fleet',
        studioId: 'std_main',
        items: [
          {
            assetId: 'ast_1',
            filename: 'photo.jpg',
            paperSize: '4x6',
            colorMode: 'color',
            sides: 'single',
            copies: 2,
          },
        ],
      },
      fleet
    );

    expect(result.success).toBe(true);
    expect(result.jobs[0].targetPrinterId).toBe('prn_photo_lab');
    expect(result.jobs[0].deviceId).toBe('dev_pc_2');
  });

  it('calculates fit-to-page geometry with custom dimensions and standard photo sizes', () => {
    expect(PAPER_DIMENSIONS['4x6'].widthMm).toBeCloseTo(101.6);
    expect(PAPER_DIMENSIONS['5x7'].heightMm).toBeCloseTo(177.8);
    expect(PAPER_DIMENSIONS['A6'].widthMm).toBe(105);

    const fitCustom = calculateFitGeometry(3000, 2000, 'cps_poster', 'portrait', {
      widthMm: 304.8,
      heightMm: 457.2,
      widthInches: 12,
      heightInches: 18,
    });
    expect(fitCustom.paperWidthMm).toBe(304.8);
    expect(fitCustom.effectiveWidthMm).toBeLessThanOrEqual(304.8);
  });
});
