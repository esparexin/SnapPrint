import { describe, expect, it, vi } from 'vitest';
import {
  activateStudio,
  createStudio,
  fetchMyStudios,
  StudioApiError,
  updateStudioProfile,
  verifyStudioRazorpay,
} from './studio-client';

describe('Studio API Client (apps/web)', () => {
  it('createStudio issues POST /studios with credentials and JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'studio_123', name: 'My Xerox', status: 'onboarding' }),
    });

    const res = await createStudio(
      {
        name: 'My Xerox',
        slug: 'my-xerox',
        location: { city: 'Hyderabad', state: 'Telangana' },
      },
      mockFetch as unknown as typeof fetch
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({
      name: 'My Xerox',
      slug: 'my-xerox',
      location: { city: 'Hyderabad', state: 'Telangana' },
    });
    expect(res.id).toBe('studio_123');
  });

  it('fetchMyStudios issues GET /studios/me', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ studios: [{ id: 'studio_1', name: 'Shop 1' }] }),
    });

    const res = await fetchMyStudios(mockFetch as unknown as typeof fetch);
    expect(res.studios).toHaveLength(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/me');
    expect(init.method).toBe('GET');
  });

  it('updateStudioProfile issues PATCH /studios/:id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'std_1', capabilities: { autoPrintMaxPages: 50 } }),
    });

    const res = await updateStudioProfile(
      'std_1',
      { capabilities: { autoPrintMaxPages: 50 } },
      mockFetch as unknown as typeof fetch
    );
    expect(res.capabilities?.autoPrintMaxPages).toBe(50);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1');
    expect(init.method).toBe('PATCH');
  });

  it('verifyStudioRazorpay issues POST /studios/:id/verify-razorpay', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isConfirmed: true, message: 'Verified' }),
    });

    const res = await verifyStudioRazorpay(
      'std_1',
      { keyId: 'rzp_test_123', keySecret: 'secret_456' },
      mockFetch as unknown as typeof fetch
    );
    expect(res.isConfirmed).toBe(true);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/verify-razorpay');
    expect(init.method).toBe('POST');
  });

  it('activateStudio issues POST /studios/:id/activate', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ studioId: 'std_1', status: 'active', publicUrl: '/s/my-xerox' }),
    });

    const res = await activateStudio(
      'std_1',
      { confirmReady: true },
      mockFetch as unknown as typeof fetch
    );
    expect(res.status).toBe('active');
    expect(res.publicUrl).toBe('/s/my-xerox');
  });

  it('handles API errors by throwing StudioApiError with error fields', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Invalid slug',
        code: 'INVALID_SLUG',
        errors: ['Slug too short'],
      }),
    });

    await expect(
      createStudio(
        { name: 'X', slug: 'x', location: { city: 'Hyd', state: 'Telangana' } },
        mockFetch as unknown as typeof fetch
      )
    ).rejects.toThrow(StudioApiError);
  });
});
