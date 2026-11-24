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
  onOpenPaymentModal?: () => void;
}

export function ModuleCards({
  can,
  onOpenQrModal,
  onOpenOrdersModal,
  onOpenSetupModal,
  onOpenPrintersModal,
  onOpenStaffModal,
  onOpenProfileModal,
  onOpenPaymentModal,
}: ModuleCardsProps) {
  const modules = [
    {
      title: 'Orders', icon: '📄', desc: 'Incoming customer print & photocopy jobs.',
      permission: 'view_orders' as Permission, action: onOpenOrdersModal, actionLabel: 'Open Orders',
    },
    {
      title: 'Printers', icon: '🖨️', desc: 'Printers, drivers, and print agent connection.',
      permission: 'manage_printers' as Permission, action: onOpenPrintersModal, actionLabel: 'Manage Printers',
    },
    {
      title: 'QR Stand', icon: '📱', desc: 'Download & print counter QR stand for customer scans.',
      permission: 'manage_studio' as Permission, action: onOpenQrModal, actionLabel: 'Download QR',
    },
    {
      title: 'Payments', icon: '💰', desc: 'Set per-page print rates, UPI, and cash collection.',
      permission: 'manage_studio' as Permission, action: onOpenPaymentModal, actionLabel: 'Payment Rates',
    },
    {
      title: 'Shop Settings', icon: '🏪', desc: 'Update shop name, contact number, and pause orders.',
      permission: 'manage_studio' as Permission, action: onOpenProfileModal, actionLabel: 'Edit Profile',
    },
    {
      title: 'Staff', icon: '👥', desc: 'Invite operators and manage staff permissions.',
      permission: 'manage_staff' as Permission, action: onOpenStaffModal, actionLabel: 'Manage Team',
    },
    {
      title: 'Setup Guide', icon: '⚙️', desc: 'Shop onboarding checklist and capabilities.',
      permission: 'manage_studio' as Permission, action: onOpenSetupModal, actionLabel: 'Setup Wizard',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.875rem' }}>
      {modules.map((m) => {
        const authorized = can(m.permission);
        return (
          <div
            key={m.title}
            onClick={authorized && m.action ? m.action : undefined}
            style={{
              padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
              background: authorized ? '#ffffff' : '#f8fafc', opacity: authorized ? 1 : 0.6,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              cursor: authorized && m.action ? 'pointer' : 'default',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{m.icon}</span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{m.title}</h3>
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
                {m.desc}
              </p>
            </div>
            <div>
              {!authorized && (
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#dc2626' }}>
                  🔒 Restricted
                </span>
              )}
              {m.action && authorized && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    m.action?.();
                  }}
                  style={{
                    width: '100%', padding: '0.4rem 0.5rem', backgroundColor: '#0284c7',
                    color: '#ffffff', border: 'none', borderRadius: '0.375rem',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {m.actionLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
