import { z } from 'zod';
import { StudioIdSchema } from './tenant.js';
import { OrderPaymentStatusSchema } from './payment.js';

export const PaperSizes = ['A4', 'A3', 'A5', 'legal', 'letter'] as const;
export const PaperSizeSchema = z.enum(PaperSizes);
export type PaperSize = z.infer<typeof PaperSizeSchema>;

export const ColorModes = ['black_and_white', 'color'] as const;
export const ColorModeSchema = z.enum(ColorModes);
export type ColorMode = z.infer<typeof ColorModeSchema>;

export const PrintSides = ['single_sided', 'double_sided'] as const;
export const PrintSidesSchema = z.enum(PrintSides);
export type PrintSides = z.infer<typeof PrintSidesSchema>;

export const PrintOrientations = ['portrait', 'landscape', 'auto'] as const;
export const PrintOrientationSchema = z.enum(PrintOrientations);
export type PrintOrientation = z.infer<typeof PrintOrientationSchema>;

export const PrintScalings = ['fit_to_page', 'actual_size'] as const;
export const PrintScalingSchema = z.enum(PrintScalings);
export type PrintScaling = z.infer<typeof PrintScalingSchema>;

export const DocumentPrintConfigSchema = z.object({
  assetId: z.string().min(16).max(128),
  paperSize: PaperSizeSchema.default('A4'),
  colorMode: ColorModeSchema.default('black_and_white'),
  sides: PrintSidesSchema.default('single_sided'),
  orientation: PrintOrientationSchema.default('portrait'),
  scaling: PrintScalingSchema.default('fit_to_page'),
  pageSelection: z.string().min(1).max(200).default('all'),
  copies: z.number().int().min(1).max(100).default(1),
});
export type DocumentPrintConfig = z.infer<typeof DocumentPrintConfigSchema>;

export const QuoteRequestSchema = z.object({
  items: z.array(DocumentPrintConfigSchema).min(1).max(50),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const QuoteItemBreakdownSchema = z.object({
  assetId: z.string(),
  filename: z.string(),
  paperSize: PaperSizeSchema,
  colorMode: ColorModeSchema,
  sides: PrintSidesSchema,
  orientation: PrintOrientationSchema,
  scaling: PrintScalingSchema,
  pageSelection: z.string(),
  copies: z.number().int().positive(),
  documentPageCount: z.number().int().positive(),
  selectedPagesCount: z.number().int().positive(),
  sheetsCount: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
  subtotalMinor: z.number().int().nonnegative(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.string().datetime().optional(),
});
export type QuoteItemBreakdown = z.infer<typeof QuoteItemBreakdownSchema>;

export const QuoteResponseSchema = z.object({
  items: z.array(QuoteItemBreakdownSchema),
  totalSheets: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
  currency: z.literal('INR'),
  calculatedAt: z.string().datetime(),
});
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

export const OrderStatuses = [
  'submitted',
  'processing',
  'ready',
  'completed',
  'cancelled',
] as const;
export const OrderStatusSchema = z.enum(OrderStatuses);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSubmissionRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().min(10).max(20).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(DocumentPrintConfigSchema).min(1).max(50),
});
export type OrderSubmissionRequest = z.infer<typeof OrderSubmissionRequestSchema>;

export const OrderAuditEventSchema = z.object({
  eventId: z.string().min(1).max(128),
  fromStatus: OrderStatusSchema,
  toStatus: OrderStatusSchema,
  operatorUserId: z.string().min(1).max(128).optional(),
  operatorName: z.string().optional(),
  timestamp: z.string().datetime(),
  reason: z.string().max(500).optional(),
  action: z.string().max(64).optional(),
  assetId: z.string().max(128).optional(),
});
export type OrderAuditEvent = z.infer<typeof OrderAuditEventSchema>;

export const OrderRecordSchema = z.object({
  orderId: z.string().min(16).max(128),
  orderNumber: z.string().min(3).max(32),
  studioId: StudioIdSchema,
  sessionId: z.string().min(16).max(128),
  idempotencyKey: z.string().min(8).max(64),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(QuoteItemBreakdownSchema),
  totalSheets: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
  currency: z.literal('INR'),
  status: OrderStatusSchema,
  paidAmountMinor: z.number().int().nonnegative().default(0).optional(),
  paymentStatus: OrderPaymentStatusSchema.default('UNPAID').optional(),
  events: z.array(OrderAuditEventSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OrderRecord = z.infer<typeof OrderRecordSchema>;
export type OrderRecordInput = z.input<typeof OrderRecordSchema>;

export const OrderStatusUpdateRequestSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().max(500).optional(),
  confirmedHandover: z.boolean().optional(),
});
export type OrderStatusUpdateRequest = z.infer<typeof OrderStatusUpdateRequestSchema>;

export const DocumentDeletionResponseSchema = z.object({
  success: z.boolean(),
  orderId: z.string(),
  assetId: z.string(),
  deletedAt: z.string().datetime(),
});
export type DocumentDeletionResponse = z.infer<typeof DocumentDeletionResponseSchema>;

export const OrderCancellationRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type OrderCancellationRequest = z.infer<typeof OrderCancellationRequestSchema>;

export const OrderListResponseSchema = z.object({
  orders: z.array(OrderRecordSchema),
  totalCount: z.number().int().nonnegative(),
});
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;
