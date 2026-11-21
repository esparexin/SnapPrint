import { AllowedImageMimeType } from '@snapprint/contracts';

/**
 * Pure domain logic for inspecting image file magic bytes and parsing header dimensions.
 * Zero external dependencies.
 */

export function detectImageMimeType(buf: Uint8Array): AllowedImageMimeType | null {
  if (buf.length < 12) return null;

  // JPEG: 0xFF, 0xD8, 0xFF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  // HEIC: 'ftyp' at 4..7
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    const validBrands = ['heic', 'heix', 'heim', 'heis', 'mif1', 'msf1'];
    if (validBrands.includes(brand)) {
      return 'image/heic';
    }
  }

  return null;
}

export function extractImageDimensions(buf: Uint8Array): {
  widthPx?: number;
  heightPx?: number;
} {
  const mime = detectImageMimeType(buf);
  if (!mime) return {};

  if (mime === 'image/png' && buf.length >= 24) {
    const width = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
    const height = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
    return { widthPx: width >>> 0, heightPx: height >>> 0 };
  }

  if (mime === 'image/jpeg') {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];

      // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = (buf[offset + 5] << 8) | buf[offset + 6];
        const width = (buf[offset + 7] << 8) | buf[offset + 8];
        return { widthPx: width, heightPx: height };
      }

      if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS

      const length = (buf[offset + 2] << 8) | buf[offset + 3];
      offset += 2 + length;
    }
  }

  if (mime === 'image/webp' && buf.length >= 30) {
    const type = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
    if (type === 'VP8X') {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { widthPx: width, heightPx: height };
    }
  }

  return {};
}

export function classifyImageOrientation(
  widthPx?: number,
  heightPx?: number
): 'portrait' | 'landscape' | 'square' | 'unknown' {
  if (!widthPx || !heightPx) return 'unknown';
  if (widthPx === heightPx) return 'square';
  return widthPx > heightPx ? 'landscape' : 'portrait';
}

export function calculatePrintDpi(
  widthPx: number,
  heightPx: number,
  targetWidthInches: number,
  targetHeightInches: number
): { dpi: number; quality: 'optimal' | 'acceptable' | 'low'; guidance: string } {
  const horizontalDpi = widthPx / targetWidthInches;
  const verticalDpi = heightPx / targetHeightInches;
  const effectiveDpi = Math.round(Math.min(horizontalDpi, verticalDpi));

  if (effectiveDpi >= 300) {
    return {
      dpi: effectiveDpi,
      quality: 'optimal',
      guidance: 'High resolution: optimal sharpness and detail for physical printing.',
    };
  }

  if (effectiveDpi >= 150) {
    return {
      dpi: effectiveDpi,
      quality: 'acceptable',
      guidance: 'Good resolution: suitable for normal viewing distance.',
    };
  }

  return {
    dpi: effectiveDpi,
    quality: 'low',
    guidance: 'Lower resolution: may appear soft or pixelated at this print size.',
  };
}
