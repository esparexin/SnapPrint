import type { OrderStatus } from '@snapprint/contracts';

export interface OrderTransitionValidation {
  allowed: boolean;
  error?: 'INVALID_STATUS_TRANSITION' | 'ORDER_IN_TERMINAL_STATE';
  message?: string;
}

/**
 * Single source of truth for order status lifecycle transitions.
 *
 * Allowed lifecycle flow:
 * submitted -> processing (printing started)
 * submitted -> cancelled
 * processing -> ready (print output verified, packaged, ready for pickup)
 * processing -> cancelled
 * ready -> completed (order handed over to customer)
 * ready -> cancelled
 *
 * Terminal states:
 * completed -> cannot transition (immutable final state)
 * cancelled -> cannot transition (immutable final state)
 */
const LEGAL_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  submitted: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): OrderTransitionValidation {
  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return {
      allowed: false,
      error: 'ORDER_IN_TERMINAL_STATE',
      message: `Cannot change status of an order in terminal state '${currentStatus}'.`,
    };
  }

  if (currentStatus === nextStatus) {
    return {
      allowed: false,
      error: 'INVALID_STATUS_TRANSITION',
      message: `Order is already in '${currentStatus}' status.`,
    };
  }

  const allowedTargets = LEGAL_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(nextStatus)) {
    return {
      allowed: false,
      error: 'INVALID_STATUS_TRANSITION',
      message: `Invalid order status transition from '${currentStatus}' to '${nextStatus}'.`,
    };
  }

  return { allowed: true };
}
