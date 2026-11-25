import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    useRef: (init: unknown) => {
      const idx = hookRuntime.cursor++;
      if (!(idx in hookRuntime.slots)) hookRuntime.slots[idx] = { current: init };
      return hookRuntime.slots[idx];
    },
    useCallback: (fn: unknown) => (hookRuntime.cursor++, fn),
    useMemo: (factory: () => unknown, deps: unknown[]) => {
      const idx = hookRuntime.cursor++;
      const prev = hookRuntime.slots[idx] as { val: unknown; deps: unknown[] } | undefined;
      if (!prev || depsChanged(prev.deps, deps)) hookRuntime.slots[idx] = { val: factory(), deps };
      return (hookRuntime.slots[idx] as { val: unknown }).val;
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

import { useStorefrontDocuments } from '../app/s/[slug]/use-storefront-documents.js';

function createDeferred<T>() {
  let resolve!: (val: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

async function flushAsync() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('Storefront Upload & Persistent Delete Lifecycle', () => {
  const originalFetch = global.fetch;
  const originalCreateUrl = globalThis.URL.createObjectURL;
  const originalRevokeUrl = globalThis.URL.revokeObjectURL;

  beforeEach(() => {
    resetHooks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    resetHooks();
    global.fetch = originalFetch;
    globalThis.URL.createObjectURL = originalCreateUrl;
    globalThis.URL.revokeObjectURL = originalRevokeUrl;
    vi.restoreAllMocks();
  });

  it('syncs PDF/PNG/JPG uploads, displays success/failure feedback, deletes persistently, and blocks double-delete', async () => {
    const studioId = 'studio_vikram';
    const sessionId = 'sess_vikram_12345678';
    let uploadSeq = 0;
    const deleteDeferred = createDeferred<Response>();

    const jsonRes = (status: number, body: unknown) =>
      ({ ok: status < 400, status, json: async () => body }) as Response;

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/assets') && (!init?.method || init.method === 'GET')) {
        return jsonRes(200, { assets: [], totalCount: 0 });
      }
      if (url.endsWith('/assets/intent')) {
        const seq = ++uploadSeq;
        return jsonRes(200, {
          assetId: `asset_item_000000000${seq}`,
          storageKey: `studios/${studioId}/sessions/${sessionId}/a${seq}/f`,
          uploadUrl: `/public/studios/vikram-mobiles/sessions/${sessionId}/assets/upload?assetId=asset_item_000000000${seq}`,
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        });
      }
      if (url.includes('/assets/upload')) {
        const file = (init?.body as FormData).get('file') as File;
        if (file.name === 'broken.jpg') return jsonRes(400, { message: 'Invalid image file.' });
        const assetId = url.match(/assetId=([^&]+)/)?.[1] ?? 'asset_fallback_12345678';
        return jsonRes(201, {
          assetId,
          studioId,
          sessionId,
          originalFilename: file.name,
          mimeType: file.type || 'application/pdf',
          fileSizeBytes: file.size || 100,
          pageCount: file.name.endsWith('.pdf') ? 4 : 1,
          storageKey: `studios/${studioId}/sessions/${sessionId}/${assetId}/${file.name}`,
          createdAt: new Date().toISOString(),
        });
      }
      if (init?.method === 'DELETE') return deleteDeferred.promise;
      throw new Error(`Unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    let latest!: ReturnType<typeof useStorefrontDocuments>;
    const render = () => {
      hookRuntime.cursor = 0;
      latest = useStorefrontDocuments('vikram-mobiles', sessionId, 'tok_123');
      flushEffects();
    };
    hookRuntime.onUpdate = render;
    render();
    await flushAsync();

    // 1. Upload PDF, PNG, and failing JPG
    latest.handleFilesSelected([
      new File(['%PDF-1.4'], 'notes.pdf', { type: 'application/pdf' }),
      new File(['png'], 'photo.png', { type: 'image/png' }),
      new File(['bad'], 'broken.jpg', { type: 'image/jpeg' }),
    ]);
    await flushAsync();
    expect(latest.docs.map((d) => d.filename)).toEqual(['notes.pdf', 'photo.png']);
    expect(latest.activeConfigs.map((c) => c.assetId)).toEqual(latest.docs.map((d) => d.assetId));
    expect(latest.items.find((i) => i.file.name === 'broken.jpg')?.status).toBe('failed');

    // Upload valid JPG -> success statement
    latest.handleFilesSelected([new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' })]);
    await flushAsync();
    expect(latest.feedback?.message).toBe('Uploaded "photo.jpg" successfully.');
    expect(latest.docs).toHaveLength(3);

    // 2. Delete PNG -> wait for server confirmation, lock against double-delete
    const pngId = latest.docs.find((d) => d.filename === 'photo.png')!.assetId;
    const delCalls = () =>
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => (c[1] as RequestInit | undefined)?.method === 'DELETE'
      ).length;
    const del1 = latest.handleRemoveAsset(pngId);
    const del2 = latest.handleRemoveAsset(pngId);
    expect(latest.docs).toHaveLength(3);
    expect(latest.removingKeys).toContain(pngId);
    expect(latest.feedback).toBeNull();
    expect(delCalls()).toBe(1);

    deleteDeferred.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true, assetId: pngId }),
    } as Response);
    await Promise.all([del1, del2]);
    await flushAsync();
    expect(latest.docs.map((d) => d.filename)).toEqual(['notes.pdf', 'photo.jpg']);
    expect(latest.activeConfigs.map((c) => c.assetId)).toEqual(latest.docs.map((d) => d.assetId));
    expect(latest.feedback).toEqual({
      kind: 'success',
      message: 'Deleted "photo.png" successfully.',
    });

    // 3. Delete failure retains item and shows actionable error
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Storage unavailable' }),
    }));
    const pdfId = latest.docs.find((d) => d.filename === 'notes.pdf')!.assetId;
    await latest.handleRemoveAsset(pdfId);
    await flushAsync();
    expect(latest.docs.map((d) => d.assetId)).toContain(pdfId);
    expect(latest.feedback).toEqual({ kind: 'error', message: 'Storage unavailable' });

    // 4. Delete failed item locally (no API call) & delete remaining items -> clean empty state
    const callsBeforeFailedDelete = delCalls();
    const failedId = latest.items.find((i) => i.status === 'failed')!.id;
    await latest.handleDeleteItem(failedId);
    expect(delCalls()).toBe(callsBeforeFailedDelete);
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    }));
    await latest.handleRemoveAsset(latest.docs.find((d) => d.filename === 'photo.jpg')!.assetId);
    await latest.handleRemoveAsset(pdfId);
    await flushAsync();

    expect(latest.docs).toEqual([]);
    expect(latest.activeConfigs).toEqual([]);
    expect(latest.items).toEqual([]);
    expect(latest.feedback?.message).toBe('Deleted "notes.pdf" successfully.');
  });
});
