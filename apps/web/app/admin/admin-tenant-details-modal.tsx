'use client';

import React, { useEffect, useState } from 'react';
import { PlatformStudioDetailsResponse, PlatformStudioItem } from '@snapprint/contracts';
import { getPlatformStudioDetails } from '../../src/platform-admin-client';
import { useDialog } from '../hooks/use-dialog';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminSubscriptionOverrideModal } from './admin-subscription-override-modal';
import { AdminTenantFleetSection } from './admin-tenant-fleet-section';
import { AdminTenantOverviewSection } from './admin-tenant-overview-section';
import { AdminTenantStatsSection } from './admin-tenant-stats-section';

export interface AdminTenantDetailsModalProps {
  studio: PlatformStudioItem;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminTenantDetailsModal({ studio, isOpen, onClose }: AdminTenantDetailsModalProps) {
  const [details, setDetails] = useState<PlatformStudioDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen,
    onClose,
    enableSwipeDown: true,
  });

  const loadDetails = React.useCallback(() => {
    setLoading(true);
    setError(null);
    getPlatformStudioDetails(studio.id)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch details'))
      .finally(() => setLoading(false));
  }, [studio.id]);

  useEffect(() => {
    if (isOpen) {
      loadDetails();
    }
  }, [isOpen, loadDetails]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-details-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{
          ...adminLayoutStyles.dialogBox,
          maxWidth: '42rem',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div style={adminLayoutStyles.modalHeader}>
          <div>
            <h3 id="tenant-details-title" style={adminLayoutStyles.modalTitle}>
              {studio.name}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              /{studio.slug} &bull; {studio.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={adminLayoutStyles.modalCloseBtn}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error && <div style={adminLayoutStyles.errorBanner}>{error}</div>}
        {loading && (
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading tenant details...</p>
        )}

        {!loading && details && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              marginTop: '0.5rem',
            }}
          >
            <AdminTenantOverviewSection owner={details.owner} studio={details.studio} />
            <AdminTenantStatsSection
              subscription={details.subscription}
              printStats={details.printStats}
              onOverrideSubscription={() => setIsOverrideOpen(true)}
            />
            <AdminTenantFleetSection
              printers={details.printers}
              devices={details.devices}
              studioId={details.studio.id}
            />
          </div>
        )}

        {isOverrideOpen && (
          <AdminSubscriptionOverrideModal
            studioId={studio.id}
            studioName={studio.name}
            isOpen={isOverrideOpen}
            onClose={() => setIsOverrideOpen(false)}
            onUpdated={loadDetails}
          />
        )}
      </div>
    </div>
  );
}
