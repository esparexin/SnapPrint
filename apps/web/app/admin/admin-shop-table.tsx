'use client';

import React, { useState } from 'react';
import { PlatformStudioItem, StudioStatus } from '@snapprint/contracts';
import { adminTableStyles, statusBadges } from './admin-table-styles';

export interface AdminShopTableProps {
  studios: PlatformStudioItem[];
  loading: boolean;
  onManageStatus: (studio: PlatformStudioItem) => void;
  onFilterChange: (status?: StudioStatus, search?: string) => void;
}

export function AdminShopTable({
  studios,
  loading,
  onManageStatus,
  onFilterChange,
}: AdminShopTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const onSearch = (val: string) => {
    setSearchTerm(val);
    const filter = statusFilter === 'all' ? undefined : (statusFilter as StudioStatus);
    onFilterChange(filter, val.trim() || undefined);
  };

  const onStatus = (val: string) => {
    setStatusFilter(val);
    const filter = val === 'all' ? undefined : (val as StudioStatus);
    onFilterChange(filter, searchTerm.trim() || undefined);
  };

  return (
    <div style={adminTableStyles.card}>
      <div style={adminTableStyles.cardHeader}>
        <div>
          <h2 style={adminTableStyles.cardTitle}>Tenant Directory</h2>
          <p style={adminTableStyles.cardSubtext}>
            Overview and compliance governance across all registered print studios
          </p>
        </div>
        <div style={adminTableStyles.filterGroup}>
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            style={adminTableStyles.searchInput}
          />
          <select
            value={statusFilter}
            onChange={(e) => onStatus(e.target.value)}
            style={adminTableStyles.input}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="pending_review">Pending Review</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={adminTableStyles.table}>
          <thead style={adminTableStyles.thead}>
            <tr>
              <th style={adminTableStyles.th}>Studio Name</th>
              <th style={adminTableStyles.th}>Identifier / Slug</th>
              <th style={adminTableStyles.th}>Status</th>
              <th style={adminTableStyles.th}>Contact</th>
              <th style={adminTableStyles.th}>Created</th>
              <th style={adminTableStyles.thRight}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={adminTableStyles.emptyCell}>
                  Loading studios directory...
                </td>
              </tr>
            ) : studios.length === 0 ? (
              <tr>
                <td colSpan={6} style={adminTableStyles.emptyCell}>
                  No studios found matching the criteria.
                </td>
              </tr>
            ) : (
              studios.map((s) => {
                const b = statusBadges[s.status] || statusBadges.closed;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={adminTableStyles.tdBold}>{s.name}</td>
                    <td style={adminTableStyles.tdMono}>
                      <div>{s.id}</div>
                      <div style={{ color: '#94a3b8' }}>/{s.slug}</div>
                    </td>
                    <td style={adminTableStyles.td}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '9999px',
                          backgroundColor: b.bg,
                          color: b.color,
                          border: `1px solid ${b.border}`,
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={adminTableStyles.tdContact}>
                      {s.contactEmail && <div>{s.contactEmail}</div>}
                      {s.contactPhone && <div style={{ color: '#94a3b8' }}>{s.contactPhone}</div>}
                      {!s.contactEmail && !s.contactPhone && (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                      )}
                    </td>
                    <td style={adminTableStyles.tdMuted}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td style={adminTableStyles.tdRight}>
                      <button
                        type="button"
                        onClick={() => onManageStatus(s)}
                        style={adminTableStyles.input}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
