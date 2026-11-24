import {
  OrderAuditEvent,
  OrderPaymentStatus,
  OrderRecord,
  OrderRecordSchema,
  OrderStatus,
  PaperSize,
  ColorMode,
  PrintSides,
  PrintOrientation,
  PrintScaling,
  QuoteItemBreakdown,
} from '@snapprint/contracts';
import { OrderDocument } from './order.repository.js';

const VALID_STATUSES: Set<OrderStatus> = new Set([
  'submitted',
  'processing',
  'ready',
  'completed',
  'cancelled',
]);

const VALID_PAYMENT_STATUSES: Set<OrderPaymentStatus> = new Set([
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'PAYMENT_FAILED',
]);

function toIsoString(val: unknown): string {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString();
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function sanitizeOrderItem(raw: unknown): QuoteItemBreakdown | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const copies = Math.max(1, Math.floor(Number(item.copies) || 1));
  const docPages = Math.max(1, Math.floor(Number(item.documentPageCount) || 1));
  const selPages = Math.max(1, Math.floor(Number(item.selectedPagesCount) || docPages));
  const sheets = Math.max(1, Math.floor(Number(item.sheetsCount) || 1));
  const unitPrice = Math.max(0, Math.floor(Number(item.unitPriceMinor) || 0));
  const subtotal = Math.max(0, Math.floor(Number(item.subtotalMinor) || unitPrice * sheets));

  const paperSizes: PaperSize[] = ['A4', 'A3', 'A5', 'legal', 'letter'];
  const colorModes: ColorMode[] = ['black_and_white', 'color'];
  const sides: PrintSides[] = ['single_sided', 'double_sided'];
  const orientations: PrintOrientation[] = ['portrait', 'landscape', 'auto'];
  const scalings: PrintScaling[] = ['fit_to_page', 'actual_size'];

  return {
    assetId: typeof item.assetId === 'string' ? item.assetId : 'unknown_asset_id',
    filename: typeof item.filename === 'string' && item.filename ? item.filename : 'document.pdf',
    paperSize: paperSizes.includes(item.paperSize as PaperSize)
      ? (item.paperSize as PaperSize)
      : 'A4',
    colorMode: colorModes.includes(item.colorMode as ColorMode)
      ? (item.colorMode as ColorMode)
      : 'black_and_white',
    sides: sides.includes(item.sides as PrintSides) ? (item.sides as PrintSides) : 'single_sided',
    orientation: orientations.includes(item.orientation as PrintOrientation)
      ? (item.orientation as PrintOrientation)
      : 'portrait',
    scaling: scalings.includes(item.scaling as PrintScaling)
      ? (item.scaling as PrintScaling)
      : 'fit_to_page',
    pageSelection: typeof item.pageSelection === 'string' ? item.pageSelection : 'all',
    copies,
    documentPageCount: docPages,
    selectedPagesCount: selPages,
    sheetsCount: sheets,
    unitPriceMinor: unitPrice,
    subtotalMinor: subtotal,
  };
}

function sanitizeAuditEvent(raw: unknown): OrderAuditEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const evt = raw as Record<string, unknown>;

  const fromStatus: OrderStatus = VALID_STATUSES.has(evt.fromStatus as OrderStatus)
    ? (evt.fromStatus as OrderStatus)
    : 'submitted';
  const toStatus: OrderStatus = VALID_STATUSES.has(evt.toStatus as OrderStatus)
    ? (evt.toStatus as OrderStatus)
    : 'submitted';

  return {
    eventId: typeof evt.eventId === 'string' && evt.eventId ? evt.eventId : `evt_${Date.now()}`,
    fromStatus,
    toStatus,
    operatorUserId: typeof evt.operatorUserId === 'string' ? evt.operatorUserId : undefined,
    operatorName: typeof evt.operatorName === 'string' ? evt.operatorName : undefined,
    timestamp: toIsoString(evt.timestamp),
    reason: typeof evt.reason === 'string' ? evt.reason : undefined,
  };
}

export function sanitizeOrderDocument(doc: OrderDocument): OrderRecord {
  const sanitizedItems: QuoteItemBreakdown[] = Array.isArray(doc.items)
    ? doc.items.map(sanitizeOrderItem).filter((i): i is QuoteItemBreakdown => i !== null)
    : [];

  const rawOrderId = typeof doc.orderId === 'string' && doc.orderId.length >= 16
    ? doc.orderId
    : `ord_${Date.now()}_fallback00`;

  const rawOrderNumber = typeof doc.orderNumber === 'string' && doc.orderNumber.length >= 3
    ? doc.orderNumber
    : 'ORD-000';

  const rawSessionId = typeof doc.sessionId === 'string' && doc.sessionId.length >= 16
    ? doc.sessionId
    : 'session_legacy_fallback00';

  const rawIdempotencyKey = typeof doc.idempotencyKey === 'string' && doc.idempotencyKey.length >= 8
    ? doc.idempotencyKey
    : `idemp_${Date.now()}`;

  const status: OrderStatus = VALID_STATUSES.has(doc.status) ? doc.status : 'submitted';
  const paymentStatus: OrderPaymentStatus = VALID_PAYMENT_STATUSES.has(
    doc.paymentStatus as OrderPaymentStatus
  )
    ? (doc.paymentStatus as OrderPaymentStatus)
    : 'UNPAID';

  const totalSheets = typeof doc.totalSheets === 'number' && doc.totalSheets >= 0
    ? doc.totalSheets
    : sanitizedItems.reduce((acc, i) => acc + i.sheetsCount, 0);

  const totalAmountMinor = typeof doc.totalAmountMinor === 'number' && doc.totalAmountMinor >= 0
    ? doc.totalAmountMinor
    : sanitizedItems.reduce((acc, i) => acc + i.subtotalMinor, 0);

  const events: OrderAuditEvent[] = Array.isArray(doc.events)
    ? doc.events.map(sanitizeAuditEvent).filter((e): e is OrderAuditEvent => e !== null)
    : [];

  return OrderRecordSchema.parse({
    orderId: rawOrderId,
    orderNumber: rawOrderNumber,
    studioId: doc.studioId,
    sessionId: rawSessionId,
    idempotencyKey: rawIdempotencyKey,
    customerName: doc.customerName || undefined,
    customerPhone: doc.customerPhone || undefined,
    notes: doc.notes || undefined,
    items: sanitizedItems,
    totalSheets,
    totalAmountMinor,
    currency: 'INR',
    status,
    paidAmountMinor: typeof doc.paidAmountMinor === 'number' ? doc.paidAmountMinor : 0,
    paymentStatus,
    events,
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
  });
}
