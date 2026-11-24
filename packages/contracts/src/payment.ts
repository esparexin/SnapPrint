import { z } from 'zod';
import { UserIdSchema } from './identity.js';
import { StudioIdSchema } from './tenant.js';

export const PaymentMethods = ['razorpay', 'counter_cash', 'counter_upi'] as const;
export const PaymentMethodSchema = z.enum(PaymentMethods);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentStatuses = [
  'CREATED',
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;
export const PaymentStatusSchema = z.enum(PaymentStatuses);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const OrderPaymentStatuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'PAYMENT_FAILED'] as const;
export const OrderPaymentStatusSchema = z.enum(OrderPaymentStatuses);
export type OrderPaymentStatus = z.infer<typeof OrderPaymentStatusSchema>;

export const PaymentRecordSchema = z.object({
  paymentId: z.string().min(16).max(128),
  orderId: z.string().min(16).max(128),
  studioId: StudioIdSchema,
  sessionId: z.string().min(16).max(128).optional(),
  method: PaymentMethodSchema,
  amountMinor: z.number().int().positive(),
  currency: z.literal('INR'),
  status: PaymentStatusSchema,
  gatewayOrderId: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  gatewaySignature: z.string().optional(),
  gatewayCapturedAt: z.string().datetime().optional(),
  recordedByUserId: UserIdSchema.optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

export const PaymentInitiateRequestSchema = z.object({
  orderId: z.string().min(16).max(128),
  method: z.literal('razorpay'),
});
export type PaymentInitiateRequest = z.infer<typeof PaymentInitiateRequestSchema>;

export const PaymentInitiateResponseSchema = z.object({
  paymentId: z.string().min(16).max(128),
  orderId: z.string().min(16).max(128),
  amountMinor: z.number().int().positive(),
  currency: z.literal('INR'),
  gatewayOrderId: z.string().min(1),
  keyId: z.string().min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});
export type PaymentInitiateResponse = z.infer<typeof PaymentInitiateResponseSchema>;

export const PaymentVerifyRequestSchema = z.object({
  paymentId: z.string().min(16).max(128),
  gatewayOrderId: z.string().min(1),
  gatewayPaymentId: z.string().min(1),
  gatewaySignature: z.string().min(1),
});
export type PaymentVerifyRequest = z.infer<typeof PaymentVerifyRequestSchema>;

export const CounterPaymentRequestSchema = z.object({
  method: z.enum(['counter_cash', 'counter_upi']),
  amountMinor: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});
export type CounterPaymentRequest = z.infer<typeof CounterPaymentRequestSchema>;

export const PaymentHistoryResponseSchema = z.object({
  payments: z.array(PaymentRecordSchema),
  totalPaidMinor: z.number().int().nonnegative(),
  paymentStatus: OrderPaymentStatusSchema,
});
export type PaymentHistoryResponse = z.infer<typeof PaymentHistoryResponseSchema>;

export const WebhookEventRecordSchema = z.object({
  eventId: z.string().min(1).max(128),
  eventType: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()),
  processedAt: z.string().datetime(),
});
export type WebhookEventRecord = z.infer<typeof WebhookEventRecordSchema>;
