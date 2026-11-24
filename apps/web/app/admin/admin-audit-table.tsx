'use client';

import React from 'react';
import { PlatformAuditEntry } from '@snapprint/contracts';
import { adminTableStyles } from './admin-table-styles';

export interface AdminAuditTableProps {
  logs: PlatformAuditEntry[];
  loading: boolean;
}

export function AdminAuditTable({ logs, loading }: AdminAuditTableProps) {
  return (
    <div style={adminTableStyles.card}>
      <div style={adminTableStyles.cardHeader}>
        <div>
          <h2 style={adminTableStyles.cardTitle}>Immutable Audit Trail</h2>
          <p style={adminTableStyles.cardSubtext}>
            Cryptographically recorded actions, status modifications, and operator interventions
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={adminTableStyles.table}>
          <thead style={adminTableStyles.thead}>
            <tr>
              <th style={adminTableStyles.th}>Timestamp</th>
              <th style={adminTableStyles.th}>Action</th>
              <th style={adminTableStyles.th}>Actor ID</th>
              <th style={adminTableStyles.th}>Target</th>
              <th style={adminTableStyles.th}>Reason / Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...adminTableStyles.td,
                    textAlign: 'center',
                    color: '#64748b',
                    padding: '2rem',
                  }}
                >
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...adminTableStyles.td,
                    textAlign: 'center',
                    color: '#64748b',
                    padding: '2rem',
                  }}
                >
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={adminTableStyles.tdMono}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td
                    style={{
                      ...adminTableStyles.td,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#0369a1',
                      fontFamily: 'monospace',
                    }}
                  >
                    {log.action}
                  </td>
                  <td style={adminTableStyles.tdMono}>{log.actorId}</td>
                  <td style={adminTableStyles.tdMono}>
                    <span style={{ color: '#94a3b8' }}>{log.targetType}:</span> {log.targetId}
                  </td>
                  <td style={{ ...adminTableStyles.td, fontSize: '0.75rem', color: '#475569' }}>
                    {log.reason ? (
                      <span style={{ fontStyle: 'italic' }}>{log.reason}</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>None provided</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
