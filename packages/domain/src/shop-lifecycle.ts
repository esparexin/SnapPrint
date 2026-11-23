import { ReservedSlugs, StudioStatus } from '@snapprint/contracts';

export interface SlugValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSlugSanity(slug: string): SlugValidationResult {
  const raw = slug.trim();

  if (raw !== raw.toLowerCase()) {
    return { valid: false, reason: 'Slug must consist only of lowercase characters' };
  }

  if (raw.length < 3) {
    return { valid: false, reason: 'Slug must be at least 3 characters long' };
  }

  if (raw.length > 48) {
    return { valid: false, reason: 'Slug must not exceed 48 characters' };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) {
    return {
      valid: false,
      reason: 'Slug must consist of lowercase alphanumeric characters separated by single hyphens',
    };
  }

  const reservedSet = new Set<string>(ReservedSlugs);
  if (reservedSet.has(raw)) {
    return { valid: false, reason: `Slug '${raw}' is a reserved system keyword` };
  }

  return { valid: true };
}

export interface AutoPrintCheckParams {
  isAutoPrintEnabled: boolean;
  autoPrintMaxPages: number;
}

export function isAutoPrintEligible(
  totalSheets: number,
  capabilities?: AutoPrintCheckParams
): boolean {
  if (!capabilities) return false;
  if (!capabilities.isAutoPrintEnabled) return false;
  if (totalSheets <= 0) return false;
  return totalSheets <= capabilities.autoPrintMaxPages;
}

export const ALLOWED_STATUS_TRANSITIONS: Record<StudioStatus, readonly StudioStatus[]> = {
  onboarding: ['pending_review', 'active', 'suspended', 'closed'],
  pending_review: ['active', 'onboarding', 'suspended', 'closed'],
  active: ['suspended', 'closed'],
  suspended: ['active', 'closed'],
  closed: [],
};

export function canTransitionShopStatus(
  currentStatus: StudioStatus,
  targetStatus: StudioStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export interface ShopReadinessCheckParams {
  name?: string;
  slug?: string;
  city?: string;
  contactPhone?: string;
  hasCapabilities?: boolean;
}

export interface ShopReadinessResult {
  canActivate: boolean;
  errors: string[];
}

export function canActivateShop(shop: ShopReadinessCheckParams): ShopReadinessResult {
  const errors: string[] = [];

  if (!shop.name || shop.name.trim().length < 2) {
    errors.push('Shop name is required (minimum 2 characters)');
  }

  if (!shop.slug) {
    errors.push('Shop slug is required');
  } else {
    const slugCheck = validateSlugSanity(shop.slug);
    if (!slugCheck.valid) {
      errors.push(slugCheck.reason || 'Invalid slug format');
    }
  }

  if (!shop.city || shop.city.trim().length < 2) {
    errors.push('Operational city/town is required');
  }

  return {
    canActivate: errors.length === 0,
    errors,
  };
}

export interface PaymentMethodsConfig {
  enableCounterPayment: boolean;
  enableOnlinePayment: boolean;
  isRazorpayConfirmed: boolean;
}

export type SupportedPaymentMethod = 'counter_cash' | 'razorpay';

export function resolveCustomerPaymentMethods(
  config: PaymentMethodsConfig
): SupportedPaymentMethod[] {
  const methods: SupportedPaymentMethod[] = [];

  if (config.enableCounterPayment) {
    methods.push('counter_cash');
  }

  // Only permit online payment if explicitly enabled AND cryptographically verified
  if (config.enableOnlinePayment && config.isRazorpayConfirmed) {
    methods.push('razorpay');
  }

  // Fail-closed fallback: ensure at least counter_cash is available
  if (methods.length === 0) {
    methods.push('counter_cash');
  }

  return methods;
}
