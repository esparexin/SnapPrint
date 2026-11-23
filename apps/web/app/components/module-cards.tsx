'use client';

import React from 'react';
import { Permission } from '@snapprint/contracts';

interface ModuleCardsProps {
  can: (permission: Permission) => boolean;
  onOpenQrModal?: () => void;
  onOpenOrdersModal?: () => void;
  onOpenSetupModal?: () => void;
}

export function ModuleCards({
  can,
  onOpenQrModal,
  onOpenOrdersModal,
  onOpenSetupModal,
}: ModuleCardsProps) {
  const modules = [
    {
      title: 'Permanent Counter QR',
      desc: 'Preview, download vector SVG/PNG, and print counter QR stand.',
      permission: 'manage_studio' as Permission,
      action: onOpenQrModal,
      actionLabel: 'View & Download QR',
    },
    {
      title: 'Order Fulfillment',
      desc: 'Review incoming customer Xerox & document print jobs.',
      permission: 'view_orders' as Permission,
      action: onOpenOrdersModal,
      actionLabel: 'Open Fulfillment Queue',
    },
    {
      title: 'Catalog & Pricing',
      desc: 'Configure print dimensions, finish, and pricing.',
      permission: 'manage_catalog' as Permission,
    },
    {
      title: 'Hardware & Fleet',
      desc: 'Manage local thermal & dye-sublimation printers.',
      permission: 'manage_printers' as Permission,
    },
    {
      title: 'Studio Settings & Staff',
      desc: 'Manage studio policies, staff roster, and hours.',
      permission: 'manage_studio' as Permission,
      action: onOpenSetupModal,
      actionLabel: 'Shop Setup & Config',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}
    >
      {modules.map((m) => {
        const authorized = can(m.permission);
        return (
          <div
            key={m.title}
            style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              background: authorized ? '#ffffff' : '#f9fafb',
              opacity: authorized ? 1 : 0.5,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{m.title}</h3>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                {m.desc}
              </p>
            </div>
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: authorized ? '#059669' : '#dc2626',
                  marginBottom: m.action && authorized ? '0.5rem' : '0',
                }}
              >
                {authorized ? '✓ Authorized' : `✗ Requires: ${m.permission}`}
              </span>
              {m.action && authorized && (
                <button
                  type="button"
                  onClick={m.action}
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.5rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {m.actionLabel || 'Open'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
