/**
 * SnapPrint Print Agent — PE & MSI Structural Validator
 * Enforces genuine binary validation and prevents placeholder stubs.
 */

export function validatePeHeader(buffer: Buffer): boolean {
  if (buffer.length < 0x40) return false;
  if (buffer[0] !== 0x4d || buffer[1] !== 0x5a) return false; // 'MZ'
  const peOffset = buffer.readInt32LE(0x3c);
  if (peOffset < 0 || peOffset + 4 > buffer.length) return false;
  return (
    buffer[peOffset] === 0x50 && // 'P'
    buffer[peOffset + 1] === 0x45 && // 'E'
    buffer[peOffset + 2] === 0x00 &&
    buffer[peOffset + 3] === 0x00
  );
}

export function validateMsiHeader(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  return (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  );
}

export function validateMsiIntegrity(buffer: Buffer): { valid: boolean; error?: string } {
  if (buffer.length < 1024) {
    return { valid: false, error: 'MSI package size must be at least 1KB (placeholder rejected).' };
  }
  if (!validateMsiHeader(buffer)) {
    return {
      valid: false,
      error: 'Invalid OLE Compound File Binary (CFB) structured storage header.',
    };
  }
  return { valid: true };
}
