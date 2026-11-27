import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OperatorPortalHeader } from '../app/components/operator-portal-header.js';
import { PrinterFleetHeader } from '../app/components/printer-fleet-header.js';
import { PrinterStatusBadge } from '../app/components/printer-status-badge.js';
import { PrinterTroubleshootingPopover } from '../app/components/printer-troubleshooting-popover.js';
import { AdminTenantFleetSection } from '../app/admin/admin-tenant-fleet-section.js';
import { computePrinterStatus, DEFAULT_AGENT_INSTALLER_NAME } from './printer-client.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Printer Status Badge & Troubleshooting Help', () => {
  it('distinguishes all 3 states: Not Added, Connected, and Offline', () => {
    // 1. Not Added
    expect(computePrinterStatus([], [])).toBe('not_added');
    const notAddedHtml = renderToStaticMarkup(
      React.createElement(PrinterStatusBadge, { studioId: 'std_1', initialStatus: 'not_added' })
    );
    expect(notAddedHtml).toContain('Printer Not Added');
    expect(notAddedHtml).toContain('portal-status-badge-neutral');
    expect(notAddedHtml).toContain('portal-status-dot-neutral');

    // 2. Connected
    expect(computePrinterStatus([{ status: 'online' }], [{ isOnline: true }])).toBe('connected');
    const connectedHtml = renderToStaticMarkup(
      React.createElement(PrinterStatusBadge, { studioId: 'std_1', initialStatus: 'connected' })
    );
    expect(connectedHtml).toContain('Connected');
    expect(connectedHtml).toContain('portal-status-badge-success');
    expect(connectedHtml).toContain('portal-status-dot-success');

    // 3. Offline (agent offline or printer offline)
    expect(computePrinterStatus([{ status: 'online' }], [{ isOnline: false }])).toBe('offline');
    expect(computePrinterStatus([{ status: 'offline' }], [{ isOnline: true }])).toBe('offline');
    const offlineHtml = renderToStaticMarkup(
      React.createElement(PrinterStatusBadge, { studioId: 'std_1', initialStatus: 'offline' })
    );
    expect(offlineHtml).toContain('Offline');
    expect(offlineHtml).toContain('portal-status-badge-danger');
    expect(offlineHtml).toContain('portal-status-dot-danger');
  });

  it('never displays a paired printer as Not Added simply because it is offline', () => {
    const res = computePrinterStatus([{ status: 'offline' }], [{ isOnline: false }]);
    expect(res).toBe('offline');
    expect(res).not.toBe('not_added');
  });

  it('renders a compact help icon button (ⓘ) with accessible attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrinterStatusBadge, { studioId: 'std_1', initialStatus: 'connected' })
    );
    expect(html).toContain('portal-printer-help-btn');
    expect(html).toContain('aria-label="Printer troubleshooting help"');
    expect(html).toContain('ⓘ');
  });

  it('PrinterTroubleshootingPopover renders all 4 troubleshooting steps, download link, and support phone', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrinterTroubleshootingPopover, { onClose: vi.fn() })
    );

    // Header
    expect(html).toContain('Printer Offline?');

    // 4 Instructions
    expect(html).toContain('Check whether the printer is powered ON.');
    expect(html).toContain('Check whether the printer cable is properly connected.');
    expect(html).toContain('Make sure the printer is connected to the shop computer.');
    expect(html).toContain(
      'If the printer is powered ON and the cable is properly connected, download and install the SnapPrint Windows Print Agent, then pair the PC Agent with your shop.'
    );

    // Download Agent .msi
    expect(html).toContain('Download Agent (.msi)');
    expect(html).toContain(`download="${DEFAULT_AGENT_INSTALLER_NAME}"`);
    expect(html).toContain('/downloads/windows-agent/latest.msi');

    // Support phone
    expect(html).toContain('9030787819');
    expect(html).toContain('href="tel:9030787819"');
  });

  it('OperatorPortalHeader renders printer status badge when studioId is present', () => {
    const html = renderToStaticMarkup(
      React.createElement(OperatorPortalHeader, {
        userName: 'Vikram',
        userEmail: 'vikram@example.com',
        isPlatformAdmin: false,
        logoutLoading: false,
        onLogout: vi.fn(),
        studioName: 'Vikram Mobiles',
        studioId: 'std_vikram',
      })
    );
    expect(html).toContain('portal-printer-status-wrapper');
    expect(html).toContain('portal-printer-help-btn');
  });

  it('PrinterFleetHeader renders printer status badge alongside fleet title', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrinterFleetHeader, {
        studioId: 'std_vikram',
        studioName: 'Vikram Mobiles',
        onOpenPairing: vi.fn(),
      })
    );
    expect(html).toContain('Hardware &amp; Printers Fleet');
    expect(html).toContain('portal-printer-status-wrapper');
    expect(html).toContain('portal-printer-help-btn');
  });

  it('PrinterFleetHeader renders active printer count cleanly without hardcoded active limit or warning badge', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrinterFleetHeader, {
        studioId: 'std_vikram',
        studioName: 'Vikram Mobiles',
        allowance: {
          registeredCount: 5,
          activeCount: 3,
          isLimitReached: true,
        },
      })
    );
    expect(html).not.toContain('Active Limit (2/2)');
    expect(html).not.toContain('Active Limit');
    expect(html).toContain('Active: <strong>3</strong>');
    expect(html).toContain('Standby: 2');
  });

  it('PrinterFleetHeader does not render /2 or limit denominator when legacy maxActivePrinters is present', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrinterFleetHeader, {
        studioId: 'std_vikram',
        studioName: 'Vikram Mobiles',
        allowance: {
          registeredCount: 2,
          activeCount: 0,
          maxActivePrinters: 2,
          isLimitReached: false,
        },
      })
    );
    expect(html).not.toContain('0/2');
    expect(html).not.toContain('/2');
    expect(html).toContain('Active: <strong>0</strong>');
    expect(html).toContain('Standby: 2');
  });

  it('AdminTenantFleetSection renders online status with green pill', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminTenantFleetSection, {
        printers: [
          {
            id: 'p1',
            name: 'LaserJet',
            driverName: 'HP Driver',
            role: 'active_bw',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            isDefaultOsPrinter: true,
            lastSeenAt: new Date().toISOString(),
          },
        ],
        devices: [],
      })
    );
    expect(html).toContain('online');
    expect(html).toContain('background-color:#ecfdf5');
  });
});
