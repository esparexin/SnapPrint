import { describe, expect, it } from 'vitest';
import { parsePageRange } from './page-range.js';

describe('Page Range Domain Logic', () => {
  it('parses "all" or empty string to all document pages', () => {
    expect(parsePageRange('all', 5)).toEqual({
      valid: true,
      pages: [1, 2, 3, 4, 5],
    });
    expect(parsePageRange('', 3)).toEqual({
      valid: true,
      pages: [1, 2, 3],
    });
  });

  it('parses single pages and hyphenated ranges', () => {
    const result = parsePageRange('1-3, 5, 7-8', 10);
    expect(result.valid).toBe(true);
    expect(result.pages).toEqual([1, 2, 3, 5, 7, 8]);
  });

  it('de-duplicates and sorts page numbers', () => {
    const result = parsePageRange('5, 2-4, 3, 1', 10);
    expect(result.valid).toBe(true);
    expect(result.pages).toEqual([1, 2, 3, 4, 5]);
  });

  it('rejects reversed ranges', () => {
    const result = parsePageRange('5-2', 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Reversed');
  });

  it('rejects page numbers exceeding total pages', () => {
    const result = parsePageRange('1-12', 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds total document page count');
  });

  it('rejects zero or negative page numbers', () => {
    const result = parsePageRange('0-3', 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1 or greater');
  });

  it('rejects malformed syntax or invalid characters', () => {
    const result = parsePageRange('1-3; delete from orders', 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });
});
