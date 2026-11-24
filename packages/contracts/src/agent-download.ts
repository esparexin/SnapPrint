import { z } from 'zod';

/**
 * Authoritative Windows Print Agent artifact metadata.
 * Defines the contract for one-click downloading, version check, and SHA-256 verification.
 */
export const AgentDownloadMetadataSchema = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g. 1.0.0)'),
  installerName: z.literal('SnapPrint-Print-Agent.msi'),
  downloadUrl: z.string().url(),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/, 'SHA-256 must be a 64-character hexadecimal hash'),
  sizeBytes: z.number().int().positive(),
  releaseDate: z.string().datetime(),
});
export type AgentDownloadMetadata = z.infer<typeof AgentDownloadMetadataSchema>;
