'use client';

import React, { useState } from 'react';
import { OrderRecord, PublicPaymentSettings, StudioPrintRatesContract } from '@snapprint/contracts';
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
  sessionId: string;
  token: string;
  payment?: PublicPaymentSettings;
  isAcceptingOrders?: boolean;
  printRates?: StudioPrintRatesContract;
}

export function DocumentPrintWorkflow({
  slug,
  studioName,
  sessionId,
  token,
  payment,
  isAcceptingOrders = true,
  printRates,
}: DocumentPrintWorkflowProps) {
  const {
    items,
    docs,
    activeConfigs,
    removingKeys,
    feedback,
    setFeedback,
    handleFilesSelected,
    handleCancelUpload,
    handleRetryUpload,
    handleDeleteItem,
    handleRemoveAsset,
    handleUpdateConfig,
    resetDocuments,
  } = useStorefrontDocuments(slug, sessionId, token);

  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(null);
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
          setSubmittedOrder(null);
          setPreviewAssetId(null);
          resetDocuments();
        }}
      />
    );
  }

  return (
    <div>
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
          1. Upload Documents (PDF / Images)
        </h2>
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
        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
            2. Configure Print & Xerox Options ({docs.length})
          </h2>
          {docs.map((doc, idx) => (
            <DocumentConfigForm
              key={doc.assetId}
              config={activeConfigs[idx] || createDefaultConfig(doc.assetId)}
              filename={doc.filename}
              pageCount={doc.pageCount}
              printRates={printRates}
              isRemoving={removingKeys.includes(doc.assetId)}
              onUpdate={(updated) => handleUpdateConfig(doc.assetId, updated)}
              onPreview={() => setPreviewAssetId(doc.assetId)}
              onRemove={() => handleRemoveAsset(doc.assetId)}
            />
          ))}
        </section>
      )}

      {activeConfigs.length > 0 && (
        <section style={{ marginBottom: '20px' }}>
          <OrderSummaryCard
            slug={slug}
            sessionId={sessionId}
            token={token}
            configs={activeConfigs}
            onOrderSubmitted={(order) => setSubmittedOrder(order)}
            isAcceptingOrders={isAcceptingOrders}
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
          onClose={() => setPreviewAssetId(null)}
        />
      )}
    </div>
  );
}
