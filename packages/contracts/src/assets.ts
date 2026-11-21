import { z } from 'zod';
import { StudioIdSchema } from './tenant.js';

export const AllowedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

export const AllowedImageMimeTypeSchema = z.enum(AllowedImageMimeTypes);

export type AllowedImageMimeType = z.infer<typeof AllowedImageMimeTypeSchema>;

export const UploadLimits = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFilesPerSession: 50,
} as const;

export const PhotoAssetSchema = z.object({
  assetId: z.string().min(16).max(128),
  studioId: StudioIdSchema,
  sessionId: z.string().min(16).max(128),
  originalFilename: z.string().min(1).max(255),
  mimeType: AllowedImageMimeTypeSchema,
  fileSizeBytes: z.number().int().positive().max(UploadLimits.maxFileSize),
  widthPx: z.number().int().positive().optional(),
  heightPx: z.number().int().positive().optional(),
  storageKey: z.string().min(10).max(512),
  createdAt: z.string().datetime(),
});

export type PhotoAsset = z.infer<typeof PhotoAssetSchema>;
