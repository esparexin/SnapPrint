import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OperatorPortalHeader } from '../app/components/operator-portal-header.js';
import { OperatorStudioHub, SHOP_MENU_TABS } from '../app/components/operator-studio-hub.js';
import { PortalModals } from '../app/components/portal-modals.js';
import PortalPage from '../app/portal/page.js';
import { signOutToHome } from './auth-client.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Shop Portal Shell, Menu Persistence, Agent Actions & Sign-Out', () => {
  it('OperatorPortalHeader preserves shop name, removes Back to Dashboard, and suppresses duplicate Sign Out when hideSignOut is true', () => {
    const portalHeaderHtml = renderToStaticMarkup(
      React.createElement(OperatorPortalHeader, {
        userName: 'Kalyan V M',
        userEmail: 'pappuga@gmail.com',
        isPlatformAdmin: false,
        logoutLoading: false,
        onLogout: vi.fn(),
        hideSignOut: true,
        studioName: 'Vikram Mobiles',
      })
    );
    expect(portalHeaderHtml).toContain('Vikram Mobiles');
    expect(portalHeaderHtml).toContain('Signed in as');
    expect(portalHeaderHtml).not.toContain('← Dashboard');
    expect(portalHeaderHtml).not.toContain('Sign Out');

    const modalHeaderHtml = renderToStaticMarkup(
      React.createElement(OperatorPortalHeader, {
        userName: 'Kalyan V M',
        userEmail: 'pappuga@gmail.com',
        isPlatformAdmin: false,
        logoutLoading: false,
        onLogout: vi.fn(),
        hideSignOut: false,
        studioName: 'Vikram Mobiles',
      })
    );
    expect(modalHeaderHtml).toContain('Sign Out');
  });

  it('OperatorStudioHub renders KPI summary bar, 9-item menu with Download & Pair, active Orders state, and zero offline alert banner', () => {
    const html = renderToStaticMarkup(
      React.createElement(OperatorStudioHub, {
        studioId: 'std_vikram',
        activeView: 'orders',
        onNavigate: vi.fn(),
        onOpenPairing: vi.fn(),
      })
    );

    expect(html).toContain('Orders');
    expect(html).toContain('Cash');
    expect(html).toContain('Pending');
    expect(html).toContain('Pages');
    expect(html).not.toContain('Printing is Currently Offline');
    expect(html).not.toContain('Windows Print Agent is running');
    expect(html).not.toContain('📄');
    expect(html).not.toContain('🖨️');
    expect(html).not.toContain('⚡');

    expect(SHOP_MENU_TABS.map((t) => t.label)).toEqual([
      'Orders',
      'Printer & Page Setup',
      'QR Stand',
      'Payments',
      'Settings',
      'Subscription',
      'Staff',
      'Setup Guide',
    ]);
    expect(html).toContain('id="portal-tab-orders"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('/downloads/windows-agent/latest.msi');
    expect(html).toContain('download="SnapPrint-Print-Agent.msi"');
    expect(html).toContain('📥');
    expect(html).toContain('Download');
    expect(html).toContain('>Pair<');
  });

  it('PortalModals renders every section inline inside tabpanel when inShell is true', () => {
    const views = [
      'orders',
      'printer_setup',
      'qr',
      'payment',
      'profile',
      'subscription',
      'staff',
      'setup',
    ] as const;
    for (const view of views) {
      const html = renderToStaticMarkup(
        React.createElement(PortalModals, {
          studioId: 'std_vikram',
          studioName: 'Vikram Mobiles',
          activeView: view,
          inShell: true,
          onSetupComplete: vi.fn(),
        })
      );
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain(`aria-labelledby="portal-tab-${view}"`);
      expect(html).toContain('portal-section-card');
      expect(html).not.toContain('dialog-overlay');
    }
  });

  it('PortalPage replaces Home link with Sign Out entry point and keeps Shop Portal brand link', () => {
    const html = renderToStaticMarkup(React.createElement(PortalPage));
    expect(html).toContain('SnapPrint');
    expect(html).toContain('Shop Portal');
    expect(html).not.toContain('← Home');

    const pageSource = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/app/portal/page.tsx'),
      'utf8'
    );
    expect(pageSource).toContain('signOutToHome');
    expect(pageSource).toContain('hideHeaderSignOut');
    expect(pageSource).toContain('Sign Out');
  });

  it('OperatorPortal defaults to Orders view, keeps summary & menu persistent, and deletes orphaned offline banner', () => {
    const portalSource = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/app/components/operator-portal.tsx'),
      'utf8'
    );
    expect(portalSource).toContain("useState<OperatorView>('orders')");
    expect(portalSource).toContain('onAuthChange?.(user)');
    expect(portalSource).toContain('<OperatorStudioHub');
    expect(portalSource).toContain('<PortalModals');
    expect(portalSource).not.toContain("activeView === 'hub'");

    const orphanedBannerPath = path.resolve(
      process.cwd(),
      'apps/web/app/components/offline-hardware-alert-banner.tsx'
    );
    expect(fs.existsSync(orphanedBannerPath)).toBe(false);
  });

  it('signOutToHome revokes session via POST /auth/logout and redirects to / (never /operator)', async () => {
    const replaceMock = vi.fn();
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { location: { replace: replaceMock } };

    try {
      let capturedMethod = '';
      const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
        capturedMethod = init?.method || '';
        return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
          status: 200,
        });
      };

      await signOutToHome(mockFetch as unknown as typeof fetch);
      expect(capturedMethod).toBe('POST');
      expect(replaceMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith('/');
      expect(replaceMock).not.toHaveBeenCalledWith('/operator');

      replaceMock.mockClear();
      const errFetch = async () =>
        new Response(JSON.stringify({ message: 'Logout failed' }), { status: 500 });
      await expect(signOutToHome(errFetch as unknown as typeof fetch)).rejects.toThrow(
        'Logout failed'
      );
      expect(replaceMock).not.toHaveBeenCalled();
    } finally {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  });
});
