import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stateMap = new Map<number, unknown>();
let stateIndex = 0;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    default: actual,
    useRef: (init: unknown) => ({ current: init }),
    useState: <T>(initial: T | (() => T)) => {
      const idx = stateIndex++;
      if (!stateMap.has(idx)) {
        stateMap.set(idx, typeof initial === 'function' ? (initial as () => T)() : initial);
      }
      const val = stateMap.get(idx) as T;
      const setter = (next: T | ((prev: T) => T)) => {
        stateMap.set(idx, typeof next === 'function' ? (next as (prev: T) => T)(val) : next);
      };
      return [val, setter] as const;
    },
    useEffect: (fn: () => void | (() => void)) => {
      try {
        const cleanup = fn();
        if (typeof cleanup === 'function') cleanup();
      } catch {
        // no-op
      }
    },
  };
});

vi.mock('../app/hooks/use-dialog.js', () => ({
  useDialog: () => ({
    handleBackdropClick: vi.fn(),
    swipeHandlers: {},
  }),
}));

vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn().mockResolvedValue('<svg>mock-qr</svg>'),
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockpng'),
  },
}));

vi.mock('./workspace-client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./workspace-client.js')>();
  return {
    ...actual,
    fetchStudio: vi.fn(),
  };
});

import { StudioQrModal } from '../app/components/studio-qr-modal.js';
import { ShopDetailsFormFields } from '../app/components/shop-details-form-fields.js';
import * as workspaceClient from './workspace-client.js';

describe('Permanent Counter QR Modal & Read-only Slug SSOT', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stateMap.clear();
    stateIndex = 0;
  });

  describe('StudioQrModal', () => {
    it('uses the canonical studio.slug and does not use hardcoded value', () => {
      const onClose = vi.fn();
      const studio = {
        id: 'studio_abc_123',
        slug: 'koramangala-xerox',
        name: 'Koramangala Xerox',
      };

      const element = StudioQrModal({ studio, onClose });
      expect(element).toBeDefined();
      expect(element.props['role']).toBe('dialog');
      expect(element.props['aria-labelledby']).toBe('studio-qr-title');
    });

    it('fetches studio via fetchStudio when slug is initially missing', () => {
      const fetchSpy = vi.spyOn(workspaceClient, 'fetchStudio').mockResolvedValue({
        studio: {
          id: 'studio_xyz_999',
          slug: 'real-fetched-slug',
          name: 'Real Shop',
          status: 'active',
          settings: {
            currency: 'INR',
            maxActivePrinters: 2,
            autoApproveOrders: false,
            isAcceptingOrders: true,
          },
          createdAt: '2026-11-23T00:00:00.000Z',
          updatedAt: '2026-11-23T00:00:00.000Z',
        },
        role: 'studio_owner',
        permissions: ['view_orders', 'manage_studio'],
      });

      const onClose = vi.fn();
      const studio = {
        id: 'studio_xyz_999',
        name: 'Real Shop',
      };

      const element = StudioQrModal({ studio, onClose });
      expect(element).toBeDefined();
      expect(fetchSpy).toHaveBeenCalledWith('studio_xyz_999');
    });
  });

  describe('ShopDetailsFormFields Slug Immutability', () => {
    it('renders the slug input as read-only with aria-readonly', () => {
      const onNameChange = vi.fn();
      const onCityChange = vi.fn();
      const onPhoneChange = vi.fn();
      const onTaglineChange = vi.fn();

      const element = ShopDetailsFormFields({
        name: 'My Shop',
        slug: 'my-shop',
        city: 'Hyderabad',
        phone: '9876543210',
        tagline: 'Fast Prints',
        slugSanity: { valid: true },
        onNameChange,
        onCityChange,
        onPhoneChange,
        onTaglineChange,
      });

      function findInput(node: unknown): Record<string, unknown> | null {
        if (!node || typeof node !== 'object') return null;
        if (Array.isArray(node)) {
          for (const child of node) {
            const found = findInput(child);
            if (found) return found;
          }
          return null;
        }
        const el = node as { props?: Record<string, unknown>; type?: unknown };
        if (el.props?.id === 'shop-slug') return el.props;
        if (el.props?.children) return findInput(el.props.children);
        return null;
      }

      const inputProps = findInput(element);
      expect(inputProps).toBeDefined();
      expect(inputProps?.readOnly).toBe(true);
      expect(inputProps?.['aria-readonly']).toBe('true');
      expect((inputProps?.style as React.CSSProperties)?.cursor).toBe('not-allowed');
    });
  });
});
