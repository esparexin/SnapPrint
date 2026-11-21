import type { OrderPaymentStatus } from '@snapprint/contracts';

export interface PrintAuthorizationContext {
  orderPaymentStatus: OrderPaymentStatus;
  paymentPolicy: 'payment_required' | 'pay_at_counter';
  hasOverridePermission?: boolean;
}

export interface PrintAuthorizationResult {
  allowed: boolean;
  reason?: 'PAYMENT_REQUIRED_BEFORE_PRINT';
}

export function canAuthorizePrint(context: PrintAuthorizationContext): PrintAuthorizationResult {
  if (context.hasOverridePermission) {
    return { allowed: true };
  }

  if (context.paymentPolicy === 'pay_at_counter') {
    return { allowed: true };
  }

  // Under 'payment_required' policy, print is only allowed if the order is fully PAID
  if (context.orderPaymentStatus === 'PAID') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'PAYMENT_REQUIRED_BEFORE_PRINT',
  };
}
