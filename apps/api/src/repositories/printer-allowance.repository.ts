import { Db } from 'mongodb';
import { PaperSize, StudioPublicCapabilities } from '@snapprint/contracts';
import { resolveItemsWithMeta } from './photo-asset.repository.js';
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
  const studio = await db.collection<StudioDocument>(STUDIOS_COLLECTION).findOne({ id: studioId });
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

export function deriveCapabilitiesFromPrinters(
  activePrinters: readonly StudioPrinterDocument[]
): StudioPublicCapabilities {
  const supportsColor = activePrinters.some((p) => p.isColorSupported);
  const duplexPrinters = activePrinters.filter((p) => p.duplexSupport === 'supported');
  const supportsDuplex = duplexPrinters.length > 0;
  const supportedDuplexSizes = Array.from(
    new Set(
      duplexPrinters.flatMap((p) =>
        p.supportedDuplexSizes && p.supportedDuplexSizes.length > 0
          ? p.supportedDuplexSizes
          : p.supportedPaperSizes
      )
    )
  );
  const supportedPaperSizes = Array.from(
    new Set(activePrinters.flatMap((p) => p.supportedPaperSizes))
  );

  return {
    supportsColor,
    supportsDuplex,
    supportedDuplexSizes,
    supportedPaperSizes: supportedPaperSizes.length > 0 ? supportedPaperSizes : ['A4'],
  };
}

/**
 * Returns public capabilities for active, online studio printers.
 */
export async function getStudioPublicCapabilities(
  db: Db,
  studioId: string
): Promise<StudioPublicCapabilities> {
  const { capabilities } = await getStudioActivePrintersAndCapabilities(db, studioId);
  return capabilities;
}

/**
 * Fetches active online printers and their derived public capabilities in a single database read.
 */
export async function getStudioActivePrintersAndCapabilities(
  db: Db,
  studioId: string
): Promise<{ activePrinters: StudioPrinterDocument[]; capabilities: StudioPublicCapabilities }> {
  const activePrinters = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .find({ studioId, role: { $in: ['active_bw', 'active_color'] }, status: 'online' })
    .toArray();

  return {
    activePrinters,
    capabilities: deriveCapabilitiesFromPrinters(activePrinters),
  };
}

/**
 * Validates that requested duplex print options are supported by an online active printer in the shop.
 * Fail-closed: returns allowed: false if any requested duplex item cannot be fulfilled.
 */
export async function validateOrderDuplexFeasibility(
  db: Db,
  studioId: string,
  items: readonly { paperSize: string; colorMode: string; sides?: string }[]
): Promise<{ allowed: boolean; reason?: string }> {
  const hasDuplex = items.some((i) => i.sides === 'double_sided' || i.sides === 'double');
  if (!hasDuplex) return { allowed: true };

  const printers = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .find({ studioId, role: { $in: ['active_bw', 'active_color'] }, status: 'online' })
    .toArray();

  for (const item of items) {
    if (item.sides === 'double_sided' || item.sides === 'double') {
      const match = printers.find((p) => {
        if (p.duplexSupport !== 'supported') return false;
        if (item.colorMode === 'color' && !p.isColorSupported) return false;
        if (p.supportedDuplexSizes && p.supportedDuplexSizes.length > 0) {
          return p.supportedDuplexSizes.includes(item.paperSize as PaperSize);
        }
        return p.supportedPaperSizes.includes(item.paperSize as PaperSize);
      });
      if (!match) {
        return {
          allowed: false,
          reason: `Double-sided (duplex) printing is not supported for ${item.paperSize} (${item.colorMode}).`,
        };
      }
    }
  }
  return { allowed: true };
}

export async function prepareOrderAdmission<
  T extends { assetId: string; paperSize: string; colorMode: string; sides?: string },
>(
  db: Db,
  studioId: string,
  sessionId: string,
  items: readonly T[]
): Promise<{
  error?: { status: number; code: string; message: string };
  items?: Array<{ config: T; filename: string; documentPageCount: number }>;
}> {
  const duplexCheck = await validateOrderDuplexFeasibility(db, studioId, items);
  if (!duplexCheck.allowed) {
    return {
      error: {
        status: 422,
        code: 'NO_DUPLEX_SUPPORT',
        message: duplexCheck.reason || 'No duplex support.',
      },
    };
  }
  const itemsWithMeta = await resolveItemsWithMeta(db, studioId, sessionId, items);
  if (!itemsWithMeta) {
    return { error: { status: 404, code: 'ASSET_NOT_FOUND', message: 'Asset not found.' } };
  }
  return { items: itemsWithMeta };
}
