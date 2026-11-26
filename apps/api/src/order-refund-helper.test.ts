import { Db, MongoClient } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { processOrderCancellationRefund } from './order-refund-helper.js';
import { MockPaymentGatewayService } from './payment/gateway-service.js';
import { createOrderRecord, findOrderById } from './repositories/order.repository.js';
import { createPaymentRecord, findPaymentById } from './repositories/payment.repository.js';
import { createStudio } from './repositories/studio.repository.js';

describe('Order Cancellation Automated Refund Helper', () => {
  let client: MongoClient;
  let db: Db;
  const studioId = 'studio-refund-test';

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snapprint_test');
    await client.connect();
    db = client.db();
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    await db.collection('studios').deleteMany({ id: studioId });
    await db.collection('orders').deleteMany({ studioId });
    await db.collection('payments').deleteMany({ studioId });

    await createStudio(db, {
      id: studioId,
      slug: 'studio-refund-slug',
      name: 'Refund Test Studio',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        paymentPolicy: 'pay_at_counter',
        onlinePaymentEnabled: true,
      },
    });
  });

  it('returns refunded=false when order has no payments', async () => {
    const order = await createOrderRecord(db, {
      orderId: 'ord_no_payment_123',
      orderNumber: 'ORD-101',
      studioId,
      sessionId: 'sess_1234567890123',
      idempotencyKey: 'idem_1234567890',
      customerName: 'Asha',
      customerPhone: '9876543210',
      status: 'submitted',
      paymentStatus: 'UNPAID',
      items: [],
      totalSheets: 0,
      totalAmountMinor: 4000,
      currency: 'INR',
      paidAmountMinor: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await processOrderCancellationRefund(db, studioId, order.orderId);
    expect(res.refunded).toBe(false);
  });

  it('returns refunded=false when order payment was counter cash instead of razorpay', async () => {
    const orderId = 'ord_cash_payment_123';
    await createOrderRecord(db, {
      orderId,
      orderNumber: 'ORD-102',
      studioId,
      sessionId: 'sess_1234567891123',
      idempotencyKey: 'idem_1234567891',
      customerName: 'Bhanu',
      customerPhone: '9876543210',
      status: 'submitted',
      paymentStatus: 'PAID',
      items: [],
      totalSheets: 0,
      totalAmountMinor: 4000,
      currency: 'INR',
      paidAmountMinor: 4000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await createPaymentRecord(db, {
      paymentId: 'pay_cash_1234567890',
      orderId,
      studioId,
      method: 'counter_cash',
      amountMinor: 4000,
      currency: 'INR',
      status: 'SUCCEEDED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await processOrderCancellationRefund(db, studioId, orderId);
    expect(res.refunded).toBe(false);
  });

  it('executes programmatic refund when online payment was SUCCEEDED and updates order to REFUNDED', async () => {
    const orderId = 'ord_online_paid_123';
    await createOrderRecord(db, {
      orderId,
      orderNumber: 'ORD-103',
      studioId,
      sessionId: 'sess_1234567892123',
      idempotencyKey: 'idem_1234567892',
      customerName: 'Chitra',
      customerPhone: '9876543210',
      status: 'processing',
      paymentStatus: 'PAID',
      items: [],
      totalSheets: 0,
      totalAmountMinor: 4000,
      currency: 'INR',
      paidAmountMinor: 4000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const paymentId = 'pay_online_1234567890';
    await createPaymentRecord(db, {
      paymentId,
      orderId,
      studioId,
      method: 'razorpay',
      amountMinor: 4000,
      currency: 'INR',
      status: 'SUCCEEDED',
      gatewayPaymentId: 'pay_rzp_live_capture_999',
      gatewayOrderId: 'order_rzp_gateway_999',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockGw = new MockPaymentGatewayService();
    const res = await processOrderCancellationRefund(
      db,
      studioId,
      orderId,
      'Printer hardware jammed',
      mockGw
    );

    expect(res.refunded).toBe(true);
    expect(res.refundId).toContain('rfnd_mock_');
    expect(res.amountMinor).toBe(4000);

    const paymentDoc = await findPaymentById(db, studioId, paymentId);
    expect(paymentDoc?.status).toBe('REFUNDED');
    expect(paymentDoc?.refundId).toBe(res.refundId);

    const orderDoc = await findOrderById(db, studioId, orderId);
    expect(orderDoc?.paymentStatus).toBe('REFUNDED');
    expect(orderDoc?.paidAmountMinor).toBe(0);
  });
});
