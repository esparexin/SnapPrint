import { AllowedMimeType } from '@snapprint/contracts';
import {
  detectImageMimeType,
  extractImageDimensions,
  inspectPdf,
  isPdfBuffer,
} from '@snapprint/domain';

export interface FileInspectionSuccess {
  ok: true;
  mimeType: AllowedMimeType;
  widthPx?: number;
  heightPx?: number;
  pageCount?: number;
}

export interface FileInspectionFailure {
  ok: false;
  statusCode: number;
  code: string;
  message: string;
}

export type FileInspectionResult = FileInspectionSuccess | FileInspectionFailure;

export function inspectUploadedFile(
  buffer: Buffer,
  declaredMimeType?: string
): FileInspectionResult {
  let detectedMime: AllowedMimeType | null = null;
  let dims: { widthPx?: number; heightPx?: number } = {};
  let pageCount: number | undefined;

  if (isPdfBuffer(buffer)) {
    const pdfInspection = inspectPdf(buffer);
    if (pdfInspection.error) {
      return {
        ok: false,
        statusCode: 400,
        code: 'INVALID_PDF',
        message: pdfInspection.error,
      };
    }
    detectedMime = 'application/pdf';
    pageCount = pdfInspection.pageCount;
  } else {
    detectedMime = detectImageMimeType(buffer);
    if (detectedMime) {
      dims = extractImageDimensions(buffer);
      pageCount = 1;
    }
  }

  if (!detectedMime) {
    return {
      ok: false,
      statusCode: 400,
      code: 'INVALID_FILE_SIGNATURE',
      message: 'File content does not match any supported format (PDF, JPEG, PNG, WebP).',
    };
  }

  if (declaredMimeType && declaredMimeType !== detectedMime) {
    return {
      ok: false,
      statusCode: 400,
      code: 'SPOOFED_MIME_TYPE',
      message: `Declared MIME type '${declaredMimeType}' does not match detected format '${detectedMime}'.`,
    };
  }

  return {
    ok: true,
    mimeType: detectedMime,
    widthPx: dims.widthPx,
    heightPx: dims.heightPx,
    pageCount,
  };
}
