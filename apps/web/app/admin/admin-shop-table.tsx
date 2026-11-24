'use client';

import React, { useState } from 'react';
import { PlatformStudioItem, StudioStatus } from '@snapprint/contracts';
import { AdminShopTableRow } from './admin-shop-table-row';
import { adminTableStyles } from './admin-table-styles';

export interface AdminShopTableProps {
  studios: PlatformStudioItem[];
  loading: boolean;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageStatus: (studio: PlatformStudioItem) => void;
  onManageSubscription?: (studio: PlatformStudioItem) => void;
  onFilterChange: (status?: StudioStatus, search?: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

export function AdminShopTable({
  studios,
  loading,
  onInspect,
  onManageStatus,
  onManageSubscription,
  onFilterChange,
  statusFilter = 'all',
  onStatusFilterChange,
}: AdminShopTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const onSearch = (val: string) => {
    setSearchTerm(val);
    const filter = statusFilter === 'all' ? undefined : (statusFilter as StudioStatus);
    onFilterChange(filter, val.trim() || undefined);
  };

  const onStatus = (val: string) => {
    onStatusFilterChange?.(val);
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
            placeholder="Search by name, slug, or owner..."
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
              <th style={adminTableStyles.th}>Subscription</th>
              <th style={adminTableStyles.th}>Printers & Payments</th>
              <th style={adminTableStyles.th}>Owner & Contact</th>
              <th style={adminTableStyles.th}>Created</th>
              <th style={adminTableStyles.thRight}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={adminTableStyles.emptyCell}>
                  Loading studios directory...
                </td>
              </tr>
            ) : studios.length === 0 ? (
              <tr>
                <td colSpan={8} style={adminTableStyles.emptyCell}>
                  No studios found matching the criteria.
                </td>
              </tr>
            ) : (
              studios.map((s) => (
                <AdminShopTableRow
                  key={s.id}
                  studio={s}
                  onInspect={onInspect}
                  onManageStatus={onManageStatus}
                  onManageSubscription={onManageSubscription}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
