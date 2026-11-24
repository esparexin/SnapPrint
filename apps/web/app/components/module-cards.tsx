'use client';

import React from 'react';
import { Permission } from '@snapprint/contracts';
import { buildShopModules, ModuleCardsActions } from './module-cards-data';

interface ModuleCardsProps extends ModuleCardsActions {
  can: (permission: Permission) => boolean;
}

export function ModuleCards({ can, ...actions }: ModuleCardsProps) {
  const modules = buildShopModules(actions);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '0.875rem',
      }}
    >
      {modules.map((m) => {
        const authorized = can(m.permission);
        return (
          <div
            key={m.title}
            onClick={authorized && m.action ? m.action : undefined}
            style={{
              padding: '1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              background: authorized ? '#ffffff' : '#f8fafc',
              opacity: authorized ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: authorized && m.action ? 'pointer' : 'default',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.35rem',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{m.icon}</span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  {m.title}
                </h3>
              </div>
              <p
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  lineHeight: 1.4,
                }}
              >
                {m.desc}
              </p>
            </div>
            <div>
              {!authorized && (
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#dc2626',
                  }}
                >
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
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
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
