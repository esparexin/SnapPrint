import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';
import {
  createPaymentGatewayService,
  MockPaymentGatewayService,
  RazorpayGatewayService,
} from './gateway-service.js';

describe('Payment Gateway Service Factory & Implementation', () => {
  it('instantiates MockPaymentGatewayService in development when keys are omitted', () => {
    const config = loadConfig({ NODE_ENV: 'development' });
    const gateway = createPaymentGatewayService(config);
    expect(gateway).toBeInstanceOf(MockPaymentGatewayService);
    expect(gateway.getKeyId()).toBe('rzp_test_mock_key_id');
  });

  it('instantiates RazorpayGatewayService when credentials are provided', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      RAZORPAY_KEY_ID: 'rzp_live_testkey12345678',
      RAZORPAY_KEY_SECRET: 'testsecret12345678',
      RAZORPAY_WEBHOOK_SECRET: 'testwebhooksecret',
    });
    const gateway = createPaymentGatewayService(config);
    expect(gateway).toBeInstanceOf(RazorpayGatewayService);
    expect(gateway.getKeyId()).toBe('rzp_live_testkey12345678');
  });

  it('strictly throws in production when Razorpay credentials are missing', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017',
      SESSION_SECRET: 'production-secret-session-key-must-be-32-chars-long!',
      COOKIE_SECRET: 'production-secret-cookie-key-must-be-32-chars-long!',
    });
    expect(() => createPaymentGatewayService(config)).toThrow(
      'Razorpay configuration missing in production: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured.'
    );
  });
});
