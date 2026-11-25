import { describe, expect, it, vi } from 'vitest';
import { StudioPublicCapabilities } from '@snapprint/contracts';
import { fetchStudioPrinters, StudioFleetAllowance, StudioPrinter } from './printer-client';

describe('Fleet Hub Allowance & Storefront Duplex UI Gating', () => {
  it('fetchStudioPrinters parses fleet allowance and printer duplex metadata', async () => {
    const mockPrinter: StudioPrinter = {
      id: 'prn_dp_01',
      studioId: 'std_test',
      name: 'Brother HL-L2350DW',
      driverName: 'Brother Driver',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4', 'letter'],
      duplexSupport: 'supported',
      supportedDuplexSizes: ['A4'],
      capabilityProvenance: 'driver_query',
      status: 'online',
      lastSeenAt: '2026-11-25T10:00:00.000Z',
    };

    const mockAllowance: StudioFleetAllowance = {
      registeredCount: 3,
      activeCount: 2,
      maxActivePrinters: 2,
      remainingActiveCapacity: 0,
      isLimitReached: true,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        printers: [mockPrinter],
        allowance: mockAllowance,
      }),
    });

    const res = await fetchStudioPrinters('std_test', mockFetch as unknown as typeof fetch);
    expect(res.printers).toHaveLength(1);
    expect(res.printers[0].duplexSupport).toBe('supported');
    expect(res.printers[0].supportedDuplexSizes).toEqual(['A4']);
    expect(res.printers[0].capabilityProvenance).toBe('driver_query');
    expect(res.allowance).toBeDefined();
    expect(res.allowance?.isLimitReached).toBe(true);
    expect(res.allowance?.activeCount).toBe(2);
    expect(res.allowance?.maxActivePrinters).toBe(2);
  });

  it('evaluates storefront duplex availability strictly fail-closed', () => {
    function isDuplexAvailable(
      capabilities: StudioPublicCapabilities | undefined,
      paperSize: string
    ): boolean {
      if (!capabilities?.supportsDuplex) return false;
      if (!capabilities.supportedDuplexSizes || capabilities.supportedDuplexSizes.length === 0) {
        return true;
      }
      return capabilities.supportedDuplexSizes.includes(paperSize);
    }

    // 1. Undefined capabilities -> strictly false (fail-closed)
    expect(isDuplexAvailable(undefined, 'A4')).toBe(false);

    // 2. Simplex-only capabilities -> false
    const simplexCaps: StudioPublicCapabilities = {
      supportsDuplex: false,
      supportedDuplexSizes: [],
      supportsColor: false,
      supportedPaperSizes: ['A4'],
    };
    expect(isDuplexAvailable(simplexCaps, 'A4')).toBe(false);

    // 3. Duplex supported on A4 only
    const a4DuplexCaps: StudioPublicCapabilities = {
      supportsDuplex: true,
      supportedDuplexSizes: ['A4'],
      supportsColor: true,
      supportedPaperSizes: ['A4', 'A3'],
    };
    expect(isDuplexAvailable(a4DuplexCaps, 'A4')).toBe(true);
    expect(isDuplexAvailable(a4DuplexCaps, 'A3')).toBe(false); // A3 duplex not supported
  });
});
