import { FastifyInstance } from 'fastify';
import { Db } from 'mongodb';
import { UpdatePrinterRoleRequestSchema } from '@snapprint/contracts';
import { generatePairingCode } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import { registerPrinterAgentRoutes } from './printer-agent-routes.js';
import { registerPrinterJobRoutes } from './printer-job-routes.js';
import { requeuePrintJob } from './repositories/print-job-claim.repository.js';
import {
  createPairingKey,
  listStudioDevices,
  listStudioPrinters,
  revokeAgentDevice,
  updateStudioPrinterRole,
} from './repositories/printer.repository.js';
import { StorageService } from './storage/storage-service.js';

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
      const code = generatePairingCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const created = await createPairingKey(db, request.params.studioId, code, expiresAt);
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

  // 3. Operator: Update Printer Role
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

  // 4. Operator: List Fleet Devices & Online Status
  app.get<{ Params: { studioId: string } }>(
    '/studios/:studioId/devices',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const devices = await listStudioDevices(db, request.params.studioId);
      const now = Date.now();
      return reply.send({
        devices: devices.map((d) => ({
          deviceId: d.deviceId,
          studioId: d.studioId,
          hostname: d.hostname,
          osPlatform: d.osPlatform,
          agentVersion: d.agentVersion,
          status: d.status,
          isOnline: now - new Date(d.lastHeartbeatAt).getTime() < 120_000 && d.status === 'active',
          lastHeartbeatAt: new Date(d.lastHeartbeatAt).toISOString(),
          createdAt: new Date(d.createdAt).toISOString(),
        })),
      });
    }
  );

  // 5. Operator: Revoke Agent Device
  app.post<{ Params: { studioId: string; deviceId: string } }>(
    '/studios/:studioId/devices/:deviceId/revoke',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const revoked = await revokeAgentDevice(db, request.params.studioId, request.params.deviceId);
      if (!revoked) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'DEVICE_NOT_FOUND',
          message: 'Device not found in this studio.',
        });
      }
      return reply.send({ success: true, deviceId: request.params.deviceId, status: 'revoked' });
    }
  );

  // 6. Operator: Requeue Stalled/Failed Print Job
  app.post<{ Params: { studioId: string; jobId: string } }>(
    '/studios/:studioId/jobs/:jobId/requeue',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const requeued = await requeuePrintJob(db, request.params.studioId, request.params.jobId);
      if (!requeued) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'JOB_NOT_REQUEUEABLE',
          message: 'Job not found or not in stalled/failed state.',
        });
      }
      return reply.send({ success: true, jobId: request.params.jobId, status: requeued.status });
    }
  );

  await registerPrinterAgentRoutes(app, opts);
  await registerPrinterJobRoutes(app, opts);
}
