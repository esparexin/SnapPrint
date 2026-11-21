import { describe, expect, it } from 'vitest';
import { createMockDb } from '../mock-db.js';
import {
  createPaymentRecord,
  findPaymentByGatewayOrderId,
  findPaymentById,
  listPaymentsByOrder,
  updatePaymentStatus,
} from './payment.repository.js';
import { hasWebhookEvent, recordWebhookEvent } from './webhook.repository.js';

describe('Payment & Webhook Repositories', () => {
  it('creates, finds and updates payment records', async () => {
    const { db } = createMockDb();
    const payment = await createPaymentRecord(db, {
      paymentId: 'pay_test_12345678',
      orderId: 'ord_test_12345678',
      studioId: 'studio-test',
      sessionId: 'sess_test_12345678',
      method: 'razorpay',
      amountMinor: 1500,
      currency: 'INR',
      status: 'CREATED',
      gatewayOrderId: 'order_rzp_test_123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(payment.paymentId).toBe('pay_test_12345678');
    expect(payment.amountMinor).toBe(1500);

    const foundById = await findPaymentById(db, 'studio-test', 'pay_test_12345678');
    expect(foundById?.paymentId).toBe('pay_test_12345678');

    const foundByGateway = await findPaymentByGatewayOrderId(db, 'order_rzp_test_123');
    expect(foundByGateway?.paymentId).toBe('pay_test_12345678');

    const updated = await updatePaymentStatus(db, 'studio-test', 'pay_test_12345678', 'SUCCEEDED', {
      gatewayPaymentId: 'pay_rzp_captured_456',
      gatewaySignature: 'sig_valid_123',
    });
    expect(updated?.status).toBe('SUCCEEDED');
    expect(updated?.gatewayPaymentId).toBe('pay_rzp_captured_456');

    const orderPayments = await listPaymentsByOrder(db, 'studio-test', 'ord_test_12345678');
    expect(orderPayments).toHaveLength(1);
    expect(orderPayments[0].status).toBe('SUCCEEDED');
  });

  it('records and deduplicates webhook events', async () => {
    const { db } = createMockDb();
    const event = {
      eventId: 'evt_rzp_unique_123',
      eventType: 'payment.captured',
      payload: { paymentId: 'pay_123' },
      processedAt: new Date().toISOString(),
    };

    expect(await hasWebhookEvent(db, 'evt_rzp_unique_123')).toBe(false);
    const recordedFirst = await recordWebhookEvent(db, event);
    expect(recordedFirst.isNew).toBe(true);
    expect(recordedFirst.alreadyProcessed).toBe(false);

    expect(await hasWebhookEvent(db, 'evt_rzp_unique_123')).toBe(true);
    const recordedSecond = await recordWebhookEvent(db, event);
    expect(recordedSecond.isNew).toBe(false);
  });
});
