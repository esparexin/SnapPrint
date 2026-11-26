'use client';

import React, { useEffect, useState } from 'react';
import {
  OrderRecord,
  PublicPaymentSettings,
  StudioPrintRatesContract,
  StudioPublicCapabilities,
} from '@snapprint/contracts';
import {
  clearStoredCustomerActiveOrder,
  clearStoredCustomerSession,
  getStoredCustomerActiveOrder,
  storeCustomerActiveOrder,
} from '../../../src/customer-client';
import { DocumentConfigForm } from './document-config-form';
import { DocumentPreviewModal } from './document-preview-modal';
import { createDefaultConfig, resolvePreviewTarget } from './document-print-workflow-helpers';
import { OrderConfirmationView } from './order-confirmation-view';
import { OrderSummaryCard } from './order-summary-card';
import { PhotoUploader } from './photo-uploader';
import { useStorefrontDocuments } from './use-storefront-documents';

interface DocumentPrintWorkflowProps {
  slug: string;
  studioName: string;
  sessionId?: string;
  token?: string;
  isNewSession?: boolean;
  payment?: PublicPaymentSettings;
  isAcceptingOrders?: boolean;
  printRates?: StudioPrintRatesContract;
  capabilities?: StudioPublicCapabilities;
}

export function DocumentPrintWorkflow({
  slug,
  studioName,
  sessionId = '',
  token = '',
  isNewSession = false,
  payment,
  isAcceptingOrders = true,
  printRates,
  capabilities,
}: DocumentPrintWorkflowProps) {
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    const cached = getStoredCustomerActiveOrder(slug);
    if (cached) setSubmittedOrder(cached);
  }, [slug]);

  const {
    items, docs, activeConfigs, removingKeys, feedback, setFeedback,
    handleFilesSelected, handleCancelUpload, handleRetryUpload,
    handleDeleteItem, handleRemoveAsset, handleUpdateConfig, resetDocuments,
  } = useStorefrontDocuments(slug, sessionId, token, isNewSession, Boolean(submittedOrder));

  const previewTarget = resolvePreviewTarget(docs, activeConfigs, previewAssetId);

  if (submittedOrder) {
    return (
      <OrderConfirmationView
        order={submittedOrder}
        studioName={studioName}
        slug={slug}
        sessionToken={token}
        payment={payment}
        onNewOrder={() => {
          clearStoredCustomerActiveOrder(slug);
          clearStoredCustomerSession(slug);
          setSubmittedOrder(null);
          setPreviewAssetId(null);
          resetDocuments();
        }}
      />
    );
  }

  const hasStickyCta = activeConfigs.length > 0;

  return (
    <div className={hasStickyCta ? 'sf-workflow--has-sticky' : undefined}>
      <section className="sf-section">
        <h2 className="sf-section-heading">1. Upload Documents (PDF / Images)</h2>
        <PhotoUploader
          items={items}
          feedback={feedback}
          onDismissFeedback={() => setFeedback(null)}
          onFilesSelected={handleFilesSelected}
          onRetry={handleRetryUpload}
          onCancel={handleCancelUpload}
          onDelete={handleDeleteItem}
        />
      </section>

      {docs.length > 0 && (
        <section className="sf-section">
          <h2 className="sf-section-heading">2. Configure Print &amp; Xerox Options ({docs.length})</h2>
          {docs.map((doc, idx) => (
            <DocumentConfigForm
              key={doc.assetId}
              config={activeConfigs[idx] || createDefaultConfig(doc.assetId)}
              filename={doc.filename}
              pageCount={doc.pageCount}
              printRates={printRates}
              capabilities={capabilities}
              isRemoving={removingKeys.includes(doc.assetId)}
              onUpdate={(updated) => handleUpdateConfig(doc.assetId, updated)}
              onPreview={() => setPreviewAssetId(doc.assetId)}
              onRemove={() => handleRemoveAsset(doc.assetId)}
            />
          ))}
        </section>
      )}

      {hasStickyCta && (
        <section className="sf-section">
          <OrderSummaryCard
            slug={slug} sessionId={sessionId} token={token} configs={activeConfigs}
            onOrderSubmitted={(order) => {
              storeCustomerActiveOrder(slug, order);
              setSubmittedOrder(order);
            }}
            isAcceptingOrders={isAcceptingOrders}
          />
        </section>
      )}

      {previewTarget && (
        <DocumentPreviewModal
          slug={slug} sessionId={sessionId} token={token}
          filename={previewTarget.doc.filename}
          pageCount={previewTarget.doc.pageCount}
          config={previewTarget.config}
          onClose={() => setPreviewAssetId(null)}
        />
      )}
    </div>
  );
}
