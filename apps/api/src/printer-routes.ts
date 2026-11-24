import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { Db } from 'mongodb';
import {
  AgentEnrollmentRequestSchema,
  AgentJobStatusUpdateRequestSchema,
  AgentSyncPrintersRequestSchema,
  UpdatePrinterRoleRequestSchema,
} from '@snapprint/contracts';
import { canRedeemPairingKey, generatePairingCode } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import { findPhotoAssetByStudioAndAssetId } from './repositories/photo-asset.repository.js';
import { updateOrderStatus } from './repositories/order.repository.js';
import {
  consumePairingKey,
  createPairingKey,
  findAgentDeviceByToken,
  findPairingKey,
  findPendingPrintJobsByStudio,
  findPrintJobById,
  findPrintJobsByOrderId,
  listStudioPrinters,
  registerAgentDevice,
  syncDiscoveredPrinters,
  toPrintJobRecord,
  updateDeviceHeartbeat,
  updatePrintJobStatus,
  updateStudioPrinterRole,
} from './repositories/printer.repository.js';
import { getStorageService, StorageService } from './storage/storage-service.js';

export interface PrinterRoutesOptions {
  db?: Db;
  storage?: StorageService;
}

export async function printerRoutes(
  app: FastifyInstance,
  opts?: PrinterRoutesOptions
): Promise<void> {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // 1. Operator: Generate New Agent Pairing Key
  app.post<{ Params: { studioId: string } }>(
    '/studios/:studioId/agent/pairing-keys',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.params.studioId;
      const code = generatePairingCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins TTL

      const created = await createPairingKey(db, studioId, code, expiresAt);
      return reply.status(201).send({
        code: created.code,
        studioId: created.studioId,
        expiresAt: created.expiresAt.toISOString(),
        status: created.status,
      });
    }
  );

  // 2. Operator: List Studio Printers
  app.get<{ Params: { studioId: string } }>(
    '/studios/:studioId/printers',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const printers = await listStudioPrinters(db, request.params.studioId);
      return reply.send({
        printers: printers.map((p) => ({
          id: p.id,
          studioId: p.studioId,
          name: p.name,
          driverName: p.driverName,
          role: p.role,
          isColorSupported: p.isColorSupported,
          supportedPaperSizes: p.supportedPaperSizes,
          status: p.status,
          isDefaultOsPrinter: p.isDefaultOsPrinter,
          lastSeenAt: p.lastSeenAt.toISOString(),
        })),
      });
    }
  );

  // 3. Operator: Update Printer Role (active_bw, active_color, standby)
  app.patch<{ Params: { studioId: string; printerId: string } }>(
    '/studios/:studioId/printers/:printerId/role',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const body = UpdatePrinterRoleRequestSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid printer role payload.',
        });
      }

      const updated = await updateStudioPrinterRole(
        db,
        request.params.studioId,
        request.params.printerId,
        body.data.role
      );

      if (!updated) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'PRINTER_NOT_FOUND',
          message: 'Printer not found in this studio.',
        });
      }

      return reply.send({
        success: true,
        printerId: request.params.printerId,
        role: body.data.role,
      });
    }
  );

  // 4. Device Agent: Enroll with Pairing Code
  app.post('/agent/enroll', async (request, reply) => {
    const db = getEffectiveDb();
    const body = AgentEnrollmentRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid agent enrollment payload.',
      });
    }

    const key = await findPairingKey(db, body.data.pairingCode);
    if (!key) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'PAIRING_KEY_NOT_FOUND',
        message: 'Pairing key not found.',
      });
    }

    const redemption = canRedeemPairingKey(
      { status: key.status, expiresAt: key.expiresAt.toISOString() },
      new Date().toISOString()
    );

    if (!redemption.allowed) {
      return reply.status(400).send({
        statusCode: 400,
        code: redemption.reason,
        message: 'Pairing key cannot be redeemed.',
      });
    }

    const consumed = await consumePairingKey(db, body.data.pairingCode);
    if (!consumed) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'PAIRING_KEY_ALREADY_USED',
        message: 'Pairing key has already been consumed.',
      });
    }

    const deviceId = `dev_${crypto.randomBytes(8).toString('hex')}`;
    const deviceToken = `dvt_${crypto.randomBytes(24).toString('hex')}`;

    await registerAgentDevice(db, {
      deviceId,
      studioId: key.studioId,
      hostname: body.data.hostname,
      osPlatform: body.data.osPlatform,
      agentVersion: body.data.agentVersion,
      deviceToken,
      status: 'active',
    });

    return reply.status(201).send({
      success: true,
      deviceId,
      studioId: key.studioId,
      deviceToken,
    });
  });

  // 5. Device Agent: Sync Discovered Printers
  app.post('/agent/sync-printers', async (request, reply) => {
    const db = getEffectiveDb();
    const token = request.headers['x-device-token'] as string | undefined;
    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Missing x-device-token header.',
      });
    }

    const device = await findAgentDeviceByToken(db, token);
    if (!device) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Invalid device token.',
      });
    }

    const body = AgentSyncPrintersRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid sync printers payload.',
      });
    }

    await syncDiscoveredPrinters(db, device.studioId, body.data.printers);
    await updateDeviceHeartbeat(db, device.deviceId);

    return reply.send({
      success: true,
      syncedCount: body.data.printers.length,
    });
  });

  // 6. Device Agent: Heartbeat
  app.post('/agent/heartbeat', async (request, reply) => {
    const db = getEffectiveDb();
    const token = request.headers['x-device-token'] as string | undefined;
    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Missing x-device-token header.',
      });
    }

    const device = await findAgentDeviceByToken(db, token);
    if (!device) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Invalid device token.',
      });
    }

    await updateDeviceHeartbeat(db, device.deviceId);
    return reply.send({ success: true, timestamp: new Date().toISOString() });
  });

  const getEffectiveStorage = (): StorageService => opts?.storage ?? getStorageService();

  // 7. Device Agent: Fetch Pending Jobs
  app.get('/agent/jobs/pending', async (request, reply) => {
    const db = getEffectiveDb();
    const token = request.headers['x-device-token'] as string | undefined;
    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Missing x-device-token header.',
      });
    }

    const device = await findAgentDeviceByToken(db, token);
    if (!device) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Invalid device token.',
      });
    }

    const jobs = await findPendingPrintJobsByStudio(db, device.studioId);
    return reply.send({
      jobs: jobs.map(toPrintJobRecord),
    });
  });

  // 8. Device Agent: Stream Document File
  app.get<{ Params: { jobId: string } }>('/agent/jobs/:jobId/document', async (request, reply) => {
    const db = getEffectiveDb();
    const storage = getEffectiveStorage();
    const token = request.headers['x-device-token'] as string | undefined;
    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Missing x-device-token header.',
      });
    }

    const device = await findAgentDeviceByToken(db, token);
    if (!device) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Invalid device token.',
      });
    }

    const job = await findPrintJobById(db, request.params.jobId);
    if (!job || job.studioId !== device.studioId) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'JOB_NOT_FOUND',
        message: 'Print job not found.',
      });
    }

    const asset = await findPhotoAssetByStudioAndAssetId(db, device.studioId, job.assetId);
    if (!asset) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'ASSET_NOT_FOUND',
        message: 'Document asset not found.',
      });
    }

    const binary = await storage.get(asset.storageKey);
    if (!binary) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'DOCUMENT_FILE_NOT_FOUND',
        message: 'Document file binary not found in storage.',
      });
    }

    reply.header('Content-Type', binary.mimeType || 'application/octet-stream');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(job.filename)}"`
    );
    return reply.send(Buffer.from(binary.data));
  });

  // 9. Device Agent: Update Job Status (processing, completed, failed)
  app.post<{ Params: { jobId: string } }>('/agent/jobs/:jobId/status', async (request, reply) => {
    const db = getEffectiveDb();
    const token = request.headers['x-device-token'] as string | undefined;
    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Missing x-device-token header.',
      });
    }

    const device = await findAgentDeviceByToken(db, token);
    if (!device) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'DEVICE_UNAUTHORIZED',
        message: 'Invalid device token.',
      });
    }

    const job = await findPrintJobById(db, request.params.jobId);
    if (!job || job.studioId !== device.studioId) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'JOB_NOT_FOUND',
        message: 'Print job not found.',
      });
    }

    const body = AgentJobStatusUpdateRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid job status payload.',
      });
    }

    await updatePrintJobStatus(db, job.jobId, body.data.status, body.data.errorMessage);

    if (body.data.status === 'completed') {
      const siblingJobs = await findPrintJobsByOrderId(db, job.orderId);
      const allCompleted =
        siblingJobs.length > 0 &&
        siblingJobs.every((j) => (j.jobId === job.jobId ? true : j.status === 'completed'));
      if (allCompleted) {
        await updateOrderStatus(db, job.studioId, job.orderId, 'ready', {
          eventId: `evt_ready_${Date.now()}`,
          fromStatus: 'processing',
          toStatus: 'ready',
          timestamp: new Date().toISOString(),
          reason: 'All print jobs physically printed by agent spooler.',
        });
      }
    }

    return reply.send({
      success: true,
      jobId: job.jobId,
      status: body.data.status,
    });
  });
}
