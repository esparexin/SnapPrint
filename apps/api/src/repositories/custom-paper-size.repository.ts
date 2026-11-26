import crypto from 'node:crypto';
import { Db } from 'mongodb';
import { CreateCustomPaperSizeRequest, CustomPaperSize } from '@snapprint/contracts';
import { PRINTERS_COLLECTION, StudioPrinterDocument } from './printer.repository.js';

export const CUSTOM_PAPER_SIZES_COLLECTION = 'studio_paper_sizes';

export interface CustomPaperSizeDocument {
  id: string;
  studioId: string;
  printerId: string;
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'in';
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function listCustomPaperSizes(
  db: Db,
  studioId: string,
  printerId?: string
): Promise<CustomPaperSize[]> {
  const query: Record<string, unknown> = { studioId };
  if (printerId) query.printerId = printerId;

  const docs = await db
    .collection<CustomPaperSizeDocument>(CUSTOM_PAPER_SIZES_COLLECTION)
    .find(query)
    .sort({ createdAt: 1 })
    .toArray();

  return docs.map((d) => ({
    id: d.id,
    studioId: d.studioId,
    printerId: d.printerId,
    name: d.name,
    width: d.width,
    height: d.height,
    unit: d.unit,
    isEnabled: d.isEnabled,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function createCustomPaperSize(
  db: Db,
  studioId: string,
  input: CreateCustomPaperSizeRequest
): Promise<CustomPaperSize> {
  const now = new Date();
  const id = `cps_${crypto.randomBytes(6).toString('hex')}`;
  const doc: CustomPaperSizeDocument = {
    id,
    studioId,
    printerId: input.printerId,
    name: input.name,
    width: input.width,
    height: input.height,
    unit: input.unit,
    isEnabled: input.isEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<CustomPaperSizeDocument>(CUSTOM_PAPER_SIZES_COLLECTION).insertOne(doc);

  // Link custom paper size directly into the physical printer's supportedPaperSizes array
  const printer = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .findOne({ studioId, id: input.printerId });
  if (printer) {
    const currentSizes = printer.supportedPaperSizes || [];
    if (!currentSizes.includes(id)) {
      await db
        .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
        .updateOne(
          { studioId, id: input.printerId },
          { $set: { supportedPaperSizes: [...currentSizes, id] } }
        );
    }
  }

  return {
    id: doc.id,
    studioId: doc.studioId,
    printerId: doc.printerId,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    unit: doc.unit,
    isEnabled: doc.isEnabled,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function deleteCustomPaperSize(
  db: Db,
  studioId: string,
  id: string
): Promise<boolean> {
  const existing = await db
    .collection<CustomPaperSizeDocument>(CUSTOM_PAPER_SIZES_COLLECTION)
    .findOne({ studioId, id });
  if (!existing) return false;

  const printer = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .findOne({ studioId, id: existing.printerId });
  if (printer && printer.supportedPaperSizes) {
    const nextSizes = printer.supportedPaperSizes.filter((s) => s !== id);
    await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .updateOne(
        { studioId, id: existing.printerId },
        { $set: { supportedPaperSizes: nextSizes } }
      );
  }

  const res = await db
    .collection<CustomPaperSizeDocument>(CUSTOM_PAPER_SIZES_COLLECTION)
    .deleteOne({ studioId, id });
  return res.deletedCount > 0;
}

export async function toggleCustomPaperSize(
  db: Db,
  studioId: string,
  id: string,
  isEnabled: boolean
): Promise<boolean> {
  const res = await db
    .collection<CustomPaperSizeDocument>(CUSTOM_PAPER_SIZES_COLLECTION)
    .updateOne({ studioId, id }, { $set: { isEnabled, updatedAt: new Date() } });
  return res.matchedCount > 0;
}
