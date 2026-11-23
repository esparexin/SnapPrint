import { describe, expect, it, vi } from 'vitest';
import {
  fetchStudioMetrics,
  fetchStudioStaff,
  inviteStudioStaff,
  revokeStudioStaff,
  updateStudioProfile,
  updateStudioSettings,
  verifyStudioRazorpay,
} from './workspace-client.js';

describe('Workspace Client (apps/web)', () => {
  it('fetchStudioMetrics issues GET /studios/:id/metrics', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        todayOrdersCount: 5,
        todayPaidCollectionsMinor: 12000,
        pendingOrdersCount: 1,
        printVolume: { bwPages: 20, colorPages: 0, totalSheets: 10 },
        currency: 'INR',
      }),
    });

    const res = await fetchStudioMetrics('std_1', mockFetch as unknown as typeof fetch);
    expect(res.todayOrdersCount).toBe(5);
    expect(res.todayPaidCollectionsMinor).toBe(12000);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/metrics');
    expect(init.method).toBe('GET');
  });

  it('fetchStudioStaff issues GET /studios/:id/staff', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'std_1_usr_1',
          userId: 'usr_1',
          studioId: 'std_1',
          email: 'staff@test.com',
          role: 'studio_staff',
          status: 'active',
          createdAt: '2026-11-23T00:00:00.000Z',
        },
      ],
    });

    const staff = await fetchStudioStaff('std_1', mockFetch as unknown as typeof fetch);
    expect(staff).toHaveLength(1);
    expect(staff[0].email).toBe('staff@test.com');
  });

  it('inviteStudioStaff issues POST /studios/:id/staff/invite', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        staff: {
          id: 'std_1_usr_2',
          userId: 'usr_2',
          studioId: 'std_1',
          email: 'new@test.com',
          role: 'studio_staff',
          status: 'invited',
          createdAt: '2026-11-23T00:00:00.000Z',
        },
      }),
    });

    const res = await inviteStudioStaff(
      'std_1',
      { email: 'new@test.com' },
      mockFetch as unknown as typeof fetch
    );
    expect(res.success).toBe(true);
    expect(res.staff.status).toBe('invited');
  });

  it('revokeStudioStaff issues DELETE /studios/:id/staff/:staffId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        membershipId: 'usr_2',
        status: 'revoked',
      }),
    });

    const res = await revokeStudioStaff('std_1', 'usr_2', mockFetch as unknown as typeof fetch);
    expect(res.success).toBe(true);
    expect(res.status).toBe('revoked');
  });

  it('updateStudioProfile issues PATCH /studios/:id/profile', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        studio: {
          id: 'std_1',
          slug: 'std-1',
          name: 'Studio 1',
          status: 'active',
          settings: {
            currency: 'INR',
            maxActivePrinters: 2,
            autoApproveOrders: false,
            isAcceptingOrders: false,
          },
          createdAt: '2026-11-23T00:00:00.000Z',
          updatedAt: '2026-11-23T00:00:00.000Z',
        },
      }),
    });

    const res = await updateStudioProfile(
      'std_1',
      { isAcceptingOrders: false },
      mockFetch as unknown as typeof fetch
    );
    expect(res.studio.settings.isAcceptingOrders).toBe(false);
  });

  it('updateStudioSettings issues PATCH /studios/:id/settings', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'std_1',
        slug: 'std-1',
        name: 'Studio 1',
        status: 'active',
        settings: {
          currency: 'INR',
          maxActivePrinters: 2,
          autoApproveOrders: false,
          paymentPolicy: 'pay_at_counter',
          onlinePaymentEnabled: false,
          counterPaymentEnabled: true,
        },
        createdAt: '2026-11-23T00:00:00.000Z',
        updatedAt: '2026-11-23T00:00:00.000Z',
      }),
    });

    const res = await updateStudioSettings(
      'std_1',
      { paymentPolicy: 'pay_at_counter', onlinePaymentEnabled: false },
      mockFetch as unknown as typeof fetch
    );
    expect(res.settings.paymentPolicy).toBe('pay_at_counter');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/settings');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({
      paymentPolicy: 'pay_at_counter',
      onlinePaymentEnabled: false,
    });
  });

  it('verifyStudioRazorpay issues POST /studios/:id/verify-razorpay', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConfirmed: true,
        message: 'Verified',
      }),
    });

    const res = await verifyStudioRazorpay(
      'std_1',
      { keyId: 'rzp_test_123', keySecret: 'secret123' },
      mockFetch as unknown as typeof fetch
    );
    expect(res.isConfirmed).toBe(true);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/studios/std_1/verify-razorpay');
    expect(init.method).toBe('POST');
  });
});
