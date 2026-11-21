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

export const AllowedDocumentMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const AllowedDocumentMimeTypeSchema = z.enum(AllowedDocumentMimeTypes);
export type AllowedDocumentMimeType = z.infer<typeof AllowedDocumentMimeTypeSchema>;

export const AllowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

export const AllowedMimeTypeSchema = z.enum(AllowedMimeTypes);
export type AllowedMimeType = z.infer<typeof AllowedMimeTypeSchema>;

export const UploadLimits = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFilesPerSession: 50,
} as const;

export const PhotoAssetSchema = z.object({
  assetId: z.string().min(16).max(128),
  studioId: StudioIdSchema,
  sessionId: z.string().min(16).max(128),
  originalFilename: z.string().min(1).max(255),
  mimeType: AllowedMimeTypeSchema,
  fileSizeBytes: z.number().int().positive().max(UploadLimits.maxFileSize),
  widthPx: z.number().int().positive().optional(),
  heightPx: z.number().int().positive().optional(),
  pageCount: z.number().int().positive().optional(),
  storageKey: z.string().min(10).max(512),
  createdAt: z.string().datetime(),
});

export type PhotoAsset = z.infer<typeof PhotoAssetSchema>;

export const UploadIntentRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive().max(UploadLimits.maxFileSize),
  mimeType: AllowedMimeTypeSchema,
});

export type UploadIntentRequest = z.infer<typeof UploadIntentRequestSchema>;

export const UploadIntentResponseSchema = z.object({
  assetId: z.string().min(16).max(128),
  storageKey: z.string().min(10).max(512),
  uploadUrl: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export type UploadIntentResponse = z.infer<typeof UploadIntentResponseSchema>;

export const PhotoAssetListResponseSchema = z.object({
  assets: z.array(PhotoAssetSchema),
  totalCount: z.number().int().nonnegative(),
});

export type PhotoAssetListResponse = z.infer<typeof PhotoAssetListResponseSchema>;
