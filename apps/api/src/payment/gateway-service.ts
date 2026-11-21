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

export interface PaymentGatewayService {
  getKeyId(): string;
  createGatewayOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean;
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

  async createGatewayOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
    const payload = {
      amount: params.amountMinor,
      currency: params.currency,
      receipt: params.receipt || params.orderId,
      notes: params.notes,
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay order creation failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { id: string; amount: number; currency: string };
    return {
      gatewayOrderId: data.id,
      amountMinor: data.amount,
      currency: data.currency,
    };
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    return verifyRazorpayPaymentSignature(orderId, paymentId, signature, this.keySecret);
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    return verifyRazorpayWebhookSignature(rawBody, signature, this.webhookSecret);
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
