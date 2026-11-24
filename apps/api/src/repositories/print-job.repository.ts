import { Db } from 'mongodb';
import { PaperSize, PrintJobRecord, PrintJobStatus } from '@snapprint/contracts';
import { createPrintJobsForOrder, GeneratedPrintJobDescriptor } from '@snapprint/domain';
import { findOrderById, updateOrderStatus } from './order.repository.js';
import { listStudioPrinters } from './printer.repository.js';

export const PRINT_JOBS_COLLECTION = 'print_jobs';

export interface PrintJobDocument {
  jobId: string;
  studioId: string;
  orderId: string;
  itemId: string;
  assetId: string;
  targetPrinterId: string;
  printerName: string;
  colorMode: 'bw' | 'color';
  paperSize: PaperSize;
  sides: 'single' | 'double';
  copies: number;
  filename: string;
  pageRange?: string;
  status: PrintJobStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export function toPrintJobRecord(doc: PrintJobDocument): PrintJobRecord {
  return {
    jobId: doc.jobId,
    studioId: doc.studioId,
    orderId: doc.orderId,
    itemId: doc.itemId,
    assetId: doc.assetId,
    targetPrinterId: doc.targetPrinterId,
    printerName: doc.printerName,
    colorMode: doc.colorMode,
    paperSize: doc.paperSize,
    sides: doc.sides,
    copies: doc.copies,
    filename: doc.filename,
    pageRange: doc.pageRange,
    status: doc.status,
    errorMessage: doc.errorMessage,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    completedAt: doc.completedAt
      ? doc.completedAt instanceof Date
        ? doc.completedAt.toISOString()
        : new Date(doc.completedAt).toISOString()
      : undefined,
  };
}

export async function createPrintJobs(
  db: Db,
  jobs: GeneratedPrintJobDescriptor[]
): Promise<PrintJobDocument[]> {
  if (jobs.length === 0) return [];

  const docs: PrintJobDocument[] = jobs.map((j) => {
    const createdDate = new Date(j.createdAt);
    return {
      jobId: j.jobId,
      studioId: j.studioId,
      orderId: j.orderId,
      itemId: j.itemId,
      assetId: j.assetId,
      targetPrinterId: j.targetPrinterId,
      printerName: j.printerName,
      colorMode: j.colorMode,
      paperSize: j.paperSize,
      sides: j.sides,
      copies: j.copies,
      filename: j.filename,
      pageRange: j.pageRange,
      status: 'pending',
      createdAt: createdDate,
      updatedAt: createdDate,
    };
  });

  await db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).insertMany(docs);
  return docs;
}

export async function findPendingPrintJobsByStudio(
  db: Db,
  studioId: string,
  limit: number = 20
): Promise<PrintJobDocument[]> {
  return db
    .collection<PrintJobDocument>(PRINT_JOBS_COLLECTION)
    .find({ studioId, status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
}

export async function findPrintJobById(db: Db, jobId: string): Promise<PrintJobDocument | null> {
  return db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).findOne({ jobId });
}

export async function findPrintJobsByOrderId(db: Db, orderId: string): Promise<PrintJobDocument[]> {
  return db
    .collection<PrintJobDocument>(PRINT_JOBS_COLLECTION)
    .find({ orderId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function updatePrintJobStatus(
  db: Db,
  jobId: string,
  status: PrintJobStatus,
  errorMessage?: string
): Promise<boolean> {
  const now = new Date();
  const setPayload: Partial<PrintJobDocument> = {
    status,
    updatedAt: now,
  };
  if (errorMessage !== undefined) {
    setPayload.errorMessage = errorMessage;
  }
  if (status === 'completed') {
    setPayload.completedAt = now;
  }

  const res = await db
    .collection<PrintJobDocument>(PRINT_JOBS_COLLECTION)
    .updateOne({ jobId }, { $set: setPayload });

  return res.modifiedCount > 0;
}

export async function autoDispatchOrderPrintJobs(
  db: Db,
  studioId: string,
  orderId: string
): Promise<PrintJobDocument[]> {
  const existingJobs = await findPrintJobsByOrderId(db, orderId);
  if (existingJobs.length > 0) {
    return existingJobs;
  }

  const order = await findOrderById(db, studioId, orderId);
  if (!order || !order.items || order.items.length === 0) {
    return [];
  }

  const printers = await listStudioPrinters(db, studioId);
  if (printers.length === 0) {
    return [];
  }

  const routingOrder = {
    orderId: order.orderId,
    studioId: order.studioId,
    items: order.items.map((it, idx) => ({
      assetId: it.assetId,
      filename: it.filename,
      paperSize: it.paperSize,
      colorMode: it.colorMode,
      sides: it.sides,
      copies: it.copies,
      pageSelection: it.pageSelection,
      itemId: `item_${idx + 1}`,
    })),
  };

  const dispatchResult = createPrintJobsForOrder(routingOrder, printers);
  if (!dispatchResult.success || dispatchResult.jobs.length === 0) {
    return [];
  }

  const created = await createPrintJobs(db, dispatchResult.jobs);

  if (order.status === 'submitted') {
    await updateOrderStatus(db, studioId, orderId, 'processing', {
      eventId: `evt_dispatch_${Date.now()}`,
      fromStatus: 'submitted',
      toStatus: 'processing',
      timestamp: new Date().toISOString(),
      reason: `Auto-dispatched ${created.length} print job(s) to agent spooler queue.`,
    });
  }

  return created;
}
