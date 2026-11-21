import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from './signature-verification.js';

describe('Signature Verification', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_test_987';
  const paymentId = 'pay_test_456';

  describe('verifyRazorpayPaymentSignature', () => {
    it('validates a correct payment signature', () => {
      const payload = `${orderId}|${paymentId}`;
      const validSig = createHmac('sha256', secret).update(payload).digest('hex');

      expect(verifyRazorpayPaymentSignature(orderId, paymentId, validSig, secret)).toBe(true);
    });

    it('rejects an incorrect signature', () => {
      expect(
        verifyRazorpayPaymentSignature(orderId, paymentId, 'invalid_hex_signature', secret)
      ).toBe(false);
    });

    it('rejects when parameters are missing', () => {
      expect(verifyRazorpayPaymentSignature('', paymentId, 'sig', secret)).toBe(false);
      expect(verifyRazorpayPaymentSignature(orderId, '', 'sig', secret)).toBe(false);
      expect(verifyRazorpayPaymentSignature(orderId, paymentId, '', secret)).toBe(false);
      expect(verifyRazorpayPaymentSignature(orderId, paymentId, 'sig', '')).toBe(false);
    });
  });

  describe('verifyRazorpayWebhookSignature', () => {
    it('validates a correct webhook signature', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });
      const validSig = createHmac('sha256', secret).update(rawBody).digest('hex');

      expect(verifyRazorpayWebhookSignature(rawBody, validSig, secret)).toBe(true);
    });

    it('rejects an incorrect webhook signature', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured' });
      expect(verifyRazorpayWebhookSignature(rawBody, 'wrong_signature', secret)).toBe(false);
    });

    it('rejects when parameters are empty', () => {
      expect(verifyRazorpayWebhookSignature('', 'sig', secret)).toBe(false);
      expect(verifyRazorpayWebhookSignature('body', '', secret)).toBe(false);
      expect(verifyRazorpayWebhookSignature('body', 'sig', '')).toBe(false);
    });
  });
});
