/**
 * Validator for Indian 10-digit mobile numbers.
 * Disallows alphabets, symbols, repeated digits (e.g. 0000000000),
 * and sequential digits (e.g. 1234567890, 9876543210).
 */
export function validateIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length === 0) {
    return 'Mobile number is required.';
  }
  if (digits.length !== 10) {
    return 'Mobile number must be exactly 10 digits.';
  }
  if (!/^[6-9]/.test(digits)) {
    return 'Mobile number must start with 6, 7, 8, or 9.';
  }
  if (/^(\d)\1{9}$/.test(digits)) {
    return 'Please enter a valid mobile number (repeated digits not allowed).';
  }
  const sequential = ['0123456789', '1234567890', '9876543210', '8765432109'];
  if (sequential.includes(digits)) {
    return 'Please enter a valid mobile number (sequential numbers not allowed).';
  }
  return null;
}

export function formatIndianMobileE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return `+91${digits}`;
}
