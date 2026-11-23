'use client';

import React, { useState } from 'react';
import { PlatformStudioItem, StudioStatus } from '@snapprint/contracts';

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

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    onFilterChange(
      statusFilter === 'all' ? undefined : (statusFilter as StudioStatus),
      val.trim() || undefined
    );
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    onFilterChange(
      val === 'all' ? undefined : (val as StudioStatus),
      searchTerm.trim() || undefined
    );
  };

  const getStatusBadge = (status: StudioStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'onboarding':
      case 'pending_review':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'closed':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tenant Directory</h2>
          <p className="text-xs text-gray-500">
            Overview and compliance governance across all registered print studios
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full sm:w-60 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Studio Name</th>
              <th className="px-6 py-3">Identifier / Slug</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Contact</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading studios directory...
                </td>
              </tr>
            ) : studios.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No studios found matching the criteria.
                </td>
              </tr>
            ) : (
              studios.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/75 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    <div>{s.id}</div>
                    <div className="text-gray-400">/{s.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-medium border rounded-full ${getStatusBadge(
                        s.status
                      )}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {s.contactEmail && <div>{s.contactEmail}</div>}
                    {s.contactPhone && <div className="text-gray-400">{s.contactPhone}</div>}
                    {!s.contactEmail && !s.contactPhone && (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onManageStatus(s)}
                      className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
                    >
                      Manage
                    </button>
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
