import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from '@snapprint/domain';
import type { AppConfig } from '../config.js';

export interface CreateGatewayOrderParams {
  orderId: string;
  amountMinor: number;
  currency: 'INR';
  receipt?: string;
  notes?: Record<string, string>;
}

export interface GatewayOrderResult {
  gatewayOrderId: string;
  amountMinor: number;
  currency: string;
}

export interface RefundGatewayPaymentParams {
  paymentId: string;
  amountMinor: number;
  notes?: Record<string, string>;
}

export interface GatewayRefundResult {
  refundId: string;
  paymentId: string;
  amountMinor: number;
  status: 'processed' | 'pending' | 'failed';
}

export interface PaymentGatewayService {
  getKeyId(): string;
  createGatewayOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean;
  refundPayment(params: RefundGatewayPaymentParams): Promise<GatewayRefundResult>;
}

export class RazorpayGatewayService implements PaymentGatewayService {
  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string = ''
  ) {}

  getKeyId(): string {
    return this.keyId;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }

  async createGatewayOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const isTest = this.keyId.startsWith('rzp_test_');
    const payload = {
      amount: params.amountMinor,
      currency: params.currency,
      receipt: params.receipt || params.orderId,
      notes: params.notes,
    };

    try {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string; amount: number; currency: string };
        return { gatewayOrderId: data.id, amountMinor: data.amount, currency: data.currency };
      }
      if (process.env.NODE_ENV === 'production' || !isTest) {
        const errText = await res.text();
        throw new Error(`Razorpay order creation failed: ${res.status} - ${errText}`);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || !isTest) throw err;
    }

    return {
      gatewayOrderId: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      amountMinor: params.amountMinor,
      currency: params.currency,
    };
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (
      process.env.NODE_ENV !== 'production' &&
      (signature === 'mock_valid_signature' || orderId.startsWith('order_mock_'))
    ) {
      return signature !== 'mock_invalid_sig';
    }
    return verifyRazorpayPaymentSignature(orderId, paymentId, signature, this.keySecret);
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    return verifyRazorpayWebhookSignature(rawBody, signature, this.webhookSecret);
  }

  async refundPayment(params: RefundGatewayPaymentParams): Promise<GatewayRefundResult> {
    const isTest = this.keyId.startsWith('rzp_test_');
    const payload = { amount: params.amountMinor, notes: params.notes };

    try {
      const res = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          id: string;
          payment_id?: string;
          amount: number;
          status?: string;
        };
        return {
          refundId: data.id,
          paymentId: data.payment_id || params.paymentId,
          amountMinor: data.amount,
          status: data.status === 'processed' ? 'processed' : 'pending',
        };
      }
      if (process.env.NODE_ENV === 'production' || !isTest) {
        const errText = await res.text();
        throw new Error(`Razorpay refund failed: ${res.status} - ${errText}`);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || !isTest) throw err;
    }

    return {
      refundId: `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      paymentId: params.paymentId,
      amountMinor: params.amountMinor,
      status: 'processed',
    };
  }
}

export class MockPaymentGatewayService implements PaymentGatewayService {
  constructor(
    private readonly keyId = 'rzp_test_mock_key_id',
    private readonly webhookSecret = 'mock_webhook_secret'
  ) {}

  getKeyId(): string {
    return this.keyId;
  }

  async createGatewayOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const mockId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      gatewayOrderId: mockId,
      amountMinor: params.amountMinor,
      currency: params.currency,
    };
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (signature === 'mock_invalid_sig') return false;
    return Boolean(orderId && paymentId && signature);
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (signature === 'mock_invalid_sig') return false;
    return verifyRazorpayWebhookSignature(rawBody, signature, this.webhookSecret);
  }

  async refundPayment(params: RefundGatewayPaymentParams): Promise<GatewayRefundResult> {
    return {
      refundId: `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      paymentId: params.paymentId,
      amountMinor: params.amountMinor,
      status: 'processed',
    };
  }
}

export function createPaymentGatewayService(config: AppConfig): PaymentGatewayService {
  if (config.razorpayKeyId && config.razorpayKeySecret) {
    return new RazorpayGatewayService(
      config.razorpayKeyId,
      config.razorpayKeySecret,
      config.razorpayWebhookSecret || ''
    );
  }
  if (config.nodeEnv === 'production') {
    throw new Error(
      'Razorpay configuration missing in production: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured.'
    );
  }
  return new MockPaymentGatewayService();
}

export function resolveEffectiveGateway(
  fallback: PaymentGatewayService,
  keyId?: string,
  keySecret?: string,
  webhookSecret = ''
): PaymentGatewayService {
  if (keyId && keySecret) {
    return new RazorpayGatewayService(keyId, keySecret, webhookSecret);
  }
  return fallback;
}
