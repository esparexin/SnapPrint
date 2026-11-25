import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearStoredCustomerSession,
  ensureCustomerSession,
  fetchPublicStudio,
  getSessionStorageKey,
  getStoredCustomerSession,
  storeCustomerSession,
} from './customer-client.js';

describe('Customer Client Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchPublicStudio resolves and parses studio correctly', async () => {
    const mockStudio = {
      id: 'studio_koramangala',
      slug: 'koramangala-prints',
      name: 'Koramangala Prints',
      status: 'active',
      currency: 'INR',
      contactPhone: '+919876543210',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockStudio,
    });

    const result = await fetchPublicStudio(
      'koramangala-prints',
      mockFetch as unknown as typeof fetch
    );
    expect(result.id).toBe('studio_koramangala');
    expect(result.name).toBe('Koramangala Prints');
    expect(result.status).toBe('active');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/public/studios/koramangala-prints'),
      expect.objectContaining({
        next: { revalidate: 60, tags: ['studio-koramangala-prints'] },
      })
    );
  });

  it('fetchPublicStudio throws typed CustomerApiError on 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ code: 'STUDIO_NOT_FOUND', message: 'Studio missing' }),
    });

    await expect(
      fetchPublicStudio('nonexistent', mockFetch as unknown as typeof fetch)
    ).rejects.toThrow('Studio missing');
  });

  it('ensureCustomerSession creates and caches session in sessionStorage without duplication', async () => {
    const validExpiry = new Date(Date.now() + 7200000).toISOString();
    const mockResponse = {
      session: {
        sessionId: 'sess_1234567890abcdef123456',
        studioId: 'studio_koramangala',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        expiresAt: validExpiry,
      },
      token: 'valid.signed.token',
    };

    const mockStore: Record<string, string> = {};
    const fakeSessionStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
    };

    vi.stubGlobal('sessionStorage', fakeSessionStorage);
    vi.stubGlobal('window', { sessionStorage: fakeSessionStorage });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    });

    // First call: creates session via API
    const res1 = await ensureCustomerSession(
      'koramangala-prints',
      mockFetch as unknown as typeof fetch
    );
    expect(res1.session.sessionId).toBe('sess_1234567890abcdef123456');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockStore[getSessionStorageKey('koramangala-prints')]).toBeDefined();

    // Verify stored session retrieval directly
    const stored = getStoredCustomerSession('koramangala-prints');
    expect(stored?.session.sessionId).toBe('sess_1234567890abcdef123456');

    // Second call: reuses cached session from sessionStorage, 0 API calls!
    const res2 = await ensureCustomerSession(
      'koramangala-prints',
      mockFetch as unknown as typeof fetch
    );
    expect(res2.session.sessionId).toBe('sess_1234567890abcdef123456');
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1!

    // Verify storeCustomerSession updates storage
    storeCustomerSession('koramangala-prints', {
      ...mockResponse,
      token: 'new.token',
    });
    expect(getStoredCustomerSession('koramangala-prints')?.token).toBe('new.token');

    // Verify clearStoredCustomerSession clears sessionStorage
    clearStoredCustomerSession('koramangala-prints');
    expect(getStoredCustomerSession('koramangala-prints')).toBeNull();
  });
});
