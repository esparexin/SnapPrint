import { describe, expect, it, vi } from 'vitest';
import {
  getPlatformMetrics,
  listPlatformAuditLogs,
  listPlatformStudios,
  PlatformAdminApiError,
  updatePlatformStudioStatus,
} from './platform-admin-client.js';

describe('platform-admin-client', () => {
  it('fetches platform metrics successfully', async () => {
    const mockMetrics = {
      totalStudios: 5,
      activeStudios: 4,
      onboardingStudios: 1,
      suspendedStudios: 0,
      totalOrdersCount: 200,
      totalPaidVolumeMinor: 500000,
      currency: 'INR',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMetrics,
    } as Response);

    const result = await getPlatformMetrics(mockFetch);
    expect(result).toEqual(mockMetrics);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/admin/metrics',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('lists studios with query parameters', async () => {
    const mockResponse = {
      studios: [
        {
          id: 'studio_alpha',
          slug: 'studio-alpha',
          name: 'Alpha Prints',
          status: 'active',
          createdAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-23T10:00:00.000Z',
        },
      ],
      total: 1,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await listPlatformStudios({ status: 'active', search: 'alpha' }, mockFetch);
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/admin/studios?status=active&search=alpha',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('updates studio status via PATCH', async () => {
    const mockResponse = {
      studio: {
        id: 'studio_alpha',
        slug: 'studio-alpha',
        name: 'Alpha Prints',
        status: 'suspended',
        createdAt: '2026-11-20T10:00:00.000Z',
        updatedAt: '2026-11-23T10:00:00.000Z',
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await updatePlatformStudioStatus(
      'studio_alpha',
      { status: 'suspended', reason: 'Non-payment' },
      mockFetch
    );
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/admin/studios/studio_alpha/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended', reason: 'Non-payment' }),
      })
    );
  });

  it('lists audit logs with limit', async () => {
    const mockResponse = {
      auditLogs: [
        {
          id: 'log_01',
          timestamp: '2026-11-23T12:00:00.000Z',
          actorId: 'admin_1',
          action: 'studio.status_change',
          targetType: 'studio',
          targetId: 'studio_alpha',
          reason: 'Non-payment',
        },
      ],
      total: 1,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await listPlatformAuditLogs(20, mockFetch);
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/admin/audit-logs?limit=20',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('throws PlatformAdminApiError when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: 'PLATFORM_ADMIN_REQUIRED', message: 'Forbidden' }),
    } as Response);

    await expect(getPlatformMetrics(mockFetch)).rejects.toThrow(PlatformAdminApiError);
  });
});
