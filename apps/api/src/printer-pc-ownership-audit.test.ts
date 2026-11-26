import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, TestAuthContext } from './auth-test-helper.js';
import { atomicClaimNextPendingJobs } from './repositories/print-job-claim.repository.js';
import { PRINT_JOBS_COLLECTION, PrintJobDocument } from './repositories/print-job.repository.js';
import { getStudioActivePrintersAndCapabilities } from './repositories/printer-allowance.repository.js';
import {
  listStudioPrintersWithLiveness,
  PRINTERS_COLLECTION,
  syncDiscoveredPrinters,
} from './repositories/printer.repository.js';

describe('Audit Verification: 4 Critical PC Ownership & Fleet Liveness Defects', () => {
  let ctx: TestAuthContext;
  const studioId = 'std_hanvika_studio';

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  it('Defect 1 Fixed: Printers strictly store deviceId PC ownership', async () => {
    // Computer 1 (Office) syncs its Canon printer
    await syncDiscoveredPrinters(
      ctx.db as any,
      studioId,
      [
        {
          printerId: 'prn_canon_office',
          name: 'Canon LBP2900 (Office)',
          driverName: 'Canon Driver',
          connectionType: 'usb',
          isColorSupported: false,
          supportedPaperSizes: ['A4'],
          duplexSupport: 'unsupported',
          supportedDuplexSizes: [],
          capabilityProvenance: 'unverified',
          status: 'online',
          isDefaultOsPrinter: true,
          lastSeenAt: new Date().toISOString(),
        },
      ],
      'dev_computer_1'
    );

    // Computer 2 (Home) syncs its Epson printer
    await syncDiscoveredPrinters(
      ctx.db as any,
      studioId,
      [
        {
          printerId: 'prn_epson_home',
          name: 'Epson L805 (Home Photo)',
          driverName: 'Epson Driver',
          connectionType: 'usb',
          isColorSupported: true,
          supportedPaperSizes: ['4x6'],
          duplexSupport: 'unsupported',
          supportedDuplexSizes: [],
          capabilityProvenance: 'unverified',
          status: 'online',
          isDefaultOsPrinter: true,
          lastSeenAt: new Date().toISOString(),
        },
      ],
      'dev_computer_2'
    );

    const printers = await ctx.db
      .collection(PRINTERS_COLLECTION)
      .find({ studioId })
      .toArray();

    const officePrinter = printers.find((p: any) => p.id === 'prn_canon_office');
    const homePrinter = printers.find((p: any) => p.id === 'prn_epson_home');

    expect(officePrinter?.deviceId).toBe('dev_computer_1');
    expect(homePrinter?.deviceId).toBe('dev_computer_2');
  });

  it('Defect 2 Fixed: Eliminates zombie online status when Computer 1 turns off while Computer 2 is on', async () => {
    const now = new Date();
    const staleHeartbeat = new Date(now.getTime() - 150_000); // 2.5 minutes ago (offline)

    // Register Computer 1 (Office - Powered Off)
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_computer_1',
      studioId,
      hostname: 'Shop-PC-1',
      status: 'active',
      lastHeartbeatAt: staleHeartbeat,
      createdAt: staleHeartbeat,
    });

    // Register Computer 2 (Home - Active & Online)
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_computer_2',
      studioId,
      hostname: 'Home-Laptop-2',
      status: 'active',
      lastHeartbeatAt: now,
      createdAt: now,
    });

    // Seed both printers stored as 'online' from prior sync
    await ctx.db.collection(PRINTERS_COLLECTION).insertMany([
      {
        id: 'prn_canon_office',
        studioId,
        name: 'Canon LBP2900',
        deviceId: 'dev_computer_1',
        role: 'active_bw',
        isColorSupported: false,
        supportedPaperSizes: ['A4'],
        status: 'online',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prn_epson_home',
        studioId,
        name: 'Epson L805',
        deviceId: 'dev_computer_2',
        role: 'active_color',
        isColorSupported: true,
        supportedPaperSizes: ['4x6'],
        status: 'online',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // Live reconciliation must detect Computer 1 is off and mark Canon as offline!
    const livePrinters = await listStudioPrintersWithLiveness(ctx.db as any, studioId);
    const officePrinter = livePrinters.find((p) => p.id === 'prn_canon_office');
    const homePrinter = livePrinters.find((p) => p.id === 'prn_epson_home');

    expect(officePrinter?.status).toBe('offline');
    expect(homePrinter?.status).toBe('online');

    // Public studio capabilities must NOT offer A4 because the office PC is off!
    const { activePrinters } = await getStudioActivePrintersAndCapabilities(ctx.db as any, studioId);
    expect(activePrinters).toHaveLength(1);
    expect(activePrinters[0].id).toBe('prn_epson_home');
  });

  it('Defects 3 & 4 Fixed: Computer 2 CANNOT hijack Computer 1 jobs, preventing spooler crashes', async () => {
    const now = new Date();

    // Register printers on their respective hosts
    await ctx.db.collection(PRINTERS_COLLECTION).insertMany([
      {
        id: 'prn_canon_office',
        studioId,
        name: 'Canon LBP2900',
        deviceId: 'dev_computer_1',
        status: 'online',
      },
      {
        id: 'prn_epson_home',
        studioId,
        name: 'Epson L805',
        deviceId: 'dev_computer_2',
        status: 'online',
      },
    ]);

    // Create a B&W job targeted for the Canon printer in the shop
    await ctx.db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).insertOne({
      jobId: 'job_shop_invoice_101',
      studioId,
      orderId: 'ord_101',
      itemId: 'itm_1',
      assetId: 'ast_1',
      targetPrinterId: 'prn_canon_office',
      printerName: 'Canon LBP2900',
      deviceId: 'dev_computer_1',
      colorMode: 'bw',
      paperSize: 'A4',
      sides: 'single',
      copies: 1,
      filename: 'invoice.pdf',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Computer 2 polls / claims jobs
    const claimedByComputer2 = await atomicClaimNextPendingJobs(ctx.db as any, studioId, 'dev_computer_2');
    // Computer 2 must receive ZERO jobs! Cross-computer hijacking is blocked!
    expect(claimedByComputer2).toHaveLength(0);

    // Computer 1 polls / claims jobs
    const claimedByComputer1 = await atomicClaimNextPendingJobs(ctx.db as any, studioId, 'dev_computer_1');
    // Computer 1 claims its own job!
    expect(claimedByComputer1).toHaveLength(1);
    expect(claimedByComputer1[0].jobId).toBe('job_shop_invoice_101');
    expect(claimedByComputer1[0].claimedByDeviceId).toBe('dev_computer_1');
  });
});
