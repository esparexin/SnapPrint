import type { PaperSize, PrinterRole, PrinterStatus } from '@snapprint/contracts';

export interface PrinterRoutingCandidate {
  id: string;
  name: string;
  role: PrinterRole;
  isColorSupported: boolean;
  supportedPaperSizes: readonly PaperSize[];
  status: PrinterStatus;
}

export interface ResolvePrinterJobInput {
  colorMode: 'color' | 'bw';
  paperSize: PaperSize;
  printers: readonly PrinterRoutingCandidate[];
}

export interface PrinterRoutingResult {
  allowed: boolean;
  selectedPrinter?: PrinterRoutingCandidate;
  reason?:
    | 'NO_PRINTERS_CONFIGURED'
    | 'NO_ONLINE_PRINTERS'
    | 'NO_PAPER_SIZE_SUPPORT'
    | 'NO_COLOR_SUPPORT';
}

export function resolvePrinterForJob(input: ResolvePrinterJobInput): PrinterRoutingResult {
  const { colorMode, paperSize, printers } = input;

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

  // 3. Routing logic based on color mode
  if (colorMode === 'color') {
    const colorCapable = paperCompatible.filter((p) => p.isColorSupported);
    if (colorCapable.length === 0) {
      return { allowed: false, reason: 'NO_COLOR_SUPPORT' };
    }

    const activeColor = colorCapable.find((p) => p.role === 'active_color');
    if (activeColor) {
      return { allowed: true, selectedPrinter: activeColor };
    }

    const standbyColor = colorCapable.find((p) => p.role === 'standby');
    if (standbyColor) {
      return { allowed: true, selectedPrinter: standbyColor };
    }

    return { allowed: true, selectedPrinter: colorCapable[0] };
  }

  // B&W Routing logic:
  // Preference: 1. active_bw, 2. standby B&W, 3. active_color (fallback for B&W jobs)
  const activeBw = paperCompatible.find((p) => p.role === 'active_bw');
  if (activeBw) {
    return { allowed: true, selectedPrinter: activeBw };
  }

  const standbyBw = paperCompatible.find((p) => p.role === 'standby' && !p.isColorSupported);
  if (standbyBw) {
    return { allowed: true, selectedPrinter: standbyBw };
  }

  const fallback = paperCompatible.find((p) => p.role === 'active_color') ?? paperCompatible[0];
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
