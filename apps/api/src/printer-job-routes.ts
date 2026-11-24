import { FastifyInstance } from 'fastify';
import { Db } from 'mongodb';
import { AgentJobStatusUpdateRequestSchema } from '@snapprint/contracts';
import { getDb } from './db.js';
import { updateOrderStatus } from './repositories/order.repository.js';
import { findPhotoAssetByStudioAndAssetId } from './repositories/photo-asset.repository.js';
import {
  findAgentDeviceByToken,
  findPendingPrintJobsByStudio,
  findPrintJobById,
  findPrintJobsByOrderId,
  toPrintJobRecord,
  updatePrintJobStatus,
} from './repositories/printer.repository.js';
import { getStorageService, StorageService } from './storage/storage-service.js';

export interface PrinterJobRoutesOptions {
  db?: Db;
  storage?: StorageService;
}

export async function registerPrinterJobRoutes(
  app: FastifyInstance,
  opts?: PrinterJobRoutesOptions
): Promise<void> {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveStorage = (): StorageService => opts?.storage ?? getStorageService();

  // 1. Device Agent: Fetch Pending Jobs
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

  // 2. Device Agent: Stream Document File
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

  // 3. Device Agent: Update Job Status (processing, completed, failed)
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
