/**
 * Pure domain logic for private, studio-bound and session-bound object storage keys.
 */

export function sanitizeStorageFilename(rawFilename: string): string {
  // Strip path traversal attempts and keep safe alphanumeric characters, dots, dashes, underscores
  const basename = rawFilename.split(/[/\\]/).pop() || 'photo.jpg';
  const sanitized = basename
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  return sanitized.length > 0 ? sanitized.substring(0, 120) : 'photo.jpg';
}

export function buildPrivateStorageKey(
  studioId: string,
  sessionId: string,
  assetId: string,
  filename: string
): string {
  if (!studioId || !sessionId || !assetId) {
    throw new Error('studioId, sessionId, and assetId are required for storage key generation');
  }

  const safeName = sanitizeStorageFilename(filename);
  return `studios/${studioId}/sessions/${sessionId}/${assetId}/${safeName}`;
}

export function isStorageKeyOwnedBySession(
  storageKey: string,
  studioId: string,
  sessionId: string
): boolean {
  if (!storageKey || !studioId || !sessionId) return false;
  const expectedPrefix = `studios/${studioId}/sessions/${sessionId}/`;
  return storageKey.startsWith(expectedPrefix);
}
