import React from 'react';
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { PortalTopbarActions } from '../app/components/portal-topbar-actions.js';
import { WorkstationFleetSection } from '../app/components/workstation-fleet-section.js';
import { EmptyPrinterState } from '../app/components/empty-printer-state.js';
import { AgentDevice } from './printer-client.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('PC Agent Pairing Flow & Single Binding Governance', () => {
  describe('PortalTopbarActions', () => {
    it('renders "+ Pair PC Agent" button when no PC is bound', () => {
      const html = renderToStaticMarkup(
        PortalTopbarActions({
          canPair: true,
          isBound: false,
          onPairClick: vi.fn(),
          onSignOut: vi.fn(),
          signingOut: false,
        })
      );

      expect(html).toContain('+ Pair PC Agent');
      expect(html).not.toContain('PC Agent Status');
    });

    it('renders "PC Agent Status" when a PC is already bound', () => {
      const html = renderToStaticMarkup(
        PortalTopbarActions({
          canPair: true,
          isBound: true,
          onPairClick: vi.fn(),
          onSignOut: vi.fn(),
          signingOut: false,
        })
      );

      expect(html).toContain('PC Agent Status');
      expect(html).not.toContain('+ Pair PC Agent');
    });
  });

  describe('WorkstationFleetSection', () => {
    const activeDevice: AgentDevice = {
      deviceId: 'dev_pos_01',
      studioId: 'std_test',
      hostname: 'SHOP-DESKTOP-POS',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      status: 'active',
      isOnline: true,
      lastHeartbeatAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const unboundDevice: AgentDevice = {
      ...activeDevice,
      deviceId: 'dev_pos_old',
      status: 'unbound',
    };

    it('hides "+ Pair Workstation" when an active PC is bound, requiring unbind first', () => {
      const html = renderToStaticMarkup(
        WorkstationFleetSection({
          devices: [activeDevice],
          loading: false,
          onPairAgent: vi.fn(),
          onUnbindDevice: vi.fn(),
        })
      );

      expect(html).not.toContain('+ Pair Workstation');
      expect(html).toContain('Unbind Workstation');
    });

    it('shows "+ Pair Workstation" when all devices are unbound or fleet is empty', () => {
      const emptyHtml = renderToStaticMarkup(
        WorkstationFleetSection({
          devices: [],
          loading: false,
          onPairAgent: vi.fn(),
          onUnbindDevice: vi.fn(),
        })
      );
      expect(emptyHtml).toContain('+ Pair Workstation');

      const unboundHtml = renderToStaticMarkup(
        WorkstationFleetSection({
          devices: [unboundDevice],
          loading: false,
          onPairAgent: vi.fn(),
          onUnbindDevice: vi.fn(),
        })
      );
      expect(unboundHtml).toContain('+ Pair Workstation');
    });
  });

  describe('EmptyPrinterState', () => {
    it('shows "Generate Pairing Key" when unbound and "View Paired PC" when bound', () => {
      const unboundHtml = renderToStaticMarkup(
        EmptyPrinterState({ onPairAgent: vi.fn(), isBound: false })
      );
      expect(unboundHtml).toContain('Generate Pairing Key');
      expect(unboundHtml).not.toContain('View Paired PC');

      const boundHtml = renderToStaticMarkup(
        EmptyPrinterState({ onPairAgent: vi.fn(), isBound: true })
      );
      expect(boundHtml).toContain('View Paired PC');
      expect(boundHtml).not.toContain('Generate Pairing Key');
    });
  });
});
