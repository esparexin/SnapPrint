/**
 * Validator for Indian 10-digit mobile numbers.
 * Disallows alphabets, symbols, repeated digits (e.g. 0000000000),
 * and sequential digits (e.g. 1234567890, 9876543210).
 */
export function validateIndianMobile(raw: string): string | null {
  if (/[a-zA-Z]/.test(raw) || /[^\d+\s-]/.test(raw)) {
    return 'Please enter a valid 10-digit mobile number.';
  }
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length === 0) {
    return 'Please enter your 10-digit mobile number.';
  }
  if (digits.length !== 10) {
    return 'Please enter a valid 10-digit mobile number.';
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

export function validateOptionalIndianMobile(raw?: string | null): string | null {
  if (!raw || !raw.trim()) {
    return null;
  }
  return validateIndianMobile(raw);
}

export function formatIndianMobileE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return `+91${digits}`;
}
