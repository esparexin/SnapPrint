import { describe, expect, it } from 'vitest';
import {
  calculatePrintDpi,
  classifyImageOrientation,
  detectImageMimeType,
  extractImageDimensions,
} from './image-inspector.js';

describe('Image Inspector Domain Logic', () => {
  it('detects PNG magic bytes and extracts dimensions', () => {
    // Construct standard 100x200 PNG header
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    // Width: 100 (0x00000064)
    png[16] = 0x00;
    png[17] = 0x00;
    png[18] = 0x00;
    png[19] = 0x64;
    // Height: 200 (0x000000C8)
    png[20] = 0x00;
    png[21] = 0x00;
    png[22] = 0x00;
    png[23] = 0xc8;

    expect(detectImageMimeType(png)).toBe('image/png');
    const dims = extractImageDimensions(png);
    expect(dims.widthPx).toBe(100);
    expect(dims.heightPx).toBe(200);
    expect(classifyImageOrientation(dims.widthPx, dims.heightPx)).toBe('portrait');
  });

  it('detects JPEG magic bytes and extracts dimensions', () => {
    const jpeg = new Uint8Array([
      0xff,
      0xd8,
      0xff,
      0xe0, // SOI + APP0
      0x00,
      0x10, // length = 16
      0x4a,
      0x46,
      0x49,
      0x46,
      0x00,
      0x01,
      0x01,
      0x00,
      0x00,
      0x01,
      0x00,
      0x01,
      0x00,
      0x00,
      0xff,
      0xc0, // SOF0
      0x00,
      0x11, // length = 17
      0x08, // precision = 8
      0x01,
      0x2c, // height = 300
      0x01,
      0x90, // width = 400
      0x03,
      0x01,
      0x11,
      0x00,
      0x02,
      0x11,
      0x01,
      0x03,
      0x11,
      0x01,
    ]);

    expect(detectImageMimeType(jpeg)).toBe('image/jpeg');
    const dims = extractImageDimensions(jpeg);
    expect(dims.widthPx).toBe(400);
    expect(dims.heightPx).toBe(300);
    expect(classifyImageOrientation(dims.widthPx, dims.heightPx)).toBe('landscape');
  });

  it('rejects malicious or unsupported executable files', () => {
    const exe = new Uint8Array([
      0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
    ]);
    expect(detectImageMimeType(exe)).toBeNull();

    const shortBuf = new Uint8Array([0xff, 0xd8]);
    expect(detectImageMimeType(shortBuf)).toBeNull();
  });

  it('calculates print DPI and non-deceptive quality guidance', () => {
    // 1200x1800 on a 4x6 print => 300 DPI (optimal)
    const optimal = calculatePrintDpi(1800, 1200, 6, 4);
    expect(optimal.dpi).toBe(300);
    expect(optimal.quality).toBe('optimal');

    // 600x900 on a 4x6 print => 150 DPI (acceptable)
    const acceptable = calculatePrintDpi(900, 600, 6, 4);
    expect(acceptable.dpi).toBe(150);
    expect(acceptable.quality).toBe('acceptable');

    // 300x400 on an 8x10 print => ~30-50 DPI (low)
    const low = calculatePrintDpi(400, 300, 10, 8);
    expect(low.quality).toBe('low');
  });
});
