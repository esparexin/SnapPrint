'use client';

import React, { useEffect, useState } from 'react';
import { CustomerSessionResponse, PublicStudio } from '@snapprint/contracts';
import {
  CustomerApiError,
  ensureCustomerSession,
  fetchPublicStudio,
  getStoredCustomerSession,
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
  const [isNewSession, setIsNewSession] = useState(false);
  const [loading, setLoading] = useState(!initialStudio && !initialError);
  const [error, setError] = useState<CustomerApiError | null>(
    initialError ? new CustomerApiError(initialError, 500) : null
  );

  useEffect(() => {
    let mounted = true;
    async function loadStudioAndSession() {
      const cached = getStoredCustomerSession(slug);
      if (cached && mounted) {
        setSession(cached);
        setIsNewSession(false);
      }

      if (initialStudio) {
        if (initialStudio.status === 'active' && !cached) {
          try {
            const s = await ensureCustomerSession(slug);
            if (mounted) {
              setSession(s);
              setIsNewSession(true);
            }
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
        if (studioData.status === 'active' && !cached) {
          const s = await ensureCustomerSession(slug);
          if (mounted) {
            setSession(s);
            setIsNewSession(true);
          }
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
    <div className="sf-shell">
      <CustomerStudioHeader studio={studio} />

      {session && (
        <div className="sf-session-banner">
          <span style={{ fontWeight: 600 }}>🔒 Private Session Active</span>
          <span style={{ fontWeight: 500 }}>Expires in 2 hours</span>
        </div>
      )}

      <DocumentPrintWorkflow
        slug={slug}
        studioName={studio.name}
        sessionId={session?.session.sessionId ?? ''}
        token={session?.token ?? ''}
        isNewSession={isNewSession}
        payment={studio.payment}
        isAcceptingOrders={studio.isAcceptingOrders !== false}
        printRates={studio.printRates}
        capabilities={studio.capabilities}
      />

      <footer className="sf-footer">
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
