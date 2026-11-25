import { describe, expect, it } from 'vitest';
import {
  canConfirmCustomerHandover,
  canDeleteOrderDocument,
  canTransitionOrderStatus,
} from './order-state-machine.js';

describe('Order State Machine & Transition Rules', () => {
  it('allows valid progressive lifecycle transitions', () => {
    expect(canTransitionOrderStatus('submitted', 'processing')).toEqual({ allowed: true });
    expect(canTransitionOrderStatus('processing', 'ready')).toEqual({ allowed: true });
    expect(canTransitionOrderStatus('ready', 'completed')).toEqual({ allowed: true });
  });

  it('allows cancellation from active states', () => {
    expect(canTransitionOrderStatus('submitted', 'cancelled')).toEqual({ allowed: true });
    expect(canTransitionOrderStatus('processing', 'cancelled')).toEqual({ allowed: true });
    expect(canTransitionOrderStatus('ready', 'cancelled')).toEqual({ allowed: true });
  });

  it('rejects skipping states forward', () => {
    // submitted cannot jump directly to ready or completed
    const jumpToReady = canTransitionOrderStatus('submitted', 'ready');
    expect(jumpToReady.allowed).toBe(false);
    expect(jumpToReady.error).toBe('INVALID_STATUS_TRANSITION');

    const jumpToCompleted = canTransitionOrderStatus('submitted', 'completed');
    expect(jumpToCompleted.allowed).toBe(false);
    expect(jumpToCompleted.error).toBe('INVALID_STATUS_TRANSITION');

    // processing cannot jump directly to completed (must be marked ready first)
    const procToCompleted = canTransitionOrderStatus('processing', 'completed');
    expect(procToCompleted.allowed).toBe(false);
    expect(procToCompleted.error).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects moving backwards in the lifecycle', () => {
    expect(canTransitionOrderStatus('processing', 'submitted').allowed).toBe(false);
    expect(canTransitionOrderStatus('ready', 'processing').allowed).toBe(false);
    expect(canTransitionOrderStatus('ready', 'submitted').allowed).toBe(false);
  });

  it('rejects same-status transitions', () => {
    const same = canTransitionOrderStatus('processing', 'processing');
    expect(same.allowed).toBe(false);
    expect(same.error).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects transitions from terminal states', () => {
    const fromCompleted = canTransitionOrderStatus('completed', 'processing');
    expect(fromCompleted.allowed).toBe(false);
    expect(fromCompleted.error).toBe('ORDER_IN_TERMINAL_STATE');

    const fromCompletedToCancelled = canTransitionOrderStatus('completed', 'cancelled');
    expect(fromCompletedToCancelled.allowed).toBe(false);
    expect(fromCompletedToCancelled.error).toBe('ORDER_IN_TERMINAL_STATE');

    const fromCancelled = canTransitionOrderStatus('cancelled', 'submitted');
    expect(fromCancelled.allowed).toBe(false);
    expect(fromCancelled.error).toBe('ORDER_IN_TERMINAL_STATE');
  });

  describe('Customer Handover Confirmation Rules', () => {
    it('allows handover when order is ready and operator confirmed physical verification', () => {
      const res = canConfirmCustomerHandover('ready', true);
      expect(res.allowed).toBe(true);
    });

    it('blocks handover when operator has not verified physical output', () => {
      const res = canConfirmCustomerHandover('ready', false);
      expect(res.allowed).toBe(false);
      expect(res.error).toBe('HANDOVER_NOT_CONFIRMED');
      expect(res.message).toMatch(/Operator must verify physical print output/);
    });

    it('blocks handover when order is not in ready status', () => {
      expect(canConfirmCustomerHandover('submitted', true).allowed).toBe(false);
      expect(canConfirmCustomerHandover('submitted', true).error).toBe('INVALID_STATUS_TRANSITION');
      expect(canConfirmCustomerHandover('processing', true).allowed).toBe(false);
      expect(canConfirmCustomerHandover('completed', true).allowed).toBe(false);
      expect(canConfirmCustomerHandover('cancelled', true).allowed).toBe(false);
    });
  });

  describe('Post-Handover Document Deletion Rules', () => {
    it('allows document deletion when order is completed and document is not yet deleted', () => {
      const res = canDeleteOrderDocument('completed', false);
      expect(res.allowed).toBe(true);
    });

    it('blocks document deletion before order is completed', () => {
      const statuses = ['submitted', 'processing', 'ready', 'cancelled'] as const;
      for (const status of statuses) {
        const res = canDeleteOrderDocument(status, false);
        expect(res.allowed).toBe(false);
        expect(res.error).toBe('ORDER_NOT_COMPLETED');
      }
    });

    it('blocks document deletion if document is already marked deleted', () => {
      const res = canDeleteOrderDocument('completed', true);
      expect(res.allowed).toBe(false);
      expect(res.error).toBe('DOCUMENT_ALREADY_DELETED');
    });
  });
});
