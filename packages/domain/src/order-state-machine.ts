import type { OrderStatus } from '@snapprint/contracts';

export interface OrderTransitionValidation {
  allowed: boolean;
  error?: 'INVALID_STATUS_TRANSITION' | 'ORDER_IN_TERMINAL_STATE' | 'HANDOVER_NOT_CONFIRMED';
  message?: string;
}

export interface DocumentDeletionValidation {
  allowed: boolean;
  error?: 'DOCUMENT_ALREADY_DELETED' | 'ORDER_NOT_COMPLETED';
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

/**
 * Validates that an operator has physically verified prints and confirmed customer handover.
 * Handover confirmation is required to transition an order from 'ready' to 'completed'.
 */
export function canConfirmCustomerHandover(
  currentStatus: OrderStatus,
  hasConfirmedReview: boolean
): OrderTransitionValidation {
  if (currentStatus !== 'ready') {
    return {
      allowed: false,
      error: 'INVALID_STATUS_TRANSITION',
      message: `Order must be in 'ready' status before confirming customer handover. Current status is '${currentStatus}'.`,
    };
  }

  if (!hasConfirmedReview) {
    return {
      allowed: false,
      error: 'HANDOVER_NOT_CONFIRMED',
      message: 'Operator must verify physical print output before completing customer handover.',
    };
  }

  return { allowed: true };
}

/**
 * Validates whether an order document can be safely deleted.
 * Documents may only be purged after customer handover is confirmed ('completed' state),
 * and cannot be deleted if already purged.
 */
export function canDeleteOrderDocument(
  orderStatus: OrderStatus,
  isAlreadyDeleted?: boolean
): DocumentDeletionValidation {
  if (isAlreadyDeleted) {
    return {
      allowed: false,
      error: 'DOCUMENT_ALREADY_DELETED',
      message: 'Document has already been deleted.',
    };
  }

  if (orderStatus !== 'completed') {
    return {
      allowed: false,
      error: 'ORDER_NOT_COMPLETED',
      message:
        'Documents can only be deleted after customer handover is confirmed and the order is completed.',
    };
  }

  return { allowed: true };
}
