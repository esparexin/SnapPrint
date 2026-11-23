'use client';

import React, { useState } from 'react';
import PushpinTearFooter from '@/components/ui/pushpin-tear-footer';
import { HomeFeatures } from './components/home-features';
import { HomeHero } from './components/home-hero';
import { HomeNavbar } from './components/home-navbar';
import { OperatorPortal } from './components/operator-portal';

export default function HomePage() {
  const [showPortalModal, setShowPortalModal] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HomeNavbar onOpenPortal={() => setShowPortalModal(true)} />

      <main style={{ flex: 1 }}>
        <HomeHero onOpenPortal={() => setShowPortalModal(true)} />
        <HomeFeatures />
      </main>

      {showPortalModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowPortalModal(false)}
              aria-label="Close Dialog"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                lineHeight: 1,
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              ×
            </button>
            <OperatorPortal />
          </div>
        </div>
      )}

      <PushpinTearFooter
        brand="SnapPrint"
        name="Palnadu Print Network"
        logoHref="/"
        sheet="#0284c7"
        paper="#f8fafc"
        paperInk="#0f172a"
        email="contact@snapprint.in"
        newsletter={{
          label: 'receive shop news & print offers',
          placeholder: 'your@email.com',
        }}
        status={{ label: 'accepting digital xerox orders' }}
        mark="PALNADU / 2026"
        timeZone="Asia/Kolkata"
        timeLabel="IST"
        sideLinks={[
          { icon: 'shield', label: 'privacy policy', href: '/#privacy' },
          { icon: 'doc', label: 'terms & conditions', href: '/#terms' },
        ]}
        copyright="© 2026 SnapPrint Technologies"
        credit="multi-tenant print network"
        handle={{ label: '@snapprint', href: 'https://print.palnadu.dev' }}
      />
    </div>
  );
}
