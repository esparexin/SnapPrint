import { z } from 'zod';
import { StudioIdSchema } from './tenant.js';
import { PaperSizeSchema } from './document-print.js';

export const PrinterIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'PrinterId must contain only alphanumeric characters, dashes, or underscores',
  });
export type PrinterId = z.infer<typeof PrinterIdSchema>;

export const PrinterRoleSchema = z.enum(['active_bw', 'active_color', 'standby']);
export type PrinterRole = z.infer<typeof PrinterRoleSchema>;

export const PrinterStatusSchema = z.enum(['online', 'offline', 'busy', 'error']);
export type PrinterStatus = z.infer<typeof PrinterStatusSchema>;

export const PrinterConnectionTypeSchema = z.enum(['usb', 'network', 'virtual', 'unknown']);
export type PrinterConnectionType = z.infer<typeof PrinterConnectionTypeSchema>;

export const DiscoveredPrinterSchema = z.object({
  printerId: PrinterIdSchema,
  name: z.string().trim().min(1).max(120),
  driverName: z.string().trim().min(1).max(160),
  connectionType: PrinterConnectionTypeSchema.default('unknown'),
  isColorSupported: z.boolean().default(false),
  supportedPaperSizes: z.array(PaperSizeSchema).min(1).default(['A4']),
  status: PrinterStatusSchema.default('online'),
  isDefaultOsPrinter: z.boolean().default(false),
  lastSeenAt: z.string().datetime(),
});
export type DiscoveredPrinter = z.infer<typeof DiscoveredPrinterSchema>;

export const AssignedStudioPrinterSchema = z.object({
  id: PrinterIdSchema,
  studioId: StudioIdSchema,
  name: z.string().trim().min(1).max(120),
  driverName: z.string().trim().min(1).max(160),
  role: PrinterRoleSchema.default('standby'),
  isColorSupported: z.boolean().default(false),
  supportedPaperSizes: z.array(PaperSizeSchema).min(1).default(['A4']),
  status: PrinterStatusSchema.default('online'),
  isDefaultOsPrinter: z.boolean().default(false),
  lastSeenAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AssignedStudioPrinter = z.infer<typeof AssignedStudioPrinterSchema>;

export const PairingStatusCodeSchema = z.enum(['active', 'consumed', 'expired', 'revoked']);
export type PairingStatusCode = z.infer<typeof PairingStatusCodeSchema>;

export const AgentPairingKeySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^SNAP-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
      message: 'Pairing code must match format SNAP-XXXX-YYYY',
    }),
  studioId: StudioIdSchema,
  expiresAt: z.string().datetime(),
  status: PairingStatusCodeSchema.default('active'),
  createdAt: z.string().datetime(),
});
export type AgentPairingKey = z.infer<typeof AgentPairingKeySchema>;

export const AgentEnrollmentRequestSchema = z.object({
  pairingCode: z
    .string()
    .trim()
    .regex(/^SNAP-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  agentVersion: z.string().trim().min(1).max(32),
  hostname: z.string().trim().min(1).max(128),
  osPlatform: z.enum(['win32', 'darwin', 'linux']),
});
export type AgentEnrollmentRequest = z.infer<typeof AgentEnrollmentRequestSchema>;

export const AgentSyncPrintersRequestSchema = z.object({
  printers: z.array(DiscoveredPrinterSchema),
  timestamp: z.string().datetime(),
});
export type AgentSyncPrintersRequest = z.infer<typeof AgentSyncPrintersRequestSchema>;

export const UpdatePrinterRoleRequestSchema = z.object({
  role: PrinterRoleSchema,
});
export type UpdatePrinterRoleRequest = z.infer<typeof UpdatePrinterRoleRequestSchema>;
