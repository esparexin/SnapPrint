import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { Db } from 'mongodb';
import { AgentEnrollmentRequestSchema, AgentSyncPrintersRequestSchema } from '@snapprint/contracts';
import { canRedeemPairingKey } from '@snapprint/domain';
import { getDb } from './db.js';
import {
  consumePairingKey,
  findAgentDeviceByToken,
  findPairingKey,
  registerAgentDevice,
  syncDiscoveredPrinters,
  updateDeviceHeartbeat,
} from './repositories/printer.repository.js';

export interface PrinterAgentRoutesOptions {
  db?: Db;
}

export async function registerPrinterAgentRoutes(
  app: FastifyInstance,
  opts?: PrinterAgentRoutesOptions
): Promise<void> {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const raw = typeof body === 'string' ? body : body?.toString('utf8') || '';
    if (!raw.trim()) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      error.statusCode = 400;
      done(error, undefined);
    }
  });

  // 1. Device Agent: Enroll with Pairing Code
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

  // 2. Device Agent: Sync Discovered Printers
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

  // 3. Device Agent: Heartbeat
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
}
