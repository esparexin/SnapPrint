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

  it('reconciles public studio capabilities from studio onboarding configuration when no physical printers are online', async () => {
    const ctx = await createTestApp();
    ctx.studios.push({
      id: 'studio_onboarding_caps',
      slug: 'onboarded-caps-studio',
      name: 'Onboarded Caps Studio',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      capabilities: {
        autoPrintMaxPages: 30,
        isAutoPrintEnabled: true,
        supportsColor: true,
        supportsBlackAndWhite: true,
        supportedPaperSizes: ['A4', 'A3', 'legal'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/public/studios/onboarded-caps-studio',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.capabilities.supportedPaperSizes).toEqual(['A4', 'A3', 'legal']);
    expect(body.capabilities.supportsColor).toBe(true);
    expect(body.capabilities.customPaperSizes).toEqual([]);
  });

  it('preserves enabled custom paper sizes in public capabilities when printers are offline', async () => {
    const ctx = await createTestApp();
    const studioId = 'studio_offline_custom';
    ctx.studios.push({
      id: studioId,
      slug: 'offline-custom-studio',
      name: 'Offline Custom Studio',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      capabilities: {
        autoPrintMaxPages: 30,
        isAutoPrintEnabled: true,
        supportsColor: true,
        supportsBlackAndWhite: true,
        supportedPaperSizes: ['A4'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createCustomPaperSize(ctx.db, studioId, {
      printerId: 'prn_offline',
      name: '12x18 Poster',
      width: 12,
      height: 18,
      unit: 'in',
      isEnabled: true,
    });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/public/studios/offline-custom-studio',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.capabilities.customPaperSizes).toHaveLength(1);
    expect(body.capabilities.customPaperSizes[0].name).toBe('12x18 Poster');
  });
});
