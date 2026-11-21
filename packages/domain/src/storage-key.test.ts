import { describe, expect, it } from 'vitest';
import {
  buildPrivateStorageKey,
  isStorageKeyOwnedBySession,
  sanitizeStorageFilename,
} from './storage-key.js';

describe('Storage Key Domain Logic', () => {
  it('sanitizes unsafe filenames and directory traversal sequences', () => {
    expect(sanitizeStorageFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeStorageFilename('my family photo (1).jpg')).toBe('my_family_photo_1.jpg');
    expect(sanitizeStorageFilename('   ')).toBe('photo.jpg');
  });

  it('builds strictly partitioned private storage keys', () => {
    const key = buildPrivateStorageKey(
      'studio_alpha',
      'sess_1234567890123456',
      'asset_abcdef1234567890',
      'portrait.png'
    );
    expect(key).toBe(
      'studios/studio_alpha/sessions/sess_1234567890123456/asset_abcdef1234567890/portrait.png'
    );
  });

  it('validates session storage key ownership strictly', () => {
    const validKey =
      'studios/studio_alpha/sessions/sess_1234567890123456/asset_abcdef1234567890/portrait.png';
    expect(isStorageKeyOwnedBySession(validKey, 'studio_alpha', 'sess_1234567890123456')).toBe(
      true
    );

    // Mismatched studio
    expect(isStorageKeyOwnedBySession(validKey, 'studio_beta', 'sess_1234567890123456')).toBe(
      false
    );

    // Mismatched session
    expect(isStorageKeyOwnedBySession(validKey, 'studio_alpha', 'sess_other')).toBe(false);
  });
});
