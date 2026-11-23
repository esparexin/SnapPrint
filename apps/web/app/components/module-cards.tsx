'use client';

import React from 'react';
import { Permission } from '@snapprint/contracts';

interface ModuleCardsProps {
  can: (permission: Permission) => boolean;
  onOpenQrModal?: () => void;
  onOpenOrdersModal?: () => void;
  onOpenSetupModal?: () => void;
  onOpenPrintersModal?: () => void;
  onOpenStaffModal?: () => void;
  onOpenProfileModal?: () => void;
}

export function ModuleCards({
  can,
  onOpenQrModal,
  onOpenOrdersModal,
  onOpenSetupModal,
  onOpenPrintersModal,
  onOpenStaffModal,
  onOpenProfileModal,
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
      title: 'Hardware & Fleet',
      desc: 'Manage local printers, drivers, and capability routing.',
      permission: 'manage_printers' as Permission,
      action: onOpenPrintersModal,
      actionLabel: 'Manage Printers',
    },
    {
      title: 'Staff & Roles',
      desc: 'Invite operators, assign staff roles, and revoke access.',
      permission: 'manage_staff' as Permission,
      action: onOpenStaffModal,
      actionLabel: 'Manage Team',
    },
    {
      title: 'Shop Profile & Hours',
      desc: 'Update shop tagline, phone, and pause/resume orders.',
      permission: 'manage_studio' as Permission,
      action: onOpenProfileModal,
      actionLabel: 'Edit Profile & Pause',
    },
    {
      title: 'Onboarding & Setup',
      desc: 'Full studio onboarding wizard, capabilities, and readiness.',
      permission: 'manage_studio' as Permission,
      action: onOpenSetupModal,
      actionLabel: 'Setup Wizard',
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
