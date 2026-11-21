import { describe, expect, it } from 'vitest';
import { hashPassword, SCRYPT_DEFAULTS, verifyPassword } from './password.js';

describe('Password Hashing Domain Utilities (scrypt)', () => {
  const plainPassword = 'CorrectHorseBatteryStaple!2026';

  it('hashes a plaintext password in standard modular crypt format with scrypt defaults', async () => {
    const hash = await hashPassword(plainPassword);

    expect(typeof hash).toBe('string');
    expect(
      hash.startsWith(
        `$scrypt$N=${SCRYPT_DEFAULTS.N},r=${SCRYPT_DEFAULTS.r},p=${SCRYPT_DEFAULTS.p}$`
      )
    ).toBe(true);

    const parts = hash.split('$');
    // ['', 'scrypt', 'N=16384,r=8,p=1', '<saltHex>', '<hashHex>']
    expect(parts).toHaveLength(5);
    expect(parts[1]).toBe('scrypt');
    expect(parts[3]).toHaveLength(SCRYPT_DEFAULTS.saltBytes * 2); // 16 bytes = 32 hex chars
    expect(parts[4]).toHaveLength(SCRYPT_DEFAULTS.keylen * 2); // 64 bytes = 128 hex chars
  });

  it('produces distinct hashes with unique salts for identical passwords', async () => {
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);

    expect(hash1).not.toBe(hash2);

    const salt1 = hash1.split('$')[3];
    const salt2 = hash2.split('$')[3];
    expect(salt1).not.toBe(salt2);
  });

  it('verifies a correct password against its stored hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword(plainPassword, hash);

    expect(isValid).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword('IncorrectPassword!2026', hash);

    expect(isValid).toBe(false);
  });

  it('safely rejects malformed stored hashes without throwing', async () => {
    expect(await verifyPassword(plainPassword, 'not-a-valid-hash')).toBe(false);
    expect(await verifyPassword(plainPassword, '$bcrypt$invalid')).toBe(false);
    expect(await verifyPassword(plainPassword, '$scrypt$invalid-params$salt$hash')).toBe(false);
    expect(await verifyPassword(plainPassword, '$scrypt$N=0,r=0,p=0$salt$hash')).toBe(false);
    expect(await verifyPassword(plainPassword, '$scrypt$N=16384,r=8,p=1$$hash')).toBe(false);
    expect(await verifyPassword(plainPassword, '')).toBe(false);
  });

  it('safely rejects empty or invalid inputs', async () => {
    const hash = await hashPassword(plainPassword);

    expect(await verifyPassword('', hash)).toBe(false);
    expect(await verifyPassword(null as unknown as string, hash)).toBe(false);
    expect(await verifyPassword(plainPassword, null as unknown as string)).toBe(false);
  });

  it('throws when hashing an empty password or password exceeding length budget', async () => {
    await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    await expect(hashPassword(null as unknown as string)).rejects.toThrow(
      'Password must be a non-empty string'
    );

    const oversizedPassword = 'a'.repeat(1025);
    await expect(hashPassword(oversizedPassword)).rejects.toThrow(
      'Password exceeds maximum supported length'
    );
  });

  it('rejects tampered salt or derived key', async () => {
    const hash = await hashPassword(plainPassword);
    const parts = hash.split('$');

    // Tamper with the derived key
    const tamperedKey = '0'.repeat(parts[4].length);
    const tamperedHash = `$scrypt$${parts[2]}$${parts[3]}$${tamperedKey}`;
    expect(await verifyPassword(plainPassword, tamperedHash)).toBe(false);

    // Tamper with the salt
    const tamperedSalt = 'f'.repeat(parts[3].length);
    const tamperedSaltHash = `$scrypt$${parts[2]}$${tamperedSalt}$${parts[4]}`;
    expect(await verifyPassword(plainPassword, tamperedSaltHash)).toBe(false);
  });
});
