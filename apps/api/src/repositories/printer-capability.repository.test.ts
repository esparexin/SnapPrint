import { beforeEach, describe, expect, it } from 'vitest';
import { DiscoveredPrinter } from '@snapprint/contracts';
import { createTestApp, TestAuthContext } from '../auth-test-helper.js';
import {
  findActiveOrUnboundDevice,
  registerAgentDevice,
  unbindAgentDevice,
} from './agent-device.repository.js';
import {
  createCustomPaperSize,
  deleteCustomPaperSize,
  listCustomPaperSizes,
  toggleCustomPaperSize,
} from './custom-paper-size.repository.js';
import { getStudioFleetAllowance } from './printer-allowance.repository.js';
import {
  confirmPrinterCapability,
  listStudioPrinters,
  PRINTERS_COLLECTION,
  syncDiscoveredPrinters,
  updateStudioPrinterRole,
} from './printer.repository.js';

describe('Printer Capability & Workstation Repositories', () => {
  let ctx: TestAuthContext;
  const studioId = 'std_test_capability';

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  it('syncs discovered printers with deviceId and preserves manual duplex verification', async () => {
    const discovered: DiscoveredPrinter[] = [
      {
        printerId: 'prn_laser_a4',
        name: 'HP LaserJet M126nw',
        driverName: 'HP LaserJet Pro',
        connectionType: 'usb',
        isColorSupported: false,
        supportedPaperSizes: ['A4', 'legal'],
        duplexSupport: 'unknown',
        supportedDuplexSizes: [],
        capabilityProvenance: 'unverified',
        status: 'online',
        isDefaultOsPrinter: true,
        lastSeenAt: new Date().toISOString(),
      },
    ];

    await syncDiscoveredPrinters(ctx.db as any, studioId, discovered, 'dev_pc_1');
    let printers = await listStudioPrinters(ctx.db as any, studioId);
    expect(printers).toHaveLength(1);
    expect(printers[0].deviceId).toBe('dev_pc_1');
    expect(printers[0].duplexSupport).toBe('unknown');

    // Operator confirms duplex support manually
    await confirmPrinterCapability(ctx.db as any, studioId, 'prn_laser_a4', 'supported', ['A4']);

    // Next sync from OS driver reports unknown duplex
    await syncDiscoveredPrinters(ctx.db as any, studioId, discovered, 'dev_pc_1');
    printers = await listStudioPrinters(ctx.db as any, studioId);
    expect(printers[0].duplexSupport).toBe('supported');
    expect(printers[0].capabilityProvenance).toBe('manual_verified');
    expect(printers[0].supportedDuplexSizes).toEqual(['A4']);
  });

  it('allows multiple active printers without demoting each other', async () => {
    const discovered: DiscoveredPrinter[] = [
      {
        printerId: 'prn_1',
        name: 'A4 Laser',
        driverName: 'Laser Driver',
        connectionType: 'network',
        isColorSupported: false,
        supportedPaperSizes: ['A4'],
        duplexSupport: 'unsupported',
        supportedDuplexSizes: [],
        capabilityProvenance: 'unverified',
        status: 'online',
        isDefaultOsPrinter: true,
        lastSeenAt: new Date().toISOString(),
      },
      {
        printerId: 'prn_2',
        name: 'A3 Commercial',
        driverName: 'Commercial Driver',
        connectionType: 'network',
        isColorSupported: false,
        supportedPaperSizes: ['A3'],
        duplexSupport: 'supported',
        supportedDuplexSizes: ['A3'],
        capabilityProvenance: 'unverified',
        status: 'online',
        isDefaultOsPrinter: false,
        lastSeenAt: new Date().toISOString(),
      },
    ];

    await syncDiscoveredPrinters(ctx.db as any, studioId, discovered, 'dev_pc_1');
    await updateStudioPrinterRole(ctx.db as any, studioId, 'prn_1', 'active_bw');
    await updateStudioPrinterRole(ctx.db as any, studioId, 'prn_2', 'active_bw');

    const printers = await listStudioPrinters(ctx.db as any, studioId);
    const activePrinters = printers.filter((p) => p.role === 'active_bw');
    expect(activePrinters).toHaveLength(2);

    const allowance = await getStudioFleetAllowance(ctx.db as any, studioId);
    expect(allowance.activeCount).toBe(2);
  });

  it('manages custom paper sizes and synchronizes with physical printer capabilities', async () => {
    const discovered: DiscoveredPrinter[] = [
      {
        printerId: 'prn_photo',
        name: 'Epson L805',
        driverName: 'Epson Photo',
        connectionType: 'usb',
        isColorSupported: true,
        supportedPaperSizes: ['4x6'],
        duplexSupport: 'unsupported',
        supportedDuplexSizes: [],
        capabilityProvenance: 'unverified',
        status: 'online',
        isDefaultOsPrinter: false,
        lastSeenAt: new Date().toISOString(),
      },
    ];
    await syncDiscoveredPrinters(ctx.db as any, studioId, discovered, 'dev_pc_1');

    const created = await createCustomPaperSize(ctx.db as any, studioId, {
      printerId: 'prn_photo',
      name: '12x18 Matte Poster',
      width: 12,
      height: 18,
      unit: 'in',
      isEnabled: true,
    });
    expect(created.id).toMatch(/^cps_/);

    const listed = await listCustomPaperSizes(ctx.db as any, studioId, 'prn_photo');
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe('12x18 Matte Poster');

    let printers = await listStudioPrinters(ctx.db as any, studioId);
    expect(printers[0].supportedPaperSizes).toContain(created.id);

    // Toggle custom paper size
    await toggleCustomPaperSize(ctx.db as any, studioId, created.id, false);
    const updatedSizes = await listCustomPaperSizes(ctx.db as any, studioId, 'prn_photo');
    expect(updatedSizes[0].isEnabled).toBe(false);

    // Delete custom paper size
    await deleteCustomPaperSize(ctx.db as any, studioId, created.id);
    printers = await listStudioPrinters(ctx.db as any, studioId);
    expect(printers[0].supportedPaperSizes).not.toContain(created.id);
  });

  it('unbinds workstation PC, sets printers offline, and reports DEVICE_UNBOUND', async () => {
    const token = 'dvt_secret_test_token';
    await registerAgentDevice(ctx.db as any, {
      deviceId: 'dev_old_laptop',
      studioId,
      hostname: 'Old-Dell-Laptop',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      deviceToken: token,
      status: 'active',
      boundUserId: 'usr_op_1',
    });

    await syncDiscoveredPrinters(
      ctx.db as any,
      studioId,
      [
        {
          printerId: 'prn_attached',
          name: 'Deskjet USB',
          driverName: 'Deskjet Driver',
          connectionType: 'usb',
          isColorSupported: true,
          supportedPaperSizes: ['A4'],
          duplexSupport: 'unsupported',
          supportedDuplexSizes: [],
          capabilityProvenance: 'unverified',
          status: 'online',
          isDefaultOsPrinter: true,
          lastSeenAt: new Date().toISOString(),
        },
      ],
      'dev_old_laptop'
    );

    let authCheck = await findActiveOrUnboundDevice(ctx.db as any, token);
    expect(authCheck.device?.deviceId).toBe('dev_old_laptop');
    expect(authCheck.isUnbound).toBe(false);

    // Unbind workstation
    const unbound = await unbindAgentDevice(ctx.db as any, studioId, 'dev_old_laptop');
    expect(unbound).toBe(true);

    // Printers attached to that workstation are now offline
    const printers = await listStudioPrinters(ctx.db as any, studioId);
    expect(printers[0].status).toBe('offline');

    // Authenticating with old token reports unbound
    authCheck = await findActiveOrUnboundDevice(ctx.db as any, token);
    expect(authCheck.device).toBeUndefined();
    expect(authCheck.isUnbound).toBe(true);
  });
});
