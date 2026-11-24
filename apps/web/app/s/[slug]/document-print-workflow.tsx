'use client';

import React, { useCallback, useState } from 'react';
import { DocumentPrintConfig, OrderRecord, PublicPaymentSettings } from '@snapprint/contracts';
import { DocumentConfigForm } from './document-config-form';
import { DocumentPreviewModal } from './document-preview-modal';
import { OrderConfirmationView } from './order-confirmation-view';
import { OrderSummaryCard } from './order-summary-card';
import { PhotoUploader, UploadedDocInfo } from './photo-uploader';

interface DocumentPrintWorkflowProps {
  slug: string;
  studioName: string;
  sessionId: string;
  token: string;
  payment?: PublicPaymentSettings;
}

const createDefaultConfig = (assetId: string): DocumentPrintConfig => ({
  assetId,
  paperSize: 'A4',
  colorMode: 'black_and_white',
  sides: 'single_sided',
  orientation: 'portrait',
  scaling: 'fit_to_page',
  pageSelection: 'all',
  copies: 1,
});

export function DocumentPrintWorkflow({
  slug,
  studioName,
  sessionId,
  token,
  payment,
}: DocumentPrintWorkflowProps) {
  const [docs, setDocs] = useState<UploadedDocInfo[]>([]);
  const [configs, setConfigs] = useState<DocumentPrintConfig[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{
    doc: UploadedDocInfo;
    config: DocumentPrintConfig;
  } | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(null);

  const handleDocumentsChange = useCallback((updatedDocs: UploadedDocInfo[]) => {
    setDocs((prev) => {
      const pKey = prev.map((d) => `${d.assetId}:${d.pageCount}`).join(',');
      const nKey = updatedDocs.map((d) => `${d.assetId}:${d.pageCount}`).join(',');
      return pKey === nKey ? prev : updatedDocs;
    });
    setConfigs((prev) => {
      const pKey = prev.map((c) => c.assetId).join(',');
      const nKey = updatedDocs.map((d) => d.assetId).join(',');
      if (pKey === nKey) return prev;
      return updatedDocs.map((d) => prev.find((c) => c.assetId === d.assetId) || createDefaultConfig(d.assetId));
    });
  }, []);

  function handleUpdateConfig(idx: number, updated: DocumentPrintConfig) {
    setConfigs((prev) => prev.map((c, i) => (i === idx ? updated : c)));
  }

  function handleRemoveDoc(assetId: string) {
    setDocs((prev) => prev.filter((d) => d.assetId !== assetId));
    setConfigs((prev) => prev.filter((c) => c.assetId !== assetId));
  }

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
          setDocs([]);
          setConfigs([]);
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
          slug={slug}
          sessionId={sessionId}
          token={token}
          onDocumentsChange={handleDocumentsChange}
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
              config={configs[idx] || createDefaultConfig(doc.assetId)}
              filename={doc.filename}
              pageCount={doc.pageCount}
              onUpdate={(updated) => handleUpdateConfig(idx, updated)}
              onPreview={() => setPreviewDoc({ doc, config: configs[idx] || createDefaultConfig(doc.assetId) })}
              onRemove={() => handleRemoveDoc(doc.assetId)}
            />
          ))}
        </section>
      )}

      {configs.length > 0 && (
        <section style={{ marginBottom: '20px' }}>
          <OrderSummaryCard
            slug={slug}
            sessionId={sessionId}
            token={token}
            configs={configs}
            onOrderSubmitted={(order) => setSubmittedOrder(order)}
          />
        </section>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          slug={slug}
          sessionId={sessionId}
          token={token}
          filename={previewDoc.doc.filename}
          pageCount={previewDoc.doc.pageCount}
          config={previewDoc.config}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
