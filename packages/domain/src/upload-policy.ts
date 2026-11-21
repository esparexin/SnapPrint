import { AllowedImageMimeTypes, UploadLimits } from '@snapprint/contracts';

export interface UploadValidationInput {
  mimeType: string;
  fileSizeBytes: number;
  currentSessionFilesCount: number;
}

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates a photo upload against strict file type, size, and count limits.
 */
export function validateUploadRequest(input: UploadValidationInput): UploadValidationResult {
  const allowed = (AllowedImageMimeTypes as readonly string[]).includes(input.mimeType);
  if (!allowed) {
    return {
      ok: false,
      error: `Unsupported image format '${input.mimeType}'. Allowed formats: ${AllowedImageMimeTypes.join(', ')}`,
    };
  }

  if (input.fileSizeBytes <= 0) {
    return {
      ok: false,
      error: 'File size must be greater than 0 bytes',
    };
  }

  if (input.fileSizeBytes > UploadLimits.maxFileSize) {
    const maxMb = Math.round(UploadLimits.maxFileSize / (1024 * 1024));
    return {
      ok: false,
      error: `File size exceeds the maximum limit of ${maxMb}MB`,
    };
  }

  if (input.currentSessionFilesCount >= UploadLimits.maxFilesPerSession) {
    return {
      ok: false,
      error: `Session has reached the limit of ${UploadLimits.maxFilesPerSession} uploaded files`,
    };
  }

  return { ok: true };
}
