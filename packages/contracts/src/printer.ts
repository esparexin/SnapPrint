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

export const DuplexSupportSchema = z.enum(['supported', 'unsupported', 'unknown']);
export type DuplexSupport = z.infer<typeof DuplexSupportSchema>;

export const CapabilityProvenanceSchema = z.enum([
  'driver_query',
  'system_detected',
  'manual_verified',
  'unverified',
]);
export type CapabilityProvenance = z.infer<typeof CapabilityProvenanceSchema>;

export const DiscoveredPrinterSchema = z.object({
  printerId: PrinterIdSchema,
  deviceId: z.string().trim().min(3).max(64).optional(),
  name: z.string().trim().min(1).max(120),
  driverName: z.string().trim().min(1).max(160),
  connectionType: PrinterConnectionTypeSchema.default('unknown'),
  isColorSupported: z.boolean().default(false),
  supportedPaperSizes: z.array(PaperSizeSchema).min(1).default(['A4']),
  duplexSupport: DuplexSupportSchema.default('unknown'),
  supportedDuplexSizes: z.array(PaperSizeSchema).default([]),
  capabilityProvenance: CapabilityProvenanceSchema.default('unverified'),
  status: PrinterStatusSchema.default('online'),
  isDefaultOsPrinter: z.boolean().default(false),
  lastSeenAt: z.string().datetime(),
});
export type DiscoveredPrinter = z.infer<typeof DiscoveredPrinterSchema>;

export const AssignedStudioPrinterSchema = z.object({
  id: PrinterIdSchema,
  studioId: StudioIdSchema,
  deviceId: z.string().trim().min(3).max(64).optional(),
  boundUserId: z.string().trim().min(3).max(64).optional(),
  name: z.string().trim().min(1).max(120),
  driverName: z.string().trim().min(1).max(160),
  role: PrinterRoleSchema.default('standby'),
  isColorSupported: z.boolean().default(false),
  supportedPaperSizes: z.array(PaperSizeSchema).min(1).default(['A4']),
  duplexSupport: DuplexSupportSchema.default('unknown'),
  supportedDuplexSizes: z.array(PaperSizeSchema).default([]),
  capabilityProvenance: CapabilityProvenanceSchema.default('unverified'),
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

export const PrintJobStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'stalled',
]);
export type PrintJobStatus = z.infer<typeof PrintJobStatusSchema>;

export const PrintJobRecordSchema = z.object({
  jobId: z.string().trim().min(3).max(64),
  studioId: StudioIdSchema,
  orderId: z.string().trim().min(3).max(64),
  itemId: z.string().trim().min(1).max(64),
  assetId: z.string().trim().min(1).max(128),
  targetPrinterId: PrinterIdSchema,
  printerName: z.string().trim().min(1).max(120),
  deviceId: z.string().optional(),
  colorMode: z.enum(['bw', 'color']),
  paperSize: PaperSizeSchema,
  sides: z.enum(['single', 'double']),
  copies: z.number().int().min(1).max(100).default(1),
  filename: z.string().trim().min(1).max(256),
  pageRange: z.string().optional(),
  status: PrintJobStatusSchema.default('pending'),
  claimedByDeviceId: z.string().optional(),
  leaseExpiresAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type PrintJobRecord = z.infer<typeof PrintJobRecordSchema>;

export const AgentPendingJobsResponseSchema = z.object({
  jobs: z.array(PrintJobRecordSchema),
});
export type AgentPendingJobsResponse = z.infer<typeof AgentPendingJobsResponseSchema>;

export const AgentJobStatusUpdateRequestSchema = z.object({
  status: PrintJobStatusSchema,
  errorMessage: z.string().max(500).optional(),
});
export type AgentJobStatusUpdateRequest = z.infer<typeof AgentJobStatusUpdateRequestSchema>;

export const StudioDeviceRecordSchema = z.object({
  deviceId: z.string(),
  studioId: StudioIdSchema,
  boundUserId: z.string().optional(),
  workstationLabel: z.string().optional(),
  hostname: z.string(),
  osPlatform: z.enum(['win32', 'darwin', 'linux']),
  agentVersion: z.string(),
  status: z.enum(['active', 'revoked', 'unbound']),
  lastHeartbeatAt: z.string().datetime(),
  isOnline: z.boolean(),
  createdAt: z.string().datetime(),
});
export type StudioDeviceRecord = z.infer<typeof StudioDeviceRecordSchema>;

export const ConfirmPrinterCapabilityRequestSchema = z.object({
  duplexSupport: z.enum(['supported', 'unsupported']),
  supportedDuplexSizes: z.array(PaperSizeSchema).optional(),
});
export type ConfirmPrinterCapabilityRequest = z.infer<
  typeof ConfirmPrinterCapabilityRequestSchema
>;

export const UnbindDeviceRequestSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});
export type UnbindDeviceRequest = z.infer<typeof UnbindDeviceRequestSchema>;
