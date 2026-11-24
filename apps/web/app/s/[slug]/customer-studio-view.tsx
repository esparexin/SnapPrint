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
  CustomerStudioHeader,
  CustomerStudioInactive,
  CustomerStudioLoading,
} from './customer-status-views';
import { DocumentPrintWorkflow } from './document-print-workflow';

interface CustomerStudioViewProps {
  slug: string;
  initialStudio?: PublicStudio | null;
  initialError?: string | null;
}

export function CustomerStudioView({
  slug,
  initialStudio = null,
  initialError = null,
}: CustomerStudioViewProps) {
  const [studio, setStudio] = useState<PublicStudio | null>(initialStudio);
  const [session, setSession] = useState<CustomerSessionResponse | null>(null);
  const [loading, setLoading] = useState(!initialStudio && !initialError);
  const [error, setError] = useState<CustomerApiError | null>(
    initialError ? new CustomerApiError(initialError, 500) : null
  );

  useEffect(() => {
    let mounted = true;
    async function loadStudioAndSession() {
      if (initialStudio) {
        if (initialStudio.status === 'active') {
          try {
            const s = await ensureCustomerSession(slug);
            if (mounted) setSession(s);
          } catch {
            /* ignore */
          }
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const studioData = await fetchPublicStudio(slug);
        if (!mounted) return;
        setStudio(studioData);
        if (studioData.status === 'active') {
          const s = await ensureCustomerSession(slug);
          if (mounted) setSession(s);
        }
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof CustomerApiError
            ? err
            : new CustomerApiError('Failed to load shop details', 500)
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStudioAndSession();
    return () => {
      mounted = false;
    };
  }, [slug, initialStudio]);

  if (loading) return <CustomerStudioLoading />;
  if (error || !studio) return <CustomerStudioError slug={slug} error={error} />;
  if (studio.status !== 'active') return <CustomerStudioInactive studio={studio} />;

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '24px 16px 48px',
        overflowX: 'hidden',
      }}
    >
      <CustomerStudioHeader studio={studio} />

      {session && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            marginBottom: '20px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #dcfce7',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#166534',
          }}
        >
          <span>
            🔒 <strong>Private Session Active</strong>
          </span>
          <span style={{ fontWeight: 600 }}>Expires in 2 hours</span>
        </div>
      )}

      {session && (
        <DocumentPrintWorkflow
          slug={slug}
          studioName={studio.name}
          sessionId={session.session.sessionId}
          token={session.token}
          payment={studio.payment}
          isAcceptingOrders={studio.isAcceptingOrders !== false}
          printRates={studio.printRates}
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
