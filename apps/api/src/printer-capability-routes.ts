import { FastifyInstance } from 'fastify';
import { Db } from 'mongodb';
import { z } from 'zod';
import {
  ConfirmPrinterCapabilityRequestSchema,
  CreateCustomPaperSizeRequestSchema,
  STANDARD_PAPER_CATALOGUE,
  UnbindDeviceRequestSchema,
} from '@snapprint/contracts';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import { unbindAgentDevice } from './repositories/agent-device.repository.js';
import {
  createCustomPaperSize,
  deleteCustomPaperSize,
  listCustomPaperSizes,
  toggleCustomPaperSize,
} from './repositories/custom-paper-size.repository.js';
import { confirmPrinterCapability } from './repositories/printer.repository.js';

export interface PrinterCapabilityRoutesOptions {
  db?: Db;
}

const ToggleCustomPaperSizeSchema = z.object({
  isEnabled: z.boolean(),
});

export async function registerPrinterCapabilityRoutes(
  app: FastifyInstance,
  opts?: PrinterCapabilityRoutesOptions
): Promise<void> {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // 1. Operator: Confirm Physical Printer Capability (Duplex, etc.)
  app.patch<{ Params: { studioId: string; printerId: string } }>(
    '/studios/:studioId/printers/:printerId/capabilities/confirm',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const body = ConfirmPrinterCapabilityRequestSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid printer capability confirmation payload.',
        });
      }

      const updated = await confirmPrinterCapability(
        db,
        request.params.studioId,
        request.params.printerId,
        body.data.duplexSupport,
        body.data.supportedDuplexSizes
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
        duplexSupport: body.data.duplexSupport,
        capabilityProvenance: 'manual_verified',
      });
    }
  );

  // 2. Operator: Unbind Workstation Computer (Invalidates daemon & dissociates printers)
  app.post<{ Params: { studioId: string; deviceId: string } }>(
    '/studios/:studioId/devices/:deviceId/unbind',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const body = UnbindDeviceRequestSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Unbind confirmation is required.',
        });
      }

      const unbound = await unbindAgentDevice(
        db,
        request.params.studioId,
        request.params.deviceId
      );

      if (!unbound) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'DEVICE_NOT_FOUND',
          message: 'Device not found in this studio or already unbound.',
        });
      }

      return reply.send({
        success: true,
        deviceId: request.params.deviceId,
        status: 'unbound',
      });
    }
  );

  // 3. Operator: List Standard & Studio Custom Paper Sizes
  app.get<{ Params: { studioId: string }; Querystring: { printerId?: string } }>(
    '/studios/:studioId/paper-sizes',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const customSizes = await listCustomPaperSizes(
        db,
        request.params.studioId,
        request.query.printerId
      );
      return reply.send({
        standard: STANDARD_PAPER_CATALOGUE,
        custom: customSizes,
      });
    }
  );

  // 4. Operator: Create Custom Paper Size
  app.post<{ Params: { studioId: string } }>(
    '/studios/:studioId/paper-sizes',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const body = CreateCustomPaperSizeRequestSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid custom paper size payload.',
        });
      }

      const created = await createCustomPaperSize(db, request.params.studioId, body.data);
      return reply.status(201).send(created);
    }
  );

  // 5. Operator: Delete Custom Paper Size
  app.delete<{ Params: { studioId: string; id: string } }>(
    '/studios/:studioId/paper-sizes/:id',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const deleted = await deleteCustomPaperSize(db, request.params.studioId, request.params.id);
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'PAPER_SIZE_NOT_FOUND',
          message: 'Custom paper size not found.',
        });
      }
      return reply.send({ success: true, id: request.params.id });
    }
  );

  // 6. Operator: Toggle Custom Paper Size Enabled Status
  app.patch<{ Params: { studioId: string; id: string } }>(
    '/studios/:studioId/paper-sizes/:id/toggle',
    { preHandler: [requireStudioPermission('manage_printers', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const body = ToggleCustomPaperSizeSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'isEnabled must be a boolean.',
        });
      }

      const toggled = await toggleCustomPaperSize(
        db,
        request.params.studioId,
        request.params.id,
        body.data.isEnabled
      );
      if (!toggled) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'PAPER_SIZE_NOT_FOUND',
          message: 'Custom paper size not found.',
        });
      }
      return reply.send({ success: true, id: request.params.id, isEnabled: body.data.isEnabled });
    }
  );
}
