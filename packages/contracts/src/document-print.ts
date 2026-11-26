import { z } from 'zod';
import { StudioIdSchema } from './tenant.js';
import { OrderPaymentStatusSchema } from './payment.js';

export const StandardPaperSizes = [
  'A4',
  'A3',
  'A5',
  'A6',
  'legal',
  'letter',
  '4x6',
  '5x7',
] as const;
export const PaperSizes = StandardPaperSizes;
export const PaperSizeSchema = z.union([
  z.enum(StandardPaperSizes),
  z.string().regex(/^cps_[a-zA-Z0-9_-]{3,50}$/, {
    message: 'Custom paper size ID must follow format cps_*',
  }),
]);
export type PaperSize = z.infer<typeof PaperSizeSchema>;

export interface StandardPaperSizeDefinition {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthIn: number;
  heightIn: number;
}

export const STANDARD_PAPER_CATALOGUE: readonly StandardPaperSizeDefinition[] = Object.freeze([
  { id: 'A4', name: 'A4 Document', widthMm: 210, heightMm: 297, widthIn: 8.27, heightIn: 11.69 },
  { id: 'A3', name: 'A3 Ledger/Plan', widthMm: 297, heightMm: 420, widthIn: 11.69, heightIn: 16.54 },
  { id: 'A5', name: 'A5 Booklet', widthMm: 148, heightMm: 210, widthIn: 5.83, heightIn: 8.27 },
  { id: 'A6', name: 'A6 Postcard', widthMm: 105, heightMm: 148, widthIn: 4.13, heightIn: 5.83 },
  { id: 'letter', name: 'Letter Standard', widthMm: 215.9, heightMm: 279.4, widthIn: 8.5, heightIn: 11.0 },
  { id: 'legal', name: 'Legal Document', widthMm: 215.9, heightMm: 355.6, widthIn: 8.5, heightIn: 14.0 },
  { id: '4x6', name: '4 × 6″ Photo', widthMm: 101.6, heightMm: 152.4, widthIn: 4.0, heightIn: 6.0 },
  { id: '5x7', name: '5 × 7″ Photo', widthMm: 127.0, heightMm: 177.8, widthIn: 5.0, heightIn: 7.0 },
]);

export const CustomPaperSizeSchema = z.object({
  id: z.string().min(3).max(64),
  studioId: StudioIdSchema,
  printerId: z.string().min(3).max(64),
  name: z.string().trim().min(1).max(64),
  width: z.number().positive().max(2000),
  height: z.number().positive().max(2000),
  unit: z.enum(['mm', 'in']),
  isEnabled: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CustomPaperSize = z.infer<typeof CustomPaperSizeSchema>;

export const CreateCustomPaperSizeRequestSchema = z.object({
  printerId: z.string().min(3).max(64),
  name: z.string().trim().min(1).max(64),
  width: z.coerce.number().positive().max(2000),
  height: z.coerce.number().positive().max(2000),
  unit: z.enum(['mm', 'in']),
  isEnabled: z.boolean().default(true).optional(),
});
export type CreateCustomPaperSizeRequest = z.infer<typeof CreateCustomPaperSizeRequestSchema>;

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
