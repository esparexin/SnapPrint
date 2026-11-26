import { describe, expect, it } from 'vitest';
import { OrderPrintRetryResponseSchema } from './printer.js';

describe('OrderPrintRetryResponseSchema', () => {
  it('validates successful print retry response payload', () => {
    const res = OrderPrintRetryResponseSchema.parse({
      success: true,
      orderId: 'ord_1234567890abcdef',
      resetCount: 2,
      message: '2 print job(s) reset to pending.',
    });

    expect(res.success).toBe(true);
    expect(res.resetCount).toBe(2);
    expect(res.orderId).toBe('ord_1234567890abcdef');
  });

  it('rejects invalid retry response payload', () => {
    expect(() =>
      OrderPrintRetryResponseSchema.parse({
        success: 'yes',
        orderId: 123,
      })
    ).toThrow();
  });
});
