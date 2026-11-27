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
  syncDiscoveredPrinters,
  updateStudioPrinterRole,
} from './printer.repository.js';

function mockPrinter(
  printerId: string,
  name: string,
  driverName: string,
  extra?: Partial<DiscoveredPrinter>
): DiscoveredPrinter {
  return {
    printerId,
    name,
    driverName,
    connectionType: 'usb',
    isColorSupported: false,
    supportedPaperSizes: ['A4'],
    duplexSupport: 'unknown',
    supportedDuplexSizes: [],
    capabilityProvenance: 'unverified',
    status: 'online',
    isDefaultOsPrinter: true,
    lastSeenAt: new Date().toISOString(),
    ...extra,
  };
}

describe('Printer Capability & Workstation Repositories', () => {
  let ctx: TestAuthContext;
  const studioId = 'std_test_capability';

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  it('syncs discovered printers with deviceId and preserves manual duplex verification', async () => {
    const discovered: DiscoveredPrinter[] = [
      mockPrinter('prn_laser_a4', 'HP LaserJet M126nw', 'HP LaserJet Pro', {
        supportedPaperSizes: ['A4', 'legal'],
      }),
    ];

    await syncDiscoveredPrinters(ctx.db, studioId, discovered, 'dev_pc_1');
    let printers = await listStudioPrinters(ctx.db, studioId);
    expect(printers).toHaveLength(1);
    expect(printers[0].deviceId).toBe('dev_pc_1');
    expect(printers[0].duplexSupport).toBe('unknown');

    // Operator confirms duplex support manually
    await confirmPrinterCapability(ctx.db, studioId, 'prn_laser_a4', 'supported', ['A4']);

    // Next sync from OS driver reports unknown duplex
    await syncDiscoveredPrinters(ctx.db, studioId, discovered, 'dev_pc_1');
    printers = await listStudioPrinters(ctx.db, studioId);
    expect(printers[0].duplexSupport).toBe('supported');
    expect(printers[0].capabilityProvenance).toBe('manual_verified');
    expect(printers[0].supportedDuplexSizes).toEqual(['A4']);
  });

  it('allows multiple active printers without demoting each other', async () => {
    const discovered: DiscoveredPrinter[] = [
      mockPrinter('prn_1', 'A4 Laser', 'Laser Driver', { connectionType: 'network' }),
      mockPrinter('prn_2', 'A3 Commercial', 'Commercial Driver', {
        connectionType: 'network',
        supportedPaperSizes: ['A3'],
        duplexSupport: 'supported',
        supportedDuplexSizes: ['A3'],
        isDefaultOsPrinter: false,
      }),
    ];

    await syncDiscoveredPrinters(ctx.db, studioId, discovered, 'dev_pc_1');
    await updateStudioPrinterRole(ctx.db, studioId, 'prn_1', 'active_bw');
    await updateStudioPrinterRole(ctx.db, studioId, 'prn_2', 'active_bw');

    const printers = await listStudioPrinters(ctx.db, studioId);
    const activePrinters = printers.filter((p) => p.role === 'active_bw');
    expect(activePrinters).toHaveLength(2);

    const allowance = await getStudioFleetAllowance(ctx.db, studioId);
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
    await syncDiscoveredPrinters(ctx.db, studioId, discovered, 'dev_pc_1');

    const created = await createCustomPaperSize(ctx.db, studioId, {
      printerId: 'prn_photo',
      name: '12x18 Matte Poster',
      width: 12,
      height: 18,
      unit: 'in',
      isEnabled: true,
    });
    expect(created.id).toMatch(/^cps_/);

    const listed = await listCustomPaperSizes(ctx.db, studioId, 'prn_photo');
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe('12x18 Matte Poster');

    let printers = await listStudioPrinters(ctx.db, studioId);
    expect(printers[0].supportedPaperSizes).toContain(created.id);

    // Toggle custom paper size
    await toggleCustomPaperSize(ctx.db, studioId, created.id, false);
    const updatedSizes = await listCustomPaperSizes(ctx.db, studioId, 'prn_photo');
    expect(updatedSizes[0].isEnabled).toBe(false);

    // Delete custom paper size
    await deleteCustomPaperSize(ctx.db, studioId, created.id);
    printers = await listStudioPrinters(ctx.db, studioId);
    expect(printers[0].supportedPaperSizes).not.toContain(created.id);
  });

  it('unbinds workstation PC, sets printers offline, and reports DEVICE_UNBOUND', async () => {
    const token = 'dvt_secret_test_token';
    await registerAgentDevice(ctx.db, {
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
      ctx.db,
      studioId,
      [mockPrinter('prn_attached', 'Deskjet USB', 'Deskjet Driver', { isColorSupported: true })],
      'dev_old_laptop'
    );

    let authCheck = await findActiveOrUnboundDevice(ctx.db, token);
    expect(authCheck.device?.deviceId).toBe('dev_old_laptop');
    expect(authCheck.isUnbound).toBe(false);

    // Unbind workstation
    const unbound = await unbindAgentDevice(ctx.db, studioId, 'dev_old_laptop');
    expect(unbound).toBe(true);

    // Printers attached to that workstation are now offline
    const printers = await listStudioPrinters(ctx.db, studioId);
    expect(printers[0].status).toBe('offline');

    // Authenticating with old token reports unbound
    authCheck = await findActiveOrUnboundDevice(ctx.db, token);
    expect(authCheck.device).toBeUndefined();
    expect(authCheck.isUnbound).toBe(true);
  });

  it('allows Microsoft Print to PDF when no physical hardware exists and purges it once physical arrives', async () => {
    const virtualOnly: DiscoveredPrinter[] = [
      mockPrinter('prn_pdf_only', 'Microsoft Print to PDF', 'Print to PDF', {
        connectionType: 'virtual',
      }),
    ];

    await syncDiscoveredPrinters(ctx.db, studioId, virtualOnly, 'dev_pc_1');
    let printers = await listStudioPrinters(ctx.db, studioId);
    expect(printers).toHaveLength(1);
    expect(printers[0].name).toBe('Microsoft Print to PDF');
    expect(printers[0].role).toBe('active_bw');

    const physicalArrived: DiscoveredPrinter[] = [
      ...virtualOnly,
      mockPrinter('prn_epson_real', 'Epson L3150 Series', 'Epson L3150', {
        isColorSupported: true,
        supportedPaperSizes: ['A4', '4x6'],
      }),
    ];

    await syncDiscoveredPrinters(ctx.db, studioId, physicalArrived, 'dev_pc_1');
    printers = await listStudioPrinters(ctx.db, studioId);
    expect(printers).toHaveLength(1);
    expect(printers[0].name).toBe('Epson L3150 Series');
  });
});
