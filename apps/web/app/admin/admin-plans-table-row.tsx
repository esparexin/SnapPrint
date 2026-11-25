'use client';

import React from 'react';
import { SubscriptionPlanDefinition } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';

export function AdminPlansTableRow({
  plan: p,
  onEdit,
  onDelete,
}: {
  plan: SubscriptionPlanDefinition;
  onEdit: (plan: SubscriptionPlanDefinition) => void;
  onDelete: (plan: SubscriptionPlanDefinition) => void;
}) {
  return (
    <tr key={p.id} style={styles.tableRow}>
      <td style={styles.tdBold}>
        {p.name}
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>{p.id}</div>
      </td>
      <td style={styles.td}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: p.category === 'free' ? '#f0f9ff' : '#eef2ff',
            color: p.category === 'free' ? '#0284c7' : '#4f46e5',
          }}
        >
          {p.category === 'free' ? 'Free Plan' : 'Paid Plan'}
        </span>
      </td>
      <td style={styles.td}>{p.durationDays} Days</td>
      <td style={styles.td}>{p.priceRupees === 0 ? 'Free' : `₹${p.priceRupees}`}</td>
      <td style={styles.td}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: p.isActive ? '#ecfdf5' : '#f1f5f9',
            color: p.isActive ? '#059669' : '#64748b',
          }}
        >
          {p.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={styles.td}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => onEdit(p)} style={styles.btnSecondary}>
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(p)}
            style={{ ...styles.btnSecondary, color: '#dc2626' }}
          >
            🗑️ Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
