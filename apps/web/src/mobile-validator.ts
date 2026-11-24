/**
 * Re-export mobile validator functions from @snapprint/domain (SSOT).
 * Preserves backward compatibility for all web consumers and tests.
 */
export {
  validateIndianMobile,
  validateOptionalIndianMobile,
  formatIndianMobileE164,
} from '@snapprint/domain';
