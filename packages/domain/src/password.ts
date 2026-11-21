import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const SCRYPT_DEFAULTS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
  saltBytes: 16,
  maxmem: 32 * 1024 * 1024, // 32MB
} as const;

const HASH_REGEX = /^\$scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([a-f0-9]+)\$([a-f0-9]+)$/i;

function scryptAsync(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
}

/**
 * Hashes a plaintext password using scrypt with a unique cryptographically secure salt.
 * Formats the output in standard modular crypt format:
 * $scrypt$N=<N>,r=<r>,p=<p>$<salt_hex>$<derived_key_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length > 1024) {
    throw new Error('Password exceeds maximum supported length');
  }

  const salt = randomBytes(SCRYPT_DEFAULTS.saltBytes);
  const derivedKey = await scryptAsync(password, salt, SCRYPT_DEFAULTS.keylen, {
    N: SCRYPT_DEFAULTS.N,
    r: SCRYPT_DEFAULTS.r,
    p: SCRYPT_DEFAULTS.p,
    maxmem: SCRYPT_DEFAULTS.maxmem,
  });

  const saltHex = salt.toString('hex');
  const hashHex = derivedKey.toString('hex');

  return `$scrypt$N=${SCRYPT_DEFAULTS.N},r=${SCRYPT_DEFAULTS.r},p=${SCRYPT_DEFAULTS.p}$${saltHex}$${hashHex}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash using constant-time comparison.
 * Safely returns false on malformed hashes or incorrect passwords without throwing.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (typeof password !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  if (!password || !storedHash) {
    return false;
  }

  const match = storedHash.match(HASH_REGEX);
  if (!match) {
    return false;
  }

  const [, nStr, rStr, pStr, saltHex, expectedHashHex] = match;
  const N = parseInt(nStr, 10);
  const r = parseInt(rStr, 10);
  const p = parseInt(pStr, 10);

  // Validate parameters within safe computational bounds
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N < 1024 ||
    N > 1048576 ||
    r < 1 ||
    r > 64 ||
    p < 1 ||
    p > 64
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(expectedHashHex, 'hex');

    if (salt.length === 0 || expectedKey.length === 0) {
      return false;
    }

    const computedKey = await scryptAsync(password, salt, expectedKey.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_DEFAULTS.maxmem,
    });

    if (computedKey.length !== expectedKey.length) {
      return false;
    }

    return timingSafeEqual(computedKey, expectedKey);
  } catch {
    return false;
  }
}
