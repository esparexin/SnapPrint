import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentPrintConfig } from '@snapprint/contracts';

const hookRuntime = {
  slots: [] as unknown[],
  cursor: 0,
  pendingEffects: [] as Array<{ idx: number; run: () => void | (() => void) }>,
  cleanups: new Map<number, () => void>(),
  onUpdate: () => {},
};

function resetHooks() {
  for (const cleanup of hookRuntime.cleanups.values()) cleanup();
  hookRuntime.slots = [];
  hookRuntime.cursor = 0;
  hookRuntime.pendingEffects = [];
  hookRuntime.cleanups.clear();
  hookRuntime.onUpdate = () => {};
}

function flushEffects() {
  for (const eff of hookRuntime.pendingEffects.splice(0)) {
    hookRuntime.cleanups.get(eff.idx)?.();
    const cleanup = eff.run();
    if (typeof cleanup === 'function') hookRuntime.cleanups.set(eff.idx, cleanup);
  }
}

function depsChanged(prev?: unknown[], next?: unknown[]) {
  return (
    !prev || !next || prev.length !== next.length || next.some((v, i) => !Object.is(v, prev[i]))
  );
}

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    default: actual,
    useState: (init: unknown) => {
      const idx = hookRuntime.cursor++;
      if (!(idx in hookRuntime.slots)) {
        hookRuntime.slots[idx] = typeof init === 'function' ? (init as () => unknown)() : init;
      }
      return [
        hookRuntime.slots[idx],
        (u: unknown) => {
          const prev = hookRuntime.slots[idx];
          const next = typeof u === 'function' ? (u as (p: unknown) => unknown)(prev) : u;
          if (!Object.is(prev, next)) {
            hookRuntime.slots[idx] = next;
            hookRuntime.onUpdate();
          }
        },
      ];
    },
    useEffect: (effect: () => void | (() => void), deps?: unknown[]) => {
      const idx = hookRuntime.cursor++;
      if (deps === undefined || depsChanged(hookRuntime.slots[idx] as unknown[], deps)) {
        hookRuntime.slots[idx] = deps;
        hookRuntime.pendingEffects.push({ idx, run: effect });
      }
    },
  };
});

import { OrderSummaryCard } from '../app/s/[slug]/order-summary-card.js';

async function tick(ms = 0) {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  if (ms > 0) vi.advanceTimersByTime(ms);
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('Storefront Quote Recalculation & Cancellation Lifecycle', () => {
  const originalFetch = global.fetch;

  beforeEach(() => resetHooks());

  afterEach(() => {
    resetHooks();
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('recalculates on config/delete changes, excludes deleted assets, aborts stale fetches, and clears quote on error', async () => {
    vi.useFakeTimers();
    const quoteRequests: Array<{ items: DocumentPrintConfig[]; signal?: AbortSignal | null }> = [];
    let resolveFirst!: (val: Response) => void;
    const firstPending = new Promise<Response>((res) => (resolveFirst = res));

    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body)) as { items: DocumentPrintConfig[] };
      quoteRequests.push({ items: parsed.items, signal: init?.signal });
      if (quoteRequests.length === 1) return firstPending;
      if (parsed.items.some((i) => i.pageSelection === '999')) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ message: 'Page 999 exceeds total document page count.' }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: parsed.items.map((cfg) => ({
            assetId: cfg.assetId,
            filename: 'doc.pdf',
            paperSize: cfg.paperSize,
            colorMode: cfg.colorMode,
            sides: cfg.sides,
            orientation: cfg.orientation,
            scaling: cfg.scaling,
            pageSelection: cfg.pageSelection,
            copies: cfg.copies,
            documentPageCount: 2,
            selectedPagesCount: 2,
            sheetsCount: 2,
            unitPriceMinor: 200,
            subtotalMinor: 400 * cfg.copies,
          })),
          totalSheets: 2 * parsed.items.length,
          totalAmountMinor: parsed.items.reduce((acc, c) => acc + 400 * c.copies, 0),
          currency: 'INR',
          calculatedAt: new Date().toISOString(),
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const pdfConfig: DocumentPrintConfig = {
      assetId: 'asset_pdf_1234567890',
      paperSize: 'A4',
      colorMode: 'black_and_white',
      sides: 'single_sided',
      orientation: 'portrait',
      scaling: 'fit_to_page',
      pageSelection: 'all',
      copies: 1,
    };
    const jpgConfig: DocumentPrintConfig = { ...pdfConfig, assetId: 'asset_jpg_1234567890' };

    let currentConfigs = [pdfConfig, jpgConfig];
    let lastVnode: ReturnType<typeof OrderSummaryCard> = null;
    const render = () => {
      hookRuntime.cursor = 0;
      lastVnode = OrderSummaryCard({
        slug: 'vikram-mobiles',
        sessionId: 'sess_vikram_12345678',
        token: 'tok_123',
        configs: currentConfigs,
        onOrderSubmitted: vi.fn(),
      });
      flushEffects();
    };
    const requireVnode = () => {
      if (!lastVnode) throw new Error('Expected rendered OrderSummaryCard element');
      return lastVnode;
    };
    hookRuntime.onUpdate = render;

    // 1. Upload/initial -> debounces and triggers quote #1 (pending)
    render();
    await tick(250);
    expect(quoteRequests).toHaveLength(1);
    expect(quoteRequests[0].signal?.aborted).toBe(false);

    // 2. Delete JPG while quote #1 is in flight -> aborts quote #1 and requests ONLY PDF
    currentConfigs = [pdfConfig];
    render();
    expect(quoteRequests[0].signal?.aborted).toBe(true);
    resolveFirst({ ok: true, status: 200, json: async () => ({}) } as Response);
    await tick(250);
    expect(quoteRequests).toHaveLength(2);
    expect(quoteRequests[1].items.map((i) => i.assetId)).toEqual(['asset_pdf_1234567890']);
    expect(requireVnode().props.children[4].props.quote.totalAmountMinor).toBe(400);

    // 3. Config change (copies: 3) -> recalculates quote cleanly
    currentConfigs = [{ ...pdfConfig, copies: 3 }];
    render();
    await tick(250);
    expect(quoteRequests).toHaveLength(3);
    expect(requireVnode().props.children[4].props.quote.totalAmountMinor).toBe(1200);

    // 4. Empty pageSelection while typing -> avoids failed network call & clears stale quote
    currentConfigs = [{ ...pdfConfig, pageSelection: '' }];
    render();
    await tick(250);
    expect(quoteRequests).toHaveLength(3);
    expect(requireVnode().props.children[4].props.quote).toBeNull();

    // 5. Invalid pageSelection -> surfaces error and clears stale quote
    currentConfigs = [{ ...pdfConfig, pageSelection: '999' }];
    render();
    await tick(250);
    expect(quoteRequests).toHaveLength(4);
    expect(requireVnode().props.children[4].props.quote).toBeNull();
    expect(requireVnode().props.children[1].props.children).toContain(
      'exceeds total document page count'
    );
  });
});
