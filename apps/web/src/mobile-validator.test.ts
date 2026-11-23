import { describe, expect, it } from 'vitest';
import { formatIndianMobileE164, validateIndianMobile } from './mobile-validator';

describe('validateIndianMobile', () => {
  it('accepts valid 10-digit Indian mobile numbers starting with 6-9', () => {
    expect(validateIndianMobile('9848022338')).toBeNull();
    expect(validateIndianMobile('8123456780')).toBeNull();
    expect(validateIndianMobile('7012345678')).toBeNull();
    expect(validateIndianMobile('6301234567')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(validateIndianMobile('')).toBe(
      'Please enter your 10-digit mobile number with prefix (+91).'
    );
  });

  it('rejects numbers that are not 10 digits', () => {
    expect(validateIndianMobile('98765')).toBe(
      'Please enter a valid 10-digit mobile number with prefix (+91).'
    );
    expect(validateIndianMobile('987654321012')).toBe(
      'Please enter a valid 10-digit mobile number with prefix (+91).'
    );
  });

  it('rejects numbers starting with invalid digits (0-5)', () => {
    expect(validateIndianMobile('0123456789')).toBe(
      'Mobile number must start with 6, 7, 8, or 9.'
    );
    expect(validateIndianMobile('5123456789')).toBe(
      'Mobile number must start with 6, 7, 8, or 9.'
    );
  });

  it('rejects repeated digits like 0000000000 or 9999999999', () => {
    expect(validateIndianMobile('9999999999')).toBe(
      'Please enter a valid mobile number (repeated digits not allowed).'
    );
    expect(validateIndianMobile('8888888888')).toBe(
      'Please enter a valid mobile number (repeated digits not allowed).'
    );
  });

  it('rejects sequential digits', () => {
    expect(validateIndianMobile('1234567890')).toBe(
      'Mobile number must start with 6, 7, 8, or 9.'
    );
    expect(validateIndianMobile('9876543210')).toBe(
      'Please enter a valid mobile number (sequential numbers not allowed).'
    );
  });

  it('formats valid digits to E.164 with +91', () => {
    expect(formatIndianMobileE164('9876543211')).toBe('+919876543211');
  });
});
