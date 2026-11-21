'use client';

import React, { useState } from 'react';
import { DocumentPrintConfig, OrderRecord } from '@snapprint/contracts';
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
}

export function DocumentPrintWorkflow({
  slug,
  studioName,
  sessionId,
  token,
}: DocumentPrintWorkflowProps) {
  const [docs, setDocs] = useState<UploadedDocInfo[]>([]);
  const [configs, setConfigs] = useState<DocumentPrintConfig[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{
    doc: UploadedDocInfo;
    config: DocumentPrintConfig;
  } | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(null);

  function handleDocumentsChange(updatedDocs: UploadedDocInfo[]) {
    setDocs(updatedDocs);
    setConfigs((prev) => {
      const nextConfigs: DocumentPrintConfig[] = [];
      for (const d of updatedDocs) {
        const existing = prev.find((c) => c.assetId === d.assetId);
        if (existing) {
          nextConfigs.push(existing);
        } else {
          nextConfigs.push({
            assetId: d.assetId,
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'single_sided',
            orientation: 'portrait',
            scaling: 'fit_to_page',
            pageSelection: 'all',
            copies: 1,
          });
        }
      }
      return nextConfigs;
    });
  }

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
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
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
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            2. Configure Print & Xerox Options ({docs.length})
          </h2>
          {docs.map((doc, idx) => {
            const config = configs[idx] || {
              assetId: doc.assetId,
              paperSize: 'A4',
              colorMode: 'black_and_white',
              sides: 'single_sided',
              orientation: 'portrait',
              scaling: 'fit_to_page',
              pageSelection: 'all',
              copies: 1,
            };

            return (
              <DocumentConfigForm
                key={doc.assetId}
                config={config}
                filename={doc.filename}
                pageCount={doc.pageCount}
                onUpdate={(updated) => handleUpdateConfig(idx, updated)}
                onPreview={() => setPreviewDoc({ doc, config })}
                onRemove={() => handleRemoveDoc(doc.assetId)}
              />
            );
          })}
        </section>
      )}

      {configs.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
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
