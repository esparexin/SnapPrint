import type { PaperSize, PrinterRole, PrinterStatus } from '@snapprint/contracts';

export interface PrinterRoutingCandidate {
  id: string;
  name: string;
  role: PrinterRole;
  isColorSupported: boolean;
  supportedPaperSizes: readonly PaperSize[];
  status: PrinterStatus;
  duplexSupport?: 'supported' | 'unsupported' | 'unknown';
  supportedDuplexSizes?: readonly PaperSize[];
}

export interface ResolvePrinterJobInput {
  colorMode: 'color' | 'bw';
  paperSize: PaperSize;
  sides?: 'single' | 'double' | 'single_sided' | 'double_sided';
  printers: readonly PrinterRoutingCandidate[];
}

export interface PrinterRoutingResult {
  allowed: boolean;
  selectedPrinter?: PrinterRoutingCandidate;
  reason?:
    | 'NO_PRINTERS_CONFIGURED'
    | 'NO_ONLINE_PRINTERS'
    | 'NO_PAPER_SIZE_SUPPORT'
    | 'NO_DUPLEX_SUPPORT'
    | 'NO_COLOR_SUPPORT';
}

export function resolvePrinterForJob(input: ResolvePrinterJobInput): PrinterRoutingResult {
  const { colorMode, paperSize, sides, printers } = input;

  if (!printers || printers.length === 0) {
    return { allowed: false, reason: 'NO_PRINTERS_CONFIGURED' };
  }

  // 1. Only online printers can accept cloud jobs
  const onlinePrinters = printers.filter((p) => p.status === 'online');
  if (onlinePrinters.length === 0) {
    return { allowed: false, reason: 'NO_ONLINE_PRINTERS' };
  }

  // 2. Filter by paper size compatibility
  const paperCompatible = onlinePrinters.filter((p) => p.supportedPaperSizes.includes(paperSize));
  if (paperCompatible.length === 0) {
    return { allowed: false, reason: 'NO_PAPER_SIZE_SUPPORT' };
  }

  // 3. Filter by duplex support if double-sided printing requested (fail-closed)
  const isDuplex = sides === 'double' || sides === 'double_sided';
  const candidates = isDuplex
    ? paperCompatible.filter((p) => {
        if (p.duplexSupport !== 'supported') return false;
        if (p.supportedDuplexSizes && p.supportedDuplexSizes.length > 0) {
          return p.supportedDuplexSizes.includes(paperSize);
        }
        return true;
      })
    : paperCompatible;

  if (isDuplex && candidates.length === 0) {
    return { allowed: false, reason: 'NO_DUPLEX_SUPPORT' };
  }

  // 4. Routing logic based on color mode
  if (colorMode === 'color') {
    const colorCapable = candidates.filter((p) => p.isColorSupported);
    if (colorCapable.length === 0) {
      return { allowed: false, reason: 'NO_COLOR_SUPPORT' };
    }

    const activeColor = colorCapable.find((p) => p.role === 'active_color');
    if (activeColor) return { allowed: true, selectedPrinter: activeColor };

    const standbyColor = colorCapable.find((p) => p.role === 'standby');
    if (standbyColor) return { allowed: true, selectedPrinter: standbyColor };

    return { allowed: true, selectedPrinter: colorCapable[0] };
  }

  // B&W Routing logic:
  // Preference: 1. active_bw, 2. standby B&W, 3. active_color (fallback for B&W jobs)
  const activeBw = candidates.find((p) => p.role === 'active_bw');
  if (activeBw) return { allowed: true, selectedPrinter: activeBw };

  const standbyBw = candidates.find((p) => p.role === 'standby' && !p.isColorSupported);
  if (standbyBw) return { allowed: true, selectedPrinter: standbyBw };

  const fallback = candidates.find((p) => p.role === 'active_color') ?? candidates[0];
  return { allowed: true, selectedPrinter: fallback };
}

const PAIRING_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generatePairingCode(): string {
  let segment1 = '';
  let segment2 = '';
  for (let i = 0; i < 4; i++) {
    segment1 += PAIRING_CHARS[Math.floor(Math.random() * PAIRING_CHARS.length)];
    segment2 += PAIRING_CHARS[Math.floor(Math.random() * PAIRING_CHARS.length)];
  }
  return `SNAP-${segment1}-${segment2}`;
}

export function canRedeemPairingKey(
  key: { status: 'active' | 'consumed' | 'expired' | 'revoked'; expiresAt: string },
  currentTimeIso: string
): { allowed: boolean; reason?: 'KEY_NOT_ACTIVE' | 'KEY_EXPIRED' } {
  if (key.status !== 'active') {
    return { allowed: false, reason: 'KEY_NOT_ACTIVE' };
  }

  const expiresTime = new Date(key.expiresAt).getTime();
  const currentTime = new Date(currentTimeIso).getTime();

  if (currentTime > expiresTime) {
    return { allowed: false, reason: 'KEY_EXPIRED' };
  }

  return { allowed: true };
}

export interface OrderItemForPrintRouting {
  assetId: string;
  filename: string;
  paperSize: PaperSize;
  colorMode: 'black_and_white' | 'color' | 'bw';
  sides: 'single_sided' | 'double_sided' | 'single' | 'double';
  copies: number;
  pageSelection?: string;
  itemId?: string;
}

export interface OrderForPrintRouting {
  orderId: string;
  studioId: string;
  items: readonly OrderItemForPrintRouting[];
}

export interface GeneratedPrintJobDescriptor {
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
  status: 'pending';
  createdAt: string;
}

export interface CreatePrintJobsResult {
  success: boolean;
  jobs: GeneratedPrintJobDescriptor[];
  failures: Array<{
    itemIndex: number;
    filename: string;
    reason: string;
  }>;
}

export function createPrintJobsForOrder(
  order: OrderForPrintRouting,
  printers: readonly PrinterRoutingCandidate[],
  nowIso: string = new Date().toISOString()
): CreatePrintJobsResult {
  const jobs: GeneratedPrintJobDescriptor[] = [];
  const failures: Array<{ itemIndex: number; filename: string; reason: string }> = [];

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const normalizedColorMode: 'bw' | 'color' = item.colorMode === 'color' ? 'color' : 'bw';
    const normalizedSides: 'single' | 'double' =
      item.sides === 'double_sided' || item.sides === 'double' ? 'double' : 'single';
    const pageRange =
      item.pageSelection && item.pageSelection !== 'all' ? item.pageSelection : undefined;

    const routeResult = resolvePrinterForJob({
      colorMode: normalizedColorMode,
      paperSize: item.paperSize,
      sides: normalizedSides,
      printers,
    });

    if (!routeResult.allowed || !routeResult.selectedPrinter) {
      failures.push({
        itemIndex: i,
        filename: item.filename,
        reason: routeResult.reason || 'NO_PRINTER_AVAILABLE',
      });
      continue;
    }

    const cleanOrderId = order.orderId.replace(/^ord_/, '');
    const randSuffix = Math.random().toString(36).substring(2, 6);
    const jobId = `job_${cleanOrderId}_${i + 1}_${randSuffix}`;
    const itemId = item.itemId || `item_${i + 1}`;

    jobs.push({
      jobId,
      studioId: order.studioId,
      orderId: order.orderId,
      itemId,
      assetId: item.assetId,
      targetPrinterId: routeResult.selectedPrinter.id,
      printerName: routeResult.selectedPrinter.name,
      colorMode: normalizedColorMode,
      paperSize: item.paperSize,
      sides: normalizedSides,
      copies: Math.max(1, item.copies || 1),
      filename: item.filename,
      pageRange,
      status: 'pending',
      createdAt: nowIso,
    });
  }

  return {
    success: failures.length === 0,
    jobs,
    failures,
  };
}
