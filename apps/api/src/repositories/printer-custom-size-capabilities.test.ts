import { describe, expect, it } from 'vitest';
import { createTestApp } from '../auth-test-helper.js';
import { createCustomPaperSize } from './custom-paper-size.repository.js';
import { getStudioActivePrintersAndCapabilities } from './printer-allowance.repository.js';
import { syncDiscoveredPrinters, updateStudioPrinterRole } from './printer.repository.js';

describe('Studio Active Custom Paper Size Capabilities', () => {
  const studioId = 'std_test_custom_cap';

  it('includes enabled customPaperSizes in capabilities for active online printers', async () => {
    const ctx = await createTestApp();

    await syncDiscoveredPrinters(
      ctx.db,
      studioId,
      [
        {
          printerId: 'prn_poster_1',
          name: 'Epson SureColor P900',
          driverName: 'Epson P900 Series',
          connectionType: 'network',
          isColorSupported: true,
          supportedPaperSizes: ['A4'],
          duplexSupport: 'supported',
          supportedDuplexSizes: ['A4'],
          capabilityProvenance: 'unverified',
          status: 'online',
          isDefaultOsPrinter: false,
          lastSeenAt: new Date().toISOString(),
        },
      ],
      'dev_pc_1'
    );
    await updateStudioPrinterRole(ctx.db, studioId, 'prn_poster_1', 'active_color');

    const created = await createCustomPaperSize(ctx.db, studioId, {
      printerId: 'prn_poster_1',
      name: '12x18 Poster',
      width: 12,
      height: 18,
      unit: 'in',
    });

    const { capabilities } = await getStudioActivePrintersAndCapabilities(ctx.db, studioId);
    expect(capabilities.supportedPaperSizes).toContain(created.id);
    expect(capabilities.customPaperSizes).toHaveLength(1);
    expect(capabilities.customPaperSizes?.[0]).toEqual({
      id: created.id,
      name: '12x18 Poster',
      width: 12,
      height: 18,
      unit: 'in',
    });
  });

  it('excludes custom paper sizes when disabled', async () => {
    const ctx = await createTestApp();

    await syncDiscoveredPrinters(
      ctx.db,
      studioId,
      [
        {
          printerId: 'prn_poster_2',
          name: 'Epson SureColor P900',
          driverName: 'Epson P900 Series',
          connectionType: 'network',
          isColorSupported: true,
          supportedPaperSizes: ['A4'],
          duplexSupport: 'supported',
          supportedDuplexSizes: ['A4'],
          capabilityProvenance: 'unverified',
          status: 'online',
          isDefaultOsPrinter: false,
          lastSeenAt: new Date().toISOString(),
        },
      ],
      'dev_pc_1'
    );
    await updateStudioPrinterRole(ctx.db, studioId, 'prn_poster_2', 'active_color');

    await createCustomPaperSize(ctx.db, studioId, {
      printerId: 'prn_poster_2',
      name: 'Disabled Banner',
      width: 300,
      height: 900,
      unit: 'mm',
      isEnabled: false,
    });

    const { capabilities } = await getStudioActivePrintersAndCapabilities(ctx.db, studioId);
    expect(capabilities.customPaperSizes).toEqual([]);
  });
});
