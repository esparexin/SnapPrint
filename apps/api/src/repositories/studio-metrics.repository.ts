import { Db } from 'mongodb';
import { StudioMetricsResponse, StudioMetricsResponseSchema } from '@snapprint/contracts';
import { ORDERS_COLLECTION, OrderDocument } from './order.repository.js';

export async function getTodayStudioMetrics(
  db: Db,
  studioId: string,
  now: Date = new Date()
): Promise<StudioMetricsResponse> {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const docs = await db
    .collection<OrderDocument>(ORDERS_COLLECTION)
    .find({
      studioId,
      createdAt: { $gte: startOfDay },
    })
    .toArray();

  let todayOrdersCount = 0;
  let todayPaidCollectionsMinor = 0;
  let pendingOrdersCount = 0;
  let bwPages = 0;
  let colorPages = 0;
  let totalSheets = 0;

  for (const doc of docs) {
    todayOrdersCount += 1;

    // Strict SSOT: Only count paid orders toward revenue
    if (doc.paymentStatus === 'PAID') {
      todayPaidCollectionsMinor += doc.paidAmountMinor ?? doc.totalAmountMinor ?? 0;
    }

    // Pending orders waiting for print or fulfillment
    if (doc.status === 'submitted' || doc.status === 'processing' || doc.status === 'ready') {
      pendingOrdersCount += 1;
    }

    totalSheets += doc.totalSheets || 0;

    if (Array.isArray(doc.items)) {
      for (const item of doc.items as Array<Record<string, unknown>>) {
        const pages = typeof item.pageCount === 'number' ? item.pageCount : 1;
        const copies = typeof item.copies === 'number' ? item.copies : 1;
        const itemPages = pages * copies;

        if (item.colorMode === 'color') {
          colorPages += itemPages;
        } else {
          bwPages += itemPages;
        }
      }
    }
  }

  return StudioMetricsResponseSchema.parse({
    todayOrdersCount,
    todayPaidCollectionsMinor,
    pendingOrdersCount,
    printVolume: {
      bwPages,
      colorPages,
      totalSheets,
    },
    currency: 'INR',
  });
}
