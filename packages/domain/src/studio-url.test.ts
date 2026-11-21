import { describe, expect, it } from 'vitest';
import { buildPermanentStudioUrl, parseStudioSlugFromUrl } from './studio-url.js';

describe('Studio URL Domain Rules', () => {
  it('builds canonical studio URL without trailing slashes', () => {
    expect(buildPermanentStudioUrl('https://snapprint.in', 'koramangala-studio')).toBe(
      'https://snapprint.in/s/koramangala-studio'
    );
    expect(buildPermanentStudioUrl('https://snapprint.in///', 'koramangala-studio')).toBe(
      'https://snapprint.in/s/koramangala-studio'
    );
  });

  it('rejects invalid studio slugs', () => {
    expect(() => buildPermanentStudioUrl('https://snapprint.in', 'Invalid_Slug!')).toThrow(
      'Invalid studio slug format'
    );
  });

  it('parses valid studio slug from canonical URL', () => {
    expect(parseStudioSlugFromUrl('https://snapprint.in/s/koramangala-studio')).toBe(
      'koramangala-studio'
    );
    expect(parseStudioSlugFromUrl('https://snapprint.in/other/path')).toBeNull();
    expect(parseStudioSlugFromUrl('not-a-valid-url')).toBeNull();
  });
});
