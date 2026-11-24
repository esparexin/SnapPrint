'use client';

import React from 'react';
import { InfoModal } from './info-modal';

interface LegalModalsProps {
  showPrivacy: boolean;
  showTerms: boolean;
  onClosePrivacy: () => void;
  onCloseTerms: () => void;
}

export function LegalModals({
  showPrivacy,
  showTerms,
  onClosePrivacy,
  onCloseTerms,
}: LegalModalsProps) {
  return (
    <>
      {showPrivacy && (
        <InfoModal title="Privacy Policy" onClose={onClosePrivacy}>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Zero WhatsApp Privacy Leaks:</strong> Customer files uploaded to SnapPrint
            auto-expire with a strict 120-minute TTL. No sensitive documents (Aadhaar cards, voter
            IDs, certificates) remain saved on studio computers or personal phones.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Encrypted Spool:</strong> Documents travel via TLS directly to the local printer
            spool queue and are permanently purged after printing.
          </p>
          <p>
            <strong>Network Trust:</strong> SnapPrint never shares or sells customer contact details
            or uploaded documents.
          </p>
        </InfoModal>
      )}

      {showTerms && (
        <InfoModal title="Terms & Conditions" onClose={onCloseTerms}>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Multi-Tenant Print Network:</strong> SnapPrint provides a digital counter Xerox
            and printing infrastructure connecting customers to authorized local studios.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Transparent Pricing:</strong> Page count and color breakdown are dynamically
            calculated before payment. Quotations are strictly binding.
          </p>
          <p>
            <strong>Operator Agreement:</strong> Registered Xerox centers and studios agree to
            fulfill spool jobs promptly and maintain high print quality standards.
          </p>
        </InfoModal>
      )}
    </>
  );
}
