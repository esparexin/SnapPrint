import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Db } from 'mongodb';
import { AgentJobStatusUpdateRequestSchema } from '@snapprint/contracts';
import { getDb } from './db.js';
import { updateOrderStatus } from './repositories/order.repository.js';
import { findPhotoAssetByStudioAndAssetId } from './repositories/photo-asset.repository.js';
import { atomicClaimNextPendingJobs } from './repositories/print-job-claim.repository.js';
import {
  findAgentDeviceByToken,
  findPrintJobById,
  findPrintJobsByOrderId,
  toPrintJobRecord,
  updatePrintJobStatus,
} from './repositories/printer.repository.js';
import {
  getStudioSubscription,
  isJobEntitledForFulfillment,
} from './repositories/subscription.repository.js';
import { getStorageService, StorageService } from './storage/storage-service.js';

export interface PrinterJobRoutesOptions {
  db?: Db;
  storage?: StorageService;
}

async function authDevice(request: FastifyRequest, reply: FastifyReply, db: Db) {
  const token = request.headers['x-device-token'] as string | undefined;
  if (!token) {
    reply.status(401).send({
      statusCode: 401,
      code: 'DEVICE_UNAUTHORIZED',
      message: 'Missing x-device-token header.',
    });
    return null;
  }
  const device = await findAgentDeviceByToken(db, token);
  if (!device) {
    reply.status(401).send({
      statusCode: 401,
      code: 'DEVICE_UNAUTHORIZED',
      message: 'Invalid device token.',
    });
    return null;
  }
  return device;
}

export async function registerPrinterJobRoutes(
  app: FastifyInstance,
  opts?: PrinterJobRoutesOptions
): Promise<void> {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveStorage = (): StorageService => opts?.storage ?? getStorageService();

  // 1. Device Agent: Fetch & Claim Pending Jobs
  app.get('/agent/jobs/pending', async (request, reply) => {
    const db = getEffectiveDb();
    const device = await authDevice(request, reply, db);
    if (!device) return;

    const sub = await getStudioSubscription(db, device.studioId);
    const claimedJobs = await atomicClaimNextPendingJobs(db, device.studioId, device.deviceId);

    const eligibleJobs = [];
    for (const job of claimedJobs) {
      const entitled = await isJobEntitledForFulfillment(db, device.studioId, job.orderId, sub);
      if (entitled) {
        eligibleJobs.push(job);
      }
    }

    return reply.send({ jobs: eligibleJobs.map(toPrintJobRecord) });
  });

  // 2. Device Agent: Stream Document File
  app.get<{ Params: { jobId: string } }>('/agent/jobs/:jobId/document', async (request, reply) => {
    const db = getEffectiveDb();
    const device = await authDevice(request, reply, db);
    if (!device) return;

    const job = await findPrintJobById(db, request.params.jobId);
    if (!job || job.studioId !== device.studioId) {
      return reply
        .status(404)
        .send({ statusCode: 404, code: 'JOB_NOT_FOUND', message: 'Print job not found.' });
    }

    if (job.claimedByDeviceId && job.claimedByDeviceId !== device.deviceId) {
      return reply.status(403).send({
        statusCode: 403,
        code: 'JOB_CLAIM_CONFLICT',
        message: 'Print job lease is claimed by another device.',
      });
    }

    const sub = await getStudioSubscription(db, device.studioId);
    const entitled = await isJobEntitledForFulfillment(db, device.studioId, job.orderId, sub);
    if (!entitled) {
      return reply.status(403).send({
        statusCode: 403,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Print job is not entitled for physical spooling under current subscription.',
      });
    }

    const asset = await findPhotoAssetByStudioAndAssetId(db, device.studioId, job.assetId);
    if (!asset) {
      return reply
        .status(404)
        .send({ statusCode: 404, code: 'ASSET_NOT_FOUND', message: 'Document asset not found.' });
    }

    const binary = await getEffectiveStorage().get(asset.storageKey);
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
    const device = await authDevice(request, reply, db);
    if (!device) return;

    const job = await findPrintJobById(db, request.params.jobId);
    if (!job || job.studioId !== device.studioId) {
      return reply
        .status(404)
        .send({ statusCode: 404, code: 'JOB_NOT_FOUND', message: 'Print job not found.' });
    }

    const body = AgentJobStatusUpdateRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid job status payload.',
      });
    }

    const updated = await updatePrintJobStatus(
      db,
      job.jobId,
      body.data.status,
      body.data.errorMessage,
      device.deviceId
    );
    if (!updated) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'JOB_CLAIM_CONFLICT',
        message: 'Print job lease expired or claimed by another device.',
      });
    }

    if (body.data.status === 'completed') {
      const siblingJobs = await findPrintJobsByOrderId(db, job.orderId);
      const allDone =
        siblingJobs.length > 0 &&
        siblingJobs.every((j) => (j.jobId === job.jobId ? true : j.status === 'completed'));
      if (allDone) {
        await updateOrderStatus(db, job.studioId, job.orderId, 'ready', {
          eventId: `evt_ready_${Date.now()}`,
          fromStatus: 'processing',
          toStatus: 'ready',
          timestamp: new Date().toISOString(),
          reason: 'All print jobs physically printed by agent spooler.',
        });
      }
    }

    return reply.send({ success: true, jobId: job.jobId, status: body.data.status });
  });
}
