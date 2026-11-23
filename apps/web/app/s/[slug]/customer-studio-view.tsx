'use client';

import React, { useEffect, useState } from 'react';
import { CustomerSessionResponse, PublicStudio } from '@snapprint/contracts';
import {
  CustomerApiError,
  ensureCustomerSession,
  fetchPublicStudio,
} from '../../../src/customer-client';
import {
  CustomerStudioError,
  CustomerStudioInactive,
  CustomerStudioLoading,
} from './customer-status-views';
import { DocumentPrintWorkflow } from './document-print-workflow';

interface CustomerStudioViewProps {
  slug: string;
}

export function CustomerStudioView({ slug }: CustomerStudioViewProps) {
  const [studio, setStudio] = useState<PublicStudio | null>(null);
  const [session, setSession] = useState<CustomerSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CustomerApiError | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStudioAndSession() {
      setLoading(true);
      setError(null);

      try {
        const studioData = await fetchPublicStudio(slug);
        if (!mounted) return;
        setStudio(studioData);

        if (studioData.status === 'active') {
          const sessionData = await ensureCustomerSession(slug);
          if (!mounted) return;
          setSession(sessionData);
        }
      } catch (err) {
        if (!mounted) return;
        if (err instanceof CustomerApiError) {
          setError(err);
        } else {
          setError(new CustomerApiError('Failed to load shop details', 500));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStudioAndSession();

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return <CustomerStudioLoading />;
  }

  if (error || !studio) {
    return <CustomerStudioError slug={slug} error={error} />;
  }

  if (studio.status !== 'active') {
    return <CustomerStudioInactive studio={studio} />;
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px 48px' }}>
      <header style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1
          style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}
        >
          {studio.name}
        </h1>
        <div style={{ color: '#0284c7', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
          Xerox & Digital Document Printing
        </div>
        {studio.contactPhone && (
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
            Shop Contact: {studio.contactPhone}
          </div>
        )}
      </header>

      {session && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            marginBottom: '24px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #dcfce7',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#166534',
          }}
        >
          <span>✓ Private Session Active</span>
          <span style={{ fontWeight: 600 }}>Expires in 2 hours</span>
        </div>
      )}

      {/* Available Document Print Services */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
          Document Services & Capabilities
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div
            style={{
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
              📄 B&W and Color Xerox
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Crisp photocopy & high-speed printouts.
            </div>
          </div>
          <div
            style={{
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
              📑 Duplex (Double-Sided)
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Save paper with automated back-to-back print.
            </div>
          </div>
        </div>
      </section>

      {session && (
        <DocumentPrintWorkflow
          slug={slug}
          studioName={studio.name}
          sessionId={session.session.sessionId}
          token={session.token}
          payment={studio.payment}
        />
      )}

      <footer
        style={{
          marginTop: '36px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#94a3b8',
        }}
      >
        <div>
          Developed by{' '}
          <a
            href="https://www.palnadu.dev/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
          >
            Palnadu.dev
          </a>
        </div>
      </footer>
    </div>
  );
}
