import { describe, expect, it } from 'vitest';
import { validateUploadRequest } from './upload-policy.js';

describe('Upload Policy Logic', () => {
  it('allows valid image within size and count limits', () => {
    const result = validateUploadRequest({
      mimeType: 'image/jpeg',
      fileSizeBytes: 5 * 1024 * 1024,
      currentSessionFilesCount: 2,
    });
    expect(result.ok).toBe(true);
  });

  it('allows valid PDF document within size and count limits', () => {
    const result = validateUploadRequest({
      mimeType: 'application/pdf',
      fileSizeBytes: 10 * 1024 * 1024,
      currentSessionFilesCount: 0,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects unsupported mime types', () => {
    const result = validateUploadRequest({
      mimeType: 'application/x-msdownload',
      fileSizeBytes: 1024,
      currentSessionFilesCount: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unsupported format');
  });

  it('rejects files exceeding size limit', () => {
    const result = validateUploadRequest({
      mimeType: 'image/png',
      fileSizeBytes: 60 * 1024 * 1024, // 60MB > 50MB
      currentSessionFilesCount: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('exceeds the maximum limit');
  });

  it('rejects upload when session has reached maximum file count', () => {
    const result = validateUploadRequest({
      mimeType: 'image/jpeg',
      fileSizeBytes: 1024,
      currentSessionFilesCount: 50, // max 50
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('reached the limit of 50 uploaded files');
  });
});
