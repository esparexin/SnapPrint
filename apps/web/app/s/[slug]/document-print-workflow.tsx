'use client';

import React, { useEffect, useState } from 'react';
import type { OrderRecord } from '@snapprint/contracts';
import {
  clearStoredCustomerActiveOrder,
  clearStoredCustomerSession,
  getStoredCustomerActiveOrder,
  getValidStoredCustomerActiveOrder,
  storeCustomerActiveOrder,
} from '../../../src/customer-client';
import { DocumentConfigForm } from './document-config-form';
import { DocumentPreviewModal } from './document-preview-modal';
import { createDefaultConfig, resolvePreviewTarget } from './document-print-workflow-helpers';
import { DocumentPrintWorkflowProps } from './document-print-workflow-types';
import { OrderConfirmationView } from './order-confirmation-view';
import { OrderSummaryCard } from './order-summary-card';
import { PhotoUploader } from './photo-uploader';
import { useStorefrontDocuments } from './use-storefront-documents';

export function DocumentPrintWorkflow(props: DocumentPrintWorkflowProps) {
  const { slug, studioName, sessionId = '', token = '', isNewSession = false } = props;
  const { payment, isAcceptingOrders = true } = props;
  const { printRates, capabilities } = props;
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (isNewSession) {
      clearStoredCustomerActiveOrder(slug);
      setSubmittedOrder(null);
      return;
    }
    const cached = getStoredCustomerActiveOrder(slug);
    if (cached && cached.status !== 'completed' && cached.status !== 'cancelled') {
      setSubmittedOrder(cached);
    }
    getValidStoredCustomerActiveOrder(slug, sessionId, token).then(setSubmittedOrder);
  }, [slug, sessionId, token, isNewSession]);

  const docState = useStorefrontDocuments(
    slug,
    sessionId,
    token,
    isNewSession,
    Boolean(submittedOrder)
  );
  const { items, docs, activeConfigs, removingKeys, feedback, setFeedback } = docState;
  const previewTarget = resolvePreviewTarget(docs, activeConfigs, previewAssetId);

  const handleResetOrder = () => {
    clearStoredCustomerActiveOrder(slug);
    clearStoredCustomerSession(slug);
    setSubmittedOrder(null);
    setPreviewAssetId(null);
    docState.resetDocuments();
  };

  if (submittedOrder) {
    return (
      <OrderConfirmationView
        order={submittedOrder}
        studioName={studioName}
        slug={slug}
        sessionToken={token}
        payment={payment}
        customPaperSizes={capabilities?.customPaperSizes}
        onNewOrder={handleResetOrder}
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
          onFilesSelected={docState.handleFilesSelected}
          onRetry={docState.handleRetryUpload}
          onCancel={docState.handleCancelUpload}
          onDelete={docState.handleDeleteItem}
        />
      </section>

      {docs.length > 0 && (
        <section className="sf-section">
          <h2 className="sf-section-heading">
            2. Configure Print &amp; Xerox Options ({docs.length})
          </h2>
          {docs.map((doc, idx) => (
            <DocumentConfigForm
              key={doc.assetId}
              config={activeConfigs[idx] || createDefaultConfig(doc.assetId)}
              filename={doc.filename}
              pageCount={doc.pageCount}
              printRates={printRates}
              capabilities={capabilities}
              isRemoving={removingKeys.includes(doc.assetId)}
              onUpdate={(updated) => docState.handleUpdateConfig(doc.assetId, updated)}
              onPreview={() => setPreviewAssetId(doc.assetId)}
              onRemove={() => docState.handleRemoveAsset(doc.assetId)}
            />
          ))}
        </section>
      )}

      {hasStickyCta && (
        <section className="sf-section">
          <OrderSummaryCard
            slug={slug}
            sessionId={sessionId}
            token={token}
            configs={activeConfigs}
            onOrderSubmitted={(order) => {
              storeCustomerActiveOrder(slug, order);
              setSubmittedOrder(order);
            }}
            isAcceptingOrders={isAcceptingOrders}
            customPaperSizes={capabilities?.customPaperSizes}
          />
        </section>
      )}

      {previewTarget && (
        <DocumentPreviewModal
          slug={slug}
          sessionId={sessionId}
          token={token}
          filename={previewTarget.doc.filename}
          pageCount={previewTarget.doc.pageCount}
          config={previewTarget.config}
          customPaperSizes={capabilities?.customPaperSizes}
          onClose={() => setPreviewAssetId(null)}
        />
      )}
    </div>
  );
}
