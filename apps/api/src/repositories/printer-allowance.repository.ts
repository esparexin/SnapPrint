import { Db } from 'mongodb';
import { PRINTERS_COLLECTION, StudioPrinterDocument } from './printer.repository.js';
import { STUDIOS_COLLECTION, StudioDocument } from './studio.repository.js';

export interface StudioFleetAllowance {
  registeredCount: number;
  activeCount: number;
  maxActivePrinters: number;
  remainingActiveCapacity: number;
  activeBwPrinterId?: string;
  activeColorPrinterId?: string;
  isLimitReached: boolean;
}

/**
 * Calculates current studio printer fleet allowance and capacity.
 * Follows #11/#24: unlimited registered inventory, max 2 active production printers for MVP.
 */
export async function getStudioFleetAllowance(
  db: Db,
  studioId: string
): Promise<StudioFleetAllowance> {
  const studio = await db
    .collection<StudioDocument>(STUDIOS_COLLECTION)
    .findOne({ id: studioId });
  const maxActivePrinters = studio?.settings?.maxActivePrinters ?? 2;

  const printers = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .find({ studioId })
    .toArray();

  const registeredCount = printers.length;
  const activeBw = printers.find((p) => p.role === 'active_bw');
  const activeColor = printers.find((p) => p.role === 'active_color');
  const activeCount = (activeBw ? 1 : 0) + (activeColor ? 1 : 0);
  const remainingActiveCapacity = Math.max(0, maxActivePrinters - activeCount);

  return {
    registeredCount,
    activeCount,
    maxActivePrinters,
    remainingActiveCapacity,
    activeBwPrinterId: activeBw?.id,
    activeColorPrinterId: activeColor?.id,
    isLimitReached: remainingActiveCapacity === 0,
  };
}
