import { describe, expect, it } from 'vitest';
import { CustomPaperSize, PaperSize, PaperSizeSchema } from '@snapprint/contracts';

describe('Operator Dashboard Custom Paper Size UI Resolution', () => {
  const mockCustomSizes: CustomPaperSize[] = [
    {
      id: 'cps_poster_12x18',
      studioId: 'std_test',
      printerId: 'prn_test_1',
      name: '12x18 Poster',
      width: 12,
      height: 18,
      unit: 'in',
      isEnabled: true,
      createdAt: '2026-11-26T10:00:00.000Z',
      updatedAt: '2026-11-26T10:00:00.000Z',
    },
    {
      id: 'cps_badge_id',
      studioId: 'std_test',
      printerId: 'prn_test_1',
      name: 'ID Card Badge',
      width: 85,
      height: 54,
      unit: 'mm',
      isEnabled: true,
      createdAt: '2026-11-26T10:00:00.000Z',
      updatedAt: '2026-11-26T10:00:00.000Z',
    },
  ];

  it('resolves custom paper size ID to human name when matching record exists', () => {
    function resolvePaperSizeName(
      size: PaperSize,
      customSizes?: CustomPaperSize[]
    ): { name: string; isCustom: boolean } {
      const match = size.startsWith('cps_') ? customSizes?.find((c) => c.id === size) : undefined;
      return {
        name: match ? match.name : size,
        isCustom: Boolean(match),
      };
    }

    // Standard format -> returns standard name
    expect(resolvePaperSizeName('A4', mockCustomSizes)).toEqual({ name: 'A4', isCustom: false });

    // Custom format -> returns format name
    expect(resolvePaperSizeName('cps_poster_12x18', mockCustomSizes)).toEqual({
      name: '12x18 Poster',
      isCustom: true,
    });
    expect(resolvePaperSizeName('cps_badge_id', mockCustomSizes)).toEqual({
      name: 'ID Card Badge',
      isCustom: true,
    });

    // Unmatched custom ID fallback -> returns raw ID safely
    expect(resolvePaperSizeName('cps_unknown_size', mockCustomSizes)).toEqual({
      name: 'cps_unknown_size',
      isCustom: false,
    });
  });

  it('formats custom paper size dimensions with units', () => {
    function formatSizeDimensions(
      size: PaperSize,
      customSizes?: CustomPaperSize[]
    ): string | undefined {
      const cust = customSizes?.find((c) => c.id === size);
      if (cust) {
        return `${cust.width}×${cust.height}${cust.unit}`;
      }
      return undefined;
    }

    expect(formatSizeDimensions('cps_poster_12x18', mockCustomSizes)).toBe('12×18in');
    expect(formatSizeDimensions('cps_badge_id', mockCustomSizes)).toBe('85×54mm');
    expect(formatSizeDimensions('A4', mockCustomSizes)).toBeUndefined();
  });

  it('validates PaperSizeSchema accepts custom sizes with cps_ prefix without dropping them', () => {
    expect(PaperSizeSchema.safeParse('A4').success).toBe(true);
    expect(PaperSizeSchema.safeParse('cps_poster_12x18').success).toBe(true);
    expect(PaperSizeSchema.safeParse('cps_custom-size_1').success).toBe(true);
    expect(PaperSizeSchema.safeParse('invalid_format').success).toBe(false);
  });

  it('resolves custom size label in storefront options grid mapping', () => {
    const capabilities = {
      supportsDuplex: false,
      supportedDuplexSizes: [],
      supportsColor: true,
      supportedPaperSizes: ['A4', 'cps_poster_12x18'],
      customPaperSizes: [
        {
          id: 'cps_poster_12x18',
          name: '12x18 Poster',
          width: 12,
          height: 18,
          unit: 'in' as const,
        },
      ],
    };

    const customMap = new Map(capabilities.customPaperSizes.map((c) => [c.id, c.name]));
    expect(customMap.get('cps_poster_12x18')).toBe('12x18 Poster');
    expect(customMap.get('A4')).toBeUndefined();
  });
});
