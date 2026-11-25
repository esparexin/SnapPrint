'use client';

import React from 'react';
import { SubscriptionPlanDefinition } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import { AdminPlanForm } from './admin-plan-form';

export interface AdminPlanModalProps {
  plan: SubscriptionPlanDefinition | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminPlanModal({ plan, onClose, onSaved }: AdminPlanModalProps) {
  const isEditing = Boolean(plan);

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, maxWidth: '480px' }}>
        <h3 style={styles.modalTitle}>
          {isEditing ? `Edit Plan: ${plan!.name}` : 'Add New Subscription Plan'}
        </h3>
        <AdminPlanForm plan={plan} onClose={onClose} onSaved={onSaved} />
      </div>
    </div>
  );
}
